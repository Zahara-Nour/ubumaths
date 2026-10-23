/**
 * Carte du programme — l'arbre COMPLET d'un niveau (vue « Carte » de la page
 * Programme).
 *
 * À la différence de `programme-tree` (qui ne garde que les nœuds portant un
 * point), la carte montre toutes les branches, notions et sous-notions : un
 * nœud sans point du niveau reste visible, grisé, pour voir ce que le programme
 * ne couvre pas. Les points du niveau en sont les feuilles, sur leur notion ou
 * leur sous-notion.
 *
 * Ce module ne lit rien : il range des lignes déjà lues
 * (cf. `getProgrammeMap` dans `$lib/server/programme-tree`).
 *
 * Ordre : nœuds dans l'ordre de l'arbre (`position`, puis nom) ; points dans
 * l'ordre du BO (`display_order`, puis code).
 */

import type { Tables } from '$lib/types/database';
import type {
	ClassificationNode,
	CurriculumExigence,
	CurriculumPointKind
} from '$lib/types/database-helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Ligne de point telle que la base la rend. */
export type MapPointRow = Pick<
	Tables<'curriculum_points'>,
	| 'id'
	| 'code'
	| 'name'
	| 'display_order'
	| 'archived_at'
	| 'node_id'
	| 'grade'
	| 'exigence'
	| 'kind'
>;

export interface MapPoint {
	id: string;
	code: string;
	name: string;
	exigence: CurriculumExigence;
	kind: CurriculumPointKind;
}

export interface MapCounts {
	attendus: number;
	approfondissements: number;
}

/** `archived` : nœud archivé dans l'arbre, qui porte encore des points du niveau. */
export interface MapSubnotion {
	id: string;
	name: string;
	archived: boolean;
	counts: MapCounts;
	points: MapPoint[];
}

/** `points` : les points posés directement sur la notion. */
export interface MapNotion {
	id: string;
	name: string;
	archived: boolean;
	counts: MapCounts;
	points: MapPoint[];
	subnotions: MapSubnotion[];
}

export interface MapBranch {
	id: string;
	name: string;
	archived: boolean;
	counts: MapCounts;
	notions: MapNotion[];
}

/** Rectangle d'une boîte, relatif au cadre de la carte. */
export interface MapRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Teintes des branches [clair, sombre], reprises du diagramme de l'arbre. */
export const BRANCH_COLORS: readonly (readonly [string, string])[] = [
	['#2f6fb0', '#6ea8e6'],
	['#b5651d', '#e39a5a'],
	['#7a4fb3', '#b393e6'],
	['#1f8a6b', '#5cc7a3'],
	['#c0477a', '#ec87b1'],
	['#4a7d2a', '#8cc46a'],
	['#8a6d1f', '#d7b65a'],
	['#a63d3d', '#e88282'],
	['#4d5f73', '#9fb1c6'],
	['#1f7f8c', '#5fc3cf'],
	['#9b4f96', '#d993d4'],
	['#5a6b2e', '#b5c97a'],
	['#b04a2f', '#ee9378'],
	['#3d5a99', '#93aee8'],
	['#7d6a2a', '#d4c07a'],
	['#2e7d4f', '#7fd1a0'],
	['#6b4e9b', '#b9a0e6'],
	['#8a5a2b', '#e0b07f'],
	['#2f7a7a', '#7fd0d0']
];

const EXIGENCES: readonly CurriculumExigence[] = ['attendu', 'approfondissement'];

/** Type d'un point, tel qu'on le nomme à l'écran. */
const KIND_LABELS: Record<CurriculumPointKind, string> = {
	connaissance: 'connaissance',
	savoir_faire: 'savoir-faire',
	demonstration: 'démonstration',
	algorithme: 'algorithme'
};

// ---------------------------------------------------------------------------
// Fonctions
// ---------------------------------------------------------------------------

function byTreeOrder(a: ClassificationNode, b: ClassificationNode) {
	return a.position - b.position || a.name.localeCompare(b.name, 'fr');
}

function byBoOrder(a: MapPointRow, b: MapPointRow) {
	return a.display_order - b.display_order || a.code.localeCompare(b.code, 'fr');
}

function isExigence(value: string): value is CurriculumExigence {
	return (EXIGENCES as readonly string[]).includes(value);
}

function isKind(value: string): value is CurriculumPointKind {
	return Object.hasOwn(KIND_LABELS, value);
}

/** Le type d'un point en français : « savoir-faire », « démonstration »… */
export function kindLabel(kind: CurriculumPointKind): string {
	return KIND_LABELS[kind];
}

function countPoints(points: MapPoint[]): MapCounts {
	const approfondissements = points.filter((p) => p.exigence === 'approfondissement').length;
	return { attendus: points.length - approfondissements, approfondissements };
}

function addCounts(...all: MapCounts[]): MapCounts {
	return all.reduce(
		(sum, c) => ({
			attendus: sum.attendus + c.attendus,
			approfondissements: sum.approfondissements + c.approfondissements
		}),
		{ attendus: 0, approfondissements: 0 }
	);
}

/** Un nœud sans aucun point du niveau, descendants compris. */
export function isEmptyNode(node: { counts: MapCounts }): boolean {
	return node.counts.attendus + node.counts.approfondissements === 0;
}

/**
 * L'arbre complet, les points du niveau posés en feuilles.
 *
 * Un nœud archivé n'apparaît que s'il porte encore un point du niveau. Un point
 * dont le nœud est introuvable lève une erreur plutôt que de disparaître : le
 * professeur verrait un programme amputé sans rien pour le distinguer.
 */
export function buildProgrammeMap(points: MapPointRow[], nodes: ClassificationNode[]): MapBranch[] {
	const nodeById = new Map(nodes.map((n) => [n.id, n]));
	const childrenOf = new Map<string, ClassificationNode[]>();
	for (const n of nodes) {
		if (n.parent_id === null) continue;
		const list = childrenOf.get(n.parent_id) ?? [];
		list.push(n);
		childrenOf.set(n.parent_id, list);
	}
	const kids = (id: string, kind: ClassificationNode['kind']) =>
		(childrenOf.get(id) ?? []).filter((n) => n.kind === kind).sort(byTreeOrder);

	const pointsByNode = new Map<string, MapPoint[]>();
	for (const row of [...points].sort(byBoOrder)) {
		// Un point sans niveau (points de test) n'a pas sa place dans un niveau.
		if (row.grade === null || row.archived_at !== null) continue;
		const target = nodeById.get(row.node_id);
		if (!target) throw new Error(`Nœud introuvable (point ${row.code}) : ${row.node_id}`);
		// Interdit en base (trigger `curriculum_points_node_kind`, ADR 0020 point 5).
		if (target.kind === 'branch') throw new Error(`Point ${row.code} posé sur une branche`);
		if (!isExigence(row.exigence)) {
			throw new Error(`Point ${row.code} : exigence inconnue « ${row.exigence} »`);
		}
		if (!isKind(row.kind)) throw new Error(`Point ${row.code} : type inconnu « ${row.kind} »`);
		const list = pointsByNode.get(target.id) ?? [];
		list.push({
			id: row.id,
			code: row.code,
			name: row.name,
			exigence: row.exigence,
			kind: row.kind
		});
		pointsByNode.set(target.id, list);
	}

	// Un nœud archivé sans point du niveau sort de la carte.
	const keep = <T extends { archived: boolean; counts: MapCounts }>(n: T) =>
		!n.archived || !isEmptyNode(n);

	return nodes
		.filter((n) => n.kind === 'branch')
		.sort(byTreeOrder)
		.map((branch) => {
			const notions = kids(branch.id, 'notion')
				.map((notion): MapNotion => {
					const own = pointsByNode.get(notion.id) ?? [];
					const subnotions = kids(notion.id, 'subnotion')
						.map((sub): MapSubnotion => {
							const subPoints = pointsByNode.get(sub.id) ?? [];
							return {
								id: sub.id,
								name: sub.name,
								archived: sub.archived_at !== null,
								counts: countPoints(subPoints),
								points: subPoints
							};
						})
						.filter(keep);
					return {
						id: notion.id,
						name: notion.name,
						archived: notion.archived_at !== null,
						counts: addCounts(countPoints(own), ...subnotions.map((s) => s.counts)),
						points: own,
						subnotions
					};
				})
				.filter(keep);
			return {
				id: branch.id,
				name: branch.name,
				archived: branch.archived_at !== null,
				counts: addCounts(...notions.map((n) => n.counts)),
				notions
			};
		})
		.filter(keep);
}

/** La carte sans ses nœuds vides (case « Masquer les nœuds vides »). */
export function hideEmptyNodes(map: MapBranch[]): MapBranch[] {
	const full = (n: { counts: MapCounts }) => !isEmptyNode(n);
	return map.filter(full).map((branch) => ({
		...branch,
		notions: branch.notions
			.filter(full)
			.map((notion) => ({ ...notion, subnotions: notion.subnotions.filter(full) }))
	}));
}

/** Compteur d'un nœud : « 12 att. · 2 approf. », « 3 att. », « aucun point ». */
export function countsLabel(counts: MapCounts): string {
	const { attendus, approfondissements } = counts;
	if (attendus + approfondissements === 0) return 'aucun point';
	return approfondissements > 0
		? `${attendus} att. · ${approfondissements} approf.`
		: `${attendus} att.`;
}

/** Nœuds ouverts au départ : branches et notions, les points restent repliés. */
export function defaultOpenIds(map: MapBranch[]): string[] {
	return map.flatMap((b) => [b.id, ...b.notions.map((n) => n.id)]);
}

/** Notions et sous-notions qui portent des points (pour « Tout déplier »). */
export function pointHolderIds(map: MapBranch[]): string[] {
	return map.flatMap((b) =>
		b.notions.flatMap((n) => [
			...(n.points.length > 0 ? [n.id] : []),
			...n.subnotions.filter((s) => s.points.length > 0).map((s) => s.id)
		])
	);
}

/** Couleur d'une branche selon son rang, pour les deux thèmes. */
export function branchColor(index: number): string {
	const [light, dark] = BRANCH_COLORS[index % BRANCH_COLORS.length];
	return `light-dark(${light}, ${dark})`;
}

/** Courbe du bord droit du parent au bord gauche de l'enfant, à mi-hauteur. */
export function linkPath(parent: MapRect, child: MapRect): string {
	const x1 = parent.left + parent.width;
	const y1 = parent.top + parent.height / 2;
	const x2 = child.left;
	const y2 = child.top + child.height / 2;
	const mx = (x1 + x2) / 2;
	return `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}
