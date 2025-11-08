/**
 * API Endpoint: Use VIP Card
 * ============================
 *
 * Simplified endpoint to mark a VIP card instance as used.
 * This endpoint ONLY marks the card as used - it does NOT execute actions.
 *
 * POST /api/vip-cards/use-card
 *
 * @param instanceId - UUID of the VIP card instance to mark as used
 * @param studentId - UUID of the student who owns the card
 *
 * ARCHITECTURE (Option A):
 * ------------------------
 * This endpoint is the FINAL step in the VIP card usage flow.
 * Action execution happens BEFORE calling this endpoint:
 *
 * 1. UI displays action-specific modal (DrawCardsModal, RemoveWarningsModal, etc.)
 * 2. User interacts with UI and confirms action
 * 3. Specialized API endpoint executes action:
 *    - draw_cards → /api/rewards/draw-vip-cards
 *    - remove_warnings → /api/warnings/remove-multiple (future)
 *    - exchange_cards → /api/vip-cards/exchange (future)
 *    - add_gidouilles → /api/teacher/rewards/update-student
 * 4. After successful action, call THIS endpoint to mark card as used
 *
 * SECURITY:
 * ---------
 * - Requires authentication
 * - Only teachers/admins can use cards
 * - Teacher must teach the student (verified via class_members)
 * - Card instance must exist and not already be used
 * - Uses SELECT FOR UPDATE to prevent race conditions
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getTemplateById } from '$lib/server/vip-card-queries';
import { useCardSchema } from '$lib/server/validation/vip-cards';

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

	// Get card template from database
	const template = await getTemplateById(locals.supabase, instance.cardId);

	if (!template) {
		throw error(404, 'Card definition not found');
	}

	// Mark card as used and clear activation request fields
	const updatedInstance = {
		...instance,
		usedAt: new Date().toISOString()
		// Omit activationRequestedAt and activationRequestedBy to clear them
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

	// Return simple success response
	return json({
		success: true,
		message: 'Card marked as used successfully',
		cardName: cardDef.name
	});
};
