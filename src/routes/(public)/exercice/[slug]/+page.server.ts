/**
 * Public exercise page - load exercise by slug
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExerciseBySlug } from '$lib/server/exercises';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { slug } = params;

	// Fetch exercise by slug
	const result = await getExerciseBySlug(locals.supabase, slug);

	if (result.error || !result.data) {
		throw error(404, 'Exercice introuvable');
	}

	const exercise = result.data;

	// Check if exercise is public
	if (!exercise.is_public) {
		throw error(403, "Cet exercice n'est pas public");
	}

	return {
		exercise
	};
};
