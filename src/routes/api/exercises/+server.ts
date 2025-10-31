/**
 * API Route: /api/exercises
 * GET - List exercises with filters and pagination
 * POST - Create new exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExercises, createExercise, type ExerciseFilters } from '$lib/server/exercises';
import type { Database } from '$lib/types/database';
import {
	validateListExercisesQuery,
	validateCreateExercise,
	exerciseListResponseSchema,
	createExerciseResponseSchema
} from '$lib/server/validation';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

/**
 * GET /api/exercises
 * Get exercises with optional filters and pagination
 * Teachers only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Only teachers can access exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Validate and parse query parameters
	const queryValidation = validateListExercisesQuery(url.searchParams);
	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map(
				(e: unknown) =>
					`${(e as { path: string[]; message: string }).path.join('.')}: ${(e as { path: string[]; message: string }).message}`
			)
			.join('; ');
		throw error(400, `Invalid query parameters: ${errorMsg}`);
	}

	const { page, limit, difficulty, tags, topic, grade_levels, search } = queryValidation.data;

	// Build filters
	const filters: ExerciseFilters = {};

	if (difficulty !== undefined) {
		filters.difficulty = difficulty as 1 | 2 | 3;
	}

	if (tags) {
		filters.tags = tags.split(',').filter(Boolean);
	}

	if (topic) {
		filters.topic = topic;
	}

	if (grade_levels) {
		filters.grade_levels = grade_levels.split(',').filter(Boolean);
	}

	if (search) {
		filters.search = search;
	}

	// Fetch exercises
	const result = await getExercises(locals.supabase, filters, { page, limit });

	if (result.error) {
		console.error('Failed to fetch exercises:', result.error);
		throw error(500, 'Failed to fetch exercises');
	}

	// Validate response
	const validated = validateJsonResponse(
		exerciseListResponseSchema,
		{
			exercises: result.data,
			pagination: {
				page: result.page,
				limit: result.limit,
				total: result.count,
				totalPages: result.totalPages
			}
		},
		'GET /api/exercises'
	);

	return json(validated);
};

/**
 * POST /api/exercises
 * Create a new exercise
 * Teachers only
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Only teachers can create exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = validateCreateExercise(body);

	if (!validation.success) {
		const errorMsg = validation.error.issues
			.map(
				(e: unknown) =>
					`${(e as { path: string[]; message: string }).path.join('.')}: ${(e as { path: string[]; message: string }).message}`
			)
			.join('; ');
		throw error(400, `Validation failed: ${errorMsg}`);
	}

	const data = validation.data as Omit<ExerciseInsert, 'created_by'>;

	// Create exercise
	const result = await createExercise(locals.supabase, data, user.id);

	if (result.error) {
		console.error('Failed to create exercise:', result.error);
		throw error(500, 'Failed to create exercise');
	}

	// Validate response
	const validated = validateJsonResponse(
		createExerciseResponseSchema,
		{ exercise: result.data },
		'POST /api/exercises'
	);

	return json(validated, { status: 201 });
};
