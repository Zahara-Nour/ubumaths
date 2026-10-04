import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { MarketplaceTrade } from '$lib/types/marketplace';
import type { VipCardInstance } from '$lib/types/vip-card';
import { supabaseRealtimeManager } from './supabaseRealtime.svelte';
import { createLogger } from '$lib/utils/logger';
import { z } from 'zod';

const logger = createLogger('tradeRealtime.svelte.ts');

// =============================================================================
// ZOD VALIDATION SCHEMAS FOR BROADCAST PAYLOADS
// =============================================================================

/**
 * Message de chat éphémère reçu sur le canal privé `trade:<id>`.
 *
 * ⚠️ Seul le TEXTE est gardé : l'auteur, l'identifiant et l'horodatage du
 * payload (`senderId`, `id`, `createdAt`, envoyés par les anciens clients)
 * sont ignorés par Zod. Le chat d'échange n'est pas stocké en base : l'auteur
 * affiché est « l'autre élève de l'échange », lu dans la ligne de l'échange.
 */
const chatMessagePayloadSchema = z.object({
	message: z.string().trim().min(1).max(500)
});

/**
 * Heartbeat de présence (événement broadcast, pas la Presence Realtime).
 * Aucune source en base : sur le canal privé, seul l'autre élève peut l'émettre.
 */
const presencePayloadSchema = z.object({
	online: z.boolean()
});

/**
 * Colonnes relues en base à chaque signal (offre, validations, confirmations,
 * statut). Ce sont elles, jamais le payload, qui s'affichent.
 */
const TRADE_SNAPSHOT_COLUMNS =
	'status, current_offer, validated_by_initiator, validated_by_partner, confirmed_by_initiator, confirmed_by_partner, completed_at, cancelled_at' as const;

/**
 * Événements broadcast traités comme simples SIGNAUX « l'échange a changé,
 * relis la base » : leur payload n'est pas lu.
 */
const TRADE_SIGNAL_EVENTS = [
	'offer_updated',
	'validation_changed',
	'confirmation',
	'trade_cancelled',
	'trade_completed'
] as const;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Offer structure for trade
 */
export interface TradeOffer {
	cards: string[];
	gidouilles: number;
}

/**
 * Chat message in trade
 */
export interface TradeChatMessage {
	id: string;
	senderId: string;
	message: string;
	createdAt: string;
}

/**
 * Payloads broadcast (les signaux d'échange n'en ont pas)
 */
type BroadcastChatMessagePayload = z.infer<typeof chatMessagePayloadSchema>;
type BroadcastPresencePayload = z.infer<typeof presencePayloadSchema>;

/**
 * Ligne de l'échange relue en base à chaque signal
 */
type TradeSnapshotRow = Pick<
	Database['public']['Tables']['marketplace_trades']['Row'],
	| 'status'
	| 'current_offer'
	| 'validated_by_initiator'
	| 'validated_by_partner'
	| 'confirmed_by_initiator'
	| 'confirmed_by_partner'
	| 'completed_at'
	| 'cancelled_at'
>;

/**
 * Offres des deux élèves, lues dans `current_offer`
 */
interface ParsedOffers {
	initiator: TradeOffer;
	partner: TradeOffer;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Lit `current_offer` (nouveau format `from_initiator`/`from_partner` ou
 * ancien format `initiator_cards`…). Ce qui n'a pas la bonne forme est ignoré.
 *
 * @param raw - Valeur jsonb de la base
 * @returns Les offres des deux élèves (vides par défaut)
 */
function parseCurrentOffer(raw: unknown): ParsedOffers {
	const offer = (raw && typeof raw === 'object' ? raw : {}) as {
		from_initiator?: { cards?: unknown; gidouilles?: unknown };
		from_partner?: { cards?: unknown; gidouilles?: unknown };
		initiator_cards?: unknown;
		initiator_gidouilles?: unknown;
		partner_cards?: unknown;
		partner_gidouilles?: unknown;
	};
	const toCards = (v: unknown): string[] =>
		Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string') : [];
	const toAmount = (v: unknown): number =>
		typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;

	const hasNewFormat = Boolean(offer.from_initiator || offer.from_partner);
	return hasNewFormat
		? {
				initiator: {
					cards: toCards(offer.from_initiator?.cards),
					gidouilles: toAmount(offer.from_initiator?.gidouilles)
				},
				partner: {
					cards: toCards(offer.from_partner?.cards),
					gidouilles: toAmount(offer.from_partner?.gidouilles)
				}
			}
		: {
				initiator: {
					cards: toCards(offer.initiator_cards),
					gidouilles: toAmount(offer.initiator_gidouilles)
				},
				partner: {
					cards: toCards(offer.partner_cards),
					gidouilles: toAmount(offer.partner_gidouilles)
				}
			};
}

// =============================================================================
// TRADE REALTIME STORE
// =============================================================================

/**
 * Trade Realtime Store - Manages real-time state for the friend trade board
 *
 * Uses Supabase Realtime Broadcast for instant synchronization between
 * two trading partners. All offer modifications, validations, and confirmations
 * are synchronized in real-time.
 *
 * @example
 * ```ts
 * import { tradeRealtimeStore } from '$lib/stores/tradeRealtime.svelte';
 *
 * // Initialize with trade ID and user ID
 * await tradeRealtimeStore.init(tradeId, userId, supabase);
 *
 * // Update offer
 * tradeRealtimeStore.selectCard(cardId);
 * tradeRealtimeStore.setGidouilles(50);
 *
 * // Validate offer
 * await tradeRealtimeStore.toggleValidation();
 *
 * // Confirm trade (after both validated)
 * await tradeRealtimeStore.confirm();
 *
 * // Cleanup
 * tradeRealtimeStore.destroy();
 * ```
 */
class TradeRealtimeStore {
	// =========================================================================
	// IDENTITY
	// =========================================================================

	/**
	 * Current trade ID
	 */
	tradeId = $state<string | null>(null);

	/**
	 * Current user's role in the trade
	 */
	myRole = $state<'initiator' | 'partner' | null>(null);

	// =========================================================================
	// TRADE DATA
	// =========================================================================

	/**
	 * Full trade object from database
	 */
	trade = $state<MarketplaceTrade | null>(null);

	// =========================================================================
	// OFFERS (Updated in real-time)
	// =========================================================================

	/**
	 * Current user's offer
	 */
	myOffer = $state<TradeOffer>({ cards: [], gidouilles: 0 });

	/**
	 * Partner's offer
	 */
	partnerOffer = $state<TradeOffer>({ cards: [], gidouilles: 0 });

	// =========================================================================
	// AVAILABLE CARDS
	// =========================================================================

	/**
	 * Current user's available cards for trade
	 */
	myCards = $state<VipCardInstance[]>([]);

	/**
	 * Partner's available cards for trade
	 */
	partnerCards = $state<VipCardInstance[]>([]);

	// =========================================================================
	// MUTUAL VALIDATION
	// =========================================================================

	/**
	 * Whether current user has validated the offer
	 */
	myValidation = $state(false);

	/**
	 * Whether partner has validated the offer
	 */
	partnerValidation = $state(false);

	// =========================================================================
	// FINAL CONFIRMATION
	// =========================================================================

	/**
	 * Whether to show the confirmation modal
	 */
	showConfirmationModal = $state(false);

	/**
	 * Whether current user has confirmed
	 */
	myConfirmation = $state(false);

	/**
	 * Whether partner has confirmed
	 */
	partnerConfirmation = $state(false);

	/**
	 * Deadline for confirmation (5 minutes after modal opens)
	 */
	confirmationDeadline = $state<Date | null>(null);

	// =========================================================================
	// PRESENCE
	// =========================================================================

	/**
	 * Whether partner is currently online
	 */
	partnerOnline = $state(false);

	// =========================================================================
	// CHAT
	// =========================================================================

	/**
	 * Chat messages in the trade
	 */
	messages = $state<TradeChatMessage[]>([]);

	// =========================================================================
	// LOADING / ERROR
	// =========================================================================

	/**
	 * Loading state
	 */
	loading = $state(false);

	/**
	 * Error message
	 */
	error = $state<string | null>(null);

	/**
	 * Whether to show idle warning modal
	 */
	showIdleWarning = $state(false);

	// =========================================================================
	// PRIVATE STATE
	// =========================================================================

	private supabase: SupabaseClient<Database> | null = null;
	private userId: string | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private confirmationTimer: ReturnType<typeof setTimeout> | null = null;
	private presenceInterval: ReturnType<typeof setInterval> | null = null;
	private confirmationPhaseStarting = false;
	private visibilityHandler: (() => void) | null = null;
	private idleTimer: ReturnType<typeof setTimeout> | null = null;
	private idleActivityHandler: (() => void) | null = null;

	// ANTI-SATURATION DES SIGNAUX (l'autre élève peut diffuser en rafale ;
	// chaque signal coûte une relecture de l'échange en base)

	/** Regroupement des signaux d'échange avant relecture (ms). */
	private readonly SIGNAL_REFETCH_DEBOUNCE_MS = 300;

	/** Relectures autorisées par fenêtre glissante. */
	private readonly SIGNAL_REFETCH_LIMIT = 20;

	/** Durée de la fenêtre glissante des relectures (ms). */
	private readonly SIGNAL_REFETCH_WINDOW_MS = 10_000;

	/** Messages de chat éphémères acceptés par fenêtre glissante. */
	private readonly CHAT_MESSAGE_LIMIT = 20;

	/** Durée de la fenêtre glissante du chat (ms). */
	private readonly CHAT_MESSAGE_WINDOW_MS = 10_000;

	/** Messages de chat gardés en mémoire (les plus récents). */
	private readonly MAX_CHAT_MESSAGES = 200;

	/** Relecture en attente (regroupement ou plafond). */
	private refetchTimer: ReturnType<typeof setTimeout> | null = null;

	/** Relecture en cours. */
	private refetchInFlight = false;

	/** Un signal est arrivé pendant la relecture en cours : relire après. */
	private refetchRequestedDuringFlight = false;

	/** Horodatages des relectures récentes. */
	private refetchTimes: number[] = [];

	/** Horodatages des messages de chat reçus récemment (valides ou non). */
	private chatMessageTimes: number[] = [];

	/**
	 * Compteur de MES écritures de validation abouties. Une relecture lancée
	 * avant la dernière peut rendre une validation périmée (pas un refus).
	 */
	private myValidationWrites = 0;

	/**
	 * Max cards per offer
	 */
	private readonly MAX_CARDS_PER_OFFER = 10;

	/**
	 * Max gidouilles per offer
	 */
	private readonly MAX_GIDOUILLES_PER_OFFER = 10000;

	/**
	 * Debounce delay for offer updates (ms)
	 */
	private readonly DEBOUNCE_DELAY = 300;

	/**
	 * Confirmation timeout (5 minutes)
	 */
	private readonly CONFIRMATION_TIMEOUT = 5 * 60 * 1000;

	/**
	 * Presence heartbeat interval (30 seconds)
	 */
	private readonly PRESENCE_INTERVAL = 30_000;

	/**
	 * Idle timeout before auto-disconnect (10 minutes)
	 */
	private readonly IDLE_TIMEOUT = 10 * 60 * 1000;

	// =========================================================================
	// DERIVED STATE
	// =========================================================================

	/**
	 * Whether both parties have validated
	 */
	get bothValidated(): boolean {
		return this.myValidation && this.partnerValidation;
	}

	/**
	 * Whether both parties have confirmed
	 */
	get bothConfirmed(): boolean {
		return this.myConfirmation && this.partnerConfirmation;
	}

	/**
	 * Check if store is initialized
	 */
	get isInitialized(): boolean {
		return this.tradeId !== null && this.supabase !== null && this.userId !== null;
	}

	// =========================================================================
	// INITIALIZATION
	// =========================================================================

	/**
	 * Initialize the trade realtime store
	 *
	 * @param tradeId - The trade ID to connect to
	 * @param userId - Current user's ID
	 * @param supabase - Supabase client instance
	 */
	async init(tradeId: string, userId: string, supabase: SupabaseClient<Database>): Promise<void> {
		if (!browser) {
			logger.warn('Cannot initialize trade store on server');
			return;
		}

		// Cleanup previous state if any
		if (this.tradeId) {
			this.destroy();
		}

		this.loading = true;
		this.error = null;

		try {
			this.supabase = supabase;
			this.userId = userId;
			this.tradeId = tradeId;

			// Load trade data from database
			await this.loadTradeData();

			// Subscribe to broadcast channel
			await this.subscribeToChannel();

			// Start presence heartbeat
			this.startPresenceHeartbeat();

			// Setup visibility handler (pause heartbeat when tab hidden)
			this.setupVisibilityHandler();

			// Setup idle timeout (auto-disconnect after inactivity)
			this.setupIdleTimeout();

			logger.info('Trade realtime store initialized:', { tradeId, userId, role: this.myRole });
		} catch (err) {
			logger.error('Failed to initialize trade store:', err);
			this.error = err instanceof Error ? err.message : 'Failed to initialize trade';
			throw err;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load trade data from database
	 */
	private async loadTradeData(): Promise<void> {
		if (!this.supabase || !this.tradeId || !this.userId) {
			throw new Error('Store not properly configured');
		}

		// Fetch trade with relations
		const { data: trade, error } = await this.supabase
			.from('marketplace_trades')
			.select(
				`
				*,
				initiator:profiles!marketplace_trades_initiator_id_fkey(
					id,
					firstname,
					lastname,
					avatar_url
				),
				partner:profiles!marketplace_trades_partner_id_fkey(
					id,
					firstname,
					lastname,
					avatar_url
				)
			`
			)
			.eq('id', this.tradeId)
			.single();

		if (error) {
			throw new Error(`Failed to load trade: ${error.message}`);
		}

		if (!trade) {
			throw new Error('Trade not found');
		}

		// Determine user's role
		if (trade.initiator_id === this.userId) {
			this.myRole = 'initiator';
		} else if (trade.partner_id === this.userId) {
			this.myRole = 'partner';
		} else {
			throw new Error('User is not part of this trade');
		}

		// Transform initiator data
		const initiatorData = Array.isArray(trade.initiator) ? trade.initiator[0] : trade.initiator;
		const partnerData = Array.isArray(trade.partner) ? trade.partner[0] : trade.partner;

		// Build MarketplaceTrade object
		this.trade = {
			...trade,
			initiator: initiatorData
				? {
						id: initiatorData.id,
						username: `${initiatorData.firstname || ''} ${initiatorData.lastname || ''}`.trim(),
						avatar_url: initiatorData.avatar_url,
						first_name: initiatorData.firstname ?? undefined,
						last_name: initiatorData.lastname ?? undefined
					}
				: undefined,
			partner: partnerData
				? {
						id: partnerData.id,
						username: `${partnerData.firstname || ''} ${partnerData.lastname || ''}`.trim(),
						avatar_url: partnerData.avatar_url,
						first_name: partnerData.firstname ?? undefined,
						last_name: partnerData.lastname ?? undefined
					}
				: undefined
		};

		// Initialize validation state from database
		this.myValidation =
			this.myRole === 'initiator' ? trade.validated_by_initiator : trade.validated_by_partner;
		this.partnerValidation =
			this.myRole === 'initiator' ? trade.validated_by_partner : trade.validated_by_initiator;

		// Offres enregistrées (même lecture que les relectures sur signal)
		if (trade.current_offer) {
			const offers = parseCurrentOffer(trade.current_offer);
			this.myOffer = this.myRole === 'initiator' ? offers.initiator : offers.partner;
			this.partnerOffer = this.myRole === 'initiator' ? offers.partner : offers.initiator;
		}

		// Check if confirmation modal should be shown
		if (trade.confirmation_started_at) {
			this.showConfirmationModal = true;
			this.confirmationDeadline = new Date(
				new Date(trade.confirmation_started_at).getTime() + this.CONFIRMATION_TIMEOUT
			);
		}

		logger.info('Trade data loaded:', {
			tradeId: this.tradeId,
			role: this.myRole,
			status: trade.status
		});
	}

	/**
	 * Subscribe to the broadcast channel
	 *
	 * Canal PRIVÉ (migration `20261004120000_realtime_trade_prive.sql`) : seuls
	 * les deux élèves de l'échange le rejoignent et y diffusent. C'est le SEUL
	 * endroit qui ouvre `trade:<id>` ; une réouverture (page rechargée, retour
	 * après « Quitter ») repasse par `init()` puis ici.
	 *
	 * ⚠️ La policy vérifie QUI diffuse, pas CE QU'IL diffuse : l'autre élève peut
	 * forger n'importe quel payload. Les événements d'échange ne sont donc que
	 * des SIGNAUX (relecture de la ligne en base, sous RLS) ; seuls le texte du
	 * chat éphémère et le heartbeat de présence, sans source en base, sont lus.
	 */
	private async subscribeToChannel(): Promise<void> {
		if (!this.tradeId || !this.supabase) {
			throw new Error('Trade ID not set');
		}

		const channelName = `trade:${this.tradeId}`;

		try {
			const channel = supabaseRealtimeManager.createChannel(channelName, { private: true });

			// Offre, validation, confirmation, annulation, fin : signal → relecture.
			for (const event of TRADE_SIGNAL_EVENTS) {
				channel.on('broadcast', { event }, () => {
					this.scheduleTradeRefetch();
				});
			}

			// Chat éphémère : seul le texte est lu (cf. chatMessagePayloadSchema)
			channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
				// Plafond AVANT validation : une rafale de payloads invalides ne
				// doit pas non plus inonder la console.
				if (!this.acquireChatSlot()) return;
				const validation = chatMessagePayloadSchema.safeParse(payload);
				if (!validation.success) {
					logger.warn('Invalid chat_message payload:', validation.error.issues);
					return;
				}
				this.handleChatMessage(validation.data);
			});

			// Subscribe to presence updates
			channel.on('broadcast', { event: 'presence' }, ({ payload }) => {
				const validation = presencePayloadSchema.safeParse(payload);
				if (!validation.success) {
					logger.warn('Invalid presence payload:', validation.error.issues);
					return;
				}
				this.handlePresence(validation.data);
			});

			// Canal privé : Realtime doit connaître l'élève (jeton de session, pas
			// la clé publique) au moment de la jonction. Les rafraîchissements
			// suivants sont transmis par supabase-js lui-même.
			await this.supabase.realtime.setAuth();

			await supabaseRealtimeManager.subscribeChannel(channelName);

			// Broadcast our presence
			this.broadcastPresence(true);

			logger.info('Subscribed to trade channel:', channelName);
		} catch (err) {
			logger.error('Failed to subscribe to trade channel:', err);
			throw err;
		}
	}

	// =========================================================================
	// CLEANUP
	// =========================================================================

	/**
	 * Cleanup and destroy the store
	 */
	destroy(): void {
		if (!browser) return;

		logger.info('Destroying trade realtime store');

		// Broadcast offline presence before disconnecting
		this.broadcastPresence(false);

		// Clear debounce timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}

		// Clear confirmation timer
		if (this.confirmationTimer) {
			clearTimeout(this.confirmationTimer);
			this.confirmationTimer = null;
		}

		// Relectures sur signal
		if (this.refetchTimer) {
			clearTimeout(this.refetchTimer);
			this.refetchTimer = null;
		}
		this.refetchRequestedDuringFlight = false;
		this.refetchTimes = [];
		this.chatMessageTimes = [];

		// Clear presence interval
		if (this.presenceInterval) {
			clearInterval(this.presenceInterval);
			this.presenceInterval = null;
		}

		// Clear visibility handler
		if (this.visibilityHandler) {
			document.removeEventListener('visibilitychange', this.visibilityHandler);
			this.visibilityHandler = null;
		}

		// Clear idle timeout and activity listener
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = null;
		}
		if (this.idleActivityHandler) {
			document.removeEventListener('mousemove', this.idleActivityHandler);
			document.removeEventListener('keydown', this.idleActivityHandler);
			document.removeEventListener('click', this.idleActivityHandler);
			document.removeEventListener('touchstart', this.idleActivityHandler);
			this.idleActivityHandler = null;
		}

		// Unsubscribe from channel
		if (this.tradeId) {
			const channelName = `trade:${this.tradeId}`;
			supabaseRealtimeManager.unsubscribeChannel(channelName).catch((err) => {
				logger.error('Failed to unsubscribe from trade channel:', err);
			});
		}

		// Reset state
		this.tradeId = null;
		this.myRole = null;
		this.trade = null;
		this.myOffer = { cards: [], gidouilles: 0 };
		this.partnerOffer = { cards: [], gidouilles: 0 };
		this.myCards = [];
		this.partnerCards = [];
		this.myValidation = false;
		this.partnerValidation = false;
		this.showConfirmationModal = false;
		this.myConfirmation = false;
		this.partnerConfirmation = false;
		this.confirmationDeadline = null;
		this.partnerOnline = false;
		this.messages = [];
		this.loading = false;
		this.error = null;
		this.showIdleWarning = false;
		this.supabase = null;
		this.userId = null;
	}

	// =========================================================================
	// OFFER METHODS
	// =========================================================================

	/**
	 * Update current user's offer (debounced, broadcasts and saves to DB)
	 *
	 * @param offer - New offer
	 */
	updateMyOffer(offer: TradeOffer): void {
		// Update local state immediately
		this.myOffer = { ...offer };

		// Reset validation when offer changes
		if (this.myValidation) {
			this.myValidation = false;
			// L'autre élève relit la base : la remise à zéro y est écrite AVANT le signal.
			void this.saveMyValidationReset().then(() => this.broadcastSignal('validation_changed'));
		}

		// Debounce broadcast and DB save
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			// Signal APRÈS l'écriture : l'autre élève relit l'offre en base.
			void this.saveOfferToDatabase().then(() => this.broadcastSignal('offer_updated'));
		}, this.DEBOUNCE_DELAY);
	}

	/**
	 * Écrit en base la remise à zéro de MA validation (offre modifiée).
	 */
	private async saveMyValidationReset(): Promise<void> {
		if (!this.supabase || !this.tradeId || !this.myRole) return;

		// `.select()` : un refus RLS rend zéro ligne, sans erreur.
		const { data, error } =
			this.myRole === 'initiator'
				? await this.supabase
						.from('marketplace_trades')
						.update({ validated_by_initiator: false, updated_at: new Date().toISOString() })
						.eq('id', this.tradeId)
						.select('id')
				: await this.supabase
						.from('marketplace_trades')
						.update({ validated_by_partner: false, updated_at: new Date().toISOString() })
						.eq('id', this.tradeId)
						.select('id');

		if (error) {
			logger.error('Failed to reset validation in DB:', error);
			return;
		}
		if (!data || data.length === 0) {
			logger.error('Validation reset affected 0 row (RLS or trade gone):', this.tradeId);
			return;
		}
		this.myValidationWrites++;
	}

	/**
	 * Save current offer to database (persists for when partner opens trade)
	 * Only updates own part of the offer to avoid overwriting partner's changes
	 */
	private async saveOfferToDatabase(): Promise<void> {
		if (!this.supabase || !this.tradeId || !this.myRole) return;

		try {
			// Read current offer from database to preserve partner's part
			const { data: trade, error: readError } = await this.supabase
				.from('marketplace_trades')
				.select('current_offer')
				.eq('id', this.tradeId)
				.single();

			if (readError) {
				logger.error('Failed to read current offer:', readError);
				return;
			}

			// Parse existing offer or create empty structure
			const existingOffer =
				(trade?.current_offer as {
					from_initiator?: { cards?: string[]; gidouilles?: number };
					from_partner?: { cards?: string[]; gidouilles?: number };
				}) || {};

			// Build updated offer - only modify own part, preserve partner's part
			const myOfferData = { cards: this.myOffer.cards, gidouilles: this.myOffer.gidouilles };

			const updatedOffer =
				this.myRole === 'initiator'
					? {
							from_initiator: myOfferData,
							from_partner: existingOffer.from_partner || { cards: [], gidouilles: 0 }
						}
					: {
							from_initiator: existingOffer.from_initiator || { cards: [], gidouilles: 0 },
							from_partner: myOfferData
						};

			const { error: updateError } = await this.supabase
				.from('marketplace_trades')
				.update({
					current_offer: updatedOffer,
					updated_at: new Date().toISOString()
				})
				.eq('id', this.tradeId);

			if (updateError) {
				logger.error('Failed to save offer to database:', updateError);
			} else {
				logger.trace('Offer saved to database (own part only)');
			}
		} catch (err) {
			logger.error('Error in saveOfferToDatabase:', err);
		}
	}

	/**
	 * Select a card to add to offer
	 *
	 * @param cardId - Card ID to add
	 */
	selectCard(cardId: string): void {
		if (this.myOffer.cards.includes(cardId)) {
			return; // Already selected
		}

		// Validate max cards limit
		if (this.myOffer.cards.length >= this.MAX_CARDS_PER_OFFER) {
			logger.warn(`Max cards (${this.MAX_CARDS_PER_OFFER}) reached`);
			return;
		}

		this.updateMyOffer({
			...this.myOffer,
			cards: [...this.myOffer.cards, cardId]
		});
	}

	/**
	 * Deselect a card from offer
	 *
	 * @param cardId - Card ID to remove
	 */
	deselectCard(cardId: string): void {
		if (!this.myOffer.cards.includes(cardId)) {
			return; // Not selected
		}

		this.updateMyOffer({
			...this.myOffer,
			cards: this.myOffer.cards.filter((id) => id !== cardId)
		});
	}

	/**
	 * Set gidouilles amount in offer
	 *
	 * @param amount - Gidouilles amount
	 */
	setGidouilles(amount: number): void {
		if (amount < 0) {
			amount = 0;
		}

		// Cap at max gidouilles
		if (amount > this.MAX_GIDOUILLES_PER_OFFER) {
			amount = this.MAX_GIDOUILLES_PER_OFFER;
			logger.warn(`Gidouilles capped at ${this.MAX_GIDOUILLES_PER_OFFER}`);
		}

		this.updateMyOffer({
			...this.myOffer,
			gidouilles: amount
		});
	}

	// =========================================================================
	// VALIDATION METHODS
	// =========================================================================

	/**
	 * Toggle validation status
	 */
	async toggleValidation(): Promise<void> {
		if (!this.supabase || !this.tradeId || !this.myRole) {
			logger.warn('Cannot toggle validation: store not initialized');
			return;
		}

		const newValidation = !this.myValidation;

		try {
			// Build current_offer in the format expected by execute_trade RPC
			// Structure: { from_initiator: {cards, gidouilles}, from_partner: {cards, gidouilles} }
			const currentOffer =
				this.myRole === 'initiator'
					? {
							from_initiator: { cards: this.myOffer.cards, gidouilles: this.myOffer.gidouilles },
							from_partner: {
								cards: this.partnerOffer.cards,
								gidouilles: this.partnerOffer.gidouilles
							}
						}
					: {
							from_initiator: {
								cards: this.partnerOffer.cards,
								gidouilles: this.partnerOffer.gidouilles
							},
							from_partner: { cards: this.myOffer.cards, gidouilles: this.myOffer.gidouilles }
						};

			// Use explicit conditional update fields instead of a computed key to satisfy
			// Supabase's RejectExcessProperties type constraint on .update().
			const { error } =
				this.myRole === 'initiator'
					? await this.supabase
							.from('marketplace_trades')
							.update({
								validated_by_initiator: newValidation,
								current_offer: currentOffer,
								updated_at: new Date().toISOString()
							})
							.eq('id', this.tradeId)
					: await this.supabase
							.from('marketplace_trades')
							.update({
								validated_by_partner: newValidation,
								current_offer: currentOffer,
								updated_at: new Date().toISOString()
							})
							.eq('id', this.tradeId);

			if (error) {
				throw new Error(`Failed to update validation: ${error.message}`);
			}

			// Update local state
			this.myValidation = newValidation;
			this.myValidationWrites++;

			// Signal (après l'écriture en base)
			this.broadcastSignal('validation_changed');

			// Check if both validated - show confirmation modal
			if (newValidation && this.partnerValidation) {
				await this.startConfirmationPhase();
			}

			logger.info('Validation toggled:', { newValidation, role: this.myRole });
		} catch (err) {
			logger.error('Failed to toggle validation:', err);
			this.error = err instanceof Error ? err.message : 'Failed to update validation';
		}
	}

	// =========================================================================
	// CONFIRMATION METHODS
	// =========================================================================

	/**
	 * Start the confirmation phase (called when both parties validate)
	 */
	private async startConfirmationPhase(): Promise<void> {
		// Prevent concurrent calls (race condition fix)
		if (this.confirmationPhaseStarting || this.showConfirmationModal) {
			logger.warn('Confirmation phase already starting or modal already shown');
			return;
		}

		if (!this.supabase || !this.tradeId) return;

		this.confirmationPhaseStarting = true;

		const deadline = new Date(Date.now() + this.CONFIRMATION_TIMEOUT);

		// Update database with confirmation start time
		const { error } = await this.supabase
			.from('marketplace_trades')
			.update({
				confirmation_started_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('id', this.tradeId);

		if (error) {
			logger.error('Failed to start confirmation phase:', error);
			this.confirmationPhaseStarting = false;
			return;
		}

		// Show modal and set deadline
		this.showConfirmationModal = true;
		this.confirmationDeadline = deadline;
		this.myConfirmation = false;
		this.partnerConfirmation = false;

		// Set timeout for confirmation expiry
		this.confirmationTimer = setTimeout(() => {
			this.handleConfirmationTimeout();
		}, this.CONFIRMATION_TIMEOUT);

		this.confirmationPhaseStarting = false;
		logger.info('Confirmation phase started, deadline:', deadline);
	}

	/**
	 * Confirm the trade
	 */
	async confirm(): Promise<void> {
		if (!this.supabase || !this.tradeId || !this.myRole) {
			logger.warn('Cannot confirm: store not initialized');
			return;
		}

		try {
			// Call API to confirm trade
			const response = await fetch(`/api/marketplace/trades/${this.tradeId}/confirm`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: 'Failed to confirm trade' }));
				throw new Error(data.message);
			}

			const result = await response.json();

			// Update local state
			this.myConfirmation = true;

			// Signal (la confirmation est écrite en base par l'API)
			this.broadcastSignal('confirmation');

			logger.info('Trade confirmed by:', this.myRole);

			// If trade was executed (both confirmed), update trade status
			if (result.executed && this.trade) {
				logger.info('Trade executed successfully!');
				this.trade = {
					...this.trade,
					status: 'completed',
					completed_at: new Date().toISOString()
				};

				// Signal de fin : l'autre élève relit le statut en base
				this.broadcastSignal('trade_completed');
			}
		} catch (err) {
			logger.error('Failed to confirm trade:', err);
			this.error = err instanceof Error ? err.message : 'Failed to confirm trade';
		}
	}

	/**
	 * Refuse confirmation (reset validations)
	 */
	async refuseConfirmation(): Promise<void> {
		if (!this.supabase || !this.tradeId) {
			logger.warn('Cannot refuse confirmation: store not initialized');
			return;
		}

		try {
			// Reset validations in database
			const { error } = await this.supabase
				.from('marketplace_trades')
				.update({
					validated_by_initiator: false,
					validated_by_partner: false,
					confirmation_started_at: null,
					updated_at: new Date().toISOString()
				})
				.eq('id', this.tradeId);

			if (error) {
				throw new Error(`Failed to refuse confirmation: ${error.message}`);
			}

			// Reset local state
			this.myValidation = false;
			this.partnerValidation = false;
			this.showConfirmationModal = false;
			this.myConfirmation = false;
			this.partnerConfirmation = false;
			this.confirmationDeadline = null;

			// Clear confirmation timer
			if (this.confirmationTimer) {
				clearTimeout(this.confirmationTimer);
				this.confirmationTimer = null;
			}

			// Signal du refus (validations remises à zéro en base ci-dessus)
			this.broadcastSignal('confirmation');

			logger.info('Confirmation refused, validations reset');
		} catch (err) {
			logger.error('Failed to refuse confirmation:', err);
			this.error = err instanceof Error ? err.message : 'Failed to refuse confirmation';
		}
	}

	/**
	 * Handle confirmation timeout
	 */
	private handleConfirmationTimeout(): void {
		logger.warn('Confirmation timed out');

		// Reset confirmation state
		this.showConfirmationModal = false;
		this.myConfirmation = false;
		this.partnerConfirmation = false;
		this.confirmationDeadline = null;

		// Note: Database update should be handled by a server-side job
		// that checks for expired confirmations
	}

	// =========================================================================
	// CHAT METHODS
	// =========================================================================

	/**
	 * Send a chat message
	 *
	 * @param message - Message content
	 */
	async sendMessage(message: string): Promise<void> {
		if (!this.tradeId || !this.userId) {
			logger.warn('Cannot send message: store not initialized');
			return;
		}

		const trimmedMessage = message.trim();
		if (!trimmedMessage || trimmedMessage.length > 500) {
			logger.warn('Invalid message length');
			return;
		}

		const chatMessage: TradeChatMessage = {
			id: crypto.randomUUID(),
			senderId: this.userId,
			message: trimmedMessage,
			createdAt: new Date().toISOString()
		};

		// Add to local state immediately (optimistic)
		this.messages = [...this.messages, chatMessage].slice(-this.MAX_CHAT_MESSAGES);

		// Diffuse le TEXTE seulement : l'auteur est déduit par le destinataire.
		const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
		if (channel) {
			const payload: BroadcastChatMessagePayload = { message: trimmedMessage };
			channel
				.send({
					type: 'broadcast',
					event: 'chat_message',
					payload
				})
				.catch((err) => logger.error('Failed to broadcast chat message:', err));
		}

		logger.trace('Chat message sent:', chatMessage.id);
	}

	// =========================================================================
	// CANCELLATION METHODS
	// =========================================================================

	/**
	 * Cancel the trade
	 */
	async cancelTrade(): Promise<void> {
		if (!this.supabase || !this.tradeId || !this.myRole) {
			logger.warn('Cannot cancel trade: store not initialized');
			return;
		}

		try {
			// Call API to cancel trade
			const response = await fetch(`/api/marketplace/trades/${this.tradeId}/cancel`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({ message: 'Failed to cancel trade' }));
				throw new Error(data.message);
			}

			// Signal d'annulation : l'autre élève relit le statut en base
			this.broadcastSignal('trade_cancelled');

			logger.info('Trade cancelled by:', this.myRole);
		} catch (err) {
			logger.error('Failed to cancel trade:', err);
			this.error = err instanceof Error ? err.message : 'Failed to cancel trade';
		}
	}

	// =========================================================================
	// BROADCAST METHODS
	// =========================================================================

	/**
	 * Diffuse un SIGNAL d'échange, sans contenu : le destinataire relit la base.
	 * À appeler APRÈS l'écriture en base qu'il annonce.
	 *
	 * @param event - Événement d'échange
	 */
	private broadcastSignal(event: (typeof TRADE_SIGNAL_EVENTS)[number]): void {
		if (!this.tradeId) return;

		const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
		if (channel) {
			channel
				.send({ type: 'broadcast', event, payload: {} })
				.catch((err) => logger.error(`Failed to broadcast ${event}:`, err));
		}
	}

	/**
	 * Broadcast presence
	 */
	private broadcastPresence(online: boolean): void {
		if (!this.tradeId) return;

		const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
		if (channel) {
			const payload: BroadcastPresencePayload = { online };

			channel
				.send({
					type: 'broadcast',
					event: 'presence',
					payload
				})
				.catch((err) => logger.error('Failed to broadcast presence:', err));
		}
	}

	// =========================================================================
	// PRESENCE HEARTBEAT
	// =========================================================================

	/**
	 * Start presence heartbeat
	 */
	private startPresenceHeartbeat(): void {
		// Clear existing interval if any
		if (this.presenceInterval) {
			clearInterval(this.presenceInterval);
		}

		// Send heartbeat every 30 seconds
		this.presenceInterval = setInterval(() => {
			this.broadcastPresence(true);
		}, this.PRESENCE_INTERVAL);
	}

	/**
	 * Setup visibility change handler to pause heartbeat when tab is hidden
	 * This significantly reduces realtime quota usage for background tabs
	 */
	private setupVisibilityHandler(): void {
		this.visibilityHandler = () => {
			if (document.hidden) {
				// Tab hidden → stop heartbeat and broadcast offline
				logger.info('Tab hidden, pausing presence heartbeat');
				this.broadcastPresence(false);
				if (this.presenceInterval) {
					clearInterval(this.presenceInterval);
					this.presenceInterval = null;
				}
			} else {
				// Tab visible → resume heartbeat
				logger.info('Tab visible, resuming presence heartbeat');
				this.broadcastPresence(true);
				this.startPresenceHeartbeat();
				// Reset idle timer on tab focus
				this.resetIdleTimer();
			}
		};
		document.addEventListener('visibilitychange', this.visibilityHandler);
	}

	/**
	 * Setup idle timeout to auto-disconnect after prolonged inactivity
	 * Prevents forgotten tabs from consuming realtime quota
	 */
	private setupIdleTimeout(): void {
		// Activity events that reset the idle timer
		this.idleActivityHandler = () => {
			this.resetIdleTimer();
		};

		document.addEventListener('mousemove', this.idleActivityHandler);
		document.addEventListener('keydown', this.idleActivityHandler);
		document.addEventListener('click', this.idleActivityHandler);
		document.addEventListener('touchstart', this.idleActivityHandler);

		// Start the idle timer
		this.resetIdleTimer();
	}

	/**
	 * Reset the idle timer (called on user activity)
	 */
	private resetIdleTimer(): void {
		// Don't reset if warning modal is shown (user must explicitly respond)
		if (this.showIdleWarning) return;

		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
		}

		this.idleTimer = setTimeout(() => {
			logger.warn('Idle timeout reached, showing warning modal');
			this.showIdleWarning = true;
			// Pause heartbeat while waiting for user response
			if (this.presenceInterval) {
				clearInterval(this.presenceInterval);
				this.presenceInterval = null;
			}
		}, this.IDLE_TIMEOUT);
	}

	/**
	 * Continue session after idle warning (user clicked "Continue")
	 */
	continueSession(): void {
		logger.info('User chose to continue session');
		this.showIdleWarning = false;
		// Resume heartbeat and reset idle timer
		this.broadcastPresence(true);
		this.startPresenceHeartbeat();
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = null;
		}
		this.resetIdleTimer();
	}

	/**
	 * End session after idle warning (user clicked "Quit")
	 */
	endSession(): void {
		logger.info('User chose to end session');
		this.showIdleWarning = false;
		this.destroy();
	}

	// =========================================================================
	// BROADCAST HANDLERS
	// =========================================================================

	/**
	 * Signal d'échange reçu : programme une relecture de la ligne en base.
	 *
	 * Anti-saturation : les signaux d'une rafale sont regroupés (fenêtre fixe
	 * de 300 ms ouverte par le premier), une
	 * seule relecture à la fois (un signal reçu pendant la relecture en
	 * déclenche UNE autre après), et au plus SIGNAL_REFETCH_LIMIT relectures par
	 * fenêtre glissante — au-delà, la relecture est reportée, jamais perdue.
	 */
	private scheduleTradeRefetch(): void {
		if (this.refetchInFlight) {
			this.refetchRequestedDuringFlight = true;
			return;
		}
		// Fenêtre FIXE : un minuteur déjà posé (regroupement ou report du
		// plafond) n'est jamais relancé ni effacé — sinon un signal toutes les
		// 250 ms repousserait la relecture sans fin.
		if (this.refetchTimer) return;
		this.refetchTimer = setTimeout(() => {
			this.refetchTimer = null;
			void this.runTradeRefetch();
		}, this.SIGNAL_REFETCH_DEBOUNCE_MS);
	}

	/**
	 * Relit l'échange si le plafond le permet, sinon reporte à la libération
	 * d'une place dans la fenêtre glissante.
	 */
	private async runTradeRefetch(): Promise<void> {
		const now = Date.now();
		this.refetchTimes = this.refetchTimes.filter((t) => now - t < this.SIGNAL_REFETCH_WINDOW_MS);
		if (this.refetchTimes.length >= this.SIGNAL_REFETCH_LIMIT) {
			const wait = this.refetchTimes[0] + this.SIGNAL_REFETCH_WINDOW_MS - now;
			logger.warn('Trop de signaux sur l’échange, relecture reportée de', wait, 'ms');
			if (!this.refetchTimer) {
				this.refetchTimer = setTimeout(() => {
					this.refetchTimer = null;
					void this.runTradeRefetch();
				}, wait);
			}
			return;
		}
		this.refetchTimes.push(now);

		this.refetchInFlight = true;
		try {
			await this.refetchTradeState();
		} finally {
			this.refetchInFlight = false;
			if (this.refetchRequestedDuringFlight) {
				this.refetchRequestedDuringFlight = false;
				this.scheduleTradeRefetch();
			}
		}
	}

	/**
	 * Relit la ligne de l'échange (sous RLS) et applique ce que la base rend.
	 * Zéro ligne (échange supprimé, ou illisible) → rien ne change.
	 */
	private async refetchTradeState(): Promise<void> {
		if (!this.supabase || !this.tradeId) return;
		const tradeId = this.tradeId;
		const writesBeforeRead = this.myValidationWrites;

		const { data, error } = await this.supabase
			.from('marketplace_trades')
			.select(TRADE_SNAPSHOT_COLUMNS)
			.eq('id', tradeId)
			.maybeSingle();

		if (error) {
			logger.error('Failed to refetch trade:', error);
			return;
		}
		if (!data) {
			logger.warn('Trade not readable on refetch (0 row):', tradeId);
			return;
		}
		// Store détruit ou passé à un autre échange pendant la lecture
		if (this.tradeId !== tradeId) return;

		// Une de MES validations a été écrite pendant la lecture : la ligne peut
		// être antérieure, sa valeur pour moi ne prouve pas un refus.
		const staleForMe = this.myValidationWrites !== writesBeforeRead;
		this.applyTradeSnapshot(data, staleForMe);
	}

	/**
	 * Applique la ligne relue : offre, validation et confirmation de l'AUTRE
	 * élève, statut de l'échange, refus de confirmation.
	 *
	 * Mes propres offre/validation restent locales (je suis leur seule source),
	 * sauf la remise à zéro par un refus de confirmation.
	 *
	 * @param row - Ligne `marketplace_trades` lue en base
	 * @param staleForMe - Lecture lancée avant ma dernière écriture de validation
	 */
	private applyTradeSnapshot(row: TradeSnapshotRow, staleForMe = false): void {
		if (!this.myRole || !this.trade) return;
		const partnerIsInitiator = this.myRole === 'partner';

		const offers = parseCurrentOffer(row.current_offer);
		this.partnerOffer = partnerIsInitiator ? offers.initiator : offers.partner;
		this.partnerValidation = partnerIsInitiator
			? row.validated_by_initiator
			: row.validated_by_partner;
		this.partnerConfirmation =
			(partnerIsInitiator ? row.confirmed_by_initiator : row.confirmed_by_partner) === true;

		// Échange terminé ou annulé : seul le statut EN BASE fait foi.
		if (row.status === 'completed' || row.status === 'cancelled') {
			this.trade = {
				...this.trade,
				status: row.status,
				completed_at: row.completed_at,
				cancelled_at: row.cancelled_at
			};
			this.closeConfirmation();
			return;
		}

		// Refus de confirmation par l'autre élève : il a remis MA validation à
		// zéro en base (refuseConfirmation).
		const myDbValidation = partnerIsInitiator
			? row.validated_by_partner
			: row.validated_by_initiator;
		if (this.showConfirmationModal && !myDbValidation && !staleForMe) {
			this.myValidation = false;
			this.partnerValidation = false;
			this.closeConfirmation();
			logger.info('Partner refused confirmation');
			return;
		}

		// Les deux élèves ont validé : ouvrir la confirmation
		if (this.partnerValidation && this.myValidation && !this.showConfirmationModal) {
			void this.startConfirmationPhase();
		}
	}

	/**
	 * Ferme la fenêtre de confirmation et remet son état à zéro.
	 */
	private closeConfirmation(): void {
		this.showConfirmationModal = false;
		this.myConfirmation = false;
		this.partnerConfirmation = false;
		this.confirmationDeadline = null;
		if (this.confirmationTimer) {
			clearTimeout(this.confirmationTimer);
			this.confirmationTimer = null;
		}
	}

	/**
	 * Réserve une place dans la fenêtre glissante du chat (messages reçus,
	 * valides ou non). Au-delà du plafond : ignoré, un seul avertissement.
	 *
	 * @returns false si le plafond est atteint
	 */
	private acquireChatSlot(): boolean {
		const now = Date.now();
		this.chatMessageTimes = this.chatMessageTimes.filter(
			(t) => now - t < this.CHAT_MESSAGE_WINDOW_MS
		);
		if (this.chatMessageTimes.length >= this.CHAT_MESSAGE_LIMIT) {
			if (this.chatMessageTimes.length === this.CHAT_MESSAGE_LIMIT) {
				logger.warn('Trop de messages de chat reçus, ignorés');
				// Marqueur : l'avertissement n'est émis qu'une fois par saturation
				this.chatMessageTimes.push(now);
			}
			return false;
		}
		this.chatMessageTimes.push(now);
		return true;
	}

	/**
	 * Message de chat éphémère reçu sur le canal privé.
	 *
	 * Le chat d'échange n'a pas de source en base (aucune écriture dans
	 * `marketplace_chat_messages` côté store). Sur le canal privé, l'émetteur
	 * est forcément l'AUTRE élève (on ne reçoit pas ses propres broadcasts) :
	 * l'auteur affiché est donc lu dans la ligne de l'échange, jamais dans le
	 * payload ; l'identifiant et l'heure sont locaux (un id forgé en double
	 * casserait la liste à clés).
	 *
	 * @param payload - Texte validé par Zod
	 */
	private handleChatMessage(payload: BroadcastChatMessagePayload): void {
		if (!this.trade || !this.myRole) return;
		const otherStudentId =
			this.myRole === 'initiator' ? this.trade.partner_id : this.trade.initiator_id;

		const message: TradeChatMessage = {
			id: crypto.randomUUID(),
			senderId: otherStudentId,
			message: payload.message,
			createdAt: new Date().toISOString()
		};
		this.messages = [...this.messages, message].slice(-this.MAX_CHAT_MESSAGES);

		logger.trace('Chat message received:', message.id);
	}

	/**
	 * Handle presence update from partner
	 */
	private handlePresence(payload: BroadcastPresencePayload): void {
		this.partnerOnline = payload.online;
		logger.trace('Partner presence:', payload.online);
	}
}

// Export singleton instance
export const tradeRealtimeStore = new TradeRealtimeStore();
