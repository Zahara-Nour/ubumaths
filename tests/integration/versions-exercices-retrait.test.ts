/**
 * Versions d'un exercice : retrait de l'ancien contenu d'`exercises` — (Supabase local requis)
 * =============================================================================================
 *
 * Migration `20261126221127_versions_exercices_retrait_ancien_contenu` (ADR 0044, chantier
 * versions-exercices, PR 4, destructive).
 *
 * Ce que le test prouve :
 * 1. `exercises` n'a plus de colonnes de contenu (`variations`, `shared`, `generic_functions`) ;
 *    `variables` reste.
 * 2. Les cinq fonctions mortes qui les lisaient n'existent plus.
 * 3. Le lien de partage d'un exercice rend toujours la fiche d'identité ET le contenu de la
 *    dernière version, au visiteur non connecté comme avant ; un jeton inconnu ne rend rien.
 * 4. Le rollback documenté, joué dans une transaction annulée, remet les colonnes remplies avec
 *    la dernière version et l'ancienne forme du lien de partage.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Client } from 'pg';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback } from '../helpers/database/migration-rollback';

// ============================================================================
// TYPES
// ============================================================================

interface LigneDePartage {
	id: string;
	title: string | null;
	is_public: boolean;
	variables: unknown;
	variations: unknown;
	shared: unknown;
	generic_functions: string[] | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION =
	'supabase/migrations/20261126221127_versions_exercices_retrait_ancien_contenu.sql';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

const RUN = `itest-retrait-${Date.now().toString(36)}`;
const TOKEN = `retraitexo${Date.now().toString(36)}abcdefghijklmno`.slice(0, 32);

const COLONNES_RETIREES = ['generic_functions', 'shared', 'variations'];
const FONCTIONS_MORTES = [
	'exercise_has_multiple_variations',
	'exercise_variation_count',
	'get_all_exercise_assignments',
	'get_my_exercise_assignments',
	'get_teacher_exercise_assignments'
];

const V1 = {
	variations: [{ label: 'guidé', statement_md: 'Énoncé v1', solution_md: 'Corrigé v1' }],
	shared: { statement_md: 'Commun v1' },
	generic_functions: ['f']
};
const V2 = {
	variations: [{ label: 'guidé', statement_md: 'Énoncé v2', solution_md: 'Corrigé v2' }],
	shared: { statement_md: 'Commun v2' },
	generic_functions: ['g']
};

// ============================================================================
// VARIABLES
// ============================================================================

let pg: Client;
let visiteur: SupabaseClient;
let exoId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function sql<T = Record<string, unknown>>(
	query: string,
	params: unknown[] = []
): Promise<T[]> {
	return (await pg.query(query, params)).rows as T[];
}

async function colonnesDeContenu(): Promise<string[]> {
	const lignes = await sql<{ column_name: string }>(
		`select column_name from information_schema.columns
		 where table_schema = 'public' and table_name = 'exercises'
		   and column_name = any($1) order by column_name`,
		[[...COLONNES_RETIREES, 'variables']]
	);
	return lignes.map((l) => l.column_name);
}

async function insererVersion(numero: number, contenu: typeof V1, auteurId: string) {
	await sql(
		`insert into public.exercise_versions (exercise_id, number, variations, shared, generic_functions, created_by)
		 values ($1, $2, $3, $4, $5, $6)`,
		[
			exoId,
			numero,
			JSON.stringify(contenu.variations),
			JSON.stringify(contenu.shared),
			contenu.generic_functions,
			auteurId
		]
	);
}

// ============================================================================
// DÉCOR
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	pg = await getPostgresClient();
	visiteur = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);

	const prof = await TestData.profile().withRole('teacher').create();
	exoId = (
		await sql<{ id: string }>(
			`insert into public.exercises (title, category, created_by, is_public)
			 values ($1, 'automatisme', $2, false) returning id`,
			[RUN, prof.id]
		)
	)[0].id;
	await insererVersion(1, V1, prof.id);
	await insererVersion(2, V2, prof.id);
	await sql(
		`insert into public.exercise_share_tokens (exercise_id, token, created_by, is_active)
		 values ($1, $2, $3, true)`,
		[exoId, TOKEN, prof.id]
	);
});

afterAll(async () => {
	await sql('delete from public.exercise_share_tokens where token = $1', [TOKEN]).catch(
		() => undefined
	);
	await sql('delete from public.exercises where title = $1', [RUN]).catch(() => undefined);
	await cleanupAllTestData();
});

// ============================================================================
// TESTS
// ============================================================================

describe('exercises ne garde que sa fiche d’identité', () => {
	it('plus de colonnes de contenu ; variables reste', async () => {
		expect(await colonnesDeContenu()).toEqual(['variables']);
	});

	it('les cinq fonctions qui lisaient l’ancien contenu n’existent plus', async () => {
		const restantes = await sql<{ proname: string }>(
			`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
			 where n.nspname = 'public' and p.proname = any($1) order by 1`,
			[FONCTIONS_MORTES]
		);
		expect(restantes.map((r) => r.proname)).toEqual([]);
	});
});

describe('lien de partage d’un exercice', () => {
	it('rend au visiteur la fiche d’identité et le contenu de la dernière version', async () => {
		const { data, error } = await visiteur
			.rpc('get_exercise_by_share_token' as never, { p_token: TOKEN } as never)
			.maybeSingle();
		expect(error).toBeNull();
		const ligne = data as LigneDePartage | null;
		expect(ligne && { id: ligne.id, title: ligne.title, is_public: ligne.is_public }).toEqual({
			id: exoId,
			title: RUN,
			is_public: false
		});
		expect(
			ligne && {
				variations: ligne.variations,
				shared: ligne.shared,
				generic_functions: ligne.generic_functions
			}
		).toEqual(V2);
		expect(ligne?.variables).toEqual([]);
	});

	it('un jeton inconnu ne rend rien', async () => {
		const { data, error } = await visiteur
			.rpc('get_exercise_by_share_token' as never, { p_token: `${TOKEN}x` } as never)
			.maybeSingle();
		expect(error).toBeNull();
		expect(data).toBeNull();
	});
});

describe('rollback documenté', () => {
	it('remet les colonnes, remplies avec la dernière version, et l’ancienne forme du lien', async () => {
		await pg.query('begin');
		try {
			await pg.query(extractRollback(MIGRATION));
			expect(await colonnesDeContenu()).toEqual([
				'generic_functions',
				'shared',
				'variables',
				'variations'
			]);
			const [exo] = await sql<{
				variations: unknown;
				shared: unknown;
				generic_functions: string[];
			}>('select variations, shared, generic_functions from public.exercises where id = $1', [
				exoId
			]);
			expect(exo).toEqual(V2);
			const [forme] = await sql<{ forme: string }>(
				`select pg_get_function_result('public.get_exercise_by_share_token(text)'::regprocedure) as forme`
			);
			expect(forme.forme).toBe('SETOF exercises');
		} finally {
			await pg.query('rollback');
		}
	});
});
