/**
 * Public exercise page - load exercise by slug
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExerciseBySlug } from '$lib/server/exercises';
import type { Exercise } from '$lib/exercises/types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { slug } = params;

	// Fetch exercise by slug
	const result = await getExerciseBySlug(locals.supabase, slug);

	if (result.error || !result.data) {
		throw error(404, 'Exercice introuvable');
	}

	const dbExercise = result.data;

	// Check if exercise is public
	if (!dbExercise.is_public) {
		throw error(403, "Cet exercice n'est pas public");
	}

	// Convert DB row to Exercise type (convert null to undefined for optional fields)
	const exercise: Exercise = {
		id: dbExercise.id,
		slug: dbExercise.slug ?? undefined,
		title: dbExercise.title ?? undefined,
		source: dbExercise.source ?? undefined,
		difficulty: dbExercise.difficulty as 1 | 2 | 3,
		tags: (dbExercise.tags as string[]) || [],
		statement_md: dbExercise.statement_md,
		solution_md: dbExercise.solution_md,
		variables: dbExercise.variables as unknown as Exercise['variables'],
		distribution_mode: dbExercise.distribution_mode as Exercise['distribution_mode'],
		is_public: dbExercise.is_public,
		grade_levels: dbExercise.grade_levels ?? undefined,
		topic: dbExercise.topic ?? undefined,
		resources: dbExercise.resources as unknown as Exercise['resources'],
		created_at: dbExercise.created_at,
		updated_at: dbExercise.updated_at,
		created_by: dbExercise.created_by
	};

	return {
		exercise
	};
};
