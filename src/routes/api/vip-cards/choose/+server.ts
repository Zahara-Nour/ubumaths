/**
 * API Endpoint: Choose VIP Cards
 * ================================
 *
 * Allows users to select specific VIP cards to receive by using a
 * choose_card action card. The action card is consumed upon successful selection.
 *
 * POST /api/vip-cards/choose
 *
 * SECURITY:
 * - Requires authentication (teacher/admin)
 * - Teacher must teach the student (class_members check)
 * - All input validated with Zod
 * - Validates action card exists, is unused, and has choose_card action
 * - Validates chosen cards respect action filters
 *
 * FLOW:
 * 1. Validate request (Zod)
 * 2. Verify auth & permissions
 * 3. Fetch student's VIP cards
 * 4. Validate action card exists & unused
 * 5. Validate chosen cards count matches action.count
 * 6. Validate chosen cards respect filters (all/maxRarity/possibleCardIds)
 * 7. Award chosen cards via RPC
 * 8. Mark action card as used
 * 9. Return success with awarded cards
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { chooseCardsSchema } from '$lib/server/validation/choose-cards';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getRarityPoints } from '$lib/types/vip-card';
import { getTemplateById, getTemplatesByIds } from '$lib/server/vip-card-queries';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Parse and validate request body
	const body = await request.json();
	const validation = chooseCardsSchema.safeParse(body);

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
			throw error(403, 'You can only choose cards for students in your classes');
		}
	} else if (!isStudent) {
		// Neither teacher nor the student themselves
		throw error(403, 'You can only choose cards for yourself or your students');
	}
	// If isStudent, authorization check will happen after fetching the card (approval required)

	// Fetch student's VIP cards
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', data.studentId)
		.single();

	if (fetchError) {
		console.error('[choose] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = (studentProfile.vip_cards || {}) as unknown as StudentVipCards;

	// Validate that action card exists and is not used
	const actionCardInstance = vipCards[data.actionCardInstanceId];
	if (!actionCardInstance) {
		throw error(404, `Action card instance not found: ${data.actionCardInstanceId}`);
	}
	if (actionCardInstance.usedAt) {
		throw error(400, `Action card already used: ${data.actionCardInstanceId}`);
	}

	// If student flow: require teacher approval
	if (
		isStudent &&
		actionCardInstance.activationRequestedAt &&
		!actionCardInstance.activationApprovedAt
	) {
		throw error(
			400,
			'This card activation has not been approved yet. Please wait for teacher approval.'
		);
	}

	// Get action card template from database
	const actionCard = await getTemplateById(supabase, actionCardInstance.cardId);
	if (!actionCard) {
		throw error(404, `Action card definition not found: ${actionCardInstance.cardId}`);
	}

	// Validate card has choose_card action
	if (!actionCard.action || actionCard.action.type !== 'choose_card') {
		throw error(400, `Card "${actionCard.name}" does not have a choose_card action`);
	}

	const chooseAction = actionCard.action;

	// Validate chosen cards count
	if (data.chosenCardIds.length !== chooseAction.count) {
		throw error(
			400,
			`Must choose exactly ${chooseAction.count} card${chooseAction.count > 1 ? 's' : ''}, got ${data.chosenCardIds.length}`
		);
	}

	// Validate chosen cards respect filters
	await validateChosenCards(supabase, data.chosenCardIds, chooseAction);

	// Award chosen cards
	const result = await awardChosenCards(supabase, data.studentId, data.chosenCardIds, vipCards);

	// Mark action card as used and clear approval metadata
	const updatedCards = { ...result.updatedVipCards };
	const now = new Date().toISOString();
	const updatedActionCard = {
		...actionCardInstance,
		usedAt: now
	};

	// Clear activation request/approval fields since card is now used
	delete (updatedActionCard as { activationRequestedAt?: string | null }).activationRequestedAt;
	delete (updatedActionCard as { activationRequestedBy?: string | null }).activationRequestedBy;
	delete (updatedActionCard as { activationApprovedAt?: string | null }).activationApprovedAt;
	delete (updatedActionCard as { activationApprovedBy?: string | null }).activationApprovedBy;

	updatedCards[data.actionCardInstanceId] = updatedActionCard;

	// Update database with marked action card
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', data.studentId);

	if (updateError) {
		console.error('[choose] Error marking action card as used:', updateError);
		throw error(500, `Failed to mark action card as used: ${updateError.message}`);
	}

	return json({
		success: true,
		actionCardUsed: {
			cardId: actionCardInstance.cardId,
			name: actionCard.name,
			instanceId: data.actionCardInstanceId
		},
		cardsReceived: result.cardsReceived
	});
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that chosen card IDs respect the action's filters
 */
async function validateChosenCards(
	supabase: SupabaseClient,
	chosenCardIds: string[],
	action: { count: number; filter?: 'all'; maxRarity?: string; possibleCardIds?: string[] }
) {
	// Load all chosen card templates at once
	const templates = await getTemplatesByIds(supabase, chosenCardIds);
	const templatesMap = new Map(templates.map((t) => [t.id, t]));

	// Mode 3: possibleCardIds (specific list)
	if (action.possibleCardIds && action.possibleCardIds.length > 0) {
		for (const cardId of chosenCardIds) {
			if (!action.possibleCardIds.includes(cardId)) {
				const template = templatesMap.get(cardId);
				throw error(
					400,
					`Card "${template?.name || cardId}" is not in the allowed list for this action`
				);
			}
		}
		return;
	}

	// Mode 2: maxRarity (limit by rarity)
	if (action.maxRarity) {
		const maxRarityValue = getRarityPoints(
			action.maxRarity as 'common' | 'rare' | 'epic' | 'legendary'
		);

		for (const cardId of chosenCardIds) {
			const template = templatesMap.get(cardId);
			if (!template) {
				throw error(404, `Card not found: ${cardId}`);
			}

			const cardRarityValue = getRarityPoints(
				template.rarity as 'common' | 'rare' | 'epic' | 'legendary'
			);
			if (cardRarityValue > maxRarityValue) {
				throw error(
					400,
					`Card "${template.name}" (${template.rarity}) exceeds maximum rarity ${action.maxRarity}`
				);
			}
		}
		return;
	}

	// Mode 1: filter='all' (default - all cards allowed)
	// Just validate cards exist
	for (const cardId of chosenCardIds) {
		const template = templatesMap.get(cardId);
		if (!template) {
			throw error(404, `Card not found: ${cardId}`);
		}
	}
}

// ============================================================================
// AWARD HELPERS
// ============================================================================

/**
 * Award chosen cards to student using RPC
 */
async function awardChosenCards(
	supabase: SupabaseClient,
	studentId: string,
	chosenCardIds: string[],
	currentVipCards: StudentVipCards
) {
	const cardsReceived: Array<{
		cardId: string;
		name: string;
		instanceId: string;
		earnedAt: string;
	}> = [];

	const now = new Date().toISOString();
	let updatedVipCards = { ...currentVipCards };

	for (const cardId of chosenCardIds) {
		// Award card via RPC
		const { data: awardedCardId, error: rpcError } = (await supabase.rpc(
			'award_vip_card_no_cost' as never,
			{
				p_student_id: studentId,
				p_card_id: cardId
			} as never
		)) as { data: string | null; error: { message: string } | null };

		if (rpcError) {
			console.error('[choose] RPC error:', rpcError);
			throw error(500, `Failed to award card "${cardId}": ${rpcError.message}`);
		}

		if (!awardedCardId) {
			throw error(500, `No card ID returned for "${cardId}"`);
		}

		const template = await getTemplateById(supabase, awardedCardId);

		// Fetch updated VIP cards to get instance ID
		const { data: updatedProfile } = await supabase
			.from('profiles')
			.select('vip_cards')
			.eq('id', studentId)
			.single();

		const latestVipCards = (updatedProfile?.vip_cards || {}) as unknown as StudentVipCards;
		updatedVipCards = latestVipCards;

		// Find the most recent card instance with this cardId
		const latestInstanceId = Object.keys(latestVipCards).find((id) => {
			const inst = latestVipCards[id];
			return inst.cardId === awardedCardId && !currentVipCards[id]; // Not in original cards
		});

		cardsReceived.push({
			cardId: awardedCardId,
			name: template?.name || awardedCardId,
			instanceId: latestInstanceId || crypto.randomUUID(), // Fallback to new UUID
			earnedAt: now
		});
	}

	return { cardsReceived, updatedVipCards };
}
