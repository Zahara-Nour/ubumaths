/**
 * Le prof lit les sessions automaths de ses élèves — tests d'intégration
 * ======================================================================
 *
 * Décision de David (2026-09-28) : le prof (et l'admin) lit les sessions
 * (`test_sessions`) et le détail des réponses (`test_answers`) de ses élèves.
 * Sans cela, la page « Résultats d'une évaluation » (`getAssessmentResults`)
 * affichait « aucun résultat » : la RLS rend zéro ligne, sans erreur.
 *
 * Même règle que les tentatives (`skill_attempts_select_teacher`) :
 * `is_my_student(user_id)` — en mono-prof, le prof unique ou l'admin voit
 * TOUS les élèves. Un élève ne lit toujours que les siennes.
 *
 * DOIVENT échouer sans la migration 20260928140000.
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
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('sessions automaths : lecture par le prof', () => {
	let service: SupabaseClient<Database>;

	afterAll(async () => {
		await cleanupAllTestData();
	});

	beforeEach(async () => {
		service = createServiceRoleClient();
		await cleanupAllTestData();
	});

	/** Une session de l'élève et une réponse, écrites par le service. */
	async function sessionDe(studentId: string) {
		const { data: session, error } = await service
			.from('test_sessions')
			.insert({
				user_id: studentId,
				mode: 'interactive',
				categories: [],
				score: 7,
				total_questions: 2,
				completed_at: new Date().toISOString()
			})
			.select('id')
			.single();
		expect(error).toBeNull();

		const { data: answers, error: answerError } = await service
			.from('test_answers')
			.insert({
				test_session_id: session!.id,
				question_instance: { statement: 'Combien font 2 + 2 ?' },
				user_answer: { blanks: ['4'] },
				is_correct: true
			})
			.select('id');
		expect(answerError).toBeNull();
		expect(answers).toHaveLength(1);
		return session!.id;
	}

	it('le prof lit la session et les réponses d’un élève', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const sessionId = await sessionDe(student.id);

		const client = await createAuthenticatedClient(teacher.email);
		const { data: sessions, error } = await client
			.from('test_sessions')
			.select('id, score')
			.eq('id', sessionId);
		expect(error).toBeNull();
		expect(sessions).toEqual([{ id: sessionId, score: 7 }]);

		const { data: answers, error: answersError } = await client
			.from('test_answers')
			.select('is_correct')
			.eq('test_session_id', sessionId);
		expect(answersError).toBeNull();
		expect(answers).toEqual([{ is_correct: true }]);
	});

	it('l’admin lit la session d’un élève', async () => {
		const admin = await TestData.profile().withRole('admin').create();
		const student = await TestData.profile().withRole('student').create();
		const sessionId = await sessionDe(student.id);

		const client = await createAuthenticatedClient(admin.email);
		const { data } = await client.from('test_sessions').select('id').eq('id', sessionId);
		expect(data).toHaveLength(1);
		const { data: answers } = await client
			.from('test_answers')
			.select('id')
			.eq('test_session_id', sessionId);
		expect(answers).toHaveLength(1);
	});

	it('un autre élève ne lit ni la session ni les réponses', async () => {
		const student = await TestData.profile().withRole('student').create();
		const other = await TestData.profile().withRole('student').create();
		const sessionId = await sessionDe(student.id);

		const client = await createAuthenticatedClient(other.email);
		const { data: sessions } = await client.from('test_sessions').select('id').eq('id', sessionId);
		expect(sessions).toEqual([]);
		const { data: answers } = await client
			.from('test_answers')
			.select('id')
			.eq('test_session_id', sessionId);
		expect(answers).toEqual([]);
	});

	it('l’élève lit toujours ses propres sessions', async () => {
		const student = await TestData.profile().withRole('student').create();
		const sessionId = await sessionDe(student.id);

		const client = await createAuthenticatedClient(student.email);
		const { data } = await client.from('test_sessions').select('id').eq('id', sessionId);
		expect(data).toHaveLength(1);
		const { data: answers } = await client
			.from('test_answers')
			.select('id')
			.eq('test_session_id', sessionId);
		expect(answers).toHaveLength(1);
	});

	it('le prof ne peut ni modifier ni supprimer une session d’élève', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const sessionId = await sessionDe(student.id);

		const client = await createAuthenticatedClient(teacher.email);
		const { data: updated } = await client
			.from('test_sessions')
			.update({ score: 10 })
			.eq('id', sessionId)
			.select('id');
		expect(updated).toEqual([]);
		const { data: deleted } = await client
			.from('test_sessions')
			.delete()
			.eq('id', sessionId)
			.select('id');
		expect(deleted).toEqual([]);

		const { data: still } = await service
			.from('test_sessions')
			.select('score')
			.eq('id', sessionId)
			.single();
		expect(still?.score).toBe(7);
	});

	it('le prof ne peut ni ajouter, ni modifier, ni supprimer une réponse d’élève', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const sessionId = await sessionDe(student.id);

		const client = await createAuthenticatedClient(teacher.email);
		const { data: inserted } = await client
			.from('test_answers')
			.insert({ test_session_id: sessionId, question_instance: {}, is_correct: false })
			.select('id');
		expect(inserted ?? []).toEqual([]);
		const { data: updated } = await client
			.from('test_answers')
			.update({ is_correct: false })
			.eq('test_session_id', sessionId)
			.select('id');
		expect(updated).toEqual([]);
		const { data: deleted } = await client
			.from('test_answers')
			.delete()
			.eq('test_session_id', sessionId)
			.select('id');
		expect(deleted).toEqual([]);

		const { data: still } = await service
			.from('test_answers')
			.select('is_correct')
			.eq('test_session_id', sessionId);
		expect(still).toEqual([{ is_correct: true }]);
	});
});
