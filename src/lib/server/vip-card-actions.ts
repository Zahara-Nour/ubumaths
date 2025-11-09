/**
 * @deprecated This file is deprecated as of 2025-11-06.
 *
 * VIP card actions are now handled client-side with specialized modals.
 * Each action type calls its own API endpoint:
 *
 * - draw_cards → /api/rewards/draw-vip-cards (existing)
 * - remove_warnings → /api/warnings/remove-multiple (future)
 * - exchange_cards → /api/vip-cards/exchange (future)
 * - add_gidouilles → /api/teacher/rewards/update-student (existing)
 *
 * After action completion, all flows call /api/vip-cards/use-card
 * to mark the VIP card instance as used.
 *
 * This file is kept for reference and potential logic reuse in new endpoints.
 * The algorithms here (especially minRarity weighted selection) may be useful
 * when implementing the new specialized endpoints.
 *
 * See: docs/features/vip-card-draw-system.md for new architecture
 *
 * ============================================================================
 * ORIGINAL DOCUMENTATION (DEPRECATED)
 * ============================================================================
 *
 * VIP Card Actions Execution Service
 * ===================================
 *
 * Server-side functions for executing VIP card actions when approved by teachers.
 *
 * FEATURES:
 * - Execute draw_cards action (award random VIP cards)
 * - Execute remove_warnings action (remove student warnings)
 * - Execute exchange_cards action (3 modes: replace_random, rarity_points, discard_for_specific)
 * - Execute add_gidouilles action (bonus gidouilles)
 *
 * USAGE:
 * ```typescript
 * import { executeVipCardAction } from '$lib/server/vip-card-actions';
 *
 * const result = await executeVipCardAction({
 *   action: card.action,
 *   studentId: 'student-uuid',
 *   supabase
 * });
 * ```
 *
 * SECURITY:
 * - All functions verify teacher owns the student's class via RPC functions
 * - Uses SECURITY DEFINER RPC functions for database operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	VipCardAction,
	ExchangeCardAction,
	StudentVipCards,
	VipCardRarity
} from '$lib/types/vip-card';
import { getRarityPoints } from '$lib/types/vip-card';
import { getTemplateById, getTemplatesByRarity } from '$lib/server/vip-card-queries';
import { removeWarning, type Warning } from '$lib/server/warnings';
import { error } from '@sveltejs/kit';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of executing a VIP card action
 */
export interface ActionResult {
	success: boolean;
	message: string;
	data?: unknown;
}

/**
 * Result of draw_cards action
 *
 * Enhanced format includes full card details when using filters:
 * - cardId: Card definition ID
 * - instanceId: Unique instance ID for the awarded card
 * - name: Display name of the card
 * - rarity: Rarity level (common, rare, epic, legendary)
 * - earnedAt: ISO timestamp when card was awarded
 *
 * Legacy format (without filters) only includes cardId and name for backwards compatibility
 */
export interface DrawCardsResult {
	cardsDrawn: Array<{
		cardId: string;
		name: string;
		instanceId?: string;
		rarity?: string;
		earnedAt?: string;
	}>;
}

/**
 * Result of remove_warnings action
 */
export interface RemoveWarningsResult {
	warningsRemoved: number;
	warningIds: string[];
}

/**
 * Result of exchange_cards action
 */
export interface ExchangeCardsResult {
	cardsDiscarded: Array<{ cardId: string; name: string }>;
	cardsReceived: Array<{ cardId: string; name: string }>;
}

/**
 * Result of add_gidouilles action
 */
export interface AddGidouillesResult {
	oldBalance: number;
	newBalance: number;
	amountAdded: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Execute a VIP card action
 *
 * Dispatches to the appropriate action handler based on action type.
 *
 * @param options - Configuration object
 * @param options.action - The VIP card action to execute
 * @param options.studentId - Student's user ID
 * @param options.supabase - Supabase client instance
 * @param options.teacherId - Teacher's user ID (for verification)
 * @returns Promise resolving to action result
 */
export async function executeVipCardAction(options: {
	action: VipCardAction;
	studentId: string;
	supabase: SupabaseClient<Database>;
	teacherId: string;
}): Promise<ActionResult> {
	const { action, studentId, supabase, teacherId } = options;

	try {
		switch (action.type) {
			case 'draw_cards':
				return await executeDrawCards({
					count: action.count,
					filters: action.filters,
					studentId,
					supabase
				});

			case 'remove_warnings':
				return await executeRemoveWarnings({
					count: action.count,
					warningType: action.warningType,
					studentId,
					supabase,
					teacherId
				});

			case 'exchange_cards':
				return await executeExchangeCards({
					exchange: action.exchange,
					studentId,
					supabase
				});

			case 'add_gidouilles':
				return await executeAddGidouilles({
					amount: action.amount,
					studentId,
					supabase
				});

			default:
				throw error(400, `Unknown action type: ${(action as { type: string }).type}`);
		}
	} catch (err) {
		console.error('[executeVipCardAction] Error executing action:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return {
			success: false,
			message: `Failed to execute action: ${message}`
		};
	}
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

/**
 * Execute draw_cards action
 *
 * Awards N random VIP cards to the student (no gidouilles cost).
 *
 * BEHAVIOR:
 * - If `filters` parameter is provided with at least one property → uses new RPC `award_vip_cards_with_filters`
 * - If no filters → uses legacy loop with `award_vip_card_no_cost` (backwards compatibility)
 *
 * NEW RPC WITH FILTERS:
 * - Returns full card details: { cardId, instanceId, name, rarity, earnedAt }
 * - Supports: forceRarity, minRarity, excludeCardIds, onlyCardsWithActions
 * - More efficient (single RPC call instead of loop)
 *
 * LEGACY BEHAVIOR:
 * - Returns basic details: { cardId, name }
 * - Maintains compatibility with existing cards (soldes, mega-soldes)
 */
async function executeDrawCards(options: {
	count: number;
	filters?: import('$lib/types/vip-card').DrawCardsFilters;
	studentId: string;
	supabase: SupabaseClient<Database>;
}): Promise<ActionResult> {
	const { count, filters, studentId, supabase } = options;

	// Check if filters exist and have at least one defined property
	const hasFilters =
		filters &&
		(filters.forceRarity !== undefined ||
			filters.minRarity !== undefined ||
			(filters.excludeCardIds !== undefined && filters.excludeCardIds.length > 0) ||
			filters.onlyCardsWithActions !== undefined);

	// ============================================================================
	// NEW PATH: Use award_vip_cards_with_filters RPC (with filters)
	// ============================================================================
	if (hasFilters) {
		// Type assertion needed until database types are regenerated after migration
		const { data, error: rpcError } = (await supabase.rpc(
			'award_vip_cards_with_filters' as never,
			{
				p_student_id: studentId,
				p_count: count,
				p_filters: filters || {}
			} as never
		)) as {
			data: {
				cards: Array<{
					cardId: string;
					instanceId: string;
					name: string;
					rarity: string;
					earnedAt: string;
				}>;
			} | null;
			error: { message: string } | null;
		};

		if (rpcError) {
			console.error('[executeDrawCards] RPC error (with filters):', rpcError);
			throw error(500, `Failed to draw cards with filters: ${rpcError.message}`);
		}

		if (!data || !data.cards || data.cards.length === 0) {
			throw error(500, 'No cards were awarded. Filters may have excluded all available cards.');
		}

		// Return enhanced result with full card details
		const result: DrawCardsResult = {
			cardsDrawn: data.cards.map((card) => ({
				cardId: card.cardId,
				instanceId: card.instanceId,
				name: card.name,
				rarity: card.rarity,
				earnedAt: card.earnedAt
			}))
		};

		return {
			success: true,
			message: `Drew ${count} VIP card${count > 1 ? 's' : ''}`,
			data: result
		};
	}

	// ============================================================================
	// LEGACY PATH: Use award_vip_card_no_cost in loop (no filters, backwards compatible)
	// ============================================================================
	const cardsDrawn: Array<{ cardId: string; name: string }> = [];

	for (let i = 0; i < count; i++) {
		// Type assertion needed until database types are regenerated after migration
		const { data: cardId, error: rpcError } = (await supabase.rpc(
			'award_vip_card_no_cost' as never,
			{
				p_student_id: studentId,
				p_card_id: null // Random card
			} as never
		)) as { data: string | null; error: { message: string } | null };

		if (rpcError) {
			console.error('[executeDrawCards] RPC error (legacy):', rpcError);
			throw error(500, `Failed to draw card ${i + 1}: ${rpcError.message}`);
		}

		if (!cardId) {
			throw error(500, `No card ID returned for card ${i + 1}`);
		}

		const template = await getTemplateById(supabase, cardId);
		cardsDrawn.push({
			cardId,
			name: template?.name || cardId
		});
	}

	const result: DrawCardsResult = { cardsDrawn };

	return {
		success: true,
		message: `Drew ${count} VIP card${count > 1 ? 's' : ''}`,
		data: result
	};
}

/**
 * Execute remove_warnings action
 *
 * Removes N warnings from student record (optionally filtered by type).
 */
async function executeRemoveWarnings(options: {
	count: number;
	warningType?: 'C' | 'M' | 'R' | 'T';
	studentId: string;
	supabase: SupabaseClient<Database>;
	teacherId: string;
}): Promise<ActionResult> {
	const { count, warningType, studentId, supabase, teacherId } = options;

	// Fetch student warnings
	const { data: warnings, error: fetchError } = (await supabase
		.from('student_warnings' as never)
		.select('*')
		.eq('student_id', studentId)
		.order('created_at', { ascending: false })) as {
		data: Warning[] | null;
		error: { message: string } | null;
	};

	if (fetchError) {
		throw error(500, `Failed to fetch warnings: ${fetchError.message}`);
	}

	if (!warnings || warnings.length === 0) {
		return {
			success: true,
			message: 'No warnings to remove',
			data: { warningsRemoved: 0, warningIds: [] } as RemoveWarningsResult
		};
	}

	// Filter by type if specified
	const filteredWarnings = warningType
		? warnings.filter((w) => w.warning_type === warningType)
		: warnings;

	// Take first N warnings
	const warningsToRemove = filteredWarnings.slice(0, count);

	const warningIds: string[] = [];

	// Remove each warning
	for (const warning of warningsToRemove) {
		await removeWarning({
			warningId: warning.id,
			teacherId,
			supabase
		});
		warningIds.push(warning.id);
	}

	const result: RemoveWarningsResult = {
		warningsRemoved: warningIds.length,
		warningIds
	};

	return {
		success: true,
		message: `Removed ${warningIds.length} warning${warningIds.length > 1 ? 's' : ''}`,
		data: result
	};
}

/**
 * Execute exchange_cards action
 *
 * Handles all 3 exchange modes (replace_random, rarity_points, discard_for_specific).
 */
async function executeExchangeCards(options: {
	exchange: ExchangeCardAction;
	studentId: string;
	supabase: SupabaseClient<Database>;
}): Promise<ActionResult> {
	const { exchange, studentId, supabase } = options;

	switch (exchange.mode) {
		case 'replace_random':
			return await executeExchangeReplaceRandom({
				count: exchange.count,
				studentId,
				supabase
			});

		case 'rarity_points':
			return await executeExchangeRarityPoints({
				targetRarity: exchange.targetRarity,
				pointsRequired: exchange.pointsRequired,
				studentId,
				supabase
			});

		case 'discard_for_specific':
			return await executeExchangeDiscardForSpecific({
				discardCount: exchange.discardCount,
				targetCardId: exchange.targetCardId,
				studentId,
				supabase
			});

		default:
			throw error(400, `Unknown exchange mode: ${(exchange as { mode: string }).mode}`);
	}
}

/**
 * Execute exchange mode: replace_random
 *
 * Discards N random unused cards and draws N new random cards.
 */
async function executeExchangeReplaceRandom(options: {
	count?: number;
	studentId: string;
	supabase: SupabaseClient<Database>;
}): Promise<ActionResult> {
	const { count, studentId, supabase } = options;

	// Fetch student's VIP cards
	const { data: profile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		throw error(500, `Failed to fetch student cards: ${fetchError.message}`);
	}

	const vipCards = (profile.vip_cards || {}) as unknown as StudentVipCards;

	// Get unused cards
	const unusedCards = Object.entries(vipCards).filter(([, instance]) => instance.usedAt === null);

	// If count is undefined, this card allows user choice (1-10 cards)
	// For server-side execution, we use a default of 1 card
	const actualCount = count ?? 1;

	if (unusedCards.length < actualCount) {
		throw error(400, `Not enough unused cards (has ${unusedCards.length}, needs ${actualCount})`);
	}

	// Select N random cards to discard
	const cardsToDiscard = unusedCards.sort(() => Math.random() - 0.5).slice(0, actualCount);

	const discardedCardInfo: Array<{ cardId: string; name: string }> = [];

	// Mark selected cards as used
	const updatedCards = { ...vipCards };
	for (const [instanceId, instance] of cardsToDiscard) {
		updatedCards[instanceId] = {
			...instance,
			usedAt: new Date().toISOString()
		};

		const template = await getTemplateById(supabase, instance.cardId);
		discardedCardInfo.push({
			cardId: instance.cardId,
			name: template?.name || instance.cardId
		});
	}

	// Update database with discarded cards
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		throw error(500, `Failed to discard cards: ${updateError.message}`);
	}

	// Draw N new cards
	const cardsReceived: Array<{ cardId: string; name: string }> = [];

	for (let i = 0; i < actualCount; i++) {
		// Type assertion needed until database types are regenerated after migration
		const { data: cardId, error: rpcError } = (await supabase.rpc(
			'award_vip_card_no_cost' as never,
			{
				p_student_id: studentId,
				p_card_id: null
			} as never
		)) as { data: string | null; error: { message: string } | null };

		if (rpcError) {
			throw error(500, `Failed to draw replacement card ${i + 1}: ${rpcError.message}`);
		}

		const template = await getTemplateById(supabase, cardId!);
		cardsReceived.push({
			cardId: cardId!,
			name: template?.name || cardId!
		});
	}

	const result: ExchangeCardsResult = {
		cardsDiscarded: discardedCardInfo,
		cardsReceived
	};

	return {
		success: true,
		message: `Exchanged ${count} card${count > 1 ? 's' : ''} for ${count} new card${count > 1 ? 's' : ''}`,
		data: result
	};
}

/**
 * Execute exchange mode: rarity_points
 *
 * Uses rarity points system to exchange cards for a card of specific rarity.
 */
async function executeExchangeRarityPoints(options: {
	targetRarity: VipCardRarity;
	pointsRequired: number;
	studentId: string;
	supabase: SupabaseClient<Database>;
}): Promise<ActionResult> {
	const { targetRarity, pointsRequired, studentId, supabase } = options;

	// Fetch student's VIP cards
	const { data: profile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		throw error(500, `Failed to fetch student cards: ${fetchError.message}`);
	}

	const vipCards = (profile.vip_cards || {}) as unknown as StudentVipCards;

	// Get unused cards
	const unusedCards = Object.entries(vipCards).filter(([, instance]) => instance.usedAt === null);

	// Calculate total available points
	let totalPoints = 0;
	const cardPoints: Array<{
		instanceId: string;
		cardId: string;
		rarity: VipCardRarity;
		points: number;
	}> = [];

	for (const [instanceId, instance] of unusedCards) {
		const template = await getTemplateById(supabase, instance.cardId);
		if (template) {
			const points = getRarityPoints(template.rarity as VipCardRarity);
			totalPoints += points;
			cardPoints.push({
				instanceId,
				cardId: instance.cardId,
				rarity: template.rarity as VipCardRarity,
				points
			});
		}
	}

	if (totalPoints < pointsRequired) {
		throw error(400, `Not enough points (has ${totalPoints}, needs ${pointsRequired})`);
	}

	// Select cards to discard to meet points requirement (greedy algorithm - prefer higher rarity)
	cardPoints.sort((a, b) => b.points - a.points);

	let accumulatedPoints = 0;
	const cardsToDiscard: Array<(typeof cardPoints)[0]> = [];

	for (const cardInfo of cardPoints) {
		if (accumulatedPoints >= pointsRequired) break;
		cardsToDiscard.push(cardInfo);
		accumulatedPoints += cardInfo.points;
	}

	const discardedCardInfo: Array<{ cardId: string; name: string }> = [];

	// Mark selected cards as used
	const updatedCards = { ...vipCards };
	for (const cardInfo of cardsToDiscard) {
		updatedCards[cardInfo.instanceId] = {
			...updatedCards[cardInfo.instanceId],
			usedAt: new Date().toISOString()
		};

		const template = await getTemplateById(supabase, cardInfo.cardId);
		discardedCardInfo.push({
			cardId: cardInfo.cardId,
			name: template?.name || cardInfo.cardId
		});
	}

	// Update database with discarded cards
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		throw error(500, `Failed to discard cards: ${updateError.message}`);
	}

	// Get all enabled templates of target rarity from database
	const targetTemplates = await getTemplatesByRarity(supabase, targetRarity, true);

	if (targetTemplates.length === 0) {
		throw error(500, `No cards found with rarity ${targetRarity}`);
	}

	// Select random card from target rarity
	const randomTemplate = targetTemplates[Math.floor(Math.random() * targetTemplates.length)];

	// Award the card
	// Type assertion needed until database types are regenerated after migration
	const { data: _cardId, error: rpcError } = (await supabase.rpc(
		'award_vip_card_no_cost' as never,
		{
			p_student_id: studentId,
			p_card_id: randomTemplate.id
		} as never
	)) as { data: string | null; error: { message: string } | null };

	if (rpcError) {
		throw error(500, `Failed to award card: ${rpcError.message}`);
	}

	const result: ExchangeCardsResult = {
		cardsDiscarded: discardedCardInfo,
		cardsReceived: [{ cardId: randomTemplate.id, name: randomTemplate.name }]
	};

	return {
		success: true,
		message: `Exchanged ${cardsToDiscard.length} card${cardsToDiscard.length > 1 ? 's' : ''} for 1 ${targetRarity} card`,
		data: result
	};
}

/**
 * Execute exchange mode: discard_for_specific
 *
 * Discards N cards to get a specific predefined card.
 */
async function executeExchangeDiscardForSpecific(options: {
	discardCount: number;
	targetCardId: string;
	studentId: string;
	supabase: SupabaseClient<Database>;
}): Promise<ActionResult> {
	const { discardCount, targetCardId, studentId, supabase } = options;

	// Fetch student's VIP cards
	const { data: profile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		throw error(500, `Failed to fetch student cards: ${fetchError.message}`);
	}

	const vipCards = (profile.vip_cards || {}) as unknown as StudentVipCards;

	// Get unused cards
	const unusedCards = Object.entries(vipCards).filter(([, instance]) => instance.usedAt === null);

	if (unusedCards.length < discardCount) {
		throw error(400, `Not enough unused cards (has ${unusedCards.length}, needs ${discardCount})`);
	}

	// Select N random cards to discard
	const cardsToDiscard = unusedCards.sort(() => Math.random() - 0.5).slice(0, discardCount);

	const discardedCardInfo: Array<{ cardId: string; name: string }> = [];

	// Mark selected cards as used
	const updatedCards = { ...vipCards };
	for (const [instanceId, instance] of cardsToDiscard) {
		updatedCards[instanceId] = {
			...instance,
			usedAt: new Date().toISOString()
		};

		const template = await getTemplateById(supabase, instance.cardId);
		discardedCardInfo.push({
			cardId: instance.cardId,
			name: template?.name || instance.cardId
		});
	}

	// Update database with discarded cards
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		throw error(500, `Failed to discard cards: ${updateError.message}`);
	}

	// Award the specific card
	// Type assertion needed until database types are regenerated after migration
	const { data: _cardId, error: rpcError } = (await supabase.rpc(
		'award_vip_card_no_cost' as never,
		{
			p_student_id: studentId,
			p_card_id: targetCardId
		} as never
	)) as { data: string | null; error: { message: string } | null };

	if (rpcError) {
		throw error(500, `Failed to award card: ${rpcError.message}`);
	}

	const targetTemplate = await getTemplateById(supabase, targetCardId);

	const result: ExchangeCardsResult = {
		cardsDiscarded: discardedCardInfo,
		cardsReceived: [{ cardId: targetCardId, name: targetTemplate?.name || targetCardId }]
	};

	return {
		success: true,
		message: `Exchanged ${discardCount} card${discardCount > 1 ? 's' : ''} for ${targetTemplate?.name || targetCardId}`,
		data: result
	};
}

/**
 * Execute add_gidouilles action
 *
 * Adds bonus gidouilles to student balance.
 */
async function executeAddGidouilles(options: {
	amount: number;
	studentId: string;
	supabase: SupabaseClient<Database>;
}): Promise<ActionResult> {
	const { amount, studentId, supabase } = options;

	// Get current balance
	const { data: profile, error: fetchError } = await supabase
		.from('profiles')
		.select('gidouilles')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const oldBalance = profile.gidouilles || 0;

	// Add gidouilles using RPC function
	// Type assertion needed until database types are regenerated after migration
	const { data: newBalance, error: rpcError } = (await supabase.rpc(
		'add_student_gidouilles' as never,
		{
			p_student_id: studentId,
			p_amount: amount
		} as never
	)) as { data: number | null; error: { message: string } | null };

	if (rpcError) {
		throw error(500, `Failed to add gidouilles: ${rpcError.message}`);
	}

	const result: AddGidouillesResult = {
		oldBalance,
		newBalance: newBalance!,
		amountAdded: amount
	};

	return {
		success: true,
		message: `Added ${amount} gidouilles (${oldBalance} → ${newBalance})`,
		data: result
	};
}
