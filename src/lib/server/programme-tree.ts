/**
 * Lecture de l'arbre du programme — génération neuve (ADR 0020).
 *
 * Lit les points NEUFS d'un niveau (`node_id` non nul) puis, explicitement, les
 * nœuds qu'ils visent et leurs ancêtres (sous-notion → notion → branche). Pas
 * de jointure `!inner` : une ligne masquée y ferait disparaître son parent en
 * silence. Le rangement est confié à `buildProgrammeTree`.
 *
 * Les anciens points (rattachés à un objectif) n'ont ni nœud ni niveau : ils
 * sont exclus par la requête elle-même, et une seconde fois par le rangement.
 */

import type { ClassificationNode } from '$lib/types/database-helpers';
import {
	buildProgrammeTree,
	type ProgrammeBranch,
	type ProgrammePointRow
} from '$lib/utils/programme-tree';

/** Colonnes d'un point du programme (projection unique, lecture et écriture). */
export const PROGRAMME_POINT_COLS =
	'id, code, name, display_order, rubrique, archived_at, node_id, grade';

const NODE_COLS = 'id, kind, name, parent_id, position, archived_at, created_at, updated_at';

/** Profondeur de l'arbre : sous-notion → notion → branche. */
const MAX_NODE_DEPTH = 3;

/**
 * Charge les nœuds visés et leurs ancêtres, par vagues d'identifiants.
 * Les nœuds archivés sont lus aussi : un point peut encore y être posé.
 */
async function loadNodesWithAncestors(
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
	let query = supabase
		.from('curriculum_points')
		.select(PROGRAMME_POINT_COLS)
		.eq('grade', grade)
		.not('node_id', 'is', null);
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
