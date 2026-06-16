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
import type { GameLeaderboardRow } from '$lib/types/database-helpers';

export const load: PageServerLoad = async ({ url, locals }) => {
	const { supabase, user } = locals;

	// The schema never throws: unknown game/scope fall back, limit is clamped.
	const { game, scope, limit } = gameLeaderboardQuerySchema.parse({
		game: url.searchParams.get('game') ?? undefined,
		scope: url.searchParams.get('scope') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined
	});

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

	return {
		game,
		scope,
		rows,
		currentUserId: user?.id ?? null
	};
};
