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
 * - Marks the action card as used after successful exchange
 *
 * AUDIT:
 * - All entries share a unique exchange_id for full traceability
 * - Discarded cards logged atomically via discard_vip_cards RPC
 * - Action card usage logged atomically via use_vip_card RPC
 * - New cards logged atomically via award_vip_card_no_cost RPC
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { exchangeCardsSchema } from '$lib/server/validation/exchange-cards';
import type { StudentVipCards, VipCardAction } from '$lib/types/vip-card';
import { getRarityPoints } from '$lib/types/vip-card';
import type { VipCardRarity } from '$lib/types/vip-card';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getTemplateById, getTemplatesByRarity } from '$lib/server/vip-card-queries';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { validateActivationContext } from '$lib/server/vip-card-context';

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Parse and validate request body
	const body = await request.json();
	const validation = exchangeCardsSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// Authorization logic (two modes: teacher OR student with approved card)
	const isTeacher = profile.role === 'teacher' || profile.role === 'admin';
	const isStudent = user.id === data.studentId;

	if (isTeacher) {
		// Teacher flow: verify they teach this student
		const hasAccess = await verifyTeacherStudentWithRole(
			user.id,
			data.studentId,
			profile,
			supabase
		);
		if (!hasAccess) {
			throw error(403, 'You can only exchange cards for students in your classes');
		}
	} else if (!isStudent) {
		// Neither teacher nor the student themselves
		throw error(403, 'You can only exchange cards for yourself or your students');
	}
	// If isStudent, authorization check will happen after fetching the card (approval required)

	// Fetch student's VIP cards for validation
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

	// Validate that action card exists and is not used
	const actionCard = vipCards[data.actionCardInstanceId];
	if (!actionCard) {
		throw error(404, `Action card instance not found: ${data.actionCardInstanceId}`);
	}
	if (actionCard.usedAt) {
		throw error(400, `Action card already used: ${data.actionCardInstanceId}`);
	}

	// If student flow: require teacher approval OR valid activation context
	if (isStudent && !actionCard.activationApprovedAt) {
		const actionTemplate = await getTemplateById(supabase, actionCard.cardId);
		if (!actionTemplate) {
			throw error(404, 'Action card template not found');
		}
		const actionContext = (actionTemplate.action as VipCardAction | null)?.context;
		if (actionContext) {
			const contextValid = await validateActivationContext(actionContext, supabase, data.studentId);
			if (!contextValid) {
				throw error(400, 'Cette carte ne peut être activée que dans un contexte spécifique');
			}
		} else {
			throw error(400, 'This card must be approved by a teacher before use.');
		}
	}

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

	// Generate a unique exchange_id to correlate all audit entries
	const exchangeId = crypto.randomUUID();

	// Dispatch to appropriate exchange handler based on mode
	let result: {
		cardsDiscarded: Array<{ cardId: string; name: string; instanceId: string }>;
		cardsReceived: Array<{ cardId: string; name: string; instanceId: string; earnedAt: string }>;
	};

	switch (data.mode) {
		case 'replace_random':
			result = await handleReplaceRandom(
				supabase,
				data.studentId,
				vipCards,
				data.cardsToDiscard,
				data.mode,
				exchangeId
			);
			break;

		case 'rarity_points':
			result = await handleRarityPoints(
				supabase,
				data.studentId,
				vipCards,
				data.cardsToDiscard,
				data.targetRarity,
				data.mode,
				exchangeId
			);
			break;

		case 'discard_for_specific':
			result = await handleDiscardForSpecific(
				supabase,
				data.studentId,
				vipCards,
				data.cardsToDiscard,
				data.targetCardId,
				data.mode,
				exchangeId
			);
			break;

		default:
			throw error(400, `Unknown exchange mode: ${(data as { mode: string }).mode}`);
	}

	// Mark action card as used atomically via RPC (FOR UPDATE + audit trail)
	const { data: useResult, error: useError } = await supabase.rpc('use_vip_card', {
		p_student_id: data.studentId,
		p_instance_id: data.actionCardInstanceId,
		p_metadata: {
			action_type: 'exchange_cards',
			mode: data.mode,
			cards_discarded: result.cardsDiscarded.length,
			cards_received: result.cardsReceived.length,
			exchange_id: exchangeId
		}
	});

	if (useError) {
		console.error('[exchange] RPC use_vip_card error:', useError);
		throw error(500, `Failed to mark action card as used: ${useError.message}`);
	}

	const rpcResult = useResult as { success: boolean; error?: string };
	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Failed to mark action card as used');
	}

	// Get action card template info for response
	const actionCardTemplate = await getTemplateById(supabase, actionCard.cardId);

	return json({
		...result,
		actionCardUsed: {
			cardId: actionCard.cardId,
			name: actionCardTemplate?.name || actionCard.cardId,
			instanceId: data.actionCardInstanceId
		}
	});
};

// ============================================================================
// HELPER: Discard cards atomically via RPC
// ============================================================================

async function discardCardsAtomically(
	supabase: SupabaseClient,
	studentId: string,
	cardsToDiscard: string[],
	vipCards: StudentVipCards,
	exchangeMode: string,
	exchangeId: string
): Promise<Array<{ cardId: string; name: string; instanceId: string }>> {
	// Collect card info for response before discarding
	const cardsDiscarded: Array<{ cardId: string; name: string; instanceId: string }> = [];

	for (const instanceId of cardsToDiscard) {
		const instance = vipCards[instanceId];
		const template = await getTemplateById(supabase, instance.cardId);
		cardsDiscarded.push({
			cardId: instance.cardId,
			name: template?.name || instance.cardId,
			instanceId
		});
	}

	// Mark all discarded cards as used + log audit atomically via RPC
	const { data: discardResult, error: discardError } = await supabase.rpc(
		'discard_vip_cards' as never,
		{
			p_student_id: studentId,
			p_instance_ids: cardsToDiscard,
			p_metadata: {
				used_by: 'exchange',
				exchange_mode: exchangeMode,
				exchange_id: exchangeId
			}
		} as never
	);

	if (discardError) {
		console.error('[exchange] RPC discard_vip_cards error:', discardError);
		throw error(500, `Failed to discard cards: ${discardError.message}`);
	}

	const result = discardResult as { success: boolean; error?: string };
	if (!result.success) {
		throw error(400, result.error || 'Failed to discard cards');
	}

	return cardsDiscarded;
}

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
	cardsToDiscard: string[],
	exchangeMode: string,
	exchangeId: string
) {
	const count = cardsToDiscard.length;

	// Discard cards atomically (RPC: mark used + audit)
	const cardsDiscarded = await discardCardsAtomically(
		supabase,
		studentId,
		cardsToDiscard,
		vipCards,
		exchangeMode,
		exchangeId
	);

	// Draw N new cards using RPC (each call is atomic with its own audit)
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
				p_card_id: null, // Random card
				p_source: 'exchange',
				p_extra_metadata: { exchange_id: exchangeId, exchange_mode: exchangeMode }
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

		// Get the actual instance ID from the database
		const { data: updatedProfile } = await supabase
			.from('profiles')
			.select('vip_cards')
			.eq('id', studentId)
			.single();

		const latestVipCards = (updatedProfile?.vip_cards || {}) as unknown as StudentVipCards;

		// Find the most recent card instance with this cardId (not in original set)
		const latestInstanceId = Object.keys(latestVipCards).find((id) => {
			const inst = latestVipCards[id];
			return inst.cardId === cardId && !vipCards[id];
		});

		cardsReceived.push({
			cardId,
			name: template?.name || cardId,
			instanceId: latestInstanceId || crypto.randomUUID(),
			earnedAt: new Date().toISOString()
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
	targetRarity: VipCardRarity,
	exchangeMode: string,
	exchangeId: string
) {
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

	// Discard cards atomically (RPC: mark used + audit)
	const cardsDiscarded = await discardCardsAtomically(
		supabase,
		studentId,
		cardsToDiscard,
		vipCards,
		exchangeMode,
		exchangeId
	);

	// Get random card from target rarity
	const targetTemplates = await getTemplatesByRarity(supabase, targetRarity, true);

	if (targetTemplates.length === 0) {
		throw error(500, `No cards found with rarity ${targetRarity}`);
	}

	const randomTemplate = targetTemplates[Math.floor(Math.random() * targetTemplates.length)];

	// Award the card using RPC (atomic with audit)
	const { error: rpcError } = (await supabase.rpc(
		'award_vip_card_no_cost' as never,
		{
			p_student_id: studentId,
			p_card_id: randomTemplate.id,
			p_source: 'exchange',
			p_extra_metadata: { exchange_id: exchangeId, exchange_mode: exchangeMode }
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
		return inst.cardId === randomTemplate.id && !vipCards[id];
	});

	const cardsReceived = [
		{
			cardId: randomTemplate.id,
			name: randomTemplate.name,
			instanceId: latestInstanceId || crypto.randomUUID(),
			earnedAt: new Date().toISOString()
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
	targetCardId: string,
	exchangeMode: string,
	exchangeId: string
) {
	// Validate target card exists
	const targetTemplate = await getTemplateById(supabase, targetCardId);
	if (!targetTemplate) {
		throw error(404, `Target card not found: ${targetCardId}`);
	}

	// Discard cards atomically (RPC: mark used + audit)
	const cardsDiscarded = await discardCardsAtomically(
		supabase,
		studentId,
		cardsToDiscard,
		vipCards,
		exchangeMode,
		exchangeId
	);

	// Award the specific card using RPC (atomic with audit)
	const { error: rpcError } = (await supabase.rpc(
		'award_vip_card_no_cost' as never,
		{
			p_student_id: studentId,
			p_card_id: targetCardId,
			p_source: 'exchange',
			p_extra_metadata: { exchange_id: exchangeId, exchange_mode: exchangeMode }
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
		return inst.cardId === targetCardId && !vipCards[id];
	});

	const cardsReceived = [
		{
			cardId: targetCardId,
			name: targetTemplate.name,
			instanceId: latestInstanceId || crypto.randomUUID(),
			earnedAt: new Date().toISOString()
		}
	];

	return { cardsDiscarded, cardsReceived };
}
