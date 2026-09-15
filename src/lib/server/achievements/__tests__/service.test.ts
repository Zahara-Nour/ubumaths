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
			p_student_id: studentId,
			p_achievement_id: achievementId,
			p_reason: 'Excellent work'
		});
		expect(result).toBe(true);
	});

	it('should omit reason (undefined) so the RPC applies its SQL NULL default', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: true, error: null });

		await awardAchievement(mockSupabase, teacherId, studentId, achievementId);

		// service.ts passes `reason ?? undefined`: an undefined field is dropped
		// from the JSON-RPC payload, letting the SQL default (NULL) apply.
		expect(mockSupabase.rpc).toHaveBeenCalledWith('award_achievement_manual', {
			p_student_id: studentId,
			p_achievement_id: achievementId,
			p_reason: undefined
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

	/**
	 * ⚠️ Ces cas éprouvaient une agrégation EN MÉMOIRE qui n'existe plus.
	 *
	 * La fonction faisait `profiles!inner (...)` avec le client de l'utilisateur,
	 * donc sous RLS — et une jointure INTERNE supprime la LIGNE ENTIÈRE quand le
	 * profil est masqué. Depuis que la lecture des profils est bornée, le
	 * classement se serait réduit à soi, ses camarades et ses amis, avec des
	 * rangs et des totaux faux, sans erreur ni log.
	 *
	 * Le RPC `get_achievement_leaderboard` est SECURITY DEFINER : il voit tout
	 * le monde, agrège et trie côté serveur, et ne rend qu'un nom pseudonymisé.
	 * Il n'y a donc plus rien à agréger ici — seulement à transposer.
	 */
	const ligneRpc = (
		rank: number,
		student_id: string,
		student_name: string,
		total_points: number,
		achievement_count: number,
		avatar_url: string | null = null
	) => ({ rank, student_id, student_name, avatar_url, total_points, achievement_count });

	it('transpose les lignes du RPC', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: [ligneRpc(1, 'student2', 'Bob D.', 100, 3, 'avatar.png')],
			error: null
		});

		const result = await getAchievementLeaderboard(mockSupabase, 'minesweeper', 10);

		expect(result).toEqual([
			{
				studentId: 'student2',
				username: 'Bob D.',
				avatarUrl: 'avatar.png',
				totalPoints: 100,
				achievementCount: 3
			}
		]);
	});

	/**
	 * ⚠️ Le contexte et la limite doivent ARRIVER au RPC : c'est lui qui trie et
	 * borne désormais. Les passer à côté rendrait un classement global là où on
	 * en demande un par contexte, sans que rien ne le signale.
	 */
	it('transmet le contexte et la limite au RPC', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: [], error: null });

		await getAchievementLeaderboard(mockSupabase, 'minesweeper', 5);

		expect(mockSupabase.rpc).toHaveBeenCalledWith('get_achievement_leaderboard', {
			p_context: 'minesweeper',
			p_limit: 5
		});
	});

	/**
	 * Le RPC rend des `bigint`, que PostgREST sérialise parfois en chaîne. Sans
	 * la conversion, un tri ou une somme côté client comparerait du texte.
	 */
	it('convertit les compteurs en nombres', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: [
				{ ...ligneRpc(1, 's1', 'Alice D.', 0, 0), total_points: '42', achievement_count: '7' }
			],
			error: null
		});

		const result = await getAchievementLeaderboard(mockSupabase, 'minesweeper', 10);

		expect(result[0].totalPoints).toBe(42);
		expect(result[0].achievementCount).toBe(7);
	});

	it('rend un tableau vide quand le RPC ne rend rien', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: [], error: null });

		expect(await getAchievementLeaderboard(mockSupabase, 'minesweeper', 10)).toEqual([]);
	});

	it('rend un tableau vide quand le RPC rend null', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({ data: null, error: null });

		expect(await getAchievementLeaderboard(mockSupabase, 'minesweeper', 10)).toEqual([]);
	});

	/** Une panne ne doit pas se lire « classement vide ». */
	it('remonte une erreur du RPC', async () => {
		(mockSupabase.rpc as Mock).mockResolvedValue({
			data: null,
			error: { message: 'boom' }
		});

		await expect(getAchievementLeaderboard(mockSupabase, 'minesweeper', 10)).rejects.toThrow(
			AchievementServiceError
		);
	});
});
