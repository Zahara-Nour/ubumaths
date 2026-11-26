import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getExercise } from '#lib/server/exercises.ts';
import {
	fetchVersion,
	listVersionsWithUsage,
	withVersionContent,
	worksheetVersionIdOf
} from '#lib/server/exercise-versions.ts';
import { pickEditedVersion, requestedVersionNumber } from '#lib/exercises/edited-version.ts';
import { WORKSHEET_RETURN_PARAM } from '#lib/worksheets/exercise-edit-link.ts';
import { z } from 'zod';
import { getProgrammeTreeKeeping, loadNodesWithAncestors } from '#lib/server/programme-tree.ts';
import {
	filterTreePoints,
	taggableNodeIds,
	type ProgrammeBranch
} from '#lib/utils/programme-tree.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/contenu/exercices/[id]/+page.server'
);

/**
 * Niveaux dont on montre les points : ceux de l'exercice, puis ceux de ses
 * points déjà tagués (un niveau retiré de l'exercice garde ses tags, qu'il
 * faut pouvoir retirer).
 */
async function gradesToShow(
	supabase: App.Locals['supabase'],
	exerciseGrades: string[],
	taggedPointIds: string[]
): Promise<string[]> {
	if (taggedPointIds.length === 0) return exerciseGrades;
	const { data, error: pointsError } = await supabase
		.from('curriculum_points')
		.select('id, grade')
		.in('id', taggedPointIds);
	if (pointsError) {
		logger.error('Lecture impossible :', pointsError);
		throw error(500, 'Impossible de charger les données');
	}
	const extra = (data ?? [])
		.map((p) => p.grade)
		.filter((g): g is string => g !== null && !exerciseGrades.includes(g));
	return [...exerciseGrades, ...[...new Set(extra)].sort()];
}

const worksheetIdSchema = z.string().uuid();

/** Les versions de l'exercice et celle que la page ouvre, avec son contenu. */
async function loadEditedVersion<E extends { id: string }>(
	supabase: App.Locals['supabase'],
	exercise: E,
	searchParams: URLSearchParams
) {
	try {
		const versions = await listVersionsWithUsage(supabase, exercise.id);
		const worksheet = worksheetIdSchema.safeParse(searchParams.get(WORKSHEET_RETURN_PARAM));
		const worksheetVersionId = worksheet.success
			? await worksheetVersionIdOf(supabase, worksheet.data, exercise.id)
			: null;
		const edited = pickEditedVersion(versions, {
			number: requestedVersionNumber(searchParams),
			worksheetVersionId
		});
		if (!edited) throw new Error(`Exercice ${exercise.id} sans version`);
		const content = await fetchVersion(supabase, exercise.id, edited.id);
		if (!content) throw new Error(`Version ${edited.id} illisible`);
		return { versions, edited, exercise: withVersionContent(exercise, content) };
	} catch (e) {
		logger.error('Versions illisibles :', e);
		throw error(500, 'Impossible de charger les versions');
	}
}

/**
 * Load exercise for editing and view assignments
 */
export const load: PageServerLoad = async ({ locals, params, fetch, url }) => {
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

	// Version ouverte (ADR 0044) : `?version=`, sinon celle de la fiche d'où l'on vient, sinon la
	// plus récente. Son contenu remplace celui de la plus récente, lu par `getExercise`.
	const { versions, edited, exercise } = await loadEditedVersion(
		locals.supabase,
		result.data,
		url.searchParams
	);

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
	const curriculumByGrade: { grade: string; tree: ProgrammeBranch[] }[] = [];
	if (!exerciseUnranked) {
		const grades = await gradesToShow(
			locals.supabase,
			(result.data.grades ?? []) as string[],
			taggedPointIds
		);
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
		exercise,
		versions,
		editedVersionId: edited.id,
		assignmentCount,
		curriculumByGrade,
		exerciseUnranked,
		taggedPointIds
	};
};
