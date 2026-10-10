/**
 * Récompenses de tournoi et de multijoueur : la table gidouilles_history n'existe plus
 * ==================================================================================
 *
 * Constat E19 (docs/wip/rgpd-securite-constats.md), mesuré en prod le 2026-10-10 :
 * `gidouilles_history` a été renommée `gidouilles_activity` (20260103235000), mais des
 * fonctions y écrivaient encore. Aucun tournoi n'a été finalisé depuis le renommage, et
 * aucun match multijoueur n'a jamais eu lieu : l'échec (42P01) n'a lésé personne, il
 * attend le prochain tournoi.
 *
 * Ce que le fichier prouve :
 *   1. finaliser un tournoi crédite le podium : solde ET journal (`gidouilles_activity`) ;
 *   2. redistribuer les récompenses d'un tournoi terminé sans récompense crédite aussi,
 *      et une seconde redistribution est refusée ;
 *   3. l'abandon d'un match multijoueur crédite l'adversaire : solde ET journal (la
 *      version d'origine n'écrivait que dans le journal, avec des colonnes qui n'ont
 *      jamais existé — le solde n'aurait jamais bougé — et plantait sans statistiques
 *      de saison : ROW(1500) perdait le nom du champ rank) ;
 *   4. décision de David (2026-10-10) : le bonus automatique du meilleur jeu de la
 *      semaine saute un élève en lecture seule, et reste versé aux autres.
 *
 * `complete_multiplayer_match` reçoit la même correction que l'abandon ; elle exige une
 * grille gagnante valide, que ce fichier ne fabrique pas.
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

async function solde(studentId: string): Promise<number> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ g: string }>(
		'select coalesce(gidouilles, 0) as g from profiles where id = $1',
		[studentId]
	);
	return Number(rows[0].g);
}

async function journal(studentId: string): Promise<{ delta: number; reason: string }[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ delta: string; reason: string }>(
		'select delta, reason from gidouilles_activity where student_id = $1 order by created_at',
		[studentId]
	);
	return rows.map((r) => ({ delta: Number(r.delta), reason: r.reason }));
}

/** Tournoi du prof, avec une partie gagnée par l'élève ; rend son identifiant. */
async function tournoiAvecVainqueur(
	teacherId: string,
	studentId: string,
	status: 'active' | 'completed'
): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into minesweeper_tournaments
		   (creator_id, creator_role, scope, name, difficulty, start_date, end_date, status)
		 values ($1, 'teacher', 'classes', 'zz-tournoi ' || gen_random_uuid(), 'beginner',
		   now() - interval '2 days', now() - interval '1 day', $2)
		 returning id`,
		[teacherId, status]
	);
	const id = rows[0].id;
	await pg.query(
		`insert into minesweeper_tournament_games
		   (tournament_id, student_id, game_number, seed, status, time_seconds, grid_3bv, score,
		    completed_at)
		 values ($1, $2, 1, $3, 'won', 30, 20, 100, now())`,
		[id, studentId, `tournament-${id}-game-1`]
	);
	return id;
}

// ============================================================================
// TESTS
// ============================================================================

describe('récompenses de tournoi et de multijoueur', () => {
	let teacherId: string;
	let prof: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();
		const p = await TestData.profile().withRole('teacher').create();
		teacherId = p.id;
		prof = await clientFor(p.email);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query(`delete from minesweeper_tournaments where name like 'zz-tournoi %'`);
		await cleanupAllTestData();
	});

	it('finaliser un tournoi crédite le premier : solde et journal', async () => {
		const eleve = await TestData.profile().withRole('student').create();
		const tournoiId = await tournoiAvecVainqueur(teacherId, eleve.id, 'active');
		const avant = await solde(eleve.id);

		const { error } = await prof.rpc('finalize_tournament', { p_tournament_id: tournoiId });
		expect(error).toBeNull();

		expect(await solde(eleve.id)).toBe(avant + 10);
		expect(await journal(eleve.id)).toEqual([
			expect.objectContaining({ delta: 10, reason: expect.stringMatching(/Position #1$/) })
		]);
	});

	it('redistribuer un tournoi terminé sans récompense crédite, une seule fois', async () => {
		const eleve = await TestData.profile().withRole('student').create();
		const tournoiId = await tournoiAvecVainqueur(teacherId, eleve.id, 'completed');
		const avant = await solde(eleve.id);

		const { error } = await prof.rpc('redistribute_tournament_rewards', {
			p_tournament_id: tournoiId
		});
		expect(error).toBeNull();
		expect(await solde(eleve.id)).toBe(avant + 10);
		expect(await journal(eleve.id)).toHaveLength(1);

		const { error: seconde } = await prof.rpc('redistribute_tournament_rewards', {
			p_tournament_id: tournoiId
		});
		expect(seconde?.message).toContain('already been distributed');
		expect(await solde(eleve.id)).toBe(avant + 10);
	});

	it('l’abandon d’un match crédite l’adversaire : solde et journal', async () => {
		const quitte = await TestData.profile().withRole('student').create();
		const adversaire = await TestData.profile().withRole('student').create();
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ id: string }>(
			`insert into minesweeper_multiplayer_matches
			   (match_type, difficulty, seed, player1_id, player2_id, status, started_at)
			 values ('quick', 'beginner', 'zz-graine', $1, $2, 'in_progress', now())
			 returning id`,
			[quitte.id, adversaire.id]
		);
		const avant = await solde(adversaire.id);

		const client = await clientFor(quitte.email);
		const { error } = await client.rpc('abandon_multiplayer_match', {
			p_match_id: rows[0].id,
			p_reason: 'player_quit'
		});
		expect(error).toBeNull();

		expect(await solde(adversaire.id)).toBe(avant + 10);
		expect(await journal(adversaire.id)).toEqual([
			expect.objectContaining({ delta: 10, reason: 'minesweeper_multiplayer_opponent_quit' })
		]);
		await pg.query('delete from minesweeper_multiplayer_matches where id = $1', [rows[0].id]);
	});

	it('bonus automatique de la semaine : sauté en lecture seule, versé aux autres', async () => {
		const pg = await getPostgresClient();
		const lectureSeule = await TestData.profile().withRole('student').create();
		const normal = await TestData.profile().withRole('student').create();
		await pg.query(
			`update profiles set consent_required = true, consent_granted_at = null,
			   consent_grace_period_ends = now() - interval '1 day' where id = $1`,
			[lectureSeule.id]
		);
		// Semaine fictive, loin dans le passé : n'interfère avec aucune autre ligne.
		for (const id of [lectureSeule.id, normal.id]) {
			await pg.query(
				`insert into weekly_best_rewards
				   (student_id, week_start, week_end, best_theoretical_reward, best_reward_game_type)
				 values ($1, '2001-01-01', '2001-01-07', 4, 'minesweeper')`,
				[id]
			);
		}
		const avantLs = await solde(lectureSeule.id);
		const avantN = await solde(normal.id);

		await pg.query(`select public.award_weekly_best_bonuses('2001-01-01', '2001-01-07')`);

		expect(await solde(lectureSeule.id)).toBe(avantLs);
		expect(await journal(lectureSeule.id)).toEqual([]);
		expect(await solde(normal.id)).toBe(avantN + 4);
		await pg.query(`delete from weekly_best_rewards where week_start = '2001-01-01'`);
	});
});
