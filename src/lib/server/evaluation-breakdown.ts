/**
 * Bilan d'un contrôle par question et par notion (chantier `bilan-controle`, P6)
 * ==============================================================================
 *
 * Pour le professeur, sur la page résultats d'un contrôle : quelles questions
 * ont été ratées, quelles notions sont fragiles.
 *
 * - **Copie comptée** : la MEILLEURE de chaque élève (même règle que la note
 *   affichée, `bestGrade`) ; à note égale, une copie avec réponses, puis la plus
 *   récente. Copies rendues seulement.
 * - **Copie en retard** : note 0, aucune réponse écrite → hors du bilan, comptée
 *   à part.
 * - **Question** = un modèle de la série (ADR 0035) : ses tirages s'additionnent.
 * - **Notion** : modèle → points du programme → nœud du point, remonté jusqu'à
 *   la notion. Un modèle à plusieurs notions compte dans chacune.
 * - **Partiel** : forme non optimale (½ point). La mauvaise forme vaut 0 point
 *   (`pointsOfStatus`) : elle compte en « faux » (David, 2026-11-14).
 * - **Durée sans doute trop courte** (chantier `durees-trop-courtes`, P7) : par
 *   question, sur les mêmes copies, les élèves qui ont laissé le chrono
 *   s'écouler sans rien répondre (réponse « sans réponse » ET temps déclaré ≥
 *   durée − 1 s). Signalée à partir de 5 élèves, au-delà de la moitié. Durée lue
 *   dans la composition (verrouillée dès la première séance) ; Course aux
 *   nombres hors du signal (chrono global).
 *
 * Tout se lit avec le client du professeur, sous la RLS existante : aucune
 * donnée de plus n'est lisible. Une lecture en échec rend une erreur PROPRE AU
 * BILAN (la page garde ses cartes et son tableau), jamais un bilan faux.
 *
 * @module server/evaluation-breakdown
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	BREAKDOWN_ERROR_MESSAGE,
	DELETED_TEMPLATE_LABEL,
	NO_NOTION_LABEL,
	TOO_SHORT_MIN_STUDENTS,
	UNKNOWN_TEMPLATE_LABEL,
	type BreakdownCounts,
	type BreakdownTally,
	type EvaluationBreakdown,
	type NotionBreakdown,
	type QuestionBreakdown,
	type QuestionTiming
} from '$lib/types/evaluation-breakdown';
import type { EvaluationForm } from '$lib/types/evaluation';
import { DEFAULT_QUESTION_DELAY_SECONDS } from '$lib/questions/series-items';
import { createServerLogger } from '$lib/utils/logger';

// Types

type TypedSupabaseClient = SupabaseClient<Database>;

export interface SessionRow {
	id: string;
	user_id: string | null;
	grade: number | null;
	completed_at: string | null;
}

interface AnswerRow {
	test_session_id: string;
	template_id: string | null;
	status: string | null;
	points: number | null;
	/** Secondes passées, déclarées par la page (entières) ; null si absentes */
	time_spent: number | null;
}

interface NodeRow {
	id: string;
	name: string;
	kind: string;
	parent_id: string | null;
}

/** Tout ce que le calcul consomme, déjà lu */
export interface BreakdownInput {
	/** Forme du contrôle : la Course aux nombres n'a pas de durée par question */
	form: EvaluationForm;
	/** Lignes de la série, dans l'ordre de la composition (durée 0 ou absente : défaut) */
	items: ReadonlyArray<{ templateId: string; delay?: number }>;
	sessions: ReadonlyArray<SessionRow>;
	answers: ReadonlyArray<AnswerRow>;
	templates: ReadonlyArray<{ id: string; title: string }>;
	templatePoints: ReadonlyArray<{ template_id: string; point_id: string }>;
	points: ReadonlyArray<{ id: string; node_id: string }>;
	nodes: ReadonlyArray<NodeRow>;
}

/** Échec d'une lecture : la cause est journalisée, le bilan dit son erreur */
export class BreakdownReadError extends Error {}

// Constantes

const logger = createServerLogger('server/evaluation-breakdown');

/** Plafond de lignes par requête PostgREST (`max_rows`) */
const PAGE_SIZE = 1000;

/** Identifiants par requête (`.in(...)`) : l'adresse reste courte */
const ID_BATCH_SIZE = 100;

/** Profondeur maximale de l'arbre (branche › notion › sous-notion), avec marge */
const MAX_NODE_DEPTH = 6;

/** Clé de la ligne « modèle supprimé » (template_id nul) */
const DELETED_KEY = '';

// Functions

function emptyTally(): BreakdownTally {
	return {
		answers: 0,
		pointsEarned: 0,
		successRate: null,
		correct: 0,
		partial: 0,
		incorrect: 0,
		empty: 0
	};
}

/** Statut enregistré → colonne du bilan (statut inconnu ou nul : sans réponse) */
function columnOf(status: string | null): keyof BreakdownCounts {
	switch (status) {
		case 'correct':
			return 'correct';
		case 'unoptimal_form':
			return 'partial';
		// Mauvaise forme : 0 point (`pointsOfStatus`), rangée avec les réponses fausses
		case 'bad_form':
		case 'incorrect':
			return 'incorrect';
		default:
			return 'empty';
	}
}

/** Points d'une réponse : 1, ½ ou 0 (comme la relecture d'une copie) */
function pointsOf(points: number | null): number {
	const value = Number(points ?? 0);
	return value === 1 ? 1 : value === 0.5 ? 0.5 : 0;
}

function add(tally: BreakdownTally, answer: AnswerRow): void {
	tally.answers += 1;
	tally.pointsEarned += pointsOf(answer.points);
	tally[columnOf(answer.status)] += 1;
}

function withRate<T extends BreakdownTally>(tally: T): T {
	return {
		...tally,
		successRate: tally.answers > 0 ? (tally.pointsEarned / tally.answers) * 100 : null
	};
}

/**
 * Meilleure copie rendue de chaque élève. Ordre : note la plus haute, puis une
 * copie avec réponses (une copie en retard n'en a aucune), puis la plus récente.
 */
export function bestCopies(
	sessions: ReadonlyArray<SessionRow>,
	answeredSessions: ReadonlySet<string>
): SessionRow[] {
	const best = new Map<string, SessionRow>();
	const better = (a: SessionRow, b: SessionRow): boolean => {
		const gradeA = a.grade === null ? -Infinity : Number(a.grade);
		const gradeB = b.grade === null ? -Infinity : Number(b.grade);
		if (gradeA !== gradeB) return gradeA > gradeB;
		const answeredA = answeredSessions.has(a.id);
		if (answeredA !== answeredSessions.has(b.id)) return answeredA;
		return (a.completed_at ?? '') > (b.completed_at ?? '');
	};
	for (const session of sessions) {
		if (!session.user_id || !session.completed_at) continue;
		const current = best.get(session.user_id);
		if (!current || better(session, current)) best.set(session.user_id, session);
	}
	return [...best.values()];
}

/** Nœud d'un point → sa notion (le nœud lui-même ou un ancêtre), ou null */
function notionOf(nodeId: string, nodes: ReadonlyMap<string, NodeRow>): NodeRow | null {
	let node = nodes.get(nodeId);
	for (let depth = 0; node && depth < MAX_NODE_DEPTH; depth++) {
		if (node.kind === 'notion') return node;
		node = node.parent_id ? nodes.get(node.parent_id) : undefined;
	}
	return null;
}

/** Modèle → ids des notions qu'il travaille (sans doublon ; vide : sans notion) */
function notionsByTemplate(input: BreakdownInput): Map<string, Set<string>> {
	const nodes = new Map(input.nodes.map((n) => [n.id, n]));
	const nodeOfPoint = new Map(input.points.map((p) => [p.id, p.node_id]));
	const result = new Map<string, Set<string>>();
	for (const link of input.templatePoints) {
		const nodeId = nodeOfPoint.get(link.point_id);
		const notion = nodeId ? notionOf(nodeId, nodes) : null;
		if (!notion) continue;
		const set = result.get(link.template_id) ?? new Set<string>();
		set.add(notion.id);
		result.set(link.template_id, set);
	}
	return result;
}

/** Durée d'une ligne de série, comme au tirage (`drawSeriesQuestions`) */
function delayOf(item: { delay?: number }): number {
	return item.delay && item.delay > 0 ? item.delay : DEFAULT_QUESTION_DELAY_SECONDS;
}

/**
 * Modèle → sa durée dans la série ; null quand il est sur deux lignes à durées
 * différentes (D1 : la durée de chaque élève n'est pas lisible ici).
 */
function delaysByTemplate(items: BreakdownInput['items']): Map<string, number | null> {
	const delays = new Map<string, number | null>();
	for (const item of items) {
		const delay = delayOf(item);
		const known = delays.get(item.templateId);
		delays.set(item.templateId, known === undefined || known === delay ? delay : null);
	}
	return delays;
}

/** Laissée sans réponse jusqu'au bout du chrono (secondes entières déclarées) */
function unansweredInTime(answer: AnswerRow, delaySeconds: number): boolean {
	if (columnOf(answer.status) !== 'empty' || answer.time_spent === null) return false;
	return Number(answer.time_spent) >= delaySeconds - 1;
}

/**
 * Temps imparti, par modèle, sur les réponses des copies comptées (une copie
 * par élève). Un élève compte une fois par modèle ; tiré plusieurs fois, il
 * compte « sans réponse à temps » s'il l'a été pour au moins la moitié de ses
 * tirages.
 */
export function timingsOf(
	answers: ReadonlyArray<AnswerRow>,
	delays: ReadonlyMap<string, number | null>
): Map<string, QuestionTiming> {
	// Modèle → copie → [tirages, tirages sans réponse à temps]
	const draws = new Map<string, Map<string, [number, number]>>();
	for (const answer of answers) {
		const delay = answer.template_id ? delays.get(answer.template_id) : undefined;
		if (!answer.template_id || delay === undefined || delay === null) continue;
		const bySession = draws.get(answer.template_id) ?? new Map<string, [number, number]>();
		const count = bySession.get(answer.test_session_id) ?? [0, 0];
		count[0] += 1;
		if (unansweredInTime(answer, delay)) count[1] += 1;
		bySession.set(answer.test_session_id, count);
		draws.set(answer.template_id, bySession);
	}

	const timings = new Map<string, QuestionTiming>();
	for (const [templateId, delay] of delays) {
		if (delay === null) continue;
		const counts = [...(draws.get(templateId)?.values() ?? [])];
		const students = counts.length;
		const missed = counts.filter(([total, empty]) => empty * 2 >= total).length;
		timings.set(templateId, {
			delaySeconds: delay,
			students,
			unansweredInTime: missed,
			tooShort: students >= TOO_SHORT_MIN_STUDENTS && missed * 2 > students
		});
	}
	return timings;
}

/** Calcul pur du bilan, sur des données déjà lues */
export function computeEvaluationBreakdown(input: BreakdownInput): EvaluationBreakdown {
	const answeredSessions = new Set(input.answers.map((a) => a.test_session_id));
	const copies = bestCopies(input.sessions, answeredSessions);
	const counted = new Set(copies.filter((c) => answeredSessions.has(c.id)).map((c) => c.id));
	const lateCopies = copies.length - counted.size;

	// Par question : lignes de la série d'abord (ordre de la composition)
	const titles = new Map(input.templates.map((t) => [t.id, t.title]));
	const questions = new Map<string, QuestionBreakdown>();
	const questionOf = (templateId: string | null): QuestionBreakdown => {
		const key = templateId ?? DELETED_KEY;
		let row = questions.get(key);
		if (!row) {
			const title =
				templateId === null
					? DELETED_TEMPLATE_LABEL
					: (titles.get(templateId) ?? UNKNOWN_TEMPLATE_LABEL);
			row = { templateId, title, timing: null, ...emptyTally() };
			questions.set(key, row);
		}
		return row;
	};
	for (const item of input.items) questionOf(item.templateId);

	// Par notion
	const nodes = new Map(input.nodes.map((n) => [n.id, n]));
	const notionIds = notionsByTemplate(input);
	const notions = new Map<string | null, NotionBreakdown>();
	const notionRow = (notionId: string | null): NotionBreakdown => {
		let row = notions.get(notionId);
		if (!row) {
			const notion = notionId ? nodes.get(notionId) : undefined;
			const parent = notion?.parent_id ? nodes.get(notion.parent_id) : undefined;
			row = {
				notionId,
				branch: parent?.kind === 'branch' ? parent.name : null,
				notion: notion?.name ?? NO_NOTION_LABEL,
				...emptyTally()
			};
			notions.set(notionId, row);
		}
		return row;
	};

	for (const answer of input.answers) {
		if (!counted.has(answer.test_session_id)) continue;
		add(questionOf(answer.template_id), answer);
		const ids = answer.template_id ? notionIds.get(answer.template_id) : undefined;
		if (!ids || ids.size === 0) add(notionRow(null), answer);
		else for (const id of ids) add(notionRow(id), answer);
	}

	// Durée sans doute trop courte : contrôle chronométré par question seulement (Q4)
	if (input.form === 'interactive') {
		const countedAnswers = input.answers.filter((a) => counted.has(a.test_session_id));
		for (const [templateId, timing] of timingsOf(countedAnswers, delaysByTemplate(input.items))) {
			const row = questions.get(templateId);
			if (row) row.timing = timing;
		}
	}

	const notionRows = [...notions.values()].map(withRate).sort((a, b) => {
		// « Sans notion » en dernier ; sinon du taux le plus faible au plus fort
		if ((a.notionId === null) !== (b.notionId === null)) return a.notionId === null ? 1 : -1;
		const byRate = (a.successRate ?? 0) - (b.successRate ?? 0);
		if (byRate !== 0) return byRate;
		return `${a.branch ?? ''} ${a.notion}`.localeCompare(`${b.branch ?? ''} ${b.notion}`, 'fr');
	});

	return {
		status: 'ok',
		copies: counted.size,
		lateCopies,
		questions: [...questions.values()].map(withRate),
		notions: notionRows
	};
}

/** Résultat d'une requête : ses lignes, ou une erreur journalisée */
export function rowsOf<T>(what: string, result: { data: T[] | null; error: unknown }): T[] {
	if (result.error) {
		logger.error(`[getEvaluationBreakdown] ${what} illisibles :`, result.error);
		throw new BreakdownReadError(what);
	}
	return result.data ?? [];
}

/**
 * Lignes filtrées par une liste d'identifiants : par lots (l'adresse de la
 * requête porte chaque identifiant), chaque lot par pages (plafond `max_rows`
 * de PostgREST). La requête doit trier sur une colonne unique.
 */
export async function readInBatches<T>(
	what: string,
	ids: readonly string[],
	query: (
		batch: string[],
		from: number,
		to: number
	) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
	const rows: T[] = [];
	for (let start = 0; start < ids.length; start += ID_BATCH_SIZE) {
		const batch = ids.slice(start, start + ID_BATCH_SIZE);
		for (let from = 0; ; from += PAGE_SIZE) {
			const page = rowsOf(what, await query(batch, from, from + PAGE_SIZE - 1));
			rows.push(...page);
			if (page.length < PAGE_SIZE) break;
		}
	}
	return rows;
}

/** Nœuds des points et leurs ancêtres, niveau par niveau */
async function readNodes(supabase: TypedSupabaseClient, nodeIds: string[]): Promise<NodeRow[]> {
	const found = new Map<string, NodeRow>();
	let pending = [...new Set(nodeIds)];
	for (let depth = 0; pending.length > 0 && depth < MAX_NODE_DEPTH; depth++) {
		const rows = rowsOf(
			'Notions',
			await supabase
				.from('classification_nodes')
				.select('id, name, kind, parent_id')
				.in('id', pending)
		);
		for (const row of rows) found.set(row.id, row);
		pending = [
			...new Set(rows.flatMap((r) => (r.parent_id && !found.has(r.parent_id) ? [r.parent_id] : [])))
		];
	}
	return [...found.values()];
}

/**
 * Bilan d'un contrôle pour la page résultats du professeur.
 *
 * @param studentIds - les élèves du tableau des résultats (mode test déjà
 *   appliqué par `getEvaluationResults`) : seules leurs copies comptent
 */
export async function getEvaluationBreakdown(
	supabase: TypedSupabaseClient,
	evaluation: {
		id: string;
		form: EvaluationForm;
		series: { items: ReadonlyArray<{ templateId: string; delay?: number }> };
	},
	studentIds: string[]
): Promise<EvaluationBreakdown> {
	const { form } = evaluation;
	const items = evaluation.series.items;
	try {
		const sessions = await readInBatches('Copies', studentIds, (batch, from, to) =>
			supabase
				.from('test_sessions')
				.select('id, user_id, grade, completed_at')
				.eq('evaluation_id', evaluation.id)
				.in('user_id', batch)
				.not('completed_at', 'is', null)
				.order('id')
				.range(from, to)
		);
		const answers = await readInBatches(
			'Réponses',
			sessions.map((s) => s.id),
			(batch, from, to) =>
				supabase
					.from('test_answers')
					.select('test_session_id, template_id, status, points, time_spent')
					.in('test_session_id', batch)
					.order('id')
					.range(from, to)
		);

		const templateIds = [
			...new Set([
				...items.map((i) => i.templateId),
				...answers.flatMap((a) => (a.template_id ? [a.template_id] : []))
			])
		];
		if (templateIds.length === 0) {
			return computeEvaluationBreakdown({
				form,
				items,
				sessions,
				answers,
				templates: [],
				templatePoints: [],
				points: [],
				nodes: []
			});
		}

		const [templatesRes, linksRes] = await Promise.all([
			supabase.from('question_templates').select('id, title').in('id', templateIds),
			supabase
				.from('question_template_points')
				.select('template_id, point_id')
				.in('template_id', templateIds)
		]);
		const templates = rowsOf('Modèles', templatesRes);
		const templatePoints = rowsOf('Points des modèles', linksRes);

		const pointIds = [...new Set(templatePoints.map((l) => l.point_id))];
		const points =
			pointIds.length === 0
				? []
				: rowsOf(
						'Points du programme',
						await supabase.from('curriculum_points').select('id, node_id').in('id', pointIds)
					);
		const nodes = await readNodes(
			supabase,
			points.map((p) => p.node_id)
		);

		return computeEvaluationBreakdown({
			form,
			items,
			sessions,
			answers,
			templates,
			templatePoints,
			points,
			nodes
		});
	} catch (e) {
		if (!(e instanceof BreakdownReadError)) {
			logger.error('[getEvaluationBreakdown] Échec inattendu :', e);
		}
		return { status: 'error', message: BREAKDOWN_ERROR_MESSAGE };
	}
}
