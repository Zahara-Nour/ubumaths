/**
 * Tentatives d'évaluation corrigées par le serveur (chantier 5, PR A) — intégration
 * ================================================================================
 *
 * Migration `20260930160000_evaluation_tentatives.sql`. Question d'accès tranchée
 * par David (Q38, en miroir) : pour une évaluation, plus AUCUNE écriture directe
 * (séance, réponses) — seul le serveur, en service_role, crée la séance, tire
 * les questions et écrit la note. Plus personne ne modifie directement ses
 * séances. Entraînement libre, course libre et flash-cards inchangés. Le prof lit
 * toujours séances et réponses de ses élèves ; l'élève lit les siennes, note
 * comprise. Les graines (`evaluation_attempt_questions`) : service_role seul (D18).
 *
 * ⚠️ La RLS échoue en silence : chaque refus d'écriture est vérifié en relisant la
 * base (service_role), pas seulement par l'erreur.
 *
 * DOIVENT échouer sans la migration. `pnpm db:start` puis
 * `pnpm test:integration tests/integration/evaluation-tentatives.test.ts`.
 *
 * Les nouvelles colonnes et la nouvelle table ne sont pas encore dans
 * `database.ts` (généré depuis la prod) : clients non typés.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';

// Types
type Person = { id: string; client: SupabaseClient };
type Created = { seriesId: string; evaluationId: string };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CATEGORIES = [{ category: 'entiers/1', quantity: 2, delay: 20 }];
const TEMPLATE_ID = '0a11f0e0-0000-4000-8000-00000000e501';
const ATTEMPTS = 'evaluation_attempt_questions';

// Variables
const service = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let admin: Person;
/** Destinataire de `assigned` (membre actif de K1). */
let student: Person;
/** Autre élève, autre classe. */
let other: Person;
let assigned: Created;
/** Séance d'évaluation terminée de `student`, posée par le service. */
let evaluationSessionId: string;
/** Séance libre de `student`, posée par SON client. */
let freeSessionId: string;

// Functions
async function signIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function person(role: 'student' | 'teacher' | 'admin'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await signIn(profile.email) };
}

/** Série + évaluation publiée, assignée nommément, posées par le service. */
async function createEvaluation(
	studentId: string,
	title = 'Série tentatives ZZ'
): Promise<Created> {
	const { data: series, error: seriesError } = await service
		.from('series')
		.insert({ title, grade: '6', categories: CATEGORIES, created_by: teacher.id })
		.select('id')
		.single();
	expect(seriesError, 'décor : série').toBeNull();
	const { data: evaluation, error: evaluationError } = await service
		.from('evaluations')
		.insert({
			series_id: series!.id,
			form: 'interactive',
			status: 'published',
			created_by: teacher.id
		})
		.select('id')
		.single();
	expect(evaluationError, 'décor : évaluation').toBeNull();
	const { error } = await service.from('evaluation_assignments').insert({
		evaluation_id: evaluation!.id,
		assigned_by: teacher.id,
		student_id: studentId
	});
	expect(error, 'décor : assignation').toBeNull();
	return { seriesId: series!.id, evaluationId: evaluation!.id };
}

/** Ce que fera le serveur au démarrage : séance + questions tirées (service_role). */
async function serverStartsAttempt(userId: string, evaluationId: string): Promise<string> {
	const { data: session, error } = await service
		.from('test_sessions')
		.insert({
			user_id: userId,
			mode: 'interactive',
			categories: CATEGORIES,
			total_questions: 2,
			evaluation_id: evaluationId
		})
		.select('id')
		.single();
	expect(error, 'décor : séance d’évaluation').toBeNull();
	const { error: questionsError } = await service.from(ATTEMPTS).insert([
		{
			test_session_id: session!.id,
			position: 0,
			template_id: TEMPLATE_ID,
			seed: 123456,
			delay_seconds: 20,
			category_key: 'entiers/1'
		},
		{
			test_session_id: session!.id,
			position: 1,
			template_id: TEMPLATE_ID,
			seed: 2147483647,
			delay_seconds: 20,
			category_key: 'entiers/1'
		}
	]);
	expect(questionsError, 'décor : questions tirées').toBeNull();
	return session!.id;
}

function sessionRow(userId: string, extra: Record<string, unknown> = {}) {
	return {
		user_id: userId,
		mode: 'interactive',
		categories: CATEGORIES,
		total_questions: 2,
		...extra
	};
}

function answerRow(sessionId: string, extra: Record<string, unknown> = {}) {
	return {
		test_session_id: sessionId,
		template_id: TEMPLATE_ID,
		question_instance: { seed: 1 },
		user_answer: { value: '4' },
		is_correct: true,
		...extra
	};
}

async function sessionsOf(userId: string, evaluationId: string | null) {
	const query = service.from('test_sessions').select('id').eq('user_id', userId);
	const { data, error } = await (evaluationId
		? query.eq('evaluation_id', evaluationId)
		: query.is('evaluation_id', null));
	expect(error).toBeNull();
	return data ?? [];
}

describe('tentatives d’évaluation (20260930160000)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		teacher = await person('teacher');
		admin = await person('admin');
		student = await person('student');
		other = await person('student');

		const k1 = await TestData.class().withName('6e A tentatives ZZ').create();
		const k2 = await TestData.class().withName('6e B tentatives ZZ').create();
		const { error: memberError } = await service.from('class_members').insert([
			{ class_id: k1.id, student_id: student.id, status: 'active' },
			{ class_id: k2.id, student_id: other.id, status: 'active' }
		]);
		expect(memberError, 'décor : inscriptions').toBeNull();

		await service.from('question_templates').delete().eq('id', TEMPLATE_ID);
		const { error: templateError } = await service.from('question_templates').insert({
			id: TEMPLATE_ID,
			type: 'fill_in_blanks',
			title: 'Tentatives ZZ',
			theme: 'Test',
			domain: 'Tentatives',
			level: 1,
			grades: ['6'],
			status: 'draft',
			variations: [{ statement: 'Combien font $$2+2$$ ? ____', blanks: [{ expectedAnswer: '4' }] }]
		});
		expect(templateError, 'décor : modèle').toBeNull();

		assigned = await createEvaluation(student.id);

		// Tentative démarrée puis corrigée par le serveur
		evaluationSessionId = await serverStartsAttempt(student.id, assigned.evaluationId);
		const { error: answersError } = await service
			.from('test_answers')
			.insert([
				answerRow(evaluationSessionId, { points: 1, status: 'correct' }),
				answerRow(evaluationSessionId, { is_correct: false, points: 0.5, status: 'unoptimal_form' })
			]);
		expect(answersError, 'décor : réponses corrigées').toBeNull();
		const { error: gradeError } = await service
			.from('test_sessions')
			.update({
				score: 1,
				points_earned: 1.5,
				grade: 15,
				completed_at: new Date().toISOString()
			})
			.eq('id', evaluationSessionId);
		expect(gradeError, 'décor : note').toBeNull();

		// Entraînement libre de l'élève, par son propre client
		const { data: free, error: freeError } = await student.client
			.from('test_sessions')
			.insert(sessionRow(student.id, { score: 1, completed_at: new Date().toISOString() }))
			.select('id')
			.single();
		expect(freeError, 'décor : séance libre').toBeNull();
		freeSessionId = free!.id;
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
		await service.from('question_templates').delete().eq('id', TEMPLATE_ID);
	});

	// ── D15 ─────────────────────────────────────────────────────────────────
	describe('D15 — aucune écriture directe sur une évaluation', () => {
		it('l’élève destinataire ne crée pas de séance d’évaluation, rien d’écrit', async () => {
			const fresh = await createEvaluation(student.id, 'D15 neuve');
			const { error } = await student.client
				.from('test_sessions')
				.insert(sessionRow(student.id, { evaluation_id: fresh.evaluationId }))
				.select('id');
			expect(error?.code).toBe('42501');
			expect(await sessionsOf(student.id, fresh.evaluationId)).toEqual([]);
		});

		it('le prof et l’admin non plus, par le client', async () => {
			for (const actor of [teacher, admin]) {
				const { error } = await actor.client
					.from('test_sessions')
					.insert(sessionRow(actor.id, { evaluation_id: assigned.evaluationId }))
					.select('id');
				expect(error?.code).toBe('42501');
				expect(await sessionsOf(actor.id, assigned.evaluationId)).toEqual([]);
			}
		});

		it('anon non plus', async () => {
			const { error } = await anon
				.from('test_sessions')
				.insert(sessionRow(student.id, { evaluation_id: assigned.evaluationId }));
			expect(error?.code).toBe('42501');
			expect(await sessionsOf(student.id, assigned.evaluationId)).toEqual([
				{ id: evaluationSessionId }
			]);
		});

		it('l’élève n’ajoute pas de réponse à sa séance d’évaluation', async () => {
			const { error } = await student.client
				.from('test_answers')
				.insert(answerRow(evaluationSessionId, { points: 1, status: 'correct' }))
				.select('id');
			expect(error?.code).toBe('42501');
			const { data } = await service
				.from('test_answers')
				.select('id')
				.eq('test_session_id', evaluationSessionId);
			expect(data).toHaveLength(2);
		});

		it('l’élève ne modifie ni sa séance libre, ni sa séance d’évaluation : 0 ligne', async () => {
			const { data: freeUpdated, error: freeError } = await student.client
				.from('test_sessions')
				.update({ score: 99 })
				.eq('id', freeSessionId)
				.select('id');
			expect(freeError).toBeNull();
			expect(freeUpdated).toEqual([]);

			const { data: evalUpdated, error: evalError } = await student.client
				.from('test_sessions')
				.update({ score: 2, grade: 20, points_earned: 2 })
				.eq('id', evaluationSessionId)
				.select('id');
			expect(evalError).toBeNull();
			expect(evalUpdated).toEqual([]);

			const { data } = await service
				.from('test_sessions')
				.select('id, score, grade, points_earned')
				.in('id', [freeSessionId, evaluationSessionId])
				.order('id');
			const byId = Object.fromEntries((data ?? []).map((row) => [row.id, row]));
			expect(Number(byId[freeSessionId].score)).toBe(1);
			expect(Number(byId[evaluationSessionId].score)).toBe(1);
			expect(Number(byId[evaluationSessionId].grade)).toBe(15);
			expect(Number(byId[evaluationSessionId].points_earned)).toBe(1.5);
		});

		it('ni ne modifie le verdict d’une réponse : 0 ligne', async () => {
			const { data, error } = await student.client
				.from('test_answers')
				.update({ points: 1, status: 'correct' })
				.eq('test_session_id', evaluationSessionId)
				.select('id');
			expect(error).toBeNull();
			expect(data).toEqual([]);
			const { data: rows } = await service
				.from('test_answers')
				.select('status')
				.eq('test_session_id', evaluationSessionId);
			expect((rows ?? []).map((r) => r.status).sort()).toEqual(['correct', 'unoptimal_form']);
		});
	});

	// ── D16 ─────────────────────────────────────────────────────────────────
	describe('D16 — l’entraînement libre reste écrit par l’élève', () => {
		for (const mode of ['interactive', 'course', 'flash']) {
			it(`séance libre « ${mode} » + réponses : acceptées`, async () => {
				const { data: session, error } = await student.client
					.from('test_sessions')
					.insert(sessionRow(student.id, { mode, completed_at: new Date().toISOString() }))
					.select('id')
					.single();
				expect(error).toBeNull();
				const { data: answers, error: answersError } = await student.client
					.from('test_answers')
					.insert([answerRow(session!.id), answerRow(session!.id, { is_correct: false })])
					.select('id');
				expect(answersError).toBeNull();
				expect(answers).toHaveLength(2);

				const { data } = await service
					.from('test_answers')
					.select('id')
					.eq('test_session_id', session!.id);
				expect(data).toHaveLength(2);
			});
		}
	});

	// ── D17 ─────────────────────────────────────────────────────────────────
	describe('D17 — lectures', () => {
		it('le prof lit la séance (note) et les réponses (points, verdict) de son élève', async () => {
			const { data: sessions } = await teacher.client
				.from('test_sessions')
				.select('id, grade, points_earned')
				.eq('id', evaluationSessionId);
			expect(sessions).toHaveLength(1);
			expect(Number(sessions![0].grade)).toBe(15);
			const { data: answers } = await teacher.client
				.from('test_answers')
				.select('points, status')
				.eq('test_session_id', evaluationSessionId);
			expect((answers ?? []).map((a) => a.status).sort()).toEqual(['correct', 'unoptimal_form']);
		});

		it('l’élève lit sa note, ses points et ses verdicts', async () => {
			const { data: sessions } = await student.client
				.from('test_sessions')
				.select('grade, points_earned')
				.eq('id', evaluationSessionId);
			expect(sessions).toHaveLength(1);
			expect(Number(sessions![0].grade)).toBe(15);
			expect(Number(sessions![0].points_earned)).toBe(1.5);
			const { data: answers } = await student.client
				.from('test_answers')
				.select('points, status')
				.eq('test_session_id', evaluationSessionId);
			expect((answers ?? []).map((a) => Number(a.points)).sort()).toEqual([0.5, 1]);
		});

		it('un autre élève ne lit rien', async () => {
			const { data: sessions } = await other.client
				.from('test_sessions')
				.select('id')
				.eq('id', evaluationSessionId);
			const { data: answers } = await other.client
				.from('test_answers')
				.select('id')
				.eq('test_session_id', evaluationSessionId);
			expect([sessions, answers]).toEqual([[], []]);
		});
	});

	// ── D18 ─────────────────────────────────────────────────────────────────
	describe('D18 — les graines : service_role seul', () => {
		// Lecture refusée par le DROIT (REVOKE), pas par la RLS : PostgREST rend
		// une ERREUR 42501 « permission denied », pas zéro ligne.
		it('élève (sa propre tentative), autre élève, prof, admin : erreur de droits', async () => {
			for (const actor of [student, other, teacher, admin]) {
				const { data, error } = await actor.client
					.from(ATTEMPTS)
					.select('seed')
					.eq('test_session_id', evaluationSessionId);
				expect(error?.code).toBe('42501');
				expect(data).toBeNull();
			}
		});

		it('anon : erreur de droits', async () => {
			const { data, error } = await anon.from(ATTEMPTS).select('seed');
			expect(error?.code).toBe('42501');
			expect(data).toBeNull();
		});

		it('personne n’écrit de graine par le client', async () => {
			for (const client of [student.client, teacher.client, admin.client, anon]) {
				const { error } = await client.from(ATTEMPTS).insert({
					test_session_id: evaluationSessionId,
					position: 5,
					template_id: TEMPLATE_ID,
					seed: 1,
					delay_seconds: 20,
					category_key: 'entiers/1'
				});
				expect(error?.code).toBe('42501');
			}
			const { data } = await service
				.from(ATTEMPTS)
				.select('position')
				.eq('test_session_id', evaluationSessionId);
			expect((data ?? []).map((r) => r.position).sort()).toEqual([0, 1]);
		});

		it('service_role lit les questions tirées, dans l’ordre', async () => {
			const { data, error } = await service
				.from(ATTEMPTS)
				.select('position, template_id, seed, delay_seconds, category_key')
				.eq('test_session_id', evaluationSessionId)
				.order('position');
			expect(error).toBeNull();
			expect(data).toEqual([
				{
					position: 0,
					template_id: TEMPLATE_ID,
					seed: 123456,
					delay_seconds: 20,
					category_key: 'entiers/1'
				},
				{
					position: 1,
					template_id: TEMPLATE_ID,
					seed: 2147483647,
					delay_seconds: 20,
					category_key: 'entiers/1'
				}
			]);
		});
	});

	// ── Contraintes ─────────────────────────────────────────────────────────
	describe('contraintes (même le service est refusé)', () => {
		const badGrades: [string, Record<string, unknown>][] = [
			['note 20,5', { grade: 20.5 }],
			['note 12,3', { grade: 12.3 }],
			['note négative', { grade: -0.5 }],
			['points gagnés 1,3', { points_earned: 1.3 }],
			['points gagnés négatifs', { points_earned: -1 }]
		];
		for (const [label, patch] of badGrades) {
			it(`${label} → refusé (23514)`, async () => {
				const { error } = await service
					.from('test_sessions')
					.update(patch)
					.eq('id', evaluationSessionId);
				expect(error?.code).toBe('23514');
			});
		}

		it('note 12,5 et 0 acceptées (témoin)', async () => {
			for (const grade of [12.5, 0, 15]) {
				const { error } = await service
					.from('test_sessions')
					.update({ grade })
					.eq('id', evaluationSessionId);
				expect(error).toBeNull();
			}
		});

		it('une note sur une séance non terminée → refusée', async () => {
			const started = await serverStartsAttempt(student.id, assigned.evaluationId);
			const { error } = await service.from('test_sessions').update({ grade: 10 }).eq('id', started);
			expect(error?.code).toBe('23514');
		});

		it('l’élève ne se fabrique pas de note sur une séance libre (INSERT refusé)', async () => {
			const before = (await sessionsOf(student.id, null)).length;
			for (const patch of [{ grade: 10 }, { points_earned: 1 }]) {
				const { error } = await student.client
					.from('test_sessions')
					.insert(sessionRow(student.id, { ...patch, completed_at: new Date().toISOString() }));
				expect(error?.code).toBe('42501');
			}
			expect(await sessionsOf(student.id, null)).toHaveLength(before);
		});

		it('points 0,25, points 2, verdict inconnu → refusés', async () => {
			for (const patch of [{ points: 0.25 }, { points: 2 }, { status: 'presque' }]) {
				const { error } = await service
					.from('test_answers')
					.insert(answerRow(evaluationSessionId, patch));
				expect(error?.code).toBe('23514');
			}
		});

		it('les cinq verdicts et les trois barèmes sont acceptés (témoin)', async () => {
			const statuses = ['correct', 'unoptimal_form', 'bad_form', 'incorrect', 'empty'];
			const points = [1, 0.5, 0.5, 0, 0];
			const rows = statuses.map((status, i) =>
				answerRow(freeSessionId, { status, points: points[i] })
			);
			const { error } = await service.from('test_answers').insert(rows);
			expect(error).toBeNull();
		});

		it('graine hors 0..2^31-1, délai hors bornes, position négative ou en double → refusés', async () => {
			const base = {
				test_session_id: evaluationSessionId,
				template_id: TEMPLATE_ID,
				seed: 1,
				delay_seconds: 20,
				category_key: 'entiers/1'
			};
			const cases: [Record<string, unknown>, string][] = [
				[{ ...base, position: 7, seed: -1 }, '23514'],
				[{ ...base, position: 7, seed: 2147483648 }, '22003'],
				[{ ...base, position: 7, delay_seconds: 0 }, '23514'],
				[{ ...base, position: 7, delay_seconds: 601 }, '23514'],
				[{ ...base, position: -1 }, '23514'],
				[{ ...base, position: 7, category_key: '' }, '23514'],
				[{ ...base, position: 0 }, '23505']
			];
			for (const [row, code] of cases) {
				const { error } = await service.from(ATTEMPTS).insert(row);
				expect(error?.code, JSON.stringify(row)).toBe(code);
			}
		});

		it('un modèle tiré dans une tentative ne se supprime pas (23503)', async () => {
			const { error } = await service.from('question_templates').delete().eq('id', TEMPLATE_ID);
			expect(error?.code).toBe('23503');
		});
	});

	// ── Effacement RGPD ─────────────────────────────────────────────────────
	it('supprimer un élève : séance, questions tirées et réponses partent ; série déverrouillée', async () => {
		const profile = await TestData.profile().withRole('student').create();
		const leaver: Person = { id: profile.id, client: await signIn(profile.email) };
		const passed = await createEvaluation(leaver.id, 'RGPD tentatives');
		const sessionId = await serverStartsAttempt(leaver.id, passed.evaluationId);
		const { error: answerError } = await service
			.from('test_answers')
			.insert(answerRow(sessionId, { points: 1, status: 'correct' }));
		expect(answerError, 'décor : réponse').toBeNull();

		// Série verrouillée tant que la séance existe
		const { error: lockedError } = await teacher.client
			.from('series')
			.update({ title: 'RGPD trop tôt' })
			.eq('id', passed.seriesId)
			.select('id');
		expect(lockedError?.code).toBe('UBS01');

		const { error } = await service.auth.admin.deleteUser(leaver.id);
		expect(error).toBeNull();

		const { data: sessions } = await service.from('test_sessions').select('id').eq('id', sessionId);
		const { data: questions } = await service
			.from(ATTEMPTS)
			.select('position')
			.eq('test_session_id', sessionId);
		const { data: answers } = await service
			.from('test_answers')
			.select('id')
			.eq('test_session_id', sessionId);
		expect([sessions, questions, answers]).toEqual([[], [], []]);

		const { data: unlocked } = await teacher.client
			.from('series')
			.update({ title: 'RGPD retouchée' })
			.eq('id', passed.seriesId)
			.select('id');
		expect(unlocked).toHaveLength(1);
	});
});
