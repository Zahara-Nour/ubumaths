/**
 * API Route: /api/exercises/[id]/assign
 *
 * POST - Create new assignment(s) for a specific exercise (teacher only)
 * GET - List all assignments for an exercise (teacher only)
 */

import { json, error } from '@sveltejs/kit';
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
import {
	validateBulkAssign,
	validateSingleAssign,
	validateAssignmentQuery
} from '$lib/server/validation';

type ZodIssue = { path: (string | number)[]; message: string };

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
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

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
		// Validate bulk assignment
		const validation = validateBulkAssign(body);
		if (!validation.success) {
			const errorMsg = validation.error.issues
				.map((e) => `${(e as ZodIssue).path.join('.')}: ${e.message}`)
				.join('; ');
			throw error(400, `Validation failed: ${errorMsg}`);
		}

		const bulkData: BulkAssignmentData = {
			exercise_id: exerciseId,
			students: validation.data.students,
			classes: validation.data.classes,
			make_public: validation.data.make_public,
			optional_deadline: validation.data.optional_deadline || null,
			notes: validation.data.notes
		};

		const { count, error: bulkError } = await createBulkAssignments(
			locals.supabase,
			bulkData,
			user.id
		);

		if (bulkError) {
			console.error('Failed to create bulk assignments:', bulkError);
			throw error(400, bulkError);
		}

		return json(
			{
				count,
				message: `${count} assignment(s) created successfully`
			},
			{ status: 201 }
		);
	}

	// Validate single assignment
	const validation = validateSingleAssign(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const assignmentData: CreateExerciseAssignment = {
		exercise_id: exerciseId,
		assigned_to_type: validation.data.assigned_to_type,
		student_id: validation.data.student_id,
		class_id: validation.data.class_id,
		optional_deadline: validation.data.optional_deadline || null,
		notes: validation.data.notes
	};

	const { data: assignment, error: assignmentError } = await createExerciseAssignment(
		locals.supabase,
		assignmentData,
		user.id
	);

	if (assignmentError) {
		console.error('Failed to create assignment:', assignmentError);
		throw error(400, assignmentError);
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
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

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

	// Validate and parse query params for filters
	const queryValidation = validateAssignmentQuery(url.searchParams);
	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${(e as ZodIssue).path.join('.')}: ${e.message}`)
			.join('; ');
		return json({ error: `Invalid query parameters: ${errorMsg}` }, { status: 400 });
	}

	const filters: TeacherAssignmentFilters = {
		exercise_id: exerciseId
	};

	if (queryValidation.data.type) {
		filters.assigned_to_type = queryValidation.data.type;
	}

	if (queryValidation.data.active !== undefined) {
		filters.is_active = queryValidation.data.active;
	}

	if (queryValidation.data.has_deadline !== undefined) {
		filters.has_deadline = queryValidation.data.has_deadline;
	}

	// Fetch assignments
	const result = await getAssignmentsForExercise(locals.supabase, exerciseId, filters);
	const assignments = result.data;
	const fetchError = 'error' in result ? result.error : null;

	if (fetchError) {
		console.error('Failed to fetch assignments:', fetchError);
		return json({ error: 'Failed to fetch assignments' }, { status: 500 });
	}

	return json(assignments);
};
