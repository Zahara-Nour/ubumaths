/**
 * API Endpoint: Reject VIP Card Activation
 * =========================================
 *
 * Allows teachers to reject activation requests for VIP cards.
 * Delegates to the reject_vip_card RPC for atomic operation + audit trail.
 *
 * POST /api/vip-cards/reject-activation
 *
 * @param instanceId - UUID of the VIP card instance
 * @param studentId - UUID of the student who requested activation
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';

const rejectActivationSchema = z.object({
	instanceId: z.string().uuid('Invalid instance ID format'),
	studentId: z.string().uuid('Invalid student ID format')
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can reject VIP card activations');
	}

	const body = await request.json();
	const validation = rejectActivationSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, studentId } = validation.data;

	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'You can only reject activations for students in your classes');
	}

	const { data: result, error: rpcError } = await supabase.rpc('reject_vip_card', {
		p_student_id: studentId,
		p_instance_id: instanceId
	});

	if (rpcError) {
		console.error('[reject-activation] RPC error:', rpcError);
		throw error(500, 'Failed to reject activation');
	}

	const rpcResult = result as { success: boolean; error?: string; cardName?: string };

	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Failed to reject activation');
	}

	return json({
		success: true,
		message: 'Activation request rejected successfully',
		cardName: rpcResult.cardName
	});
};
