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

/**
 * Schema for real-time game state updates
 * Used during active matches to sync player progress
 */
export const realtimeStateUpdateSchema = z.object({
	cells_revealed: z
		.number()
		.int({ message: 'Le nombre de cellules révélées doit être un entier' })
		.min(0, 'Le nombre de cellules révélées doit être positif')
		.max(480, 'Le nombre de cellules révélées ne peut pas dépasser 480'), // 30x16 grid
	flags_used: z
		.number()
		.int({ message: 'Le nombre de drapeaux utilisés doit être un entier' })
		.min(0, 'Le nombre de drapeaux utilisés doit être positif')
		.max(99, 'Le nombre de drapeaux utilisés ne peut pas dépasser 99'),
	time_elapsed: z
		.number()
		.int({ message: 'Le temps écoulé doit être un entier' })
		.min(0, 'Le temps écoulé doit être positif')
		.max(7200, 'Le temps écoulé ne peut pas dépasser 2 heures'), // 2 hours max
	last_action: z
		.object({
			type: z.enum(['reveal', 'flag', 'unflag']).optional(),
			row: z.number().int().min(0).max(15).optional(),
			col: z.number().int().min(0).max(29).optional(),
			timestamp: z.number().optional()
		})
		.optional()
});

/**
 * Schema for completing a multiplayer match
 * Validates completion time and grid state for server-side win verification
 * Bounds match actual difficulty configs: Beginner (9×9, 10 mines), Intermediate (16×16, 40 mines), Expert (16×30, 99 mines)
 */
export const completeMatchSchema = z.object({
	time_seconds: z
		.number()
		.int({ message: 'Le temps doit être un entier' })
		.min(10, 'Le temps minimum est de 10 secondes')
		.max(7200, 'Le temps maximum est de 2 heures'),
	grid_state: z.object({
		// Beginner: 9×9, Intermediate: 16×16, Expert: 16×30
		rows: z.number().int().min(9).max(16), // Min: Beginner 9, Max: Expert 16
		cols: z.number().int().min(9).max(30), // Min: Beginner 9, Max: Expert 30
		mines: z
			.array(
				z.tuple([
					z.number().int().min(0).max(15), // Max row index for Expert (16-1)
					z.number().int().min(0).max(29) // Max col index for Expert (30-1)
				])
			)
			.min(10, 'Pas assez de mines') // Min: Beginner 10
			.max(99, 'Trop de mines'), // Max: Expert 99
		revealed: z
			.array(
				z.tuple([
					z.number().int().min(0).max(15), // Max row index for Expert
					z.number().int().min(0).max(29) // Max col index for Expert
				])
			)
			.max(480, 'Trop de cellules révélées'), // Max cells: Expert 16×30 = 480
		flagged: z
			.array(
				z.tuple([
					z.number().int().min(0).max(15), // Max row index for Expert
					z.number().int().min(0).max(29) // Max col index for Expert
				])
			)
			.max(99, 'Trop de drapeaux'), // Max flags matches max mines (Expert)
		adjacentCounts: z
			.record(
				z.string().regex(/^\d{1,2},\d{1,2}$/, 'Format invalide pour les coordonnées'), // Match "row,col" with max 2 digits
				z.number().int().min(0).max(8) // Adjacent mine count (max 8)
			)
			.refine((obj) => Object.keys(obj).length <= 480, {
				message: 'Trop de comptes adjacents (max 480 pour Expert 16×30)'
			}) // DoS protection: max cells
	})
});

/**
 * Schema for abandoning a multiplayer match
 * Validates abandonment reason
 */
export const abandonMatchSchema = z.object({
	reason: z
		.enum(['player_quit', 'timeout', 'disconnect'], {
			message: 'La raison doit être player_quit, timeout ou disconnect'
		})
		.default('player_quit')
});

// Type exports for use in API endpoints
export type JoinQueueInput = z.infer<typeof joinQueueSchema>;
export type MatchIdInput = z.infer<typeof matchIdSchema>;
export type GameStateUpdateInput = z.infer<typeof gameStateUpdateSchema>;
export type SurrenderInput = z.infer<typeof surrenderSchema>;
export type RealtimeStateUpdateInput = z.infer<typeof realtimeStateUpdateSchema>;
export type CompleteMatchInput = z.infer<typeof completeMatchSchema>;
export type AbandonMatchInput = z.infer<typeof abandonMatchSchema>;
