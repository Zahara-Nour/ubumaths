/**
 * Student Chapter Detail Page Server
 * ===================================
 *
 * Loads a specific chapter with all its content:
 * - Documents
 * - Quiz questions with student's results
 * - Checklist items with progress
 * - Linked exercises
 *
 * Uses getChapterWithContent for rich data including progress tracking.
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { getChapterWithContent, toggleChecklistItem } from '$lib/server/chapters';
import { buildChapterPlan, type WorksheetPlacement } from '$lib/server/chapter-plan';
import { toggleChecklistSchema } from '$lib/server/validation/chapters';

// `fetch` vient de l'événement, jamais du global : une URL relative ferait
// lever `Failed to parse URL` au `fetch` de Node — hors `try`, donc 500 sur
// TOUT le chapitre, documents compris. Et à supposer qu'elle passe,
// les cookies ne suivraient pas : l'appel arriverait non authentifié.
export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	// Only students can view this page
	const { user } = await requireRole(locals, 'student');

	const { chapterId } = params;

	// Get chapter with full content and progress
	const { data: chapter, error: chapterError } = await getChapterWithContent(
		chapterId,
		user.id,
		locals.supabase
	);

	if (chapterError) {
		console.error('[Student Chapter Detail] Error:', chapterError);
		if (chapterError.message.includes('not found') || chapterError.message.includes('PGRST116')) {
			throw error(404, 'Chapitre non trouvé');
		}
		throw error(500, 'Erreur lors du chargement du chapitre');
	}

	if (!chapter) {
		throw error(404, 'Chapitre non trouvé ou non accessible');
	}

	// Get class info for breadcrumb
	const { data: classInfo, error: classInfoError } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('id', chapter.classId)
		.single();

	// Élément de contexte : le repli d'affichage existe déjà, mais son absence
	// ne doit pas se confondre avec une donnée réellement vide.
	if (classInfoError && classInfoError.code !== 'PGRST116') {
		console.error('Contexte illisible :', classInfoError);
	}

	// Get exercise details for linked exercises
	// `exercises.title` est nullable en base : un exercice sans titre reste
	// listable, il s'affiche sous un libellé de repli.
	const exerciseDetails: Record<string, { id: string; title: string }> = {};

	if (chapter.exercises.length > 0) {
		const exerciseIds = chapter.exercises.map((e) => e.exerciseId);
		const { data: exercises, error: exercisesError } = await locals.supabase
			.from('exercises')
			// `exercises` n'a pas de colonne `description` : le champ n'existe pas dans ce
			// modèle. Les consommateurs le testent avant affichage, donc son absence est sans effet.
			.select('id, title')
			.in('id', exerciseIds);

		if (exercisesError) {
			console.error('Lecture impossible :', exercisesError);
			throw error(500, 'Impossible de charger les données');
		}

		if (exercises) {
			for (const e of exercises) {
				exerciseDetails[e.id] = {
					id: e.id,
					title: e.title ?? 'Exercice sans titre'
				};
			}
		}
	}

	// Les fiches DE CE CHAPITRE, pas toutes celles de la classe.
	//
	// Le filtre `chapter_id` passe par `chapter_worksheets`, dont la policy élève
	// exige `student_has_worksheet_access` : une fiche que le professeur a rangée
	// ici sans encore la distribuer n'apparaît pas. C'est ce qui lui permet de
	// préparer un chapitre avant le cours.
	//
	// Une panne ne doit pas se lire « aucune fiche » : c'est le message qui
	// accuse la base d'être vide alors que la lecture a échoué. On le distingue
	// donc explicitement, et on en laisse une trace.
	const worksheetsResponse = await fetch(
		`/api/student/worksheets?class_id=${chapter.classId}&chapter_id=${chapter.id}`
	);
	const worksheetsUnavailable = !worksheetsResponse.ok;
	if (worksheetsUnavailable) {
		console.error(
			`Fiches du chapitre illisibles (HTTP ${worksheetsResponse.status}) pour le chapitre ${chapter.id}`
		);
	}
	const worksheetsData = worksheetsResponse.ok
		? await worksheetsResponse.json()
		: { worksheets: [] };

	// Le PLAN : les sections du chapitre et, dans chacune, les ressources de
	// tous types. Les deux lectures passent par `locals.supabase`, donc aux
	// droits de l'élève — une section d'un chapitre qui n'est pas le sien, ou
	// une fiche non distribuée, ne remontent pas.
	const [sectionsResult, placementsResult] = await Promise.all([
		locals.supabase
			.from('chapter_sections')
			.select('*')
			.eq('chapter_id', chapter.id)
			.order('display_order'),
		locals.supabase
			.from('chapter_worksheets')
			.select('worksheet_id, section_id, section_order')
			.eq('chapter_id', chapter.id)
	]);

	// Une panne de rangement ne doit pas se lire « chapitre vide » : le plan
	// retombe alors sur « Non classé », qui montre TOUT plutôt que rien.
	if (sectionsResult.error) {
		console.error(`Sections illisibles pour le chapitre ${chapter.id} :`, sectionsResult.error);
	}
	if (placementsResult.error) {
		console.error(`Rangement des fiches illisible pour ${chapter.id} :`, placementsResult.error);
	}

	const worksheetPlacements: Record<string, WorksheetPlacement> = {};
	for (const lien of placementsResult.data ?? []) {
		worksheetPlacements[lien.worksheet_id] = {
			sectionId: lien.section_id,
			sectionOrder: lien.section_order
		};
	}

	const plan = buildChapterPlan({
		sections: (sectionsResult.data ?? []).map((s) => ({
			id: s.id,
			chapterId: s.chapter_id,
			title: s.title,
			displayOrder: s.display_order,
			createdAt: s.created_at,
			updatedAt: s.updated_at
		})),
		documents: chapter.documents,
		exercises: chapter.exercises,
		checklistItems: chapter.checklistItemsWithProgress,
		worksheets: worksheetsData.worksheets || [],
		exerciseTitles: exerciseDetails,
		worksheetPlacements
	});

	return {
		chapter,
		plan,
		className: classInfo?.name || 'Classe',
		exerciseDetails,
		worksheets: worksheetsData.worksheets || [],
		worksheetsUnavailable
	};
};

export const actions: Actions = {
	/**
	 * Toggle checklist item completion
	 */
	toggleChecklist: async ({ request, locals, params: _params }) => {
		const { user } = await requireRole(locals, 'student');

		const formData = await request.formData();
		const checklistItemId = formData.get('checklistItemId');
		const isCompleted = formData.get('isCompleted') === 'true';

		// Validate input
		const validation = toggleChecklistSchema.safeParse({
			checklistItemId,
			isCompleted
		});

		if (!validation.success) {
			return fail(400, {
				error: validation.error.issues[0].message,
				action: 'toggleChecklist'
			});
		}

		// Toggle the item
		const { error: toggleError } = await toggleChecklistItem(
			user.id,
			validation.data.checklistItemId,
			validation.data.isCompleted,
			locals.supabase
		);

		if (toggleError) {
			console.error('[Toggle Checklist] Error:', toggleError);
			return fail(500, {
				error: 'Erreur lors de la mise à jour',
				action: 'toggleChecklist'
			});
		}

		return { success: true, action: 'toggleChecklist' };
	}
};
