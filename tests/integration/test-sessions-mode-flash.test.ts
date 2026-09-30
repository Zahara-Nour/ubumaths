/**
 * Séances de flash-cards (`test_sessions.mode = 'flash'`) — tests d'intégration
 * ===========================================================================
 *
 * Décision de David (2026-09-30, Q12) : une séance de la forme « Flash-cards »
 * s'enregistre comme les autres formes. Question d'accès tranchée : aucune policy
 * ne change ; l'élève lit les siennes, le prof celles de ses élèves.
 *
 * DOIVENT échouer sans la migration 20260930120000 (contrainte `mode`).
 *
 * `pnpm db:start` puis `pnpm test:integration`.
 */

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
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
});
