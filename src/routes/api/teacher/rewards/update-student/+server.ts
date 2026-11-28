/**
 * Update Student Gidouilles API
 * ==============================
 *
 * Endpoint: POST /api/teacher/rewards/update-student
 * Purpose: Add or remove gidouilles for a specific student
 */

import { throwServerError } from '#lib/server/utils/error-handler.ts';
import { error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { z } from 'zod';

const schema = z.object({
	studentId: z.string().uuid(),
	classId: z.string().uuid(), // Required for history tracking
	delta: z.number().int().min(-1000).max(1000), // Safety bounds
	reason: z.string().max(200).optional() // Optional reason for the adjustment
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// SECURITY (finding M5): teacher/admin only (defense in depth over the RPC guard).
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

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
			p_reason: reason ?? (delta > 0 ? 'Ajouté par le professeur' : 'Retiré par le professeur'),
			p_created_by: user.id
		});

		if (rpcError) {
			throwServerError(
				'api/teacher/rewards/update-student',
				rpcError,
				'Impossible de modifier les gidouilles'
			);
		}

		return Response.json({
			success: true,
			message: 'Gidouilles mises à jour avec succès',
			newValue
		});
	} catch (err) {
		// L'erreur 500 levée plus haut porte déjà son message français : la relancer telle quelle.
		if (isHttpError(err)) throw err;
		throwServerError(
			'api/teacher/rewards/update-student',
			err,
			'Impossible de modifier les gidouilles'
		);
	}
};
