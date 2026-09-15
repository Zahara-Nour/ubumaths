/**
 * Unified game leaderboards — server load
 * =======================================
 *
 * Renders one game's leaderboard at one scope (class / grade / school).
 * Tabs and the game selector navigate by search params (`?game=&scope=`), so
 * each load is a single `game_leaderboard` RPC call.
 *
 * AUTH: guaranteed by (protected)/+layout.server.ts (redirects to /login otherwise).
 *       The RPC is SECURITY DEFINER and ranks the CALLER (auth.uid()) — it is
 *       school-bounded server-side, so no scope/id is trusted from the client.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { gameLeaderboardQuerySchema } from '$lib/server/validation/games';
import type { GameLeaderboardRow, MinesweeperLeaderboardRow } from '$lib/types/database-helpers';

export const load: PageServerLoad = async ({ url, locals, parent }) => {
	const { supabase } = locals;

	// ⚠️ `await parent()` n'est pas décoratif : SvelteKit exécute les `load` du
	// layout et de la page EN PARALLÈLE. Sans cette attente, la page appelait la
	// RPC avant que le layout n'ait redirigé un visiteur non connecté — donc en
	// tant qu'`anon`, qui n'a pas le droit de l'exécuter. Résultat : `42501
	// permission denied`, transformé ligne 38 en **500** au lieu d'une simple
	// redirection vers /login. Trois utilisateurs concernés depuis le 2026-09-06,
	// trouvés dans les erreurs d'exécution de la production.
	//
	// C'est le motif que documente `(protected)/+layout.server.ts` : un enfant
	// qui a besoin de la session l'obtient par `parent()`, ce qui le sérialise
	// APRÈS le garde.
	await parent();

	// The schema never throws: unknown game/scope fall back, limit is clamped.
	const { game, scope, limit } = gameLeaderboardQuerySchema.parse({
		game: url.searchParams.get('game') ?? undefined,
		scope: url.searchParams.get('scope') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined
	});

	// Unified ranking (total_points for all games), school-bounded, ranked by auth.uid().
	const { data, error: rpcError } = await supabase.rpc('game_leaderboard', {
		p_game: game,
		p_scope: scope,
		p_limit: limit
	});

	if (rpcError) {
		console.error('[Leaderboards] game_leaderboard RPC error:', rpcError);
		throw error(500, 'Impossible de charger le classement');
	}

	const rows: GameLeaderboardRow[] = data ?? [];

	// Minesweeper also gets its richer detailed view (avg_top_10), same scope.
	let minesweeperDetail: MinesweeperLeaderboardRow[] | null = null;
	if (game === 'minesweeper') {
		const { data: msData, error: msError } = await supabase.rpc('minesweeper_scoped_leaderboard', {
			p_scope: scope,
			p_limit: limit
		});
		if (msError) {
			console.error('[Leaderboards] minesweeper_scoped_leaderboard RPC error:', msError);
			// Non-blocking: the unified ranking above is already loaded.
		} else {
			minesweeperDetail = msData ?? [];
		}
	}

	return {
		game,
		scope,
		rows,
		minesweeperDetail
	};
};
