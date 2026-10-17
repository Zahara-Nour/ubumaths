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
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/vip-cards/reject-activation/+server');

const rejectActivationSchema = z.object({
	instanceId: z.string().uuid('Identifiant de carte VIP invalide'),
	studentId: z.string().uuid('Identifiant d’élève invalide')
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Seul le professeur peut refuser l’activation d’une carte VIP');
	}

	const body = await request.json();
	const validation = rejectActivationSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, studentId } = validation.data;

	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'Refus réservé aux activations des élèves des classes du professeur');
	}

	const { data: result, error: rpcError } = await supabase.rpc('reject_vip_card', {
		p_student_id: studentId,
		p_instance_id: instanceId
	});

	if (rpcError) {
		logger.error('[reject-activation] RPC error:', rpcError);
		throw error(500, 'Impossible de refuser l’activation');
	}

	const rpcResult = result as { success: boolean; error?: string; cardName?: string };

	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Impossible de refuser l’activation');
	}

	return json({
		success: true,
		message: 'Demande d’activation refusée',
		cardName: rpcResult.cardName
	});
};
