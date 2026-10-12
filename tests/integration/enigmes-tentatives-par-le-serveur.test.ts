/**
 * Énigmes : une tentative ne s'écrit plus que par le serveur (audit de #1077)
 * ==========================================================================
 *
 * Mesuré en prod le 2026-10-11 : la policy « Students can create own attempts » laissait
 * l'élève insérer une tentative avec `is_correct` et `gidouilles_awarded` de son choix ;
 * la vue `riddle_progress`, sans lecteur depuis #1079, restait lisible par tout compte
 * connecté.
 *
 * Décision de David (2026-10-11) : correction des énigmes côté serveur seulement ; retirer
 * l'accès à la vue, sans la supprimer.
 *
 * Ce que le fichier prouve :
 *   1. l'élève ne peut plus insérer lui-même une tentative ;
 *   2. un compte connecté ne lit plus `riddle_progress` ;
 *   3. la soumission par le client service (chemin de la route) fonctionne toujours ;
 *   4. `submit_riddle_attempt` refuse tout autre appelant que le client service ou l'élève
 *      lui-même — y compris un appel sans auth.uid(), que l'ancienne garde laissait passer.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// ============================================================================
// HELPERS
// ============================================================================

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
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

// ============================================================================
// TESTS
// ============================================================================

describe('énigmes : tentatives écrites par le serveur seulement', () => {
	let riddleId: string;
	let eleve: { id: string; email: string };
	let autre: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		const auteur = await TestData.profile().withRole('teacher').create();
		eleve = await TestData.profile().withRole('student').create();
		autre = await TestData.profile().withRole('student').create();
		const { rows } = await pg.query<{ id: string }>(
			`insert into riddles (title, difficulty, statement, created_by, status)
			 values ('zz-énigme triche', 1, 'zz', $1, 'published') returning id`,
			[auteur.id]
		);
		riddleId = rows[0].id;
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from riddle_attempts where riddle_id = $1', [riddleId]);
		await pg.query('delete from riddles where id = $1', [riddleId]);
		await cleanupAllTestData();
	});

	it('l’élève ne peut plus insérer une tentative juste à sa guise', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client.from('riddle_attempts').insert({
			riddle_id: riddleId,
			student_id: eleve.id,
			attempt_number: 1,
			submitted_answer: {},
			is_correct: true,
			gidouilles_awarded: 999999
		});
		expect(error).not.toBeNull();

		const pg = await getPostgresClient();
		const { rows } = await pg.query('select 1 from riddle_attempts where student_id = $1', [
			eleve.id
		]);
		expect(rows).toEqual([]);
	});

	it('un compte connecté ne lit plus riddle_progress', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client.from('riddle_progress').select('student_id').limit(1);
		expect(error).not.toBeNull();
	});

	it('la soumission par le client service fonctionne (chemin de la route)', async () => {
		const { data, error } = await createServiceRoleClient().rpc('submit_riddle_attempt', {
			p_riddle_id: riddleId,
			p_student_id: eleve.id,
			p_submitted_answer: { value: 'zz' },
			p_is_correct: false
		});
		expect(error).toBeNull();
		expect(data?.[0]?.attempt_id).toEqual(expect.any(String));
	});

	it('l’élève ne soumet plus lui-même : droit retiré aux comptes connectés', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client.rpc('submit_riddle_attempt', {
			p_riddle_id: riddleId,
			p_student_id: eleve.id,
			p_submitted_answer: { value: 'zz' },
			p_is_correct: true
		});
		expect(error?.code).toBe('42501');
	});

	it('un élève ne soumet pas pour un autre', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client.rpc('submit_riddle_attempt', {
			p_riddle_id: riddleId,
			p_student_id: autre.id,
			p_submitted_answer: { value: 'zz' },
			p_is_correct: true
		});
		// Refusé par le droit (42501), avant la garde (testée plus bas sous `postgres`).
		expect(error?.code).toBe('42501');
	});

	// Garde du corps de la fonction, testée sous `postgres` (qui garde EXECUTE) : sous le
	// rôle `authenticated`, le droit retiré refuserait avant la garde et le test passerait
	// même sans elle. Elle sert encore aux appels imbriqués (démineur, énigmes).
	for (const [cas, claims] of [
		['sans identité', () => ({ role: 'authenticated' })],
		['avec l’identité d’un autre élève', () => ({ role: 'authenticated', sub: eleve.id })]
	] as const) {
		it(`la garde refuse un appel ${cas}`, async () => {
			const pg = await getPostgresClient();
			await pg.query('begin');
			try {
				await pg.query(`select set_config('request.jwt.claims', $1, true)`, [
					JSON.stringify(claims())
				]);
				await expect(
					pg.query(`select * from submit_riddle_attempt($1, $2, '{}'::jsonb, true)`, [
						riddleId,
						autre.id
					])
				).rejects.toThrow(/Unauthorized/);
			} finally {
				await pg.query('rollback');
			}
		});
	}
});
