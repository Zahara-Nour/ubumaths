/**
 * Frontière d'école : scores 2048 et démineur multijoueur (constat D18)
 * =====================================================================
 *
 * Mesuré en prod le 2026-10-10 : la policy « Authenticated users can view 2048
 * leaderboard » (USING true) rendait les scores 2048 de TOUS les élèves lisibles par tout
 * compte connecté, toutes écoles confondues ; `join_multiplayer_queue` appariait deux
 * élèves sans regarder leur école (ADR 0002 : l'école est la frontière sociale).
 *
 * Décisions de David (2026-10-10) : personne ne lit les scores 2048 des autres (les
 * classements passent par `game_leaderboard`, bornée à l'école côté serveur) ; le
 * multijoueur n'apparie que deux élèves de la même école.
 *
 * Ce que le fichier prouve :
 *   1. un élève ne lit plus le score 2048 d'un autre (même école ou non) ;
 *   2. il lit et met à jour toujours le sien ;
 *   3. le classement 2048 de l'école (`game_leaderboard`) montre toujours ses camarades ;
 *   4. un élève d'une autre école déjà en file n'est pas pris comme adversaire ; un
 *      camarade de la même école, si.
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

const ECOLE_A = 'zz-école frontière A';
const ECOLE_B = 'zz-école frontière B';

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

async function ecole(nom: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into schools (name, city, country) values ($1, 'zz', 'zz') returning id`,
		[nom]
	);
	return rows[0].id;
}

/** Élève de l'école, avec un score 2048. */
async function eleve(schoolId: string, score: number) {
	const e = await TestData.profile().withRole('student').create();
	const pg = await getPostgresClient();
	await pg.query('update profiles set school_id = $1 where id = $2', [schoolId, e.id]);
	await pg.query(
		`insert into game_2048_scores (user_id, best_score, games_played) values ($1, $2, 1)`,
		[e.id, score]
	);
	return e;
}

async function viderFile(ids: string[]): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		'delete from minesweeper_multiplayer_matches where player1_id = any($1) or player2_id = any($1)',
		[ids]
	);
	await pg.query('delete from minesweeper_multiplayer_queue where student_id = any($1)', [ids]);
}

// ============================================================================
// TESTS
// ============================================================================

describe('frontière d’école : 2048 et multijoueur', () => {
	let a1: { id: string; email: string };
	let a2: { id: string; email: string };
	let b1: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		const a = await ecole(ECOLE_A);
		const b = await ecole(ECOLE_B);
		a1 = await eleve(a, 1000);
		a2 = await eleve(a, 2000);
		b1 = await eleve(b, 3000);
	});

	afterAll(async () => {
		await viderFile([a1.id, a2.id, b1.id]);
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		await pg.query('delete from schools where name in ($1, $2)', [ECOLE_A, ECOLE_B]);
	});

	it.each([
		['un camarade de la même école', () => a2.id],
		['un élève d’une autre école', () => b1.id]
	])('un élève ne lit plus le score 2048 d’%s', async (_nom, autre) => {
		const client = await clientFor(a1.email);
		const { data } = await client
			.from('game_2048_scores')
			.select('best_score')
			.eq('user_id', autre());
		expect(data ?? []).toEqual([]);
	});

	it('il lit et met à jour toujours le sien', async () => {
		const client = await clientFor(a1.email);
		const { data, error } = await client
			.from('game_2048_scores')
			.select('best_score')
			.eq('user_id', a1.id);
		expect(error).toBeNull();
		expect(data).toEqual([{ best_score: 1000 }]);

		const { data: maj, error: majError } = await client
			.from('game_2048_scores')
			.update({ games_played: 2 })
			.eq('user_id', a1.id)
			.select('games_played');
		expect(majError).toBeNull();
		expect(maj).toEqual([{ games_played: 2 }]);
	});

	it('le classement 2048 de l’école montre toujours les camarades, pas l’autre école', async () => {
		const client = await clientFor(a1.email);
		const { data, error } = await client.rpc('game_leaderboard', {
			p_game: '2048',
			p_scope: 'school',
			p_limit: 50
		});
		expect(error).toBeNull();
		const ids = (data ?? []).map((l) => l.user_id);
		expect(ids).toEqual(expect.arrayContaining([a1.id, a2.id]));
		expect(ids).not.toContain(b1.id);
	});

	it('multijoueur : un élève d’une autre école en file n’est pas pris comme adversaire', async () => {
		await viderFile([a1.id, a2.id, b1.id]);
		const autre = await clientFor(b1.email);
		const { error: attente } = await autre.rpc('join_multiplayer_queue', {
			p_difficulty: 'beginner',
			p_match_type: 'quick'
		});
		expect(attente).toBeNull();

		const moi = await clientFor(a1.email);
		const { error } = await moi.rpc('join_multiplayer_queue', {
			p_difficulty: 'beginner',
			p_match_type: 'quick'
		});
		expect(error).toBeNull();
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select 1 from minesweeper_multiplayer_matches where $1 in (player1_id, player2_id)',
			[a1.id]
		);
		expect(rows).toEqual([]);
	});

	it('multijoueur : un camarade de la même école en file est apparié', async () => {
		await viderFile([a1.id, a2.id, b1.id]);
		const camarade = await clientFor(a2.email);
		await camarade.rpc('join_multiplayer_queue', {
			p_difficulty: 'beginner',
			p_match_type: 'quick'
		});

		const moi = await clientFor(a1.email);
		const { error } = await moi.rpc('join_multiplayer_queue', {
			p_difficulty: 'beginner',
			p_match_type: 'quick'
		});
		expect(error).toBeNull();
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`select 1 from minesweeper_multiplayer_matches
			 where (player1_id, player2_id) in (($1::uuid, $2::uuid), ($2::uuid, $1::uuid))`,
			[a1.id, a2.id]
		);
		expect(rows).toHaveLength(1);
	});
});
