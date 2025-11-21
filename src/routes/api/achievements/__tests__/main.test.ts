/**
 * GET /api/achievements Tests
 * ============================
 *
 * Tests for the achievements list endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';
import * as service from '$lib/server/achievements/service';

// Mock the service layer
vi.mock('$lib/server/achievements/service');

describe('GET /api/achievements', () => {
	let mockLocals: { supabase: unknown };
	let mockUrl: URL;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocals = { supabase: {} };
		mockUrl = new URL('http://localhost/api/achievements');
	});

	it('should return all achievements when no context provided', async () => {
		const mockAchievements = [
			{
				id: 'test_achievement',
				name: 'Test Achievement',
				context: 'minesweeper'
			}
		];

		vi.mocked(service.getAchievementsByContext).mockResolvedValue(mockAchievements as never);

		const response = await GET({ url: mockUrl, locals: mockLocals } as never);
		const data = await response.json();

		expect(service.getAchievementsByContext).toHaveBeenCalledWith(mockLocals.supabase, undefined);
		expect(data).toEqual({
			success: true,
			achievements: mockAchievements,
			count: 1
		});
	});

	it('should return achievements filtered by context', async () => {
		mockUrl.searchParams.set('context', 'minesweeper');

		const mockAchievements = [
			{
				id: 'minesweeper_first_win',
				name: 'Première Victoire',
				context: 'minesweeper'
			}
		];

		vi.mocked(service.getAchievementsByContext).mockResolvedValue(mockAchievements as never);

		const response = await GET({ url: mockUrl, locals: mockLocals } as never);
		const data = await response.json();

		expect(service.getAchievementsByContext).toHaveBeenCalledWith(
			mockLocals.supabase,
			'minesweeper'
		);
		expect(data.achievements).toEqual(mockAchievements);
	});

	it('should return empty array when no achievements found', async () => {
		vi.mocked(service.getAchievementsByContext).mockResolvedValue([]);

		const response = await GET({ url: mockUrl, locals: mockLocals } as never);
		const data = await response.json();

		expect(data).toEqual({
			success: true,
			achievements: [],
			count: 0
		});
	});

	it('should reject invalid context parameter', async () => {
		mockUrl.searchParams.set('context', 'invalid_context');

		await expect(GET({ url: mockUrl, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should handle service errors gracefully', async () => {
		vi.mocked(service.getAchievementsByContext).mockRejectedValue(
			new service.AchievementServiceError('Database error', 'DATABASE_ERROR')
		);

		await expect(GET({ url: mockUrl, locals: mockLocals } as never)).rejects.toThrow();
	});
});
