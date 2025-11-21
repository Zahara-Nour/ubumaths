/**
 * GET /api/achievements/leaderboard Tests
 * ========================================
 *
 * Tests for the achievement leaderboard endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../leaderboard/+server';
import * as service from '$lib/server/achievements/service';

// Mock dependencies
vi.mock('$lib/server/achievements/service');

describe('GET /api/achievements/leaderboard', () => {
	let mockLocals: { supabase: unknown };
	let mockUrl: URL;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocals = { supabase: {} };
		mockUrl = new URL('http://localhost/api/achievements/leaderboard');
	});

	it('should return leaderboard with default limit', async () => {
		mockUrl.searchParams.set('context', 'minesweeper');

		const mockLeaderboard = [
			{
				studentId: 'student1',
				username: 'Alice',
				avatarUrl: 'avatar1.png',
				totalPoints: 150,
				achievementCount: 5
			},
			{
				studentId: 'student2',
				username: 'Bob',
				avatarUrl: 'avatar2.png',
				totalPoints: 120,
				achievementCount: 4
			}
		];

		vi.mocked(service.getAchievementLeaderboard).mockResolvedValue(mockLeaderboard);

		const response = await GET({ url: mockUrl, locals: mockLocals } as never);
		const data = await response.json();

		expect(service.getAchievementLeaderboard).toHaveBeenCalledWith(
			mockLocals.supabase,
			'minesweeper',
			10
		);
		expect(data).toEqual({
			success: true,
			leaderboard: mockLeaderboard,
			count: 2
		});
	});

	it('should return leaderboard with custom limit', async () => {
		mockUrl.searchParams.set('context', 'questions');
		mockUrl.searchParams.set('limit', '25');

		const mockLeaderboard = Array.from({ length: 25 }, (_, i) => ({
			studentId: `student${i}`,
			username: `User${i}`,
			avatarUrl: null,
			totalPoints: 100 - i,
			achievementCount: 5
		}));

		vi.mocked(service.getAchievementLeaderboard).mockResolvedValue(mockLeaderboard);

		const response = await GET({ url: mockUrl, locals: mockLocals } as never);
		const data = await response.json();

		expect(service.getAchievementLeaderboard).toHaveBeenCalledWith(
			mockLocals.supabase,
			'questions',
			25
		);
		expect(data.count).toBe(25);
	});

	it('should require context parameter', async () => {
		try {
			await GET({ url: mockUrl, locals: mockLocals } as never);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(400);
			expect(error.body.message).toBe('Context parameter is required');
		}
	});

	it('should validate context parameter', async () => {
		mockUrl.searchParams.set('context', 'invalid_context');

		await expect(GET({ url: mockUrl, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should validate limit is integer', async () => {
		mockUrl.searchParams.set('context', 'minesweeper');
		mockUrl.searchParams.set('limit', '10.5');

		await expect(GET({ url: mockUrl, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should reject limit below minimum', async () => {
		mockUrl.searchParams.set('context', 'minesweeper');
		mockUrl.searchParams.set('limit', '0');

		await expect(GET({ url: mockUrl, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should reject limit above maximum', async () => {
		mockUrl.searchParams.set('context', 'minesweeper');
		mockUrl.searchParams.set('limit', '101');

		await expect(GET({ url: mockUrl, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should return empty leaderboard when no data found', async () => {
		mockUrl.searchParams.set('context', 'minesweeper');

		vi.mocked(service.getAchievementLeaderboard).mockResolvedValue([]);

		const response = await GET({ url: mockUrl, locals: mockLocals } as never);
		const data = await response.json();

		expect(data).toEqual({
			success: true,
			leaderboard: [],
			count: 0
		});
	});

	it('should handle service errors gracefully', async () => {
		mockUrl.searchParams.set('context', 'minesweeper');

		vi.mocked(service.getAchievementLeaderboard).mockRejectedValue(
			new service.AchievementServiceError('Database error', 'DATABASE_ERROR')
		);

		await expect(GET({ url: mockUrl, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should work with all valid contexts', async () => {
		const validContexts = [
			'minesweeper',
			'questions',
			'assessments',
			'srs',
			'riddles',
			'social',
			'meta'
		];

		for (const context of validContexts) {
			vi.clearAllMocks();
			mockUrl.searchParams.set('context', context);

			vi.mocked(service.getAchievementLeaderboard).mockResolvedValue([]);

			await GET({ url: mockUrl, locals: mockLocals } as never);

			expect(service.getAchievementLeaderboard).toHaveBeenCalledWith(
				mockLocals.supabase,
				context,
				10
			);
		}
	});
});
