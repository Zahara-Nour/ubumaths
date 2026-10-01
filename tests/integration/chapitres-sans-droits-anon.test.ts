/**
 * Chapitres : le visiteur non connecté n'a plus aucun droit (base locale requise)
 * ==============================================================================
 *
 * Avant la migration `20261001110000_chapitres_sans_droits_anon`, le rôle `anon`
 * détenait SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER (et MAINTAIN en
 * local) sur quatre tables de contenus de chapitre. Aucune policy ne vise `anon`,
 * donc la RLS lui rendait déjà zéro ligne : le retrait ne fait perdre aucun usage,
 * il supprime un filet unique (la RLS) au profit de deux (privilège + RLS).
 *
 * Les deux derniers cas sont des non-régressions : l'élève lit toujours un
 * contenu publié de sa classe, le professeur écrit toujours.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const TABLES = [
	'chapter_documents',
	'chapter_exercises',
	'chapter_checklist_items',
	'chapter_worksheets'
] as const;

const PRIVILEGES = [
	'SELECT',
	'INSERT',
	'UPDATE',
	'DELETE',
	'TRUNCATE',
	'REFERENCES',
	'TRIGGER'
] as const;

/** Client de service : ensemencement et constats, jamais un appel testé. */
const service = createServiceRoleClient();

const PUBLIE = new Date(Date.now() - 3600_000).toISOString();

function anonClient(): SupabaseClient<Database> {
	return createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = anonClient();
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('chapitres — aucun droit pour le visiteur non connecté', () => {
	let enseignant: SupabaseClient<Database>;
	let eleve: SupabaseClient<Database>;
	let chapitre: string;
	let documentPublie: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const profilProf = await TestData.profile().withRole('teacher').create();
		const ecole = await insert('schools', {
			name: 'Lycée anon ZZ',
			city: 'Testville',
			country: 'France'
		});
		const annee = await insert('school_years', {
			school_id: ecole,
			name: 'Année anon ZZ',
			start_date: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10),
			end_date: new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10),
			is_active: true
		});
		const classe = await insert('classes', {
			name: '1SPE anon ZZ',
			school_id: ecole,
			school_year_id: annee,
			join_code: 'ZZAN01',
			is_active: true
		});

		const profilEleve = await TestData.profile().withRole('student').create();
		{
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classe, student_id: profilEleve.id, status: 'active' });
			expect(error).toBeNull();
		}

		chapitre = await insert('class_chapters', {
			class_id: classe,
			title: 'Chapitre anon ZZ',
			display_order: 1,
			is_visible: true
		});
		documentPublie = await insert('chapter_documents', {
			chapter_id: chapitre,
			title: 'Document publié ZZ',
			source_type: 'google_drive',
			google_drive_url: 'https://example.invalid/doc',
			display_order: 1,
			published_at: PUBLIE
		});

		eleve = await clientFor(profilEleve.email);
		enseignant = await clientFor(profilProf.email);
	}, 120_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	describe.each(TABLES)('%s', (table) => {
		it.each(PRIVILEGES)(`anon n'a pas le privilège %s`, async (privilege) => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ granted: boolean }>(
				'select has_table_privilege($1, $2, $3) as granted',
				['anon', `public.${table}`, privilege]
			);
			expect(rows[0].granted).toBe(false);
		});

		it('anon : aucun privilège de colonne non plus', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ attname: string }>(
				`select attname from pg_attribute
				 where attrelid = $1::regclass and attnum > 0 and not attisdropped
				   and has_column_privilege('anon', attrelid, attnum, 'SELECT,INSERT,UPDATE,REFERENCES')`,
				[`public.${table}`]
			);
			expect(rows.map((r) => r.attname)).toEqual([]);
		});

		it('une lecture anon est refusée (42501), pas seulement vide', async () => {
			const { data, error } = await anonClient()
				.from(table as never)
				.select('id')
				.limit(1);
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});
	});

	it('non-régression : l’élève lit toujours un document publié de sa classe', async () => {
		const { data, error } = await eleve
			.from('chapter_documents')
			.select('id')
			.eq('chapter_id', chapitre);
		expect(error).toBeNull();
		expect((data ?? []).map((r) => r.id)).toContain(documentPublie);
	});

	it('non-régression : le professeur écrit toujours dans son chapitre', async () => {
		const { data, error } = await enseignant
			.from('chapter_checklist_items')
			.insert({ chapter_id: chapitre, content: 'Objectif prof ZZ', display_order: 1 })
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});
});
