/**
 * Questions de cours (Q110 b) — lecture et écriture du marqueur dans l'éditeur
 * ============================================================================
 *
 * Le marqueur d'intention est `options.courseQuestion === true` (cf.
 * `isCourseQuestion` dans `types.ts`). Une carte de cours est toujours une
 * question de cours : l'éditeur force alors le marqueur.
 */

import type { QuestionTemplate, QuestionType } from './types';

// Types
type TemplateOptions = NonNullable<QuestionTemplate['options']>;

// Functions

/** Lecture : la case « Question de cours » est-elle cochée pour ces options ? */
export function readCourseQuestionOption(options: QuestionTemplate['options']): boolean {
	return options?.courseQuestion === true;
}

/**
 * Écriture : pose `courseQuestion: true` sur les options en construction si la
 * case est cochée, ou si le modèle est une carte de cours (forcé). Sinon, aucune
 * clé : une option absente ne pollue pas la colonne jsonb.
 */
export function applyCourseQuestionOption(
	options: TemplateOptions,
	state: { checked: boolean; questionType: QuestionType }
): void {
	if (state.checked || state.questionType === 'course_card') options.courseQuestion = true;
}

/**
 * Filtre PostgREST (`.or(...)`) des questions de cours : carte de cours OU marqueur
 * `options.courseQuestion`. Vérifié contre la vraie base (question-de-cours-filtre.test.ts).
 */
export const COURSE_QUESTION_FILTER = 'type.eq.course_card,options->>courseQuestion.eq.true';
