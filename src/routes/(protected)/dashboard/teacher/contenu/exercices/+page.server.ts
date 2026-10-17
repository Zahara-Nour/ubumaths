import type { PageServerLoad, Actions } from './$types';
import type { GradeCode } from '$lib/types/grades';
import type { ExerciseCategory } from '$lib/exercises/types';
import { error, redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { getTeacherExercises, deleteExercise, EXERCISE_NOT_DELETED } from '$lib/server/exercises';
import { requireRoles } from '$lib/server/middleware/auth';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(protected)/dashboard/teacher/contenu/exercices/+page.server');

/** Identifiant d'exercice reçu par l'action « delete ». */
const exerciseIdSchema = z.string().uuid();

/**
 * Load teacher's exercises with optional filters
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
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
		logger.error('Error fetching exercises:', result.error);
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
		const { user } = await requireRoles(locals, ['teacher', 'admin']);

		const formData = await request.formData();
		const parsed = exerciseIdSchema.safeParse(formData.get('exercise_id'));

		if (!parsed.success) {
			return fail(400, { message: "ID de l'exercice manquant ou invalide" });
		}
		const exerciseId = parsed.data;

		// Delete exercise
		const result = await deleteExercise(locals.supabase, exerciseId, user.id);

		if (result.error) {
			logger.error('Error deleting exercise:', result.error);
			if (result.error.message === 'Exercise not found') {
				return fail(404, { message: 'Exercice introuvable' });
			}
			if (result.error.message === 'Unauthorized') {
				return fail(403, { message: "Seul l'auteur de l'exercice peut le supprimer" });
			}
			// La base n'a supprimé aucune ligne (refus RLS silencieux) : jamais un succès.
			if (result.error.message === EXERCISE_NOT_DELETED) {
				return fail(403, { message: "La suppression de l'exercice a été refusée" });
			}
			return fail(500, { message: "Erreur lors de la suppression de l'exercice" });
		}

		return { success: true, message: 'Exercice supprimé avec succès' };
	}
};
