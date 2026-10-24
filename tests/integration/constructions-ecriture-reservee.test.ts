/**
 * Constructions : écriture réservée au prof, qui lit tout
 * =======================================================
 *
 * Relevé le 2026-10-22 (doc `docs/systeme/geometrie/constructions.md`) : tout compte
 * connecté, élève compris, pouvait créer une construction publique. Un client Supabase
 * tournant dans le navigateur, la règle doit être tenue par la base, pas seulement par
 * l'API.
 *
 * Décision de David (2026-10-24) : mono-professeur, la propriété ne sert à rien — le rôle
 * suffit. Le prof crée, modifie, publie, supprime et lit TOUTES les constructions,
 * brouillons compris, même sans auteur (cas des 9 constructions de la prod, dont les
 * comptes ont été supprimés). L'admin et l'élève lisent les constructions publiées, rien
 * d'autre.
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

const NOUVELLE = {
	title: TITRE,
	format: 'dsl',
	dsl_script: 'A = point(0, 0)',
	script: {},
	is_public: true
};

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

/** Une construction DSL posée par la base (hors RLS) ; sans auteur par défaut, comme en prod. */
async function construction(isPublic: boolean, authorId: string | null = null): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into constructions (title, format, dsl_script, script, is_public, author_id)
		 values ($1, 'dsl', 'A = point(0, 0)', '{}', $2, $3) returning id`,
		[TITRE, isPublic, authorId]
	);
	return rows[0].id;
}

async function existe(id: string): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select 1 from constructions where id = $1', [id]);
	return rows.length === 1;
}

// ============================================================================
// TESTS
// ============================================================================

describe('constructions : écriture réservée au prof, qui lit tout', () => {
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

	it('le prof crée une construction sans auteur', async () => {
		const client = await clientFor(prof.email);
		const { data, error } = await client.from('constructions').insert(NOUVELLE).select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	it('le prof lit, modifie et supprime un brouillon sans auteur', async () => {
		const id = await construction(false);
		const client = await clientFor(prof.email);
		const { data: lue } = await client.from('constructions').select('id').eq('id', id);
		expect(lue).toHaveLength(1);
		const { data: modifiee } = await client
			.from('constructions')
			.update({ is_public: true })
			.eq('id', id)
			.select('id');
		expect(modifiee).toHaveLength(1);
		const { data: supprimee } = await client
			.from('constructions')
			.delete()
			.eq('id', id)
			.select('id');
		expect(supprimee).toHaveLength(1);
	});

	for (const qui of ['admin', 'eleve'] as const) {
		const compte = () => (qui === 'admin' ? admin : eleve);

		it(`${qui} : création refusée (42501)`, async () => {
			const client = await clientFor(compte().email);
			const { error } = await client.from('constructions').insert(NOUVELLE);
			expect(error?.code).toBe('42501');
		});

		it(`${qui} : création refusée même en se déclarant auteur`, async () => {
			const client = await clientFor(compte().email);
			const { error } = await client
				.from('constructions')
				.insert({ ...NOUVELLE, is_public: false, author_id: compte().id });
			expect(error?.code).toBe('42501');
		});

		it(`${qui} : modification d’une publiée sans effet (0 ligne)`, async () => {
			const id = await construction(true);
			const client = await clientFor(compte().email);
			const { data, error } = await client
				.from('constructions')
				.update({ is_public: false })
				.eq('id', id)
				.select('id');
			expect(error).toBeNull();
			expect(data).toEqual([]);
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ is_public: boolean }>(
				'select is_public from constructions where id = $1',
				[id]
			);
			expect(rows[0].is_public).toBe(true);
		});

		it(`${qui} : suppression d’une publiée sans effet (0 ligne)`, async () => {
			const id = await construction(true);
			const client = await clientFor(compte().email);
			const { data } = await client.from('constructions').delete().eq('id', id).select('id');
			expect(data).toEqual([]);
			expect(await existe(id)).toBe(true);
		});

		it(`${qui} : « sa » construction, ni lue en brouillon, ni modifiée, ni supprimée`, async () => {
			const id = await construction(false, compte().id);
			const client = await clientFor(compte().email);
			const { data: lue } = await client.from('constructions').select('id').eq('id', id);
			expect(lue).toEqual([]);
			const { data: modifiee } = await client
				.from('constructions')
				.update({ is_public: true })
				.eq('id', id)
				.select('id');
			expect(modifiee).toEqual([]);
			const { data: supprimee } = await client
				.from('constructions')
				.delete()
				.eq('id', id)
				.select('id');
			expect(supprimee).toEqual([]);
			expect(await existe(id)).toBe(true);
		});

		it(`${qui} : ne lit pas les brouillons`, async () => {
			const id = await construction(false);
			const client = await clientFor(compte().email);
			const { data } = await client.from('constructions').select('id').eq('id', id);
			expect(data).toEqual([]);
		});

		it(`${qui} : lit les constructions publiées`, async () => {
			const id = await construction(true);
			const client = await clientFor(compte().email);
			const { data } = await client.from('constructions').select('id').eq('id', id);
			expect(data).toHaveLength(1);
		});
	}
});
