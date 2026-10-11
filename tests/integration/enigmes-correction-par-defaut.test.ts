/**
 * Énigmes : une création qui ne nomme pas `correction` est acceptée (préparation étape B)
 * ======================================================================================
 *
 * À l'étape B, le code écrit la correction dans `riddle_solutions` et ne nomme plus
 * `riddles.correction` (colonne vouée à disparaître, étape C). Sans défaut, la colonne
 * NOT NULL refuserait la création.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

describe('énigmes : correction par défaut', () => {
	let auteurId: string;
	let riddleId: string | undefined;

	beforeAll(async () => {
		await cleanupAllTestData();
		auteurId = (await TestData.profile().withRole('teacher').create()).id;
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		if (riddleId) await pg.query('delete from riddles where id = $1', [riddleId]);
		await cleanupAllTestData();
	});

	it('une énigme créée sans correction reçoit une chaîne vide', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ id: string; correction: string }>(
			`insert into riddles (title, difficulty, statement, created_by, status)
			 values ('zz-sans correction', 1, 'zz', $1, 'draft') returning id, correction`,
			[auteurId]
		);
		riddleId = rows[0].id;
		expect(rows[0].correction).toBe('');
	});
});
