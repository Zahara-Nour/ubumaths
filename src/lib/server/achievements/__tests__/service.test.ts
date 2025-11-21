/**
 * Achievement Service Layer Tests
 * ================================
 *
 * Comprehensive test suite for the achievement service layer.
 * Tests all 6 service functions with happy paths, error cases, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	getAchievementsByContext,
	getStudentAchievements,
	getStudentProgress,
	processEvent,
	awardAchievement,
	getAchievementLeaderboard,
	AchievementServiceError
} from '../service';
import type { Achievement } from '$lib/types/achievements';

// ============================================================================
// MOCKS AND FIXTURES
// ============================================================================

// Mock Supabase client
const createMockSupabase = () => {
	return {
		from: vi.fn(),
		rpc: vi.fn()
	} as unknown as SupabaseClient<Database>;
};

// Sample achievement fixture
const mockAchievement: Achievement = {
	id: 'minesweeper_first_win',
	context: 'minesweeper',
	category: 'milestone',
	name: 'Première Victoire',
	description: 'Gagnez votre première partie de démineur',
	icon: '🏆',
	unlock_type: 'automatic',
	metadata: {
		points: 10,
		gidouilles_reward: 5,
		rarity: 'common'
	},
	is_active: true,
	display_order: 1,
	created_at: '2025-01-01T00:00:00Z',
	updated_at: '2025-01-01T00:00:00Z'
};

// Sample student achievement fixture
const mockStudentAchievement = {
	id: '123e4567-e89b-12d3-a456-426614174000',
	student_id: '123e4567-e89b-12d3-a456-426614174001',
	achievement_id: 'minesweeper_first_win',
	context_data: { difficulty: 'beginner' },
	unlocked_at: '2025-01-01T00:00:00Z',
	unlocked_by: null,
	unlock_reason: 'Event: minesweeper_game_completed',
	points_awarded: 10,
	gidouilles_awarded: 5
};

// Sample progress fixture
const mockProgress = {
	id: '123e4567-e89b-12d3-a456-426614174002',
	student_id: '123e4567-e89b-12d3-a456-426614174001',
	achievement_id: 'questions_master_calculus',
	current_value: 73,
	target_value: 100,
	progress_percentage: 73,
	context_key: 'calculus',
	is_active: true,
	started_at: '2025-01-01T00:00:00Z',
	updated_at: '2025-01-01T00:00:00Z',
	completed_at: null
};

// ============================================================================
// TEST SUITE: getAchievementsByContext
// ============================================================================

describe('getAchievementsByContext', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should fetch all achievements when no context provided', async () => {
		const mockData = [mockAchievement];
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: mockData, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getAchievementsByContext(mockSupabase);

		expect(mockSupabase.from).toHaveBeenCalledWith('achievements');
		expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
		expect(result).toEqual(mockData);
	});

	it('should fetch achievements filtered by context', async () => {
		const mockData = [mockAchievement];

		// Create a mock query builder that returns a Promise with then() method
		const createMockPromise = () => {
			const promise = Promise.resolve({ data: mockData, error: null });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(promise as any).eq = vi.fn().mockReturnValue(promise);
			return promise;
		};

		const mockSelect = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnValue(createMockPromise())
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockSelect) });

		const result = await getAchievementsByContext(mockSupabase, 'minesweeper');

		expect(mockSelect.eq).toHaveBeenCalledWith('is_active', true);
		expect(result).toEqual(mockData);
	});

	it('should return empty array when no achievements found', async () => {
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: [], error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getAchievementsByContext(mockSupabase);

		expect(result).toEqual([]);
	});

	it('should throw AchievementServiceError on database error', async () => {
		const mockError = { message: 'Database error' };
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: null, error: mockError })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		await expect(getAchievementsByContext(mockSupabase)).rejects.toThrow(AchievementServiceError);
		await expect(getAchievementsByContext(mockSupabase)).rejects.toThrow(
			'Failed to fetch achievements'
		);
	});

	it('should handle null data response', async () => {
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getAchievementsByContext(mockSupabase);

		expect(result).toEqual([]);
	});
});

// ============================================================================
// TEST SUITE: getStudentAchievements
// ============================================================================

describe('getStudentAchievements', () => {
	let mockSupabase: SupabaseClient<Database>;
	const studentId = '123e4567-e89b-12d3-a456-426614174001';

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should fetch all student achievements', async () => {
		const mockData = [mockStudentAchievement];
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: mockData, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getStudentAchievements(mockSupabase, studentId);

		expect(mockSupabase.from).toHaveBeenCalledWith('student_achievements');
		expect(mockQuery.eq).toHaveBeenCalledWith('student_id', studentId);
		expect(result).toEqual(mockData);
	});

	it('should fetch student achievements filtered by context', async () => {
		const mockData = [mockStudentAchievement];

		// Create a mock query builder that returns a Promise with then() method
		const createMockPromise = () => {
			const promise = Promise.resolve({ data: mockData, error: null });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(promise as any).eq = vi.fn().mockReturnValue(promise);
			return promise;
		};

		const mockSelect = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnValue(createMockPromise())
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockSelect) });

		const result = await getStudentAchievements(mockSupabase, studentId, 'minesweeper');

		expect(mockSelect.eq).toHaveBeenCalledWith('student_id', studentId);
		expect(result).toEqual(mockData);
	});

	it('should return empty array when no achievements found', async () => {
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: [], error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getStudentAchievements(mockSupabase, studentId);

		expect(result).toEqual([]);
	});

	it('should throw AchievementServiceError on database error', async () => {
		const mockError = { message: 'Database error' };
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: null, error: mockError })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		await expect(getStudentAchievements(mockSupabase, studentId)).rejects.toThrow(
			AchievementServiceError
		);
	});
});

// ============================================================================
// TEST SUITE: getStudentProgress
// ============================================================================

describe('getStudentProgress', () => {
	let mockSupabase: SupabaseClient<Database>;
	const studentId = '123e4567-e89b-12d3-a456-426614174001';
	const achievementId = 'questions_master_calculus';

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should fetch student progress for an achievement', async () => {
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({ data: mockProgress, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getStudentProgress(mockSupabase, studentId, achievementId);

		expect(mockSupabase.from).toHaveBeenCalledWith('achievement_progress');
		expect(mockQuery.eq).toHaveBeenCalledWith('student_id', studentId);
		expect(mockQuery.eq).toHaveBeenCalledWith('achievement_id', achievementId);
		expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
		expect(result).toEqual(mockProgress);
	});

	it('should return null when no progress found', async () => {
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getStudentProgress(mockSupabase, studentId, achievementId);

		expect(result).toBeNull();
	});

	it('should throw AchievementServiceError on database error', async () => {
		const mockError = { message: 'Database error' };
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({ data: null, error: mockError })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		await expect(getStudentProgress(mockSupabase, studentId, achievementId)).rejects.toThrow(
			AchievementServiceError
		);
	});
});

// ============================================================================
// TEST SUITE: processEvent
// ============================================================================

describe('processEvent', () => {
	let mockSupabase: SupabaseClient<Database>;
	const studentId = '123e4567-e89b-12d3-a456-426614174001';

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should process event and return unlocked achievements', async () => {
		const mockResult = {
			event_id: '123e4567-e89b-12d3-a456-426614174003',
			unlocked_achievements: [
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

		(mockSupabase.rpc as Mock).mockResolvedValue({ data: mockResult, error: null });

		const result = await processEvent(mockSupabase, 'minesweeper_game_completed', studentId, {
			game_id: 'uuid',
			difficulty: 'beginner'
		});

		expect(mockSupabase.rpc).toHaveBeenCalledWith('process_achievement_event', {
			p_event_type: 'minesweeper_game_completed',
			p_student_id: studentId,
			p_event_data: { game_id: 'uuid', difficulty: 'beginner' }
		});
		expect(result.eventId).toBe(mockResult.event_id);
		expect(result.unlockedAchievements).toHaveLength(1);
		expect(result.count).toBe(1);
	});

	it('should handle empty unlocked achievements array', async () => {
		const mockResult = {
			event_id: '123e4567-e89b-12d3-a456-426614174003',
			unlocked_achievements: [],
			count: 0
		};

		(mockSupabase.rpc as Mock).mockResolvedValue({ data: mockResult, error: null });

		const result = await processEvent(mockSupabase, 'minesweeper_game_completed', studentId, {});

		expect(result.unlockedAchievements).toEqual([]);
		expect(result.count).toBe(0);
	});

	it('should throw AchievementServiceError on RPC error', async () => {
		const mockError = { message: 'RPC error' };
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: mockError });

		await expect(
			processEvent(mockSupabase, 'minesweeper_game_completed', studentId, {})
		).rejects.toThrow(AchievementServiceError);
		await expect(
			processEvent(mockSupabase, 'minesweeper_game_completed', studentId, {})
		).rejects.toThrow('Failed to process achievement event');
	});

	it('should throw error when no data returned', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

		await expect(
			processEvent(mockSupabase, 'minesweeper_game_completed', studentId, {})
		).rejects.toThrow(AchievementServiceError);
		await expect(
			processEvent(mockSupabase, 'minesweeper_game_completed', studentId, {})
		).rejects.toThrow('No data returned from event processing');
	});
});

// ============================================================================
// TEST SUITE: awardAchievement
// ============================================================================

describe('awardAchievement', () => {
	let mockSupabase: SupabaseClient<Database>;
	const teacherId = '123e4567-e89b-12d3-a456-426614174000';
	const studentId = '123e4567-e89b-12d3-a456-426614174001';
	const achievementId = 'social_helpful_peer';

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should successfully award achievement', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: true, error: null });

		const result = await awardAchievement(
			mockSupabase,
			teacherId,
			studentId,
			achievementId,
			'Excellent work'
		);

		expect(mockSupabase.rpc).toHaveBeenCalledWith('award_achievement_manual', {
			p_teacher_id: teacherId,
			p_student_id: studentId,
			p_achievement_id: achievementId,
			p_reason: 'Excellent work'
		});
		expect(result).toBe(true);
	});

	it('should handle null reason by passing null to RPC', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: true, error: null });

		await awardAchievement(mockSupabase, teacherId, studentId, achievementId);

		expect(mockSupabase.rpc).toHaveBeenCalledWith('award_achievement_manual', {
			p_teacher_id: teacherId,
			p_student_id: studentId,
			p_achievement_id: achievementId,
			p_reason: null
		});
	});

	it('should return false when RPC returns false', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: false, error: null });

		const result = await awardAchievement(mockSupabase, teacherId, studentId, achievementId);

		expect(result).toBe(false);
	});

	it('should throw AchievementServiceError on RPC error', async () => {
		const mockError = { message: 'Teacher does not have access to this student' };
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: mockError });

		await expect(
			awardAchievement(mockSupabase, teacherId, studentId, achievementId)
		).rejects.toThrow(AchievementServiceError);
		await expect(
			awardAchievement(mockSupabase, teacherId, studentId, achievementId)
		).rejects.toThrow('Failed to award achievement');
	});
});

// ============================================================================
// TEST SUITE: getAchievementLeaderboard
// ============================================================================

describe('getAchievementLeaderboard', () => {
	let mockSupabase: SupabaseClient<Database>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
	});

	it('should fetch leaderboard with correct aggregation', async () => {
		const mockData = [
			{
				student_id: 'student1',
				points_awarded: 50,
				profiles: { username: 'Alice', avatar_url: 'avatar1.png' },
				achievements: { context: 'minesweeper' }
			},
			{
				student_id: 'student1',
				points_awarded: 30,
				profiles: { username: 'Alice', avatar_url: 'avatar1.png' },
				achievements: { context: 'minesweeper' }
			},
			{
				student_id: 'student2',
				points_awarded: 60,
				profiles: { username: 'Bob', avatar_url: 'avatar2.png' },
				achievements: { context: 'minesweeper' }
			}
		];

		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockResolvedValue({ data: mockData, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getAchievementLeaderboard(mockSupabase, 'minesweeper', 10);

		expect(result).toHaveLength(2);
		expect(result[0].studentId).toBe('student1');
		expect(result[0].totalPoints).toBe(80); // 50 + 30
		expect(result[0].achievementCount).toBe(2);
		expect(result[1].studentId).toBe('student2');
		expect(result[1].totalPoints).toBe(60);
		expect(result[1].achievementCount).toBe(1);
	});

	it('should sort leaderboard by total points descending', async () => {
		const mockData = [
			{
				student_id: 'student1',
				points_awarded: 30,
				profiles: { username: 'Alice', avatar_url: null },
				achievements: { context: 'minesweeper' }
			},
			{
				student_id: 'student2',
				points_awarded: 100,
				profiles: { username: 'Bob', avatar_url: null },
				achievements: { context: 'minesweeper' }
			}
		];

		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockResolvedValue({ data: mockData, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getAchievementLeaderboard(mockSupabase, 'minesweeper', 10);

		expect(result[0].studentId).toBe('student2'); // Higher points first
		expect(result[0].totalPoints).toBe(100);
		expect(result[1].studentId).toBe('student1');
		expect(result[1].totalPoints).toBe(30);
	});

	it('should respect limit parameter', async () => {
		const mockData = Array.from({ length: 20 }, (_, i) => ({
			student_id: `student${i}`,
			points_awarded: 10,
			profiles: { username: `User${i}`, avatar_url: null },
			achievements: { context: 'minesweeper' }
		}));

		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockResolvedValue({ data: mockData, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getAchievementLeaderboard(mockSupabase, 'minesweeper', 5);

		expect(result).toHaveLength(5);
	});

	it('should return empty array when no data found', async () => {
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockResolvedValue({ data: [], error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getAchievementLeaderboard(mockSupabase, 'minesweeper', 10);

		expect(result).toEqual([]);
	});

	it('should handle profiles as array response', async () => {
		const mockData = [
			{
				student_id: 'student1',
				points_awarded: 50,
				profiles: [{ username: 'Alice', avatar_url: 'avatar.png' }],
				achievements: { context: 'minesweeper' }
			}
		];

		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockResolvedValue({ data: mockData, error: null })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		const result = await getAchievementLeaderboard(mockSupabase, 'minesweeper', 10);

		expect(result[0].username).toBe('Alice');
		expect(result[0].avatarUrl).toBe('avatar.png');
	});

	it('should throw AchievementServiceError on database error', async () => {
		const mockError = { message: 'Database error' };
		const mockQuery = {
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockResolvedValue({ data: null, error: mockError })
		};

		(mockSupabase.from as Mock).mockReturnValue({ select: vi.fn().mockReturnValue(mockQuery) });

		await expect(getAchievementLeaderboard(mockSupabase, 'minesweeper', 10)).rejects.toThrow(
			AchievementServiceError
		);
	});
});
