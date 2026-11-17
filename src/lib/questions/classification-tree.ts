/**
 * Arbre des notions : chemin d'un nœud, cascade du sélecteur, filtre de liste
 * ===========================================================================
 *
 * Fonctions pures sur les nœuds de `classification_nodes` (ADR 0019 : branche →
 * notion → sous-notion). Un modèle est rangé sur une notion ou une sous-notion
 * (`classification_node_id`, ADR 0035). Trois usages :
 * - le catalogue et les étiquettes : `placeOfNode`, `nodePathLabel` ;
 * - le champ « Rangé dans » de l'éditeur : `selectionOf`, `nodeIdOfSelection`,
 *   `childrenOf` (cascade branche → notion → sous-notion) ;
 * - le filtre de la liste admin : `filterNodeIds`.
 */

import type { ClassificationNode, ClassificationNodeKind } from '$lib/types/database-helpers';

// ============================================================================
// TYPES
// ============================================================================

/** Ce que ces fonctions lisent d'un nœud */
export type TreeNode = Pick<ClassificationNode, 'id' | 'name' | 'parent_id' | 'position'> & {
	/** `branch` | `notion` | `subnotion` ; large pour accepter une ligne lue telle quelle en base */
	kind: string;
};

/** Où se trouve un nœud rangeable : sa branche, sa notion, et sa sous-notion le cas échéant */
export interface NodePlace {
	branch: TreeNode;
	notion: TreeNode;
	subnotion: TreeNode | null;
}

/** État du sélecteur en cascade : les trois niveaux, chacun facultatif */
export interface CascadeSelection {
	branchId: string | null;
	notionId: string | null;
	subnotionId: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Étiquette d'un modèle qui n'est rangé nulle part */
export const UNRANKED_LABEL = 'Non rangé';

/** Séparateur du chemin affiché */
const PATH_SEPARATOR = ' › ';

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Ordre de l'arbre : `position`, puis nom (deux nœuds de même position) */
export function compareNodes(a: TreeNode, b: TreeNode): number {
	return a.position - b.position || a.name.localeCompare(b.name, 'fr');
}

/** Index des nœuds par identifiant */
export function indexNodes(nodes: readonly TreeNode[]): Map<string, TreeNode> {
	return new Map(nodes.map((node) => [node.id, node]));
}

/**
 * Branche, notion et sous-notion d'un nœud rangeable ; `null` si le nœud est
 * absent, est une branche, ou si sa chaîne de parents est cassée.
 */
export function placeOfNode(
	nodeId: string | null | undefined,
	nodesById: ReadonlyMap<string, TreeNode>
): NodePlace | null {
	const node = nodeId ? nodesById.get(nodeId) : undefined;
	if (!node) return null;

	const notion = node.kind === 'subnotion' ? nodesById.get(node.parent_id ?? '') : node;
	if (!notion || notion.kind !== 'notion') return null;
	const branch = nodesById.get(notion.parent_id ?? '');
	if (!branch || branch.kind !== 'branch') return null;

	return { branch, notion, subnotion: node.kind === 'subnotion' ? node : null };
}

/**
 * Chemin « Branche › Notion › Sous-notion » d'un nœud. `UNRANKED_LABEL` si le
 * modèle n'est pas rangé (`null`), `null` si l'identifiant est inconnu de
 * `nodesById` : on n'invente rien quand les nœuds manquent.
 */
export function nodePathLabel(
	nodeId: string | null | undefined,
	nodesById: ReadonlyMap<string, TreeNode>
): string | null {
	if (!nodeId) return UNRANKED_LABEL;
	const place = placeOfNode(nodeId, nodesById);
	if (!place) return null;
	return [place.branch, place.notion, place.subnotion]
		.filter((node): node is TreeNode => node !== null)
		.map((node) => node.name)
		.join(PATH_SEPARATOR);
}

/** Enfants directs d'un parent (`null` : les branches), dans l'ordre de l'arbre */
export function childrenOf(
	nodes: readonly TreeNode[],
	parentId: string | null,
	kind: ClassificationNodeKind
): TreeNode[] {
	return nodes
		.filter((node) => node.kind === kind && (node.parent_id ?? null) === parentId)
		.sort(compareNodes);
}

/** Sélecteur correspondant à un nœud enregistré (vide si inconnu ou non rangeable) */
export function selectionOf(
	nodeId: string | null | undefined,
	nodesById: ReadonlyMap<string, TreeNode>
): CascadeSelection {
	const place = placeOfNode(nodeId, nodesById);
	if (!place) return { branchId: null, notionId: null, subnotionId: null };
	return {
		branchId: place.branch.id,
		notionId: place.notion.id,
		subnotionId: place.subnotion?.id ?? null
	};
}

/** Nœud à enregistrer : la sous-notion si choisie, sinon la notion, sinon rien */
export function nodeIdOfSelection(selection: CascadeSelection): string | null {
	return selection.subnotionId ?? selection.notionId ?? null;
}

/**
 * Identifiants de nœuds qu'un filtre de liste retient : une notion inclut ses
 * sous-notions ; une branche seule inclut toutes ses notions et sous-notions.
 * `null` : aucun filtre. Liste vide : filtre posé sur un nœud inconnu.
 */
export function filterNodeIds(
	nodes: readonly TreeNode[],
	filter: { branchId?: string | null; notionId?: string | null }
): string[] | null {
	if (filter.notionId) {
		const notion = nodes.find((node) => node.id === filter.notionId && node.kind === 'notion');
		if (!notion) return [];
		return [notion.id, ...nodes.filter((n) => n.parent_id === notion.id).map((n) => n.id)];
	}
	if (filter.branchId) {
		const notions = nodes.filter((n) => n.kind === 'notion' && n.parent_id === filter.branchId);
		const notionIds = new Set(notions.map((n) => n.id));
		return [
			...notions.map((n) => n.id),
			...nodes
				.filter((n) => n.kind === 'subnotion' && notionIds.has(n.parent_id ?? ''))
				.map((n) => n.id)
		];
	}
	return null;
}
