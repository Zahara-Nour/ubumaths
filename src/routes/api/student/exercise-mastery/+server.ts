/**
 * GET /api/student/exercise-mastery
 * =================================
 *
 * Returns all exercise mastery statuses for the logged-in student.
 *
 * AUTH: Student only
 *
 * RESPONSE:
 * {
 *   mastery: Array<{ exercise_id: string, status: MasteryStatus }>
 * }
 *
 * SECURITY:
 * - RLS policies ensure students only see their own mastery records
 * - No teacher/admin access (mastery is private to student)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import type { ExerciseMasteryListResponse, MasteryStatus } from '$lib/types/exercise-mastery';

export const GET: RequestHandler = async ({ locals }) => {
	// Auth check: Must be a student
	const { user } = await requireRole(locals, 'student');

	try {
		// Fetch all mastery records for this student
		// RLS ensures only the student's own records are returned
		const { data: masteryRecords, error: dbError } = await locals.supabase
			.from('student_exercise_mastery')
			.select('exercise_id, status')
			.eq('student_id', user.id);

		if (dbError) {
			console.error('[API] Error fetching exercise mastery:', dbError);
			throw error(500, 'Erreur lors de la recuperation des statuts de maitrise');
		}

		// Transform to response format
		const response: ExerciseMasteryListResponse = {
			mastery: (masteryRecords ?? []).map((record) => ({
				exercise_id: record.exercise_id,
				status: record.status as MasteryStatus
			}))
		};

		return json(response);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/exercise-mastery:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
