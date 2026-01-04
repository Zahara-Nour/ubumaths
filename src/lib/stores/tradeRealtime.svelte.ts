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
 * Schema for offer update payload
 */
const offerUpdatedPayloadSchema = z.object({
	from: z.enum(['initiator', 'partner']),
	cards: z.array(z.string().uuid()),
	gidouilles: z.number().int().min(0)
});

/**
 * Schema for validation change payload
 */
const validationChangedPayloadSchema = z.object({
	from: z.enum(['initiator', 'partner']),
	validated: z.boolean()
});

/**
 * Schema for confirmation payload
 */
const confirmationPayloadSchema = z.object({
	from: z.enum(['initiator', 'partner']),
	confirmed: z.boolean()
});

/**
 * Schema for chat message payload
 */
const chatMessagePayloadSchema = z.object({
	id: z.string().uuid(),
	senderId: z.string().uuid(),
	message: z.string().max(500),
	createdAt: z.string()
});

/**
 * Schema for trade cancelled payload
 */
const tradeCancelledPayloadSchema = z.object({
	by: z.enum(['initiator', 'partner'])
});

/**
 * Schema for presence payload
 */
const presencePayloadSchema = z.object({
	online: z.boolean()
});

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
 * Broadcast event types
 */
type BroadcastOfferUpdatedPayload = z.infer<typeof offerUpdatedPayloadSchema>;
type BroadcastValidationChangedPayload = z.infer<typeof validationChangedPayloadSchema>;
type BroadcastConfirmationPayload = z.infer<typeof confirmationPayloadSchema>;
type BroadcastChatMessagePayload = z.infer<typeof chatMessagePayloadSchema>;
type BroadcastTradeCancelledPayload = z.infer<typeof tradeCancelledPayloadSchema>;
type BroadcastPresencePayload = z.infer<typeof presencePayloadSchema>;

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

		// Parse current offer if exists
		if (trade.current_offer) {
			// Support both formats:
			// - New format: { from_initiator: {cards, gidouilles}, from_partner: {cards, gidouilles} }
			// - Legacy format: { initiator_cards, initiator_gidouilles, partner_cards, partner_gidouilles }
			const offer = trade.current_offer as {
				// New format
				from_initiator?: { cards?: string[]; gidouilles?: number };
				from_partner?: { cards?: string[]; gidouilles?: number };
				// Legacy format
				initiator_cards?: string[];
				initiator_gidouilles?: number;
				partner_cards?: string[];
				partner_gidouilles?: number;
			};

			// Determine which format we're dealing with
			const hasNewFormat = offer.from_initiator || offer.from_partner;

			const initiatorCards = hasNewFormat
				? (offer.from_initiator?.cards ?? [])
				: (offer.initiator_cards ?? []);
			const initiatorGidouilles = hasNewFormat
				? (offer.from_initiator?.gidouilles ?? 0)
				: (offer.initiator_gidouilles ?? 0);
			const partnerCards = hasNewFormat
				? (offer.from_partner?.cards ?? [])
				: (offer.partner_cards ?? []);
			const partnerGidouilles = hasNewFormat
				? (offer.from_partner?.gidouilles ?? 0)
				: (offer.partner_gidouilles ?? 0);

			if (this.myRole === 'initiator') {
				this.myOffer = {
					cards: initiatorCards,
					gidouilles: initiatorGidouilles
				};
				this.partnerOffer = {
					cards: partnerCards,
					gidouilles: partnerGidouilles
				};
			} else {
				this.myOffer = {
					cards: partnerCards,
					gidouilles: partnerGidouilles
				};
				this.partnerOffer = {
					cards: initiatorCards,
					gidouilles: initiatorGidouilles
				};
			}
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
	 */
	private async subscribeToChannel(): Promise<void> {
		if (!this.tradeId) {
			throw new Error('Trade ID not set');
		}

		const channelName = `trade:${this.tradeId}`;

		try {
			const channel = supabaseRealtimeManager.createChannel(channelName);

			// Subscribe to offer updates
			channel.on('broadcast', { event: 'offer_updated' }, ({ payload }) => {
				const validation = offerUpdatedPayloadSchema.safeParse(payload);
				if (!validation.success) {
					logger.warn('Invalid offer_updated payload:', validation.error.issues);
					return;
				}
				this.handleOfferUpdated(validation.data);
			});

			// Subscribe to validation changes
			channel.on('broadcast', { event: 'validation_changed' }, ({ payload }) => {
				const validation = validationChangedPayloadSchema.safeParse(payload);
				if (!validation.success) {
					logger.warn('Invalid validation_changed payload:', validation.error.issues);
					return;
				}
				this.handleValidationChanged(validation.data);
			});

			// Subscribe to confirmations
			channel.on('broadcast', { event: 'confirmation' }, ({ payload }) => {
				const validation = confirmationPayloadSchema.safeParse(payload);
				if (!validation.success) {
					logger.warn('Invalid confirmation payload:', validation.error.issues);
					return;
				}
				this.handleConfirmation(validation.data);
			});

			// Subscribe to chat messages
			channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
				const validation = chatMessagePayloadSchema.safeParse(payload);
				if (!validation.success) {
					logger.warn('Invalid chat_message payload:', validation.error.issues);
					return;
				}
				this.handleChatMessage(validation.data);
			});

			// Subscribe to trade cancellation
			channel.on('broadcast', { event: 'trade_cancelled' }, ({ payload }) => {
				const validation = tradeCancelledPayloadSchema.safeParse(payload);
				if (!validation.success) {
					logger.warn('Invalid trade_cancelled payload:', validation.error.issues);
					return;
				}
				this.handleTradeCancelled(validation.data);
			});

			// Subscribe to trade completion
			channel.on('broadcast', { event: 'trade_completed' }, () => {
				this.handleTradeCompleted();
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
			// Broadcast validation reset
			this.broadcastValidationChanged(false);
		}

		// Debounce broadcast and DB save
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.broadcastOfferUpdated();
			// Also persist to database so partner sees it when they open the trade
			this.saveOfferToDatabase();
		}, this.DEBOUNCE_DELAY);
	}

	/**
	 * Save current offer to database (persists for when partner opens trade)
	 */
	private async saveOfferToDatabase(): Promise<void> {
		if (!this.supabase || !this.tradeId || !this.myRole) return;

		// Build current_offer in the format expected by execute_trade RPC
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

		const { error } = await this.supabase
			.from('marketplace_trades')
			.update({
				current_offer: currentOffer,
				updated_at: new Date().toISOString()
			})
			.eq('id', this.tradeId);

		if (error) {
			logger.error('Failed to save offer to database:', error);
		} else {
			logger.trace('Offer saved to database');
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
			// Update database
			const updateField =
				this.myRole === 'initiator' ? 'validated_by_initiator' : 'validated_by_partner';

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

			const { error } = await this.supabase
				.from('marketplace_trades')
				.update({
					[updateField]: newValidation,
					// Save current offer state when validating
					current_offer: currentOffer,
					updated_at: new Date().toISOString()
				})
				.eq('id', this.tradeId);

			if (error) {
				throw new Error(`Failed to update validation: ${error.message}`);
			}

			// Update local state
			this.myValidation = newValidation;

			// Broadcast change
			this.broadcastValidationChanged(newValidation);

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

			// Broadcast confirmation
			this.broadcastConfirmation(true);

			logger.info('Trade confirmed by:', this.myRole);

			// If trade was executed (both confirmed), update trade status
			if (result.executed && this.trade) {
				logger.info('Trade executed successfully!');
				this.trade = {
					...this.trade,
					status: 'completed',
					completed_at: new Date().toISOString()
				};

				// Broadcast trade completion so partner's page also updates
				const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
				if (channel) {
					channel
						.send({
							type: 'broadcast',
							event: 'trade_completed',
							payload: { tradeId: this.tradeId }
						})
						.catch((err) => logger.error('Failed to broadcast trade completion:', err));
				}
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

			// Broadcast refusal
			this.broadcastConfirmation(false);

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
		this.messages = [...this.messages, chatMessage];

		// Broadcast message
		const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
		if (channel) {
			channel
				.send({
					type: 'broadcast',
					event: 'chat_message',
					payload: chatMessage
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

			// Broadcast cancellation
			const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
			if (channel) {
				channel
					.send({
						type: 'broadcast',
						event: 'trade_cancelled',
						payload: { by: this.myRole }
					})
					.catch((err) => logger.error('Failed to broadcast cancellation:', err));
			}

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
	 * Broadcast offer update
	 */
	private broadcastOfferUpdated(): void {
		if (!this.tradeId || !this.myRole) return;

		const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
		if (channel) {
			const payload: BroadcastOfferUpdatedPayload = {
				from: this.myRole,
				cards: this.myOffer.cards,
				gidouilles: this.myOffer.gidouilles
			};

			channel
				.send({
					type: 'broadcast',
					event: 'offer_updated',
					payload
				})
				.catch((err) => logger.error('Failed to broadcast offer update:', err));
		}
	}

	/**
	 * Broadcast validation change
	 */
	private broadcastValidationChanged(validated: boolean): void {
		if (!this.tradeId || !this.myRole) return;

		const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
		if (channel) {
			const payload: BroadcastValidationChangedPayload = {
				from: this.myRole,
				validated
			};

			channel
				.send({
					type: 'broadcast',
					event: 'validation_changed',
					payload
				})
				.catch((err) => logger.error('Failed to broadcast validation change:', err));
		}
	}

	/**
	 * Broadcast confirmation
	 */
	private broadcastConfirmation(confirmed: boolean): void {
		if (!this.tradeId || !this.myRole) return;

		const channel = supabaseRealtimeManager.getChannel(`trade:${this.tradeId}`);
		if (channel) {
			const payload: BroadcastConfirmationPayload = {
				from: this.myRole,
				confirmed
			};

			channel
				.send({
					type: 'broadcast',
					event: 'confirmation',
					payload
				})
				.catch((err) => logger.error('Failed to broadcast confirmation:', err));
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
	 * Handle offer update from partner
	 */
	private handleOfferUpdated(payload: BroadcastOfferUpdatedPayload): void {
		// Ignore our own updates
		if (payload.from === this.myRole) {
			return;
		}

		// Update partner's offer
		this.partnerOffer = {
			cards: payload.cards,
			gidouilles: payload.gidouilles
		};

		// Reset partner validation when their offer changes
		this.partnerValidation = false;

		logger.trace('Partner offer updated:', payload);
	}

	/**
	 * Handle validation change from partner
	 */
	private handleValidationChanged(payload: BroadcastValidationChangedPayload): void {
		// Ignore our own updates
		if (payload.from === this.myRole) {
			return;
		}

		// Update partner's validation
		this.partnerValidation = payload.validated;

		// Check if both validated - show confirmation modal
		if (payload.validated && this.myValidation && !this.showConfirmationModal) {
			this.startConfirmationPhase();
		}

		logger.trace('Partner validation changed:', payload);
	}

	/**
	 * Handle confirmation from partner
	 */
	private handleConfirmation(payload: BroadcastConfirmationPayload): void {
		// Ignore our own updates
		if (payload.from === this.myRole) {
			return;
		}

		// Handle refusal (confirmed = false)
		if (!payload.confirmed) {
			this.myValidation = false;
			this.partnerValidation = false;
			this.showConfirmationModal = false;
			this.myConfirmation = false;
			this.partnerConfirmation = false;
			this.confirmationDeadline = null;

			if (this.confirmationTimer) {
				clearTimeout(this.confirmationTimer);
				this.confirmationTimer = null;
			}

			// Sync database state when partner refuses
			if (this.supabase && this.tradeId) {
				this.supabase
					.from('marketplace_trades')
					.update({
						validated_by_initiator: false,
						validated_by_partner: false,
						confirmation_started_at: null,
						updated_at: new Date().toISOString()
					})
					.eq('id', this.tradeId)
					.then(({ error }) => {
						if (error) {
							logger.error('Failed to reset confirmation in DB:', error);
						}
					});
			}

			logger.info('Partner refused confirmation');
			return;
		}

		// Update partner's confirmation
		this.partnerConfirmation = true;

		// If we also confirmed, trade is complete
		if (this.myConfirmation) {
			logger.info('Trade completed - both parties confirmed');
		}

		logger.trace('Partner confirmed:', payload);
	}

	/**
	 * Handle chat message from partner
	 */
	private handleChatMessage(payload: BroadcastChatMessagePayload): void {
		// Ignore our own messages
		if (payload.senderId === this.userId) {
			return;
		}

		// Add message to state
		this.messages = [
			...this.messages,
			{
				id: payload.id,
				senderId: payload.senderId,
				message: payload.message,
				createdAt: payload.createdAt
			}
		];

		logger.trace('Chat message received:', payload.id);
	}

	/**
	 * Handle trade cancellation
	 */
	private handleTradeCancelled(payload: BroadcastTradeCancelledPayload): void {
		logger.info('Trade cancelled by:', payload.by);

		// Update trade status
		if (this.trade) {
			this.trade = {
				...this.trade,
				status: 'cancelled',
				cancelled_at: new Date().toISOString()
			};
		}

		// Close confirmation modal if open
		this.showConfirmationModal = false;
	}

	/**
	 * Handle trade completion broadcast from partner
	 */
	private handleTradeCompleted(): void {
		logger.info('Trade completed - received broadcast');

		// Update trade status
		if (this.trade) {
			this.trade = {
				...this.trade,
				status: 'completed',
				completed_at: new Date().toISOString()
			};
		}

		// Close confirmation modal
		this.showConfirmationModal = false;
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
