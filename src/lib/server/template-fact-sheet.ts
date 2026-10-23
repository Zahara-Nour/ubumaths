/**
 * Fiche du modèle — lectures
 * ==========================
 *
 * Réutilise les lectures de l'éditeur : `loadNodesWithAncestors` pour le chemin dans l'arbre,
 * `loadTemplateProgrammeTags` pour les points. Comme elles, lève si une lecture échoue :
 * l'appelant en fait un message, jamais une fiche « sans point ».
 */

import { getQuestionType, isCourseQuestion, QUESTION_TYPE_LABELS } from '$lib/questions/types';
import {
	describeValidationSettings,
	gradeLabel,
	lowestGradeLabel,
	nodePath,
	type FactSheetPoints,
	type TemplateFactSheet
} from '$lib/questions/template-fact-sheet';
import { loadTemplateProgrammeTags, type TemplateProgrammeTags } from '$lib/server/programme-tags';
import { loadNodesWithAncestors } from '$lib/server/programme-tree';
import type { ClassificationNode } from '$lib/types/database-helpers';

// Types

/** Colonnes de `question_templates` lues par la fiche (`FACT_SHEET_TEMPLATE_COLS`). */
export interface FactSheetTemplateRow {
	id: string;
	title: string;
	status: string;
	grades: string[];
	options: unknown;
	shared: unknown;
	variations: unknown;
	classification_node_id: string | null;
}

// Constantes

export const FACT_SHEET_TEMPLATE_COLS =
	'id, title, status, grades, options, shared, variations, classification_node_id';

const STATUS_LABELS: Record<string, string> = {
	published: 'Publié',
	draft: 'Brouillon'
};

// Functions

/** Les choix de QCM sont dans `shared` ou dans les variations : on sonde la première. */
function firstVariationChoices(variations: unknown): unknown[] | undefined {
	if (!Array.isArray(variations) || variations.length === 0) return undefined;
	const first: unknown = variations[0];
	if (typeof first !== 'object' || first === null || !('choices' in first)) return undefined;
	const choices = (first as { choices?: unknown }).choices;
	return Array.isArray(choices) ? choices : undefined;
}

function factSheetPoints(row: FactSheetTemplateRow, tags: TemplateProgrammeTags): FactSheetPoints {
	if (tags.nodeMissing) return { state: 'unranked' };

	const tagged = tags.programmes.flatMap((programme) => {
		const chosen = programme.points.find((p) => p.id === programme.selectedPointId);
		return chosen
			? [
					{
						grade: gradeLabel(programme.grade),
						code: chosen.code,
						name: chosen.name,
						archived: chosen.archived
					}
				]
			: [];
	});
	if (tagged.length > 0) return { state: 'tagged', points: tagged };

	return {
		state: 'none',
		availableCount: tags.programmes.reduce((sum, p) => sum + p.points.length, 0),
		fromGrade: lowestGradeLabel(row.grades)
	};
}

/** Assemble la fiche à partir de lectures déjà faites (l'éditeur a déjà les tags). */
export function buildTemplateFactSheet(
	row: FactSheetTemplateRow,
	nodes: readonly ClassificationNode[],
	tags: TemplateProgrammeTags
): TemplateFactSheet {
	const type = getQuestionType({
		shared: row.shared,
		options: row.options,
		choices: firstVariationChoices(row.variations)
	});
	return {
		title: row.title,
		statusLabel: STATUS_LABELS[row.status] ?? row.status,
		published: row.status === 'published',
		typeLabel: QUESTION_TYPE_LABELS[type],
		courseQuestion: isCourseQuestion({ options: row.options }),
		grades: row.grades.map(gradeLabel),
		path: row.classification_node_id === null ? null : nodePath(row.classification_node_id, nodes),
		points: factSheetPoints(row, tags),
		settings: describeValidationSettings(row.options)
	};
}

/** Lit l'arbre et les points du modèle, puis assemble sa fiche. Lève si une lecture échoue. */
export async function loadTemplateFactSheet(
	supabase: App.Locals['supabase'],
	row: FactSheetTemplateRow
): Promise<TemplateFactSheet> {
	const [nodes, tags] = await Promise.all([
		row.classification_node_id === null
			? Promise.resolve([])
			: loadNodesWithAncestors(supabase, [row.classification_node_id]),
		loadTemplateProgrammeTags(supabase, row)
	]);
	return buildTemplateFactSheet(row, nodes, tags);
}
