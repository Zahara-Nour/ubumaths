/**
 * Dictionnaire en base — écriture par la page d'admin (Supabase local requis)
 * ===========================================================================
 *
 * ADR 0022, comportements 8, 9 et refus 10 à 16 de
 * docs/wip/dictionnaire-en-base-spec.md, à travers `$lib/server/dictionary/admin`
 * (ce qu'appellent les routes `/api/admin/dictionnaire`) :
 *   - l'admin ajoute, modifie, masque ; chaque modification garde la version
 *     précédente, avec son auteur ;
 *   - un refus de cohérence n'écrit rien ;
 *   - un prof non élevé n'écrit rien (la RLS rend zéro ligne : l'écriture échoue).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { DictionaryEntryInput } from '$lib/dictionary/entry-schema';
import { createEntry, loadVersions, updateEntry } from '$lib/server/dictionary/admin';
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

/** Préfixe unique à ce run : les entrées créées le portent (nettoyage ciblé, reprise intacte). */
const TAG = `itest-dicoadmin-${Date.now().toString(36)}`;
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

// ============================================================================
// VARIABLES
// ============================================================================

let adminClient: SupabaseClient<Database>;
let teacherClient: SupabaseClient<Database>;
let adminId: string;

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

function entry(suffix: string, extra: Partial<DictionaryEntryInput> = {}): DictionaryEntryInput {
	return {
		term: `${TAG} ${suffix}`,
		sense: null,
		grade: '6',
		tags: ['transversal'],
		definitions: { items: [{ grade: '6', content: 'Première définition.' }] },
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

async function readRow(id: string) {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select term, hidden, definitions, position from public.dictionary_entries where id = $1',
		[id]
	);
	return rows[0];
}

// ============================================================================
// SUITE
// ============================================================================

describe('Dictionnaire : écriture par la page d’admin', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const admin = await TestData.profile().withRole('admin').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		adminId = admin.id;
		adminClient = await signedIn(admin.email);
		teacherClient = await signedIn(teacher.email);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg
			.query('delete from public.dictionary_entries where term like $1', [`${TAG}%`])
			.catch(() => undefined);
		await cleanupAllTestData();
	});

	it('8-9. ajoute une entrée à la fin, la modifie, et garde la version précédente avec son auteur', async () => {
		const created = await createEntry(adminClient, entry('ajout'));
		if (!created.ok) throw new Error(created.problems.join(' '));
		const pg = await getPostgresClient();
		const { rows: max } = await pg.query(
			'select max(position) as max from public.dictionary_entries'
		);
		expect(created.row.position).toBe(max[0].max);

		const changed = await updateEntry(adminClient, created.row.id, {
			entry: entry('ajout', {
				definitions: { items: [{ grade: '6', content: 'Définition corrigée.' }] }
			})
		});
		expect(changed.ok).toBe(true);

		const versions = await loadVersions(adminClient, created.row.id);
		expect(versions).toHaveLength(1);
		expect(versions[0].savedBy).not.toBeNull();
		// L'écran montre le nom de l'auteur : l'identifiant de compte ne quitte pas le serveur
		expect(versions[0].entry).not.toHaveProperty('updated_by');
		const { rows } = await pg.query(
			'select saved_by, entry from public.dictionary_entry_versions where entry_id = $1',
			[created.row.id]
		);
		expect(rows[0].saved_by).toBe(adminId);
		expect(rows[0].entry.definitions.items[0].content).toBe('Première définition.');
		expect((await readRow(created.row.id)).definitions.items[0].content).toBe(
			'Définition corrigée.'
		);
	});

	it('10. refuse une définition mal rangée, sans rien écrire', async () => {
		const created = await createEntry(adminClient, entry('refus'));
		if (!created.ok) throw new Error(created.problems.join(' '));
		const refused = await updateEntry(adminClient, created.row.id, {
			entry: entry('refus', { definitions: { items: [{ grade: '5', content: 'Trop tard.' }] } })
		});
		expect(refused).toEqual({
			ok: false,
			status: 400,
			problems: [
				`« ${TAG} refus » : la première définition doit être au niveau du mot (6e), pas en 5e.`
			]
		});
		expect((await readRow(created.row.id)).definitions.items[0].content).toBe(
			'Première définition.'
		);
		expect(await loadVersions(adminClient, created.row.id)).toEqual([]);
	});

	it('16. refuse de masquer un mot visé par un renvoi visible ; le masque une fois le renvoi masqué', async () => {
		const target = await createEntry(adminClient, entry('cible'));
		if (!target.ok) throw new Error(target.problems.join(' '));
		const renvoi = await createEntry(
			adminClient,
			entry('renvoi', { definitions: null, derived_from: `${TAG} cible` })
		);
		if (!renvoi.ok) throw new Error(renvoi.problems.join(' '));

		const refused = await updateEntry(adminClient, target.row.id, { hidden: true });
		expect(refused.ok).toBe(false);
		expect((await readRow(target.row.id)).hidden).toBe(false);

		expect((await updateEntry(adminClient, renvoi.row.id, { hidden: true })).ok).toBe(true);
		expect((await updateEntry(adminClient, target.row.id, { hidden: true })).ok).toBe(true);
		expect((await readRow(target.row.id)).hidden).toBe(true);
	});

	it('2. un prof non élevé n’écrit rien : l’écriture échoue, la ligne ne change pas', async () => {
		const created = await createEntry(adminClient, entry('prof'));
		if (!created.ok) throw new Error(created.problems.join(' '));
		await expect(
			updateEntry(teacherClient, created.row.id, {
				entry: entry('prof', { definitions: { items: [{ grade: '6', content: 'Piratée.' }] } })
			})
		).rejects.toThrow();
		await expect(createEntry(teacherClient, entry('prof-ajout'))).rejects.toThrow();
		expect((await readRow(created.row.id)).definitions.items[0].content).toBe(
			'Première définition.'
		);
	});
});
