import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTeacherExercises } from '$lib/server/exercises';

/**
 * GET /api/teacher/exercises
 *
 * Returns exercises for the authenticated teacher with filters and sorting
 *
 * Query params:
 * - search: string (full-text search)
 * - difficulty: 1 | 2 | 3
 * - tags: string (comma-separated)
 * - grades: string (comma-separated)
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - sort: 'title' | 'updated_at' (default: 'updated_at')
 * - order: 'asc' | 'desc' (default: 'desc')
 *
 * Security: Teacher role required
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user, profile, supabase } = locals;

	// Security: Only teachers can access
	if (!user || !profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden: Teacher role required');
	}

	try {
		// Parse query parameters
		const difficulty = url.searchParams.get('difficulty');
		const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);
		const grades = url.searchParams.get('grades')?.split(',').filter(Boolean);
		const search = url.searchParams.get('search') || '';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');

		// Sort parameters
		const sortParam = url.searchParams.get('sort');
		const sortBy: 'title' | 'updated_at' = sortParam === 'title' ? 'title' : 'updated_at';
		const sortOrder: 'asc' | 'desc' = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';

		// Build filters
		const filters: {
			difficulty?: 1 | 2 | 3;
			tags?: string[];
			grades?: string[];
			search?: string;
		} = {};

		if (difficulty && ['1', '2', '3'].includes(difficulty)) {
			filters.difficulty = parseInt(difficulty) as 1 | 2 | 3;
		}

		if (tags && tags.length > 0) {
			filters.tags = tags;
		}

		if (grades && grades.length > 0) {
			filters.grades = grades;
		}

		if (search) {
			filters.search = search;
		}

		// Fetch exercises
		const result = await getTeacherExercises(supabase, user.id, filters, {
			page,
			limit,
			sortBy,
			sortOrder
		});

		if (result.error) {
			console.error('[API] Error fetching teacher exercises:', result.error);
			throw error(500, 'Failed to load exercises');
		}

		return json({
			exercises: result.data || [],
			pagination: {
				page: result.page,
				limit: result.limit,
				total: result.count,
				totalPages: result.totalPages
			},
			sortBy,
			sortOrder
		});
	} catch (err) {
		console.error('[API] Error in teacher exercises endpoint:', err);
		throw error(500, 'Failed to load exercises');
	}
};
