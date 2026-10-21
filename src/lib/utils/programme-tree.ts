/**
 * Arbre du programme — génération neuve (ADR 0020, point 6).
 *
 * Le programme d'un niveau s'affiche par branche > notion, filtré par les
 * points de ce niveau. Ce module ne lit rien : il range des lignes déjà lues
 * (cf. `$lib/server/programme-tree`), et sert aussi côté client pour masquer
 * les archivés.
 *
 * Ordre :
 *   - branches et notions : ordre de l'arbre (`position`, puis nom) ;
 *   - points : ordre du BO (`display_order`, puis code).
 */

import type { Tables } from '$lib/types/database';
import type { ClassificationNode, ProgrammePoint } from '$lib/types/database-helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Ligne de point telle que la base la rend. `node_id` reste nullable : un ancien
 * point (rattaché à un objectif) n'a pas de nœud, et doit être écarté.
 */
export type ProgrammePointRow = Pick<
	Tables<'curriculum_points'>,
	'id' | 'code' | 'name' | 'display_order' | 'rubrique' | 'archived_at' | 'node_id' | 'grade'
>;

/**
 * Point affiché : la sous-notion est nommée quand le point y est posé.
 * `subnotionArchived` signale une sous-notion archivée qui porte encore ce point.
 */
export type ProgrammePointView = ProgrammePoint & {
	subnotionName: string | null;
	subnotionArchived: boolean;
};

/** `archived` : nœud archivé dans l'arbre, qui porte encore des points du niveau. */
export interface ProgrammeNotion {
	id: string;
	name: string;
	archived: boolean;
	points: ProgrammePointView[];
}

export interface ProgrammeBranch {
	id: string;
	name: string;
	archived: boolean;
	notions: ProgrammeNotion[];
}

// ---------------------------------------------------------------------------
// Fonctions
// ---------------------------------------------------------------------------

function byTreeOrder(a: { position: number; name: string }, b: { position: number; name: string }) {
	return a.position - b.position || a.name.localeCompare(b.name, 'fr');
}

function byBoOrder(a: ProgrammePointView, b: ProgrammePointView) {
	return a.display_order - b.display_order || a.code.localeCompare(b.code, 'fr');
}

function isNewPoint(row: ProgrammePointRow): row is ProgrammePoint & ProgrammePointRow {
	return row.node_id !== null && row.grade !== null;
}

/** Notion et branche d'un nœud où se pose un point (notion ou sous-notion). */
export interface NodePlace {
	notion: ClassificationNode;
	branch: ClassificationNode;
}

/**
 * Notion et branche du nœud d'un point, `null` si un maillon manque (nœud
 * illisible, ou point posé sur une branche, interdit en base). Pour les
 * lecteurs qui ne doivent pas échouer pour un point : ils l'écartent.
 */
export function placeOfNode(
	nodeId: string | null,
	nodeById: ReadonlyMap<string, ClassificationNode>
): NodePlace | null {
	const target = nodeId === null ? undefined : nodeById.get(nodeId);
	if (!target) return null;
	const notion =
		target.kind === 'notion'
			? target
			: target.kind === 'subnotion' && target.parent_id !== null
				? nodeById.get(target.parent_id)
				: undefined;
	if (!notion || notion.kind !== 'notion' || notion.parent_id === null) return null;
	const branch = nodeById.get(notion.parent_id);
	if (!branch || branch.kind !== 'branch') return null;
	return { notion, branch };
}

/**
 * Range les points sous leur notion, les notions sous leur branche.
 *
 * Seuls les nœuds qui portent un point apparaissent. Un nœud introuvable lève
 * une erreur plutôt que de faire disparaître ses points en silence : le
 * professeur verrait un programme amputé sans rien pour le distinguer.
 */
export function buildProgrammeTree(
	points: ProgrammePointRow[],
	nodes: ClassificationNode[]
): ProgrammeBranch[] {
	const nodeById = new Map(nodes.map((n) => [n.id, n]));

	function requireNode(id: string | null, context: string): ClassificationNode {
		const found = id === null ? undefined : nodeById.get(id);
		if (!found) throw new Error(`Nœud introuvable (${context}) : ${id ?? 'aucun'}`);
		return found;
	}

	const pointsByNotion = new Map<string, ProgrammePointView[]>();

	for (const row of points) {
		if (!isNewPoint(row)) continue;
		const target = requireNode(row.node_id, `point ${row.code}`);

		let notion: ClassificationNode;
		let subnotionName: string | null = null;
		let subnotionArchived = false;
		if (target.kind === 'notion') {
			notion = target;
		} else if (target.kind === 'subnotion') {
			notion = requireNode(target.parent_id, `notion de « ${target.name} »`);
			subnotionName = target.name;
			subnotionArchived = target.archived_at !== null;
		} else {
			// Interdit en base (trigger `curriculum_points_node_kind`, ADR 0020 point 5).
			throw new Error(`Point ${row.code} posé sur une branche`);
		}

		const view: ProgrammePointView = {
			id: row.id,
			code: row.code,
			name: row.name,
			display_order: row.display_order,
			rubrique: row.rubrique,
			archived_at: row.archived_at,
			node_id: row.node_id,
			grade: row.grade,
			subnotionName,
			subnotionArchived
		};
		const list = pointsByNotion.get(notion.id) ?? [];
		list.push(view);
		pointsByNotion.set(notion.id, list);
	}

	const notionsByBranch = new Map<string, ClassificationNode[]>();
	for (const notionId of pointsByNotion.keys()) {
		const notion = requireNode(notionId, 'notion');
		const branch = requireNode(notion.parent_id, `branche de « ${notion.name} »`);
		const list = notionsByBranch.get(branch.id) ?? [];
		list.push(notion);
		notionsByBranch.set(branch.id, list);
	}

	return [...notionsByBranch.keys()]
		.map((id) => requireNode(id, 'branche'))
		.sort(byTreeOrder)
		.map((branch) => ({
			id: branch.id,
			name: branch.name,
			archived: branch.archived_at !== null,
			notions: (notionsByBranch.get(branch.id) ?? []).sort(byTreeOrder).map((notion) => ({
				id: notion.id,
				name: notion.name,
				archived: notion.archived_at !== null,
				points: (pointsByNotion.get(notion.id) ?? []).sort(byBoOrder)
			}))
		}));
}

/** Nombre de points archivés dans l'arbre. */
export function countArchivedPoints(tree: ProgrammeBranch[]): number {
	return tree.reduce(
		(sum, branch) =>
			sum +
			branch.notions.reduce(
				(s, notion) => s + notion.points.filter((p) => p.archived_at !== null).length,
				0
			),
		0
	);
}

/**
 * L'arbre réduit aux points retenus par `keepPoint`. Une notion (ou une branche)
 * qui n'en garde aucun disparaît : elle n'a plus de point à montrer.
 */
export function filterTreePoints(
	tree: ProgrammeBranch[],
	keepPoint: (point: ProgrammePointView) => boolean
): ProgrammeBranch[] {
	return tree
		.map((branch) => ({
			...branch,
			notions: branch.notions
				.map((notion) => ({ ...notion, points: notion.points.filter(keepPoint) }))
				.filter((notion) => notion.points.length > 0)
		}))
		.filter((branch) => branch.notions.length > 0);
}

/**
 * L'arbre sans ses points archivés.
 *
 * `keep` : archivés à garder quand même — ceux déjà cochés ou tagués, qu'on
 * doit pouvoir décocher (sinon ils resteraient invisibles et inamovibles).
 */
export function hideArchivedPoints(
	tree: ProgrammeBranch[],
	keep: ReadonlySet<string> = new Set()
): ProgrammeBranch[] {
	return filterTreePoints(tree, (p) => p.archived_at === null || keep.has(p.id));
}

/**
 * Nœuds où un exercice peut prendre un point (règle 1 de la migration
 * `20261013120000`) : ses nœuds de rangement, et la notion de chacun quand
 * c'est une sous-notion.
 */
export function taggableNodeIds(placements: ClassificationNode[]): Set<string> {
	const ids = new Set<string>();
	for (const node of placements) {
		ids.add(node.id);
		if (node.kind === 'subnotion' && node.parent_id !== null) ids.add(node.parent_id);
	}
	return ids;
}
