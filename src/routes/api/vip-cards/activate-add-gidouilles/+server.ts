/**
 * API Endpoint: Activate Add Gidouilles VIP Card
 * ================================================
 *
 * Activates a VIP card that has the add_gidouilles action.
 * Adds gidouilles to the student and marks the card as used.
 *
 * POST /api/vip-cards/activate-add-gidouilles
 *
 * @param instanceId - UUID of the VIP card instance
 * @param studentId - UUID of the student who owns the card
 *
 * FLOW:
 * 1. Validate request
 * 2. Verify caller is the student or their teacher
 * 3. Fetch card and verify it's approved and has add_gidouilles action
 * 4. Mark card as used via use_vip_card RPC — FIRST for safety
 * 5. Add gidouilles via update_student_gidouilles RPC
 * 6. Return gidouilles added
 *
 * SECURITY:
 * - Requires authentication
 * - Student must own the card OR caller is teacher of the student
 * - Card must be approved by teacher (students only)
 * - Card must not be already used
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { z } from 'zod';
import type { StudentVipCards, VipCardAction } from '$lib/types/vip-card';
import { getTemplateById } from '$lib/server/vip-card-queries';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { validateActivationContext } from '$lib/server/vip-card-context';

const activateGidouillesSchema = z.object({
	instanceId: z.string().uuid(),
	studentId: z.string().uuid()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Parse and validate
	const body = await request.json();
	const validation = activateGidouillesSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, studentId } = validation.data;

	// Authorization: student themselves or their teacher
	const isTeacher = profile.role === 'teacher' || profile.role === 'admin';
	const isStudent = user.id === studentId;

	if (isTeacher) {
		const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
		if (!hasAccess) {
			throw error(403, 'You can only activate cards for students in your classes');
		}
	} else if (!isStudent) {
		throw error(403, 'You can only activate cards for yourself');
	}

	// Fetch student's VIP cards
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		console.error('[activate-add-gidouilles] Error fetching profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = (studentProfile.vip_cards || {}) as unknown as StudentVipCards;
	const instance = vipCards[instanceId];

	if (!instance) {
		throw error(404, 'VIP card instance not found');
	}

	if (instance.usedAt) {
		throw error(400, 'This card has already been used');
	}

	// Fetch template early (needed for action.context check)
	const template = await getTemplateById(supabase, instance.cardId);
	if (!template) {
		throw error(404, 'Card template not found');
	}

	// Student flow: require teacher approval OR valid activation context
	if (isStudent && !instance.activationApprovedAt) {
		const actionContext = (template.action as VipCardAction | null)?.context;
		if (actionContext) {
			const contextValid = await validateActivationContext(actionContext, supabase, studentId);
			if (!contextValid) {
				throw error(400, 'Cette carte ne peut être activée que dans un contexte spécifique');
			}
		} else {
			throw error(400, "This card hasn't been approved by a teacher yet");
		}
	}

	if (!template.action || template.action.type !== 'add_gidouilles') {
		throw error(400, "This card doesn't have an add_gidouilles action");
	}

	const amount = template.action.amount;

	// Get student's active class for the gidouilles RPC
	const { data: membership } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId)
		.eq('status', 'active')
		.order('joined_at', { ascending: false })
		.limit(1)
		.single();

	if (!membership) {
		throw error(400, 'Student is not in any active class');
	}

	// Mark card as used FIRST via use_vip_card RPC (safer: prevents double-spend if gidouilles fails)
	const { data: rpcResult, error: rpcError } = await supabase.rpc('use_vip_card', {
		p_student_id: studentId,
		p_instance_id: instanceId,
		p_metadata: {
			action_type: 'add_gidouilles',
			gidouilles_amount: amount
		}
	});

	if (rpcError) {
		console.error('[activate-add-gidouilles] RPC error:', rpcError);
		throw error(500, 'Failed to mark card as used');
	}

	const rpcData = rpcResult as { success: boolean; error?: string };
	if (!rpcData.success) {
		console.error('[activate-add-gidouilles] RPC failed:', rpcData.error);
		throw error(500, 'Failed to mark card as used');
	}

	// Add gidouilles via RPC (card is already consumed, so no double-spend risk)
	const { error: gidouillesError } = await supabase.rpc('update_student_gidouilles', {
		p_student_id: studentId,
		p_class_id: membership.class_id,
		p_delta: amount,
		p_reason: 'vip_card_add_gidouilles',
		p_created_by: user.id
	});

	if (gidouillesError) {
		console.error('[activate-add-gidouilles] Error adding gidouilles:', gidouillesError);
		// Card was consumed but gidouilles failed - log for manual recovery
		throw error(500, 'Failed to add gidouilles. Please contact your teacher.');
	}

	// Audit trail for card consumption is handled by the use_vip_card RPC
	// (inserts action='used' into vip_cards_activity)

	return json({
		success: true,
		gidouillesAdded: amount,
		cardName: template.name
	});
};
