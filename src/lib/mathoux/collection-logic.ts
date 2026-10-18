/**
 * Chatterie de Faustroll — logique pure (Mathoux v1)
 * ===================================================
 *
 * Un Mathou par NOTION de l'arbre (`classification_nodes`), de la race de sa
 * BRANCHE. La collection n'est pas stockée : elle se déduit, à chaque
 * affichage, de l'acquisition des points (`student_point_state`) et de leurs
 * badges FSRS. Ce module ne lit rien : il reçoit les lignes déjà chargées
 * (cf. `$lib/server/mathoux/collection.ts`) et rend la collection.
 *
 * Tout le PARCOURS compte (complément de David, 2026-10-18) : les points du
 * niveau de l'élève ET ceux de ses niveaux antérieurs. Le stade se calcule
 * niveau par niveau ; le stade affiché est le meilleur d'entre eux (un grand
 * matou de 5e reste grand matou en 4e). Le détail par niveau est gardé pour la
 * mémoire des stades (PR suivante : meilleur stade jamais atteint, étoiles).
 *
 * Importable côté client (phrases du Palotin, page) : aucune dépendance serveur.
 *
 * Spec validée par David : docs/wip/mathoux-conception.md § 9.
 */

import { GRADE_CODES } from '$lib/types/grades';

// ============================================================================
// Types
// ============================================================================

/** Stade d'un Mathou. `a_decouvrir` = notion travaillable pas encore réussie (silhouette). */
export type MathouGrowth = 'a_decouvrir' | 'chaton' | 'matou' | 'grand_matou';

export type CollectionNodeKind = 'branch' | 'notion' | 'subnotion';

/** Nœud NON archivé de l'arbre des notions. */
export interface CollectionTreeNode {
	id: string;
	kind: CollectionNodeKind;
	parentId: string | null;
	name: string;
	position: number;
}

/** Point travaillable du parcours de l'élève (au moins une question taguée). */
export interface WorkablePoint {
	id: string;
	nodeId: string;
	/** `curriculum_points.grade` : niveau actuel ou antérieur de l'élève. */
	grade: string;
}

/** État d'un point pour l'élève. Absent de la carte = jamais travaillé. */
export interface PointProgress {
	isAcquired: boolean;
	/** Au moins une réussite (`total_successes > 0` ou `last_success_at` non nul). */
	hasSuccess: boolean;
}

/** Une notion vue depuis UN niveau du parcours. */
export interface MathouGradeDetail {
	grade: string;
	workablePoints: number;
	acquiredPoints: number;
	/** Stade calculé sur les points de ce niveau seul. */
	growth: MathouGrowth;
}

export interface Mathou {
	notionId: string;
	notionName: string;
	/** « le Mathou des Fractions », cf. `mathouName`. */
	name: string;
	/** Rang de la branche (0..). La couleur et le motif en découlent. */
	raceIndex: number;
	/** Meilleur des stades calculés niveau par niveau. */
	growth: MathouGrowth;
	/** Au moins un point « à revoir », de n'importe quel niveau. Jamais vrai pour une silhouette. */
	asleep: boolean;
	/** Totaux sur tout le parcours. */
	workablePoints: number;
	acquiredPoints: number;
	/** Détail par niveau, du plus ancien au plus récent. */
	byGrade: MathouGradeDetail[];
}

export interface MathouRaceGroup {
	branchId: string;
	branchName: string;
	raceIndex: number;
	mathoux: Mathou[];
}

export interface MathouCounts {
	/** Mathoux nés (chaton, matou ou grand matou). */
	born: number;
	/** Mathoux nés qui font la sieste. */
	napping: number;
	/** Silhouettes : notions travaillables pas encore réussies. */
	toDiscover: number;
}

export interface MathouCollection {
	/** Branches ayant au moins une notion travaillable, dans l'ordre de l'arbre. */
	races: MathouRaceGroup[];
	counts: MathouCounts;
}

export interface BuildCollectionInput {
	points: WorkablePoint[];
	nodes: CollectionTreeNode[];
	progress: Map<string, PointProgress>;
	/** Points dont le badge FSRS est `a_renforcer` ou `a_remedier`. */
	nappingPointIds: Set<string>;
}

// ============================================================================
// Croissance
// ============================================================================

/**
 * Stade d'un Mathou d'après ses points travaillables.
 *
 * - tous acquis → grand matou ;
 * - au moins la moitié, arrondie au supérieur (3 sur 5) → matou ;
 * - au moins une réussite → chaton ;
 * - sinon → à découvrir.
 *
 * Un point acquis vaut une réussite (l'acquisition en suppose une).
 */
export function mathouGrowth(input: {
	workable: number;
	acquired: number;
	hasSuccess: boolean;
}): MathouGrowth {
	const { workable, acquired, hasSuccess } = input;
	if (workable > 0 && acquired >= workable) return 'grand_matou';
	if (workable > 0 && acquired >= Math.ceil(workable / 2)) return 'matou';
	if (hasSuccess || acquired > 0) return 'chaton';
	return 'a_decouvrir';
}

const GROWTH_RANK: Record<MathouGrowth, number> = {
	a_decouvrir: 0,
	chaton: 1,
	matou: 2,
	grand_matou: 3
};

/** Le plus avancé de deux stades. */
export function bestGrowth(a: MathouGrowth, b: MathouGrowth): MathouGrowth {
	return GROWTH_RANK[b] > GROWTH_RANK[a] ? b : a;
}

/** Rang d'un niveau dans la scolarité (CP d'abord) ; un code inconnu passe en dernier. */
function gradeRank(grade: string): number {
	const index = (GRADE_CODES as readonly string[]).indexOf(grade);
	return index === -1 ? GRADE_CODES.length : index;
}

// ============================================================================
// Nom
// ============================================================================

/**
 * Nom affiché d'un Mathou.
 *
 * Règle volontairement simple : le français demande l'article, et le genre
 * d'un nom de notion ne se devine pas (« de la Dérivation », « du Second
 * degré »). Donc :
 * - premier mot terminé par -s ou -x (pluriel : « Fractions », « Décimaux ») →
 *   « le Mathou des Fractions » ;
 * - sinon → « le Mathou « Dérivation » », sans article à deviner.
 */
export function mathouName(notionName: string): string {
	const name = notionName.trim();
	if (name === '') return 'le Mathou';
	const firstWord = name.split(/[\s:,;.]/)[0];
	if (firstWord.length > 1 && /[sx]$/i.test(firstWord)) return `le Mathou des ${name}`;
	return `le Mathou « ${name} »`;
}

// ============================================================================
// Regroupement
// ============================================================================

/** Ordre stable : position, puis nom (deux positions égales ne doivent pas permuter). */
function byPosition(a: CollectionTreeNode, b: CollectionTreeNode): number {
	return a.position - b.position || a.name.localeCompare(b.name, 'fr');
}

/**
 * Construit la collection de l'élève.
 *
 * Un point compte pour la notion de son nœud : le nœud lui-même s'il est une
 * notion, son parent s'il est une sous-notion. Un point dont le nœud, la notion
 * ou la branche manque (archivé, donc absent de `nodes`) est ignoré.
 */
export function buildMathouCollection(input: BuildCollectionInput): MathouCollection {
	const { points, nodes, progress, nappingPointIds } = input;

	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const branches = nodes.filter((node) => node.kind === 'branch').sort(byPosition);
	const raceIndexByBranch = new Map(branches.map((branch, index) => [branch.id, index]));

	// Notion → niveau → ses points travaillables (sans doublon)
	const pointsByNotion = new Map<string, Map<string, Set<string>>>();
	for (const point of points) {
		const notion = notionOf(point.nodeId, nodeById);
		if (!notion || notion.parentId === null || !raceIndexByBranch.has(notion.parentId)) continue;
		const byGrade = pointsByNotion.get(notion.id) ?? new Map<string, Set<string>>();
		const set = byGrade.get(point.grade) ?? new Set<string>();
		set.add(point.id);
		byGrade.set(point.grade, set);
		pointsByNotion.set(notion.id, byGrade);
	}

	const counts: MathouCounts = { born: 0, napping: 0, toDiscover: 0 };
	const groups = new Map<string, MathouRaceGroup>();

	const notions = [...pointsByNotion.keys()]
		.map((id) => nodeById.get(id))
		.filter((node): node is CollectionTreeNode => node !== undefined)
		.sort(byPosition);

	for (const notion of notions) {
		const branchId = notion.parentId as string;
		const branch = nodeById.get(branchId) as CollectionTreeNode;
		const raceIndex = raceIndexByBranch.get(branchId) as number;
		const gradeEntries = [
			...(pointsByNotion.get(notion.id) ?? new Map<string, Set<string>>())
		].sort(([a], [b]) => gradeRank(a) - gradeRank(b) || a.localeCompare(b));

		const byGrade: MathouGradeDetail[] = [];
		let growth: MathouGrowth = 'a_decouvrir';
		let workableTotal = 0;
		let acquiredTotal = 0;
		let hasNappingPoint = false;
		for (const [grade, pointSet] of gradeEntries) {
			let acquired = 0;
			let hasSuccess = false;
			for (const pointId of pointSet) {
				const state = progress.get(pointId);
				if (state?.isAcquired) acquired += 1;
				if (state?.hasSuccess) hasSuccess = true;
				if (nappingPointIds.has(pointId)) hasNappingPoint = true;
			}
			const gradeGrowth = mathouGrowth({ workable: pointSet.size, acquired, hasSuccess });
			byGrade.push({
				grade,
				workablePoints: pointSet.size,
				acquiredPoints: acquired,
				growth: gradeGrowth
			});
			growth = bestGrowth(growth, gradeGrowth);
			workableTotal += pointSet.size;
			acquiredTotal += acquired;
		}

		// Une silhouette n'est pas encore un Mathou : elle ne dort pas.
		const asleep = growth !== 'a_decouvrir' && hasNappingPoint;

		if (growth === 'a_decouvrir') counts.toDiscover += 1;
		else counts.born += 1;
		if (asleep) counts.napping += 1;

		const group = groups.get(branchId) ?? {
			branchId,
			branchName: branch.name,
			raceIndex,
			mathoux: []
		};
		group.mathoux.push({
			notionId: notion.id,
			notionName: notion.name,
			name: mathouName(notion.name),
			raceIndex,
			growth,
			asleep,
			workablePoints: workableTotal,
			acquiredPoints: acquiredTotal,
			byGrade
		});
		groups.set(branchId, group);
	}

	const races = [...groups.values()].sort((a, b) => a.raceIndex - b.raceIndex);
	return { races, counts };
}

/** Notion d'un nœud : lui-même (notion) ou son parent (sous-notion). */
function notionOf(
	nodeId: string,
	nodeById: Map<string, CollectionTreeNode>
): CollectionTreeNode | null {
	const node = nodeById.get(nodeId);
	if (!node) return null;
	if (node.kind === 'notion') return node;
	if (node.kind === 'subnotion' && node.parentId) {
		const parent = nodeById.get(node.parentId);
		return parent?.kind === 'notion' ? parent : null;
	}
	return null;
}

// ============================================================================
// Phrases
// ============================================================================

/** « 1 Mathou fait la sieste » / « 3 Mathoux font la sieste ». */
export function nappingPhrase(count: number): string {
	return count === 1 ? '1 Mathou fait la sieste' : `${count} Mathoux font la sieste`;
}

/** « 7 Mathoux, 2 en sieste, 12 à découvrir ». */
export function collectionCountsPhrase(counts: MathouCounts): string {
	const mathoux = counts.born === 1 ? '1 Mathou' : `${counts.born} Mathoux`;
	return `${mathoux}, ${counts.napping} en sieste, ${counts.toDiscover} à découvrir`;
}
