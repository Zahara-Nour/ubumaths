/**
 * Dictionnaire en base — lecture par le site (Supabase local requis)
 * ==================================================================
 *
 * `loadDictionary` (src/lib/server/dictionary/load.ts), qui sert
 * `/api/dictionnaire`, le glossaire et Mathémo. Comportements de
 * docs/wip/dictionnaire-en-base-spec.md :
 *   1. le site lit exactement les entrées du fichier d'origine ;
 *   3. une lecture est gardée 90 secondes, l'admin relit tout de suite ;
 *   4. une entrée masquée disparaît, y compris pour l'admin (à qui la RLS la
 *      montre) : le résultat est partagé par tous les visiteurs.
 * Et la contrainte `dictionary_entries_image_same_site` (20261013090000).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { REFERENCE_DICTIONARY } from '../fixtures/lexique/dictionnaire-reference';
import type { Database } from '$lib/types/database';
import { forgetDictionary, loadDictionary } from '$lib/server/dictionary/load';
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
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/** Préfixe unique à ce run : toutes les entrées créées le portent (nettoyage ciblé). */
const TAG = `itest-lecture-${Date.now().toString(36)}`;
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

// ============================================================================
// VARIABLES
// ============================================================================

let service: SupabaseClient<Database>;
let anon: SupabaseClient<Database>;
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

/** Entrée de décor, par le service role (contourne la RLS, pas les contraintes). */
async function seedEntry(suffix: string, hidden: boolean): Promise<string> {
	const { data, error } = await service
		.from('dictionary_entries')
		.insert({
			position: 100000,
			term: `${TAG} ${suffix}`,
			grade: '6',
			tags: ['transversal'],
			definitions: { items: [{ grade: '6', content: 'Définition de décor.' }] },
			hidden
		})
		.select('id')
		.single();
	if (error || !data) throw new Error(`décor refusé : ${error?.message}`);
	return data.id;
}

/** Noms des entrées de décor de ce run, dans ce que lit le site. */
function seeded(entries: { term: string }[]): string[] {
	return entries.map((e) => e.term).filter((term) => term.startsWith(TAG));
}

// ============================================================================
// SUITE
// ============================================================================

describe('Dictionnaire en base — lecture par le site (loadDictionary)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		service = createClient<Database>(SUPABASE_URL, SERVICE_KEY, CLIENT_OPTIONS);
		anon = createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		const admin = await TestData.profile().withRole('admin').create();
		adminClient = await signedIn(admin.email);
		await seedEntry('visible', false);
		await seedEntry('masquée', true);
	});

	beforeEach(() => forgetDictionary());

	afterAll(async () => {
		forgetDictionary();
		const pg = await getPostgresClient();
		await pg
			.query('delete from public.dictionary_entries where term like $1', [`${TAG}%`])
			.catch(() => undefined);
		await cleanupAllTestData();
	});

	it('1. un visiteur lit exactement les entrées du fichier, dans son ordre', async () => {
		const entries = await loadDictionary(anon);
		expect(entries.filter((e) => !e.term.startsWith(TAG))).toEqual(REFERENCE_DICTIONARY);
	});

	it('4. une entrée masquée n’est lue ni par un visiteur, ni par l’admin', async () => {
		expect(seeded(await loadDictionary(anon, { fresh: true }))).toEqual([`${TAG} visible`]);
		// La RLS montre l'entrée masquée à l'admin : le filtre de lecture doit l'écarter
		const { data } = await adminClient
			.from('dictionary_entries')
			.select('id')
			.like('term', `${TAG}%`);
		expect(data).toHaveLength(2);
		expect(seeded(await loadDictionary(adminClient, { fresh: true }))).toEqual([`${TAG} visible`]);
	});

	it('3. une lecture est réutilisée pendant 90 s ; une lecture fraîche voit le changement', async () => {
		const now = Date.now();
		const first = await loadDictionary(anon, { now });
		const id = await seedEntry('ajoutée', false);
		// Moins de 90 s : même lecture, sans l'ajout
		const memo = await loadDictionary(anon, { now: now + 60_000 });
		expect(memo).toBe(first);
		expect(seeded(memo)).not.toContain(`${TAG} ajoutée`);
		// Lecture fraîche (admin qui vient d'enregistrer) : l'ajout est là
		expect(seeded(await loadDictionary(anon, { fresh: true, now: now + 60_000 }))).toContain(
			`${TAG} ajoutée`
		);
		// Au-delà de 90 s : relue
		await service.from('dictionary_entries').update({ hidden: true }).eq('id', id);
		expect(seeded(await loadDictionary(anon, { now: now + 3 * 60_000 }))).not.toContain(
			`${TAG} ajoutée`
		);
	});

	it('une image hébergée ailleurs (`//hôte/…`) est refusée par la base', async () => {
		const { error } = await service.from('dictionary_entries').insert({
			position: 100000,
			term: `${TAG} image`,
			grade: '6',
			tags: [],
			image: '//exemple.fr/pistage.png'
		});
		expect(error?.code).toBe('23514');
		const { error: ok } = await service.from('dictionary_entries').insert({
			position: 100000,
			term: `${TAG} image du site`,
			grade: '6',
			tags: [],
			image: '/images/glossaire/carre.svg'
		});
		expect(ok).toBeNull();
	});
});
