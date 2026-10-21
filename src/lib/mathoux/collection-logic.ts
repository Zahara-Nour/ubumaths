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
 * niveau par niveau ; le stade calculé est le meilleur d'entre eux (un grand
 * matou de 5e reste grand matou en 4e).
 *
 * MÉMOIRE (`student_mathoux`, § 9 « Changement d'année et oubli ») : un Mathou
 * ne rapetisse jamais. Stade affiché = max(stade calculé, meilleur stade
 * mémorisé) ; étoiles = niveaux entièrement acquis (calcul) ∪ étoiles
 * mémorisées. Un point PERDU (déjà réussi au seuil, plus acquis : `isPointLost`)
 * ENDORT le Mathou au lieu de le faire rapetisser ; un point jamais acquis (neuf,
 * ou en apprentissage) ne l'endort pas, il empêche seulement l'étoile de sa classe
 * (règle tranchée par David le 2026-10-18, option 2). `memoryUpdates` dit ce que
 * la mémoire doit apprendre.
 *
 * « FAIRE GRANDIR » (v1.1, spec de David du 2026-10-18) : chaque Mathou né porte
 * les catégories d'un Entraînement (`trainingCategories`) : les modèles PUBLIÉS qui taguent
 * les points de sa notion, sur tout le parcours : d'abord les points perdus,
 * puis les non acquis, puis les autres ; au plus 10 questions, une par modèle
 * (`selectTrainingTemplates`). Un Mathou endormi sans carte due
 * (`dueForRevision` faux) se réveille par ce même Entraînement. Le lien se
 * construit au rendu (`trainingQuery`) : un lien encodé pèse ≈ 4 Ko par Mathou.
 *
 * Importable côté client (phrases du Palotin, page) : aucune dépendance serveur.
 *
 * Spec validée par David : docs/wip/mathoux-conception.md § 9.
 */

import { GRADE_CODES, GRADES, isGradeCode } from '$lib/types/grades';
import { buildSeriesLink, cartItemSchema, type SeriesCategories } from '$lib/validation/series';
import { MATHOU_NAMES } from './mathou-noms';

// ============================================================================
// Types
// ============================================================================

/** Stade d'un Mathou. `a_decouvrir` = notion travaillable pas encore réussie (silhouette). */
export type MathouGrowth = 'a_decouvrir' | 'chaton' | 'matou' | 'grand_matou';

/** Stade d'un Mathou NÉ : ce que retient la mémoire (`student_mathoux.best_stage`). */
export type MathouStage = Exclude<MathouGrowth, 'a_decouvrir'>;

/** Ce que la mémoire retient d'un Mathou (une ligne de `student_mathoux`). */
export interface MathouMemory {
	bestStage: MathouStage;
	/** Codes de niveau étoilés (valides, sans doublon). */
	starredGrades: string[];
}

/** Ce que la mémoire doit apprendre d'un Mathou : sa ligne complète, jamais en baisse. */
export interface MathouMemoryUpdate extends MathouMemory {
	notionId: string;
}

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
/** Catégorie de questions d'une série (thème, domaine, sous-domaine, niveau du modèle). */
export type TrainingCategory = SeriesCategories[number]['category'];

/** Modèle PUBLIÉ qui tague un point : de quoi en faire une catégorie d'Entraînement. */
export interface TrainingTemplate {
	id: string;
	category: TrainingCategory;
	/** Durée par question (secondes), celle du modèle sinon le défaut du panier. */
	delay: number;
}

/** Ligne lue d'un modèle (`question_templates`), avant validation. */
export interface TrainingTemplateRow {
	id: string;
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
	delay: number | null;
	status: string;
}

export interface PointProgress {
	isAcquired: boolean;
	/** Au moins une réussite (`total_successes > 0` ou `last_success_at` non nul). */
	hasSuccess: boolean;
	/** Point perdu : seuil de réussites atteint mais plus acquis (`isPointLost`). */
	lost: boolean;
}

/** Ce qu'il faut de `student_point_state` pour savoir si un point est perdu. */
export interface PointLossInput {
	isAcquired: boolean;
	totalSuccesses: number;
	distinctTemplateSuccesses: number;
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
	/** Nom propre (« Tangentin »), sinon générique (« le Mathou des Fractions ») : cf. `mathouName`. */
	name: string;
	/** Rang de la branche (0..). La couleur et le motif en découlent. */
	raceIndex: number;
	/** Meilleur des stades calculés niveau par niveau et du stade mémorisé. */
	growth: MathouGrowth;
	/**
	 * Au moins un point « à revoir » (de n'importe quel niveau) ou un point
	 * perdu (cf. `isPointLost`). Jamais vrai pour une silhouette.
	 */
	asleep: boolean;
	/**
	 * Au moins un point de la notion a une carte due (badge « à revoir ») :
	 * « Réveiller » mène alors aux révisions. Faux pour un Mathou endormi par un
	 * point perdu seulement : il se réveille par son Entraînement.
	 */
	dueForRevision: boolean;
	/**
	 * « Faire grandir » : catégories de l'Entraînement sur la notion (une question
	 * par modèle), dont `trainingQuery` fait le lien au rendu. `null` pour une
	 * silhouette ou une notion sans modèle publié.
	 */
	trainingCategories: SeriesCategories | null;
	/** Niveaux étoilés (calculés ∪ mémorisés), du plus ancien au plus récent. */
	stars: string[];
	/** Totaux sur tout le parcours. */
	workablePoints: number;
	acquiredPoints: number;
	/** Détail par niveau, du plus ancien au plus récent. Vide pour un Mathou de la seule mémoire. */
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
	/** Mémoire de l'élève par notion (`student_mathoux`). Absente = aucune ligne. */
	memory?: Map<string, MathouMemory>;
	/** Modèles PUBLIÉS qui taguent chaque point. Absent = aucun lien « Faire grandir ». */
	templatesByPoint?: Map<string, TrainingTemplate[]>;
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
export function bestGrowth<G extends MathouGrowth>(a: G, b: G): G {
	return GROWTH_RANK[b] > GROWTH_RANK[a] ? b : a;
}

const STAGES: readonly MathouStage[] = ['chaton', 'matou', 'grand_matou'];

/** Garde de type : une valeur lue en base est-elle un stade de la mémoire ? */
export function isMathouStage(value: unknown): value is MathouStage {
	return typeof value === 'string' && (STAGES as readonly string[]).includes(value);
}

/** Rang d'un niveau dans la scolarité (CP d'abord) ; un code inconnu passe en dernier. */
function gradeRank(grade: string): number {
	const index = (GRADE_CODES as readonly string[]).indexOf(grade);
	return index === -1 ? GRADE_CODES.length : index;
}

/** Niveaux sans doublon, du plus ancien au plus récent. */
function sortGrades(grades: Iterable<string>): string[] {
	return [...new Set(grades)].sort((a, b) => gradeRank(a) - gradeRank(b) || a.localeCompare(b));
}

/** Union de deux mémoires : le meilleur stade, toutes les étoiles. Jamais en baisse. */
export function mergeMemory(a: MathouMemory, b: MathouMemory): MathouMemory {
	return {
		bestStage: bestGrowth(a.bestStage, b.bestStage),
		starredGrades: sortGrades([...a.starredGrades, ...b.starredGrades])
	};
}

/** `have` contient-elle déjà tout ce que dit `want` (stade au moins égal, toutes les étoiles) ? */
export function memoryCovers(have: MathouMemory, want: MathouMemory): boolean {
	return (
		GROWTH_RANK[have.bestStage] >= GROWTH_RANK[want.bestStage] &&
		want.starredGrades.every((grade) => have.starredGrades.includes(grade))
	);
}

/**
 * Un point est-il PERDU : déjà réussi au seuil de son régime d'acquisition, mais
 * plus acquis (échecs récents) ? Seuils de `recalc_point_state`
 * (migration 20260928160000) : régime `diversite` → au moins 2 modèles distincts
 * réussis ; sinon (`fluence`, répétition) → au moins 5 réussites. Un point jamais
 * acquis sous le seuil (neuf, en apprentissage) n'est pas perdu.
 */
export function isPointLost(regime: string, state: PointLossInput): boolean {
	if (state.isAcquired) return false;
	return regime === 'diversite' ? state.distinctTemplateSuccesses >= 2 : state.totalSuccesses >= 5;
}

/** Nom de la classe sur une étoile : libellé court du projet (« 1ère Spé »), sinon le code. */
export function starGradeLabel(grade: string): string {
	return isGradeCode(grade) ? GRADES[grade].shortName : grade;
}

// ============================================================================
// Nom
// ============================================================================

/**
 * Nom affiché d'un Mathou.
 *
 * D'abord son nom propre (`MATHOU_NAMES`, clé = nom de la notion). Une notion
 * hors table (renommée, nouvelle) garde un nom générique. Le français demande
 * l'article, et le genre d'un nom de notion ne se devine pas (« de la
 * Dérivation », « du Second degré »). Donc :
 * - premier mot terminé par -s ou -x (pluriel : « Fractions », « Décimaux ») →
 *   « le Mathou des Fractions » ;
 * - sinon → « le Mathou « Dérivation » », sans article à deviner.
 */
export function mathouName(notionName: string): string {
	const name = notionName.trim();
	if (name === '') return 'le Mathou';
	if (Object.hasOwn(MATHOU_NAMES, name)) return MATHOU_NAMES[name];
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
	const memory = input.memory ?? new Map<string, MathouMemory>();
	const templatesByPoint = input.templatesByPoint ?? new Map<string, TrainingTemplate[]>();

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

	// Notions du calcul, plus celles de la seule mémoire (un Mathou né ne disparaît pas
	// quand ses points quittent le parcours) si la notion et sa branche sont encore là
	const notionIds = new Set(pointsByNotion.keys());
	for (const notionId of memory.keys()) {
		const node = nodeById.get(notionId);
		if (node?.kind === 'notion' && node.parentId && raceIndexByBranch.has(node.parentId)) {
			notionIds.add(notionId);
		}
	}
	const notions = [...notionIds]
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
		let hasLostPoint = false;
		// Points de la notion dans l'ordre du parcours (plus ancien niveau d'abord)
		const notionPointIds: string[] = [];
		for (const [grade, pointSet] of gradeEntries) {
			notionPointIds.push(...[...pointSet].sort());
			let acquired = 0;
			let hasSuccess = false;
			for (const pointId of pointSet) {
				const state = progress.get(pointId);
				if (state?.isAcquired) acquired += 1;
				if (state?.hasSuccess) hasSuccess = true;
				if (state?.lost) hasLostPoint = true;
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

		// Étoiles du calcul : niveaux entièrement acquis (codes valides seulement, la base
		// refuserait les autres), puis union avec la mémoire
		const computedStars = byGrade
			.filter((detail) => detail.growth === 'grand_matou' && isGradeCode(detail.grade))
			.map((detail) => detail.grade);
		const remembered = memory.get(notion.id);
		let stars = computedStars;
		if (remembered) {
			// Stade affiché = max(calcul, mémoire) ; les étoiles mémorisées restent. Un
			// stade calculé plus bas n'endort PAS à lui seul (un point neuf le fait baisser)
			growth = bestGrowth(growth, remembered.bestStage);
			stars = sortGrades([...computedStars, ...remembered.starredGrades]);
		}

		// Une silhouette n'est pas encore un Mathou : elle ne dort pas.
		const born = growth !== 'a_decouvrir';
		const asleep = born && (hasNappingPoint || hasLostPoint);
		const trainingTemplates = born
			? selectTrainingTemplates(notionPointIds, progress, templatesByPoint)
			: [];

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
			dueForRevision: asleep && hasNappingPoint,
			trainingCategories: trainingCategories(trainingTemplates),
			stars,
			workablePoints: workableTotal,
			acquiredPoints: acquiredTotal,
			byGrade
		});
		groups.set(branchId, group);
	}

	const races = [...groups.values()].sort((a, b) => a.raceIndex - b.raceIndex);
	return { races, counts };
}

/**
 * Ce que la mémoire doit apprendre : la ligne complète (stade affiché, toutes les
 * étoiles) de chaque Mathou né qui n'a pas de ligne, ou dont le stade ou les
 * étoiles dépassent sa ligne. Le stade affiché étant déjà le max du calcul et de
 * la mémoire, une ligne écrite ne redescend jamais. Rien de nouveau → liste vide.
 */
export function memoryUpdates(
	collection: MathouCollection,
	memory: Map<string, MathouMemory>
): MathouMemoryUpdate[] {
	const updates: MathouMemoryUpdate[] = [];
	for (const mathou of collection.races.flatMap((race) => race.mathoux)) {
		if (mathou.growth === 'a_decouvrir') continue;
		const want: MathouMemory = { bestStage: mathou.growth, starredGrades: mathou.stars };
		const have = memory.get(mathou.notionId);
		if (have && memoryCovers(have, want)) continue;
		updates.push({ notionId: mathou.notionId, ...want });
	}
	return updates;
}

// ============================================================================
// « Faire grandir » : l'Entraînement sur la notion
// ============================================================================

/** Questions d'un Entraînement « Faire grandir » : une par modèle, au plus 10. */
export const MAX_TRAINING_QUESTIONS = 10;

/** Durée par question quand le modèle n'en donne pas (défaut du panier). */
const DEFAULT_TRAINING_DELAY = 20;

/** Durée la plus longue qu'accepte une série (`cartItemSchema`). */
const MAX_TRAINING_DELAY = 600;

/** Priorité d'un point : 0 perdu, 1 non acquis (ou jamais travaillé), 2 acquis. */
function trainingPriority(state: PointProgress | undefined): number {
	if (state?.lost) return 0;
	return state?.isAcquired ? 2 : 1;
}

/**
 * Ligne de modèle → modèle d'Entraînement, ou `null` si elle ne doit pas y
 * entrer : un brouillon (garde en plus du filtre de la requête), ou une
 * catégorie que le lien de série refuserait (mêmes bornes que `cartItemSchema`).
 */
export function trainingTemplateFrom(row: TrainingTemplateRow): TrainingTemplate | null {
	if (row.status !== 'published') return null;
	const delay =
		row.delay === null || !Number.isFinite(row.delay) || row.delay < 0
			? DEFAULT_TRAINING_DELAY
			: Math.min(MAX_TRAINING_DELAY, Math.round(row.delay));
	const item = cartItemSchema.safeParse({
		category: {
			theme: row.theme,
			domain: row.domain,
			subdomain: row.subdomain,
			level: row.level
		},
		quantity: 1,
		delay
	});
	if (!item.success) return null;
	return { id: row.id, category: item.data.category, delay: item.data.delay };
}

/**
 * Modèles de l'Entraînement d'une notion, dans l'ordre demandé par David :
 * d'abord ceux des points PERDUS, puis des points non acquis, puis des autres.
 * Au plus `MAX_TRAINING_QUESTIONS`, chaque modèle une seule fois (au rang du
 * plus prioritaire de ses points). À priorité égale, les points sont servis
 * tour à tour, dans l'ordre reçu (un modèle chacun, puis le suivant), pour
 * couvrir la notion plutôt qu'un seul point ; les modèles d'un point, par id.
 *
 * @param pointIds points de la notion, dans l'ordre du parcours.
 */
export function selectTrainingTemplates(
	pointIds: string[],
	progress: Map<string, PointProgress>,
	templatesByPoint: Map<string, TrainingTemplate[]>,
	max: number = MAX_TRAINING_QUESTIONS
): TrainingTemplate[] {
	const groups: string[][] = [[], [], []];
	for (const pointId of new Set(pointIds)) {
		groups[trainingPriority(progress.get(pointId))].push(pointId);
	}

	const chosen: TrainingTemplate[] = [];
	const seen = new Set<string>();
	for (const group of groups) {
		const queues = group.map((pointId) =>
			[...(templatesByPoint.get(pointId) ?? [])].sort((a, b) => a.id.localeCompare(b.id))
		);
		// Tour à tour : à chaque tour, chaque point donne son prochain modèle pas encore pris
		let remaining = true;
		while (remaining && chosen.length < max) {
			remaining = false;
			for (const queue of queues) {
				if (chosen.length >= max) break;
				let next = queue.shift();
				while (next && seen.has(next.id)) next = queue.shift();
				if (!next) continue;
				seen.add(next.id);
				chosen.push(next);
				if (queue.length > 0) remaining = true;
			}
		}
	}
	return chosen;
}

/**
 * Catégories de l'Entraînement : une question par modèle, rien d'autre (ce que
 * demande `buildSeriesLink`). Aucun modèle → `null` (pas de bouton).
 */
export function trainingCategories(templates: TrainingTemplate[]): SeriesCategories | null {
	if (templates.length === 0) return null;
	return templates.map((template) => ({
		category: template.category,
		quantity: 1,
		delay: template.delay
	}));
}

/** Chemin des liens de série qui démarrent directement (`buildSeriesLink` avec une forme). */
const TEST_PATH_PREFIX = '/automaths/test?';

/**
 * Paramètres (`categories=…&mode=interactive`) du lien de l'Entraînement, à
 * placer après `resolve('/automaths/test')` + `?`. Encodés par
 * `buildSeriesLink` lui-même (relus par `resolveTestLaunch`) : on n'en garde
 * que la partie après `?`. Pas de catégories → `null`.
 */
export function trainingQuery(categories: SeriesCategories | null): string | null {
	if (!categories || categories.length === 0) return null;
	const link = buildSeriesLink('', categories, { mode: 'interactive' });
	return link.startsWith(TEST_PATH_PREFIX) ? link.slice(TEST_PATH_PREFIX.length) : null;
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

/**
 * Ligne d'un élève dans la liste du professeur, d'après la mémoire :
 * « Aucun Mathou », « 3 Mathoux », « 7 Mathoux, dont 2 grands matous ».
 */
export function memoryCountsPhrase(counts: { born: number; grandMatous: number }): string {
	if (counts.born === 0) return 'Aucun Mathou';
	const mathoux = counts.born === 1 ? '1 Mathou' : `${counts.born} Mathoux`;
	if (counts.grandMatous === 0) return mathoux;
	const grands = counts.grandMatous === 1 ? '1 grand matou' : `${counts.grandMatous} grands matous`;
	return `${mathoux}, dont ${grands}`;
}
