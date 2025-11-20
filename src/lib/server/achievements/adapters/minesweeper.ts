import type {
	Achievement,
	StudentAchievement,
	UnlockedAchievementResponse,
	AchievementCategory,
	AchievementRarity
} from '$lib/types/achievements';
import type { Database } from '$lib/types/database';

/**
 * Legacy Minesweeper achievement types from database
 */
export type LegacyMinesweeperAchievement =
	Database['public']['Tables']['minesweeper_achievements']['Row'];
export type LegacyMinesweeperStudentAchievement =
	Database['public']['Tables']['minesweeper_student_achievements']['Row'];

/**
 * Interface for the Minesweeper achievement adapter
 */
export interface MinesweeperAchievementAdapter {
	// Convert from legacy format to universal format
	toUniversal(legacy: LegacyMinesweeperAchievement): Achievement;

	// Convert from universal format to legacy format
	toLegacy(universal: Achievement): LegacyMinesweeperAchievement;

	// Convert student achievement unlock
	toUniversalStudentAchievement(legacy: LegacyMinesweeperStudentAchievement): StudentAchievement;
	toLegacyStudentAchievement(universal: StudentAchievement): LegacyMinesweeperStudentAchievement;

	// Helper to add/remove minesweeper_ prefix
	addMinesweeperPrefix(id: string): string;
	removeMinesweeperPrefix(id: string): string;
}

/**
 * Maps legacy achievement IDs to categories
 */
function getCategoryForAchievement(id: string): AchievementCategory {
	const categoryMap: Record<string, AchievementCategory> = {
		first_victory: 'milestone',
		no_flags: 'mastery',
		perfectionist: 'mastery',
		lightning_speed: 'speed',
		speed_demon: 'speed',
		cautious_player: 'mastery',
		win_streak: 'streak',
		master_of_all: 'mastery',
		daily_challenger: 'participation',
		consistency_king: 'streak'
	};
	return categoryMap[id] ?? 'mastery';
}

/**
 * Maps legacy achievement IDs to point values
 */
function getPointsForAchievement(id: string): number {
	const pointsMap: Record<string, number> = {
		first_victory: 10,
		no_flags: 15,
		perfectionist: 20,
		lightning_speed: 25,
		speed_demon: 30,
		cautious_player: 15,
		win_streak: 20,
		master_of_all: 50,
		daily_challenger: 15,
		consistency_king: 25
	};
	return pointsMap[id] ?? 10;
}

/**
 * Maps legacy achievement IDs to rarity levels
 */
function getRarityForAchievement(id: string): AchievementRarity {
	const rarityMap: Record<string, AchievementRarity> = {
		first_victory: 'common',
		no_flags: 'uncommon',
		perfectionist: 'rare',
		lightning_speed: 'rare',
		speed_demon: 'epic',
		cautious_player: 'uncommon',
		win_streak: 'uncommon',
		master_of_all: 'legendary',
		daily_challenger: 'common',
		consistency_king: 'rare'
	};
	return rarityMap[id] ?? 'common';
}

/**
 * Adapter for converting between legacy Minesweeper achievements and universal format
 */
export const minesweeperAdapter: MinesweeperAchievementAdapter = {
	/**
	 * Adds minesweeper_ prefix to achievement ID if not already present
	 */
	addMinesweeperPrefix(id: string): string {
		return id.startsWith('minesweeper_') ? id : `minesweeper_${id}`;
	},

	/**
	 * Removes minesweeper_ prefix from achievement ID
	 */
	removeMinesweeperPrefix(id: string): string {
		return id.replace(/^minesweeper_/, '');
	},

	/**
	 * Converts a legacy Minesweeper achievement to universal format
	 */
	toUniversal(legacy: LegacyMinesweeperAchievement): Achievement {
		const category = getCategoryForAchievement(legacy.id);
		const points = getPointsForAchievement(legacy.id);
		const rarity = getRarityForAchievement(legacy.id);

		return {
			id: this.addMinesweeperPrefix(legacy.id),
			context: 'minesweeper',
			category,
			name: legacy.name,
			description: legacy.description,
			icon: legacy.icon,
			unlock_type: 'event_based',
			metadata: {
				difficulty_specific: legacy.difficulty_specific,
				points,
				rarity,
				unlock_conditions: {
					type: 'minesweeper_game_completed',
					params: {}
				}
			},
			is_active: true,
			display_order: 0,
			created_at: legacy.created_at,
			updated_at: legacy.created_at
		};
	},

	/**
	 * Converts a universal achievement back to legacy Minesweeper format
	 */
	toLegacy(universal: Achievement): LegacyMinesweeperAchievement {
		return {
			id: this.removeMinesweeperPrefix(universal.id),
			name: universal.name,
			description: universal.description,
			icon: universal.icon,
			difficulty_specific: universal.metadata.difficulty_specific ?? false,
			unlock_condition: 'See metadata for details',
			created_at: universal.created_at
		};
	},

	/**
	 * Converts a legacy student achievement unlock to universal format
	 */
	toUniversalStudentAchievement(legacy: LegacyMinesweeperStudentAchievement): StudentAchievement {
		return {
			id: legacy.id,
			student_id: legacy.student_id,
			achievement_id: this.addMinesweeperPrefix(legacy.achievement_id),
			context_data: {
				difficulty:
					(legacy.difficulty as 'beginner' | 'intermediate' | 'expert' | undefined) ?? undefined,
				reference_type: 'minesweeper_game',
				reference_id: legacy.game_id ?? undefined
			},
			unlocked_at: legacy.unlocked_at,
			unlocked_by: null,
			unlock_reason: null,
			points_awarded: getPointsForAchievement(legacy.achievement_id),
			gidouilles_awarded: 0
		};
	},

	/**
	 * Converts a universal student achievement back to legacy format
	 */
	toLegacyStudentAchievement(universal: StudentAchievement): LegacyMinesweeperStudentAchievement {
		return {
			id: universal.id,
			student_id: universal.student_id,
			achievement_id: this.removeMinesweeperPrefix(universal.achievement_id),
			difficulty: universal.context_data.difficulty ?? null,
			unlocked_at: universal.unlocked_at,
			game_id: universal.context_data.reference_id ?? null
		};
	}
};

/**
 * Convert array of unlocked achievements from new format to legacy response format
 * Used for backward compatibility with existing API responses
 */
export function convertUnlockedAchievementsToLegacy(
	unlocked: UnlockedAchievementResponse[]
): Array<{
	achievement_id: string;
	name: string;
	icon: string;
	difficulty?: string;
}> {
	return unlocked.map((achievement) => ({
		achievement_id: minesweeperAdapter.removeMinesweeperPrefix(achievement.achievement_id),
		name: achievement.name,
		icon: achievement.icon,
		difficulty: achievement.difficulty
	}));
}
