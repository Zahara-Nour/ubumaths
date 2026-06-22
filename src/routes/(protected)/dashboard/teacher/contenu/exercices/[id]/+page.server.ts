import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getExercise } from '$lib/server/exercises';
import { getCurriculumTree, type CurriculumTreeTheme } from '$lib/server/curriculum';

/**
 * Load exercise for editing and view assignments
 */
export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
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

	// Curriculum trees for the exercise's grades + its existing tags (for tagging UI)
	const grades = (result.data.grades ?? []) as string[];
	const curriculumByGrade: { grade: string; tree: CurriculumTreeTheme[] }[] = [];
	for (const g of grades) {
		const tree = await getCurriculumTree(locals.supabase, g);
		if (tree.length > 0) curriculumByGrade.push({ grade: g, tree });
	}

	const { data: tagRows } = await locals.supabase
		.from('exercise_curriculum_points')
		.select('point_id')
		.eq('exercise_id', id);
	const taggedPointIds = (tagRows ?? []).map((r) => r.point_id);

	return {
		exercise: result.data,
		assignmentCount,
		curriculumByGrade,
		taggedPointIds
	};
};
