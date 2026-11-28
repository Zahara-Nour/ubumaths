/**
 * Google Classroom Sync Endpoint
 * ===============================
 *
 * Endpoint: POST /api/google/sync
 * Purpose: Trigger full sync of Google Classroom courses and coursework
 *
 * Flow:
 * 1. Verify user is a teacher
 * 2. Check if Google Classroom is connected
 * 3. Perform full sync (courses + coursework + materials)
 * 4. Return sync results
 *
 * Security:
 * - Teacher role required
 * - Requires existing Google integration
 * - Automatic token refresh if needed
 * - Consider rate limiting for production
 *
 * Response:
 * {
 *   success: boolean,
 *   coursesSynced: number,      // Number of courses synced
 *   courseworkSynced: number,   // Number of coursework items synced
 *   errors: string[]            // Array of error messages
 * }
 *
 * Note: Sync may take time for large accounts (30+ seconds)
 * Consider implementing as background job for production
 */

import { throwServerError } from '#lib/server/utils/error-handler.ts';
import { error } from '@sveltejs/kit';
import { assertGoogleClassroomEnabled } from '#lib/server/google/feature-guard.ts';
import type { RequestHandler } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { fullSync } from '#lib/server/google/sync.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/google/sync/+server');

/**
 * Trigger full Google Classroom sync
 *
 * Security: Teacher role required, integration must exist
 *
 * Returns sync results with counts and errors
 */
export const POST: RequestHandler = async ({ locals }) => {
	assertGoogleClassroomEnabled();

	// Only teachers can trigger sync
	const { user } = await requireRole(locals, 'teacher');

	try {
		// Check if Google account is connected
		const { data: integration, error: fetchError } = await locals.supabase
			.from('google_integrations')
			.select('id')
			.eq('teacher_id', user.id)
			.single();

		if (fetchError || !integration) {
			throw error(400, 'Google Classroom n’est pas connecté : le connecter dans les paramètres');
		}

		logger.info(`[Google Sync] Starting full sync for teacher ${user.id}`);

		// Perform full sync (courses + coursework + materials)
		// This may take 30+ seconds for accounts with many courses
		const result = await fullSync(user.id, locals.supabase);

		logger.info(
			`[Google Sync] Completed for teacher ${user.id}. ` +
				`Courses: ${result.coursesSynced}, Coursework: ${result.courseworkSynced}, ` +
				`Errors: ${result.errors.length}`
		);

		// Return results
		return Response.json({
			success: true,
			coursesSynced: result.coursesSynced,
			courseworkSynced: result.courseworkSynced,
			errors: result.errors
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Handle other errors
		throwServerError('api/google/sync', err, 'Impossible de synchroniser Google Classroom');
	}
};
