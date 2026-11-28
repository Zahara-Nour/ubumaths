/**
 * Update Student Bonus API
 * =========================
 *
 * Endpoint: POST /api/teacher/rewards/update-student-bonus
 * Purpose: Add or remove bonus for a specific student
 */

import { throwServerError } from '#lib/server/utils/error-handler.ts';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { awardBonusSchema } from '#lib/server/validation/rewards.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/teacher/rewards/update-student-bonus/+server');

export const POST: RequestHandler = async ({ request, locals }) => {
	// SECURITY (finding M5): teacher/admin only (defense in depth over the RPC guard).
	await requireRoles(locals, ['teacher', 'admin']);

	// Validate input
	const validation = awardBonusSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, classId, delta, reason } = validation.data;
	const supabase = locals.supabase;

	// Call RPC to update student bonus
	const { data: newValue, error: rpcError } = await supabase.rpc('update_student_bonus', {
		p_student_id: studentId,
		p_class_id: classId,
		p_delta: delta,
		// Paramètre `DEFAULT NULL` : l'omettre applique le même défaut.
		p_reason: reason ?? undefined
	});

	if (rpcError) {
		throwServerError(
			'api/teacher/rewards/update-student-bonus',
			rpcError,
			'Impossible de modifier le bonus'
		);
	}

	logger.info('[API] Bonus updated successfully:', { studentId, delta, newValue });

	return Response.json({
		success: true,
		message: 'Bonus mis à jour avec succès',
		newValue
	});
};
