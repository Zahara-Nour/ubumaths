/**
 * Séries et évaluations séparées (chantier 4, étape 1) — tests d'intégration
 * ==========================================================================
 *
 * Migration `20260930130000_series_evaluations.sql`. Question d'accès tranchée
 * par David (Q22) : AUCUN accès nouveau. Le prof gère ses séries, évaluations et
 * assignations ; l'admin tout ; l'élève ne lit une évaluation (et sa série) que
 * PUBLIÉE et assignée (nommément, ou via une classe dont il est membre ACTIF) ;
 * anon rien. Verrou Q24, refus de suppression Q31, forme/temps Q30.
 *
 * ⚠️ La RLS échoue en silence : chaque refus d'écriture est vérifié en relisant
 * la base (service_role), pas par l'absence d'erreur.
 *
 * DOIVENT échouer sans la migration. `pnpm db:start` puis
 * `pnpm test:integration tests/integration/series-evaluations.test.ts`.
 *
 * Les nouvelles tables ne sont pas encore dans `database.ts` (généré depuis la
 * prod) : clients non typés.
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
const LOCKED = 'UBS01';

// Variables
/** Pose le décor et relit la vérité, hors RLS. */
const service = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let admin: Person;
/** Assigné nommément à `individual`. */
let studentA: Person;
/** Membre actif de la classe K1 ; assigné nommément à `classmate`. */
let studentB: Person;
/** Membre actif de K1, sans assignation nominative. */
let studentC: Person;
/** Membre actif d'une autre classe (K2). */
let studentD: Person;
/** Ancien membre de K1 (archivé). */
let studentE: Person;

let individual: Created; // publiée, assignée à A
let viaClass: Created; // publiée, assignée à K1
let draft: Created; // brouillon, assignée à A et à K1
let classmate: Created; // publiée, assignée à B seul
let k1Id: string;

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

/** Série + évaluation posées par le service, au nom du prof. */
async function createEvaluation(
	status: 'draft' | 'published',
	targets: { classId?: string; studentId?: string }[],
	title = 'Série ZZ'
): Promise<Created> {
	const { data: series, error: seriesError } = await service
		.from('series')
		.insert({ title, grade: '6', categories: CATEGORIES, created_by: teacher.id })
		.select('id')
		.single();
	expect(seriesError, 'décor : série').toBeNull();
	const { data: evaluation, error: evaluationError } = await service
		.from('evaluations')
		.insert({ series_id: series!.id, form: 'interactive', status, created_by: teacher.id })
		.select('id')
		.single();
	expect(evaluationError, 'décor : évaluation').toBeNull();
	for (const target of targets) {
		const { error } = await service.from('evaluation_assignments').insert({
			evaluation_id: evaluation!.id,
			assigned_by: teacher.id,
			class_id: target.classId ?? null,
			student_id: target.studentId ?? null
		});
		expect(error, 'décor : assignation').toBeNull();
	}
	return { seriesId: series!.id, evaluationId: evaluation!.id };
}

async function visibleIds(client: SupabaseClient, table: string): Promise<string[]> {
	const { data, error } = await client.from(table).select('id');
	expect(error).toBeNull();
	return (data ?? []).map((row: { id: string }) => row.id).sort();
}

async function insertSession(
	client: SupabaseClient,
	userId: string,
	evaluationId: string,
	mode = 'interactive'
) {
	return client
		.from('test_sessions')
		.insert({
			user_id: userId,
			mode,
			categories: CATEGORIES,
			total_questions: 2,
			evaluation_id: evaluationId
		})
		.select('id')
		.single();
}

describe('séries et évaluations (20260930130000)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		teacher = await person('teacher');
		admin = await person('admin');
		studentA = await person('student');
		studentB = await person('student');
		studentC = await person('student');
		studentD = await person('student');
		studentE = await person('student');

		const k1 = await TestData.class().withName('6e A séries ZZ').create();
		k1Id = k1.id;
		const k2 = await TestData.class().withName('6e B séries ZZ').create();
		const members = [
			{ class_id: k1.id, student_id: studentB.id, status: 'active' },
			{ class_id: k1.id, student_id: studentC.id, status: 'active' },
			{ class_id: k1.id, student_id: studentE.id, status: 'archived' },
			{ class_id: k2.id, student_id: studentD.id, status: 'active' },
			// A est inscrit ailleurs : une assignation nominative exige un élève inscrit
			{ class_id: k2.id, student_id: studentA.id, status: 'active' }
		];
		const { error } = await service.from('class_members').insert(members);
		expect(error, 'décor : inscriptions').toBeNull();

		individual = await createEvaluation('published', [{ studentId: studentA.id }]);
		viaClass = await createEvaluation('published', [{ classId: k1.id }]);
		draft = await createEvaluation('draft', [{ studentId: studentA.id }, { classId: k1.id }]);
		classmate = await createEvaluation('published', [{ studentId: studentB.id }]);
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	// ── A1 ──────────────────────────────────────────────────────────────────
	describe('A1 — le prof et l’admin gèrent séries, évaluations, assignations', () => {
		for (const who of ['prof', 'admin'] as const) {
			it(`${who} : créer, lire, modifier, supprimer`, async () => {
				const actor = who === 'prof' ? teacher : admin;
				const { client } = actor;

				const { data: series, error: e1 } = await client
					.from('series')
					.insert({ title: `A1 ${who}`, grade: '5', categories: CATEGORIES, created_by: actor.id })
					.select('id')
					.single();
				expect(e1).toBeNull();

				const { data: evaluation, error: e2 } = await client
					.from('evaluations')
					.insert({
						series_id: series!.id,
						form: 'course',
						time_limit: 420,
						created_by: actor.id
					})
					.select('id')
					.single();
				expect(e2).toBeNull();

				const { data: assignment, error: e3 } = await client
					.from('evaluation_assignments')
					.insert({ evaluation_id: evaluation!.id, assigned_by: actor.id, student_id: studentD.id })
					.select('id')
					.single();
				expect(e3).toBeNull();

				const { data: updated } = await client
					.from('series')
					.update({ title: `A1 ${who} bis` })
					.eq('id', series!.id)
					.select('id, title');
				expect(updated).toEqual([{ id: series!.id, title: `A1 ${who} bis` }]);

				const { data: published } = await client
					.from('evaluations')
					.update({ status: 'published' })
					.eq('id', evaluation!.id)
					.select('status');
				expect(published).toEqual([{ status: 'published' }]);

				const { data: gone } = await client
					.from('evaluation_assignments')
					.delete()
					.eq('id', assignment!.id)
					.select('id');
				expect(gone).toHaveLength(1);
				const { data: goneEval } = await client
					.from('evaluations')
					.delete()
					.eq('id', evaluation!.id)
					.select('id');
				expect(goneEval).toHaveLength(1);
				const { data: goneSeries } = await client
					.from('series')
					.delete()
					.eq('id', series!.id)
					.select('id');
				expect(goneSeries).toHaveLength(1);
			});
		}

		it('l’admin lit et modifie la série du prof', async () => {
			const { data } = await admin.client
				.from('series')
				.update({ description: 'relue par l’admin' })
				.eq('id', individual.seriesId)
				.select('id');
			expect(data).toHaveLength(1);
		});
	});

	// ── A2 ──────────────────────────────────────────────────────────────────
	describe('A2 — l’élève n’écrit rien', () => {
		it('INSERT série / évaluation / assignation refusés, rien d’écrit', async () => {
			const { error: e1 } = await studentA.client
				.from('series')
				.insert({ title: 'A2 pirate', grade: '6', categories: CATEGORIES, created_by: studentA.id })
				.select('id');
			expect(e1?.code).toBe('42501');

			const { error: e2 } = await studentA.client
				.from('evaluations')
				.insert({ series_id: individual.seriesId, form: 'interactive', created_by: studentA.id })
				.select('id');
			expect(e2?.code).toBe('42501');

			const { error: e3 } = await studentA.client
				.from('evaluation_assignments')
				.insert({
					evaluation_id: classmate.evaluationId,
					assigned_by: studentA.id,
					student_id: studentA.id
				})
				.select('id');
			expect(e3?.code).toBe('42501');

			const { data: seriesRows } = await service
				.from('series')
				.select('id')
				.eq('created_by', studentA.id);
			const { data: evalRows } = await service
				.from('evaluations')
				.select('id')
				.eq('created_by', studentA.id);
			const { data: assignRows } = await service
				.from('evaluation_assignments')
				.select('id')
				.eq('assigned_by', studentA.id);
			expect(seriesRows).toEqual([]);
			expect(evalRows).toEqual([]);
			expect(assignRows).toEqual([]);
		});

		it('UPDATE / DELETE de sa propre évaluation visible : 0 ligne, base inchangée', async () => {
			const { data: u1 } = await studentA.client
				.from('series')
				.update({ title: 'A2 modifiée' })
				.eq('id', individual.seriesId)
				.select('id');
			const { data: u2 } = await studentA.client
				.from('evaluations')
				.update({ status: 'archived' })
				.eq('id', individual.evaluationId)
				.select('id');
			const { data: d1 } = await studentA.client
				.from('evaluation_assignments')
				.delete()
				.eq('evaluation_id', individual.evaluationId)
				.select('id');
			const { data: d2 } = await studentA.client
				.from('evaluations')
				.delete()
				.eq('id', individual.evaluationId)
				.select('id');
			expect([u1, u2, d1, d2]).toEqual([[], [], [], []]);

			const { data: series } = await service
				.from('series')
				.select('title')
				.eq('id', individual.seriesId);
			const { data: evaluation } = await service
				.from('evaluations')
				.select('status')
				.eq('id', individual.evaluationId);
			const { data: assignments } = await service
				.from('evaluation_assignments')
				.select('id')
				.eq('evaluation_id', individual.evaluationId);
			expect(series).toEqual([{ title: 'Série ZZ' }]);
			expect(evaluation).toEqual([{ status: 'published' }]);
			expect(assignments).toHaveLength(1);
		});
	});

	// ── A3 / A4 / A5 ────────────────────────────────────────────────────────
	describe('A3-A5 — ce que chaque élève lit', () => {
		it('A3/A4 : A (nommé) lit son évaluation publiée et sa série, pas le brouillon', async () => {
			expect(await visibleIds(studentA.client, 'evaluations')).toEqual([individual.evaluationId]);
			expect(await visibleIds(studentA.client, 'series')).toEqual([individual.seriesId]);
			const { data: assignments } = await studentA.client
				.from('evaluation_assignments')
				.select('evaluation_id');
			expect(assignments).toEqual([{ evaluation_id: individual.evaluationId }]);
		});

		it('A3 : B (membre actif de K1) lit l’évaluation de la classe et la sienne', async () => {
			expect(await visibleIds(studentB.client, 'evaluations')).toEqual(
				[viaClass.evaluationId, classmate.evaluationId].sort()
			);
			expect(await visibleIds(studentB.client, 'series')).toEqual(
				[viaClass.seriesId, classmate.seriesId].sort()
			);
		});

		it('A5 : C (même classe) ne lit pas l’évaluation nominative de B, ni le brouillon', async () => {
			expect(await visibleIds(studentC.client, 'evaluations')).toEqual([viaClass.evaluationId]);
			expect(await visibleIds(studentC.client, 'series')).toEqual([viaClass.seriesId]);
			const { data: assignments } = await studentC.client
				.from('evaluation_assignments')
				.select('evaluation_id');
			expect(assignments).toEqual([{ evaluation_id: viaClass.evaluationId }]);
		});

		it('A5 : D (autre classe) et E (sorti de K1) ne lisent rien', async () => {
			for (const student of [studentD, studentE]) {
				expect(await visibleIds(student.client, 'evaluations')).toEqual([]);
				expect(await visibleIds(student.client, 'series')).toEqual([]);
				expect(await visibleIds(student.client, 'evaluation_assignments')).toEqual([]);
			}
		});
	});

	// ── A6 ──────────────────────────────────────────────────────────────────
	it('A6 — anon ne lit ni n’écrit rien', async () => {
		for (const table of ['series', 'evaluations', 'evaluation_assignments']) {
			const { data, error } = await anon.from(table).select('id');
			// Droits révoqués : refus explicite (42501) — jamais des lignes
			expect(data ?? []).toEqual([]);
			expect(error?.code).toBe('42501');
		}
		const { error } = await anon
			.from('series')
			.insert({ title: 'anon', grade: '6', categories: CATEGORIES, created_by: teacher.id });
		expect(error?.code).toBe('42501');
	});

	// ── Séances rattachées ──────────────────────────────────────────────────
	describe('séance rattachée à une évaluation', () => {
		it('refusée pour une évaluation en brouillon, ou assignée à un autre', async () => {
			for (const target of [draft, classmate]) {
				const { error } = await insertSession(studentA.client, studentA.id, target.evaluationId);
				expect(error?.code).toBe('42501');
			}
			// E, sorti de K1, ne passe plus l'évaluation de la classe
			const { error } = await insertSession(studentE.client, studentE.id, viaClass.evaluationId);
			expect(error?.code).toBe('42501');

			const { data } = await service
				.from('test_sessions')
				.select('id')
				.in('user_id', [studentA.id, studentE.id]);
			expect(data).toEqual([]);
		});

		it('acceptée pour sa propre évaluation publiée ; rattachement ensuite immuable', async () => {
			const { data, error } = await insertSession(
				studentC.client,
				studentC.id,
				viaClass.evaluationId
			);
			expect(error).toBeNull();

			const { error: moveError } = await studentC.client
				.from('test_sessions')
				.update({ evaluation_id: classmate.evaluationId })
				.eq('id', data!.id)
				.select('id');
			expect(moveError?.code).toBe('42501');

			const { data: row } = await service
				.from('test_sessions')
				.select('evaluation_id')
				.eq('id', data!.id);
			expect(row).toEqual([{ evaluation_id: viaClass.evaluationId }]);
		});

		it('une séance de flash-cards ne se rattache jamais à une évaluation', async () => {
			const { error } = await insertSession(
				studentB.client,
				studentB.id,
				classmate.evaluationId,
				'flash'
			);
			expect(error?.code).toBe('23514');
			expect(error?.message).toContain('test_sessions_flash_sans_evaluation');
		});
	});

	// ── A7 / A8 ─────────────────────────────────────────────────────────────
	describe('A7/A8 — verrou et refus de suppression', () => {
		it('A7 : série modifiable avant la première séance, verrouillée après', async () => {
			const locked = await createEvaluation('published', [{ studentId: studentD.id }], 'A7');

			const { data: before } = await teacher.client
				.from('series')
				.update({ title: 'A7 retouchée' })
				.eq('id', locked.seriesId)
				.select('title');
			expect(before).toEqual([{ title: 'A7 retouchée' }]);

			const { error: sessionError } = await insertSession(
				studentD.client,
				studentD.id,
				locked.evaluationId
			);
			expect(sessionError).toBeNull();

			const { error: updateError } = await teacher.client
				.from('series')
				.update({ title: 'A7 trop tard' })
				.eq('id', locked.seriesId)
				.select('id');
			expect(updateError?.code).toBe(LOCKED);
			expect(updateError?.message).toContain('Série verrouillée');

			// Même l'admin : le verrou n'est pas une affaire de droits
			const { error: deleteError } = await admin.client
				.from('series')
				.delete()
				.eq('id', locked.seriesId)
				.select('id');
			expect(deleteError?.code).toBe(LOCKED);

			// Changer la série d'une évaluation commencée : refusé aussi
			const { error: moveError } = await teacher.client
				.from('evaluations')
				.update({ series_id: individual.seriesId })
				.eq('id', locked.evaluationId)
				.select('id');
			expect(moveError?.code).toBe(LOCKED);

			// Une évaluation passée ne se supprime pas (la séance reste)
			const { error: evalDeleteError } = await teacher.client
				.from('evaluations')
				.delete()
				.eq('id', locked.evaluationId)
				.select('id');
			expect(evalDeleteError?.code).toBe('23503');

			const { data: still } = await service
				.from('series')
				.select('title')
				.eq('id', locked.seriesId);
			expect(still).toEqual([{ title: 'A7 retouchée' }]);
		});

		it('A7 : une série sans séance se supprime', async () => {
			const { data: series } = await service
				.from('series')
				.insert({ title: 'A7 libre', grade: '6', categories: CATEGORIES, created_by: teacher.id })
				.select('id')
				.single();
			const { data } = await teacher.client
				.from('series')
				.delete()
				.eq('id', series!.id)
				.select('id');
			expect(data).toHaveLength(1);
		});

		it('A8 : une série utilisée par une évaluation ne se supprime pas', async () => {
			const { error } = await teacher.client
				.from('series')
				.delete()
				.eq('id', draft.seriesId)
				.select('id');
			expect(error?.code).toBe('23503');
			const { data } = await service.from('series').select('id').eq('id', draft.seriesId);
			expect(data).toHaveLength(1);
		});
	});

	// ── A9 ──────────────────────────────────────────────────────────────────
	describe('A9 — forme et temps limite', () => {
		const cases: { label: string; form: string; time_limit: number | null; ok: boolean }[] = [
			{ label: 'course sans temps', form: 'course', time_limit: null, ok: false },
			{ label: 'course 30 s', form: 'course', time_limit: 30, ok: false },
			{ label: 'course 3601 s', form: 'course', time_limit: 3601, ok: false },
			{ label: 'entraînement avec temps', form: 'interactive', time_limit: 420, ok: false },
			{ label: 'forme inconnue', form: 'flash', time_limit: null, ok: false },
			{ label: 'course 420 s', form: 'course', time_limit: 420, ok: true },
			{ label: 'course 60 s', form: 'course', time_limit: 60, ok: true },
			{ label: 'course 3600 s', form: 'course', time_limit: 3600, ok: true },
			{ label: 'entraînement sans temps', form: 'interactive', time_limit: null, ok: true }
		];
		for (const c of cases) {
			it(`${c.label} → ${c.ok ? 'accepté' : 'refusé'}`, async () => {
				const { data, error } = await teacher.client
					.from('evaluations')
					.insert({
						series_id: draft.seriesId,
						form: c.form,
						time_limit: c.time_limit,
						created_by: teacher.id
					})
					.select('id');
				if (c.ok) {
					expect(error).toBeNull();
					expect(data).toHaveLength(1);
				} else {
					expect(error?.code).toBe('23514');
				}
			});
		}
	});

	// A10 (recopie par `copy_legacy_assessments`) retiré avec la fonction et les
	// tables d'origine (20260930150000_drop_assessments) : la recopie a été faite
	// en prod, les garde-fous de la migration de suppression en vérifient le résultat.

	// ── Audit : clauses propriétaire ────────────────────────────────────────
	describe('le prof ne touche pas à ce qui n’est pas à lui', () => {
		let adminSeriesId: string;
		let adminEvaluationId: string;
		let adminAssignmentId: string;
		let ownEvaluationId: string;
		let ownAssignmentId: string;

		beforeAll(async () => {
			const { data: series, error } = await admin.client
				.from('series')
				.insert({
					title: 'Série de l’admin',
					grade: '6',
					categories: CATEGORIES,
					created_by: admin.id
				})
				.select('id')
				.single();
			expect(error, 'décor : série admin').toBeNull();
			adminSeriesId = series!.id;

			const { data: evaluation, error: evalError } = await admin.client
				.from('evaluations')
				.insert({ series_id: adminSeriesId, form: 'interactive', created_by: admin.id })
				.select('id')
				.single();
			expect(evalError, 'décor : évaluation admin').toBeNull();
			adminEvaluationId = evaluation!.id;

			const { data: assignment, error: assignError } = await admin.client
				.from('evaluation_assignments')
				.insert({
					evaluation_id: adminEvaluationId,
					assigned_by: admin.id,
					student_id: studentD.id
				})
				.select('id')
				.single();
			expect(assignError, 'décor : assignation admin').toBeNull();
			adminAssignmentId = assignment!.id;

			const own = await createEvaluation('draft', [{ studentId: studentD.id }], 'Série du prof');
			ownEvaluationId = own.evaluationId;
			const { data: ownAssignment } = await service
				.from('evaluation_assignments')
				.select('id')
				.eq('evaluation_id', ownEvaluationId)
				.single();
			ownAssignmentId = ownAssignment!.id;
		});

		it('attacher une évaluation à la série de l’admin : INSERT refusé', async () => {
			const { error } = await teacher.client
				.from('evaluations')
				.insert({ series_id: adminSeriesId, form: 'interactive', created_by: teacher.id })
				.select('id');
			expect(error?.code).toBe('42501');
			const { data } = await service
				.from('evaluations')
				.select('id')
				.eq('series_id', adminSeriesId)
				.eq('created_by', teacher.id);
			expect(data).toEqual([]);
		});

		it('déplacer son évaluation sur la série de l’admin : UPDATE refusé', async () => {
			const { error } = await teacher.client
				.from('evaluations')
				.update({ series_id: adminSeriesId })
				.eq('id', ownEvaluationId)
				.select('id');
			expect(error?.code).toBe('42501');
			const { data } = await service
				.from('evaluations')
				.select('series_id')
				.eq('id', ownEvaluationId);
			expect(data![0].series_id).not.toBe(adminSeriesId);
		});

		// Double garde : USING de l'UPDATE ET policy SELECT (un UPDATE ne voit que
		// les lignes lisibles). La preuve rouge neutralise les deux.
		it('modifier l’assignation d’une évaluation de l’admin : 0 ligne, base inchangée', async () => {
			const { data } = await teacher.client
				.from('evaluation_assignments')
				.update({ student_id: studentB.id })
				.eq('id', adminAssignmentId)
				.select('id');
			expect(data).toEqual([]);
			const { data: row } = await service
				.from('evaluation_assignments')
				.select('student_id')
				.eq('id', adminAssignmentId);
			expect(row).toEqual([{ student_id: studentD.id }]);
		});

		it('déplacer sa propre assignation vers l’évaluation de l’admin : refusé', async () => {
			// Sans `.select()` EXPRÈS : avec, la policy SELECT refuserait déjà la
			// ligne rendue, et le WITH CHECK de l'UPDATE ne serait plus prouvé.
			const { error } = await teacher.client
				.from('evaluation_assignments')
				.update({ evaluation_id: adminEvaluationId })
				.eq('id', ownAssignmentId);
			expect(error?.code).toBe('42501');
			const { data: row } = await service
				.from('evaluation_assignments')
				.select('evaluation_id')
				.eq('id', ownAssignmentId);
			expect(row).toEqual([{ evaluation_id: ownEvaluationId }]);
		});
	});

	// ── Effacement RGPD d'un élève ──────────────────────────────────────────
	it('supprimer un élève qui a passé une évaluation : profil, séances et assignations effacés', async () => {
		const profile = await TestData.profile().withRole('student').create();
		const leaver: Person = { id: profile.id, client: await signIn(profile.email) };
		const { error: memberError } = await service
			.from('class_members')
			.insert({ class_id: k1Id, student_id: leaver.id, status: 'active' });
		expect(memberError, 'décor : inscription').toBeNull();
		const passed = await createEvaluation('published', [{ studentId: leaver.id }], 'RGPD');
		const { data: session, error: sessionError } = await insertSession(
			leaver.client,
			leaver.id,
			passed.evaluationId
		);
		expect(sessionError, 'décor : séance').toBeNull();

		const { error } = await service.auth.admin.deleteUser(leaver.id);
		expect(error).toBeNull();

		const { data: profiles } = await service.from('profiles').select('id').eq('id', leaver.id);
		const { data: sessions } = await service
			.from('test_sessions')
			.select('id')
			.eq('id', session!.id);
		const { data: assignments } = await service
			.from('evaluation_assignments')
			.select('id')
			.eq('student_id', leaver.id);
		expect([profiles, sessions, assignments]).toEqual([[], [], []]);

		// Plus aucune séance : la série redevient modifiable
		const { data: unlocked } = await teacher.client
			.from('series')
			.update({ title: 'RGPD retouchée' })
			.eq('id', passed.seriesId)
			.select('id');
		expect(unlocked).toHaveLength(1);
	});
});
