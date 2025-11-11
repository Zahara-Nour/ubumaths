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
	const { user } = locals;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	// Validate input
	const validation = awardBonusSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, delta } = validation.data;
	const supabase = locals.supabase;

	// Call RPC to update student bonus
	const { data: newValue, error: rpcError } = await supabase.rpc('update_student_bonus', {
		p_student_id: studentId,
		p_delta: delta
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
