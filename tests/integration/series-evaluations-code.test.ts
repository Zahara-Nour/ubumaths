/**
 * Séries et évaluations — le CODE face à la vraie RLS (chantier 4, PR 2)
 * =====================================================================
 *
 * Les tests unitaires simulent la base ; ici, les fonctions de
 * `$lib/server/series` et `$lib/server/evaluations` tournent avec les clients
 * RÉELS du prof et
 * des élèves. Ce que la RLS décide :
 *
 * - l'élève lit SA série à travers son évaluation (jointure imbriquée) ;
 * - ses tentatives se comptent par `evaluation_id` ;
 * - le prof voit les séances de ses élèves (verrou affiché, résultats) ;
 * - la base refuse la modification d'une série commencée (UBS01) et le code
 *   le dit en français ; la suppression d'une série utilisée est refusée.
 * (Le rattachement d'une séance à l'évaluation est désormais le fait du
 * serveur seul : `tests/integration/evaluation-notee-serveur.test.ts`.)
 *
 * Depuis 20260930160000 (Q38), les séances d'évaluation sont posées par le
 * service (le serveur) : l'élève ne les écrit plus lui-même.
 *
 * `pnpm db:start` puis
 * `pnpm test:integration tests/integration/series-evaluations-code.test.ts`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import {
	deleteSeries,
	duplicateSeries,
	getTeacherSeries,
	SERIES_LOCKED_UPDATE_MESSAGE,
	updateSeries
} from '$lib/server/series';
import {
	countAttempts,
	getAssignmentWithEvaluation,
	getEvaluationResults,
	getStudentAssignments,
	validateAttempt
} from '$lib/server/evaluations';

// Types
type Client = SupabaseClient<Database>;
type Person = { id: string; client: Client; isTest: boolean };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CATEGORIES = [
	{
		category: { theme: 'Calcul ZZ', domain: 'Tables', subdomain: null, level: 3 },
		quantity: 2,
		delay: 20
	}
];

// Variables
const service = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
/** Membre actif de la classe assignée */
let student: Person;
/** Membre d'une autre classe */
let outsider: Person;
let seriesId: string;
let evaluationId: string;
let assignmentId: string;
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
	const { data } = await service.from('profiles').select('is_test').eq('id', profile.id).single();
	return { id: profile.id, client: await signIn(profile.email), isTest: !!data?.is_test };
}

/**
 * Séance d'évaluation de l'élève, posée par le SERVICE : depuis 20260930160000
 * (Q38), seul le serveur crée une séance rattachée à une évaluation. Les
 * LECTURES testées ici passent toujours par les clients réels.
 */
async function studentSession(score: number) {
	// Note sur 20 écrite par le serveur à l'envoi (chantier 5) : même note, sur 20
	const { data, error } = await service
		.from('test_sessions')
		.insert({
			user_id: student.id,
			mode: 'course',
			categories: CATEGORIES,
			total_questions: 2,
			score,
			grade: score * 2,
			completed_at: new Date().toISOString(),
			evaluation_id: evaluationId
		})
		.select('id')
		.single();
	expect(error, 'séance de l’élève').toBeNull();
	return data!.id;
}

describe('séries et évaluations : le code sous la vraie RLS', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		teacher = await person('teacher');
		student = await person('student');
		outsider = await person('student');

		const k1 = await TestData.class().withName('6e A code ZZ').create();
		const k2 = await TestData.class().withName('6e B code ZZ').create();
		classId = k1.id;
		const { error } = await service.from('class_members').insert([
			{ class_id: k1.id, student_id: student.id, status: 'active' },
			{ class_id: k2.id, student_id: outsider.id, status: 'active' }
		]);
		expect(error, 'décor : inscriptions').toBeNull();

		const { data: series, error: e1 } = await teacher.client
			.from('series')
			.insert({ title: 'Tables ZZ', grade: '6', categories: CATEGORIES, created_by: teacher.id })
			.select('id')
			.single();
		expect(e1, 'décor : série').toBeNull();
		seriesId = series!.id;

		const { data: evaluation, error: e2 } = await teacher.client
			.from('evaluations')
			.insert({
				series_id: seriesId,
				form: 'course',
				time_limit: 420,
				max_attempts: 2,
				status: 'published',
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(e2, 'décor : évaluation').toBeNull();
		evaluationId = evaluation!.id;

		const { data: assignment, error: e3 } = await teacher.client
			.from('evaluation_assignments')
			.insert({ evaluation_id: evaluationId, class_id: k1.id, assigned_by: teacher.id })
			.select('id')
			.single();
		expect(e3, 'décor : assignation').toBeNull();
		assignmentId = assignment!.id;
	}, 180_000);

	afterAll(async () => {
		// Détacher les séances avant le nettoyage : la clé NO ACTION refuserait sinon
		await service.from('test_sessions').update({ evaluation_id: null }).eq('user_id', student.id);
		await cleanupAllTestData();
	});

	it('l’élève lit son évaluation ET sa série à travers l’assignation', async () => {
		const found = await getAssignmentWithEvaluation(student.client, assignmentId);
		expect(found).not.toBeNull();
		expect(found!.evaluation).toMatchObject({ id: evaluationId, form: 'course', time_limit: 420 });
		expect(found!.evaluation.series.title).toBe('Tables ZZ');
		expect(found!.evaluation.series.categories).toEqual(CATEGORIES);
	});

	it('un élève d’une autre classe ne voit rien (null, pas d’erreur)', async () => {
		expect(await getAssignmentWithEvaluation(outsider.client, assignmentId)).toBeNull();
	});

	it('avant toute séance : série non verrouillée, modifiable', async () => {
		const [series] = await getTeacherSeries(teacher.client, teacher.id);
		expect(series).toMatchObject({ id: seriesId, locked: false, evaluations_count: 1 });

		const updated = await updateSeries(teacher.client, seriesId, {
			title: 'Tables ZZ',
			description: 'avant',
			categories: CATEGORIES
		});
		expect(updated.description).toBe('avant');
	});

	it('B14 : tentatives comptées par evaluation_id, bornées par max_attempts', async () => {
		expect(await countAttempts(student.client, evaluationId, student.id)).toBe(0);

		await studentSession(6);
		const evaluation = (await getAssignmentWithEvaluation(student.client, assignmentId))!
			.evaluation;
		expect(await validateAttempt(student.client, evaluation, student.id)).toMatchObject({
			can_attempt: true,
			current_attempts: 1,
			attempts_remaining: 1
		});

		await studentSession(8);
		expect(await validateAttempt(student.client, evaluation, student.id)).toMatchObject({
			can_attempt: false,
			current_attempts: 2
		});
	});

	it('« Mes évaluations » : forme, série et meilleure note de l’élève', async () => {
		const [assignment] = await getStudentAssignments(student.client, student.id);
		expect(assignment).toMatchObject({ id: assignmentId, attempts_count: 2, best_grade: 16 });
		expect(assignment.evaluation.form).toBe('course');
		expect(assignment.evaluation.series.title).toBe('Tables ZZ');
	});

	it('le prof voit le verrou et les résultats (séances de ses élèves)', async () => {
		const [series] = await getTeacherSeries(teacher.client, teacher.id);
		expect(series.locked).toBe(true);

		const evaluation = (await getAssignmentWithEvaluation(teacher.client, assignmentId))!
			.evaluation;
		const results = await getEvaluationResults(teacher.client, evaluation, student.isTest);
		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({ student_id: student.id, attempts_count: 2, best_grade: 16 });
	});

	it('B13 : modifier la série commencée → 409 et message français, base inchangée', async () => {
		await expect(
			updateSeries(teacher.client, seriesId, { title: 'Changée', description: null })
		).rejects.toMatchObject({ status: 409, message: SERIES_LOCKED_UPDATE_MESSAGE });

		const { data } = await service.from('series').select('title').eq('id', seriesId).single();
		expect(data!.title).toBe('Tables ZZ');
	});

	it('Q31 : supprimer la série utilisée → 409, base inchangée', async () => {
		await expect(deleteSeries(teacher.client, seriesId)).rejects.toMatchObject({ status: 409 });
		const { data } = await service.from('series').select('id').eq('id', seriesId);
		expect(data).toHaveLength(1);
	});

	it('B12 : la copie d’une série verrouillée est libre et modifiable', async () => {
		const copy = await duplicateSeries(teacher.client, seriesId, teacher.id);
		expect(copy.title).toBe('Copie de Tables ZZ');

		const list = await getTeacherSeries(teacher.client, teacher.id);
		expect(list.find((s) => s.id === copy.id)).toMatchObject({
			locked: false,
			evaluations_count: 0
		});

		const updated = await updateSeries(teacher.client, copy.id, {
			title: 'Ma copie',
			description: null
		});
		expect(updated.title).toBe('Ma copie');

		// Une série sans évaluation se supprime
		await expect(deleteSeries(teacher.client, copy.id)).resolves.toBeUndefined();
	});

	it('B16 : au-delà de max_attempts = 1, la deuxième tentative est refusée', async () => {
		const { data: series } = await teacher.client
			.from('series')
			.insert({ title: 'Une fois ZZ', grade: '6', categories: CATEGORIES, created_by: teacher.id })
			.select('id')
			.single();
		const { data: evaluation } = await teacher.client
			.from('evaluations')
			.insert({
				series_id: series!.id,
				form: 'interactive',
				max_attempts: 1,
				status: 'published',
				created_by: teacher.id
			})
			.select('id')
			.single();
		const { data: assignment, error } = await teacher.client
			.from('evaluation_assignments')
			.insert({ evaluation_id: evaluation!.id, class_id: classId, assigned_by: teacher.id })
			.select('id')
			.single();
		expect(error, 'décor').toBeNull();

		// Première tentative : acceptée
		const found = await getAssignmentWithEvaluation(student.client, assignment!.id);
		expect(found).not.toBeNull();
		const first = await validateAttempt(student.client, found!.evaluation, student.id);
		expect(first.can_attempt).toBe(true);
		// Séance posée par le serveur (Q38) ; `validateAttempt` lit sous RLS
		const { error: insertError } = await service.from('test_sessions').insert({
			user_id: student.id,
			mode: 'interactive',
			categories: CATEGORIES,
			total_questions: 2,
			score: 5,
			completed_at: new Date().toISOString(),
			evaluation_id: evaluation!.id
		});
		expect(insertError).toBeNull();

		// Deuxième : refusée
		const second = await validateAttempt(student.client, found!.evaluation, student.id);
		expect(second).toMatchObject({ can_attempt: false, current_attempts: 1 });
	});
});
