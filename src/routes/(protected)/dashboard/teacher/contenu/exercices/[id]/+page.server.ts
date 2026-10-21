import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getExercise } from '$lib/server/exercises';
import { getProgrammeTreeKeeping, loadNodesWithAncestors } from '$lib/server/programme-tree';
import { filterTreePoints, taggableNodeIds, type ProgrammeBranch } from '$lib/utils/programme-tree';
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

	// Rangement de l'exercice : la base n'accepte que les points posés sur l'un
	// de ses nœuds ou sur leur notion (règle 1) ; non rangé, il n'en reçoit aucun.
	const { data: placementRows, error: placementError } = await locals.supabase
		.from('exercise_classifications')
		.select('node_id')
		.eq('exercise_id', id);

	if (placementError) {
		logger.error('Lecture impossible :', placementError);
		throw error(500, 'Impossible de charger les données');
	}
	const placementIds = (placementRows ?? []).map((r) => r.node_id);
	const exerciseUnranked = placementIds.length === 0;

	// Arbre du programme de chaque niveau de l'exercice, réduit aux points qu'il
	// peut prendre ; un archivé déjà tagué reste visible pour pouvoir le retirer.
	const grades = (result.data.grades ?? []) as string[];
	const curriculumByGrade: { grade: string; tree: ProgrammeBranch[] }[] = [];
	if (!exerciseUnranked) {
		const nodes = await loadNodesWithAncestors(locals.supabase, placementIds);
		const allowed = taggableNodeIds(nodes.filter((n) => placementIds.includes(n.id)));
		const tagged = new Set(taggedPointIds);
		for (const g of grades) {
			const full = await getProgrammeTreeKeeping(locals.supabase, g, taggedPointIds);
			const tree = filterTreePoints(full, (p) => allowed.has(p.node_id) || tagged.has(p.id));
			if (tree.length > 0) curriculumByGrade.push({ grade: g, tree });
		}
	}

	return {
		exercise: result.data,
		assignmentCount,
		curriculumByGrade,
		exerciseUnranked,
		taggedPointIds
	};
};
