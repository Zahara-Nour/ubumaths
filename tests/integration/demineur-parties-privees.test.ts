/**
 * Parties de démineur : privées, rang calculé par le serveur (constat D16)
 * ========================================================================
 *
 * Mesuré en prod le 2026-10-10 : deux policies (« Anonymous / Anyone can view completed
 * games for leaderboard ») rendaient lisibles par N'IMPORTE QUI sans connexion, et par tout
 * compte de toute école, les 13 890 parties terminées de 44 élèves (identifiant, temps,
 * dates). Aucun code ne s'en servait sans connexion ; connecté, seul le RANG de l'élève sur
 * sa page de stats en dépendait.
 *
 * Décision de David (2026-10-10) : plus personne ne lit les parties des autres ; le rang
 * est calculé par une fonction serveur qui ne rend que le nombre, borné à l'école de
 * l'élève (ADR 0002).
 *
 * Ce que le fichier prouve :
 *   1. anon ne lit plus aucune partie d'élève ;
 *   2. un autre élève, même de la même école, ne lit plus les parties d'un camarade ;
 *   3. l'élève lit toujours ses propres parties ;
 *   4. le rang et le classement de la page de stats, par `minesweeper_scoped_leaderboard`
 *      (serveur, bornée à l'école), restent justes une fois les parties privées : rang de
 *      l'appelant, meilleur élève d'une autre école ignoré, non classé sans rang.
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

const ECOLE_A = 'zz-école démineur A';
const ECOLE_B = 'zz-école démineur B';

// ============================================================================
// HELPERS
// ============================================================================

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

async function ecole(nom: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into schools (name, city, country) values ($1, 'zz', 'zz') returning id`,
		[nom]
	);
	return rows[0].id;
}

/** Élève de l'école, avec `n` parties gagnées rapportant `points` chacune. */
async function joueur(schoolId: string, n: number, points: number) {
	const e = await TestData.profile().withRole('student').create();
	const pg = await getPostgresClient();
	await pg.query('update profiles set school_id = $1 where id = $2', [schoolId, e.id]);
	for (let i = 0; i < n; i++) {
		await pg.query(
			`insert into minesweeper_games
			   (student_id, difficulty, status, grid_state, mines_count, time_seconds, completed_at,
			    points_earned)
			 values ($1, 'beginner', 'won', '{}'::jsonb, 10, 30, now(), $2)`,
			[e.id, points]
		);
	}
	return e;
}

// ============================================================================
// TESTS
// ============================================================================

describe('parties de démineur privées, rang par le serveur', () => {
	let moyen: { id: string; email: string };
	let fort: { id: string; email: string };
	let debutant: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		const a = await ecole(ECOLE_A);
		const b = await ecole(ECOLE_B);
		moyen = await joueur(a, 10, 50);
		fort = await joueur(a, 10, 80);
		// Meilleur que tous, mais d'une AUTRE école : ne doit pas compter.
		await joueur(b, 10, 99);
		// Pas classé : moins de 10 parties gagnées.
		debutant = await joueur(a, 3, 90);
	});

	afterAll(async () => {
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		await pg.query('delete from schools where name in ($1, $2)', [ECOLE_A, ECOLE_B]);
	});

	it('anon ne lit plus aucune partie d’élève', async () => {
		const { data } = await anonClient()
			.from('minesweeper_games')
			.select('id')
			.eq('student_id', moyen.id);
		expect(data ?? []).toEqual([]);
	});

	it('un camarade de la même école ne lit plus les parties d’un autre', async () => {
		const client = await clientFor(fort.email);
		const { data } = await client.from('minesweeper_games').select('id').eq('student_id', moyen.id);
		expect(data ?? []).toEqual([]);
	});

	it('l’élève lit toujours ses propres parties', async () => {
		const client = await clientFor(moyen.email);
		const { data, error } = await client
			.from('minesweeper_games')
			.select('id')
			.eq('student_id', moyen.id);
		expect(error).toBeNull();
		expect(data).toHaveLength(10);
	});

	/** Ligne de l'appelant dans le classement d'école, comme la page de stats. */
	async function maLigne(email: string) {
		const client = await clientFor(email);
		const { data, error } = await client.rpc('minesweeper_scoped_leaderboard', {
			p_scope: 'school',
			p_limit: 100
		});
		expect(error).toBeNull();
		return { lignes: data ?? [], moi: (data ?? []).find((l) => l.is_me) };
	}

	it('le rang de l’appelant reste juste, dans son école seulement', async () => {
		const m = await maLigne(moyen.email);
		expect(m.moi?.rank).toBe(2);
		// L'élève de l'autre école (meilleur que tous) n'apparaît pas.
		expect(m.lignes.map((l) => l.user_id).sort()).toEqual([moyen.id, fort.id, debutant.id].sort());
		const f = await maLigne(fort.email);
		expect(f.moi?.rank).toBe(1);
	});

	it('un élève non classé n’a pas de rang', async () => {
		const d = await maLigne(debutant.email);
		expect(d.moi?.top_games_count ?? 0).toBeLessThan(10);
	});
});
