/**
 * Zod validation schemas for Minesweeper tournaments
 */

import { z } from 'zod';

// ============================================================================
// Shared Schemas
// ============================================================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid();

/**
 * Difficulty validation
 */
export const difficultySchema = z.enum(['beginner', 'intermediate', 'expert']);

/**
 * Tournament status validation
 */
export const tournamentStatusSchema = z.enum(['scheduled', 'active', 'completed', 'cancelled']);

/**
 * Grid state schema (reused from existing minesweeper validation)
 */
export const gridStateSchema = z.object({
	rows: z.number().int().min(9).max(30),
	cols: z.number().int().min(9).max(30),
	mines: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])),
	revealed: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])),
	flagged: z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])),
	adjacentCounts: z.record(z.string(), z.number().int().min(0).max(8))
});

// ============================================================================
// Tournament Creation
// ============================================================================

/**
 * Podium rewards validation
 * Keys are place numbers (1, 2, 3...), values are gidouilles amounts
 */
export const podiumRewardsSchema = z.record(z.string(), z.number().int().min(0).max(100)).refine(
	(rewards) => {
		const keys = Object.keys(rewards);
		// Must have at least one entry
		if (keys.length === 0) return false;
		// All keys must be positive integers
		return keys.every((k) => /^[1-9]\d*$/.test(k));
	},
	{ message: 'podium_rewards keys must be positive integers (1, 2, 3...)' }
);

/**
 * Create tournament request validation
 */
export const createTournamentSchema = z
	.object({
		name: z
			.string()
			.min(3, 'Le nom doit contenir au moins 3 caractères')
			.max(100, 'Le nom ne peut pas dépasser 100 caractères'),
		description: z
			.string()
			.max(1000, 'La description ne peut pas dépasser 1000 caractères')
			.optional()
			.nullable(),
		difficulty: difficultySchema,
		start_date: z.string().datetime({ message: 'Date de début invalide' }),
		end_date: z.string().datetime({ message: 'Date de fin invalide' }),
		top_x_games: z
			.number()
			.int()
			.min(1, 'Au moins 1 partie doit compter')
			.max(20, 'Maximum 20 parties'),
		podium_rewards: podiumRewardsSchema,
		podium_places: z
			.number()
			.int()
			.min(1, 'Au moins 1 place sur le podium')
			.max(10, 'Maximum 10 places'),
		class_ids: z
			.array(uuidSchema)
			.min(1, 'Au moins une classe doit être sélectionnée')
			.optional()
			.nullable()
	})
	.refine((data) => new Date(data.end_date) > new Date(data.start_date), {
		message: 'La date de fin doit être après la date de début',
		path: ['end_date']
	})
	.refine(
		(data) => {
			// Verify podium_rewards has entries for all places 1 to podium_places
			for (let i = 1; i <= data.podium_places; i++) {
				if (!(i.toString() in data.podium_rewards)) {
					return false;
				}
			}
			return true;
		},
		{
			message: 'Les récompenses doivent être définies pour chaque place du podium',
			path: ['podium_rewards']
		}
	);

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

// ============================================================================
// Tournament Game Operations
// ============================================================================

/**
 * Start tournament game request (only needs tournament_id in URL params)
 */
export const startTournamentGameSchema = z.object({
	tournament_id: uuidSchema
});

export type StartTournamentGameInput = z.infer<typeof startTournamentGameSchema>;

/**
 * Complete tournament game request
 */
export const completeTournamentGameSchema = z.object({
	status: z.enum(['won', 'lost']),
	time_seconds: z
		.number()
		.int()
		.min(1, 'Le temps doit être au moins 1 seconde')
		.max(14400, 'Le temps ne peut pas dépasser 4 heures'),
	grid_state: gridStateSchema
});

export type CompleteTournamentGameInput = z.infer<typeof completeTournamentGameSchema>;

/**
 * Abandon tournament game request (only needs game_id in URL params)
 */
export const abandonTournamentGameSchema = z.object({
	game_id: uuidSchema
});

export type AbandonTournamentGameInput = z.infer<typeof abandonTournamentGameSchema>;

// ============================================================================
// Tournament Management
// ============================================================================

/**
 * Get tournament by ID (URL params)
 */
export const getTournamentSchema = z.object({
	id: uuidSchema
});

export type GetTournamentInput = z.infer<typeof getTournamentSchema>;

/**
 * Get tournament standings query params
 */
export const getTournamentStandingsSchema = z.object({
	limit: z
		.string()
		.optional()
		.transform((v) => (v ? parseInt(v, 10) : 100))
		.pipe(z.number().int().min(1).max(1000))
});

export type GetTournamentStandingsInput = z.infer<typeof getTournamentStandingsSchema>;

/**
 * List active tournaments query params
 */
export const listActiveTournamentsSchema = z.object({
	include_upcoming: z
		.string()
		.optional()
		.transform((v) => v === 'true'),
	include_completed: z
		.string()
		.optional()
		.transform((v) => v === 'true'),
	limit: z
		.string()
		.optional()
		.transform((v) => (v ? parseInt(v, 10) : 50))
		.pipe(z.number().int().min(1).max(100))
});

export type ListActiveTournamentsInput = z.infer<typeof listActiveTournamentsSchema>;

/**
 * Update tournament (only allowed before start)
 */
export const updateTournamentSchema = createTournamentSchema.partial().extend({
	id: uuidSchema
});

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

/**
 * Finalize tournament request
 */
export const finalizeTournamentSchema = z.object({
	tournament_id: uuidSchema,
	force_early: z.boolean().optional().default(false)
});

export type FinalizeTournamentInput = z.infer<typeof finalizeTournamentSchema>;

// ============================================================================
// Response Types (for documentation, not validation)
// ============================================================================

/**
 * Tournament list item (minimal info)
 */
export const tournamentListItemSchema = z.object({
	id: uuidSchema,
	name: z.string(),
	difficulty: difficultySchema,
	status: tournamentStatusSchema,
	start_date: z.string(),
	end_date: z.string(),
	top_x_games: z.number(),
	podium_places: z.number(),
	participant_count: z.number().optional()
});

/**
 * Tournament game start response
 */
export const tournamentGameStartResponseSchema = z.object({
	game_id: uuidSchema,
	seed: z.string(),
	game_number: z.number().int().min(1)
});

/**
 * Tournament standing entry
 */
export const tournamentStandingSchema = z.object({
	tournament_id: uuidSchema,
	student_id: uuidSchema,
	firstname: z.string(),
	lastname: z.string(),
	games_won: z.number().int(),
	average_time: z.number(),
	position: z.number().int()
});
