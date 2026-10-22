/**
 * Constructions : création et modification réservées au prof et à l'admin
 * ======================================================================
 *
 * Relevé le 2026-10-22 (doc `docs/systeme/geometrie/constructions.md`) : tout compte
 * connecté, élève compris, pouvait créer une construction publique, dont le titre et la
 * description (texte libre) étaient lus par tous les comptes connectés, toutes écoles
 * confondues. Un client Supabase tournant dans le navigateur, la règle doit être tenue
 * par la base, pas seulement par l'API.
 *
 * Décision de David (2026-10-22) : créer, modifier, publier = prof et admin seuls ; la
 * lecture des constructions publiées reste ouverte à tout compte connecté ; un auteur
 * garde la suppression de ses constructions.
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

const TITRE = 'zz-construction écriture réservée';

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

/** Une construction DSL au nom de `authorId`, posée par la base (hors RLS). */
async function constructionDe(authorId: string, isPublic: boolean): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into constructions (title, format, dsl_script, script, is_public, author_id)
		 values ($1, 'dsl', 'A = point(0, 0)', '{}', $2, $3) returning id`,
		[TITRE, isPublic, authorId]
	);
	return rows[0].id;
}

// ============================================================================
// TESTS
// ============================================================================

describe('constructions : écriture réservée au prof et à l’admin', () => {
	let prof: { id: string; email: string };
	let admin: { id: string; email: string };
	let eleve: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		prof = await TestData.profile().withRole('teacher').create();
		admin = await TestData.profile().withRole('admin').create();
		eleve = await TestData.profile().withRole('student').create();
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from constructions where title = $1', [TITRE]);
		await cleanupAllTestData();
	});

	const nouvelle = (authorId: string) => ({
		title: TITRE,
		format: 'dsl',
		dsl_script: 'A = point(0, 0)',
		script: {},
		is_public: true,
		author_id: authorId
	});

	it('un prof crée, modifie et supprime sa construction', async () => {
		const client = await clientFor(prof.email);
		const { data: cree, error } = await client
			.from('constructions')
			.insert(nouvelle(prof.id))
			.select('id')
			.single();
		expect(error).toBeNull();
		const { data: modifiee } = await client
			.from('constructions')
			.update({ title: TITRE, is_public: false })
			.eq('id', cree!.id)
			.select('id');
		expect(modifiee).toHaveLength(1);
		const { data: supprimee } = await client
			.from('constructions')
			.delete()
			.eq('id', cree!.id)
			.select('id');
		expect(supprimee).toHaveLength(1);
	});

	it('l’admin crée une construction', async () => {
		const client = await clientFor(admin.email);
		const { error } = await client.from('constructions').insert(nouvelle(admin.id));
		expect(error).toBeNull();
	});

	it('un élève ne peut pas créer de construction (42501)', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client.from('constructions').insert(nouvelle(eleve.id));
		expect(error?.code).toBe('42501');
	});

	it('un élève ne peut pas créer de construction privée non plus', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client
			.from('constructions')
			.insert({ ...nouvelle(eleve.id), is_public: false });
		expect(error?.code).toBe('42501');
	});

	it('un élève auteur ne peut plus modifier sa construction (0 ligne)', async () => {
		const id = await constructionDe(eleve.id, false);
		const client = await clientFor(eleve.email);
		const { data, error } = await client
			.from('constructions')
			.update({ is_public: true })
			.eq('id', id)
			.select('id');
		expect(error).toBeNull();
		expect(data).toEqual([]);
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ is_public: boolean }>(
			'select is_public from constructions where id = $1',
			[id]
		);
		expect(rows[0].is_public).toBe(false);
	});

	it('un élève auteur garde la suppression de sa construction', async () => {
		const id = await constructionDe(eleve.id, false);
		const client = await clientFor(eleve.email);
		const { data } = await client.from('constructions').delete().eq('id', id).select('id');
		expect(data).toHaveLength(1);
	});

	it('un élève lit toujours les constructions publiées par le prof', async () => {
		const id = await constructionDe(prof.id, true);
		const client = await clientFor(eleve.email);
		const { data } = await client.from('constructions').select('id').eq('id', id);
		expect(data).toHaveLength(1);
	});
});
