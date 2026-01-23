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
import { requireRole } from '$lib/server/middleware/auth';

type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

/**
 * GET /api/exercises
 * Get exercises with optional filters and pagination
 * Teachers only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	await requireRole(locals, 'teacher');

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

	const { page, limit, category, tags, topic, grades, search } = queryValidation.data;

	// Build filters
	const filters: ExerciseFilters = {};

	if (category !== undefined) {
		filters.category = category;
	}

	if (tags) {
		filters.tags = tags.split(',').filter(Boolean);
	}

	if (topic) {
		filters.topic = topic;
	}

	if (grades) {
		filters.grades = grades; // Already validated as GradeCode[] by schema
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
	const { user } = await requireRole(locals, 'teacher');

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
