/**
 * Mathémo : les statistiques ne s'enregistrent plus que par le serveur (audit de #1147)
 * ====================================================================================
 *
 * Mesuré en prod le 2026-10-12 : `upsert_mathemo_score` est exécutable par tout compte
 * connecté, ajoute `p_score` au total sans borne, et sa garde (`auth.uid() != p_user_id`)
 * laissait passer un appel sans identité — `NULL != x` vaut NULL.
 *
 * Décision de David (2026-10-12) : comme pour 2048, le serveur enregistre les statistiques.
 *
 * Ce que le fichier prouve :
 *   1. un appel sans auth.uid() ni rôle service est refusé (rouge sans la migration) ;
 *   2. l'enregistrement par le client service (chemin de la route) fonctionne ;
 *   3. un élève n'enregistre pas de statistiques pour un autre ;
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

describe('Mathémo : statistiques enregistrées par le serveur seulement', () => {
	let eleve: { id: string; email: string };
	let autre: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		eleve = await TestData.profile().withRole('student').create();
		autre = await TestData.profile().withRole('student').create();
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from mathemo_scores where user_id = any($1)', [[eleve.id, autre.id]]);
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
					pg.query(`select * from upsert_mathemo_score($1, 5, true, true, 999999)`, [autre.id])
				).rejects.toThrow(/Unauthorized/);
			} finally {
				await pg.query('rollback');
			}
		});
	}

	it('l’enregistrement par le client service fonctionne (chemin de la route)', async () => {
		const { data, error } = await createServiceRoleClient().rpc('upsert_mathemo_score', {
			p_user_id: eleve.id,
			p_word_length: 5,
			p_won: true,
			p_found_first_try: false,
			p_score: 120
		});
		expect(error).toBeNull();
		expect(data?.[0]?.games_played).toBe(1);
	});

	it('un élève n’enregistre pas de statistiques pour un autre', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client.rpc('upsert_mathemo_score', {
			p_user_id: autre.id,
			p_word_length: 5,
			p_won: true,
			p_found_first_try: true,
			p_score: 999999
		});
		// Refusé par le droit (42501), avant la garde (testée plus haut sous `postgres`).
		expect(error?.code).toBe('42501');
	});

	it('l’élève ne s’enregistre plus lui-même : droit retiré aux comptes connectés', async () => {
		const client = await clientFor(autre.email);
		const { error } = await client.rpc('upsert_mathemo_score', {
			p_user_id: autre.id,
			p_word_length: 5,
			p_won: false,
			p_found_first_try: false,
			p_score: 0
		});
		expect(error?.code).toBe('42501');
	});
});
