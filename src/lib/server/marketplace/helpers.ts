import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

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

type VipCard = {
	id: string;
	template_id: string;
	obtained_at: string;
};

// ============================================================================
// CARD OWNERSHIP AND VALIDATION
// ============================================================================

/**
 * Validates that a student owns the specified cards
 * @param supabase Supabase client
 * @param studentId Student ID to check ownership for
 * @param cardIds Array of card IDs to validate
 * @returns true if student owns all cards, false otherwise
 */
export async function validateCardOwnership(
	supabase: SupabaseClient<Database>,
	studentId: string,
	cardIds: string[]
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

	const ownedCards = profile.vip_cards as VipCard[];
	const ownedCardIds = new Set(ownedCards.map((card) => card.id));

	// Check if all specified cards are owned
	return cardIds.every((cardId) => ownedCardIds.has(cardId));
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
		proposal_received: '/dashboard/marketplace/proposals',
		proposal_accepted: '/dashboard/marketplace/proposals',
		proposal_rejected: '/dashboard/marketplace/proposals',
		trade_offer: '/dashboard/marketplace/trades',
		trade_completed: '/dashboard/marketplace/trades',
		trade_cancelled: '/dashboard/marketplace/trades'
	};

	// Create the notification
	await supabase.from('notifications').insert({
		target_user_ids: [recipientId],
		target_type: 'users',
		type: 'marketplace',
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
			`and(user_id.eq.${userId1},friend_id.eq.${userId2}),and(user_id.eq.${userId2},friend_id.eq.${userId1})`
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
