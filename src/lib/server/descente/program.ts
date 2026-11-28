/**
 * La Descente de la Vistule — lectures du programme (serveur)
 * ===========================================================
 *
 * Lectures partagées par l'apparition des Bêtes (`spawn.ts`) et le combat
 * (`combat.ts`) : points d'un niveau, Province d'un point (par sa branche),
 * modèles publiés jouables en combat (filtre préalable de `combat-templates.ts`).
 *
 * Toutes aux droits de L'ÉLÈVE : points, tags, modèles publiés et arbre sont
 * lisibles par tout connecté. Jointure `!inner` voulue sur les modèles : un
 * brouillon (invisible à l'élève) ne rend pas un point jouable.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';
import { fetchInChunks } from '#lib/server/utils/chunked-in.ts';
import { isCombatTemplate } from '#lib/descente/combat-templates.ts';
import { provinceOfBranch } from '#lib/descente/provinces.ts';

// Types
type SB = SupabaseClient<Database>;

export interface GradePoint {
	id: string;
	nodeId: string;
	grade: string;
}

export interface TreeNode {
	kind: string;
	parentId: string | null;
	name: string;
}

/** Ligne de tag lue : le point, le modèle et sa première variation. */
interface CombatTagRow {
	point_id: string;
	template_id: string;
	question_templates: { blanks: unknown; statement: unknown } | null;
}

// Constantes
/** Plafond `max_rows` de PostgREST (supabase/config.toml). */
const TAG_PAGE_SIZE = 1000;

/** Profondeur de l'arbre : sous-notion → notion → branche. */
const MAX_TREE_DEPTH = 3;

// Functions
/**
 * Les écritures de la Descente passent par le client service : `studentId` DOIT
 * être l'utilisateur du client passé, sinon on lève avant toute écriture.
 */
export async function assertSessionStudent(supabase: SB, studentId: string): Promise<void> {
	const { data, error } = await supabase.auth.getUser();
	if (error || data.user?.id !== studentId) {
		throw new Error('Descente : l’élève demandé n’est pas l’utilisateur de la session');
	}
}

/** Niveau scolaire du profil de l'élève (lu à ses droits). */
export async function loadGrade(supabase: SB, studentId: string): Promise<string | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select('grade')
		.eq('id', studentId)
		.maybeSingle();
	if (error) throw new Error(`Profil illisible : ${error.message}`);
	return data?.grade ?? null;
}

/** Le niveau de l'élève puis ses niveaux antérieurs (comme la Chatterie). */
export async function loadPathGrades(supabase: SB, grade: string): Promise<string[]> {
	const { data, error } = await supabase.rpc('grade_ancestors', { p_grade: grade });
	if (error) throw new Error(`Parcours illisible : ${error.message}`);
	const ancestors: unknown = data ?? [];
	if (!Array.isArray(ancestors) || !ancestors.every((g) => typeof g === 'string')) {
		throw new Error('Parcours illisible : réponse inattendue de grade_ancestors');
	}
	return [...new Set([grade, ...ancestors])];
}

/** Points non archivés de ces niveaux, une requête par niveau (plafond de 1 000 lignes). */
export async function loadGradePoints(supabase: SB, grades: string[]): Promise<GradePoint[]> {
	const results = await Promise.all(
		grades.map((g) =>
			supabase
				.from('curriculum_points')
				.select('id, node_id, grade')
				.eq('grade', g)
				.is('archived_at', null)
				.order('id')
		)
	);
	const points: GradePoint[] = [];
	for (const result of results) {
		if (result.error) throw new Error(`Points du parcours illisibles : ${result.error.message}`);
		for (const row of result.data ?? []) {
			if (row.grade) points.push({ id: row.id, nodeId: row.node_id, grade: row.grade });
		}
	}
	return points;
}

/**
 * Modèles publiés jouables en combat (filtre préalable) de chaque point ; un
 * point sans modèle jouable n'apparaît pas.
 */
export async function loadPlayableTemplates(
	supabase: SB,
	pointIds: string[]
): Promise<Map<string, string[]>> {
	const playable = new Map<string, string[]>();
	if (pointIds.length === 0) return playable;

	const { data: tags, error } = await fetchInChunks(pointIds, (batch) =>
		fetchCombatTagPages(supabase, batch)
	);
	if (error) throw new Error(`Tags illisibles : ${error.message}`);

	for (const row of tags) {
		const template = row.question_templates;
		if (!template) continue;
		const ok = isCombatTemplate({
			id: row.template_id,
			blanks: template.blanks,
			statement: template.statement
		});
		if (!ok) continue;
		const list = playable.get(row.point_id);
		if (list) list.push(row.template_id);
		else playable.set(row.point_id, [row.template_id]);
	}
	return playable;
}

/**
 * Tags d'un lot de points par un modèle PUBLIÉ, avec les cases et le sujet de sa
 * première variation, par pages de 1 000 lignes (ordre stable).
 */
async function fetchCombatTagPages(
	supabase: SB,
	pointIds: string[]
): Promise<{ data: CombatTagRow[]; error: { message: string } | null }> {
	const rows: CombatTagRow[] = [];
	for (let from = 0; ; from += TAG_PAGE_SIZE) {
		const { data, error } = await supabase
			.from('question_template_points')
			.select(
				'point_id, template_id, question_templates!inner(blanks:variations->0->blanks, statement:variations->0->>statement)'
			)
			.eq('question_templates.status', 'published')
			.in('point_id', pointIds)
			.order('point_id')
			.order('template_id')
			.range(from, from + TAG_PAGE_SIZE - 1);
		if (error) return { data: [], error };
		const page: CombatTagRow[] = (data ?? []).map((row) => ({
			point_id: row.point_id,
			template_id: row.template_id,
			question_templates: row.question_templates as CombatTagRow['question_templates']
		}));
		rows.push(...page);
		if (page.length < TAG_PAGE_SIZE) return { data: rows, error: null };
	}
}

/** Branches et notions non archivées, et les nœuds référencés par les points. */
export async function loadTree(supabase: SB, points: GradePoint[]): Promise<Map<string, TreeNode>> {
	const referenced = [...new Set(points.map((p) => p.nodeId))];
	const [treeResult, referencedResult] = await Promise.all([
		supabase
			.from('classification_nodes')
			.select('id, kind, parent_id, name')
			.in('kind', ['branch', 'notion'])
			.is('archived_at', null),
		fetchInChunks(referenced, (batch) =>
			supabase.from('classification_nodes').select('id, kind, parent_id, name').in('id', batch)
		)
	]);
	if (treeResult.error) throw new Error(`Arbre illisible : ${treeResult.error.message}`);
	if (referencedResult.error)
		throw new Error(`Nœuds illisibles : ${referencedResult.error.message}`);

	const nodes = new Map<string, TreeNode>();
	for (const row of [...(treeResult.data ?? []), ...referencedResult.data]) {
		nodes.set(row.id, { kind: row.kind, parentId: row.parent_id, name: row.name });
	}
	return nodes;
}

/** Province d'un point : celle de la branche, en remontant l'arbre. */
export function provinceOfPoint(nodeId: string, nodes: Map<string, TreeNode>): ProvinceId | null {
	let current = nodes.get(nodeId);
	for (let depth = 0; current && depth < MAX_TREE_DEPTH; depth++) {
		if (current.kind === 'branch') return provinceOfBranch(current.name);
		current = current.parentId ? nodes.get(current.parentId) : undefined;
	}
	return null;
}
