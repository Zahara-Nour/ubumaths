/**
 * Jeux : la récompense du jour ne s'enregistre plus que par le serveur (audit de #1132)
 * =====================================================================================
 *
 * Mesuré en prod le 2026-10-12 : `record_game_reward` est exécutable par tout compte
 * connecté, et sa garde (`auth.uid() != p_student_id`) laissait passer un appel sans
 * identité — `NULL != x` vaut NULL. L'élève pouvait s'attribuer la gidouille du jour de
 * chaque type de jeu, sans jouer.
 *
 * Décision de David (2026-10-12) : la récompense est enregistrée par le serveur.
 *
 * Ce que le fichier prouve :
 *   1. un appel sans auth.uid() ni rôle service est refusé (rouge sans la migration) ;
 *   2. l'enregistrement par le client service (chemin des routes 2048 et Mathémo) marche ;
 *   3. un élève n'enregistre pas de récompense pour un autre ;
 *   4. étape 2 (après le deploy de v0.25.0) : un compte connecté n'appelle plus la fonction,
 *      même pour lui-même (droit EXECUTE retiré, 42501).
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

describe('jeux : récompense du jour enregistrée par le serveur seulement', () => {
	let schoolId: string;
	let eleve: { id: string; email: string };
	let autre: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		eleve = await TestData.profile().withRole('student').create();
		autre = await TestData.profile().withRole('student').create();
		const { rows } = await pg.query<{ id: string }>(
			`insert into schools (name, city, country) values ('zz-école récompenses', 'zz', 'zz') returning id`
		);
		schoolId = rows[0].id;
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		for (const table of ['daily_game_rewards', 'weekly_best_rewards', 'gidouilles_activity']) {
			await pg.query(`delete from ${table} where student_id = any($1)`, [[eleve.id, autre.id]]);
		}
		await pg.query('delete from schools where id = $1', [schoolId]);
		await cleanupAllTestData();
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
					pg.query(
						`select * from record_game_reward($1, 'minesweeper', gen_random_uuid(), 10, $2)`,
						[autre.id, schoolId]
					)
				).rejects.toThrow(/Unauthorized/);
			} finally {
				await pg.query('rollback');
			}
		});
	}

	it('l’enregistrement par le client service fonctionne (chemin des routes)', async () => {
		const { data, error } = await createServiceRoleClient().rpc('record_game_reward', {
			p_student_id: eleve.id,
			p_game_type: '2048',
			p_game_id: crypto.randomUUID(),
			p_theoretical_reward: 5,
			p_school_id: schoolId
		});
		expect(error).toBeNull();
		expect(data?.[0]?.is_first_win).toBe(true);
	});

	it('un élève n’enregistre pas de récompense pour un autre', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client.rpc('record_game_reward', {
			p_student_id: autre.id,
			p_game_type: '2048',
			p_game_id: crypto.randomUUID(),
			p_theoretical_reward: 5,
			p_school_id: schoolId
		});
		// Refusé par le droit (42501), avant la garde (testée plus haut sous `postgres`).
		expect(error?.code).toBe('42501');
	});

	it('l’élève ne s’enregistre plus lui-même : droit retiré aux comptes connectés', async () => {
		const client = await clientFor(autre.email);
		const { error } = await client.rpc('record_game_reward', {
			p_student_id: autre.id,
			p_game_type: 'mathemo',
			p_game_id: crypto.randomUUID(),
			p_theoretical_reward: 5,
			p_school_id: schoolId
		});
		expect(error?.code).toBe('42501');
	});

	// Le démineur crédite sa récompense en appelant record_game_reward depuis
	// complete_minesweeper_game : SECURITY DEFINER, elle s'exécute avec les droits de son
	// propriétaire et garde donc l'appel imbriqué.
	it('le démineur garde sa récompense : appel imbriqué par une fonction DEFINER', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{
			definer: boolean;
			auth_peut_appeler: boolean;
			proprietaire_peut_recompenser: boolean;
		}>(
			`select p.prosecdef as definer,
				has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_peut_appeler,
				has_function_privilege(p.proowner,
					'public.record_game_reward(uuid,text,uuid,numeric,uuid)'::regprocedure,
					'EXECUTE') as proprietaire_peut_recompenser
			from pg_proc p where p.proname = 'complete_minesweeper_game'`
		);
		expect(rows).toEqual([
			{ definer: true, auth_peut_appeler: true, proprietaire_peut_recompenser: true }
		]);
	});
});
