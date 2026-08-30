/**
 * POST /api/warnings
 * Add a warning to a student (via atomic RPC)
 *
 * Security:
 * - Requires authentication
 * - Teacher ownership verified by RPC (is_class_teacher)
 * - Input validated with Zod schema
 * - Max 20 warnings enforced atomically
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
import { requireRoles } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);
	const supabase = locals.supabase;

	try {
		const body = await request.json();
		const validation = addWarningSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { student_id, class_id, academic_period_id, warning_type } = validation.data;

		const updatedCounts = await addWarning({
			studentId: student_id,
			classId: class_id,
			periodId: academic_period_id,
			warningType: warning_type,
			supabase
		});

		return json({
			success: true,
			counts: updatedCounts
		});
	} catch (err) {
		console.error('Error adding warning:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de l'ajout de l'avertissement");
	}
};
