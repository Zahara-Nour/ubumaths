import { describe, it, expect } from 'vitest';
import {
	minesweeperAdapter,
	convertUnlockedAchievementsToLegacy,
	type LegacyMinesweeperAchievement,
	type LegacyMinesweeperStudentAchievement
} from '../minesweeper';
import type {
	Achievement,
	StudentAchievement,
	UnlockedAchievementResponse
} from '$lib/types/achievements';

describe('Minesweeper Adapter', () => {
	describe('ID prefix handling', () => {
		it('should add minesweeper_ prefix', () => {
			expect(minesweeperAdapter.addMinesweeperPrefix('first_victory')).toBe(
				'minesweeper_first_victory'
			);
		});

		it('should not double-prefix', () => {
			expect(minesweeperAdapter.addMinesweeperPrefix('minesweeper_first_victory')).toBe(
				'minesweeper_first_victory'
			);
		});

		it('should remove minesweeper_ prefix', () => {
			expect(minesweeperAdapter.removeMinesweeperPrefix('minesweeper_first_victory')).toBe(
				'first_victory'
			);
		});

		it('should handle IDs without prefix when removing', () => {
			expect(minesweeperAdapter.removeMinesweeperPrefix('first_victory')).toBe('first_victory');
		});
	});

	describe('toUniversal', () => {
		it('should convert legacy achievement to universal format', () => {
			const legacy: LegacyMinesweeperAchievement = {
				id: 'first_victory',
				name: 'Premier pas',
				description: 'Remporte ta première victoire',
				icon: '🎯',
				difficulty_specific: false,
				unlock_condition: 'Win first game',
				created_at: '2025-11-21T00:00:00Z'
			};

			const result = minesweeperAdapter.toUniversal(legacy);

			expect(result.id).toBe('minesweeper_first_victory');
			expect(result.context).toBe('minesweeper');
			expect(result.category).toBe('milestone');
			expect(result.name).toBe('Premier pas');
			expect(result.description).toBe('Remporte ta première victoire');
			expect(result.icon).toBe('🎯');
			expect(result.unlock_type).toBe('event_based');
			expect(result.metadata.difficulty_specific).toBe(false);
			expect(result.metadata.points).toBe(10);
			expect(result.metadata.rarity).toBe('common');
			expect(result.metadata.unlock_conditions?.type).toBe('minesweeper_game_completed');
			expect(result.is_active).toBe(true);
			expect(result.created_at).toBe('2025-11-21T00:00:00Z');
		});

		it('should map different achievement types correctly', () => {
			const testCases: Array<{
				id: string;
				expectedCategory: string;
				expectedPoints: number;
				expectedRarity: string;
			}> = [
				{
					id: 'first_victory',
					expectedCategory: 'milestone',
					expectedPoints: 10,
					expectedRarity: 'common'
				},
				{
					id: 'no_flags',
					expectedCategory: 'mastery',
					expectedPoints: 15,
					expectedRarity: 'uncommon'
				},
				{
					id: 'perfectionist',
					expectedCategory: 'mastery',
					expectedPoints: 20,
					expectedRarity: 'rare'
				},
				{
					id: 'lightning_speed',
					expectedCategory: 'speed',
					expectedPoints: 25,
					expectedRarity: 'rare'
				},
				{
					id: 'speed_demon',
					expectedCategory: 'speed',
					expectedPoints: 30,
					expectedRarity: 'epic'
				},
				{
					id: 'win_streak',
					expectedCategory: 'streak',
					expectedPoints: 20,
					expectedRarity: 'uncommon'
				},
				{
					id: 'master_of_all',
					expectedCategory: 'mastery',
					expectedPoints: 50,
					expectedRarity: 'legendary'
				}
			];

			testCases.forEach(({ id, expectedCategory, expectedPoints, expectedRarity }) => {
				const legacy: LegacyMinesweeperAchievement = {
					id,
					name: 'Test',
					description: 'Test description',
					icon: '🎯',
					difficulty_specific: false,
					unlock_condition: 'Test',
					created_at: '2025-11-21T00:00:00Z'
				};

				const result = minesweeperAdapter.toUniversal(legacy);

				expect(result.category).toBe(expectedCategory);
				expect(result.metadata.points).toBe(expectedPoints);
				expect(result.metadata.rarity).toBe(expectedRarity);
			});
		});

		it('should handle difficulty_specific flag', () => {
			const legacy: LegacyMinesweeperAchievement = {
				id: 'master_of_all',
				name: 'Maître de tous',
				description: 'Gagne dans tous les niveaux',
				icon: '👑',
				difficulty_specific: true,
				unlock_condition: 'Win in all difficulties',
				created_at: '2025-11-21T00:00:00Z'
			};

			const result = minesweeperAdapter.toUniversal(legacy);

			expect(result.metadata.difficulty_specific).toBe(true);
		});

		it('should use default values for unknown achievement IDs', () => {
			const legacy: LegacyMinesweeperAchievement = {
				id: 'unknown_achievement',
				name: 'Unknown',
				description: 'Unknown achievement',
				icon: '❓',
				difficulty_specific: false,
				unlock_condition: 'Unknown',
				created_at: '2025-11-21T00:00:00Z'
			};

			const result = minesweeperAdapter.toUniversal(legacy);

			expect(result.category).toBe('mastery');
			expect(result.metadata.points).toBe(10);
			expect(result.metadata.rarity).toBe('common');
		});
	});

	describe('toLegacy', () => {
		it('should convert universal achievement to legacy format', () => {
			const universal: Achievement = {
				id: 'minesweeper_first_victory',
				context: 'minesweeper',
				category: 'mastery',
				name: 'Premier pas',
				description: 'Remporte ta première victoire',
				icon: '🎯',
				unlock_type: 'event_based',
				metadata: {
					difficulty_specific: false,
					points: 10,
					rarity: 'common',
					unlock_conditions: {
						type: 'minesweeper_game_completed',
						params: {}
					}
				},
				is_active: true,
				display_order: 0,
				created_at: '2025-11-21T00:00:00Z',
				updated_at: '2025-11-21T00:00:00Z'
			};

			const result = minesweeperAdapter.toLegacy(universal);

			expect(result.id).toBe('first_victory');
			expect(result.name).toBe('Premier pas');
			expect(result.description).toBe('Remporte ta première victoire');
			expect(result.icon).toBe('🎯');
			expect(result.difficulty_specific).toBe(false);
			expect(result.unlock_condition).toBe('See metadata for details');
			expect(result.created_at).toBe('2025-11-21T00:00:00Z');
		});

		it('should handle missing difficulty_specific in metadata', () => {
			const universal: Achievement = {
				id: 'minesweeper_no_flags',
				context: 'minesweeper',
				category: 'mastery',
				name: 'Sans drapeaux',
				description: 'Gagne sans placer de drapeau',
				icon: '🚩',
				unlock_type: 'event_based',
				metadata: {
					points: 15,
					rarity: 'uncommon'
				},
				is_active: true,
				display_order: 0,
				created_at: '2025-11-21T00:00:00Z',
				updated_at: '2025-11-21T00:00:00Z'
			};

			const result = minesweeperAdapter.toLegacy(universal);

			expect(result.difficulty_specific).toBe(false);
		});
	});

	describe('toUniversalStudentAchievement', () => {
		it('should convert legacy student achievement to universal format', () => {
			const legacy: LegacyMinesweeperStudentAchievement = {
				id: 'student-achievement-123',
				student_id: 'student-456',
				achievement_id: 'first_victory',
				difficulty: 'beginner',
				game_id: 'game-789',
				unlocked_at: '2025-11-21T12:00:00Z'
			};

			const result = minesweeperAdapter.toUniversalStudentAchievement(legacy);

			expect(result.id).toBe('student-achievement-123');
			expect(result.student_id).toBe('student-456');
			expect(result.achievement_id).toBe('minesweeper_first_victory');
			expect(result.context_data.difficulty).toBe('beginner');
			expect(result.context_data.reference_type).toBe('minesweeper_game');
			expect(result.context_data.reference_id).toBe('game-789');
			expect(result.unlocked_at).toBe('2025-11-21T12:00:00Z');
			expect(result.unlocked_by).toBe(null);
			expect(result.unlock_reason).toBe(null);
			expect(result.points_awarded).toBe(10);
			expect(result.gidouilles_awarded).toBe(0);
		});

		it('should handle null difficulty and game_id', () => {
			const legacy: LegacyMinesweeperStudentAchievement = {
				id: 'student-achievement-123',
				student_id: 'student-456',
				achievement_id: 'first_victory',
				difficulty: null,
				game_id: null,
				unlocked_at: '2025-11-21T12:00:00Z'
			};

			const result = minesweeperAdapter.toUniversalStudentAchievement(legacy);

			expect(result.context_data.difficulty).toBe(undefined);
			expect(result.context_data.reference_id).toBe(undefined);
		});

		it('should assign correct points based on achievement type', () => {
			const testCases = [
				{ achievement_id: 'first_victory', expectedPoints: 10 },
				{ achievement_id: 'no_flags', expectedPoints: 15 },
				{ achievement_id: 'perfectionist', expectedPoints: 20 },
				{ achievement_id: 'lightning_speed', expectedPoints: 25 },
				{ achievement_id: 'master_of_all', expectedPoints: 50 }
			];

			testCases.forEach(({ achievement_id, expectedPoints }) => {
				const legacy: LegacyMinesweeperStudentAchievement = {
					id: 'student-achievement-123',
					student_id: 'student-456',
					achievement_id,
					difficulty: null,
					game_id: null,
					unlocked_at: '2025-11-21T12:00:00Z'
				};

				const result = minesweeperAdapter.toUniversalStudentAchievement(legacy);
				expect(result.points_awarded).toBe(expectedPoints);
			});
		});
	});

	describe('toLegacyStudentAchievement', () => {
		it('should convert universal student achievement to legacy format', () => {
			const universal: StudentAchievement = {
				id: 'student-achievement-123',
				student_id: 'student-456',
				achievement_id: 'minesweeper_first_victory',
				context_data: {
					difficulty: 'beginner',
					reference_type: 'minesweeper_game',
					reference_id: 'game-789'
				},
				unlocked_at: '2025-11-21T12:00:00Z',
				unlocked_by: null,
				unlock_reason: null,
				points_awarded: 10,
				gidouilles_awarded: 0
			};

			const result = minesweeperAdapter.toLegacyStudentAchievement(universal);

			expect(result.id).toBe('student-achievement-123');
			expect(result.student_id).toBe('student-456');
			expect(result.achievement_id).toBe('first_victory');
			expect(result.difficulty).toBe('beginner');
			expect(result.game_id).toBe('game-789');
			expect(result.unlocked_at).toBe('2025-11-21T12:00:00Z');
		});

		it('should handle undefined difficulty and reference_id', () => {
			const universal: StudentAchievement = {
				id: 'student-achievement-123',
				student_id: 'student-456',
				achievement_id: 'minesweeper_first_victory',
				context_data: {},
				unlocked_at: '2025-11-21T12:00:00Z',
				unlocked_by: null,
				unlock_reason: null,
				points_awarded: 10,
				gidouilles_awarded: 0
			};

			const result = minesweeperAdapter.toLegacyStudentAchievement(universal);

			expect(result.difficulty).toBe(null);
			expect(result.game_id).toBe(null);
		});
	});

	describe('convertUnlockedAchievementsToLegacy', () => {
		it('should convert array of unlocked achievements to legacy format', () => {
			const unlocked: UnlockedAchievementResponse[] = [
				{
					achievement_id: 'minesweeper_first_victory',
					name: 'Premier pas',
					icon: '🎯',
					points: 10,
					gidouilles: 5,
					difficulty: 'beginner'
				},
				{
					achievement_id: 'minesweeper_no_flags',
					name: 'Sans drapeaux',
					icon: '🚩',
					points: 15,
					gidouilles: 7,
					difficulty: 'intermediate'
				}
			];

			const result = convertUnlockedAchievementsToLegacy(unlocked);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				achievement_id: 'first_victory',
				name: 'Premier pas',
				icon: '🎯',
				difficulty: 'beginner'
			});
			expect(result[1]).toEqual({
				achievement_id: 'no_flags',
				name: 'Sans drapeaux',
				icon: '🚩',
				difficulty: 'intermediate'
			});
		});

		it('should handle achievements without difficulty', () => {
			const unlocked: UnlockedAchievementResponse[] = [
				{
					achievement_id: 'minesweeper_first_victory',
					name: 'Premier pas',
					icon: '🎯',
					points: 10,
					gidouilles: 5
				}
			];

			const result = convertUnlockedAchievementsToLegacy(unlocked);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				achievement_id: 'first_victory',
				name: 'Premier pas',
				icon: '🎯',
				difficulty: undefined
			});
		});

		it('should handle empty array', () => {
			const result = convertUnlockedAchievementsToLegacy([]);
			expect(result).toEqual([]);
		});
	});

	describe('round-trip conversion', () => {
		it('should maintain data integrity through toUniversal -> toLegacy', () => {
			const original: LegacyMinesweeperAchievement = {
				id: 'perfectionist',
				name: 'Perfectionniste',
				description: 'Découvre toutes les cases',
				icon: '💯',
				difficulty_specific: true,
				unlock_condition: 'Reveal all cells',
				created_at: '2025-11-21T00:00:00Z'
			};

			const universal = minesweeperAdapter.toUniversal(original);
			const backToLegacy = minesweeperAdapter.toLegacy(universal);

			expect(backToLegacy.id).toBe(original.id);
			expect(backToLegacy.name).toBe(original.name);
			expect(backToLegacy.description).toBe(original.description);
			expect(backToLegacy.icon).toBe(original.icon);
			expect(backToLegacy.difficulty_specific).toBe(original.difficulty_specific);
			expect(backToLegacy.created_at).toBe(original.created_at);
		});

		it('should maintain data integrity through student achievement round-trip', () => {
			const original: LegacyMinesweeperStudentAchievement = {
				id: 'student-achievement-123',
				student_id: 'student-456',
				achievement_id: 'lightning_speed',
				difficulty: 'expert',
				game_id: 'game-789',
				unlocked_at: '2025-11-21T12:00:00Z'
			};

			const universal = minesweeperAdapter.toUniversalStudentAchievement(original);
			const backToLegacy = minesweeperAdapter.toLegacyStudentAchievement(universal);

			expect(backToLegacy.id).toBe(original.id);
			expect(backToLegacy.student_id).toBe(original.student_id);
			expect(backToLegacy.achievement_id).toBe(original.achievement_id);
			expect(backToLegacy.difficulty).toBe(original.difficulty);
			expect(backToLegacy.game_id).toBe(original.game_id);
			expect(backToLegacy.unlocked_at).toBe(original.unlocked_at);
		});
	});
});
