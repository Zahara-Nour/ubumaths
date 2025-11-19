/**
 * Validation schemas for Minesweeper multiplayer endpoints
 * All input validation uses Zod for type safety and security
 */

import { z } from 'zod';

/**
 * Schema for joining matchmaking queue
 * Validates difficulty level and match type
 */
export const joinQueueSchema = z.object({
	difficulty: z.enum(['beginner', 'intermediate', 'expert'], {
		message: 'La difficulté doit être beginner, intermediate ou expert'
	}),
	match_type: z
		.enum(['quick', 'ranked'], {
			message: 'Le type de match doit être quick ou ranked'
		})
		.default('quick')
});

/**
 * Schema for match ID validation
 * Used in various multiplayer endpoints
 */
export const matchIdSchema = z.object({
	match_id: z.string().uuid({
		message: 'ID de match invalide'
	})
});

/**
 * Schema for game state updates
 * Validates cells revealed, flags placed, etc.
 */
export const gameStateUpdateSchema = z.object({
	match_id: z.string().uuid({
		message: 'ID de match invalide'
	}),
	cells_revealed: z
		.number()
		.int()
		.min(0, 'Le nombre de cellules révélées doit être positif')
		.max(1000, 'Le nombre de cellules révélées est trop élevé'),
	flags_placed: z
		.number()
		.int()
		.min(0, 'Le nombre de drapeaux placés doit être positif')
		.max(100, 'Le nombre de drapeaux placés est trop élevé'),
	time_elapsed: z
		.number()
		.int()
		.min(0, 'Le temps écoulé doit être positif')
		.max(3600, 'Le temps écoulé est trop élevé'), // Max 1 hour
	status: z.enum(['in_progress', 'won', 'lost', 'abandoned'], {
		message: 'Le statut doit être in_progress, won, lost ou abandoned'
	})
});

/**
 * Schema for surrendering a match
 */
export const surrenderSchema = z.object({
	match_id: z.string().uuid({
		message: 'ID de match invalide'
	})
});

// Type exports for use in API endpoints
export type JoinQueueInput = z.infer<typeof joinQueueSchema>;
export type MatchIdInput = z.infer<typeof matchIdSchema>;
export type GameStateUpdateInput = z.infer<typeof gameStateUpdateSchema>;
export type SurrenderInput = z.infer<typeof surrenderSchema>;
