/**
 * Dictionnaire en base — droits et reprise (Supabase local requis)
 * ================================================================
 *
 * Migration `20261012153000_dictionnaire_en_base` (ADR 0022) :
 *   - `dictionary_entries` : une entrée par mot et par sens ;
 *   - `dictionary_entry_versions` : la version précédente, à chaque modification.
 *
 * Accès tranché par David (2026-10-10) :
 *   - lecture par TOUS, visiteurs compris, des entrées non masquées ;
 *   - modification par l'admin seul, sans suppression ;
 *   - historique lisible par l'admin seul.
 *
 * Chaque refus est mesuré par son CODE (42501, 23505, 23514) ou par la relecture
 * de la ligne (une écriture refusée par la RLS rend zéro ligne, sans erreur).
 * Les tables neuves ne sont pas encore dans `database.ts` (généré depuis la
 * production) : clients sans le type `Database`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import MATH_DICTIONARY from '$lib/data/math-dictionary-fr';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// TYPES
// ============================================================================

interface EntryRow {
	id: string;
	position: number;
	term: string;
	sense: string | null;
	grade: string;
	tags: string[];
	definitions: unknown;
	exemples: unknown;
	history: string | null;
	image: string | null;
	synonyms: string[];
	forms: string[];
	auto_link: boolean;
	derived_from: string | null;
	see_also: unknown;
	shared_with: string[];
	hidden: boolean;
}

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
const TAG = `itest-dico-${Date.now().toString(36)}`;
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

// ============================================================================
// VARIABLES
// ============================================================================

let service: SupabaseClient;
let anon: SupabaseClient;
let adminClient: SupabaseClient;
let teacherClient: SupabaseClient;
let studentClient: SupabaseClient;
let adminId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function signedIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

/** Entrée de décor, par le service role (contourne la RLS, pas les contraintes). */
async function seedEntry(suffix: string, hidden = false): Promise<EntryRow> {
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
		.select('*')
		.single<EntryRow>();
	if (error || !data) throw new Error(`décor refusé : ${error?.message}`);
	return data;
}

async function readTerm(id: string): Promise<string | null> {
	const { data, error } = await service
		.from('dictionary_entries')
		.select('term')
		.eq('id', id)
		.maybeSingle<{ term: string }>();
	if (error) throw error;
	return data?.term ?? null;
}

// ============================================================================
// SUITE
// ============================================================================

describe('Dictionnaire en base (dictionary_entries, dictionary_entry_versions)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		service = createClient(SUPABASE_URL, SERVICE_KEY, CLIENT_OPTIONS);
		anon = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		const admin = await TestData.profile().withRole('admin').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		adminId = admin.id;
		adminClient = await signedIn(admin.email);
		teacherClient = await signedIn(teacher.email);
		studentClient = await signedIn(student.email);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg
			.query('delete from public.dictionary_entries where term like $1', [`${TAG}%`])
			.catch(() => undefined);
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// Reprise
	// --------------------------------------------------------------------------

	it('reprend les entrées du fichier, une à une, dans le même ordre', async () => {
		const { data, error } = await service
			.from('dictionary_entries')
			.select('*')
			.not('term', 'like', 'itest-%')
			.order('position')
			.returns<EntryRow[]>();
		expect(error).toBeNull();
		const rows = data ?? [];
		expect(rows).toHaveLength(MATH_DICTIONARY.length);
		const differences: string[] = [];
		MATH_DICTIONARY.forEach((term, i) => {
			const row = rows[i];
			const expected = {
				term: term.term,
				sense: term.sense ?? null,
				grade: term.grade,
				tags: term.tags,
				definitions: term.definitions ?? null,
				exemples: term.exemples ?? null,
				history: term.history ?? null,
				image: term.image ?? null,
				synonyms: term.synonyms ?? [],
				forms: term.forms ?? [],
				auto_link: term.autoLink !== false,
				derived_from: term.derivedFrom ?? null,
				see_also: term.seeAlso ?? null,
				shared_with: term.sharedWith ?? []
			};
			const actual = {
				term: row?.term,
				sense: row?.sense,
				grade: row?.grade,
				tags: row?.tags,
				definitions: row?.definitions,
				exemples: row?.exemples,
				history: row?.history,
				image: row?.image,
				synonyms: row?.synonyms,
				forms: row?.forms,
				auto_link: row?.auto_link,
				derived_from: row?.derived_from,
				see_also: row?.see_also,
				shared_with: row?.shared_with
			};
			// jsonb réordonne les clés : on compare des objets, pas des textes
			try {
				expect(actual).toEqual(expected);
			} catch {
				differences.push(`${i} ${term.term}`);
			}
		});
		expect(differences).toEqual([]);
		expect(rows.every((row) => !row.hidden)).toBe(true);
	});

	// --------------------------------------------------------------------------
	// Lecture
	// --------------------------------------------------------------------------

	it('un visiteur lit les entrées visibles, pas les entrées masquées', async () => {
		const visible = await seedEntry('visible');
		const hidden = await seedEntry('masquée', true);
		const { data, error } = await anon
			.from('dictionary_entries')
			.select('id')
			.in('id', [visible.id, hidden.id]);
		expect(error).toBeNull();
		expect((data ?? []).map((r) => r.id)).toEqual([visible.id]);
	});

	it('un élève ne voit pas les entrées masquées ; l’admin, si', async () => {
		const hidden = await seedEntry('masquée pour élève', true);
		const eleve = await studentClient.from('dictionary_entries').select('id').eq('id', hidden.id);
		expect(eleve.data ?? []).toEqual([]);
		const admin = await adminClient.from('dictionary_entries').select('id').eq('id', hidden.id);
		expect((admin.data ?? []).map((r) => r.id)).toEqual([hidden.id]);
	});

	// --------------------------------------------------------------------------
	// Écriture
	// --------------------------------------------------------------------------

	it('un visiteur ne peut rien écrire (42501)', async () => {
		const { error } = await anon
			.from('dictionary_entries')
			.insert({ position: 1, term: `${TAG} anon`, grade: '6' });
		expect(error?.code).toBe('42501');
	});

	it('un élève et le prof sans élévation ne modifient rien', async () => {
		const entry = await seedEntry('protégée');
		for (const client of [studentClient, teacherClient]) {
			const { data } = await client
				.from('dictionary_entries')
				.update({ term: `${TAG} piratée` })
				.eq('id', entry.id)
				.select('id');
			expect(data ?? []).toEqual([]);
			const insert = await client
				.from('dictionary_entries')
				.insert({ position: 1, term: `${TAG} ajout`, grade: '6' })
				.select('id');
			expect(insert.error).not.toBeNull();
		}
		expect(await readTerm(entry.id)).toBe(`${TAG} protégée`);
	});

	it('l’admin modifie une entrée, et la version précédente est gardée', async () => {
		const entry = await seedEntry('à corriger');
		const { data, error } = await adminClient
			.from('dictionary_entries')
			.update({ term: `${TAG} corrigée` })
			.eq('id', entry.id)
			.select('id, updated_by');
		expect(error).toBeNull();
		expect(data).toEqual([{ id: entry.id, updated_by: adminId }]);
		const versions = await adminClient
			.from('dictionary_entry_versions')
			.select('entry, saved_by')
			.eq('entry_id', entry.id);
		expect(versions.data).toHaveLength(1);
		expect(versions.data?.[0]).toMatchObject({
			entry: { term: `${TAG} à corriger` },
			saved_by: adminId
		});
	});

	it('l’admin ajoute une entrée', async () => {
		const { data, error } = await adminClient
			.from('dictionary_entries')
			.insert({ position: 100001, term: `${TAG} nouvelle`, grade: '5', tags: ['transversal'] })
			.select('term');
		expect(error).toBeNull();
		expect(data).toEqual([{ term: `${TAG} nouvelle` }]);
	});

	it('personne ne supprime une entrée, pas même l’admin (42501)', async () => {
		const entry = await seedEntry('indélébile');
		const { error } = await adminClient.from('dictionary_entries').delete().eq('id', entry.id);
		expect(error?.code).toBe('42501');
		expect(await readTerm(entry.id)).toBe(`${TAG} indélébile`);
	});

	it('l’historique est fermé aux élèves', async () => {
		const entry = await seedEntry('historique');
		await adminClient.from('dictionary_entries').update({ history: 'note' }).eq('id', entry.id);
		const { data } = await studentClient
			.from('dictionary_entry_versions')
			.select('id')
			.eq('entry_id', entry.id);
		expect(data ?? []).toEqual([]);
		const visitor = await anon.from('dictionary_entry_versions').select('id').limit(1);
		expect(visitor.error?.code).toBe('42501');
	});

	// --------------------------------------------------------------------------
	// Contraintes
	// --------------------------------------------------------------------------

	it('même nom et même sens qu’une autre entrée : refusé (23505)', async () => {
		await seedEntry('doublon');
		const { error } = await service
			.from('dictionary_entries')
			.insert({ position: 1, term: `${TAG} doublon`, grade: '6' });
		expect(error?.code).toBe('23505');
	});

	it('un niveau inconnu est refusé (23514)', async () => {
		const { error } = await service
			.from('dictionary_entries')
			.insert({ position: 1, term: `${TAG} niveau`, grade: '7e' });
		expect(error?.code).toBe('23514');
	});
});
