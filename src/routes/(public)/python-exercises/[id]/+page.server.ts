import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PythonExerciseStudentView } from '$lib/types/python-exercises';

/**
 * Load the exercise for the consultation page.
 *
 * Routes through the API endpoint so RLS + solution_code stripping happens in
 * exactly one place. The endpoint returns:
 *   - 404 when the exercise doesn't exist OR is not visible to the caller
 *     (RLS-filtered for anon on a non-public exo, etc.)
 *   - 200 with exercise (without solution_code unless caller is the author)
 */
export const load: PageServerLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/python-exercises/${params.id}`);

	if (res.status === 404) {
		throw error(404, 'Exercice introuvable');
	}
	if (!res.ok) {
		throw error(res.status, "Erreur lors du chargement de l'exercice");
	}

	const { exercise } = (await res.json()) as { exercise: PythonExerciseStudentView };
	return { exercise };
};
