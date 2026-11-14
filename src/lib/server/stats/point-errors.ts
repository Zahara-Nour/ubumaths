/**
 * Erreurs de la classe sur un point du programme (chantier
 * `erreurs-frequentes`, PR 2)
 * ======================================================================
 *
 * Pour le professeur, depuis « Top points à remédier » : pour chaque modèle du
 * point, les mêmes blocs que le bilan d'un contrôle (PR 1, `computeQuestionErrors`),
 * à partir de deux sources (décision Q6 du 2026-11-14) :
 *
 * - **Contrôles** : réponses `test_answers` des élèves de la classe, meilleure
 *   copie de chaque élève **pour chaque contrôle** (`bestCopies`, règle du
 *   bilan). L'énoncé tiré est stocké entier : aucun filtre de date.
 * - **Séries** (Saisie, Contrôle blanc, Course aux nombres) : traces
 *   `skill_attempts` avec graine, **postérieures à la dernière modification du
 *   modèle** (graine + modèle modifié = relecture fausse, décision du
 *   2026-11-11). L'énoncé est rejoué par `generateInstance` ; réussie = juste,
 *   ratée = faux ; verdict par case = celui stocké (`part_verdicts`), jamais
 *   recalculé. Trace sans réponse tapée = sans réponse. Les
 *   `POINT_ERRORS_TRACE_CAP` traces les plus récentes par modèle seulement.
 *
 * Anciennes séries libres (`test_answers` d'une séance sans contrôle) : exclues
 * (Q7, circuit fermé le 2026-11-11). Flash-cards : aucune réponse tapée.
 *
 * Tout se lit avec le client du professeur, sous la RLS existante
 * (`is_my_student`). Une lecture en échec rend une erreur propre, jamais une
 * exception.
 *
 * @module server/stats/point-errors
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { CorrectedDetail } from '$lib/types/evaluation-attempt';
import { toQuestionTemplate, type QuestionTemplateRow } from '$lib/types/question-template';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import {
	POINT_ERRORS_MESSAGE,
	POINT_ERRORS_TRACE_CAP,
	type ClassPointErrors,
	type PointTemplateErrors
} from '$lib/types/point-errors';
import {
	computeQuestionErrors,
	displayName,
	type QuestionErrorAnswer,
	type StudentName
} from '../evaluation-question-errors';
import {
	BreakdownReadError,
	bestCopies,
	readInBatches,
	rowsOf,
	type SessionRow
} from '../evaluation-breakdown';
import type { DetailBudget } from '../corrected-detail';
import { createServerLogger } from '$lib/utils/logger';

// Types

type TypedSupabaseClient = SupabaseClient<Database>;

/** Trace de série telle que lue en base */
export interface SeriesTraceRow {
	id: string;
	student_id: string;
	template_id: string | null;
	success: boolean | null;
	seed: number | null;
	answer_parts: string[] | null;
	part_verdicts: boolean[] | null;
	created_at: string;
}

interface ControlSessionRow extends SessionRow {
	evaluation_id: string | null;
}

interface ControlAnswerRow {
	id: string;
	test_session_id: string;
	template_id: string | null;
	question_instance: unknown;
	user_answer: unknown;
	status: string | null;
}

// Constantes

const logger = createServerLogger('server/stats/point-errors');

/** Lieux de série où l'élève tape sa réponse (les seuls qui gardent une réponse) */
const ANSWERED_PLACES = ['typing', 'mock_test', 'number_race'];

// Functions

/** Verdict d'une trace : statut de la trace, case par case selon `part_verdicts` */
function traceVerdict(trace: SeriesTraceRow, parts: string[]): CorrectedDetail {
	const status = trace.success ? 'correct' : 'incorrect';
	const verdicts = trace.part_verdicts;
	if (!verdicts || verdicts.length !== parts.length) return { unavailable: true, status };
	return {
		status,
		blanks: verdicts.map((ok, index) => ({
			index,
			status: ok ? 'correct' : 'incorrect',
			remarks: [],
			answer: parts[index]
		}))
	};
}

/**
 * Trace de série → réponse comparable à une réponse de contrôle ; null quand
 * l'énoncé ne peut pas être rejoué (graine absente, génération en échec).
 *
 * @param replay - énoncé rejoué d'une graine (mis en cache par l'appelant)
 */
export function seriesTraceAnswer(
	trace: SeriesTraceRow,
	studentName: string,
	replay: (seed: number) => QuestionInstance | null
): QuestionErrorAnswer | null {
	if (trace.seed === null) return null;
	const instance = replay(trace.seed);
	if (!instance) return null;
	const parts = trace.answer_parts;
	// Rien de tapé : sans réponse, comme une question de contrôle laissée vide
	if (!parts || parts.length === 0) {
		return { studentName, instance, userAnswer: null, status: null };
	}
	return {
		studentName,
		instance,
		userAnswer: { value: parts },
		status: trace.success ? 'correct' : 'incorrect',
		verdict: traceVerdict(trace, parts)
	};
}

/** Énoncés rejoués d'un modèle, un par graine */
function replayer(template: QuestionTemplate): (seed: number) => QuestionInstance | null {
	const cache = new Map<number, QuestionInstance | null>();
	return (seed) => {
		if (!cache.has(seed)) {
			const result = generateInstance(template, seed);
			cache.set(seed, result.success && result.instance ? result.instance : null);
		}
		return cache.get(seed) ?? null;
	};
}

/**
 * Modèles du point → leurs erreurs, ceux sans aucune réponse écartés ; du plus
 * de réponses fausses au moins, puis par titre.
 */
export function buildPointErrors(
	templates: ReadonlyArray<{ id: string; title: string; capped: boolean }>,
	answersByTemplate: ReadonlyMap<string, QuestionErrorAnswer[]>,
	budget: DetailBudget = {}
): PointTemplateErrors[] {
	return templates
		.flatMap((t) => {
			const rows = answersByTemplate.get(t.id) ?? [];
			if (rows.length === 0) return [];
			return [
				{
					templateId: t.id,
					title: t.title,
					capped: t.capped,
					errors: computeQuestionErrors(rows, budget)
				}
			];
		})
		.sort((a, b) => {
			const wrong = (e: PointTemplateErrors) =>
				e.errors.groups.reduce((n, g) => n + g.students.length, 0);
			return wrong(b) - wrong(a) || a.title.localeCompare(b.title, 'fr');
		});
}

/** Élèves actifs de la classe, avec leur nom */
async function readStudents(
	supabase: TypedSupabaseClient,
	classId: string
): Promise<StudentName[]> {
	type MemberRow = {
		student_id: string;
		profiles: { firstname: string | null; lastname: string | null } | null;
	};
	const members = rowsOf(
		'Élèves',
		await supabase
			.from('class_members')
			.select('student_id, profiles!class_members_student_id_fkey(firstname, lastname)')
			.eq('class_id', classId)
			.eq('status', 'active')
	) as unknown as MemberRow[];
	return members.map((m) => ({
		id: m.student_id,
		firstname: m.profiles?.firstname ?? null,
		lastname: m.profiles?.lastname ?? null
	}));
}

/** Réponses de contrôle des élèves aux modèles, copies comptées seulement */
async function readControlAnswers(
	supabase: TypedSupabaseClient,
	studentIds: string[],
	templateIds: string[]
): Promise<{ answer: ControlAnswerRow; userId: string }[]> {
	const sessions: ControlSessionRow[] = await readInBatches(
		'Copies',
		studentIds,
		(batch, from, to) =>
			supabase
				.from('test_sessions')
				.select('id, user_id, grade, completed_at, evaluation_id')
				.in('user_id', batch)
				.not('evaluation_id', 'is', null)
				.not('completed_at', 'is', null)
				.order('id')
				.range(from, to)
	);
	if (sessions.length === 0) return [];

	// Copies avec réponses, TOUS modèles confondus : même règle que le bilan
	const answered = await readInBatches(
		'Copies avec réponses',
		sessions.map((s) => s.id),
		(batch, from, to) =>
			supabase
				.from('test_answers')
				.select('id, test_session_id')
				.in('test_session_id', batch)
				.order('id')
				.range(from, to)
	);
	const answeredSessions = new Set(answered.map((a) => a.test_session_id));

	// Meilleure copie de chaque élève, contrôle par contrôle
	const byEvaluation = new Map<string, ControlSessionRow[]>();
	for (const s of sessions) {
		if (!s.evaluation_id) continue;
		const list = byEvaluation.get(s.evaluation_id) ?? [];
		list.push(s);
		byEvaluation.set(s.evaluation_id, list);
	}
	const counted = new Map<string, string>();
	for (const list of byEvaluation.values()) {
		for (const copy of bestCopies(list, answeredSessions)) {
			if (answeredSessions.has(copy.id) && copy.user_id) counted.set(copy.id, copy.user_id);
		}
	}
	if (counted.size === 0) return [];

	const answers: ControlAnswerRow[] = await readInBatches(
		'Réponses',
		[...counted.keys()],
		(batch, from, to) =>
			supabase
				.from('test_answers')
				.select('id, test_session_id, template_id, question_instance, user_answer, status')
				.in('test_session_id', batch)
				.in('template_id', templateIds)
				.order('id')
				.range(from, to)
	);
	return answers.flatMap((answer) => {
		const userId = counted.get(answer.test_session_id);
		return userId ? [{ answer, userId }] : [];
	});
}

/** Traces de séries d'un modèle, postérieures à sa modification, les plus récentes d'abord */
async function readSeriesTraces(
	supabase: TypedSupabaseClient,
	studentIds: string[],
	template: QuestionTemplate
): Promise<{ traces: SeriesTraceRow[]; capped: boolean }> {
	const traces: SeriesTraceRow[] = await readInBatches('Traces', studentIds, (batch, from, to) => {
		let query = supabase
			.from('skill_attempts')
			.select('id, student_id, template_id, success, seed, answer_parts, part_verdicts, created_at')
			.eq('template_id', template.id)
			.in('student_id', batch)
			.in('place', ANSWERED_PLACES)
			.not('seed', 'is', null);
		if (template.updated_at) query = query.gt('created_at', template.updated_at);
		return query.order('id').range(from, to);
	});
	const recent = [...traces].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
	return {
		traces: recent.slice(0, POINT_ERRORS_TRACE_CAP),
		capped: recent.length > POINT_ERRORS_TRACE_CAP
	};
}

/**
 * Erreurs de la classe sur les modèles d'un point du programme.
 */
export async function getClassPointErrors(
	supabase: TypedSupabaseClient,
	classId: string,
	pointId: string
): Promise<ClassPointErrors> {
	try {
		const students = await readStudents(supabase, classId);
		const links = rowsOf(
			'Modèles du point',
			await supabase.from('question_template_points').select('template_id').eq('point_id', pointId)
		);
		const linkedIds = [...new Set(links.map((l) => l.template_id))];
		if (students.length === 0 || linkedIds.length === 0) return { status: 'ok', templates: [] };

		const templateRows = rowsOf(
			'Modèles',
			await supabase.from('question_templates').select('*').in('id', linkedIds)
		) as QuestionTemplateRow[];
		const templates = templateRows.map(toQuestionTemplate);
		const templateIds = templates.map((t) => t.id);
		if (templateIds.length === 0) return { status: 'ok', templates: [] };

		const studentIds = students.map((s) => s.id);
		const names = new Map(students.map((s) => [s.id, displayName(s)]));
		const answersByTemplate = new Map<string, QuestionErrorAnswer[]>();
		const push = (templateId: string, row: QuestionErrorAnswer) => {
			const list = answersByTemplate.get(templateId) ?? [];
			list.push(row);
			answersByTemplate.set(templateId, list);
		};

		for (const { answer, userId } of await readControlAnswers(supabase, studentIds, templateIds)) {
			if (!answer.template_id) continue;
			push(answer.template_id, {
				studentName: names.get(userId) ?? displayName(undefined),
				instance: answer.question_instance,
				userAnswer: answer.user_answer,
				status: answer.status
			});
		}

		const capped = new Map<string, boolean>();
		for (const template of templates) {
			const read = await readSeriesTraces(supabase, studentIds, template);
			capped.set(template.id, read.capped);
			const replay = replayer(template);
			for (const trace of read.traces) {
				const row = seriesTraceAnswer(
					trace,
					names.get(trace.student_id) ?? displayName(undefined),
					replay
				);
				if (row) push(template.id, row);
			}
		}

		return {
			status: 'ok',
			templates: buildPointErrors(
				templates.map((t) => ({ id: t.id, title: t.title, capped: capped.get(t.id) ?? false })),
				answersByTemplate
			)
		};
	} catch (e) {
		if (!(e instanceof BreakdownReadError)) {
			logger.error('[getClassPointErrors] Échec inattendu :', e);
		}
		return { status: 'error', message: POINT_ERRORS_MESSAGE };
	}
}
