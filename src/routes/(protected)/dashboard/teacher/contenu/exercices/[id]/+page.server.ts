import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getExercise } from '$lib/server/exercises';
import { getProgrammeTreeKeeping } from '$lib/server/programme-tree';
import type { ProgrammeBranch } from '$lib/utils/programme-tree';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/contenu/exercices/[id]/+page.server'
);

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
		logger.error('Error fetching exercise:', result.error);
		throw error(404, 'Exercice non trouvé');
	}

	// Check ownership
	if (result.data.created_by !== user.id) {
		throw error(403, 'Modification de cet exercice non autorisée');
	}

	// Fetch assignments count via API
	const assignmentsResponse = await fetch(`/api/exercises/${id}/assign`);
	let assignmentCount = 0;
	if (assignmentsResponse.ok) {
		const assignments = await assignmentsResponse.json();
		assignmentCount = assignments.length;
	}

	const { data: tagRows, error: tagRowsError } = await locals.supabase
		.from('exercise_curriculum_points')
		.select('point_id')
		.eq('exercise_id', id);

	if (tagRowsError) {
		logger.error('Lecture impossible :', tagRowsError);
		throw error(500, 'Impossible de charger les données');
	}
	const taggedPointIds = (tagRows ?? []).map((r) => r.point_id);

	// Arbre du programme de chaque niveau de l'exercice ; un archivé déjà tagué
	// reste visible pour pouvoir le retirer.
	const grades = (result.data.grades ?? []) as string[];
	const curriculumByGrade: { grade: string; tree: ProgrammeBranch[] }[] = [];
	for (const g of grades) {
		const tree = await getProgrammeTreeKeeping(locals.supabase, g, taggedPointIds);
		if (tree.length > 0) curriculumByGrade.push({ grade: g, tree });
	}

	return {
		exercise: result.data,
		assignmentCount,
		curriculumByGrade,
		taggedPointIds
	};
};
