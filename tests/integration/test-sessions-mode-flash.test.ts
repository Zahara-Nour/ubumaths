/**
 * Séances de flash-cards (`test_sessions.mode = 'flash'`) — tests d'intégration
 * ===========================================================================
 *
 * Décision de David (2026-09-30, Q12) : une séance de la forme « Flash-cards »
 * s'enregistre comme les autres formes. Question d'accès tranchée : aucune policy
 * ne change ; l'élève lit les siennes, le prof celles de ses élèves.
 *
 * DOIVENT échouer sans les migrations 20260930120000 (contrainte `mode`) et
 * 20260930121000 / 20260930130000 (une séance flash n'est jamais rattachée à une
 * évaluation ; depuis 20260930150000, par `evaluation_id` seulement).
 *
 * `pnpm db:start` puis `pnpm test:integration`.
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';

/** Séance insérée PAR L'ÉLÈVE lui-même, comme le fait la sauvegarde. */
async function insertAsStudent(email: string, userId: string, mode: string) {
	const client = await createAuthenticatedClient(email);
	return client
		.from('test_sessions')
		.insert({
			user_id: userId,
			// Valeur hors du type généré tant que db:types n'a pas tourné
			mode: mode as 'interactive',
			categories: [],
			score: 5,
			total_questions: 4,
			completed_at: new Date().toISOString()
		})
		.select('id')
		.single();
}

describe("séances de flash-cards (mode 'flash')", () => {
	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	it("l'élève enregistre une séance de flash-cards", async () => {
		const student = await TestData.profile().withRole('student').create();

		const { data, error } = await insertAsStudent(student.email, student.id, 'flash');

		expect(error).toBeNull();
		expect(data?.id).toBeTruthy();
	});

	it('le prof lit la séance de flash-cards de son élève', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const { data: session } = await insertAsStudent(student.email, student.id, 'flash');
		expect(session?.id).toBeTruthy();

		const client = await createAuthenticatedClient(teacher.email);
		const { data, error } = await client
			.from('test_sessions')
			.select('id, mode')
			.eq('id', session!.id);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: session!.id, mode: 'flash' }]);
	});

	it('un autre élève ne lit pas la séance de flash-cards', async () => {
		const student = await TestData.profile().withRole('student').create();
		const other = await TestData.profile().withRole('student').create();
		const { data: session } = await insertAsStudent(student.email, student.id, 'flash');
		expect(session?.id).toBeTruthy();

		const client = await createAuthenticatedClient(other.email);
		const { data } = await client.from('test_sessions').select('id').eq('id', session!.id);
		expect(data).toEqual([]);
	});

	it('une valeur inconnue reste refusée (la contrainte existe toujours)', async () => {
		const student = await TestData.profile().withRole('student').create();

		const { error } = await insertAsStudent(student.email, student.id, 'n-importe-quoi');

		expect(error?.code).toBe('23514');
	});

	it('les réponses d’une séance flash : lues par le prof, pas par un autre élève', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const other = await TestData.profile().withRole('student').create();
		const { data: session } = await insertAsStudent(student.email, student.id, 'flash');
		expect(session?.id).toBeTruthy();

		const studentClient = await createAuthenticatedClient(student.email);
		const { data: inserted, error } = await studentClient
			.from('test_answers')
			.insert({
				test_session_id: session!.id,
				question_instance: { statement: 'Combien font 2 + 2 ?' },
				user_answer: { selfAssessed: true },
				is_correct: true
			})
			.select('id');
		expect(error).toBeNull();
		expect(inserted).toHaveLength(1);

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const { data: seenByTeacher } = await teacherClient
			.from('test_answers')
			.select('id')
			.eq('test_session_id', session!.id);
		expect(seenByTeacher).toHaveLength(1);

		const otherClient = await createAuthenticatedClient(other.email);
		const { data: seenByOther } = await otherClient
			.from('test_answers')
			.select('id')
			.eq('test_session_id', session!.id);
		expect(seenByOther).toEqual([]);
	});

	it('une séance flash rattachée à une évaluation est refusée', async () => {
		// Depuis 20260930150000, le rattachement passe par `evaluation_id` : la
		// contrainte `test_sessions_flash_sans_assignation` (ancienne colonne
		// `assignment_id`, supprimée) est relayée par `test_sessions_flash_sans_evaluation`.
		const service = createServiceRoleClient();
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const { data: series, error: seriesError } = await service
			.from('series')
			.insert({
				title: 'Évaluation test',
				grade: '6',
				categories: [{ category: 'entiers/1', quantity: 1, delay: 20 }],
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(seriesError).toBeNull();
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
		expect(evaluationError).toBeNull();
		const { error: assignmentError } = await service
			.from('evaluation_assignments')
			.insert({ evaluation_id: evaluation!.id, assigned_by: teacher.id, student_id: student.id });
		expect(assignmentError).toBeNull();

		// Depuis 20260930160000 (Q38), seul le serveur (service_role) crée une
		// séance d'évaluation : la contrainte se prouve donc avec le service (le
		// client de l'élève est refusé plus tôt, par la RLS, en 42501).
		const client = await createAuthenticatedClient(student.email);
		const { error: studentError } = await client.from('test_sessions').insert({
			user_id: student.id,
			mode: 'flash' as 'interactive',
			categories: [],
			total_questions: 4,
			evaluation_id: evaluation!.id
		});
		expect(studentError?.code).toBe('42501');

		const { error } = await service
			.from('test_sessions')
			.insert({
				user_id: student.id,
				mode: 'flash' as 'interactive',
				categories: [],
				score: 10,
				total_questions: 4,
				evaluation_id: evaluation!.id,
				completed_at: new Date().toISOString()
			})
			.select('id')
			.single();
		expect(error?.code).toBe('23514');
		// La contrainte flash, pas celle du mode (même code 23514)
		expect(error?.message).toContain('test_sessions_flash_sans_evaluation');

		// Témoin : la même séance en Entraînement reste acceptée (par le serveur)
		const { error: interactiveError } = await service
			.from('test_sessions')
			.insert({
				user_id: student.id,
				mode: 'interactive',
				categories: [],
				score: 10,
				total_questions: 4,
				evaluation_id: evaluation!.id,
				completed_at: new Date().toISOString()
			})
			.select('id')
			.single();
		expect(interactiveError).toBeNull();
	});
});
