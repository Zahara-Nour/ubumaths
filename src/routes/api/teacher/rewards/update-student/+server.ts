/**
 * Update Student Gidouilles API
 * ==============================
 *
 * Endpoint: POST /api/teacher/rewards/update-student
 * Purpose: Add or remove gidouilles for a specific student
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const schema = z.object({
	studentId: z.string().uuid(),
	classId: z.string().uuid(), // Required for history tracking
	delta: z.number().int().min(-1000).max(1000), // Safety bounds
	reason: z.string().max(200).optional() // Optional reason for the adjustment
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = locals;

	if (!user) {
		throw error(401, 'Authentication required');
	}

	// Validate input
	const validation = schema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, classId, delta, reason } = validation.data;
	const supabase = locals.supabase;

	try {
		// Call RPC to update student gidouilles
		const { data: newValue, error: rpcError } = await supabase.rpc('update_student_gidouilles', {
			p_student_id: studentId,
			p_class_id: classId,
			p_delta: delta,
			p_reason: reason ?? 'Modifié par professeur',
			p_created_by: user.id
		});

		if (rpcError) {
			console.error('[API] RPC Error:', rpcError);
			throw error(500, rpcError.message || 'Failed to update gidouilles');
		}

		return json({
			success: true,
			message: 'Gidouilles mises à jour avec succès',
			newValue
		});
	} catch (err) {
		console.error('[API] Error updating student gidouilles:', err);
		throw error(500, 'An error occurred while updating gidouilles');
	}
};
