/**
 * POST /api/warnings
 * Add a warning to a student
 *
 * Security:
 * - Requires authentication
 * - Teacher ownership verified via RLS and helper functions
 * - Input validated with Zod schema
 *
 * Request body:
 * - student_id: string (UUID)
 * - class_id: string (UUID)
 * - academic_period_id: string (UUID)
 * - warning_type: 'C' | 'M' | 'R' | 'T'
 *
 * Response:
 * - success: boolean
 * - counts: StudentWarningCounts (updated counts for student)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addWarningSchema } from '$lib/server/validation/warnings';
import { addWarning } from '$lib/server/warnings';

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// ✅ SECURITY: Validate input with Zod
		const body = await request.json();
		const validation = addWarningSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { student_id, class_id, academic_period_id, warning_type } = validation.data;

		// Add warning (helper verifies teacher ownership and inserts)
		const updatedCounts = await addWarning({
			studentId: student_id,
			classId: class_id,
			periodId: academic_period_id,
			warningType: warning_type,
			teacherId: user.id,
			supabase
		});

		return json({
			success: true,
			counts: updatedCounts
		});
	} catch (err) {
		console.error('Error adding warning:', err);

		// Re-throw errors with status codes (from helper functions)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de l'ajout de l'avertissement");
	}
};
