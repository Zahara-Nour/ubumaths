/**
 * Quiz de chapitre — résolution des questions aux valeurs de l'élève.
 * ===================================================================
 *
 * Le quiz d'un chapitre ne porte pas d'énoncés : `chapter_quiz_questions` ne
 * garde qu'un `question_template_id`. L'énoncé vit dans les `variations` du
 * modèle, avec des variables à tirer au sort. Ce module fait le pont : il
 * charge les modèles, en tire une instance par élève, et — surtout — dit ce
 * qu'il n'a pas pu résoudre.
 *
 * Ce dernier point n'est pas un détail de confort. La version précédente du
 * quiz filtrait en silence les questions sans modèle (`questions.filter(...)`),
 * si bien qu'une requête cassée depuis toujours se présentait comme un quiz
 * vide. Un écran muet accuse la base d'être vide ; ici, on nomme ce qui manque.
 *
 * @module server/chapters-quiz
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { QuestionInstance } from '$lib/questions/types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { toQuestionTemplate, type QuestionTemplateRow } from '$lib/types/question-template';
// Ces types traversent la frontière serveur/client (le composant les reçoit en
// props) : ils vivent donc dans `$lib/types`, d'où un composant peut importer.
import type { QuizUnavailableQuestion } from '$lib/types/chapters';
// La graine est un hachage de deux identifiants, sans rien de propre aux
// exercices : on réutilise la fonction existante plutôt que de recopier un
// hachage de plus dans le dépôt.
import { generateStudentSeed } from '$lib/exercises/generator/instance-generator';

/**
 * Colonnes exigées par `toQuestionTemplate`.
 *
 * Le `satisfies` n'est pas décoratif : la liste part en chaîne de caractères
 * vers PostgREST, donc ni le typecheck ni le lint ne relient la requête au type
 * qu'elle prétend remplir. Sans lui, ajouter un champ à `QuestionTemplateRow`
 * sans l'ajouter ici livrerait un `undefined` silencieux — le mécanisme exact de
 * l'incident `worksheets.tags` du 2026-09-09. Ici, le typecheck échoue.
 */
const TEMPLATE_FIELDS = [
	'id',
	'title',
	'description',
	'theme',
	'domain',
	'subdomain',
	'level',
	'status',
	'grades',
	'delay',
	'variations',
	'shared',
	'options',
	'default_display_options',
	'test_specs',
	'multiple_answers',
	'exercise_instruction',
	'created_at',
	'updated_at',
	'created_by'
] as const satisfies readonly (keyof QuestionTemplateRow)[];

const TEMPLATE_COLUMNS = TEMPLATE_FIELDS.join(', ');

export interface QuizInstances {
	/** Instance résolue, indexée par l'id de la question de quiz — pas du modèle. */
	instances: Record<string, QuestionInstance>;
	/** Ce qui a été écarté, et pourquoi. Jamais silencieux. */
	unavailable: QuizUnavailableQuestion[];
}

/** Le strict nécessaire pour résoudre une question : son id, et le modèle visé. */
export interface QuizQuestionRef {
	id: string;
	questionTemplateId: string;
}

/**
 * Résout les questions d'un quiz aux valeurs d'un élève donné.
 *
 * La graine dérive de (question, élève) : deux élèves voient des valeurs
 * différentes, et le même élève qui revient revoit les siennes. C'est ce qui
 * empêche de recharger la page jusqu'à tomber sur une version plus facile.
 *
 * @param quizQuestions - Questions du quiz, dans l'ordre d'affichage
 * @param studentId - L'élève pour qui résoudre
 * @param supabase - Client Supabase **aux droits de l'élève** : la RLS ne rend
 *   que les modèles publiés, et c'est précisément le filtre qu'on veut
 * @returns Les instances résolues, et la liste de ce qui manque
 */
export async function buildQuizInstances(
	quizQuestions: QuizQuestionRef[],
	studentId: string,
	supabase: SupabaseClient<Database>
): Promise<{ data: QuizInstances | null; error: Error | null }> {
	if (quizQuestions.length === 0) {
		return { data: { instances: {}, unavailable: [] }, error: null };
	}

	const templateIds = [...new Set(quizQuestions.map((q) => q.questionTemplateId))];

	const { data: rows, error: readError } = await supabase
		.from('question_templates')
		.select(TEMPLATE_COLUMNS)
		.in('id', templateIds);

	// Une panne de lecture n'est pas un quiz vide. Sans ce garde, l'élève
	// s'entendrait dire « aucune question » pendant que la base est en rade.
	if (readError) {
		console.error('[buildQuizInstances] Modèles illisibles :', readError);
		return { data: null, error: new Error(readError.message) };
	}

	const byId = new Map<string, QuestionTemplateRow>(
		((rows ?? []) as unknown as QuestionTemplateRow[]).map((row) => [row.id, row])
	);

	const instances: Record<string, QuestionInstance> = {};
	const unavailable: QuizUnavailableQuestion[] = [];

	for (const question of quizQuestions) {
		const row = byId.get(question.questionTemplateId);

		// Absent de la réponse ≠ absent de la base : un modèle en brouillon est
		// invisible à l'élève (policy « Students can view published templates »),
		// et un modèle supprimé l'est aussi. Dans les deux cas la question n'est
		// pas jouable, et l'élève doit pouvoir le savoir.
		if (!row) {
			unavailable.push({ quizQuestionId: question.id, reason: 'modele_indisponible' });
			continue;
		}

		const result = generateInstance(
			toQuestionTemplate(row),
			generateStudentSeed(question.id, studentId)
		);

		// Un modèle bancal ne doit pas emporter tout le quiz : les autres
		// questions restent jouables.
		if (!result.success || !result.instance) {
			console.error(
				`[buildQuizInstances] Génération impossible pour le modèle ${row.id} :`,
				result.success ? 'aucune instance' : result.errors
			);
			unavailable.push({ quizQuestionId: question.id, reason: 'generation_impossible' });
			continue;
		}

		instances[question.id] = result.instance;
	}

	return { data: { instances, unavailable }, error: null };
}
