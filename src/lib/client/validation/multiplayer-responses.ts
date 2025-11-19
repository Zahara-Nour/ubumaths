/**
 * Client-side validation schemas for multiplayer API responses
 * Validates server responses to prevent runtime errors from malformed data
 */

import { z } from 'zod';

/**
 * Schema for match found response (from queue join or polling)
 */
export const matchFoundResponseSchema = z.object({
	matched: z.boolean(),
	match_id: z.string().uuid().optional(),
	opponent_id: z.string().uuid().optional(),
	opponent_name: z.string().optional(),
	seed: z.string().optional(),
	difficulty: z.enum(['beginner', 'intermediate', 'expert']).optional(),
	match_type: z.enum(['quick', 'ranked']).optional(),
	player_number: z.union([z.literal(1), z.literal(2)]).optional(),
	rank: z.number().int().min(0).optional(),
	waiting: z.boolean().optional()
});

/**
 * Schema for match completion response
 */
export const completeMatchResponseSchema = z.object({
	success: z.boolean(),
	winner_id: z.string().uuid(),
	gidouilles: z.number().int().min(0),
	base_reward: z.number().int().min(0),
	speed_bonus: z.number().int().min(0),
	elo_change: z.number().int(),
	new_elo: z.number().int().min(0).max(5000),
	time_seconds: z.number().int().positive()
});

/**
 * Schema for match abandonment response
 */
export const abandonMatchResponseSchema = z.object({
	success: z.boolean(),
	abandoned_by: z.string().uuid(),
	winner_id: z.string().uuid(),
	reason: z.enum(['player_quit', 'timeout', 'disconnect']),
	elo_change: z.number().int()
});

/**
 * Schema for realtime game state updates
 */
export const realtimeGameStateSchema = z.object({
	match_id: z.string().uuid(),
	player_id: z.string().uuid(),
	cells_revealed: z.number().int().min(0).max(2500),
	flags_used: z.number().int().min(0).max(999),
	time_elapsed: z.number().int().min(0).max(7200),
	last_action: z
		.object({
			type: z.enum(['reveal', 'flag', 'unflag']),
			row: z.number().int().min(0).max(49),
			col: z.number().int().min(0).max(49),
			timestamp: z.number()
		})
		.nullable()
		.optional(),
	updated_at: z.string().optional()
});

/**
 * Schema for realtime match updates
 */
export const realtimeMatchUpdateSchema = z.object({
	id: z.string().uuid(),
	status: z.enum(['waiting', 'countdown', 'in_progress', 'completed', 'abandoned']),
	winner_id: z.string().uuid().nullable().optional(),
	completed_at: z.string().nullable().optional(),
	duration_seconds: z.number().int().nullable().optional()
});

// Type exports for use in stores
export type MatchFoundResponse = z.infer<typeof matchFoundResponseSchema>;
export type CompleteMatchResponse = z.infer<typeof completeMatchResponseSchema>;
export type AbandonMatchResponse = z.infer<typeof abandonMatchResponseSchema>;
export type RealtimeGameState = z.infer<typeof realtimeGameStateSchema>;
export type RealtimeMatchUpdate = z.infer<typeof realtimeMatchUpdateSchema>;
