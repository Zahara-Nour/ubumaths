/**
 * Tags d'un modèle vers les points du programme — génération neuve (C5, étape 3)
 * ===============================================================================
 *
 * Règles posées en base (triggers, étape 2 de C5) et reprises par l'écran :
 *   - règle 1 : un point tagué est posé sur le nœud du modèle ou sur la notion de ce nœud ;
 *   - règle 2 : au plus un point par programme sur un modèle ;
 *   - décision (a) : un modèle sans nœud ne se tague pas, on le range d'abord.
 *
 * L'écran propose donc UN choix par programme. Les programmes proposés sont ceux du modèle et
 * des années suivantes (un programme plus tardif remobilise une notion vue plus tôt), plus tout
 * programme où un tag est déjà posé. Les tags des anciens points (thème → objectif) restent en
 * base jusqu'à l'étape 4, mais ne s'affichent plus.
 */

import type { ClassificationNode } from '$lib/types/database-helpers';
import { GRADES, getGradesAtOrAbove, isGradeCode } from '$lib/types/grades';
import { loadNodesWithAncestors, PROGRAMME_POINT_COLS } from '$lib/server/programme-tree';
import { isProgrammePoint } from '$lib/server/curriculum-generation';
import type { ProgrammePointRow } from '$lib/utils/programme-tree';

// Types

export interface ProgrammeChoicePoint {
	id: string;
	code: string;
	name: string;
	archived: boolean;
}

export interface ProgrammeChoice {
	grade: string;
	points: ProgrammeChoicePoint[];
	/** Point tagué dans ce programme, `null` si aucun. */
	selectedPointId: string | null;
}

export interface TemplateProgrammeTags {
	/** Modèle sans nœud : aucun tag possible, il faut le ranger d'abord. */
	nodeMissing: boolean;
	programmes: ProgrammeChoice[];
	/** Nombre de tags neufs posés sur le modèle. */
	taggedCount: number;
}

interface TagRow {
	point_id: string;
	curriculum_points: { node_id: string | null; grade: string | null } | null;
}

// Functions

/** Le nœud et, s'il est une sous-notion, sa notion : là où un tag peut viser (règle 1). */
function taggableNodeIds(nodeId: string, nodeById: ReadonlyMap<string, ClassificationNode>) {
	const node = nodeById.get(nodeId);
	if (!node) throw new Error(`Nœud du modèle introuvable : ${nodeId}`);
	return node.kind === 'subnotion' && node.parent_id !== null
		? [node.id, node.parent_id]
		: [node.id];
}

function schoolYear(grade: string): number {
	return isGradeCode(grade) ? GRADES[grade].schoolYear : Number.MAX_SAFE_INTEGER;
}

/**
 * Les choix de tags d'un modèle, programme par programme.
 *
 * Lève si une lecture échoue : un écran de tags amputé en silence ferait croire
 * qu'un modèle n'a pas de tag, et l'admin en poserait un second.
 */
export async function loadTemplateProgrammeTags(
	supabase: App.Locals['supabase'],
	template: { id: string; grades: string[]; classification_node_id: string | null }
): Promise<TemplateProgrammeTags> {
	const { data: tagData, error: tagError } = await supabase
		.from('question_template_points')
		.select('point_id, curriculum_points(node_id, grade)')
		.eq('template_id', template.id);
	if (tagError) throw new Error(`Tags du modèle illisibles : ${tagError.message}`);

	const tags = ((tagData ?? []) as unknown as TagRow[]).filter((t) =>
		isProgrammePoint(t.curriculum_points)
	);

	if (template.classification_node_id === null) {
		return { nodeMissing: true, programmes: [], taggedCount: tags.length };
	}

	const nodes = await loadNodesWithAncestors(supabase, [template.classification_node_id]);
	const nodeById = new Map(nodes.map((n) => [n.id, n]));
	const nodeIds = taggableNodeIds(template.classification_node_id, nodeById);

	const { data: pointData, error: pointError } = await supabase
		.from('curriculum_points')
		.select(PROGRAMME_POINT_COLS)
		.in('node_id', nodeIds);
	if (pointError) throw new Error(`Points du programme illisibles : ${pointError.message}`);
	const points = (pointData ?? []) as ProgrammePointRow[];

	const selectedByGrade = new Map<string, string>();
	for (const t of tags) {
		const grade = t.curriculum_points?.grade;
		if (grade) selectedByGrade.set(grade, t.point_id);
	}
	const tagged = new Set(tags.map((t) => t.point_id));

	const grades = new Set<string>([
		...getGradesAtOrAbove(template.grades),
		...selectedByGrade.keys()
	]);

	const programmes: ProgrammeChoice[] = [...grades]
		.sort((a, b) => schoolYear(a) - schoolYear(b))
		.map((grade) => ({
			grade,
			points: points
				.filter((p) => p.grade === grade && (p.archived_at === null || tagged.has(p.id)))
				.sort((a, b) => a.display_order - b.display_order || a.code.localeCompare(b.code, 'fr'))
				.map((p) => ({ id: p.id, code: p.code, name: p.name, archived: p.archived_at !== null })),
			selectedPointId: selectedByGrade.get(grade) ?? null
		}))
		.filter((p) => p.points.length > 0 || p.selectedPointId !== null);

	return { nodeMissing: false, programmes, taggedCount: tags.length };
}
