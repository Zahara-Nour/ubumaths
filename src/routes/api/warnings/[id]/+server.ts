/**
 * DELETE /api/warnings/[id]
 * Remove a warning by ID
 *
 * Security:
 * - Requires authentication
 * - Teacher must have created the warning (verified in helper)
 * - Teacher must own the class (verified via RLS)
 * - Warning ID validated with Zod schema
 *
 * Response:
 * - success: boolean
 * - studentId: string (UUID of affected student)
 * - counts: StudentWarningCounts (updated counts for student)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeWarningSchema } from '$lib/server/validation/warnings';
import { removeWarning } from '$lib/server/warnings';
import { invalidateWarningsCache } from '$lib/server/cache/warnings';

export const DELETE: RequestHandler = async ({ params, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// ✅ SECURITY: Validate warning ID with Zod
		const validation = removeWarningSchema.safeParse({ warning_id: params.id });

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { warning_id } = validation.data;

		// Remove warning (helper verifies ownership and deletes)
		const result = await removeWarning({
			warningId: warning_id,
			teacherId: user.id,
			supabase
		});

		// Invalidate warnings cache for this class and period
		await invalidateWarningsCache(result.classId, result.periodId);

		return json({
			success: true,
			studentId: result.studentId,
			counts: result.updatedCounts
		});
	} catch (err) {
		console.error('Error removing warning:', err);

		// Re-throw errors with status codes (from helper functions)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de la suppression de l'avertissement");
	}
};
