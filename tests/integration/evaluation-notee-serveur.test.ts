/**
 * Évaluation notée, corrigée par le serveur (chantier 5, PR B) — intégration
 * ==========================================================================
 *
 * `$lib/server/evaluation-attempts` face à la VRAIE base : lectures de droits
 * sous RLS (client de l'élève), écritures en service_role (Q38), avec de VRAIS
 * modèles publiés (TinyMath #314, QCM, et #142, question à case), posés dans
 * des catégories propres au test.
 *
 * Ce que la spécification validée par David exige ici (D) : démarrer →
 * reprendre → envoyer ; l'élève ne reçoit jamais la graine ni la réponse ; une
 * tentative volée → 404 ; meilleure note sur deux tentatives ; séance et
 * réponses écrites (points, statut, note). Plus B6-B9, C10-C13.
 *
 * L'« oracle » du test régénère les questions depuis les graines (service_role),
 * exactement comme le serveur, pour connaître les bonnes réponses.
 *
 * `pnpm test:integration tests/integration/evaluation-notee-serveur.test.ts`
 *
 * @vitest-environment node
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import {
	AttemptAlreadySubmittedError,
	readSubmittedCopy,
	startEvaluationAttempt,
	submitEvaluationAttempt,
	type AttemptActors,
	type StartResult
} from '$lib/server/evaluation-attempts';
import {
	getEvaluationResults,
	getStudentAssignments,
	getEvaluation
} from '$lib/server/evaluations';
import { EvaluationError } from '$lib/server/evaluations';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { toQuestionTemplate, type QuestionTemplateRow } from '$lib/types/question-template';
import { getQuestionType, type QuestionInstance } from '$lib/questions/types';
import {
	gradeQuestion,
	statusFromBlankStatuses,
	type SubmittedAnswer
} from '$lib/questions/grading';
import { isAnswerTooComplex } from '$lib/questions/answer-complexity';
import { submitAttemptSchema } from '$lib/server/validation/evaluations';
import {
	GRADING_BUDGET_EXCEEDED_FEEDBACK,
	SUBMISSION_GRADING_BUDGET_MS
} from '$lib/server/grading-budget';

// Types
type Client = SupabaseClient<Database>;
type Person = { id: string; client: Client; role: 'student' | 'teacher' };
type AttemptStart = Extract<StartResult, { kind: 'attempt' }>;

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const QCM_ID = '0a11f0e0-0000-4000-8000-00000000e601';
const FILL_ID = '0a11f0e0-0000-4000-8000-00000000e602';
/** QCM à plusieurs réponses (chantier 2, V5) : bonnes réponses 0 et 2 sur 4 */
const MULTI_ID = '0a11f0e0-0000-4000-8000-00000000e603';
const THEME = 'ZZ Éval serveur';
const FILL_CATEGORY = { theme: THEME, domain: 'Moitié', subdomain: 'Entiers', level: 1 };
const QCM_CATEGORY = { theme: THEME, domain: 'Comparer', subdomain: 'Relatifs', level: 1 };
const MULTI_CATEGORY = { theme: THEME, domain: 'Plusieurs', subdomain: 'Pairs', level: 1 };
const CATEGORIES = [
	{ category: FILL_CATEGORY, quantity: 2, delay: 20 },
	{ category: QCM_CATEGORY, quantity: 1, delay: 15 }
];
/** Clés qui, présentes dans ce que reçoit l'élève, laisseraient tricher */
const FORBIDDEN_KEYS = [
	'expectedAnswer',
	'expectedAnswerLatex',
	'correctChoiceIndex',
	'isCorrect',
	'correction',
	'seed',
	'templateId',
	'template_id',
	'resolvedVariables',
	'originalIndex',
	'answers',
	'correct',
	'template',
	'instance',
	'shuffledChoices',
	'validationRules'
];

// Variables
const service = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let student: Person;
let classmate: Person;
let archived: Person;
let classId: string;

// Functions
async function signIn(email: string): Promise<Client> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function person(role: 'student' | 'teacher'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await signIn(profile.email), role };
}

function actors(who: Person, extra: Partial<AttemptActors> = {}): AttemptActors {
	return { userClient: who.client, service, userId: who.id, role: who.role, ...extra };
}

function fixture(path: string) {
	return JSON.parse(readFileSync(`docs/relecture/${path}.json`, 'utf-8')).template;
}

/** Évaluation publiée (ou non) sur la série du test, assignée à la classe */
async function createEvaluation(
	settings: {
		form?: 'interactive' | 'course';
		time_limit?: number | null;
		max_attempts?: number | null;
		deadline?: string | null;
		status?: 'draft' | 'published';
		categories?: typeof CATEGORIES;
	} = {}
): Promise<{ evaluationId: string; assignmentId: string }> {
	const { data: series, error: seriesError } = await service
		.from('series')
		.insert({
			title: 'Éval serveur ZZ',
			grade: '6',
			categories: settings.categories ?? CATEGORIES,
			created_by: teacher.id
		})
		.select('id')
		.single();
	expect(seriesError, 'décor : série').toBeNull();
	const { data: evaluation, error: evaluationError } = await service
		.from('evaluations')
		.insert({
			series_id: series!.id,
			form: settings.form ?? 'interactive',
			time_limit: settings.time_limit ?? null,
			max_attempts: settings.max_attempts ?? null,
			deadline: settings.deadline ?? null,
			status: settings.status ?? 'published',
			created_by: teacher.id
		})
		.select('id')
		.single();
	expect(evaluationError, 'décor : évaluation').toBeNull();
	const { data: assignment, error } = await service
		.from('evaluation_assignments')
		.insert({ evaluation_id: evaluation!.id, assigned_by: teacher.id, class_id: classId })
		.select('id')
		.single();
	expect(error, 'décor : assignation').toBeNull();
	return { evaluationId: evaluation!.id, assignmentId: assignment!.id };
}

async function start(who: Person, assignmentId: string, extra: Partial<AttemptActors> = {}) {
	const result = await startEvaluationAttempt(actors(who, extra), assignmentId);
	expect(result.kind).toBe('attempt');
	return result as AttemptStart;
}

async function statusOf(promise: Promise<unknown>): Promise<number | 'ok'> {
	try {
		await promise;
		return 'ok';
	} catch (e) {
		if (e instanceof EvaluationError) return e.status;
		throw e;
	}
}

/** Oracle : les questions de la tentative, régénérées comme le serveur */
async function oracle(attemptId: string): Promise<QuestionInstance[]> {
	const { data: rows, error } = await service
		.from('evaluation_attempt_questions')
		.select('position, template_id, seed, instance')
		.eq('test_session_id', attemptId)
		.order('position');
	expect(error).toBeNull();
	const { data: templates } = await service
		.from('question_templates')
		.select('*')
		.in('id', [QCM_ID, FILL_ID, MULTI_ID]);
	const byId = new Map(
		(templates as QuestionTemplateRow[]).map((t) => [t.id, toQuestionTemplate(t)])
	);
	return rows!.map((row) => {
		// Q42 : l'instance figée au démarrage fait foi ; la graine n'est qu'un repli
		if (row.instance) return row.instance as unknown as QuestionInstance;
		const result = generateInstance(byId.get(row.template_id)!, row.seed);
		if (!result.success) throw new Error(result.errors.join('; '));
		return result.instance;
	});
}

function rightAnswer(instance: QuestionInstance): SubmittedAnswer {
	if (getQuestionType(instance) === 'multiple_choice') {
		const choices = (instance.shuffledChoices ?? []).flatMap((c, position) =>
			instance.choices![c.originalIndex].isCorrect ? [position] : []
		);
		return { choices };
	}
	const values = (instance.blanks ?? []).map((b) => b.expectedAnswer);
	return { values, latex: values };
}

function wrongAnswer(instance: QuestionInstance): SubmittedAnswer {
	if (getQuestionType(instance) === 'multiple_choice') {
		const position = (instance.shuffledChoices ?? []).findIndex(
			(c) => !instance.choices![c.originalIndex].isCorrect
		);
		return { choices: [position] };
	}
	const values = (instance.blanks ?? []).map(() => '987654');
	return { values, latex: values };
}

/**
 * Surface de fuite d'une question publique : tout SAUF les champs d'affichage où la
 * valeur de la réponse peut apparaître légitimement (l'énoncé « le double de 6 »,
 * le niveau `grades: ['6']`). Exclusion par liste : un champ ajouté demain reste
 * inspecté par défaut.
 */
const DISPLAY_ONLY_FIELDS = new Set(['statement', 'exerciseInstruction', 'grades']);

function leakSurface(question: object): string {
	return JSON.stringify(
		Object.fromEntries(Object.entries(question).filter(([key]) => !DISPLAY_ONLY_FIELDS.has(key)))
	);
}

function allKeys(value: unknown, keys: Set<string> = new Set()): Set<string> {
	if (Array.isArray(value)) value.forEach((item) => allKeys(item, keys));
	else if (value && typeof value === 'object') {
		for (const [key, child] of Object.entries(value)) {
			keys.add(key);
			allKeys(child, keys);
		}
	}
	return keys;
}

async function sessionRow(attemptId: string) {
	const { data } = await service
		.from('test_sessions')
		.select(
			'id, user_id, evaluation_id, mode, total_questions, created_at, completed_at, grade, points_earned, score, time_limit, time_spent'
		)
		.eq('id', attemptId)
		.single();
	return data!;
}

async function answersOf(attemptId: string) {
	const { data } = await service
		.from('test_answers')
		.select('template_id, is_correct, points, status, question_instance, user_answer')
		.eq('test_session_id', attemptId);
	return data ?? [];
}

describe('évaluation notée, corrigée par le serveur (chantier 5)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		teacher = await person('teacher');
		student = await person('student');
		classmate = await person('student');
		archived = await person('student');

		const k1 = await TestData.class().withName('6e éval serveur ZZ').create();
		classId = k1.id;
		const { error: memberError } = await service.from('class_members').insert([
			{ class_id: classId, student_id: student.id, status: 'active' },
			{ class_id: classId, student_id: classmate.id, status: 'active' },
			{ class_id: classId, student_id: archived.id, status: 'archived' }
		]);
		expect(memberError, 'décor : inscriptions').toBeNull();

		// Vrais modèles TinyMath, publiés, dans les catégories du test
		await service.from('question_templates').delete().in('id', [QCM_ID, FILL_ID]);
		const qcm = fixture('relatifs/314');
		const fill = fixture('entiers/142');
		const { error: templatesError } = await service.from('question_templates').insert([
			{
				id: QCM_ID,
				type: 'multiple_choice',
				title: 'QCM ZZ éval serveur',
				...QCM_CATEGORY,
				grades: ['5'],
				status: 'published',
				shared: qcm.shared,
				variations: qcm.variations
			},
			{
				id: FILL_ID,
				type: 'fill_in_blanks',
				title: 'Moitié ZZ éval serveur',
				...FILL_CATEGORY,
				grades: ['6'],
				status: 'published',
				variations: fill.variations
			}
		]);
		expect(templatesError, 'décor : modèles').toBeNull();
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
		await service.from('question_templates').delete().in('id', [QCM_ID, FILL_ID, MULTI_ID]);
	});

	describe('Entraînement : démarrer → reprendre → envoyer (×2)', () => {
		let evaluationId: string;
		let assignmentId: string;
		let first: AttemptStart;

		beforeAll(async () => {
			({ evaluationId, assignmentId } = await createEvaluation({ max_attempts: 2 }));
		});

		it('B6 : le serveur crée la séance (service_role) et tire 3 questions', async () => {
			first = await start(student, assignmentId);
			expect(first.resumed).toBe(false);
			expect(first.remainingSeconds).toBeNull();
			expect(first.questions.map((q) => q.position)).toEqual([0, 1, 2]);
			expect(first.questions.map((q) => q.type)).toEqual([
				'fill_in_blanks',
				'fill_in_blanks',
				'multiple_choice'
			]);
			expect(first.questions.map((q) => q.delaySeconds)).toEqual([20, 20, 15]);

			const session = await sessionRow(first.attemptId);
			expect(session).toMatchObject({
				user_id: student.id,
				evaluation_id: evaluationId,
				mode: 'interactive',
				total_questions: 3,
				completed_at: null,
				grade: null
			});
			const { data: drawn } = await service
				.from('evaluation_attempt_questions')
				.select('position, template_id, seed')
				.eq('test_session_id', first.attemptId);
			expect(drawn).toHaveLength(3);
			for (const row of drawn!) {
				expect(row.seed).toBeGreaterThanOrEqual(0);
				expect(row.seed).toBeLessThanOrEqual(2 ** 31 - 1);
			}
		});

		it('D : l’élève ne reçoit ni graine, ni modèle, ni réponse attendue, ni bon choix', async () => {
			const json = JSON.parse(JSON.stringify(first));
			const keys = allKeys(json);
			for (const key of FORBIDDEN_KEYS) expect(keys.has(key), key).toBe(false);

			const text = JSON.stringify(json);
			const { data: drawn } = await service
				.from('evaluation_attempt_questions')
				.select('seed, template_id')
				.eq('test_session_id', first.attemptId);
			for (const row of drawn!) {
				expect(text).not.toContain(row.template_id);
				expect(text).not.toMatch(new RegExp(`[^0-9]${row.seed}[^0-9]`));
			}
			const instances = await oracle(first.attemptId);
			// Garde anti-vacuité : sans trou, la boucle ci-dessous ne prouverait rien
			expect(instances.flatMap((instance) => instance.blanks ?? []).length).toBeGreaterThan(0);
			for (const [i, instance] of instances.entries()) {
				// La réponse n'apparaît ni dans les trous, ni dans les choix, ni dans aucun
				// champ hors affichage. Pas dans l'énoncé (la moitié de 2a est a : l'énoncé
				// contient 2a) ni dans `grades` (niveau « 6 » ≠ réponse « 6 », vu en CI).
				const surface = leakSurface(first.questions[i]);
				for (const blank of instance.blanks ?? []) {
					expect(surface, `question ${i}`).not.toContain(`"${blank.expectedAnswer}"`);
				}
			}
		});

		it('D18 : l’élève ne lit pas les graines, même de sa propre tentative', async () => {
			const { data, error } = await student.client
				.from('evaluation_attempt_questions')
				.select('seed')
				.eq('test_session_id', first.attemptId);
			expect(error?.code).toBe('42501');
			expect(data).toBeNull();
		});

		it('B8 : la tentative compte dès son démarrage', async () => {
			const { count } = await service
				.from('test_sessions')
				.select('id', { count: 'exact', head: true })
				.eq('evaluation_id', evaluationId)
				.eq('user_id', student.id);
			expect(count).toBe(1);
		});

		it('B9 : reprendre = la MÊME tentative, mêmes questions dans le même ordre, sans en compter une', async () => {
			const again = await start(student, assignmentId);
			expect(again.attemptId).toBe(first.attemptId);
			expect(again.resumed).toBe(true);
			expect(again.questions).toEqual(first.questions);
			const { count } = await service
				.from('test_sessions')
				.select('id', { count: 'exact', head: true })
				.eq('evaluation_id', evaluationId)
				.eq('user_id', student.id);
			expect(count).toBe(1);
		});

		it('D : tentative d’un autre élève (identifiant volé) → 404, rien d’écrit', async () => {
			const instances = await oracle(first.attemptId);
			const status = await statusOf(
				submitEvaluationAttempt(actors(classmate), first.attemptId, {
					answers: instances.map((instance, position) => ({ position, ...rightAnswer(instance) }))
				})
			);
			expect(status).toBe(404);
			expect(await answersOf(first.attemptId)).toHaveLength(0);
			expect((await sessionRow(first.attemptId)).completed_at).toBeNull();
		});

		it('C10 : corrige, note et écrit (1 juste, 1 fausse, QCM juste → 2/3 → 13,5/20)', async () => {
			const instances = await oracle(first.attemptId);
			const result = await submitEvaluationAttempt(actors(student), first.attemptId, {
				answers: [
					{ position: 0, ...rightAnswer(instances[0]) },
					{ position: 1, ...wrongAnswer(instances[1]) },
					{ position: 2, ...rightAnswer(instances[2]) }
				]
			});
			expect(result).toMatchObject({
				late: false,
				grade: 13.5,
				pointsEarned: 2,
				totalQuestions: 3,
				correctCount: 2
			});
			expect(result.questions.map((q) => [q.status, q.points])).toEqual([
				['correct', 1],
				['incorrect', 0],
				['correct', 1]
			]);
			// Corrections complètes APRÈS l'envoi, jamais la graine
			expect(result.questions[0].instance.blanks?.[0].expectedAnswer).toBeTruthy();
			// Lot 2 : statut de chaque case servi avec la copie, = statut de la note
			expect(result.questions.map((q) => q.detail?.status)).toEqual([
				'correct',
				'incorrect',
				'correct'
			]);
			expect(allKeys(JSON.parse(JSON.stringify(result))).has('seed')).toBe(false);

			const session = await sessionRow(first.attemptId);
			expect(session.completed_at).not.toBeNull();
			// 9 : durée mesurée par le serveur (démarrage → envoi), jamais déclarée
			const measured = Math.round(
				(new Date(session.completed_at!).getTime() - new Date(session.created_at!).getTime()) / 1000
			);
			expect(session.time_spent).toBe(measured);
			expect(Number(session.grade)).toBe(13.5);
			expect(Number(session.points_earned)).toBe(2);
			expect(Number(session.score)).toBe(6.75);

			const answers = await answersOf(first.attemptId);
			expect(answers).toHaveLength(3);
			expect(
				answers
					.map((a) => [Number(a.points), a.status, a.is_correct])
					.sort((a, b) => String(a).localeCompare(String(b)))
			).toEqual(
				[
					[1, 'correct', true],
					[0, 'incorrect', false],
					[1, 'correct', true]
				].sort((a, b) => String(a).localeCompare(String(b)))
			);
			// QCM : rangé et renvoyé en indices d'ORIGINE (ce que lit CorrectionCard), pas
			// en positions affichées
			const qcmOriginals = rightAnswer(instances[2]).choices!.map(
				(p) => instances[2].shuffledChoices![p].originalIndex
			);
			expect(result.questions[2].answer).toEqual({ choiceIndexes: qcmOriginals });
			const qcmRow = answers.find((a) => a.template_id === QCM_ID);
			expect((qcmRow!.user_answer as { value: number[] }).value).toEqual(qcmOriginals);
			// Position rangée avec l'instance : la copie reconstruite s'y apparie
			expect(
				answers
					.map((a) => (a.question_instance as { attemptPosition: number }).attemptPosition)
					.sort()
			).toEqual([0, 1, 2]);
			for (const answer of answers) {
				expect(allKeys(answer.question_instance).has('seed')).toBe(false);
				expect([QCM_ID, FILL_ID]).toContain(answer.template_id);
			}
		});

		it('C14 : le verdict SERVEUR alimente le SRS (traces « auto »)', async () => {
			const { data: traces } = await service
				.from('skill_attempts')
				.select('template_id, success, source')
				.eq('student_id', student.id);
			expect(traces).toHaveLength(3);
			expect(traces!.every((t) => t.source === 'auto')).toBe(true);
			expect(traces!.filter((t) => t.success)).toHaveLength(2);
		});

		it('C11 : renvoyer une tentative terminée → 409 AVEC la copie déjà notée, rien d’écrit', async () => {
			const instances = await oracle(first.attemptId);
			let copy: Awaited<ReturnType<typeof submitEvaluationAttempt>> | null = null;
			const status = await statusOf(
				submitEvaluationAttempt(actors(student), first.attemptId, {
					answers: instances.map((instance, position) => ({ position, ...rightAnswer(instance) }))
				}).catch((e) => {
					if (e instanceof AttemptAlreadySubmittedError) copy = e.result;
					throw e;
				})
			);
			expect(status).toBe(409);
			// Réponse perdue en route : la copie reconstruite depuis la base, pas la nouvelle
			expect(copy).toMatchObject({
				attemptId: first.attemptId,
				late: false,
				grade: 13.5,
				pointsEarned: 2,
				totalQuestions: 3,
				correctCount: 2
			});
			expect(copy!.questions.map((q) => [q.position, q.status, q.points])).toEqual([
				[0, 'correct', 1],
				[1, 'incorrect', 0],
				[2, 'correct', 1]
			]);
			// Même réponse que la copie d'origine (QCM en indices d'origine), message compris
			const original = await oracle(first.attemptId);
			expect(copy!.questions[2].answer).toEqual({
				choiceIndexes: rightAnswer(original[2]).choices!.map(
					(p) => original[2].shuffledChoices![p].originalIndex
				)
			});
			expect(copy!.questions[0].answer).toEqual({ values: rightAnswer(original[0]).values });
			expect(allKeys(JSON.parse(JSON.stringify(copy))).has('seed')).toBe(false);
			expect(await answersOf(first.attemptId)).toHaveLength(3);
			expect(Number((await sessionRow(first.attemptId)).grade)).toBe(13.5);
		});

		it('lot 2 (Q102 a) : statut de chaque case recalculé à l’affichage, = statut enregistré', async () => {
			const copy = await readSubmittedCopy(actors(student), first.attemptId);
			expect(copy).not.toBeNull();
			const questions = copy!.questions;
			// Statut servi = statut enregistré (celui de la note)
			expect(questions.map((q) => q.detail?.status)).toEqual(['correct', 'incorrect', 'correct']);
			// Les cases recalculées redonnent ce statut (non-régression)
			// (copie normale : jamais « détail indisponible », Q173)
			const details = questions.map((q) => {
				if (!q.detail || 'unavailable' in q.detail) throw new Error('détail indisponible');
				return q.detail;
			});
			questions.forEach((q, i) => {
				if ((q.instance.blanks?.length ?? 0) === 0) return;
				expect(statusFromBlankStatuses(details[i].blanks.map((b) => b.status))).toBe(q.status);
			});
			// QCM : les choix cochés (indices d'origine) avec leur issue
			expect(details[2].choices?.filter((c) => c.checked).length).toBeGreaterThan(0);
			expect(allKeys(JSON.parse(JSON.stringify(copy))).has('seed')).toBe(false);
		});

		it('lot 2 : la copie (et ses statuts) reste invisible d’un autre élève', async () => {
			expect(await readSubmittedCopy(actors(classmate), first.attemptId)).toBeNull();
		});

		it('C13 : deuxième tentative (tout juste) → la MEILLEURE note, côté prof et côté élève', async () => {
			const second = await start(student, assignmentId);
			expect(second.resumed).toBe(false);
			expect(second.attemptId).not.toBe(first.attemptId);
			const instances = await oracle(second.attemptId);
			const result = await submitEvaluationAttempt(actors(student), second.attemptId, {
				answers: instances.map((instance, position) => ({ position, ...rightAnswer(instance) }))
			});
			expect(result.grade).toBe(20);

			const evaluation = await getEvaluation(teacher.client, evaluationId);
			const results = await getEvaluationResults(teacher.client, evaluation!, false);
			const row = results.find((r) => r.student_id === student.id);
			expect(row).toMatchObject({ best_grade: 20, attempts_count: 2 });
			expect(row!.attempts.map((a) => a.grade).sort()).toEqual([13.5, 20]);

			const mine = await getStudentAssignments(student.client, student.id);
			expect(mine.find((a) => a.evaluation.id === evaluationId)).toMatchObject({
				best_grade: 20,
				attempts_count: 2
			});
		});

		it('B7 : tentatives épuisées → 403', async () => {
			expect(await statusOf(startEvaluationAttempt(actors(student), assignmentId))).toBe(403);
		});
	});

	describe('Course aux nombres : temps restant, envoi tardif (C12)', () => {
		let assignmentId: string;

		beforeAll(async () => {
			({ assignmentId } = await createEvaluation({ form: 'course', time_limit: 60 }));
		});

		it('B9 : reprise → temps restant = temps limite − temps écoulé', async () => {
			const attempt = await start(classmate, assignmentId);
			expect(attempt.remainingSeconds).toBeGreaterThanOrEqual(59);
			const later = () => new Date(Date.now() + 20_000);
			const resumed = await start(classmate, assignmentId, { now: later });
			expect(resumed.attemptId).toBe(attempt.attemptId);
			expect(resumed.remainingSeconds).toBeGreaterThanOrEqual(38);
			expect(resumed.remainingSeconds).toBeLessThanOrEqual(40);
		});

		it('C12 : envoi reçu après temps limite + 30 s → note 0, aucune réponse comptée', async () => {
			const attempt = await start(classmate, assignmentId);
			const instances = await oracle(attempt.attemptId);
			const tooLate = () => new Date(Date.now() + 95_000);
			const result = await submitEvaluationAttempt(
				actors(classmate, { now: tooLate }),
				attempt.attemptId,
				{
					answers: instances.map((instance, position) => ({ position, ...rightAnswer(instance) }))
				}
			);
			expect(result).toMatchObject({ late: true, grade: 0, pointsEarned: 0, correctCount: 0 });
			expect(await answersOf(attempt.attemptId)).toHaveLength(0);
			const session = await sessionRow(attempt.attemptId);
			expect(session.completed_at).not.toBeNull();
			expect(Number(session.grade)).toBe(0);
		});

		it('C12 : dans les 30 s de grâce → accepté et noté', async () => {
			const attempt = await start(classmate, assignmentId);
			const instances = await oracle(attempt.attemptId);
			const inGrace = () => new Date(Date.now() + 80_000);
			const result = await submitEvaluationAttempt(
				actors(classmate, { now: inGrace }),
				attempt.attemptId,
				{
					answers: instances.map((instance, position) => ({ position, ...rightAnswer(instance) }))
				}
			);
			expect(result).toMatchObject({ late: false, grade: 20 });
		});
	});

	describe('Q59 : copie hostile, budget de correction de 5 s', () => {
		let assignmentId: string;
		const QUESTIONS = 8;
		const HOSTILE = '1.0001^{9999}';

		beforeAll(async () => {
			({ assignmentId } = await createEvaluation({
				categories: [{ category: FILL_CATEGORY, quantity: QUESTIONS, delay: 20 }]
			}));
		});

		it('budget épuisé pendant une écriture coûteuse : restantes à 0 avec le message, copie close et notée', async () => {
			const attempt = await start(classmate, assignmentId);
			const instances = await oracle(attempt.attemptId);
			expect(instances, 'décor : 8 questions à cases').toHaveLength(QUESTIONS);
			// La garde de complexité (#581) laisse passer cette écriture : elle coûte ~1,2 s
			expect(isAnswerTooComplex(HOSTILE), 'décor : écriture admise par la garde').toBe(false);
			// 2 justes, puis l'écriture coûteuse (position 2), puis 5 justes
			const answers = instances.map((instance, position) => ({
				position,
				...(position === 2
					? { values: (instance.blanks ?? []).map(() => HOSTILE) }
					: rightAnswer(instance))
			}));

			// Horloge DÉTERMINISTE, indépendante de la vitesse de la machine : elle lit
			// 0 ms, puis 5 s dès que l'écriture coûteuse a été (vraiment) corrigée
			let elapsed = 0;
			const result = await submitEvaluationAttempt(
				actors(classmate, {
					gradingBudget: {
						clock: () => elapsed,
						grade: (instance, answer) => {
							const verdict = gradeQuestion(instance, answer);
							if (answer.values?.includes(HOSTILE)) elapsed = SUBMISSION_GRADING_BUDGET_MS;
							return verdict;
						}
					}
				}),
				attempt.attemptId,
				{ answers }
			);

			const statuses = result.questions.map((q) => [q.position, q.status, q.points, q.feedback]);
			// 0-1 corrigées et justes ; 2 en cours quand le budget s'épuise : corrigée
			// jusqu'au bout, verdict ordinaire ; 3-7 jamais corrigées, à 0 avec le message
			expect(statuses.slice(0, 2)).toEqual([
				[0, 'correct', 1, undefined],
				[1, 'correct', 1, undefined]
			]);
			expect(result.questions[2]).toMatchObject({ status: 'incorrect', points: 0 });
			expect(result.questions[2].feedback).not.toBe(GRADING_BUDGET_EXCEEDED_FEEDBACK);
			expect(statuses.slice(3)).toEqual(
				[3, 4, 5, 6, 7].map((p) => [p, 'incorrect', 0, GRADING_BUDGET_EXCEEDED_FEEDBACK])
			);
			// Note cohérente : 2 points sur 8 → 5/20
			expect(result).toMatchObject({ late: false, pointsEarned: 2, grade: 5, correctCount: 2 });

			const session = await sessionRow(attempt.attemptId);
			expect(session.completed_at).not.toBeNull();
			expect(Number(session.grade)).toBe(5);
			const rows = await answersOf(attempt.attemptId);
			expect(rows).toHaveLength(QUESTIONS);
			expect(
				rows.filter(
					(a) =>
						(a.user_answer as { feedback?: string }).feedback === GRADING_BUDGET_EXCEEDED_FEEDBACK
				)
			).toHaveLength(5);
		}, 60_000);
	});

	describe('Q42 : la question vue par l’élève est figée au démarrage', () => {
		let assignmentId: string;
		const fill = () => fixture('entiers/142');

		beforeAll(async () => {
			({ assignmentId } = await createEvaluation());
		});

		afterAll(async () => {
			// Le modèle retrouve son contenu pour les autres tests
			await service
				.from('question_templates')
				.update({ variations: fill().variations })
				.eq('id', FILL_ID);
		});

		it('l’instance complète (réponses attendues comprises) est enregistrée au démarrage', async () => {
			const attempt = await start(student, assignmentId);
			const { data } = await service
				.from('evaluation_attempt_questions')
				.select('position, instance')
				.eq('test_session_id', attempt.attemptId)
				.order('position');
			expect(data).toHaveLength(3);
			for (const row of data!) {
				expect(row.instance).not.toBeNull();
				expect(allKeys(row.instance).has('seed')).toBe(false);
			}
			const first = data![0].instance as unknown as QuestionInstance;
			expect(first.blanks?.[0].expectedAnswer).toBeTruthy();
		});

		it('modifier le modèle entre le démarrage et l’envoi ne change ni la question reprise ni la note', async () => {
			const attempt = await start(student, assignmentId);
			const frozen = await oracle(attempt.attemptId);

			// Le prof change le modèle : autre énoncé, autre réponse attendue
			const changed = fill().variations.map((v: Record<string, unknown>) => ({
				...v,
				statement: 'Énoncé CHANGÉ : quel est le double de ${{a}}$ ? $?$',
				blanks: [{ expectedAnswer: '{{eval:4*a}}' }]
			}));
			const { error } = await service
				.from('question_templates')
				.update({ variations: changed })
				.eq('id', FILL_ID);
			expect(error).toBeNull();

			const resumed = await start(student, assignmentId);
			expect(resumed.attemptId).toBe(attempt.attemptId);
			expect(resumed.questions).toEqual(attempt.questions);
			expect(JSON.stringify(resumed.questions)).not.toContain('CHANGÉ');

			const result = await submitEvaluationAttempt(actors(student), attempt.attemptId, {
				answers: frozen.map((instance, position) => ({ position, ...rightAnswer(instance) }))
			});
			expect(result.grade).toBe(20);
			expect(JSON.stringify(result.questions)).not.toContain('CHANGÉ');
			expect(allKeys(JSON.parse(JSON.stringify(result))).has('seed')).toBe(false);
		});

		it('repli : une ligne sans instance (tentative antérieure à Q42) se régénère depuis la graine', async () => {
			await service
				.from('question_templates')
				.update({ variations: fill().variations })
				.eq('id', FILL_ID);
			const attempt = await start(classmate, assignmentId);
			const { error } = await service
				.from('evaluation_attempt_questions')
				.update({ instance: null })
				.eq('test_session_id', attempt.attemptId);
			expect(error).toBeNull();

			const resumed = await start(classmate, assignmentId);
			expect(resumed.questions).toEqual(attempt.questions);
			const instances = await oracle(attempt.attemptId);
			const result = await submitEvaluationAttempt(actors(classmate), attempt.attemptId, {
				answers: instances.map((instance, position) => ({ position, ...rightAnswer(instance) }))
			});
			expect(result.grade).toBe(20);
		});
	});

	describe('B7 : refus avant toute écriture', () => {
		it('brouillon → 404', async () => {
			const { assignmentId } = await createEvaluation({ status: 'draft' });
			expect(await statusOf(startEvaluationAttempt(actors(student), assignmentId))).toBe(404);
		});

		it('membre archivé → 404', async () => {
			const { assignmentId } = await createEvaluation();
			expect(await statusOf(startEvaluationAttempt(actors(archived), assignmentId))).toBe(404);
		});

		it('date limite passée → 403, aucune séance', async () => {
			const { evaluationId, assignmentId } = await createEvaluation({
				deadline: '2020-01-01T00:00:00Z'
			});
			expect(await statusOf(startEvaluationAttempt(actors(student), assignmentId))).toBe(403);
			const { count } = await service
				.from('test_sessions')
				.select('id', { count: 'exact', head: true })
				.eq('evaluation_id', evaluationId);
			expect(count).toBe(0);
		});

		it('prof propriétaire : aperçu, aucune séance', async () => {
			const { evaluationId, assignmentId } = await createEvaluation();
			const result = await startEvaluationAttempt(actors(teacher), assignmentId);
			expect(result.kind).toBe('preview');
			const { count } = await service
				.from('test_sessions')
				.select('id', { count: 'exact', head: true })
				.eq('evaluation_id', evaluationId);
			expect(count).toBe(0);
		});
	});

	it('un modèle déjà tiré ne se supprime pas (23503 ou 23514 → la route répond 409)', async () => {
		const { error } = await service.from('question_templates').delete().eq('id', FILL_ID);
		// 23514 dès qu'une trace SRS existe (skill_attempts.template_id → NULL refusé),
		// 23503 sinon (evaluation_attempt_questions, NO ACTION)
		expect(['23503', '23514']).toContain(error?.code);
		const { data } = await service.from('question_templates').select('id').eq('id', FILL_ID);
		expect(data).toHaveLength(1);
	});

	it('23503 seul : tiré dans une tentative en cours, sans trace SRS', async () => {
		const { data: template } = await service
			.from('question_templates')
			.insert({
				id: '0a11f0e0-0000-4000-8000-00000000e603',
				type: 'fill_in_blanks',
				title: 'Tiré seulement ZZ',
				theme: 'ZZ tiré',
				domain: 'Tiré',
				level: 1,
				grades: ['6'],
				status: 'draft',
				variations: [{ statement: '$$2+2=?$$', blanks: [{ expectedAnswer: '4' }] }]
			})
			.select('id')
			.single();
		const { data: session } = await service
			.from('test_sessions')
			.insert({
				user_id: student.id,
				mode: 'interactive',
				categories: CATEGORIES,
				total_questions: 1
			})
			.select('id')
			.single();
		await service.from('evaluation_attempt_questions').insert({
			test_session_id: session!.id,
			position: 0,
			template_id: template!.id,
			seed: 1,
			delay_seconds: 20,
			category_key: 'zz'
		});
		const { error } = await service.from('question_templates').delete().eq('id', template!.id);
		expect(error?.code).toBe('23503');
		await service.from('test_sessions').delete().eq('id', session!.id);
		await service.from('question_templates').delete().eq('id', template!.id);
	});

	describe('QCM à plusieurs réponses (chantier 2, V5) : barème de bout en bout', () => {
		let multiStudent: Person;
		let assignmentId: string;

		/** Positions AFFICHÉES de ces indices d'origine */
		function positionsOf(instance: QuestionInstance, originals: number[]): number[] {
			return originals.map((o) =>
				(instance.shuffledChoices ?? []).findIndex((c) => c.originalIndex === o)
			);
		}

		beforeAll(async () => {
			multiStudent = await person('student');
			const { error: memberError } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: multiStudent.id, status: 'active' });
			expect(memberError, 'décor : inscription').toBeNull();

			await service.from('question_templates').delete().eq('id', MULTI_ID);
			const { error } = await service.from('question_templates').insert({
				id: MULTI_ID,
				type: 'multiple_choice',
				title: 'Pairs ZZ éval serveur',
				...MULTI_CATEGORY,
				grades: ['6'],
				status: 'published',
				multiple_answers: true,
				variations: [
					{
						statement: 'Quels nombres sont pairs ?',
						choices: [
							{ content: '$4$', isCorrect: true },
							{ content: '$7$', isCorrect: false },
							{ content: '$10$', isCorrect: true },
							{ content: '$13$', isCorrect: false }
						],
						correctChoiceIndex: ['0', '2']
					}
				]
			});
			expect(error, 'décor : modèle à plusieurs réponses').toBeNull();

			({ assignmentId } = await createEvaluation({
				max_attempts: 3,
				categories: [{ category: MULTI_CATEGORY, quantity: 1, delay: 20 }]
			}));
		}, 60_000);

		async function submitChoices(originals: number[]) {
			const attempt = await start(multiStudent, assignmentId);
			expect(attempt.questions[0]).toMatchObject({
				type: 'multiple_choice',
				multipleAnswers: true
			});
			const [instance] = await oracle(attempt.attemptId);
			// Corps de l'envoi passé par le schéma Zod de la route : plusieurs choix acceptés
			const body = submitAttemptSchema.parse({
				answers: [{ position: 0, choices: positionsOf(instance, originals) }]
			});
			const result = await submitEvaluationAttempt(actors(multiStudent), attempt.attemptId, body);
			const [row] = await answersOf(attempt.attemptId);
			return { result, row };
		}

		it('toutes les bonnes, aucune mauvaise → 1 point, 20/20', async () => {
			const { result, row } = await submitChoices([0, 2]);
			expect(result.questions[0]).toMatchObject({ status: 'correct', points: 1 });
			expect(result.grade).toBe(20);
			expect([Number(row.points), row.status, row.is_correct]).toEqual([1, 'correct', true]);
		});

		it('une partie des bonnes, sans mauvaise → ½ point, 10/20, « à revoir »', async () => {
			const { result, row } = await submitChoices([2]);
			expect(result.questions[0]).toMatchObject({ status: 'unoptimal_form', points: 0.5 });
			expect(result.grade).toBe(10);
			expect([Number(row.points), row.status, row.is_correct]).toEqual([
				0.5,
				'unoptimal_form',
				false
			]);
		});

		it('une mauvaise cochée, même avec toutes les bonnes → 0', async () => {
			const { result, row } = await submitChoices([0, 1, 2]);
			expect(result.questions[0]).toMatchObject({ status: 'incorrect', points: 0 });
			expect(result.grade).toBe(0);
			expect([Number(row.points), row.status, row.is_correct]).toEqual([0, 'incorrect', false]);
		});

		it('SRS : seul le QCM complet est « su » (le ½ partiel est à revoir, Q40)', async () => {
			const { data: traces } = await service
				.from('skill_attempts')
				.select('success')
				.eq('student_id', multiStudent.id)
				.eq('template_id', MULTI_ID);
			expect(traces).toHaveLength(3);
			expect(traces!.filter((t) => t.success)).toHaveLength(1);
		});
	});
});
