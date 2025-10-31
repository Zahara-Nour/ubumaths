/**
 * GET /api/classes/[classId]/warnings?period_id=<uuid>
 * Fetch warning counts for all students in a class for a specific period
 *
 * Security:
 * - Requires authentication
 * - Teacher ownership verified via helper function (RLS)
 * - Input validated (classId, period_id query param)
 *
 * Query params:
 * - period_id: string (UUID) - Required
 *
 * Response:
 * - success: boolean
 * - warnings: Record<student_id, StudentWarningCounts>
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClassWarnings } from '$lib/server/warnings';
import { getClassWarningsSchema } from '$lib/server/validation/classes';
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const { user } = await requireAuth(locals);

	try {
		// ✅ SECURITY: Validate parameters with Zod
		const validation = getClassWarningsSchema.safeParse({
			classId: params.classId,
			period_id: url.searchParams.get('period_id') || ''
		});

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { classId, period_id: periodId } = validation.data;

		// Fetch warnings for class (helper verifies teacher ownership)
		const warningsResult = await getClassWarnings({
			classId,
			periodId,
			teacherId: user.id,
			supabase: locals.supabase
		});

		// Convert to Map if coming from cache (JSON deserialization converts Map to object)
		const warningsMap =
			warningsResult instanceof Map
				? warningsResult
				: new Map(Object.entries(warningsResult as Record<string, unknown>));

		// Convert Map to plain object for JSON serialization
		const warningsObject: Record<string, unknown> = {};
		for (const [studentId, counts] of warningsMap.entries()) {
			warningsObject[studentId] = counts;
		}

		return json({
			success: true,
			warnings: warningsObject
		});
	} catch (err) {
		console.error('Error fetching class warnings:', err);

		// Re-throw errors with status codes (from helper functions)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors du chargement des avertissements');
	}
};
