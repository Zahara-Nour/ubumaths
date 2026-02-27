/**
 * POST /api/warnings/bulk
 * Add multiple warnings for a student in one atomic operation (via RPC)
 *
 * Security:
 * - Requires authentication
 * - Teacher ownership verified by RPC (is_class_teacher)
 * - Input validated with Zod schema
 * - Max 20 warnings enforced atomically (existing + new)
 *
 * Request body:
 * - student_id: string (UUID)
 * - class_id: string (UUID)
 * - academic_period_id: string (UUID)
 * - warning_types: ('C' | 'M' | 'R' | 'T')[] (1-20 items)
 *
 * Response:
 * - success: boolean
 * - counts: StudentWarningCounts (updated counts for student)
 * - added: number (how many warnings were added)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addWarningsBulkSchema } from '$lib/server/validation/warnings';
import { addWarningsBulk } from '$lib/server/warnings';
import { requireAuth } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		const body = await request.json();
		const validation = addWarningsBulkSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { student_id, class_id, academic_period_id, warning_types } = validation.data;

		const result = await addWarningsBulk({
			studentId: student_id,
			classId: class_id,
			periodId: academic_period_id,
			warningTypes: warning_types,
			supabase
		});

		return json({
			success: true,
			counts: result.counts,
			added: result.added
		});
	} catch (err) {
		console.error('Error adding warnings (bulk):', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de l'ajout des avertissements");
	}
};
