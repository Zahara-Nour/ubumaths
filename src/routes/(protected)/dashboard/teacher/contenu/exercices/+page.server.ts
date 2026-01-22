import type { PageServerLoad, Actions } from './$types';
import type { GradeCode } from '$lib/types/grades';
import type { ExerciseCategory } from '$lib/exercises/types';
import { error, redirect, fail } from '@sveltejs/kit';
import { getTeacherExercises, deleteExercise } from '$lib/server/exercises';

/**
 * Load teacher's exercises with optional filters
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Parse query parameters for filters
	const category = url.searchParams.get('category');
	const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);
	const topic = url.searchParams.get('topic');
	const grades = url.searchParams.get('grades')?.split(',').filter(Boolean);
	const search = url.searchParams.get('search') || '';
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const sortByParam = url.searchParams.get('sortBy');
	const sortBy: 'title' | 'updated_at' = sortByParam === 'title' ? 'title' : 'updated_at';
	const sortOrder: 'asc' | 'desc' = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';

	const validCategories = [
		'automatisme',
		'application',
		'adaptation',
		'recherche',
		'tache_complexe',
		'situation_probleme',
		'challenge',
		'mission',
		'synthese'
	];

	// Build filters
	const filters: {
		category?: ExerciseCategory;
		tags?: string[];
		topic?: string;
		grades?: GradeCode[];
		search?: string;
	} = {};

	if (category && validCategories.includes(category)) {
		filters.category = category as ExerciseCategory;
	}

	if (tags && tags.length > 0) {
		filters.tags = tags;
	}

	if (topic) {
		filters.topic = topic;
	}

	if (grades && grades.length > 0) {
		filters.grades = grades as GradeCode[];
	}

	if (search) {
		filters.search = search;
	}

	// Fetch exercises
	const result = await getTeacherExercises(locals.supabase, user.id, filters, {
		page,
		limit,
		sortBy,
		sortOrder
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
			category: category || null,
			tags: tags || [],
			topic: topic || '',
			grades: grades || [],
			search
		},
		sortBy,
		sortOrder
	};
};

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
