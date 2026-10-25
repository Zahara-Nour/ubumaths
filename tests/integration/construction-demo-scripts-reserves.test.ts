/**
 * Scripts de démo des constructions : réservés au prof
 * ===================================================
 *
 * Relevé le 2026-10-23 : tout compte connecté, élève compris, pouvait enregistrer des
 * scripts de démo (policy « Users can CRUD own demo scripts »). Un client Supabase
 * tournant dans le navigateur, la règle doit être tenue par la base, pas seulement par
 * l'API.
 *
 * Décision de David (2026-10-23) : lire, créer, modifier, supprimer = prof et admin
 * seuls, chacun ses scripts. Le 2026-10-25 : l'admin retiré, ses scripts passés au prof
 * (migration 20261026020000).
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

const PREFIXE = 'zz-script démo réservé';

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

/** Un script de démo au nom de `authorId`, posé par la base (hors RLS). */
async function scriptDe(authorId: string, suffixe: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into construction_demo_scripts (name, dsl_script, author_id)
		 values ($1, 'A = point(0, 0)', $2) returning id`,
		[`${PREFIXE} ${suffixe}`, authorId]
	);
	return rows[0].id;
}

async function existe(id: string): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select 1 from construction_demo_scripts where id = $1', [id]);
	return rows.length === 1;
}

// ============================================================================
// TESTS
// ============================================================================

describe('scripts de démo : réservés au prof', () => {
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
		await pg.query('delete from construction_demo_scripts where name like $1', [`${PREFIXE}%`]);
		await cleanupAllTestData();
	});

	it('un prof crée, lit, modifie et supprime son script', async () => {
		const client = await clientFor(prof.email);
		const { data: cree, error } = await client
			.from('construction_demo_scripts')
			.insert({ name: `${PREFIXE} prof`, dsl_script: 'A = point(0, 0)', author_id: prof.id })
			.select('id')
			.single();
		expect(error).toBeNull();
		const { data: lus } = await client
			.from('construction_demo_scripts')
			.select('id')
			.eq('id', cree!.id);
		expect(lus).toHaveLength(1);
		const { data: modifie } = await client
			.from('construction_demo_scripts')
			.update({ dsl_script: 'B = point(1, 1)' })
			.eq('id', cree!.id)
			.select('id');
		expect(modifie).toHaveLength(1);
		const { data: supprime } = await client
			.from('construction_demo_scripts')
			.delete()
			.eq('id', cree!.id)
			.select('id');
		expect(supprime).toHaveLength(1);
	});

	it('l’admin ne peut pas créer de script (42501)', async () => {
		const client = await clientFor(admin.email);
		const { error } = await client
			.from('construction_demo_scripts')
			.insert({ name: `${PREFIXE} admin`, dsl_script: 'A = point(0, 0)', author_id: admin.id });
		expect(error?.code).toBe('42501');
	});

	it('l’admin ne lit, ne modifie ni ne supprime son ancien script', async () => {
		const id = await scriptDe(admin.id, 'ancien de l’admin');
		const client = await clientFor(admin.email);
		const { data: lus } = await client.from('construction_demo_scripts').select('id').eq('id', id);
		expect(lus).toEqual([]);
		const { data: modifie } = await client
			.from('construction_demo_scripts')
			.update({ dsl_script: 'B = point(1, 1)' })
			.eq('id', id)
			.select('id');
		expect(modifie).toEqual([]);
		const { data: supprime } = await client
			.from('construction_demo_scripts')
			.delete()
			.eq('id', id)
			.select('id');
		expect(supprime).toEqual([]);
		expect(await existe(id)).toBe(true);
	});

	it('un prof ne lit ni ne supprime le script d’un autre', async () => {
		const id = await scriptDe(admin.id, 'de l’admin');
		const client = await clientFor(prof.email);
		const { data: lus } = await client.from('construction_demo_scripts').select('id').eq('id', id);
		expect(lus).toEqual([]);
		const { data: supprime } = await client
			.from('construction_demo_scripts')
			.delete()
			.eq('id', id)
			.select('id');
		expect(supprime).toEqual([]);
		expect(await existe(id)).toBe(true);
	});

	it('un prof ne crée pas de script au nom d’un autre (42501)', async () => {
		const client = await clientFor(prof.email);
		const { error } = await client.from('construction_demo_scripts').insert({
			name: `${PREFIXE} usurpé`,
			dsl_script: 'A = point(0, 0)',
			author_id: admin.id
		});
		expect(error?.code).toBe('42501');
	});

	it('un visiteur non connecté ne lit ni ne crée rien', async () => {
		const id = await scriptDe(admin.id, 'vu par anon');
		const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		const { data: lus } = await client.from('construction_demo_scripts').select('id').eq('id', id);
		expect(lus).toEqual([]);
		const { error } = await client
			.from('construction_demo_scripts')
			.insert({ name: `${PREFIXE} anon`, dsl_script: 'A = point(0, 0)', author_id: admin.id });
		expect(error?.code).toBe('42501');
	});

	it('un élève ne peut pas créer de script (42501)', async () => {
		const client = await clientFor(eleve.email);
		const { error } = await client
			.from('construction_demo_scripts')
			.insert({ name: `${PREFIXE} élève`, dsl_script: 'A = point(0, 0)', author_id: eleve.id });
		expect(error?.code).toBe('42501');
	});

	it('un élève ne lit, ne modifie ni ne supprime son ancien script', async () => {
		const id = await scriptDe(eleve.id, 'ancien de l’élève');
		const client = await clientFor(eleve.email);
		const { data: lus } = await client.from('construction_demo_scripts').select('id').eq('id', id);
		expect(lus).toEqual([]);
		const { data: modifie } = await client
			.from('construction_demo_scripts')
			.update({ dsl_script: 'B = point(1, 1)' })
			.eq('id', id)
			.select('id');
		expect(modifie).toEqual([]);
		const { data: supprime } = await client
			.from('construction_demo_scripts')
			.delete()
			.eq('id', id)
			.select('id');
		expect(supprime).toEqual([]);
		expect(await existe(id)).toBe(true);
	});
});
