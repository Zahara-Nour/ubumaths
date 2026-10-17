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
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/vip-cards/approve-card/+server');

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Seul le professeur peut valider une demande d’activation de carte VIP');
	}

	const body = await request.json();
	const validation = useCardSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { instanceId, studentId } = validation.data;

	if (!studentId) {
		throw error(400, 'Identifiant d’élève requis');
	}

	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'Validation réservée aux cartes VIP des élèves des classes du professeur');
	}

	const { data: result, error: rpcError } = await supabase.rpc('approve_vip_card', {
		p_student_id: studentId,
		p_instance_id: instanceId
	});

	if (rpcError) {
		logger.error('[approve-card] RPC error:', rpcError);
		throw error(500, 'Impossible de valider la carte VIP');
	}

	const rpcResult = result as { success: boolean; error?: string; cardName?: string };

	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Impossible de valider la carte VIP');
	}

	return json({
		success: true,
		message: 'Activation validée : l’élève peut maintenant activer sa carte VIP.',
		cardName: rpcResult.cardName
	});
};
