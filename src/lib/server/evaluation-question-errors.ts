/**
 * Erreurs de la classe sur une question d'un contrôle (chantier
 * `erreurs-frequentes`, PR 1)
 * ======================================================================
 *
 * Pour le professeur : un clic sur une ligne du bilan par question montre les
 * réponses fausses ou partielles de la classe.
 *
 * - **Copies comptées** : celles du bilan (`bestCopies`, la meilleure copie
 *   rendue de chaque élève ; copies en retard exclues).
 * - **Sans réponse** : selon le statut seul, comme le bilan (statut vide ou
 *   inconnu) ; comptée à part, jamais listée. Une réponse fausse sans valeur
 *   enregistrée est listée, avec une réponse vide.
 * - **Groupe** : même énoncé tiré ET même réponse (les tirages sont aléatoires :
 *   deux réponses identiques ne se comparent qu'à énoncé identique). L'énoncé se
 *   compare sans la position dans la copie ni les métadonnées de génération
 *   (`generatedAt`, `seed`), qui diffèrent d'un tirage à l'autre sans changer le
 *   texte posé.
 * - **Cases ratées** : seulement pour une question à plusieurs cases hors QCM,
 *   sur les réponses dont le détail par case est disponible.
 * - **Types d'erreur** (chantier `type-erreur`, PR 2) : chaque case fausse d'un
 *   groupe porte son type quand il est reconnu (`answerErrorKinds`) ; la question
 *   compte les cases fausses par type, chaque élève du groupe compté une fois.
 *   Une erreur prévue par l'auteur (chantier `idees-format`, idée 3) compte sous
 *   son nom, à côté des types devinés ; deux types de même nom font un compte.
 * - **En QCM** (idée 4) : un groupe posé en QCM depuis ses erreurs prévues le
 *   dit (`asChoice`), mention « en QCM » pour le professeur.
 *
 * Tout se lit avec le client du professeur, sous la RLS existante. Une lecture
 * en échec rend une erreur propre au panneau, jamais une exception.
 *
 * @module server/evaluation-question-errors
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import type { QuestionInstance, ValidationStatus } from '#lib/questions/types.ts';
import type { CorrectedDetail } from '#lib/types/evaluation-attempt.ts';
import {
	QUESTION_ERRORS_MESSAGE,
	type BlankErrorStat,
	type ErrorKindCount,
	type EvaluationQuestionErrors,
	type QuestionErrorGroup
} from '#lib/types/evaluation-breakdown.ts';
import {
	ERROR_KIND_LABELS,
	ERROR_KIND_ORDER,
	answerErrorKinds,
	type BlankErrorKind
} from '#lib/questions/error-kinds.ts';
import { isAnsweredAsChoice } from '#lib/questions/choice-from-errors.ts';
import { detailsWithinBudget, type DetailBudget } from './corrected-detail';
import {
	BreakdownReadError,
	bestCopies,
	readInBatches,
	type SessionRow
} from './evaluation-breakdown';
import { createServerLogger } from '#lib/utils/logger.ts';

// Types

type TypedSupabaseClient = SupabaseClient<Database>;

/** Une réponse d'une copie comptée, telle que lue en base */
export interface QuestionErrorAnswer {
	studentName: string;
	/** `test_answers.question_instance` (porte la clé `attemptPosition`) */
	instance: unknown;
	/** `test_answers.user_answer` */
	userAnswer: unknown;
	status: string | null;
	/**
	 * Verdict déjà connu (trace de série : verdict par case stocké, PR 2) ; absent :
	 * recalculé dans le budget de la relecture d'une copie
	 */
	verdict?: CorrectedDetail;
}

export interface StudentName {
	id: string;
	firstname: string | null;
	lastname: string | null;
}

// Constantes

const logger = createServerLogger('server/evaluation-question-errors');

/** Clé de la position dans la copie, rangée dans l'instance à l'écriture */
const POSITION_KEY = 'attemptPosition';

/** Métadonnées de génération : jamais comparées */
const GENERATION_KEYS: readonly string[] = [POSITION_KEY, 'generatedAt', 'seed'];

const WRONG_STATUSES: readonly string[] = ['incorrect', 'bad_form', 'unoptimal_form'];

/** Statuts comptés « avec réponse » par le bilan ; tout autre statut = sans réponse */
const ANSWERED_STATUSES: readonly string[] = ['correct', ...WRONG_STATUSES];

const DEFAULT_NAME = 'Élève';

/** Rang des types devinés à égalité : après toutes les erreurs prévues */
const GUESSED_RANK = Number.MAX_SAFE_INTEGER / 2;

// Functions

/** JSON à clés triées : deux objets de même contenu donnent la même chaîne */
function stableStringify(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, v]) => v !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
		return `{${entries.join(',')}}`;
	}
	return JSON.stringify(value) ?? 'null';
}

/** Instance rangée en base → instance sans position ni métadonnées d'un tirage */
function plainInstance(stored: unknown): Record<string, unknown> {
	const source = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
	return Object.fromEntries(Object.entries(source).filter(([k]) => !GENERATION_KEYS.includes(k)));
}

/** Instance servie : sans la position dans la copie */
function servedInstance(stored: unknown): QuestionInstance {
	const source = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
	return Object.fromEntries(
		Object.entries(source).filter(([k]) => k !== POSITION_KEY)
	) as unknown as QuestionInstance;
}

/** `user_answer` enregistré → une valeur par case, ou null (aucune réponse) */
function valuesOf(userAnswer: unknown): string[] | null {
	if (!userAnswer || typeof userAnswer !== 'object' || !('value' in userAnswer)) return null;
	const value = (userAnswer as { value: unknown }).value;
	return Array.isArray(value) ? value.map(String) : null;
}

/** Motif enregistré d'une question (ex. non corrigée faute de temps), ou undefined */
function feedbackOf(userAnswer: unknown): string | undefined {
	if (!userAnswer || typeof userAnswer !== 'object' || !('feedback' in userAnswer))
		return undefined;
	const feedback = (userAnswer as { feedback: unknown }).feedback;
	return typeof feedback === 'string' ? feedback : undefined;
}

/** Statut enregistré → statut de validation, ou null (statut vide ou inconnu) */
function wrongStatus(status: string | null): ValidationStatus | null {
	return status !== null && WRONG_STATUSES.includes(status) ? (status as ValidationStatus) : null;
}

function hasChoiceBlank(instance: unknown): boolean {
	const blanks = plainInstance(instance).blanks;
	return (
		Array.isArray(blanks) && blanks.some((b) => (b as { type?: unknown } | null)?.type === 'choice')
	);
}

/** Calcul pur sur les réponses des copies comptées pour UN modèle */
export function computeQuestionErrors(
	rows: ReadonlyArray<QuestionErrorAnswer>,
	budget: DetailBudget = {}
): Extract<EvaluationQuestionErrors, { status: 'ok' }> {
	// « Avec réponse » selon le STATUT seul, comme le bilan (`columnOf`) : les
	// comptes du panneau et de la ligne du bilan ne peuvent pas diverger
	const answered = rows.filter(
		(row) => row.status !== null && ANSWERED_STATUSES.includes(row.status)
	);
	const withoutAnswer = rows.length - answered.length;

	// Verdict recalculé seulement pour les réponses qui n'en portent pas
	const toCompute = answered.filter((row) => row.verdict === undefined);
	const computed = detailsWithinBudget(
		toCompute.map((row) => {
			const values = valuesOf(row.userAnswer);
			const feedback = feedbackOf(row.userAnswer);
			return {
				instance: servedInstance(row.instance),
				answer: values === null ? null : { values },
				status: row.status as ValidationStatus,
				// Question non corrigée faute de temps : jamais recalculée (détail indisponible)
				...(feedback !== undefined && { feedback })
			};
		}),
		budget
	);
	let next = 0;
	const details: CorrectedDetail[] = answered.map((row) => row.verdict ?? computed[next++]);

	// Groupes : énoncé tiré identique ET réponse identique
	const groups = new Map<string, QuestionErrorGroup>();
	// Cases : par numéro de case, sur les détails disponibles (hors QCM)
	const stats = new Map<number, BlankErrorStat>();
	let blankCount = 0;
	let choice = false;
	// Cases fausses sans type, par groupe (le type d'un groupe se calcule une fois)
	const unrecognizedByGroup = new Map<string, number>();

	answered.forEach((row, i) => {
		const detail: CorrectedDetail = details[i];
		const values = valuesOf(row.userAnswer) ?? [];
		if (hasChoiceBlank(row.instance)) choice = true;

		if (!('unavailable' in detail)) {
			const judged = detail.blanks.filter((b) => !b.ungraded);
			blankCount = Math.max(blankCount, judged.length);
			judged.forEach((blank, position) => {
				const stat = stats.get(position + 1) ?? { blank: position + 1, errors: 0, answers: 0 };
				stat.answers += 1;
				if (blank.status !== 'correct') stat.errors += 1;
				stats.set(position + 1, stat);
			});
		}

		const status = wrongStatus(row.status);
		if (status === null) return;
		const key = `${stableStringify(plainInstance(row.instance))}\u0000${stableStringify(values)}`;
		const existing = groups.get(key);
		if (existing) existing.students.push(row.studentName);
		else {
			const instance = servedInstance(row.instance);
			const kinds = answerErrorKinds(instance, detail, values, status);
			unrecognizedByGroup.set(key, kinds.unrecognized);
			groups.set(key, {
				instance,
				values,
				status,
				verdict: detail,
				students: [row.studentName],
				errorKinds: kinds.kinds,
				asChoice: isAnsweredAsChoice(instance)
			});
		}
	});

	// Comptes par nom : chaque case typée d'un groupe, une fois par élève
	const kindCounts = new Map<string, { count: number; rank: number }>();
	let unrecognized = 0;
	for (const [key, group] of groups) {
		const weight = group.students.length;
		for (const kind of group.errorKinds) {
			const { label, rank } = countKey(kind, kindCounts.size);
			const current = kindCounts.get(label);
			kindCounts.set(label, {
				count: (current?.count ?? 0) + weight,
				rank: Math.min(current?.rank ?? rank, rank)
			});
		}
		unrecognized += (unrecognizedByGroup.get(key) ?? 0) * weight;
	}
	const errorKinds: ErrorKindCount[] = [...kindCounts]
		.sort(([, a], [, b]) => b.count - a.count || a.rank - b.rank)
		.map(([label, { count }]) => ({ label, count }));

	const sorted = [...groups.values()]
		.map((g) => ({ ...g, students: [...g.students].sort((a, b) => a.localeCompare(b, 'fr')) }))
		.sort((a, b) => b.students.length - a.students.length);

	return {
		status: 'ok',
		answers: rows.length,
		withoutAnswer,
		blanks: blankCount >= 2 && !choice ? [...stats.values()].sort((a, b) => a.blank - b.blank) : [],
		groups: sorted,
		errorKinds,
		unrecognized
	};
}

/**
 * Nom sous lequel une case typée compte, et son rang à égalité : les erreurs
 * prévues d'abord, dans l'ordre où elles apparaissent, puis les types devinés
 * dans leur ordre (la puissance de 10 compte sans son facteur)
 */
function countKey(kind: BlankErrorKind, seen: number): { label: string; rank: number } {
	if ('expected' in kind) return { label: kind.expected, rank: seen };
	return {
		label: ERROR_KIND_LABELS[kind.guess.kind],
		rank: GUESSED_RANK + ERROR_KIND_ORDER.indexOf(kind.guess.kind)
	};
}

/** Nom affiché d'un élève, en texte brut */
export function displayName(student: StudentName | undefined): string {
	const name = [student?.firstname, student?.lastname].filter(Boolean).join(' ').trim();
	return name || DEFAULT_NAME;
}

/**
 * Erreurs de la classe sur un modèle d'un contrôle.
 *
 * @param students - les élèves du tableau des résultats (mode test déjà
 *   appliqué) : seules leurs copies comptent, et leurs noms sont servis
 */
export async function getEvaluationQuestionErrors(
	supabase: TypedSupabaseClient,
	evaluation: { id: string },
	students: ReadonlyArray<StudentName>,
	templateId: string
): Promise<EvaluationQuestionErrors> {
	try {
		const sessions: SessionRow[] = await readInBatches(
			'Copies',
			students.map((s) => s.id),
			(batch, from, to) =>
				supabase
					.from('test_sessions')
					.select('id, user_id, grade, completed_at')
					.eq('evaluation_id', evaluation.id)
					.in('user_id', batch)
					.not('completed_at', 'is', null)
					.order('id')
					.range(from, to)
		);
		const sessionIds = sessions.map((s) => s.id);
		// Copies avec réponses, TOUS modèles confondus : même règle que le bilan
		// (`getEvaluationBreakdown`), sinon la copie retenue pourrait différer
		const answeredRows = await readInBatches(
			'Copies avec réponses',
			sessionIds,
			(batch, from, to) =>
				supabase
					.from('test_answers')
					.select('id, test_session_id')
					.in('test_session_id', batch)
					.order('id')
					.range(from, to)
		);
		const answers = await readInBatches('Réponses', sessionIds, (batch, from, to) =>
			supabase
				.from('test_answers')
				.select('test_session_id, question_instance, user_answer, status')
				.in('test_session_id', batch)
				.eq('template_id', templateId)
				.order('id')
				.range(from, to)
		);

		// Copie comptée : la meilleure de chaque élève, avec réponses (copie en retard exclue)
		const answeredSessions = new Set(answeredRows.map((a) => a.test_session_id));
		const counted = new Map(
			bestCopies(sessions, answeredSessions)
				.filter((c) => answeredSessions.has(c.id) && c.user_id)
				.map((c) => [c.id, c.user_id as string])
		);
		const byId = new Map(students.map((s) => [s.id, s]));

		const rows: QuestionErrorAnswer[] = answers.flatMap((a) => {
			const userId = counted.get(a.test_session_id);
			if (!userId) return [];
			return [
				{
					studentName: displayName(byId.get(userId)),
					instance: a.question_instance,
					userAnswer: a.user_answer,
					status: a.status
				}
			];
		});

		return computeQuestionErrors(rows);
	} catch (e) {
		if (!(e instanceof BreakdownReadError)) {
			logger.error('[getEvaluationQuestionErrors] Échec inattendu :', e);
		}
		return { status: 'error', message: QUESTION_ERRORS_MESSAGE };
	}
}
