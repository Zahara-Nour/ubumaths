/**
 * Énigmes : réponse attendue et correction rangées à part (étape C sur 3)
 * =======================================================================
 *
 * Mesuré en prod le 2026-10-12 : un élève lit `riddles.answer` et `riddles.correction` de
 * l'énigme du jour ou d'une énigme assignée, par une requête directe.
 *
 * Décision de David (2026-10-12) : réponse et correction réservées au prof (auteur de
 * l'énigme) et à l'admin. Étape A : table `riddle_solutions` + déclencheur de recopie ;
 * étape B : le code n'écrit plus que `riddle_solutions` ; étape C (accord de David du
 * 2026-10-12) : `riddles.answer`, `riddles.correction` et le déclencheur supprimés.
 *
 * Ce que le fichier prouve :
 *   1. `riddles` ne porte plus ni réponse ni correction : l'élève ne peut plus les demander ;
 *   2. le déclencheur de recopie et sa fonction ont disparu ;
 *   3. l'élève à qui l'énigme est assignée lit l'énigme, mais pas sa solution ;
 *   4. anon ne lit pas la table ;
 *   5. l'auteur écrit et lit sa solution, l'admin aussi (un seul prof : invariant mono-prof) ;
 *   6. l'élève n'écrit rien dans la table.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
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

const ANSWER = { type: 'numerical', value: 42 };

// ============================================================================
// HELPERS
// ============================================================================

// Client non typé : le test demande volontairement des colonnes supprimées, que
// `database.ts` (généré depuis la prod) ne connaîtra plus.
async function clientFor(email: string): Promise<SupabaseClient> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client as unknown as SupabaseClient;
}

// ============================================================================
// TESTS
// ============================================================================

describe('énigmes : solution lisible par l’auteur et l’admin seulement', () => {
	let riddleId: string;
	/** Énigme de l'auteur SANS solution : un insert refusé ne l'est pas par la clé primaire. */
	let riddleSansSolutionId: string;
	let auteur: { id: string; email: string };
	let admin: { id: string; email: string };
	let eleve: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		auteur = await TestData.profile().withRole('teacher').create();
		admin = await TestData.profile().withRole('admin').create();
		eleve = await TestData.profile().withRole('student').create();

		// Comme l'application : l'énigme, puis sa solution, par le client de l'auteur.
		const client = await clientFor(auteur.email);
		const { data, error } = await client
			.from('riddles')
			.insert({
				title: 'zz-énigme solution',
				difficulty: 1,
				statement: 'zz',
				created_by: auteur.id,
				status: 'published'
			})
			.select('id')
			.single();
		if (error) throw new Error(`création impossible : ${error.message}`);
		riddleId = data.id;

		const solution = await client
			.from('riddle_solutions')
			.upsert({ riddle_id: riddleId, answer: ANSWER, correction: 'zz-correction secrète' })
			.select('riddle_id');
		if (solution.error || solution.data?.length !== 1) {
			throw new Error(`solution non écrite : ${solution.error?.message}`);
		}

		const pg = await getPostgresClient();
		await pg.query(
			`insert into riddle_assignments (riddle_id, student_id, assigned_by) values ($1, $2, $3)`,
			[riddleId, eleve.id, auteur.id]
		);
		const sansSolution = await pg.query<{ id: string }>(
			`insert into riddles (title, difficulty, statement, created_by, status)
			 values ('zz-énigme sans solution', 1, 'zz', $1, 'published') returning id`,
			[auteur.id]
		);
		riddleSansSolutionId = sansSolution.rows[0].id;
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from riddle_assignments where riddle_id = $1', [riddleId]);
		await pg.query('delete from riddles where id = any($1)', [[riddleId, riddleSansSolutionId]]);
		await cleanupAllTestData();
	});

	it('l’élève ne peut plus demander la réponse ni la correction à riddles', async () => {
		const client = await clientFor(eleve.email);
		for (const colonne of ['answer', 'correction']) {
			const { data, error } = await client.from('riddles').select(colonne).eq('id', riddleId);
			expect(error?.code, colonne).toBe('42703');
			expect(data).toBeNull();
		}
	});

	it('riddles n’a plus les colonnes, ni le déclencheur de recopie, ni sa fonction', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`select
				(select count(*) from information_schema.columns
				 where table_schema = 'public' and table_name = 'riddles'
				   and column_name in ('answer', 'correction'))::int as colonnes,
				(select count(*) from pg_trigger
				 where tgname = 'trigger_sync_riddle_solution')::int as declencheurs,
				(select count(*) from pg_proc where proname = 'sync_riddle_solution')::int as fonctions`
		);
		expect(rows).toEqual([{ colonnes: 0, declencheurs: 0, fonctions: 0 }]);
	});

	it('l’élève lit l’énigme assignée, mais pas sa solution', async () => {
		const client = await clientFor(eleve.email);
		const enigme = await client.from('riddles').select('id').eq('id', riddleId);
		expect(enigme.data).toEqual([{ id: riddleId }]);

		const { data, error } = await client
			.from('riddle_solutions')
			.select('answer, correction')
			.eq('riddle_id', riddleId);
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('anon ne lit pas la table', async () => {
		const client = createClient(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { data, error } = await client.from('riddle_solutions').select('riddle_id');
		expect(error?.code ?? (data ?? []).length).toBeTruthy();
		expect(data ?? []).toEqual([]);
	});

	it('l’auteur et l’admin lisent la solution', async () => {
		for (const compte of [auteur, admin]) {
			const client = await clientFor(compte.email);
			const { data, error } = await client
				.from('riddle_solutions')
				.select('answer, correction')
				.eq('riddle_id', riddleId);
			expect(error).toBeNull();
			expect(data).toEqual([{ answer: ANSWER, correction: 'zz-correction secrète' }]);
		}
	});

	it('l’auteur puis l’admin modifient la solution', async () => {
		for (const [compte, correction] of [
			[auteur, 'zz-nouvelle correction'],
			[admin, 'zz-correction admin']
		] as const) {
			const client = await clientFor(compte.email);
			const { data, error } = await client
				.from('riddle_solutions')
				.update({ correction, answer: null })
				.eq('riddle_id', riddleId)
				.select('riddle_id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);

			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				'select answer, correction from riddle_solutions where riddle_id = $1',
				[riddleId]
			);
			expect(rows).toEqual([{ answer: null, correction }]);
		}
	});

	it('l’élève ne peut pas insérer de solution (refus de la RLS, pas de la clé primaire)', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client
			.from('riddle_solutions')
			.insert({ riddle_id: riddleSansSolutionId, correction: 'piratée' });
		expect(error?.code).toBe('42501');
	});

	it('l’élève ne peut pas supprimer de solution', async () => {
		const client = await clientFor(eleve.email);
		const { data } = await client
			.from('riddle_solutions')
			.delete()
			.eq('riddle_id', riddleId)
			.select('riddle_id');
		expect(data ?? []).toEqual([]);

		const pg = await getPostgresClient();
		const { rows } = await pg.query('select 1 from riddle_solutions where riddle_id = $1', [
			riddleId
		]);
		expect(rows).toHaveLength(1);
	});

	it('l’élève ne peut rien écrire dans la table', async () => {
		const client = await clientFor(eleve.email);
		const { data } = await client
			.from('riddle_solutions')
			.update({ correction: 'piratée' })
			.eq('riddle_id', riddleId)
			.select('riddle_id');
		expect(data ?? []).toEqual([]);
	});
});
