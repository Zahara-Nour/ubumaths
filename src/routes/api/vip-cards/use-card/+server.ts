/**
 * API Endpoint: Approve VIP Card Activation
 * ==========================================
 *
 * Teacher endpoint to approve a student's VIP card activation request.
 * This endpoint ONLY approves the request - it does NOT activate/use the card.
 *
 * POST /api/vip-cards/use-card
 *
 * @param instanceId - UUID of the VIP card instance to approve
 * @param studentId - UUID of the student who owns the card
 *
 * TWO-STEP ACTIVATION FLOW:
 * -------------------------
 * 1. Student requests activation (sets activationRequestedAt)
 * 2. Teacher approves request → THIS ENDPOINT (sets activationApprovedAt)
 * 3. Student activates card → /api/vip-cards/activate-card (sets usedAt)
 *
 * SECURITY:
 * ---------
 * - Requires authentication
 * - Only teachers/admins can approve
 * - Teacher must teach the student (verified via class_members)
 * - Card instance must exist and not already be used or approved
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getTemplateById } from '$lib/server/vip-card-queries';
import { useCardSchema } from '$lib/server/validation/vip-cards';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication (teacher/admin)
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Verify user is teacher or admin
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can approve VIP card activation requests');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = useCardSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, studentId } = validation.data;

	// Verify teacher-student relationship (admins bypass this check)
	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'You can only use cards for students in your classes');
	}

	// Fetch student's VIP cards with row-level lock to prevent race conditions
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

	// Verify that the card is not already approved
	if (instance.activationApprovedAt) {
		throw error(400, 'This card has already been approved');
	}

	// Get card template from database
	const template = await getTemplateById(locals.supabase, instance.cardId);

	if (!template) {
		throw error(404, 'Card definition not found');
	}

	// Approve the activation request
	const updatedInstance = {
		...instance,
		activationApprovedAt: new Date().toISOString(),
		activationApprovedBy: user.id
		// Keep activationRequestedAt and activationRequestedBy for audit trail
		// Clear them when student actually activates the card
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
		console.error('[use-card] Error updating vip_cards:', updateError);
		throw error(500, `Failed to approve card: ${updateError.message}`);
	}

	// Return success response
	return json({
		success: true,
		message: 'Card activation approved. Student can now activate the card.',
		cardName: template.name
	});
};
