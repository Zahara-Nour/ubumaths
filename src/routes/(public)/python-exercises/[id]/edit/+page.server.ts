import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PythonExercise } from '$lib/types/python-exercises';

/**
 * Load the exercise for the edit page. Author-only.
 *
 * The API returns the full exercise (including solution_code) only to the
 * author; for any non-author the response is stripped. We detect that case
 * by the absence of `solution_code` and refuse with 403.
 *
 * Anonymous visitors are redirected to login.
 */
export const load: PageServerLoad = async ({ params, fetch, locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/auth/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	const res = await fetch(`/api/python-exercises/${params.id}`);

	if (res.status === 404) {
		throw error(404, 'Exercice introuvable');
	}
	if (!res.ok) {
		throw error(res.status, "Erreur lors du chargement de l'exercice");
	}

	const { exercise } = (await res.json()) as { exercise: PythonExercise };

	// Stripped solution_code → caller is not the author.
	if (!('solution_code' in exercise) || exercise.solution_code === undefined) {
		throw error(403, 'Vous ne pouvez modifier que vos propres exercices');
	}

	return { exercise };
};
