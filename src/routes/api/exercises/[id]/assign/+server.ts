/**
 * API Route: /api/exercises/[id]/assign
 *
 * POST - Create new assignment(s) for a specific exercise (teacher only)
 * GET - List all assignments for an exercise (teacher only)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createExerciseAssignment,
	createBulkAssignments,
	getAssignmentsForExercise
} from '$lib/server/exercise-assignments';
import type {
	CreateExerciseAssignment,
	BulkAssignmentData,
	TeacherAssignmentFilters
} from '$lib/exercises/types';

/**
 * POST /api/exercises/[id]/assign
 *
 * Create assignment(s) for an exercise.
 * Supports single assignment or bulk creation.
 * Teacher only.
 *
 * @body CreateExerciseAssignment | BulkAssignmentData
 * @returns Created assignment(s) with count
 */
export const POST: RequestHandler = async ({ request, params, locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { user } = session;

	// Check if user is a teacher
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		return json({ error: 'Forbidden - Teachers only' }, { status: 403 });
	}

	const exerciseId = params.id;
	const body = await request.json();

	// Check if bulk assignment (has students[] or classes[] or make_public)
	if (body.students || body.classes || body.make_public) {
		// Bulk assignment
		const bulkData: BulkAssignmentData = {
			exercise_id: exerciseId,
			students: body.students,
			classes: body.classes,
			make_public: body.make_public,
			optional_deadline: body.optional_deadline || null,
			notes: body.notes
		};

		const { count, error: bulkError } = await createBulkAssignments(
			locals.supabase,
			bulkData,
			user.id
		);

		if (bulkError) {
			console.error('Failed to create bulk assignments:', bulkError);
			return json({ error: bulkError }, { status: 400 });
		}

		return json(
			{
				count,
				message: `${count} assignment(s) created successfully`
			},
			{ status: 201 }
		);
	}

	// Single assignment
	const assignmentData: CreateExerciseAssignment = {
		exercise_id: exerciseId,
		assigned_to_type: body.assigned_to_type,
		student_id: body.student_id,
		class_id: body.class_id,
		optional_deadline: body.optional_deadline || null,
		notes: body.notes
	};

	const { data: assignment, error: assignmentError } = await createExerciseAssignment(
		locals.supabase,
		assignmentData,
		user.id
	);

	if (assignmentError) {
		console.error('Failed to create assignment:', assignmentError);
		return json({ error: assignmentError }, { status: 400 });
	}

	return json(assignment, { status: 201 });
};

/**
 * GET /api/exercises/[id]/assign
 *
 * List all assignments for a specific exercise.
 * Teacher only - must be creator of the exercise.
 *
 * @query type - Filter by assignment type (student, class, public)
 * @query active - Filter by active status (true/false)
 * @returns Array of assignments with details
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { user } = session;

	// Check if user is a teacher
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		return json({ error: 'Forbidden - Teachers only' }, { status: 403 });
	}

	const exerciseId = params.id;

	// Parse query params for filters
	const filters: TeacherAssignmentFilters = {
		exercise_id: exerciseId
	};

	const typeParam = url.searchParams.get('type');
	if (typeParam === 'student' || typeParam === 'class' || typeParam === 'public') {
		filters.assigned_to_type = typeParam;
	}

	const activeParam = url.searchParams.get('active');
	if (activeParam !== null) {
		filters.is_active = activeParam === 'true';
	}

	const hasDeadlineParam = url.searchParams.get('has_deadline');
	if (hasDeadlineParam !== null) {
		filters.has_deadline = hasDeadlineParam === 'true';
	}

	// Fetch assignments
	const { data: assignments, error: fetchError } = await getAssignmentsForExercise(
		locals.supabase,
		exerciseId,
		filters
	);

	if (fetchError) {
		console.error('Failed to fetch assignments:', fetchError);
		return json({ error: 'Failed to fetch assignments' }, { status: 500 });
	}

	return json(assignments);
};
