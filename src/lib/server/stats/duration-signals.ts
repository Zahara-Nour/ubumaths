/**
 * Durées trop courtes, modèle × durée (chantier `durees-trop-courtes`, PR 2)
 * ==========================================================================
 *
 * Pour le panier et l'éditeur de série : « 7 élèves sur 10 n'ont rien répondu
 * dans les 20 s ». Mêmes seuils que le bilan d'un contrôle (PR 1,
 * `TOO_SHORT_MIN_STUDENTS`, plus de la moitié). Deux sources :
 *
 * - **Contrôles blancs libres** : traces `skill_attempts` du lieu `mock_test`.
 *   La trace porte le modèle et la durée (`allotted_ms`) : aucun lien vers la
 *   série n'est nécessaire. Manquée = temps écoulé sans aucune case remplie
 *   (`part_verdicts` nul ; un choix coché est une case, Q7). Fin inconnue
 *   (« Terminer ») : écartée.
 * - **Contrôles de forme `interactive`** : réponses `test_answers`, meilleure
 *   copie de chaque élève par contrôle (`bestCopies`), durée lue dans la
 *   composition, règle de la PR 1 (`unansweredInTime`, D1). Course aux nombres
 *   hors du signal (Q4).
 *
 * Un élève compte une fois par modèle × durée, sources fusionnées ; il « n'a
 * rien répondu » seulement si TOUS ses tirages ont été manqués (Q1). Seules
 * comptent les traces et copies postérieures à la dernière modification du
 * modèle (Q8). Carte de cours (jamais de case) : écartée. Mode test du
 * professeur respecté (`profiles.is_test`).
 *
 * Tout se lit avec le client du professeur, sous la RLS existante
 * (`is_my_student`) : aucune lecture nouvelle. Aucun nom ne sort d'ici.
 *
 * @module server/stats/duration-signals
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { isCourseCard } from '$lib/questions/types';
import { TOO_SHORT_MIN_STUDENTS, type QuestionTiming } from '$lib/types/evaluation-breakdown';
import {
	DURATION_SIGNALS_MESSAGE,
	type DurationSignals,
	type DurationSignalsResult
} from '$lib/types/duration-signals';
import {
	BreakdownReadError,
	bestCopies,
	delaysByTemplate,
	readInBatches,
	unansweredInTime,
	type AnswerRow,
	type SessionRow
} from '../evaluation-breakdown';
import { readStoredSeriesMany } from '../series-lines';
import { createServerLogger } from '$lib/utils/logger';

// Types

type TypedSupabaseClient = SupabaseClient<Database>;

/** Un tirage d'un modèle à une durée, pour un élève */
export interface DurationDraw {
	studentId: string;
	templateId: string;
	delaySeconds: number;
	/** Temps écoulé sans rien répondu */
	missed: boolean;
}

/** Trace de Contrôle blanc, colonnes lues */
export interface MockTestTraceRow {
	student_id: string;
	template_id: string | null;
	allotted_ms: number | null;
	end_reason: string | null;
	part_verdicts: boolean[] | null;
}

/** Réponse d'une copie comptée, avec son élève et la composition du contrôle */
export interface ControlAnswer {
	studentId: string;
	answer: Pick<AnswerRow, 'template_id' | 'status' | 'time_spent'>;
	/** `delaysByTemplate` de la série du contrôle */
	delays: ReadonlyMap<string, number | null>;
}

interface ControlSessionRow extends SessionRow {
	evaluation_id: string | null;
}

// Constantes

const logger = createServerLogger('server/stats/duration-signals');

// Functions

/** Traces de Contrôle blanc → tirages (fin inconnue ou durée absente : écartée) */
export function mockTestDraws(traces: ReadonlyArray<MockTestTraceRow>): DurationDraw[] {
	return traces.flatMap((trace) => {
		if (!trace.template_id || !trace.allotted_ms || trace.allotted_ms <= 0) return [];
		if (trace.end_reason !== 'timeout' && trace.end_reason !== 'validated') return [];
		return [
			{
				studentId: trace.student_id,
				templateId: trace.template_id,
				delaySeconds: Math.round(trace.allotted_ms / 1000),
				missed: trace.end_reason === 'timeout' && trace.part_verdicts === null
			}
		];
	});
}

/** Réponses de contrôle → tirages (durée inconnue ou ambiguë, D1 : écartée) */
export function controlDraws(answers: ReadonlyArray<ControlAnswer>): DurationDraw[] {
	return answers.flatMap(({ studentId, answer, delays }) => {
		const delay = answer.template_id ? delays.get(answer.template_id) : undefined;
		if (!answer.template_id || delay === undefined || delay === null) return [];
		return [
			{
				studentId,
				templateId: answer.template_id,
				delaySeconds: delay,
				missed: unansweredInTime(answer, delay)
			}
		];
	});
}

/**
 * Tirages → durées observées par modèle. Un élève compte une fois par modèle ×
 * durée ; manqué seulement si tous ses tirages le sont.
 */
export function durationSignalsOf(draws: ReadonlyArray<DurationDraw>): DurationSignals {
	// Modèle → durée → élève → [tirages, tirages manqués]
	const counts = new Map<string, Map<number, Map<string, [number, number]>>>();
	for (const draw of draws) {
		const byDelay = counts.get(draw.templateId) ?? new Map<number, Map<string, [number, number]>>();
		const byStudent = byDelay.get(draw.delaySeconds) ?? new Map<string, [number, number]>();
		const count = byStudent.get(draw.studentId) ?? [0, 0];
		count[0] += 1;
		if (draw.missed) count[1] += 1;
		byStudent.set(draw.studentId, count);
		byDelay.set(draw.delaySeconds, byStudent);
		counts.set(draw.templateId, byDelay);
	}

	const signals: DurationSignals = {};
	for (const [templateId, byDelay] of counts) {
		const timings: QuestionTiming[] = [];
		for (const [delaySeconds, byStudent] of byDelay) {
			const students = byStudent.size;
			const missed = [...byStudent.values()].filter(([total, empty]) => empty === total).length;
			timings.push({
				delaySeconds,
				students,
				unansweredInTime: missed,
				tooShort: students >= TOO_SHORT_MIN_STUDENTS && missed * 2 > students
			});
		}
		signals[templateId] = timings.sort((a, b) => a.delaySeconds - b.delaySeconds);
	}
	return signals;
}

/** Postérieur à la modification du modèle (Q8) ; modèle jamais modifié : tout compte */
function isAfter(date: string | null, updatedAt: string | null | undefined): boolean {
	if (!date) return false;
	return !updatedAt || new Date(date).getTime() > new Date(updatedAt).getTime();
}

async function readMockTestTraces(
	supabase: TypedSupabaseClient,
	templateIds: string[],
	updatedAt: ReadonlyMap<string, string | null>
): Promise<MockTestTraceRow[]> {
	const rows = await readInBatches('Traces de Contrôle blanc', templateIds, (batch, from, to) =>
		supabase
			.from('skill_attempts')
			.select('id, student_id, template_id, allotted_ms, end_reason, part_verdicts, created_at')
			.in('template_id', batch)
			.eq('place', 'mock_test')
			.not('end_reason', 'is', null)
			.order('id')
			.range(from, to)
	);
	return rows.filter((r) => r.template_id && isAfter(r.created_at, updatedAt.get(r.template_id)));
}

async function readControlAnswers(
	supabase: TypedSupabaseClient,
	templateIds: string[],
	updatedAt: ReadonlyMap<string, string | null>
): Promise<ControlAnswer[]> {
	const wanted = new Set(templateIds);
	// Par pages (plafond `max_rows`) : une seule « liste » d'ids, la forme
	const evaluations = await readInBatches('Contrôles', ['interactive'], (forms, from, to) =>
		supabase
			.from('evaluations')
			.select('id, series_id')
			.in('form', forms)
			.order('id')
			.range(from, to)
	);
	if (evaluations.length === 0) return [];
	const seriesIds = [...new Set(evaluations.map((e) => e.series_id))];
	const series = await readInBatches('Séries des contrôles', seriesIds, (batch, from, to) =>
		supabase.from('series').select('id, items').in('id', batch).order('id').range(from, to)
	);
	const itemsBySeries = readStoredSeriesMany(series);

	// Contrôles dont la série porte l'un des modèles → leur composition
	const delaysByEvaluation = new Map<string, Map<string, number | null>>();
	for (const evaluation of evaluations) {
		const items = itemsBySeries.get(evaluation.series_id);
		if (!items?.some((item) => wanted.has(item.templateId))) continue;
		delaysByEvaluation.set(evaluation.id, delaysByTemplate(items));
	}
	if (delaysByEvaluation.size === 0) return [];

	const sessions: ControlSessionRow[] = await readInBatches(
		'Copies',
		[...delaysByEvaluation.keys()],
		(batch, from, to) =>
			supabase
				.from('test_sessions')
				.select('id, user_id, grade, completed_at, evaluation_id')
				.in('evaluation_id', batch)
				.not('completed_at', 'is', null)
				.order('id')
				.range(from, to)
	);
	if (sessions.length === 0) return [];

	// Toutes les réponses des copies : « copie avec réponses » se juge tous modèles confondus
	const answers = await readInBatches(
		'Réponses',
		sessions.map((s) => s.id),
		(batch, from, to) =>
			supabase
				.from('test_answers')
				.select('id, test_session_id, template_id, status, time_spent')
				.in('test_session_id', batch)
				.order('id')
				.range(from, to)
	);
	const answeredSessions = new Set(answers.map((a) => a.test_session_id));

	// Meilleure copie de chaque élève, contrôle par contrôle (règle du bilan)
	const byEvaluation = new Map<string, ControlSessionRow[]>();
	for (const s of sessions) {
		if (!s.evaluation_id) continue;
		byEvaluation.set(s.evaluation_id, [...(byEvaluation.get(s.evaluation_id) ?? []), s]);
	}
	const counted = new Map<string, ControlSessionRow>();
	for (const list of byEvaluation.values()) {
		for (const copy of bestCopies(list, answeredSessions)) counted.set(copy.id, copy);
	}

	return answers.flatMap((answer) => {
		const copy = counted.get(answer.test_session_id);
		const delays = copy?.evaluation_id ? delaysByEvaluation.get(copy.evaluation_id) : undefined;
		if (!copy?.user_id || !delays || !answer.template_id || !wanted.has(answer.template_id)) {
			return [];
		}
		if (!isAfter(copy.completed_at, updatedAt.get(answer.template_id))) return [];
		return [{ studentId: copy.user_id, answer, delays }];
	});
}

/** Élèves (rôle élève) dont `is_test` vaut le mode du professeur */
async function studentsOfMode(
	supabase: TypedSupabaseClient,
	studentIds: string[],
	isTestMode: boolean
): Promise<Set<string>> {
	const rows = await readInBatches('Élèves', studentIds, (batch, from, to) =>
		supabase
			.from('profiles')
			.select('id')
			.in('id', batch)
			// Le prof lit aussi son propre profil : ses traces ne comptent pas
			.eq('role', 'student')
			.eq('is_test', isTestMode)
			.order('id')
			.range(from, to)
	);
	return new Set(rows.map((r) => r.id));
}

/**
 * Durées observées des modèles, pour les élèves du professeur. Une lecture en
 * échec rend une erreur propre, jamais une exception.
 */
export async function getDurationSignals(
	supabase: TypedSupabaseClient,
	templateIds: readonly string[],
	isTestMode: boolean
): Promise<DurationSignalsResult> {
	const ids = [...new Set(templateIds)];
	if (ids.length === 0) return { status: 'ok', signals: {} };
	try {
		const templates = await readInBatches('Modèles', ids, (batch, from, to) =>
			supabase
				.from('question_templates')
				.select('id, updated_at, options')
				.in('id', batch)
				.order('id')
				.range(from, to)
		);
		const kept = templates.filter((t) => !isCourseCard(t));
		if (kept.length === 0) return { status: 'ok', signals: {} };
		const keptIds = kept.map((t) => t.id);
		const updatedAt = new Map(kept.map((t) => [t.id, t.updated_at]));

		const [traces, answers] = await Promise.all([
			readMockTestTraces(supabase, keptIds, updatedAt),
			readControlAnswers(supabase, keptIds, updatedAt)
		]);
		const draws = [...mockTestDraws(traces), ...controlDraws(answers)];
		if (draws.length === 0) return { status: 'ok', signals: {} };

		const allowed = await studentsOfMode(
			supabase,
			[...new Set(draws.map((d) => d.studentId))],
			isTestMode
		);
		return {
			status: 'ok',
			signals: durationSignalsOf(draws.filter((d) => allowed.has(d.studentId)))
		};
	} catch (e) {
		if (!(e instanceof BreakdownReadError)) {
			logger.error('[getDurationSignals] Échec inattendu :', e);
		}
		return { status: 'error', message: DURATION_SIGNALS_MESSAGE };
	}
}
