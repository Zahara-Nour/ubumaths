/**
 * Données de jeu et constructions : plus de lecture ouverte à tous (relevé pendant B6, D17)
 * ======================================================================================
 *
 * Mesuré en prod le 2026-10-11 : `mathemo_scores`, `minesweeper_player_stats`,
 * `minesweeper_student_achievements` et `marketplace_listing_views` avaient une policy
 * SELECT `using (true)` pour tout compte connecté, toutes écoles confondues ; toutes les
 * lectures du code portent sur les données de l'élève lui-même (les classements passent
 * par des fonctions serveur bornées à l'école). Les constructions publiques étaient
 * lisibles sans connexion, alors qu'aucune page publique ne les lit.
 *
 * Décisions de David (2026-10-11) : chacun ne lit que ses données de jeu ; les
 * constructions publiques sont réservées aux comptes connectés. Les fonctions sans
 * appelant (`get_2048_user_rank`, `process_weekly_rewards`, `purchase_shop_item`, puis
 * `award_weekly_reward` et `calculate_daily_challenge_gidouilles` le 2026-10-13) sont
 * supprimées.
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

const SUCCES = 'zz-succes-lectures';
const ECOLE = 'zz-école lectures ouvertes';

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

// ============================================================================
// TESTS
// ============================================================================

describe('lectures ouvertes fermées', () => {
	let a: { id: string; email: string };
	let b: { id: string; email: string };
	let constructionId: string;
	let listingId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		a = await TestData.profile().withRole('student').create();
		b = await TestData.profile().withRole('student').create();
		const pg = await getPostgresClient();
		await pg.query(
			`insert into minesweeper_achievements (id, name, description, icon, unlock_condition)
			 values ($1, 'zz', 'zz', 'zz', 'zz') on conflict (id) do nothing`,
			[SUCCES]
		);
		for (const e of [a, b]) {
			await pg.query(`insert into mathemo_scores (user_id, games_played) values ($1, 3)`, [e.id]);
			await pg.query(
				`insert into minesweeper_student_achievements (student_id, achievement_id) values ($1, $2)`,
				[e.id, SUCCES]
			);
			await pg.query(
				`insert into minesweeper_player_stats (student_id, season) values ($1, 'zz-saison')`,
				[e.id]
			);
		}
		const ecole = await pg.query<{ id: string }>(
			`insert into schools (name, city, country) values ($1, 'zz', 'zz') returning id`,
			[ECOLE]
		);
		const annonce = await pg.query<{ id: string }>(
			`insert into marketplace_listings
			   (creator_id, school_id, listing_type, offered_gidouilles, expires_at)
			 values ($1, $2, 'sell', 1, now() + interval '1 day') returning id`,
			[a.id, ecole.rows[0].id]
		);
		listingId = annonce.rows[0].id;
		for (const e of [a, b]) {
			await pg.query(
				`insert into marketplace_listing_views (listing_id, user_id) values ($1, $2)`,
				[listingId, e.id]
			);
		}
		const { rows } = await pg.query<{ id: string }>(
			`insert into constructions (title, script, is_public, author_id)
			 values ('zz-construction publique', '{}', true, $1) returning id`,
			[a.id]
		);
		constructionId = rows[0].id;
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from constructions where id = $1', [constructionId]);
		await pg.query('delete from minesweeper_player_stats where season = $1', ['zz-saison']);
		await pg.query('delete from marketplace_listings where id = $1', [listingId]);
		await pg.query('delete from schools where name = $1', [ECOLE]);
		await cleanupAllTestData();
		await pg.query('delete from minesweeper_achievements where id = $1', [SUCCES]);
	});

	/** Lecture, par `client`, des lignes de jeu de l'élève `id` : une requête typée par table. */
	const lectures: [
		string,
		(client: SupabaseClient<Database>, id: string) => PromiseLike<{ data: unknown[] | null }>
	][] = [
		['mathemo_scores', (c, id) => c.from('mathemo_scores').select('user_id').eq('user_id', id)],
		[
			'minesweeper_student_achievements',
			(c, id) =>
				c.from('minesweeper_student_achievements').select('student_id').eq('student_id', id)
		],
		[
			'minesweeper_player_stats',
			(c, id) => c.from('minesweeper_player_stats').select('student_id').eq('student_id', id)
		],
		[
			'marketplace_listing_views',
			(c, id) => c.from('marketplace_listing_views').select('user_id').eq('user_id', id)
		]
	];

	it.each(lectures)(
		'%s : un autre élève ne lit plus les données d’un camarade',
		async (_t, lire) => {
			const client = await clientFor(b.email);
			const { data } = await lire(client, a.id);
			expect(data ?? []).toEqual([]);
		}
	);

	it.each(lectures)('%s : l’élève lit toujours les siennes', async (_t, lire) => {
		const client = await clientFor(a.email);
		const { data } = await lire(client, a.id);
		expect(data).toHaveLength(1);
	});

	it('anon ne lit plus une construction publique ; un compte connecté, si', async () => {
		const { data: anon } = await anonClient()
			.from('constructions')
			.select('id')
			.eq('id', constructionId);
		expect(anon ?? []).toEqual([]);
		const client = await clientFor(b.email);
		const { data } = await client.from('constructions').select('id').eq('id', constructionId);
		expect(data).toHaveLength(1);
	});

	it.each([
		'get_2048_user_rank',
		'process_weekly_rewards',
		'purchase_shop_item',
		'award_weekly_reward',
		'calculate_daily_challenge_gidouilles',
		'run_flag_stale_python_rechecks'
	])('la fonction sans appelant %s n’existe plus', async (nom) => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`select 1 from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`,
			[nom]
		);
		expect(rows).toEqual([]);
	});

	it('la table inerte python_submission_server_verdicts n’existe plus', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`select to_regclass('public.python_submission_server_verdicts') as t`
		);
		expect(rows[0].t).toBeNull();
	});
});
