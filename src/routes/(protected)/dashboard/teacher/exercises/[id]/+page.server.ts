import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getExercise } from '$lib/server/exercises';

/**
 * Load exercise for editing and view assignments
 */
export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
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
	if (result.data.created_by !== user.id) {
		throw error(403, "Vous n'êtes pas autorisé à modifier cet exercice");
	}

	// Fetch assignments count via API
	const assignmentsResponse = await fetch(`/api/exercises/${id}/assign`);
	let assignmentCount = 0;
	if (assignmentsResponse.ok) {
		const assignments = await assignmentsResponse.json();
		assignmentCount = assignments.length;
	}

	return {
		exercise: result.data,
		assignmentCount
	};
};
