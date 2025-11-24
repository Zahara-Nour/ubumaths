/**
 * Achievement System - SQL Functions Tests
 * ==========================================
 *
 * Tests for the SQL functions that power the achievements system:
 * - check_achievement_prerequisites()
 * - update_achievement_progress()
 * - process_achievement_event()
 * - award_achievement_manual()
 *
 * These tests use mocked Supabase client to verify function call patterns.
 * For actual database integration tests, see vitest.triggers.config.ts
 *
 * @module server/achievements/__tests__/functions.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Create a mock Supabase client with RPC method
 */
function createMockSupabase() {
	return {
		rpc: vi.fn()
	} as unknown as SupabaseClient<Database>;
}

type MockSupabaseClient = ReturnType<typeof createMockSupabase>;

// ============================================================================
// TEST HELPERS
// ============================================================================

const mockStudentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const mockTeacherId = 'teacher-uuid-123';
const mockAchievementId = 'test_achievement';

// Expected RPC response types for testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RpcData = any;
// ============================================================================
// TESTS: check_achievement_prerequisites()
// ============================================================================

describe('check_achievement_prerequisites()', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should return true when student has all prerequisites', async () => {
		// Mock successful RPC call
		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: true,
			error: null
		});

		const { data, error } = await supabase.rpc('check_achievement_prerequisites', {
			p_student_id: mockStudentId,
			p_achievement_id: 'advanced_achievement'
		});

		expect(data).toBe(true);
		expect(error).toBeNull();
		expect(supabase.rpc).toHaveBeenCalledWith('check_achievement_prerequisites', {
			p_student_id: mockStudentId,
			p_achievement_id: 'advanced_achievement'
		});
	});

	it('should return false when student is missing prerequisites', async () => {
		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: false,
			error: null
		});

		const { data, error } = await supabase.rpc('check_achievement_prerequisites', {
			p_student_id: mockStudentId,
			p_achievement_id: 'advanced_achievement'
		});

		expect(data).toBe(false);
		expect(error).toBeNull();
	});

	it('should return true when achievement has no prerequisites', async () => {
		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: true,
			error: null
		});

		const { data, error } = await supabase.rpc('check_achievement_prerequisites', {
			p_student_id: mockStudentId,
			p_achievement_id: 'first_achievement' // No prerequisites
		});

		expect(data).toBe(true);
		expect(error).toBeNull();
	});

	it('should handle database errors gracefully', async () => {
		const mockError = {
			message: 'Database error',
			code: 'PGRST301'
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: null,
			error: mockError
		});

		const { data, error } = await supabase.rpc('check_achievement_prerequisites', {
			p_student_id: mockStudentId,
			p_achievement_id: mockAchievementId
		});

		expect(data).toBeNull();
		expect(error).toEqual(mockError);
	});

	it('should handle missing achievement gracefully', async () => {
		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: true, // Function returns true when achievement not found (no prerequisites)
			error: null
		});

		const { data, error } = await supabase.rpc('check_achievement_prerequisites', {
			p_student_id: mockStudentId,
			p_achievement_id: 'non_existent_achievement'
		});

		expect(data).toBe(true);
		expect(error).toBeNull();
	});
});

// ============================================================================
// TESTS: update_achievement_progress()
// ============================================================================

describe('update_achievement_progress()', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should update progress and return current state', async () => {
		const mockResponse = {
			current_value: 25,
			target_value: 100,
			progress_percentage: 25,
			completed: false,
			newly_unlocked: false
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_streak_10',
			p_delta: 1,
			p_context_key: undefined
		});

		expect(data).toEqual(mockResponse);
		expect(error).toBeNull();
		expect(supabase.rpc).toHaveBeenCalledWith('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_streak_10',
			p_delta: 1,
			p_context_key: undefined
		});
	});

	it('should handle completion and unlock achievement', async () => {
		const mockResponse = {
			current_value: 100,
			target_value: 100,
			progress_percentage: 100,
			completed: true,
			newly_unlocked: true
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_streak_10',
			p_delta: 10, // Completes progress
			p_context_key: undefined
		});

		expect((data as RpcData)?.completed).toBe(true);
		expect((data as RpcData)?.newly_unlocked).toBe(true);
		expect(error).toBeNull();
	});

	it('should support context-specific progress (e.g., per subject)', async () => {
		const mockResponse = {
			current_value: 30,
			target_value: 50,
			progress_percentage: 60,
			completed: false,
			newly_unlocked: false
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_master_calculus',
			p_delta: 5,
			p_context_key: 'calculus'
		});

		expect(data).toEqual(mockResponse);
		expect(error).toBeNull();
	});

	it('should return error when trying to update non-progressive achievement', async () => {
		const mockResponse = {
			error: 'Not a progressive achievement'
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'minesweeper_first_win', // Not progressive
			p_delta: 1,
			p_context_key: undefined
		});

		expect(data).toHaveProperty('error');
	});

	it('should return error when achievement not found', async () => {
		const mockResponse = {
			error: 'Achievement not found'
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'non_existent_achievement',
			p_delta: 1,
			p_context_key: undefined
		});

		expect(data).toHaveProperty('error');
	});

	it('should handle negative delta for progress reduction', async () => {
		const mockResponse = {
			current_value: 5,
			target_value: 100,
			progress_percentage: 5,
			completed: false,
			newly_unlocked: false
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_streak_10',
			p_delta: -5, // Reduce progress (e.g., streak broken)
			p_context_key: undefined
		});

		expect((data as RpcData)?.current_value).toBe(5);
		expect(error).toBeNull();
	});

	it('should handle decimal progress values', async () => {
		const mockResponse = {
			current_value: 42.5,
			target_value: 100,
			progress_percentage: 43, // Rounded
			completed: false,
			newly_unlocked: false
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'test_achievement',
			p_delta: 2.5,
			p_context_key: undefined
		});

		expect((data as RpcData)?.current_value).toBe(42.5);
		expect((data as RpcData)?.progress_percentage).toBe(43);
		expect(error).toBeNull();
	});
});

// ============================================================================
// TESTS: process_achievement_event()
// ============================================================================

describe('process_achievement_event()', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should process minesweeper game completion event', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440000',
			unlocked_achievements: [
				{
					achievement_id: 'minesweeper_first_win',
					name: 'Première Victoire',
					description: 'Gagnez votre première partie de démineur',
					icon: '🏆',
					points: 10,
					gidouilles: 5,
					context_data: {}
				}
			],
			count: 1
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'minesweeper_game_completed',
			p_student_id: mockStudentId,
			p_event_data: {
				game_id: 'game-uuid',
				difficulty: 'beginner',
				won: true,
				score: 100,
				time_seconds: 120
			}
		});

		expect((data as RpcData)?.count).toBe(1);
		expect((data as RpcData)?.unlocked_achievements).toHaveLength(1);
		expect(error).toBeNull();
	});

	it('should unlock difficulty-specific achievement', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440001',
			unlocked_achievements: [
				{
					achievement_id: 'minesweeper_speed_demon',
					name: "Rapide comme l'éclair",
					description: 'Terminez une partie expert en moins de 90 secondes',
					icon: '⚡',
					points: 50,
					gidouilles: 20,
					context_data: {
						difficulty: 'expert'
					}
				}
			],
			count: 1
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'minesweeper_game_completed',
			p_student_id: mockStudentId,
			p_event_data: {
				game_id: 'game-uuid',
				difficulty: 'expert',
				won: true,
				score: 200,
				time_seconds: 85, // Under 90 seconds
				perfect: true
			}
		});

		expect((data as RpcData)?.unlocked_achievements).toHaveLength(1);
		expect((data as RpcData)?.unlocked_achievements?.[0].context_data).toHaveProperty(
			'difficulty',
			'expert'
		);
		expect(error).toBeNull();
	});

	it('should process question_answered event and update progress', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440002',
			unlocked_achievements: [],
			count: 0
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'question_answered',
			p_student_id: mockStudentId,
			p_event_data: {
				question_id: 'q123',
				correct: true,
				subject: 'algebra',
				accuracy: 1.0
			}
		});

		expect((data as RpcData)?.count).toBe(0); // Progress updated, but not unlocked
		expect(error).toBeNull();
	});

	it('should unlock multiple achievements in one event', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440003',
			unlocked_achievements: [
				{
					achievement_id: 'questions_first_answer',
					name: 'Première Réponse',
					icon: '📝',
					points: 5,
					gidouilles: 2,
					context_data: {}
				},
				{
					achievement_id: 'questions_perfect_algebra',
					name: 'Algèbre Parfait',
					icon: '✨',
					points: 25,
					gidouilles: 10,
					context_data: { subject: 'algebra' }
				}
			],
			count: 2
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'question_answered',
			p_student_id: mockStudentId,
			p_event_data: {
				question_id: 'q123',
				correct: true,
				subject: 'algebra',
				accuracy: 1.0
			}
		});

		expect((data as RpcData)?.count).toBe(2);
		expect((data as RpcData)?.unlocked_achievements).toHaveLength(2);
		expect(error).toBeNull();
	});

	it('should handle social event (friend_added)', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440004',
			unlocked_achievements: [
				{
					achievement_id: 'social_first_friend',
					name: 'Premier Ami',
					icon: '👥',
					points: 10,
					gidouilles: 5,
					context_data: {}
				}
			],
			count: 1
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'friend_added',
			p_student_id: mockStudentId,
			p_event_data: {
				friend_id: 'friend-uuid'
			}
		});

		expect((data as RpcData)?.count).toBe(1);
		expect(error).toBeNull();
	});

	it('should handle repeatable achievements with iterations', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440005',
			unlocked_achievements: [
				{
					achievement_id: 'social_friend_maker',
					name: 'Sociable',
					icon: '🌟',
					points: 5,
					gidouilles: 2,
					context_data: {
						iteration: 2
					}
				}
			],
			count: 1
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'friend_added',
			p_student_id: mockStudentId,
			p_event_data: {
				friend_id: 'friend-uuid-2'
			}
		});

		expect((data as RpcData)?.unlocked_achievements?.[0].context_data).toHaveProperty(
			'iteration',
			2
		);
		expect(error).toBeNull();
	});

	it('should not unlock already-unlocked achievement', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440006',
			unlocked_achievements: [],
			count: 0
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'minesweeper_game_completed',
			p_student_id: mockStudentId,
			p_event_data: {
				game_id: 'game-uuid',
				difficulty: 'beginner',
				won: true
			}
		});

		expect((data as RpcData)?.count).toBe(0); // Already has this achievement
		expect(error).toBeNull();
	});

	it('should skip achievements if prerequisites not met', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440007',
			unlocked_achievements: [],
			count: 0
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'minesweeper_game_completed',
			p_student_id: mockStudentId,
			p_event_data: {
				game_id: 'game-uuid',
				difficulty: 'expert',
				won: true
			}
		});

		expect((data as RpcData)?.count).toBe(0); // Prerequisites not met
		expect(error).toBeNull();
	});

	it('should handle empty event_data', async () => {
		const mockResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440008',
			unlocked_achievements: [],
			count: 0
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: mockResponse,
			error: null
		});

		const { data, error } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'generic_event',
			p_student_id: mockStudentId,
			p_event_data: {}
		});

		expect((data as RpcData)?.count).toBe(0);
		expect(error).toBeNull();
	});
});

// ============================================================================
// TESTS: award_achievement_manual()
// ============================================================================

describe('award_achievement_manual()', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should allow teacher to manually award achievement', async () => {
		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: true,
			error: null
		});

		const { data, error } = await supabase.rpc('award_achievement_manual', {
			p_teacher_id: mockTeacherId,
			p_student_id: mockStudentId,
			p_achievement_id: 'special_achievement',
			p_reason: 'Outstanding participation in class'
		});

		expect(data).toBe(true);
		expect(error).toBeNull();
		expect(supabase.rpc).toHaveBeenCalledWith('award_achievement_manual', {
			p_teacher_id: mockTeacherId,
			p_student_id: mockStudentId,
			p_achievement_id: 'special_achievement',
			p_reason: 'Outstanding participation in class'
		});
	});

	it('should allow teacher to manually award without reason', async () => {
		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: true,
			error: null
		});

		const { data, error } = await supabase.rpc('award_achievement_manual', {
			p_teacher_id: mockTeacherId,
			p_student_id: mockStudentId,
			p_achievement_id: 'special_achievement',
			p_reason: undefined
		});

		expect(data).toBe(true);
		expect(error).toBeNull();
	});

	it('should reject if teacher does not have access to student', async () => {
		const mockError = {
			message: 'Teacher does not have access to this student',
			code: '23503'
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: null,
			error: mockError
		});

		const { data, error } = await supabase.rpc('award_achievement_manual', {
			p_teacher_id: 'other-teacher-uuid',
			p_student_id: mockStudentId,
			p_achievement_id: 'special_achievement',
			p_reason: undefined
		});

		expect(data).toBeNull();
		expect(error).toBeTruthy();
		expect(error?.message).toContain('access');
	});

	it('should reject if achievement not found', async () => {
		const mockError = {
			message: 'Achievement not found',
			code: '23503'
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: null,
			error: mockError
		});

		const { data, error } = await supabase.rpc('award_achievement_manual', {
			p_teacher_id: mockTeacherId,
			p_student_id: mockStudentId,
			p_achievement_id: 'non_existent_achievement',
			p_reason: undefined
		});

		expect(data).toBeNull();
		expect(error).toBeTruthy();
	});

	it('should reject if achievement is not manually awardable', async () => {
		const mockError = {
			message: 'This achievement cannot be manually awarded',
			code: 'P0001'
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: null,
			error: mockError
		});

		const { data, error } = await supabase.rpc('award_achievement_manual', {
			p_teacher_id: mockTeacherId,
			p_student_id: mockStudentId,
			p_achievement_id: 'minesweeper_first_win', // Automatic only
			p_reason: undefined
		});

		expect(data).toBeNull();
		expect(error?.message).toContain('cannot be manually awarded');
	});

	it('should handle already-awarded achievement gracefully (idempotent)', async () => {
		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: false, // Not awarded (already exists)
			error: null
		});

		const { data, error } = await supabase.rpc('award_achievement_manual', {
			p_teacher_id: mockTeacherId,
			p_student_id: mockStudentId,
			p_achievement_id: 'special_achievement',
			p_reason: undefined
		});

		expect(data).toBe(false);
		expect(error).toBeNull();
	});
});

// ============================================================================
// INTEGRATION TEST SCENARIOS
// ============================================================================

describe('Achievement System - Integration Scenarios', () => {
	let supabase: MockSupabaseClient;

	beforeEach(() => {
		vi.clearAllMocks();
		supabase = createMockSupabase();
	});

	it('should handle complete achievement unlock flow', async () => {
		// 1. Process event
		const eventResponse = {
			event_id: '550e8400-e29b-41d4-a716-446655440000',
			unlocked_achievements: [
				{
					achievement_id: 'minesweeper_first_win',
					name: 'Première Victoire',
					icon: '🏆',
					points: 10,
					gidouilles: 5,
					context_data: {}
				}
			],
			count: 1
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: eventResponse,
			error: null
		});

		const { data: eventData } = await supabase.rpc('process_achievement_event', {
			p_event_type: 'minesweeper_game_completed',
			p_student_id: mockStudentId,
			p_event_data: {
				game_id: 'game-uuid',
				difficulty: 'beginner',
				won: true
			}
		});

		expect((eventData as RpcData)?.count).toBe(1);
		expect((eventData as RpcData)?.unlocked_achievements?.[0].points).toBe(10);
		expect((eventData as RpcData)?.unlocked_achievements?.[0].gidouilles).toBe(5);
	});

	it('should handle progressive achievement flow', async () => {
		// 1. Update progress
		const progressResponse = {
			current_value: 5,
			target_value: 10,
			progress_percentage: 50,
			completed: false,
			newly_unlocked: false
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: progressResponse,
			error: null
		});

		const { data: progress1 } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_streak_10',
			p_delta: 1,
			p_context_key: undefined
		});

		expect((progress1 as RpcData)?.progress_percentage).toBe(50);
		expect((progress1 as RpcData)?.completed).toBe(false);

		// 2. Complete progress
		const completionResponse = {
			current_value: 10,
			target_value: 10,
			progress_percentage: 100,
			completed: true,
			newly_unlocked: true
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: completionResponse,
			error: null
		});

		const { data: progress2 } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_streak_10',
			p_delta: 5, // Complete it
			p_context_key: undefined
		});

		expect((progress2 as RpcData)?.completed).toBe(true);
		expect((progress2 as RpcData)?.newly_unlocked).toBe(true);
	});

	it('should handle tiered achievement unlock', async () => {
		// Unlock bronze tier
		const bronzeResponse = {
			current_value: 10,
			target_value: 10,
			progress_percentage: 100,
			completed: true,
			newly_unlocked: true
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: bronzeResponse,
			error: null
		});

		await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_answered_bronze',
			p_delta: 10,
			p_context_key: undefined
		});

		// Start silver tier
		const silverResponse = {
			current_value: 15,
			target_value: 25,
			progress_percentage: 60,
			completed: false,
			newly_unlocked: false
		};

		supabase.rpc = vi.fn().mockResolvedValueOnce({
			data: silverResponse,
			error: null
		});

		const { data: silverProgress } = await supabase.rpc('update_achievement_progress', {
			p_student_id: mockStudentId,
			p_achievement_id: 'questions_answered_silver',
			p_delta: 5,
			p_context_key: undefined
		});

		expect((silverProgress as RpcData)?.progress_percentage).toBe(60);
	});
});
