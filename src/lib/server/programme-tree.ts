/**
 * Lecture de l'arbre du programme (ADR 0020).
 *
 * Lit les points d'un niveau puis, explicitement, les nœuds qu'ils visent et
 * leurs ancêtres (sous-notion → notion → branche). Pas de jointure `!inner` :
 * une ligne masquée y ferait disparaître son parent en silence. Le rangement
 * est confié à `buildProgrammeTree`.
 */

import type { ClassificationNode } from '$lib/types/database-helpers';
import { buildProgrammeMap, type MapBranch, type MapPointRow } from '$lib/utils/programme-map';
import {
	buildProgrammeTree,
	hideArchivedPoints,
	type ProgrammeBranch,
	type ProgrammePointRow
} from '$lib/utils/programme-tree';

/** Colonnes d'un point du programme (projection unique, lecture et écriture). */
export const PROGRAMME_POINT_COLS =
	'id, code, name, display_order, rubrique, archived_at, node_id, grade';

const NODE_COLS = 'id, kind, name, parent_id, position, archived_at, created_at, updated_at';

/** Profondeur de l'arbre : sous-notion → notion → branche. */
const MAX_NODE_DEPTH = 3;

/** Plafond de lignes d'une réponse PostgREST (`max_rows`) : l'arbre se lit par pages. */
const NODE_PAGE_SIZE = 1000;

/**
 * Charge les nœuds visés et leurs ancêtres, par vagues d'identifiants.
 * Les nœuds archivés sont lus aussi : un point peut encore y être posé.
 */
export async function loadNodesWithAncestors(
	supabase: App.Locals['supabase'],
	startIds: string[]
): Promise<ClassificationNode[]> {
	const byId = new Map<string, ClassificationNode>();
	let pending = [...new Set(startIds)];

	for (let depth = 0; depth < MAX_NODE_DEPTH && pending.length > 0; depth++) {
		const { data, error } = await supabase
			.from('classification_nodes')
			.select(NODE_COLS)
			.in('id', pending);
		if (error) throw new Error(`Arbre des notions illisible : ${error.message}`);

		for (const node of (data ?? []) as ClassificationNode[]) byId.set(node.id, node);
		pending = [
			...new Set(
				[...byId.values()]
					.map((n) => n.parent_id)
					.filter((id): id is string => id !== null && !byId.has(id))
			)
		];
	}

	return [...byId.values()];
}

/**
 * L'arbre branche > notion > points d'un niveau.
 *
 * Les archivés sont exclus par défaut ; la page Programme les demande pour
 * pouvoir les montrer et les restaurer.
 */
export async function getProgrammeTree(
	supabase: App.Locals['supabase'],
	grade: string,
	{ includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<ProgrammeBranch[]> {
	let query = supabase.from('curriculum_points').select(PROGRAMME_POINT_COLS).eq('grade', grade);
	if (!includeArchived) query = query.is('archived_at', null);

	const { data, error } = await query
		.order('display_order', { ascending: true })
		.order('code', { ascending: true });
	if (error) throw new Error(`Points du programme illisibles : ${error.message}`);

	const points = (data ?? []) as ProgrammePointRow[];
	if (points.length === 0) return [];

	const nodeIds = points.map((p) => p.node_id).filter((id): id is string => id !== null);
	const nodes = await loadNodesWithAncestors(supabase, nodeIds);
	return buildProgrammeTree(points, nodes);
}

/**
 * L'arbre d'un niveau pour un écran où l'on coche des points (cahier de texte,
 * avancement, tags d'un exercice) : les archivés y sont masqués, sauf ceux de
 * `keep` — déjà cochés ou tagués, qu'il faut pouvoir décocher.
 */
export async function getProgrammeTreeKeeping(
	supabase: App.Locals['supabase'],
	grade: string,
	keep: Iterable<string>
): Promise<ProgrammeBranch[]> {
	const tree = await getProgrammeTree(supabase, grade, { includeArchived: true });
	return hideArchivedPoints(tree, new Set(keep));
}

/** Tous les nœuds actifs de l'arbre, page par page. */
async function loadActiveNodes(supabase: App.Locals['supabase']): Promise<ClassificationNode[]> {
	const all: ClassificationNode[] = [];
	for (let from = 0; ; from += NODE_PAGE_SIZE) {
		const { data, error } = await supabase
			.from('classification_nodes')
			.select(NODE_COLS)
			.is('archived_at', null)
			.order('id', { ascending: true })
			.range(from, from + NODE_PAGE_SIZE - 1);
		if (error) throw new Error(`Arbre des notions illisible : ${error.message}`);
		const page = (data ?? []) as ClassificationNode[];
		all.push(...page);
		if (page.length < NODE_PAGE_SIZE) return all;
	}
}

/**
 * La carte d'un niveau : l'arbre complet, les points actifs du niveau en
 * feuilles. Les nœuds archivés qui portent encore un point sont lus à part.
 */
export async function getProgrammeMap(
	supabase: App.Locals['supabase'],
	grade: string
): Promise<MapBranch[]> {
	const [pointsResult, active] = await Promise.all([
		supabase
			.from('curriculum_points')
			.select('id, code, name, display_order, archived_at, node_id, grade, exigence')
			.eq('grade', grade)
			.is('archived_at', null)
			.order('display_order', { ascending: true })
			.order('code', { ascending: true }),
		loadActiveNodes(supabase)
	]);
	if (pointsResult.error) {
		throw new Error(`Points du programme illisibles : ${pointsResult.error.message}`);
	}
	const points = (pointsResult.data ?? []) as MapPointRow[];
	// Une réponse pleine peut être tronquée par le plafond PostgREST : refuser plutôt
	// que de montrer un programme amputé (aucun niveau n'en approche : ~300 points).
	if (points.length >= NODE_PAGE_SIZE) {
		throw new Error(
			`Points du programme : plus de ${NODE_PAGE_SIZE - 1} points, lecture à paginer`
		);
	}

	const activeIds = new Set(active.map((n) => n.id));
	const missing = points.map((p) => p.node_id).filter((id) => !activeIds.has(id));
	const extra = missing.length > 0 ? await loadNodesWithAncestors(supabase, missing) : [];
	const nodes = [...active, ...extra.filter((n) => !activeIds.has(n.id))];

	return buildProgrammeMap(points, nodes);
}
