/**
 * POST /api/achievements/events Tests
 * ====================================
 *
 * Tests for the achievement event processing endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../events/+server';
import * as service from '$lib/server/achievements/service';

// Mock dependencies
vi.mock('$lib/server/achievements/service');

describe('POST /api/achievements/events', () => {
	let mockLocals: { supabase: unknown; user?: { id: string } };
	let mockRequest: Request;

	// Use same ID so authorization passes (student submitting for themselves)
	const userId = '123e4567-e89b-12d3-a456-426614174000';
	const studentId = userId; // Same as userId for authorization

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocals = { supabase: {}, user: { id: userId } };
	});

	it('should process event and return unlocked achievements', async () => {
		const requestBody = {
			eventType: 'minesweeper_game_completed',
			studentId,
			eventData: {
				game_id: 'uuid',
				difficulty: 'expert',
				score: 150
			}
		};

		mockRequest = new Request('http://localhost/api/achievements/events', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		const mockResult = {
			eventId: 'event-uuid',
			unlockedAchievements: [
				{
					achievement_id: 'minesweeper_first_win',
					name: 'Première Victoire',
					icon: '🏆',
					points: 10,
					gidouilles: 5
				}
			],
			count: 1
		};

		vi.mocked(service.processEvent).mockResolvedValue(mockResult);

		const response = await POST({ request: mockRequest, locals: mockLocals } as never);
		const data = await response.json();

		expect(service.processEvent).toHaveBeenCalledWith(
			mockLocals.supabase,
			'minesweeper_game_completed',
			studentId,
			requestBody.eventData
		);
		expect(data).toEqual({
			success: true,
			eventId: mockResult.eventId,
			unlockedAchievements: mockResult.unlockedAchievements,
			count: 1
		});
	});

	it('should handle empty unlocked achievements', async () => {
		const requestBody = {
			eventType: 'minesweeper_game_completed',
			studentId,
			eventData: { game_id: 'uuid' }
		};

		mockRequest = new Request('http://localhost/api/achievements/events', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		const mockResult = {
			eventId: 'event-uuid',
			unlockedAchievements: [],
			count: 0
		};

		vi.mocked(service.processEvent).mockResolvedValue(mockResult);

		const response = await POST({ request: mockRequest, locals: mockLocals } as never);
		const data = await response.json();

		expect(data.count).toBe(0);
		expect(data.unlockedAchievements).toEqual([]);
	});

	it('should require authentication', async () => {
		mockLocals.user = undefined;
		mockRequest = new Request('http://localhost/api/achievements/events', {
			method: 'POST',
			body: JSON.stringify({})
		});

		try {
			await POST({ request: mockRequest, locals: mockLocals } as never);
			expect.fail('Should have thrown an error');
		} catch (err: unknown) {
			const error = err as { status: number; body: { message: string } };
			expect(error.status).toBe(401);
			expect(error.body.message).toBe('Authentication required');
		}
	});

	it('should validate event type', async () => {
		const requestBody = {
			eventType: 'invalid_event_type',
			studentId,
			eventData: {}
		};

		mockRequest = new Request('http://localhost/api/achievements/events', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		await expect(POST({ request: mockRequest, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should validate student ID format', async () => {
		const requestBody = {
			eventType: 'minesweeper_game_completed',
			studentId: 'invalid-uuid',
			eventData: {}
		};

		mockRequest = new Request('http://localhost/api/achievements/events', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		await expect(POST({ request: mockRequest, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should handle missing eventData gracefully', async () => {
		const requestBody = {
			eventType: 'minesweeper_game_completed',
			studentId
			// eventData is optional
		};

		mockRequest = new Request('http://localhost/api/achievements/events', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		const mockResult = {
			eventId: 'event-uuid',
			unlockedAchievements: [],
			count: 0
		};

		vi.mocked(service.processEvent).mockResolvedValue(mockResult);

		const response = await POST({ request: mockRequest, locals: mockLocals } as never);
		const data = await response.json();

		expect(service.processEvent).toHaveBeenCalledWith(
			mockLocals.supabase,
			'minesweeper_game_completed',
			studentId,
			{}
		);
		expect(data.success).toBe(true);
	});

	it('should handle service errors gracefully', async () => {
		const requestBody = {
			eventType: 'minesweeper_game_completed',
			studentId,
			eventData: {}
		};

		mockRequest = new Request('http://localhost/api/achievements/events', {
			method: 'POST',
			body: JSON.stringify(requestBody)
		});

		vi.mocked(service.processEvent).mockRejectedValue(
			new service.AchievementServiceError('RPC error', 'RPC_ERROR')
		);

		await expect(POST({ request: mockRequest, locals: mockLocals } as never)).rejects.toThrow();
	});

	it('should reject invalid JSON body', async () => {
		mockRequest = new Request('http://localhost/api/achievements/events', {
			method: 'POST',
			body: 'invalid json'
		});

		await expect(POST({ request: mockRequest, locals: mockLocals } as never)).rejects.toThrow();
	});
});
