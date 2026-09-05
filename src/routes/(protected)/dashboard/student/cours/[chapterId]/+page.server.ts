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
import { toggleChecklistSchema } from '$lib/server/validation/chapters';

export const load: PageServerLoad = async ({ locals, params }) => {
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
	const { data: classInfo } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('id', chapter.classId)
		.single();

	// Quiz d'un chapitre : hors service, et depuis toujours.
	//
	// Le code interrogeait `question_templates.question`, `.answer` et
	// `.explanation`. Aucune de ces colonnes n'existe : un modèle de question
	// porte `title`, `description` et surtout `variations`, où vit réellement
	// l'énoncé. La requête échouait donc à chaque affichage, la table restait
	// vide, et `ChapterQuiz` filtre justement les questions sans modèle
	// (`questions.filter((q) => questionTemplates[...])`) : le quiz n'a jamais
	// rien montré, sans erreur visible.
	//
	// On retire la requête morte plutôt que d'improviser : rebrancher le quiz
	// suppose de décider comment une `variation` devient une question
	// vrai/faux, ce qui relève d'un choix produit, pas d'une réparation.
	// Comportement inchangé — la table était déjà vide en pratique.
	const questionTemplates: Record<
		string,
		{ id: string; question: string; answer: boolean; explanation: string | null }
	> = {};

	// Get exercise details for linked exercises
	const exerciseDetails: Record<string, { id: string; title: string }> = {};

	if (chapter.exercises.length > 0) {
		const exerciseIds = chapter.exercises.map((e) => e.exerciseId);
		const { data: exercises } = await locals.supabase
			.from('exercises')
			// `exercises` n'a pas de colonne `description` : le champ n'existe pas dans ce
			// modèle. Les consommateurs le testent avant affichage, donc son absence est sans effet.
			.select('id, title')
			.in('id', exerciseIds);

		if (exercises) {
			for (const e of exercises) {
				exerciseDetails[e.id] = {
					id: e.id,
					title: e.title
				};
			}
		}
	}

	// Fetch worksheets for this class
	const worksheetsResponse = await fetch(`/api/student/worksheets?class_id=${chapter.classId}`);
	const worksheetsData = worksheetsResponse.ok
		? await worksheetsResponse.json()
		: { worksheets: [] };

	return {
		chapter,
		className: classInfo?.name || 'Classe',
		questionTemplates,
		exerciseDetails,
		worksheets: worksheetsData.worksheets || []
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
	},

	/**
	 * Submit quiz answer
	 */
	submitQuiz: async ({ request, locals }) => {
		// L'authentification reste exigée : l'action est publique dans le contrat
		// du formulaire, et un refus doit être réservé aux élèves connectés.
		await requireRole(locals, 'student');

		const formData = await request.formData();
		const chapterQuizQuestionId = formData.get('quizQuestionId') as string;

		// Get the correct answer to check
		const { data: quizQuestion } = await locals.supabase
			.from('chapter_quiz_questions')
			.select('question_template_id')
			.eq('id', chapterQuizQuestionId)
			.single();

		if (!quizQuestion) {
			return fail(404, {
				error: 'Question non trouvée',
				action: 'submitQuiz'
			});
		}

		// `question_templates.answer` n'existe pas : la réponse attendue vit dans
		// `variations`. La requête échouait donc, `template` valait `null`, et
		// l'action renvoyait déjà ce 404. Elle est de toute façon inatteignable —
		// le quiz n'a jamais pu afficher la moindre question.
		//
		// Tout ce qui suivait (validation Zod, `submitQuizAnswer`, intégration SRS)
		// dépendait d'un `isCorrect` calculé sur une colonne fantôme : on ne peut
		// pas corriger une réponse tant que le contrat « une variation → une
		// question vrai/faux » n'est pas tranché. C'est un choix produit, pas une
		// réparation. Le refus explicite remplace un calcul faux.
		return fail(404, {
			error: 'Quiz de chapitre indisponible',
			action: 'submitQuiz'
		});
	}
};
