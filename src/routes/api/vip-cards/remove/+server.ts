/**
 * API Endpoint: Remove VIP Card
 * ===============================
 *
 * Allows teachers to remove VIP card instances from students' collections.
 * Delegates to the remove_vip_card RPC for atomic operation + audit trail.
 *
 * POST /api/vip-cards/remove
 *
 * @param studentId - UUID of the student who owns the card
 * @param cardId - ID of the card type to remove (e.g., "bonus", "captain")
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/vip-cards/remove/+server');

const removeCardSchema = z.object({
	studentId: z.string().uuid('Identifiant d’élève invalide'),
	cardId: z.string().min(1, 'Identifiant de carte VIP requis'),
	reason: z.string().optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Seul le professeur peut retirer une carte VIP à un élève');
	}

	const body = await request.json();
	const validation = removeCardSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, cardId, reason } = validation.data;

	const hasAccess = await verifyTeacherStudentWithRole(user.id, studentId, profile, supabase);
	if (!hasAccess) {
		throw error(403, 'Retrait de cartes VIP réservé aux élèves des classes du professeur');
	}

	const { data: result, error: rpcError } = await supabase.rpc('remove_vip_card', {
		p_student_id: studentId,
		p_card_id: cardId,
		// Paramètre `DEFAULT NULL` : l'omettre applique le même défaut.
		p_reason: reason ?? undefined
	});

	if (rpcError) {
		logger.error('[remove-card] RPC error:', rpcError);
		throw error(500, 'Impossible de retirer la carte VIP');
	}

	const rpcResult = result as {
		success: boolean;
		error?: string;
		cardName?: string;
		instanceId?: string;
	};

	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Impossible de retirer la carte VIP');
	}

	return json({
		success: true,
		message: 'Carte VIP retirée',
		cardName: rpcResult.cardName,
		instanceId: rpcResult.instanceId
	});
};
