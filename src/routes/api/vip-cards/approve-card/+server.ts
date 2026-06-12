/**
 * API Endpoint: Approve VIP Card Activation
 * ==========================================
 *
 * Teacher-only endpoint to approve a student's VIP card activation request.
 * Sets activationApprovedAt/By only — does NOT consume the card.
 *
 * POST /api/vip-cards/approve-card
 *
 * @param instanceId - UUID of the VIP card instance to approve
 * @param studentId - UUID of the student who owns the card
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { useCardSchema } from '$lib/server/validation/vip-cards';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can approve VIP card activation requests');
	}

	const body = await request.json();
	const validation = useCardSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, studentId } = validation.data;

	if (!studentId) {
		throw error(400, 'studentId is required for teachers');
	}

	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'You can only approve cards for students in your classes');
	}

	const { data: result, error: rpcError } = await supabase.rpc('approve_vip_card', {
		p_student_id: studentId,
		p_instance_id: instanceId
	});

	if (rpcError) {
		console.error('[approve-card] RPC error:', rpcError);
		throw error(500, 'Failed to approve card');
	}

	const rpcResult = result as { success: boolean; error?: string; cardName?: string };

	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Failed to approve card');
	}

	return json({
		success: true,
		message: 'Card activation approved. Student can now activate the card.',
		cardName: rpcResult.cardName
	});
};
