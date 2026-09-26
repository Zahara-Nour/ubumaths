/**
 * Template → ligne `question_templates` (import de la relecture)
 * ==============================================================
 *
 * Calqué sur l'insertion de `POST /api/questions/templates` (camelCase →
 * snake_case), avec deux différences voulues :
 * - `status` est TOUJOURS `draft` : David publie lui-même ;
 * - `level` est celui du template (pas d'ajustement d'unicité, qui ne vaut
 *   que pour les templates publiés).
 */

import type { QuestionTemplate } from '$lib/questions/types';
import { getQuestionType } from '$lib/questions/types';
import type { TablesInsert } from '$lib/types/database';
import { toJson } from '$lib/types/database-helpers';

export function toTemplateInsertRow(
	template: Omit<QuestionTemplate, 'id'>,
	createdBy: string
): TablesInsert<'question_templates'> {
	return {
		type: getQuestionType({
			choices: template.variations?.[0]?.choices,
			shared: template.shared
		}),
		title: template.title,
		description: template.description || null,
		shared: toJson(template.shared ?? null),
		default_display_options: toJson(template.defaultDisplayOptions ?? null),
		variations: toJson(template.variations ?? []),
		exercise_instruction: template.exerciseInstruction || null,
		options: toJson(template.options ?? null),
		grades: template.grades,
		theme: template.theme,
		domain: template.domain,
		subdomain: template.subdomain || null,
		level: template.level,
		// Jamais publié par l'import, quoi que dise le brouillon (cas de #28)
		status: 'draft',
		delay: template.delay || null,
		multiple_answers: template.multipleAnswers ?? null,
		test_specs: toJson(template.testSpecs ?? null),
		created_by: createdBy
	};
}
