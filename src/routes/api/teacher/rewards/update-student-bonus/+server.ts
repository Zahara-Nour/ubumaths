/**
 * Update Student Bonus API
 * =========================
 *
 * Endpoint: POST /api/teacher/rewards/update-student-bonus
 * Purpose: Add or remove bonus for a specific student
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { awardBonusSchema } from '$lib/server/validation/rewards';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = locals;

	if (!user) {
		throw error(401, 'Authentication required');
	}
	// SECURITY (finding M5): teacher/admin only (defense in depth over the RPC guard).
	if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
		throw error(403, 'Réservé aux enseignants');
	}

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
		console.error('[API] RPC Error updating bonus:', rpcError);
		throw error(500, rpcError.message || 'Failed to update bonus');
	}

	console.log('[API] Bonus updated successfully:', { studentId, delta, newValue });

	return json({
		success: true,
		message: 'Bonus mis à jour avec succès',
		newValue
	});
};
