import type { Database } from './database';

// Achievement context types
export type AchievementContext =
	| 'minesweeper'
	| 'questions'
	| 'assessments'
	| 'srs'
	| 'riddles'
	| 'social'
	| 'meta';

export type AchievementCategory =
	| 'speed'
	| 'accuracy'
	| 'streak'
	| 'mastery'
	| 'participation'
	| 'social'
	| 'collection'
	| 'milestone';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type UnlockType = 'automatic' | 'event_based' | 'progressive' | 'manual';

// Metadata structure (from JSONB)
export interface AchievementMetadata {
	difficulty_specific?: boolean;
	subject_specific?: boolean;
	repeatable?: boolean;
	max_repetitions?: number;
	hidden?: boolean;
	show_progress?: boolean;
	tiers?: {
		bronze?: number;
		silver?: number;
		gold?: number;
		platinum?: number;
	};
	prerequisites?: string[];
	requires_all?: boolean;
	seasonal?: {
		start: string;
		end: string;
		recurring?: boolean;
	};
	time_limit?: number;
	unlock_conditions?: {
		type: string;
		params?: Record<string, unknown>;
		events?: string[];
	};
	points?: number;
	gidouilles_reward?: number;
	rarity?: AchievementRarity;
	progress_config?: {
		target: number;
		unit: string;
		reset_on_fail?: boolean;
	};
}

// Context data structure (from JSONB)
export interface AchievementContextData {
	difficulty?: 'beginner' | 'intermediate' | 'expert';
	subject?: string;
	tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
	iteration?: number;
	reference_type?: string;
	reference_id?: string;
}

// Database types with typed JSONB
export type Achievement = Database['public']['Tables']['achievements']['Row'] & {
	metadata: AchievementMetadata;
};

export type StudentAchievement = Database['public']['Tables']['student_achievements']['Row'] & {
	context_data: AchievementContextData;
};

export type AchievementProgress = Database['public']['Tables']['achievement_progress']['Row'];

export type AchievementEvent = Database['public']['Tables']['achievement_events']['Row'];

// UI/API types
export interface AchievementWithUnlock extends Achievement {
	is_unlocked: boolean;
	unlocked_at?: string;
	unlocked_by?: string;
	unlock_reason?: string;
	points_awarded?: number;
	gidouilles_awarded?: number;
	context_data?: AchievementContextData;
}

export interface AchievementWithProgress extends AchievementWithUnlock {
	progress?: {
		current_value: number;
		target_value: number;
		progress_percentage: number;
		context_key?: string;
	};
}

export interface AchievementStats {
	total_unlocked: number;
	total_available: number;
	progress_percentage: number;
	by_context: Record<AchievementContext, number>;
	total_points: number;
	rarest_achievement?: Achievement;
}

export interface UnlockedAchievementResponse {
	achievement_id: string;
	name: string;
	icon: string;
	points: number;
	gidouilles: number;
	difficulty?: string;
	tier?: string;
}

// Event types for different features
export type AchievementEventType =
	// Minesweeper
	| 'minesweeper_game_completed'
	| 'minesweeper_game_won'
	| 'minesweeper_game_lost'
	// Questions
	| 'question_answered'
	| 'question_streak'
	| 'subject_mastery'
	// Assessments
	| 'assessment_completed'
	| 'assessment_perfect_score'
	// SRS
	| 'srs_card_reviewed'
	| 'srs_daily_streak'
	| 'srs_retention_milestone'
	// Riddles
	| 'riddle_solved'
	| 'riddle_daily_solved'
	// Social
	| 'friend_added'
	| 'message_sent'
	| 'help_given'
	// Meta
	| 'achievement_unlocked'
	| 'level_up';

export interface AchievementEventData {
	event_type: AchievementEventType;
	context: AchievementContext;
	data: Record<string, unknown>;
}
