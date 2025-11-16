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

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { fullSync } from '$lib/server/google/sync';

/**
 * Trigger full Google Classroom sync
 *
 * Security: Teacher role required, integration must exist
 *
 * Returns sync results with counts and errors
 */
export const POST: RequestHandler = async ({ locals }) => {
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
			throw error(
				400,
				'Google Classroom not connected. Please connect your account in settings first.'
			);
		}

		console.log(`[Google Sync] Starting full sync for teacher ${user.id}`);

		// Perform full sync (courses + coursework + materials)
		// This may take 30+ seconds for accounts with many courses
		const result = await fullSync(user.id, locals.supabase);

		console.log(
			`[Google Sync] Completed for teacher ${user.id}. ` +
				`Courses: ${result.coursesSynced}, Coursework: ${result.courseworkSynced}, ` +
				`Errors: ${result.errors.length}`
		);

		// Return results
		return json({
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
		console.error('[Google Sync] Sync error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error during sync';
		throw error(500, `Sync failed: ${message}`);
	}
};
