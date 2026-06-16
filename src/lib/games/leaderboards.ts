/**
 * Shared (client-safe) constants for the unified game leaderboards.
 * =================================================================
 *
 * Lives OUTSIDE `$lib/server` so both the page UI and the server-side Zod schema
 * can import the same source of truth. The value tuples must match the RPC
 * whitelists (`game_leaderboard` / `minesweeper_scoped_leaderboard`).
 */

/** Game values accepted by the RPC `p_game` (order = default = first tab). */
export const GAME_LEADERBOARD_GAMES = ['2048', 'mathemo', 'minesweeper'] as const;
/** Scope values accepted by the RPC `p_scope`. */
export const GAME_LEADERBOARD_SCOPES = ['class', 'grade', 'school'] as const;

export type GameLeaderboardGame = (typeof GAME_LEADERBOARD_GAMES)[number];
export type GameLeaderboardScope = (typeof GAME_LEADERBOARD_SCOPES)[number];

/** Display metadata for the game selector (label + emoji). */
export const LEADERBOARD_GAMES: ReadonlyArray<{
	value: GameLeaderboardGame;
	label: string;
	emoji: string;
}> = [
	{ value: '2048', label: '2048', emoji: '🎮' },
	{ value: 'mathemo', label: 'Mathémo', emoji: '🔤' },
	{ value: 'minesweeper', label: 'Démineur', emoji: '💣' }
];

/** Display metadata for the scope tabs (Classe / Niveau / École). */
export const LEADERBOARD_SCOPES: ReadonlyArray<{
	value: GameLeaderboardScope;
	label: string;
}> = [
	{ value: 'class', label: 'Classe' },
	{ value: 'grade', label: 'Niveau' },
	{ value: 'school', label: 'École' }
];

export function gameLabel(game: GameLeaderboardGame): string {
	return LEADERBOARD_GAMES.find((g) => g.value === game)?.label ?? game;
}
export function scopeLabel(scope: GameLeaderboardScope): string {
	return LEADERBOARD_SCOPES.find((s) => s.value === scope)?.label ?? scope;
}
