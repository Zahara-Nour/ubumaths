/**
 * Achievement Events API
 * =======================
 *
 * Endpoint: POST /api/achievements/events
 * Purpose: Process an achievement event and unlock matching achievements
 *
 * Request Body:
 * ```json
 * {
 *   "eventType": "minesweeper_game_completed",
 *   "studentId": "uuid",
 *   "eventData": {
 *     "game_id": "uuid",
 *     "difficulty": "expert",
 *     "score": 150,
 *     "time_seconds": 45,
 *     "perfect": true
 *   }
 * }
 * ```
 *
 * Authorization:
 * - Server-side only (called from game completion, question submission, etc.)
 * - Requires authentication (any role)
 * - CSRF protection required
 *
 * Returns:
 * - eventId: UUID of the created event
 * - unlockedAchievements: Array of newly unlocked achievements
 * - count: Number of achievements unlocked
 * - Status 200: Success
 * - Status 400: Invalid request body
 * - Status 401: Not authenticated
 * - Status 500: Server error
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processEventSchema } from '$lib/server/validation/achievements';
import { processEvent, AchievementServiceError } from '$lib/server/achievements/service';
import type { Profile } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const { user } = locals;

	try {
		// Authentication: require user to be logged in
		if (!user) {
			throw error(401, 'Authentication required');
		}

		// Validate request body
		const body = await request.json();
		const validation = processEventSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { eventType, studentId, eventData } = validation.data;

		// Authorization: Verify the authenticated user can submit events for this student
		if (user.id !== studentId) {
			// Students can only submit events for themselves
			// Teachers/admins must have access to the student
			const { data: profile } = await supabase
				.from('profiles')
				.select('role')
				.eq('id', user.id)
				.single();

			if (!profile || profile.role === 'student') {
				throw error(403, 'Students can only submit events for themselves');
			}

			// For teachers/admins, verify they have access to this student
			const { verifyTeacherStudentWithRole } =
				await import('$lib/server/middleware/student-access');
			// Note: verifyTeacherStudentWithRole only uses profile.role, so casting is safe
			const hasAccess = await verifyTeacherStudentWithRole(
				user.id,
				studentId,
				profile as Profile,
				supabase
			);

			if (!hasAccess) {
				throw error(403, 'Not authorized to submit events for this student');
			}
		}

		// Process the achievement event
		const result = await processEvent(supabase, eventType, studentId, eventData);

		return json({
			success: true,
			eventId: result.eventId,
			unlockedAchievements: result.unlockedAchievements,
			count: result.count
		});
	} catch (err) {
		console.error('[API] Error processing achievement event:', err);

		if (err instanceof AchievementServiceError) {
			throw error(500, err.message);
		}

		// Re-throw SvelteKit errors (HttpError) to preserve status codes
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'An error occurred while processing achievement event');
	}
};
