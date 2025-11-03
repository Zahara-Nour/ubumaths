/**
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
import { getVipCardById, getRarityPoints } from '$lib/types/vip-card';
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
 */
export interface DrawCardsResult {
	cardsDrawn: Array<{ cardId: string; name: string }>;
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
				return await executeDrawCards({ count: action.count, studentId, supabase });

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
 */
async function executeDrawCards(options: {
	count: number;
	studentId: string;
	supabase: SupabaseClient<Database>;
}): Promise<ActionResult> {
	const { count, studentId, supabase } = options;

	const cardsDrawn: Array<{ cardId: string; name: string }> = [];

	// Draw N random cards using RPC function
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
			console.error('[executeDrawCards] RPC error:', rpcError);
			throw error(500, `Failed to draw card ${i + 1}: ${rpcError.message}`);
		}

		if (!cardId) {
			throw error(500, `No card ID returned for card ${i + 1}`);
		}

		const card = getVipCardById(cardId);
		cardsDrawn.push({
			cardId,
			name: card?.name || cardId
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
	count: number;
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

	if (unusedCards.length < count) {
		throw error(400, `Not enough unused cards (has ${unusedCards.length}, needs ${count})`);
	}

	// Select N random cards to discard
	const cardsToDiscard = unusedCards.sort(() => Math.random() - 0.5).slice(0, count);

	const discardedCardInfo: Array<{ cardId: string; name: string }> = [];

	// Mark selected cards as used
	const updatedCards = { ...vipCards };
	for (const [instanceId, instance] of cardsToDiscard) {
		updatedCards[instanceId] = {
			...instance,
			usedAt: new Date().toISOString()
		};

		const card = getVipCardById(instance.cardId);
		discardedCardInfo.push({
			cardId: instance.cardId,
			name: card?.name || instance.cardId
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

	for (let i = 0; i < count; i++) {
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

		const card = getVipCardById(cardId!);
		cardsReceived.push({
			cardId: cardId!,
			name: card?.name || cardId!
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
		const card = getVipCardById(instance.cardId);
		if (card) {
			const points = getRarityPoints(card.rarity);
			totalPoints += points;
			cardPoints.push({ instanceId, cardId: instance.cardId, rarity: card.rarity, points });
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

		const card = getVipCardById(cardInfo.cardId);
		discardedCardInfo.push({
			cardId: cardInfo.cardId,
			name: card?.name || cardInfo.cardId
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

	// Since VIP_CARDS is in-memory, we'll use it directly
	const { VIP_CARDS } = await import('$lib/types/vip-card');
	const targetCards = VIP_CARDS.filter((c) => c.rarity === targetRarity);

	if (targetCards.length === 0) {
		throw error(500, `No cards found with rarity ${targetRarity}`);
	}

	// Select random card from target rarity
	const randomCard = targetCards[Math.floor(Math.random() * targetCards.length)];

	// Award the card
	// Type assertion needed until database types are regenerated after migration
	const { data: _cardId, error: rpcError } = (await supabase.rpc(
		'award_vip_card_no_cost' as never,
		{
			p_student_id: studentId,
			p_card_id: randomCard.id
		} as never
	)) as { data: string | null; error: { message: string } | null };

	if (rpcError) {
		throw error(500, `Failed to award card: ${rpcError.message}`);
	}

	const result: ExchangeCardsResult = {
		cardsDiscarded: discardedCardInfo,
		cardsReceived: [{ cardId: randomCard.id, name: randomCard.name }]
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

		const card = getVipCardById(instance.cardId);
		discardedCardInfo.push({
			cardId: instance.cardId,
			name: card?.name || instance.cardId
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

	const targetCard = getVipCardById(targetCardId);

	const result: ExchangeCardsResult = {
		cardsDiscarded: discardedCardInfo,
		cardsReceived: [{ cardId: targetCardId, name: targetCard?.name || targetCardId }]
	};

	return {
		success: true,
		message: `Exchanged ${discardCount} card${discardCount > 1 ? 's' : ''} for ${targetCard?.name || targetCardId}`,
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
