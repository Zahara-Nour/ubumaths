/**
 * Unit tests for games validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	submit2048ScoreSchema,
	submit2048ScoreResponseSchema,
	get2048ScoreResponseSchema,
	gameLeaderboardQuerySchema
} from '../games';

describe('submit2048ScoreSchema', () => {
	it('should accept valid score submission', () => {
		const input = {
			score: 1024,
			reached_2048: false,
			reached_4096: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(input);
		}
	});

	it('should accept zero score', () => {
		const input = {
			score: 0,
			reached_2048: false,
			reached_4096: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should accept maximum score', () => {
		const input = {
			score: 4_000_000,
			reached_2048: true,
			reached_4096: true
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should reject negative score', () => {
		const input = {
			score: -10,
			reached_2048: false,
			reached_4096: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject score exceeding maximum', () => {
		const input = {
			score: 100_000_001,
			reached_2048: false,
			reached_4096: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject non-integer score', () => {
		const input = {
			score: 1024.5,
			reached_2048: false,
			reached_4096: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject Infinity', () => {
		const input = {
			score: Infinity,
			reached_2048: false,
			reached_4096: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject missing score', () => {
		const input = {
			reached_2048: false,
			reached_4096: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject non-boolean reached_2048', () => {
		const input = {
			score: 1024,
			reached_2048: 'true',
			reached_4096: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject missing reached_4096', () => {
		const input = {
			score: 1024,
			reached_2048: false
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject reaching 4096 without reaching 2048 first', () => {
		const input = {
			score: 100000,
			reached_2048: false,
			reached_4096: true // Invalid: can't reach 4096 without 2048
		};
		const result = submit2048ScoreSchema.safeParse(input);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Invalid tile progression');
		}
	});
});

describe('submit2048ScoreResponseSchema', () => {
	it('should accept valid submit score response', () => {
		const input = {
			success: true,
			best_score: 2048,
			is_new_best: true,
			games_played: 5
		};
		const result = submit2048ScoreResponseSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should reject success=false', () => {
		const input = {
			success: false,
			best_score: 2048,
			is_new_best: true,
			games_played: 5
		};
		const result = submit2048ScoreResponseSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject negative best_score', () => {
		const input = {
			success: true,
			best_score: -100,
			is_new_best: true,
			games_played: 5
		};
		const result = submit2048ScoreResponseSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject games_played=0', () => {
		const input = {
			success: true,
			best_score: 2048,
			is_new_best: true,
			games_played: 0
		};
		const result = submit2048ScoreResponseSchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});

describe('get2048ScoreResponseSchema', () => {
	it('should accept valid get score response', () => {
		const input = {
			best_score: 4096,
			games_played: 10,
			tiles_2048_reached: 5,
			tiles_4096_reached: 2
		};
		const result = get2048ScoreResponseSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should accept all zeros (new player)', () => {
		const input = {
			best_score: 0,
			games_played: 0,
			tiles_2048_reached: 0,
			tiles_4096_reached: 0
		};
		const result = get2048ScoreResponseSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should reject negative values', () => {
		const input = {
			best_score: -1,
			games_played: 0,
			tiles_2048_reached: 0,
			tiles_4096_reached: 0
		};
		const result = get2048ScoreResponseSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject missing fields', () => {
		const input = {
			best_score: 1024,
			games_played: 5
			// Missing tiles_2048_reached and tiles_4096_reached
		};
		const result = get2048ScoreResponseSchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});

describe('gameLeaderboardQuerySchema', () => {
	it('accepts valid game + scope + string limit (coerced)', () => {
		expect(
			gameLeaderboardQuerySchema.parse({ game: 'mathemo', scope: 'school', limit: '25' })
		).toEqual({ game: 'mathemo', scope: 'school', limit: 25 });
	});

	it('falls back to first game / class scope / limit 50 when params are absent', () => {
		expect(gameLeaderboardQuerySchema.parse({})).toEqual({
			game: '2048',
			scope: 'class',
			limit: 50
		});
	});

	it('clamps the limit to [1, 200] (never throws)', () => {
		expect(gameLeaderboardQuerySchema.parse({ limit: '500' }).limit).toBe(200);
		expect(gameLeaderboardQuerySchema.parse({ limit: 201 }).limit).toBe(200);
		expect(gameLeaderboardQuerySchema.parse({ limit: '0' }).limit).toBe(1);
		expect(gameLeaderboardQuerySchema.parse({ limit: -5 }).limit).toBe(1);
		expect(gameLeaderboardQuerySchema.parse({ limit: 'abc' }).limit).toBe(50);
		expect(gameLeaderboardQuerySchema.parse({ limit: '25.9' }).limit).toBe(25);
	});

	it('falls back (does NOT throw) on an unknown game — navadra → 2048', () => {
		expect(gameLeaderboardQuerySchema.parse({ game: 'navadra' }).game).toBe('2048');
	});

	it('falls back (does NOT throw) on an unknown scope — global → class', () => {
		expect(gameLeaderboardQuerySchema.parse({ scope: 'global' }).scope).toBe('class');
	});

	it('keeps a valid scope even when the game is invalid (independent fields)', () => {
		expect(gameLeaderboardQuerySchema.parse({ game: 'navadra', scope: 'school' })).toEqual({
			game: '2048',
			scope: 'school',
			limit: 50
		});
	});
});
