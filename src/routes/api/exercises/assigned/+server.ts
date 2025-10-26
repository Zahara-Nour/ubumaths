/**
 * API Route: /api/exercises/assigned
 *
 * GET - List all exercises assigned to the current student
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAssignmentsForStudent } from '$lib/server/exercise-assignments';
import type { StudentExerciseFilters } from '$lib/exercises/types';

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
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { user } = session;

	// Parse filters from query params
	const filters: StudentExerciseFilters = {};

	const completedParam = url.searchParams.get('completed');
	if (completedParam !== null) {
		filters.show_completed = completedParam === 'true';
	}

	const assignedOnlyParam = url.searchParams.get('assigned_only');
	if (assignedOnlyParam !== null) {
		filters.show_assigned_only = assignedOnlyParam === 'true';
	}

	const publicParam = url.searchParams.get('public');
	if (publicParam !== null) {
		filters.show_public = publicParam === 'true';
	}

	const hasDeadlineParam = url.searchParams.get('has_deadline');
	if (hasDeadlineParam !== null) {
		filters.has_deadline = hasDeadlineParam === 'true';
	}

	const searchParam = url.searchParams.get('search');
	if (searchParam) {
		filters.search = searchParam;
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
