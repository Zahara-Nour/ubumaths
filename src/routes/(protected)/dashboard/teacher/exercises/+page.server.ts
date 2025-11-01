import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { getTeacherExercises, deleteExercise } from '$lib/server/exercises';
import { loadMonitor } from '$lib/utils/loadTracer';

/**
 * Load teacher's exercises with optional filters
 */
export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { locals } = event;
	const { url } = event;

	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Parse query parameters for filters
	const difficulty = url.searchParams.get('difficulty');
	const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);
	const topic = url.searchParams.get('topic');
	const grade_levels = url.searchParams.get('grade_levels')?.split(',').filter(Boolean);
	const search = url.searchParams.get('search') || '';
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '50');

	// Build filters
	const filters: {
		difficulty?: 1 | 2 | 3;
		tags?: string[];
		topic?: string;
		grade_levels?: string[];
		search?: string;
	} = {};

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
	const result = await getTeacherExercises(locals.supabase, user.id, filters, {
		page,
		limit
	});

	if (result.error) {
		console.error('Error fetching exercises:', result.error);
		throw error(500, 'Erreur lors du chargement des exercices');
	}

	return {
		exercises: result.data || [],
		pagination: {
			page: result.page,
			limit: result.limit,
			total: result.count,
			totalPages: result.totalPages
		},
		filters: {
			difficulty: difficulty ? parseInt(difficulty) : null,
			tags: tags || [],
			topic: topic || '',
			grade_levels: grade_levels || [],
			search
		}
	};
});

/**
 * Actions for exercise management
 */
export const actions: Actions = {
	/**
	 * Delete an exercise
	 */
	delete: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { message: 'Non authentifié' });
		}

		const formData = await request.formData();
		const exerciseId = formData.get('exercise_id')?.toString();

		if (!exerciseId) {
			return fail(400, { message: "ID de l'exercice manquant" });
		}

		// Delete exercise
		const result = await deleteExercise(locals.supabase, exerciseId, user.id);

		if (result.error) {
			console.error('Error deleting exercise:', result.error);
			return fail(500, { message: "Erreur lors de la suppression de l'exercice" });
		}

		return { success: true, message: 'Exercice supprimé avec succès' };
	}
};
