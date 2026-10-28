/**
 * Revue des modèles de questions (`/dev/modeles`) — logique pure
 * ===============================================================
 *
 * Range tous les modèles en base par programme > branche > notion > sous-notion, et compte
 * à chaque étage les verdicts de relecture (validé / à revoir / sans verdict). Un modèle tagué
 * dans deux programmes apparaît dans les deux ; sans point → « Hors programme » ; sans nœud →
 * « Non rangé » sous son programme. Chantier revue-modeles (phase 0 du 2026-10-28).
 */

import { GRADES, isGradeCode } from '$lib/types/grades';

// Types

export type Verdict = 'valide' | 'a_revoir';

export interface TemplateReview {
	verdict: Verdict;
	comment: string;
	reviewedAt: string;
}

/** Ce que la vue d'ensemble sait d'un modèle (sans ses variations) */
export interface TemplateSummary {
	id: string;
	title: string;
	status: string;
	level: number;
	nodeId: string | null;
	updatedAt: string | null;
	/** Points tagués, avec leur programme (`grade` du point) */
	points: { code: string; grade: string | null }[];
	review: TemplateReview | null;
}

/** Un point tagué sur un modèle, tel que la fiche le montre */
export interface SheetPoint {
	code: string;
	grade: string | null;
	name: string;
	archived: boolean;
	bounds: string[];
	/** Le point n'est pas dans les fichiers de bornes */
	missingBounds: boolean;
}

export interface TreeNodeRow {
	id: string;
	name: string;
	parent_id: string | null;
	position: number;
}

export interface ReviewCount {
	total: number;
	valide: number;
	aRevoir: number;
	none: number;
	/** Verdict posé AVANT la dernière modification du modèle */
	changed: number;
}

/** Un étage de l'arbre de revue : programme, branche, notion, sous-notion ou case à part */
export interface ReviewNode {
	/** Clé d'URL : `<programme>` pour un programme, `<programme>~<nœud>` en dessous */
	key: string;
	name: string;
	children: ReviewNode[];
	/** Modèles rangés à cet étage même (pas dans ses enfants) */
	templateIds: string[];
	count: ReviewCount;
}

// Constantes

export const OUT_OF_PROGRAMME = 'hors-programme';
export const UNSORTED = 'non-range';
export const VERDICT_LABELS: Record<Verdict, string> = {
	valide: 'Validé',
	a_revoir: 'À revoir'
};

// Functions

const emptyCount = (): ReviewCount => ({ total: 0, valide: 0, aRevoir: 0, none: 0, changed: 0 });

/** Le verdict date d'avant la dernière modification du modèle : à relire */
export function changedSinceReview(t: Pick<TemplateSummary, 'updatedAt' | 'review'>): boolean {
	if (!t.review || !t.updatedAt) return false;
	return new Date(t.updatedAt).getTime() > new Date(t.review.reviewedAt).getTime();
}

function addTo(count: ReviewCount, t: TemplateSummary): void {
	count.total++;
	if (!t.review) count.none++;
	else if (t.review.verdict === 'valide') count.valide++;
	else count.aRevoir++;
	if (changedSinceReview(t)) count.changed++;
}

/** Les comptes d'une liste de modèles (chacun compté une fois) */
export function countTemplates(templates: readonly TemplateSummary[]): ReviewCount {
	const count = emptyCount();
	for (const t of templates) addTo(count, t);
	return count;
}

/** Libellé d'un programme : nom du niveau (`6` → « 6ème »), sinon le code tel quel */
export function programmeName(grade: string): string {
	if (grade === OUT_OF_PROGRAMME) return 'Hors programme';
	return isGradeCode(grade) ? GRADES[grade].displayName : grade;
}

/** Ordre des programmes : année scolaire, puis code ; « Hors programme » en dernier */
function programmeRank(grade: string): number {
	if (grade === OUT_OF_PROGRAMME) return 1000;
	return isGradeCode(grade) ? GRADES[grade].schoolYear : 999;
}

/** Les programmes d'un modèle : ceux de ses points, sinon « Hors programme » */
export function templateProgrammes(t: Pick<TemplateSummary, 'points'>): string[] {
	const grades = [...new Set(t.points.flatMap((p) => (p.grade ? [p.grade] : [])))];
	return grades.length > 0 ? grades : [OUT_OF_PROGRAMME];
}

/** Chemin d'un nœud, de la branche au nœud ; vide si le nœud est inconnu */
export function nodeChain(id: string, nodes: ReadonlyMap<string, TreeNodeRow>): TreeNodeRow[] {
	const chain: TreeNodeRow[] = [];
	let current = nodes.get(id);
	while (current && chain.length < 10) {
		chain.unshift(current);
		current = current.parent_id ? nodes.get(current.parent_id) : undefined;
	}
	return chain;
}

/** L'arbre de revue de tous les modèles, comptes compris */
export function buildReviewTree(
	templates: readonly TemplateSummary[],
	nodes: ReadonlyMap<string, TreeNodeRow>
): ReviewNode[] {
	const programmes = new Map<string, ReviewNode>();
	// Ordre des enfants : position du nœud ; « Non rangé » en dernier
	const rank = new Map<string, number>();

	const child = (parent: ReviewNode, key: string, name: string, position: number): ReviewNode => {
		let n = parent.children.find((c) => c.key === key);
		if (!n) {
			n = { key, name, children: [], templateIds: [], count: emptyCount() };
			parent.children.push(n);
			rank.set(key, position);
		}
		return n;
	};

	for (const t of templates) {
		const chain = t.nodeId ? nodeChain(t.nodeId, nodes) : [];
		for (const grade of templateProgrammes(t)) {
			let programme = programmes.get(grade);
			if (!programme) {
				programme = {
					key: grade,
					name: programmeName(grade),
					children: [],
					templateIds: [],
					count: emptyCount()
				};
				programmes.set(grade, programme);
			}
			addTo(programme.count, t);
			let level = programme;
			if (chain.length === 0) {
				level = child(programme, `${grade}~${UNSORTED}`, 'Non rangé', Number.MAX_SAFE_INTEGER);
				addTo(level.count, t);
			}
			for (const node of chain) {
				level = child(level, `${grade}~${node.id}`, node.name, node.position);
				addTo(level.count, t);
			}
			level.templateIds.push(t.id);
		}
	}

	const sort = (list: ReviewNode[]) => {
		list.sort(
			(a, b) => (rank.get(a.key) ?? 0) - (rank.get(b.key) ?? 0) || a.name.localeCompare(b.name)
		);
		for (const n of list) sort(n.children);
	};
	const roots = [...programmes.values()].sort(
		(a, b) => programmeRank(a.key) - programmeRank(b.key) || a.key.localeCompare(b.key)
	);
	for (const r of roots) sort(r.children);
	return roots;
}

/** Le nœud de clé `key`, cherché dans tout l'arbre */
export function findReviewNode(tree: readonly ReviewNode[], key: string): ReviewNode | null {
	for (const n of tree) {
		if (n.key === key) return n;
		const found = findReviewNode(n.children, key);
		if (found) return found;
	}
	return null;
}

/** Le chemin (de la racine au nœud) du nœud de clé `key` ; vide s'il n'existe pas */
export function reviewNodePath(tree: readonly ReviewNode[], key: string): ReviewNode[] {
	for (const n of tree) {
		if (n.key === key) return [n];
		const below = reviewNodePath(n.children, key);
		if (below.length > 0) return [n, ...below];
	}
	return [];
}

/** Les modèles d'un nœud et de tout ce qui est en dessous, sans doublon, dans l'ordre de l'arbre */
export function templatesUnder(node: ReviewNode): string[] {
	const ids = new Set<string>(node.templateIds);
	for (const c of node.children) for (const id of templatesUnder(c)) ids.add(id);
	return [...ids];
}

/** Programme d'un code de point : ce qui précède le dernier tiret (`1SPE-224` → `1SPE`) */
function codeProgramme(code: string): string {
	const i = code.lastIndexOf('-');
	return i === -1 ? code : code.slice(0, i);
}

/** Ce qui cloche dans un modèle, lisible sans ses variations (affiché en tête de fiche) */
export function summaryAlerts(t: TemplateSummary): string[] {
	const alerts: string[] = [];
	if (t.points.length === 0) alerts.push('sans point');
	if (!t.nodeId) alerts.push('sans nœud');
	// ADR 0020 : au plus un point PAR PROGRAMME
	const perProgramme = new Map<string, number>();
	for (const p of t.points) {
		const programme = codeProgramme(p.code);
		perProgramme.set(programme, (perProgramme.get(programme) ?? 0) + 1);
	}
	for (const [programme, n] of perProgramme) {
		if (n > 1) alerts.push(`${n} points de ${programme} (ADR 0020 : un par programme)`);
	}
	if (changedSinceReview(t)) alerts.push('modifié depuis le verdict');
	return alerts;
}

export type VerdictFilter = 'tous' | Verdict | 'sans' | 'modifie';
export type StatusFilter = 'tous' | 'draft' | 'published';

export interface ReviewFilters {
	verdict: VerdictFilter;
	status: StatusFilter;
	alertsOnly: boolean;
}

export const DEFAULT_FILTERS: ReviewFilters = {
	verdict: 'tous',
	status: 'tous',
	alertsOnly: false
};

/** Le modèle passe-t-il les filtres de la vue ? */
export function matchesFilters(t: TemplateSummary, f: ReviewFilters): boolean {
	if (f.status !== 'tous' && t.status !== f.status) return false;
	if (f.alertsOnly && summaryAlerts(t).length === 0) return false;
	switch (f.verdict) {
		case 'tous':
			return true;
		case 'sans':
			return t.review === null;
		case 'modifie':
			return changedSinceReview(t);
		default:
			return t.review?.verdict === f.verdict;
	}
}

/** Les filtres lus dans l'adresse ; une valeur inconnue vaut le défaut */
export function parseFilters(params: URLSearchParams): ReviewFilters {
	const verdict = params.get('verdict');
	const status = params.get('statut');
	return {
		verdict:
			verdict === 'valide' || verdict === 'a_revoir' || verdict === 'sans' || verdict === 'modifie'
				? verdict
				: 'tous',
		status: status === 'draft' || status === 'published' ? status : 'tous',
		alertsOnly: params.get('alertes') === '1'
	};
}
