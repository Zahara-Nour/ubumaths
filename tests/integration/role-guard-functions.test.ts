/**
 * Les deux gardes de rôle les plus utilisées (base locale requise)
 * ===============================================================
 *
 * `is_teacher_or_admin()` porte 103 policies, `is_admin()` en porte 74 : ce
 * sont les deux fonctions les plus sollicitées de la base, évaluées ligne à
 * ligne.
 *
 * Elles étaient pourtant les seules de leur famille à rester `VOLATILE` et
 * sans `pg_temp` dans leur `search_path`, là où `is_my_student`,
 * `is_student_in_class` et `is_in_assigned_class` sont `stable` et durcies.
 *
 * Ces tests fixent d'abord le COMPORTEMENT — c'est lui qui ne doit pas bouger
 * quand on touche à des attributs portant 177 policies — puis les attributs
 * eux-mêmes.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
	return client;
}

describe('gardes de rôle : is_teacher_or_admin et is_admin', () => {
	let prof: SupabaseClient<Database>;
	let admin: SupabaseClient<Database>;
	let eleve: SupabaseClient<Database>;
	let classeId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const enseignant = await TestData.profile().withRole('teacher').create();
		prof = await clientFor(enseignant.email);
		const administrateur = await TestData.profile().withRole('admin').create();
		admin = await clientFor(administrateur.email);
		const etudiant = await TestData.profile().withRole('student').create();
		eleve = await clientFor(etudiant.email);

		classeId = (await TestData.class().withName('2nde gardes ZZ').create()).id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function garde(client: SupabaseClient<Database>, nom: string): Promise<boolean> {
		const { data, error } = await client.rpc(nom as never);
		expect(error, `${nom} doit répondre`).toBeNull();
		return data === true;
	}

	// ── Le comportement, qui ne doit pas bouger ────────────────────────────

	it('is_teacher_or_admin : vrai pour le professeur et l’administrateur', async () => {
		expect(await garde(prof, 'is_teacher_or_admin')).toBe(true);
		expect(await garde(admin, 'is_teacher_or_admin')).toBe(true);
	});

	it('is_teacher_or_admin : faux pour l’élève', async () => {
		expect(await garde(eleve, 'is_teacher_or_admin')).toBe(false);
	});

	it('is_admin : vrai pour l’administrateur seul', async () => {
		expect(await garde(admin, 'is_admin')).toBe(true);
		expect(await garde(prof, 'is_admin')).toBe(false);
		expect(await garde(eleve, 'is_admin')).toBe(false);
	});

	it('hors session, elles ne s’ouvrent pas — et ne sont même pas appelables', async () => {
		// Deux barrières, et c'est la plus externe qui répond : `anon` n'a pas
		// EXECUTE sur ces fonctions, donc l'appel est refusé (42501) avant même
		// que `auth.uid()` — nul — ne ferme la garde. Accepter les deux issues,
		// car le grant peut différer entre local et production.
		const anonyme = createClient<Database>(SUPABASE_URL, ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
		for (const nom of ['is_teacher_or_admin', 'is_admin']) {
			const { data, error } = await anonyme.rpc(nom as never);
			if (error) {
				expect(error.code, `${nom} : refus attendu`).toBe('42501');
			} else {
				expect(data, `${nom} doit être faux hors session`).toBe(false);
			}
		}
	});

	it('une policy qui s’appuie dessus continue de trancher', async () => {
		// `classes / view_own_classes` vaut `is_teacher_or_admin()` : c'est le
		// comportement de bout en bout, pas seulement celui de la fonction.
		const { data: vuParProf } = await prof.from('classes').select('id').eq('id', classeId);
		expect(vuParProf ?? []).toHaveLength(1);

		const { data: vuParEleve } = await eleve.from('classes').select('id').eq('id', classeId);
		expect(vuParEleve ?? []).toHaveLength(0);
	});

	// ── Les attributs ──────────────────────────────────────────────────────

	it('les deux sont `stable` et ferment `pg_temp`', async () => {
		// `create or replace` réinitialise tout attribut non répété : ces deux
		// assertions rattrapent une réécriture future qui les oublierait.
		const pg = await getPostgresClient();
		const { rows } = await pg.query(`
			select p.proname,
			       p.provolatile,
			       p.prosecdef,
			       array_to_string(p.proconfig, ',') as config
			from pg_proc p
			join pg_namespace n on n.oid = p.pronamespace
			where n.nspname = 'public'
			  and p.proname in ('is_teacher_or_admin', 'is_admin')
			order by p.proname
		`);
		expect(rows).toHaveLength(2);
		for (const row of rows as {
			proname: string;
			provolatile: string;
			prosecdef: boolean;
			config: string;
		}[]) {
			expect(row.provolatile, `${row.proname} doit être stable`).toBe('s');
			expect(row.prosecdef, `${row.proname} doit rester security definer`).toBe(true);
			expect(row.config, `${row.proname} doit fermer pg_temp`).toContain('pg_temp');
		}
	});
});
