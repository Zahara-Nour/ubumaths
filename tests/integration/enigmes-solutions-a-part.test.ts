/**
 * Énigmes : réponse attendue et correction rangées à part (étape A sur 3)
 * =======================================================================
 *
 * Mesuré en prod le 2026-10-12 : un élève lit `riddles.answer` et `riddles.correction` de
 * l'énigme du jour ou d'une énigme assignée, par une requête directe.
 *
 * Décision de David (2026-10-12) : réponse et correction réservées au prof (auteur de
 * l'énigme) et à l'admin. Étape A : table `riddle_solutions`, tenue à jour par un
 * déclencheur tant que le code écrit encore dans `riddles`.
 *
 * Ce que le fichier prouve :
 *   1. l'élève à qui l'énigme est assignée lit l'énigme, mais pas sa solution ;
 *   2. anon ne lit pas la table ;
 *   3. l'auteur lit et modifie sa solution, l'admin aussi (un seul prof : invariant mono-prof) ;
 *   4. une énigme écrite dans `riddles` (création, modification) est recopiée.
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

// La table naît avec cette migration : `database.ts` (généré depuis la prod) ne la
// connaît qu'après le push. Le client reste donc non typé ici.
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
	let auteur: { id: string; email: string };
	let admin: { id: string; email: string };
	let eleve: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		auteur = await TestData.profile().withRole('teacher').create();
		admin = await TestData.profile().withRole('admin').create();
		eleve = await TestData.profile().withRole('student').create();

		// Création par l'auteur lui-même : le déclencheur tourne avec ses droits.
		const client = await clientFor(auteur.email);
		const { data, error } = await client
			.from('riddles')
			.insert({
				title: 'zz-énigme solution',
				difficulty: 1,
				statement: 'zz',
				correction: 'zz-correction secrète',
				answer: ANSWER,
				created_by: auteur.id,
				status: 'published'
			})
			.select('id')
			.single();
		if (error) throw new Error(`création impossible : ${error.message}`);
		riddleId = data.id;

		const pg = await getPostgresClient();
		await pg.query(
			`insert into riddle_assignments (riddle_id, student_id, assigned_by) values ($1, $2, $3)`,
			[riddleId, eleve.id, auteur.id]
		);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from riddle_assignments where riddle_id = $1', [riddleId]);
		await pg.query('delete from riddles where id = $1', [riddleId]);
		await cleanupAllTestData();
	});

	it('la création d’une énigme recopie sa solution', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select answer, correction from riddle_solutions where riddle_id = $1',
			[riddleId]
		);
		expect(rows).toEqual([{ answer: ANSWER, correction: 'zz-correction secrète' }]);
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
				.select('correction')
				.eq('riddle_id', riddleId);
			expect(error).toBeNull();
			expect(data).toEqual([{ correction: 'zz-correction secrète' }]);
		}
	});

	it('la modification de l’énigme par l’auteur met la solution à jour', async () => {
		const client = await clientFor(auteur.email);
		const { data, error } = await client
			.from('riddles')
			.update({ correction: 'zz-nouvelle correction', answer: null })
			.eq('id', riddleId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);

		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select answer, correction from riddle_solutions where riddle_id = $1',
			[riddleId]
		);
		expect(rows).toEqual([{ answer: null, correction: 'zz-nouvelle correction' }]);
	});

	it('l’admin qui modifie l’énigme du prof met aussi la solution à jour', async () => {
		const client = await clientFor(admin.email);
		const { data, error } = await client
			.from('riddles')
			.update({ correction: 'zz-correction admin' })
			.eq('id', riddleId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);

		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select correction from riddle_solutions where riddle_id = $1',
			[riddleId]
		);
		expect(rows).toEqual([{ correction: 'zz-correction admin' }]);
	});

	it('l’élève ne peut pas insérer de solution', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client
			.from('riddle_solutions')
			.insert({ riddle_id: riddleId, correction: 'piratée' });
		expect(error).not.toBeNull();
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
