/**
 * Unit tests for games validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	submit2048ScoreSchema,
	leaderboard2048QuerySchema,
	submit2048ScoreResponseSchema,
	get2048ScoreResponseSchema,
	leaderboardEntrySchema,
	leaderboard2048ResponseSchema
} from './games';

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

describe('leaderboard2048QuerySchema', () => {
	it('should use default limit when not provided', () => {
		const input = {};
		const result = leaderboard2048QuerySchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(10);
		}
	});

	it('should accept valid limit', () => {
		const input = { limit: '25' };
		const result = leaderboard2048QuerySchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(25);
		}
	});

	it('should accept minimum limit (1)', () => {
		const input = { limit: '1' };
		const result = leaderboard2048QuerySchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(1);
		}
	});

	it('should accept maximum limit (100)', () => {
		const input = { limit: '100' };
		const result = leaderboard2048QuerySchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(100);
		}
	});

	it('should fallback to default for limit < 1', () => {
		const input = { limit: '0' };
		const result = leaderboard2048QuerySchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(10);
		}
	});

	it('should fallback to default for limit > 100', () => {
		const input = { limit: '200' };
		const result = leaderboard2048QuerySchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(10);
		}
	});

	it('should fallback to default for invalid limit string', () => {
		const input = { limit: 'invalid' };
		const result = leaderboard2048QuerySchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.limit).toBe(10);
		}
	});

	it('should convert string to number', () => {
		const input = { limit: '50' };
		const result = leaderboard2048QuerySchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(typeof result.data.limit).toBe('number');
			expect(result.data.limit).toBe(50);
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

describe('leaderboardEntrySchema', () => {
	it('should accept valid leaderboard entry', () => {
		const input = {
			rank: 1,
			user_id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test User',
			avatar_url: 'https://example.com/avatar.jpg',
			best_score: 8192,
			games_played: 20,
			tiles_2048_reached: 10,
			tiles_4096_reached: 3
		};
		const result = leaderboardEntrySchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should accept null avatar_url', () => {
		const input = {
			rank: 1,
			user_id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test User',
			avatar_url: null,
			best_score: 8192,
			games_played: 20,
			tiles_2048_reached: 10,
			tiles_4096_reached: 3
		};
		const result = leaderboardEntrySchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should reject rank=0', () => {
		const input = {
			rank: 0,
			user_id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test User',
			avatar_url: null,
			best_score: 8192,
			games_played: 20,
			tiles_2048_reached: 10,
			tiles_4096_reached: 3
		};
		const result = leaderboardEntrySchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject invalid user_id', () => {
		const input = {
			rank: 1,
			user_id: 'not-a-uuid',
			name: 'Test User',
			avatar_url: null,
			best_score: 8192,
			games_played: 20,
			tiles_2048_reached: 10,
			tiles_4096_reached: 3
		};
		const result = leaderboardEntrySchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject invalid avatar_url', () => {
		const input = {
			rank: 1,
			user_id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test User',
			avatar_url: 'not-a-url',
			best_score: 8192,
			games_played: 20,
			tiles_2048_reached: 10,
			tiles_4096_reached: 3
		};
		const result = leaderboardEntrySchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject negative games_played', () => {
		const input = {
			rank: 1,
			user_id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test User',
			avatar_url: null,
			best_score: 8192,
			games_played: -5,
			tiles_2048_reached: 10,
			tiles_4096_reached: 3
		};
		const result = leaderboardEntrySchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});

describe('leaderboard2048ResponseSchema', () => {
	it('should accept valid leaderboard response', () => {
		const input = {
			leaderboard: [
				{
					rank: 1,
					user_id: '123e4567-e89b-12d3-a456-426614174000',
					name: 'Player 1',
					avatar_url: null,
					best_score: 8192,
					games_played: 10,
					tiles_2048_reached: 5,
					tiles_4096_reached: 2
				},
				{
					rank: 2,
					user_id: '123e4567-e89b-12d3-a456-426614174001',
					name: 'Player 2',
					avatar_url: null,
					best_score: 4096,
					games_played: 8,
					tiles_2048_reached: 3,
					tiles_4096_reached: 1
				}
			],
			user_rank: 5
		};
		const result = leaderboard2048ResponseSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should accept empty leaderboard', () => {
		const input = {
			leaderboard: [],
			user_rank: null
		};
		const result = leaderboard2048ResponseSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should accept null user_rank', () => {
		const input = {
			leaderboard: [
				{
					rank: 1,
					user_id: '123e4567-e89b-12d3-a456-426614174000',
					name: 'Player 1',
					avatar_url: null,
					best_score: 8192,
					games_played: 10,
					tiles_2048_reached: 5,
					tiles_4096_reached: 2
				}
			],
			user_rank: null
		};
		const result = leaderboard2048ResponseSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('should reject user_rank=0', () => {
		const input = {
			leaderboard: [],
			user_rank: 0
		};
		const result = leaderboard2048ResponseSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject invalid leaderboard entry', () => {
		const input = {
			leaderboard: [
				{
					rank: 1,
					user_id: 'invalid-uuid',
					name: 'Player 1',
					avatar_url: null,
					best_score: 8192,
					games_played: 10,
					tiles_2048_reached: 5,
					tiles_4096_reached: 2
				}
			],
			user_rank: null
		};
		const result = leaderboard2048ResponseSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('should reject missing leaderboard field', () => {
		const input = {
			user_rank: 5
		};
		const result = leaderboard2048ResponseSchema.safeParse(input);
		expect(result.success).toBe(false);
	});
});
