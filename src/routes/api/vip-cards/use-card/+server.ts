/**
 * API Endpoint: Use VIP Card
 * ============================
 *
 * Unified endpoint for using/consuming VIP cards (with or without actions).
 * Replaces the separate "approve-activation" and "direct-activation" endpoints.
 *
 * POST /api/vip-cards/use-card
 *
 * @param instanceId - UUID of the VIP card instance to use
 * @param studentId - UUID of the student who owns the card
 *
 * WORKFLOW:
 * ---------
 * 1. Teacher uses card directly from VipCardsModal → instanceId provided
 * 2. Teacher approves student request from Demandes tab → instanceId from request
 * 3. If card has action → execute it (draw cards, remove warnings, etc.)
 * 4. Mark card as used (usedAt = now)
 * 5. Clear activation request if it existed
 *
 * SECURITY:
 * ---------
 * - Requires authentication
 * - Only teachers/admins can use cards
 * - Teacher must teach the student (verified via class_members)
 * - Card instance must exist and not be used
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getVipCardById } from '$lib/types/vip-card';
import { executeVipCardAction } from '$lib/server/vip-card-actions';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const useCardSchema = z.object({
	instanceId: z.string().uuid('Invalid instance ID format'),
	studentId: z.string().uuid('Invalid student ID format')
});

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication (teacher/admin)
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Verify user is teacher or admin
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can use student VIP cards');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = useCardSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, studentId } = validation.data;

	// Verify that teacher teaches this student
	const { data: classCheck } = await supabase
		.from('class_members')
		.select(
			`
			class_id,
			classes!inner(teacher_id)
		`
		)
		.eq('student_id', studentId);

	const teachesStudent = classCheck?.some((cm) => {
		const classes = cm.classes as unknown;
		if (classes && typeof classes === 'object' && 'teacher_id' in classes) {
			return (classes as { teacher_id: string }).teacher_id === user.id;
		}
		return false;
	});

	if (!teachesStudent) {
		throw error(403, 'You can only use cards for students in your classes');
	}

	// Fetch student's VIP cards
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		console.error('[use-card] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = (studentProfile.vip_cards || {}) as unknown as StudentVipCards;

	// Verify that the instance exists
	const instance = vipCards[instanceId];

	if (!instance) {
		throw error(404, 'VIP card instance not found');
	}

	// Verify that the card is not already used
	if (instance.usedAt) {
		throw error(400, 'This card has already been used');
	}

	// Get card definition
	const cardDef = getVipCardById(instance.cardId);

	if (!cardDef) {
		throw error(404, 'Card definition not found');
	}

	// Execute action if card has one
	let actionResult: unknown = null;

	if (cardDef.action) {
		const result = await executeVipCardAction({
			action: cardDef.action,
			studentId,
			supabase,
			teacherId: user.id
		});

		if (!result.success) {
			console.error('[use-card] Action execution failed:', result.message);
			throw error(500, `Failed to execute card action: ${result.message}`);
		}

		actionResult = result.data;
	}

	// Update instance: mark as used and clear activation request
	const updatedInstance = {
		...instance,
		usedAt: new Date().toISOString()
		// Clear activation request fields by not including them
	};

	// Remove activation request fields if they exist
	delete (updatedInstance as { activationRequestedAt?: string | null }).activationRequestedAt;
	delete (updatedInstance as { activationRequestedBy?: string | null }).activationRequestedBy;

	const updatedCards = {
		...vipCards,
		[instanceId]: updatedInstance
	};

	// Save updated cards to database
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		console.error('[use-card] Error updating vip_cards:', updateError);
		throw error(500, `Failed to use card: ${updateError.message}`);
	}

	// Return success with action result if applicable
	return json({
		success: true,
		message: 'Card used successfully',
		cardName: cardDef.name,
		...(actionResult ? { actionResult } : {})
	});
};
