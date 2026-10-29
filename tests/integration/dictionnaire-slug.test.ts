/**
 * Dictionnaire : adresse fixe de chaque entrée (Supabase local requis)
 * ====================================================================
 *
 * Chantier seo, glossaire en une page par terme (docs/wip/seo-progress.md),
 * choix A1 de David (2026-10-29) : l'adresse `/glossaire/<slug>` est posée à la
 * création de l'entrée et ne change plus ensuite.
 *   - terme (+ sens), minuscules, sans accents, tirets ;
 *   - renommer le terme ne change pas l'adresse ;
 *   - personne ne la modifie à la main, pas même par une écriture directe ;
 *   - deux entrées qui donneraient la même adresse : la seconde reçoit -2 ;
 *   - un visiteur lit l'adresse d'une entrée visible, jamais celle d'une entrée masquée.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { DictionaryEntryInput } from '$lib/dictionary/entry-schema';
import { createEntry, updateEntry } from '$lib/server/dictionary/admin';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Préfixe unique à ce run : les entrées créées le portent (nettoyage ciblé). */
const TAG = `itest-dicoslug-${Date.now().toString(36)}`;
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

// ============================================================================
// VARIABLES
// ============================================================================

let adminClient: SupabaseClient<Database>;

// ============================================================================
// FONCTIONS
// ============================================================================

async function signedIn(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

function entry(term: string, extra: Partial<DictionaryEntryInput> = {}): DictionaryEntryInput {
	return {
		term: `${TAG} ${term}`,
		sense: null,
		grade: '6',
		tags: ['transversal'],
		definitions: { items: [{ grade: '6', content: 'Une définition.' }] },
		exemples: null,
		history: null,
		image: null,
		synonyms: [],
		forms: [],
		auto_link: true,
		derived_from: null,
		see_also: null,
		shared_with: [],
		...extra
	};
}

async function create(term: string, extra: Partial<DictionaryEntryInput> = {}): Promise<string> {
	const created = await createEntry(adminClient, entry(term, extra));
	if (!created.ok) throw new Error(created.problems.join(' '));
	return created.row.id;
}

async function slugOf(id: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select slug from public.dictionary_entries where id = $1', [id]);
	return rows[0].slug;
}

// ============================================================================
// SUITE
// ============================================================================

describe('Dictionnaire : adresse fixe de chaque entrée', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const admin = await TestData.profile().withRole('admin').create();
		adminClient = await signedIn(admin.email);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg
			.query('delete from public.dictionary_entries where term like $1', [`${TAG}%`])
			.catch(() => undefined);
		await cleanupAllTestData();
	});

	it('toutes les entrées existantes ont une adresse, et aucune ne se répète', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select count(*)::int as total, count(distinct slug)::int as distinct_slugs, count(slug)::int as filled from public.dictionary_entries'
		);
		expect(rows[0].total).toBeGreaterThan(0);
		expect(rows[0].filled).toBe(rows[0].total);
		expect(rows[0].distinct_slugs).toBe(rows[0].total);
	});

	it('pose l’adresse à la création : minuscules, sans accents, tirets, sens compris', async () => {
		expect(await slugOf(await create('Écart interquartile'))).toBe(`${TAG}-ecart-interquartile`);
		expect(await slugOf(await create('base', { sense: 'puissance' }))).toBe(
			`${TAG}-base-puissance`
		);
		expect(await slugOf(await create('nœud'))).toBe(`${TAG}-noeud`);
	});

	it('renommer le terme ne change pas l’adresse', async () => {
		const id = await create('médiane');
		const changed = await updateEntry(adminClient, id, { entry: entry('médiane renommée') });
		expect(changed.ok).toBe(true);
		expect(await slugOf(id)).toBe(`${TAG}-mediane`);
	});

	it('une écriture directe de l’adresse est ignorée', async () => {
		const id = await create('moyenne');
		const pg = await getPostgresClient();
		await pg.query(`update public.dictionary_entries set slug = 'adresse-forcee' where id = $1`, [
			id
		]);
		expect(await slugOf(id)).toBe(`${TAG}-moyenne`);
	});

	it('deux entrées qui donneraient la même adresse : la seconde reçoit -2', async () => {
		// L'admin refuse déjà « côte » à côté de « cote » : écriture directe, pour le trigger seul
		const pg = await getPostgresClient();
		const insert = `insert into public.dictionary_entries (position, term, grade)
			values ((select max(position) + 1 from public.dictionary_entries), $1, '6') returning id`;
		const { rows: first } = await pg.query(insert, [`${TAG} côte`]);
		const { rows: second } = await pg.query(insert, [`${TAG} cote`]);
		expect(await slugOf(first[0].id)).toBe(`${TAG}-cote`);
		expect(await slugOf(second[0].id)).toBe(`${TAG}-cote-2`);
	});

	it('une entrée masquée de même adresse compte : la nouvelle, créée par l’admin, reçoit -2', async () => {
		// La boucle du trigger tourne avec les droits de l'admin : elle voit les entrées masquées
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`insert into public.dictionary_entries (position, term, grade, hidden)
			values ((select max(position) + 1 from public.dictionary_entries), $1, '6', true) returning id`,
			[`${TAG} cachee ancienne`]
		);
		expect(await slugOf(rows[0].id)).toBe(`${TAG}-cachee-ancienne`);
		expect(await slugOf(await create('cachée-ancienne'))).toBe(`${TAG}-cachee-ancienne-2`);
	});

	it('un visiteur lit l’adresse d’une entrée visible, pas celle d’une entrée masquée', async () => {
		const visible = await create('visible');
		const hidden = await create('masquee');
		expect((await updateEntry(adminClient, hidden, { hidden: true })).ok).toBe(true);

		const anon = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		const { data, error } = await anon
			.from('dictionary_entries')
			.select('id, slug')
			.in('id', [visible, hidden]);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: visible, slug: `${TAG}-visible` }]);
	});
});
