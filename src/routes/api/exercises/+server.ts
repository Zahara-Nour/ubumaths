/**
 * API Route: /api/exercises
 * GET - List exercises with filters and pagination
 * POST - Create new exercise
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExercises, createExercise, type ExerciseFilters } from '$lib/server/exercises';
import type { Database } from '$lib/types/database';

type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

/**
 * GET /api/exercises
 * Get exercises with optional filters and pagination
 * Teachers only
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Only teachers can access exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Parse query parameters
	const difficulty = url.searchParams.get('difficulty');
	const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);
	const topic = url.searchParams.get('topic');
	const grade_levels = url.searchParams.get('grade_levels')?.split(',').filter(Boolean);
	const search = url.searchParams.get('search');
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '50');

	// Build filters
	const filters: ExerciseFilters = {};

	if (difficulty && ['1', '2', '3'].includes(difficulty)) {
		filters.difficulty = parseInt(difficulty) as 1 | 2 | 3;
	}

	if (tags && tags.length > 0) {
		filters.tags = tags;
	}

	if (topic) {
		filters.topic = topic;
	}

	if (grade_levels && grade_levels.length > 0) {
		filters.grade_levels = grade_levels;
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

	return json({
		exercises: result.data,
		pagination: {
			page: result.page,
			limit: result.limit,
			total: result.count,
			totalPages: result.totalPages
		}
	});
};

/**
 * POST /api/exercises
 * Create a new exercise
 * Teachers only
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const session = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const { user } = session;

	// Only teachers can create exercises
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// Parse request body
	const data: Omit<ExerciseInsert, 'created_by'> = await request.json();

	// Validate required fields
	if (!data.statement_md || !data.solution_md || data.difficulty === undefined) {
		throw error(400, 'Missing required fields: statement_md, solution_md, difficulty');
	}

	// Validate difficulty
	if (![1, 2, 3].includes(data.difficulty)) {
		throw error(400, 'Invalid difficulty: must be 1 (easy), 2 (medium), or 3 (hard)');
	}

	// Create exercise
	const result = await createExercise(locals.supabase, data, user.id);

	if (result.error) {
		console.error('Failed to create exercise:', result.error);
		throw error(500, 'Failed to create exercise');
	}

	return json({ exercise: result.data }, { status: 201 });
};
