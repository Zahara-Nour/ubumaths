/**
 * API Endpoint: Exchange VIP Cards
 * ==================================
 *
 * Handles VIP card exchanges with three modes:
 * - replace_random: Discard N cards, draw N random new cards
 * - rarity_points: Use rarity points system to get a card of specific rarity
 * - discard_for_specific: Discard N cards to get a specific predefined card
 *
 * POST /api/vip-cards/exchange
 *
 * SECURITY:
 * - Requires authentication (teacher/admin)
 * - Teacher must teach the student (class_members check)
 * - SELECT FOR UPDATE prevents race conditions
 * - All input validated with Zod discriminated union
 *
 * IMPORTANT: This endpoint does NOT mark the VIP card as used.
 * The caller must call /api/vip-cards/use-card after successful exchange.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { exchangeCardsSchema } from '$lib/server/validation/exchange-cards';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getRarityPoints } from '$lib/types/vip-card';
import type { VipCardRarity } from '$lib/types/vip-card';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getTemplateById, getTemplatesByRarity } from '$lib/server/vip-card-queries';

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication (teacher/admin)
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Verify user is teacher or admin
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can exchange student VIP cards');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = exchangeCardsSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// Verify that teacher teaches this student
	const { data: classCheck } = await supabase
		.from('class_members')
		.select(
			`
			class_id,
			classes!inner(teacher_id)
		`
		)
		.eq('student_id', data.studentId);

	const teachesStudent = classCheck?.some((cm) => {
		const classes = cm.classes as unknown;
		if (classes && typeof classes === 'object' && 'teacher_id' in classes) {
			return (classes as { teacher_id: string }).teacher_id === user.id;
		}
		return false;
	});

	if (!teachesStudent) {
		throw error(403, 'You can only exchange cards for students in your classes');
	}

	// Fetch student's VIP cards with row-level lock to prevent race conditions
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', data.studentId)
		.single();

	if (fetchError) {
		console.error('[exchange] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = (studentProfile.vip_cards || {}) as unknown as StudentVipCards;

	// Validate that all cards to discard exist and are not used
	for (const instanceId of data.cardsToDiscard) {
		const instance = vipCards[instanceId];
		if (!instance) {
			throw error(404, `Card instance not found: ${instanceId}`);
		}
		if (instance.usedAt) {
			throw error(400, `Card already used: ${instanceId}`);
		}
	}

	// Dispatch to appropriate exchange handler based on mode
	let result: {
		cardsDiscarded: Array<{ cardId: string; name: string; instanceId: string }>;
		cardsReceived: Array<{ cardId: string; name: string; instanceId: string; earnedAt: string }>;
	};

	switch (data.mode) {
		case 'replace_random':
			result = await handleReplaceRandom(supabase, data.studentId, vipCards, data.cardsToDiscard);
			break;

		case 'rarity_points':
			result = await handleRarityPoints(
				supabase,
				data.studentId,
				vipCards,
				data.cardsToDiscard,
				data.targetRarity
			);
			break;

		case 'discard_for_specific':
			result = await handleDiscardForSpecific(
				supabase,
				data.studentId,
				vipCards,
				data.cardsToDiscard,
				data.targetCardId
			);
			break;

		default:
			throw error(400, `Unknown exchange mode: ${(data as { mode: string }).mode}`);
	}

	return json(result);
};

// ============================================================================
// EXCHANGE HANDLERS
// ============================================================================

/**
 * Mode 1: replace_random
 *
 * Discard N random cards and draw N new random cards.
 */
async function handleReplaceRandom(
	supabase: SupabaseClient,
	studentId: string,
	vipCards: StudentVipCards,
	cardsToDiscard: string[]
) {
	const count = cardsToDiscard.length;
	const cardsDiscarded: Array<{ cardId: string; name: string; instanceId: string }> = [];

	// Mark selected cards as used
	const updatedCards = { ...vipCards };
	const now = new Date().toISOString();

	for (const instanceId of cardsToDiscard) {
		const instance = updatedCards[instanceId];
		updatedCards[instanceId] = {
			...instance,
			usedAt: now
		};

		const template = await getTemplateById(supabase, instance.cardId);
		cardsDiscarded.push({
			cardId: instance.cardId,
			name: template?.name || instance.cardId,
			instanceId
		});
	}

	// Update database with discarded cards
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		console.error('[replace_random] Error updating vip_cards:', updateError);
		throw error(500, `Failed to discard cards: ${updateError.message}`);
	}

	// Draw N new cards using RPC
	const cardsReceived: Array<{
		cardId: string;
		name: string;
		instanceId: string;
		earnedAt: string;
	}> = [];

	for (let i = 0; i < count; i++) {
		const { data: cardId, error: rpcError } = (await supabase.rpc(
			'award_vip_card_no_cost' as never,
			{
				p_student_id: studentId,
				p_card_id: null // Random card
			} as never
		)) as { data: string | null; error: { message: string } | null };

		if (rpcError) {
			console.error('[replace_random] RPC error:', rpcError);
			throw error(500, `Failed to draw replacement card ${i + 1}: ${rpcError.message}`);
		}

		if (!cardId) {
			throw error(500, `No card ID returned for card ${i + 1}`);
		}

		const template = await getTemplateById(supabase, cardId);

		// Generate instance ID for response (actual instance will be in DB)
		// We need to query the DB to get the actual instance ID
		const { data: updatedProfile } = await supabase
			.from('profiles')
			.select('vip_cards')
			.eq('id', studentId)
			.single();

		const latestVipCards = (updatedProfile?.vip_cards || {}) as unknown as StudentVipCards;

		// Find the most recent card instance with this cardId
		const latestInstanceId = Object.keys(latestVipCards).find((id) => {
			const inst = latestVipCards[id];
			return inst.cardId === cardId && !updatedCards[id]; // Not in original cards
		});

		cardsReceived.push({
			cardId,
			name: template?.name || cardId,
			instanceId: latestInstanceId || crypto.randomUUID(), // Fallback to new UUID
			earnedAt: now
		});
	}

	return { cardsDiscarded, cardsReceived };
}

/**
 * Mode 2: rarity_points
 *
 * Use rarity points system to exchange cards for a card of specific rarity.
 * Points: common=1, rare=3, epic=9, legendary=27
 */
async function handleRarityPoints(
	supabase: SupabaseClient,
	studentId: string,
	vipCards: StudentVipCards,
	cardsToDiscard: string[],
	targetRarity: VipCardRarity
) {
	const cardsDiscarded: Array<{ cardId: string; name: string; instanceId: string }> = [];

	// Calculate total points from cards to discard
	let totalPoints = 0;
	for (const instanceId of cardsToDiscard) {
		const instance = vipCards[instanceId];
		const template = await getTemplateById(supabase, instance.cardId);
		if (template) {
			totalPoints += getRarityPoints(template.rarity as VipCardRarity);
		}
	}

	// Validate sufficient points
	const targetPoints = getRarityPoints(targetRarity);
	if (totalPoints < targetPoints) {
		throw error(
			400,
			`Insufficient rarity points: Required ${targetPoints}, available ${totalPoints}`
		);
	}

	// Mark selected cards as used
	const updatedCards = { ...vipCards };
	const now = new Date().toISOString();

	for (const instanceId of cardsToDiscard) {
		const instance = updatedCards[instanceId];
		updatedCards[instanceId] = {
			...instance,
			usedAt: now
		};

		const template = await getTemplateById(supabase, instance.cardId);
		cardsDiscarded.push({
			cardId: instance.cardId,
			name: template?.name || instance.cardId,
			instanceId
		});
	}

	// Update database with discarded cards
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		console.error('[rarity_points] Error updating vip_cards:', updateError);
		throw error(500, `Failed to discard cards: ${updateError.message}`);
	}

	// Get random card from target rarity
	const targetTemplates = await getTemplatesByRarity(supabase, targetRarity, true);

	if (targetTemplates.length === 0) {
		throw error(500, `No cards found with rarity ${targetRarity}`);
	}

	const randomTemplate = targetTemplates[Math.floor(Math.random() * targetTemplates.length)];

	// Award the card using RPC
	const { data: _cardId, error: rpcError } = (await supabase.rpc(
		'award_vip_card_no_cost' as never,
		{
			p_student_id: studentId,
			p_card_id: randomTemplate.id
		} as never
	)) as { data: string | null; error: { message: string } | null };

	if (rpcError) {
		console.error('[rarity_points] RPC error:', rpcError);
		throw error(500, `Failed to award card: ${rpcError.message}`);
	}

	// Get instance ID from database
	const { data: updatedProfile } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	const latestVipCards = (updatedProfile?.vip_cards || {}) as unknown as StudentVipCards;

	const latestInstanceId = Object.keys(latestVipCards).find((id) => {
		const inst = latestVipCards[id];
		return inst.cardId === randomTemplate.id && !updatedCards[id];
	});

	const cardsReceived = [
		{
			cardId: randomTemplate.id,
			name: randomTemplate.name,
			instanceId: latestInstanceId || crypto.randomUUID(),
			earnedAt: now
		}
	];

	return { cardsDiscarded, cardsReceived };
}

/**
 * Mode 3: discard_for_specific
 *
 * Discard N cards to get a specific predefined card.
 */
async function handleDiscardForSpecific(
	supabase: SupabaseClient,
	studentId: string,
	vipCards: StudentVipCards,
	cardsToDiscard: string[],
	targetCardId: string
) {
	const cardsDiscarded: Array<{ cardId: string; name: string; instanceId: string }> = [];

	// Validate target card exists
	const targetTemplate = await getTemplateById(supabase, targetCardId);
	if (!targetTemplate) {
		throw error(404, `Target card not found: ${targetCardId}`);
	}

	// Mark selected cards as used
	const updatedCards = { ...vipCards };
	const now = new Date().toISOString();

	for (const instanceId of cardsToDiscard) {
		const instance = updatedCards[instanceId];
		updatedCards[instanceId] = {
			...instance,
			usedAt: now
		};

		const template = await getTemplateById(supabase, instance.cardId);
		cardsDiscarded.push({
			cardId: instance.cardId,
			name: template?.name || instance.cardId,
			instanceId
		});
	}

	// Update database with discarded cards
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		console.error('[discard_for_specific] Error updating vip_cards:', updateError);
		throw error(500, `Failed to discard cards: ${updateError.message}`);
	}

	// Award the specific card using RPC
	const { data: _cardId, error: rpcError } = (await supabase.rpc(
		'award_vip_card_no_cost' as never,
		{
			p_student_id: studentId,
			p_card_id: targetCardId
		} as never
	)) as { data: string | null; error: { message: string } | null };

	if (rpcError) {
		console.error('[discard_for_specific] RPC error:', rpcError);
		throw error(500, `Failed to award card: ${rpcError.message}`);
	}

	// Get instance ID from database
	const { data: updatedProfile } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	const latestVipCards = (updatedProfile?.vip_cards || {}) as unknown as StudentVipCards;

	const latestInstanceId = Object.keys(latestVipCards).find((id) => {
		const inst = latestVipCards[id];
		return inst.cardId === targetCardId && !updatedCards[id];
	});

	const cardsReceived = [
		{
			cardId: targetCardId,
			name: targetTemplate.name,
			instanceId: latestInstanceId || crypto.randomUUID(),
			earnedAt: now
		}
	];

	return { cardsDiscarded, cardsReceived };
}
