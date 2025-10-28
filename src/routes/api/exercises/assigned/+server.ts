/**
 * API Route: /api/exercises/assigned
 *
 * GET - List all exercises assigned to the current student
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAssignmentsForStudent } from '$lib/server/exercise-assignments';
import type { StudentExerciseFilters } from '$lib/exercises/types';
import { validateStudentExerciseFilters } from '$lib/server/validation';

/**
 * GET /api/exercises/assigned
 *
 * Get all exercises accessible to the current student.
 * Includes assigned exercises (direct + class) and optionally public exercises.
 * Students only.
 *
 * @query completed - Include completed exercises (true/false)
 * @query assigned_only - Show only assigned exercises, exclude public (true/false)
 * @query public - Include public exercises (true/false)
 * @query has_deadline - Show only exercises with deadlines (true/false)
 * @query search - Search in title and statement
 * @returns Array of exercises with assignment and completion data
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Validate and parse filters from query params
	const queryValidation = validateStudentExerciseFilters(url.searchParams);
	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.errors
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		return json({ error: `Invalid query parameters: ${errorMsg}` }, { status: 400 });
	}

	// Build filters
	const filters: StudentExerciseFilters = {};

	if (queryValidation.data.completed !== undefined) {
		filters.show_completed = queryValidation.data.completed;
	}

	if (queryValidation.data.assigned_only !== undefined) {
		filters.show_assigned_only = queryValidation.data.assigned_only;
	}

	if (queryValidation.data.public !== undefined) {
		filters.show_public = queryValidation.data.public;
	}

	if (queryValidation.data.has_deadline !== undefined) {
		filters.has_deadline = queryValidation.data.has_deadline;
	}

	if (queryValidation.data.search) {
		filters.search = queryValidation.data.search;
	}

	// Fetch student's assigned exercises
	const { data: exercises, error: fetchError } = await getAssignmentsForStudent(
		locals.supabase,
		user.id,
		filters
	);

	if (fetchError) {
		console.error('Failed to fetch assigned exercises:', fetchError);
		return json({ error: 'Failed to fetch exercises' }, { status: 500 });
	}

	return json(exercises);
};
