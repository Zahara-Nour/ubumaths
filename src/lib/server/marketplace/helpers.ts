import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// PROFILE HELPERS
// ============================================================================

/**
 * Adds a `username` field (firstname + lastname) to profile objects
 * returned by Supabase joins. The DB has firstname/lastname but
 * marketplace components expect a `username` field.
 */
export function addUsername<T extends Record<string, unknown>>(
	profile: T & { firstname?: string; lastname?: string }
): T & { username: string } {
	const firstname = (profile.firstname as string) || '';
	const lastname = (profile.lastname as string) || '';
	return { ...profile, username: `${firstname} ${lastname}`.trim() || 'Anonyme' };
}

/**
 * Transforms all profile relations in a marketplace record to include username.
 * Handles common relation names: creator, proposer, initiator, partner, sender.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function enrichWithUsernames<T extends Record<string, any>>(record: T): T {
	const profileKeys = [
		'creator',
		'proposer',
		'initiator',
		'partner',
		'sender',
		'offer_by_profile'
	] as const;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result = { ...record } as any;
	for (const key of profileKeys) {
		if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
			result[key] = addUsername(result[key]);
		}
	}
	return result;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default maximum number of trades a student can complete per day
 * Used when no class-specific configuration exists
 */
const DEFAULT_MAX_TRADES_PER_DAY = 10;

/**
 * Default maximum number of active listings a student can have
 * Used when no class-specific configuration exists
 */
const DEFAULT_MAX_LISTINGS_PER_STUDENT = 5;

// vip_cards JSONB is Record<instanceId, { cardId, earnedAt, usedAt? }>
type VipCardsJson = Record<string, { cardId: string; earnedAt: string; usedAt?: string }>;

// ============================================================================
// CARD OWNERSHIP AND VALIDATION
// ============================================================================

/**
 * Validates that a student owns the specified cards, they are not used,
 * and not locked for another entity.
 * @param supabase Supabase client
 * @param studentId Student ID to check ownership for
 * @param cardIds Array of card IDs to validate
 * @param excludeEntityId If provided, locks for this entity are ignored
 *   (e.g. when updating an offer in an existing trade)
 * @returns true if student owns all cards and they are available
 */
export async function validateCardOwnership(
	supabase: SupabaseClient<Database>,
	studentId: string,
	cardIds: string[],
	excludeEntityId?: string
): Promise<boolean> {
	if (cardIds.length === 0) return true;

	// Get student's VIP cards from profile
	const { data: profile, error } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (error || !profile || !profile.vip_cards) {
		return false;
	}

	const ownedCards = profile.vip_cards as VipCardsJson;
	const ownedCardIds = new Set(Object.keys(ownedCards));

	// Check if all specified cards are owned and not used
	const allOwnedAndUnused = cardIds.every(
		(cardId) => ownedCardIds.has(cardId) && !ownedCards[cardId].usedAt
	);
	if (!allOwnedAndUnused) return false;

	// Check if any cards are locked in another listing/trade
	let query = supabase
		.from('marketplace_locked_cards')
		.select('card_instance_id')
		.in('card_instance_id', cardIds)
		.eq('student_id', studentId);

	if (excludeEntityId) {
		query = query.neq('locked_entity_id', excludeEntityId);
	}

	const { data: locks, error: locksError } = await query;

	if (locksError) {
		console.error('Lecture impossible :', locksError);
		throw new Error(locksError.message);
	}

	return !locks || locks.length === 0;
}

/**
 * Checks if cards are unused (not already used in activities)
 * @param supabase Supabase client
 * @param cardIds Array of card IDs to check
 * @returns true if all cards are unused, false otherwise
 */
export async function checkCardsUnused(
	supabase: SupabaseClient<Database>,
	cardIds: string[]
): Promise<boolean> {
	if (cardIds.length === 0) return true;

	const { data, error } = await supabase
		.from('vip_cards_activity')
		.select('id')
		.in('vip_card_id', cardIds)
		.limit(1);

	// Cards are unused if no activities found
	return !error && (!data || data.length === 0);
}

// ============================================================================
// CARD LOCKING
// ============================================================================

/**
 * Locks cards for a specific entity (listing or trade)
 * @param supabase Supabase client
 * @param studentId Student who owns the cards
 * @param cardIds Array of card IDs to lock
 * @param entityId ID of the listing or trade
 * @param lockType Type of entity locking the cards
 * @returns Success status and optional error message
 */
export async function lockCardsForEntity(
	supabase: SupabaseClient<Database>,
	studentId: string,
	cardIds: string[],
	entityId: string,
	lockType: 'listing' | 'trade'
): Promise<{ success: boolean; error?: string }> {
	if (cardIds.length === 0) {
		return { success: true };
	}

	// Use the RPC function to lock cards
	const { data, error } = await supabase.rpc('lock_cards', {
		p_student_id: studentId,
		p_card_ids: cardIds,
		p_entity_id: entityId,
		p_lock_type: lockType
	});

	if (error) {
		return {
			success: false,
			error: error.message || 'Impossible de verrouiller les cartes'
		};
	}

	return { success: !!data };
}

/**
 * Unlocks all cards associated with an entity
 * @param supabase Supabase client
 * @param entityId ID of the listing or trade
 * @returns true if successful, false otherwise
 */
export async function unlockCardsForEntity(
	supabase: SupabaseClient<Database>,
	entityId: string
): Promise<boolean> {
	// Use the RPC function to unlock cards
	const { data, error } = await supabase.rpc('unlock_cards', {
		p_entity_id: entityId
	});

	return !error && !!data;
}

// ============================================================================
// TRADE LIMITS
// ============================================================================

/**
 * Checks if a student has reached their daily trade limit
 * @param supabase Supabase client
 * @param studentId Student ID to check
 * @returns true if under limit, false if at or over limit
 */
export async function checkDailyTradeLimit(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<boolean> {
	// Get student's class configuration
	const { data: classConfig, error: configError } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId)
		.single();

	if (configError || !classConfig) {
		return true; // Allow trading if we can't find class config
	}

	// Get marketplace config for the class
	const { data: config, error: marketplaceError } = await supabase
		.from('marketplace_config')
		.select('max_trades_per_day')
		.eq('class_id', classConfig.class_id)
		.single();

	if (marketplaceError || !config) {
		return true; // Allow trading if no specific config exists
	}

	const maxTrades = config.max_trades_per_day || DEFAULT_MAX_TRADES_PER_DAY;

	// Count today's completed trades
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const { count, error: countError } = await supabase
		.from('marketplace_trades')
		.select('*', { count: 'exact', head: true })
		.or(`initiator_id.eq.${studentId},partner_id.eq.${studentId}`)
		.eq('status', 'completed')
		.gte('completed_at', today.toISOString());

	if (countError) {
		return false;
	}

	return (count || 0) < maxTrades;
}

/**
 * Checks if a student has reached their active listings limit
 * @param supabase Supabase client
 * @param studentId Student ID to check
 * @returns true if under limit, false if at or over limit
 */
export async function checkActiveListingsLimit(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<boolean> {
	// Get student's class configuration
	const { data: classConfig, error: configError } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId)
		.single();

	if (configError || !classConfig) {
		return true; // Allow listing if we can't find class config
	}

	// Get marketplace config for the class
	const { data: config, error: marketplaceError } = await supabase
		.from('marketplace_config')
		.select('max_listings_per_student')
		.eq('class_id', classConfig.class_id)
		.single();

	if (marketplaceError || !config) {
		return true; // Allow listing if no specific config exists
	}

	const maxListings = config.max_listings_per_student || DEFAULT_MAX_LISTINGS_PER_STUDENT;

	// Count active listings
	const { count, error: countError } = await supabase
		.from('marketplace_listings')
		.select('*', { count: 'exact', head: true })
		.eq('creator_id', studentId)
		.eq('status', 'active');

	if (countError) {
		return false;
	}

	return (count || 0) < maxListings;
}

// ============================================================================
// MARKETPLACE STATUS
// ============================================================================

/**
 * Checks if marketplace is enabled for a student
 * @param supabase Supabase client
 * @param studentId Student ID to check
 * @returns true if marketplace is enabled, false otherwise
 */
export async function isMarketplaceEnabled(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<boolean> {
	// Use the RPC function to check if marketplace is enabled
	const { data, error } = await supabase.rpc('check_marketplace_enabled', {
		p_student_id: studentId
	});

	return !error && !!data;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Creates a marketplace notification for a user
 * @param supabase Supabase client
 * @param recipientId User ID to send notification to
 * @param type Type of marketplace notification
 * @param metadata Additional data for the notification
 */
export async function createMarketplaceNotification(
	supabase: SupabaseClient<Database>,
	recipientId: string,
	type:
		| 'proposal_received'
		| 'proposal_accepted'
		| 'proposal_rejected'
		| 'trade_offer'
		| 'trade_completed'
		| 'trade_cancelled',
	_metadata: Record<string, unknown>
): Promise<void> {
	// Map notification types to messages
	const messages: Record<typeof type, string> = {
		proposal_received: 'Vous avez reçu une nouvelle proposition',
		proposal_accepted: 'Votre proposition a été acceptée',
		proposal_rejected: 'Votre proposition a été refusée',
		trade_offer: "Vous avez reçu une nouvelle offre d'échange",
		trade_completed: 'Votre échange a été complété',
		trade_cancelled: 'Un échange a été annulé'
	};

	const actionUrls: Record<typeof type, string> = {
		proposal_received: '/dashboard/student/marketplace',
		proposal_accepted: '/dashboard/student/marketplace',
		proposal_rejected: '/dashboard/student/marketplace',
		trade_offer: '/dashboard/student/marketplace',
		trade_completed: '/dashboard/student/marketplace',
		trade_cancelled: '/dashboard/student/marketplace'
	};

	// Create the notification
	// type must be 'info'|'alert'|'announcement'|'reminder' (DB constraint)
	await supabase.from('notifications').insert({
		is_system: true,
		target_user_ids: [recipientId],
		target_type: 'users',
		type: 'info',
		system_event_type: `marketplace_${type}`,
		title: 'Marketplace',
		message: messages[type],
		action_url: actionUrls[type],
		action_label: 'Voir',
		priority: 'normal'
	});
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the school ID for a student
 * @param supabase Supabase client
 * @param studentId Student ID
 * @returns School ID or null if not found
 */
export async function getStudentSchoolId(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<string | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select('school_id')
		.eq('id', studentId)
		.single();

	return error || !data ? null : data.school_id;
}

/**
 * Verifies that two users are friends
 * @param supabase Supabase client
 * @param userId1 First user ID
 * @param userId2 Second user ID
 * @returns true if users are friends, false otherwise
 */
export async function verifyFriendship(
	supabase: SupabaseClient<Database>,
	userId1: string,
	userId2: string
): Promise<boolean> {
	const { data, error } = await supabase
		.from('friendships')
		.select('id')
		.or(
			`and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`
		)
		.eq('status', 'accepted')
		.limit(1);

	return !error && data && data.length > 0;
}

/**
 * Gets a student's current gidouilles balance
 * @param supabase Supabase client
 * @param studentId Student ID
 * @returns Gidouilles balance or 0 if error
 */
export async function getStudentGidouilles(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<number> {
	const { data, error } = await supabase
		.from('profiles')
		.select('gidouilles')
		.eq('id', studentId)
		.single();

	return error || !data ? 0 : data.gidouilles;
}

// ============================================================================
// LISTING ENRICHMENT
// ============================================================================

/**
 * Template data structure for card display
 */
export interface CardTemplateInfo {
	id: string;
	name: string;
	description: string;
	image_path: string | null;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	category: string | null;
}

/**
 * Enriched card data for offered cards
 */
export interface OfferedCardInfo {
	id: string;
	template_id: string;
	template: CardTemplateInfo;
}

/**
 * Enriches marketplace listings with card template data
 * @param supabase Supabase client
 * @param listings Array of marketplace listings to enrich
 * @returns Enriched listings with offered_cards and wanted_templates populated
 */
export async function enrichListingsWithCardData<
	T extends {
		creator_id: string;
		offered_card_ids: string[] | null;
		wanted_card_template_ids: string[] | null;
	}
>(
	supabase: SupabaseClient<Database>,
	listings: T[]
): Promise<
	(T & {
		offered_cards?: OfferedCardInfo[];
		/** Au moins une carte offerte n'a pas pu être résolue : ne pas laisser croire l'offre complète. */
		offre_incomplete?: boolean;
		wanted_templates?: CardTemplateInfo[];
	})[]
> {
	if (listings.length === 0) return listings;

	// Collect unique creator IDs and template IDs
	const creatorIds = new Set<string>();
	const wantedTemplateIds = new Set<string>();

	for (const listing of listings) {
		creatorIds.add(listing.creator_id);
		if (listing.wanted_card_template_ids) {
			for (const id of listing.wanted_card_template_ids) {
				wantedTemplateIds.add(id);
			}
		}
	}

	// Traduire les identifiants d'INSTANCE offerts en identifiants de MODÈLE.
	//
	// ⚠️ Par la RPC, PAS par `profiles.vip_cards` du vendeur. Depuis
	// `20260915580000`, l'acheteur ne lit plus le profil du vendeur — et une
	// lecture filtrée par la RLS ne rend AUCUNE erreur, elle rend zéro ligne.
	// La garde ci-dessous ne se serait donc jamais déclenchée : l'offre se
	// serait affichée VIDE, et l'élève aurait accepté un échange sans voir ce
	// qu'on lui propose. Mesuré : 5 annonces sur 13, invisibles pour 64 à 75
	// élèves sur 76.
	//
	// `resolve_card_instances` est SECURITY DEFINER et ne rend aucune colonne
	// de profil : seulement instance → modèle.
	const instancesOffertes = [
		...new Set(listings.flatMap((l) => (l.offered_card_ids as string[] | null) ?? []))
	];

	const { data: resolues, error: creatorsError } =
		instancesOffertes.length > 0
			? await supabase.rpc('resolve_card_instances', { p_instance_ids: instancesOffertes })
			: { data: [], error: null };

	// Une carte non résolue est SIGNALÉE, jamais retirée en silence (cf. la
	// construction de `offered_cards` plus bas).
	if (creatorsError) {
		console.error('[marketplace] Cartes des vendeurs illisibles :', creatorsError);
		throw new Error(creatorsError.message);
	}

	// La correspondance instance → modèle, tous vendeurs confondus. La RPC ne
	// dit pas à qui appartient quoi, et l'affichage n'en a pas besoin : une
	// annonce porte déjà ses propres `offered_card_ids`.
	const instanceMap = new Map<string, string>();
	const offeredTemplateIds = new Set<string>();

	for (const ligne of resolues ?? []) {
		instanceMap.set(ligne.instance_id, ligne.card_id);
		offeredTemplateIds.add(ligne.card_id);
	}

	// Fetch all needed templates in one query
	const allTemplateIds = [...offeredTemplateIds, ...wantedTemplateIds];
	const templateMap = new Map<string, CardTemplateInfo>();

	if (allTemplateIds.length > 0) {
		const { data: templates, error: templatesError } = await supabase
			.from('vip_card_templates')
			.select('id, name, description, image_path, rarity, category')
			.in('id', allTemplateIds);

		if (templatesError) {
			console.error('[marketplace] Modèles de cartes illisibles :', templatesError);
			throw new Error(templatesError.message);
		}

		if (templates) {
			for (const template of templates) {
				templateMap.set(template.id, {
					id: template.id,
					name: template.name,
					description: template.description,
					image_path: template.image_path,
					rarity: template.rarity as 'common' | 'rare' | 'epic' | 'legendary',
					category: template.category
				});
			}
		}
	}

	// ⚠️ Le repli « à l'échelle de l'école » a disparu, et ce n'est pas un
	// oubli : il relisait `profiles.vip_cards` de toute l'école avec le client
	// de l'élève, donc sous la même RLS que la lecture qu'il devait rattraper.
	// Il ne pouvait rien rattraper du tout. `resolve_card_instances` cherche
	// déjà dans TOUS les profils, côté serveur : ce qu'elle ne trouve pas
	// n'existe plus nulle part.
	const globalInstanceMap = instanceMap;

	// Une carte que plus personne ne détient — transférée, ou supprimée.
	const instancesIntrouvables = new Set(
		listings.flatMap((l) =>
			((l.offered_card_ids as string[] | null) ?? []).filter((id) => !globalInstanceMap.has(id))
		)
	);

	if (instancesIntrouvables.size > 0) {
		// Bruyant exprès : une offre incomplète est un problème de consentement,
		// pas un détail d'affichage.
		console.warn(
			`[marketplace] ${instancesIntrouvables.size} carte(s) offerte(s) introuvable(s) — les annonces concernées seront marquées incomplètes.`
		);
	}

	// Enrich each listing
	return listings.map((listing) => {
		// Map offered card IDs to templates using global map
		//
		// ⚠️ `offreIncomplete` n'est pas cosmétique. Une carte qu'on n'arrive pas
		// à résoudre était RETIRÉE en silence : l'annonce s'affichait avec moins
		// de cartes qu'elle n'en contient, et l'élève acceptait un échange sur ce
		// qu'il voyait. Mieux vaut dire « offre incomplète » que mentir par
		// omission.
		const offeredCards: OfferedCardInfo[] = [];
		let offreIncomplete = false;
		if (listing.offered_card_ids) {
			for (const cardId of listing.offered_card_ids) {
				const templateId = globalInstanceMap.get(cardId);
				const template = templateId ? templateMap.get(templateId) : undefined;

				if (templateId && template) {
					offeredCards.push({
						id: cardId,
						template_id: templateId,
						template
					});
				} else {
					offreIncomplete = true;
				}
			}
		}

		// Get wanted templates
		const wantedTemplates: CardTemplateInfo[] = [];
		if (listing.wanted_card_template_ids) {
			for (const templateId of listing.wanted_card_template_ids) {
				const template = templateMap.get(templateId);
				if (template) {
					wantedTemplates.push(template);
				}
			}
		}

		return {
			...listing,
			offered_cards: offeredCards.length > 0 ? offeredCards : undefined,
			offre_incomplete: offreIncomplete || undefined,
			wanted_templates: wantedTemplates.length > 0 ? wantedTemplates : undefined
		};
	});
}

/**
 * Enriches marketplace proposals with card template data
 * Maps offered_card_ids (instance IDs) to template info using proposer's vip_cards
 */
export async function enrichProposalsWithCardData<
	T extends {
		proposer_id: string;
		offered_card_ids: string[] | null;
	}
>(
	supabase: SupabaseClient<Database>,
	proposals: T[]
): Promise<(T & { offered_cards?: OfferedCardInfo[] })[]> {
	if (proposals.length === 0) return proposals;

	// Collect unique proposer IDs
	const proposerIds = [...new Set(proposals.map((p) => p.proposer_id))];

	// Fetch proposers' vip_cards to map instance IDs to template IDs
	const { data: proposers, error: proposersError } = await supabase
		.from('profiles')
		.select('id, vip_cards')
		.in('id', proposerIds);

	// Même risque côté propositions reçues : une carte non résolue disparaît de
	// l'offre affichée à l'élève.
	if (proposersError) {
		console.error('[marketplace] Cartes des proposants illisibles :', proposersError);
		throw new Error(proposersError.message);
	}

	const proposerCardsMap = new Map<string, Map<string, string>>();
	const templateIds = new Set<string>();

	if (proposers) {
		for (const proposer of proposers) {
			const cardMap = new Map<string, string>();
			const vipCards = proposer.vip_cards as VipCardsJson | null;
			if (vipCards) {
				for (const [instanceId, card] of Object.entries(vipCards)) {
					cardMap.set(instanceId, card.cardId);
					templateIds.add(card.cardId);
				}
			}
			proposerCardsMap.set(proposer.id, cardMap);
		}
	}

	// Fetch all needed templates
	const templateMap = new Map<string, CardTemplateInfo>();
	if (templateIds.size > 0) {
		const { data: templates, error: templatesError } = await supabase
			.from('vip_card_templates')
			.select('id, name, description, image_path, rarity, category')
			.in('id', Array.from(templateIds));

		if (templatesError) {
			console.error('[marketplace] Modèles de cartes illisibles :', templatesError);
			throw new Error(templatesError.message);
		}

		if (templates) {
			for (const t of templates) {
				templateMap.set(t.id, {
					id: t.id,
					name: t.name,
					description: t.description,
					image_path: t.image_path,
					rarity: t.rarity as CardTemplateInfo['rarity'],
					category: t.category
				});
			}
		}
	}

	return proposals.map((proposal) => {
		const proposerCards = proposerCardsMap.get(proposal.proposer_id);
		const offeredCards: OfferedCardInfo[] = [];

		if (proposal.offered_card_ids && proposerCards) {
			for (const cardId of proposal.offered_card_ids) {
				const templateId = proposerCards.get(cardId);
				if (templateId) {
					const template = templateMap.get(templateId);
					if (template) {
						offeredCards.push({ id: cardId, template_id: templateId, template });
					}
				}
			}
		}

		return {
			...proposal,
			offered_cards: offeredCards.length > 0 ? offeredCards : undefined
		};
	});
}
