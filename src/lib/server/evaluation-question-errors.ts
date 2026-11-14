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
 * - **Sans réponse** (réponse absente ou statut vide) : comptée à part, jamais
 *   listée.
 * - **Groupe** : même énoncé tiré ET même réponse (les tirages sont aléatoires :
 *   deux réponses identiques ne se comparent qu'à énoncé identique). L'énoncé se
 *   compare sans la position dans la copie ni les métadonnées de génération
 *   (`generatedAt`, `seed`), qui diffèrent d'un tirage à l'autre sans changer le
 *   texte posé.
 * - **Cases ratées** : seulement pour une question à plusieurs cases hors QCM,
 *   sur les réponses dont le détail par case est disponible.
 *
 * Tout se lit avec le client du professeur, sous la RLS existante. Une lecture
 * en échec rend une erreur propre au panneau, jamais une exception.
 *
 * @module server/evaluation-question-errors
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { QuestionInstance, ValidationStatus } from '$lib/questions/types';
import type { CorrectedDetail } from '$lib/types/evaluation-attempt';
import {
	QUESTION_ERRORS_MESSAGE,
	type BlankErrorStat,
	type EvaluationQuestionErrors,
	type QuestionErrorGroup
} from '$lib/types/evaluation-breakdown';
import { detailsWithinBudget, type DetailBudget } from './corrected-detail';
import {
	BreakdownReadError,
	bestCopies,
	readInBatches,
	type SessionRow
} from './evaluation-breakdown';
import { createServerLogger } from '$lib/utils/logger';

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

const DEFAULT_NAME = 'Élève';

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
	// Réponses « avec réponse » : valeurs présentes ET statut connu
	const answered = rows.filter((row) => {
		const status = row.status;
		return valuesOf(row.userAnswer) !== null && status !== null && status !== 'empty';
	});
	const withoutAnswer = rows.length - answered.length;

	const details = detailsWithinBudget(
		answered.map((row) => ({
			instance: servedInstance(row.instance),
			answer: { values: valuesOf(row.userAnswer) ?? [] },
			status: row.status as ValidationStatus
		})),
		budget
	);

	// Groupes : énoncé tiré identique ET réponse identique
	const groups = new Map<string, QuestionErrorGroup>();
	// Cases : par numéro de case, sur les détails disponibles (hors QCM)
	const stats = new Map<number, BlankErrorStat>();
	let blankCount = 0;
	let choice = false;

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
		else
			groups.set(key, {
				instance: servedInstance(row.instance),
				values,
				status,
				verdict: detail,
				students: [row.studentName]
			});
	});

	const sorted = [...groups.values()]
		.map((g) => ({ ...g, students: [...g.students].sort((a, b) => a.localeCompare(b, 'fr')) }))
		.sort((a, b) => b.students.length - a.students.length);

	return {
		status: 'ok',
		answers: rows.length,
		withoutAnswer,
		blanks: blankCount >= 2 && !choice ? [...stats.values()].sort((a, b) => a.blank - b.blank) : [],
		groups: sorted
	};
}

/** Nom affiché d'un élève, en texte brut */
function displayName(student: StudentName | undefined): string {
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
