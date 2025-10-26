import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getExercise } from '$lib/server/exercises';

/**
 * Load exercise for editing
 */
export const load: PageServerLoad = async ({ locals, params }) => {
	const { session } = await locals.safeGetSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	const { id } = params;

	// Fetch exercise
	const result = await getExercise(locals.supabase, id);

	if (result.error || !result.data) {
		console.error('Error fetching exercise:', result.error);
		throw error(404, 'Exercice non trouvé');
	}

	// Check ownership
	if (result.data.created_by !== session.user.id) {
		throw error(403, "Vous n'êtes pas autorisé à modifier cet exercice");
	}

	return {
		exercise: result.data
	};
};
