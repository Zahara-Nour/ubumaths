/**
 * API Endpoint: Reject VIP Card Activation
 * =========================================
 *
 * Allows teachers to reject activation requests for VIP cards.
 * Clears the activation request fields without marking the card as used.
 *
 * POST /api/vip-cards/reject-activation
 *
 * @param instanceId - UUID of the VIP card instance
 * @param studentId - UUID of the student who requested activation
 *
 * SECURITY:
 * - Requires authentication
 * - Only teachers/admins can reject activation
 * - Teacher must teach the student (verified via RLS)
 * - Card must have a pending activation request
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getTemplateById } from '$lib/server/vip-card-queries';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const rejectActivationSchema = z.object({
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
		throw error(403, 'Only teachers can reject VIP card activations');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = rejectActivationSchema.safeParse(body);

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
		throw error(403, 'You can only reject activations for students in your classes');
	}

	// Fetch student's VIP cards
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		console.error('[reject-activation] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = (studentProfile.vip_cards || {}) as unknown as StudentVipCards;

	// Verify that the instance exists
	const instance = vipCards[instanceId];

	if (!instance) {
		throw error(404, 'VIP card instance not found');
	}

	// Verify that there is a pending activation request
	if (!instance.activationRequestedAt) {
		throw error(400, 'No pending activation request for this card');
	}

	// Get card template
	const template = await getTemplateById(supabase, instance.cardId);

	if (!template) {
		throw error(404, 'Card definition not found');
	}

	// Update instance: clear activation request fields
	const updatedInstance = {
		...instance,
		activationRequestedAt: null,
		activationRequestedBy: null
	};

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
		console.error('[reject-activation] Error updating vip_cards:', updateError);
		throw error(500, `Failed to reject activation: ${updateError.message}`);
	}

	// Return success
	return json({
		success: true,
		message: 'Activation request rejected successfully',
		instance: updatedInstance,
		cardName: template.name
	});
};
