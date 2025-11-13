/**
 * Shared types for the summaries system
 */

import type { Database } from '$lib/types/database';

/**
 * Daily changes tracked for a student in a class on a specific date
 * All counts represent absolute values (not deltas)
 */
export interface DailyChanges {
	/** Total positive gidouilles deltas (sum of all gains) */
	gidouilles_gained: number;
	/** Total negative gidouilles deltas (absolute value of all losses) */
	gidouilles_lost: number;
	/** Total positive bonus deltas */
	bonus_gained: number;
	/** Total negative bonus deltas (absolute value of all uses) */
	bonus_used: number;
	/** Number of warnings issued on this date */
	warnings_issued: number;
	/** Number of warnings removed on this date */
	warnings_removed: number;
	/** Number of VIP cards gained */
	vip_cards_gained: number;
	/** Number of VIP cards used */
	vip_cards_used: number;
}

/**
 * Class data with school information
 * Used when generating summaries to access school configuration
 */
export interface ClassWithSchool {
	id: string;
	name: string;
	school_id: string;
	created_at: string;
	updated_at: string;
}

/**
 * Result of processing daily summaries for a class
 */
export interface DailySummaryResult {
	/** Number of summaries generated */
	summaries_sent: number;
	/** Number of students processed */
	students_processed: number;
	/** Errors encountered (if any) */
	errors: string[];
}

/**
 * Result of processing weekly rewards for a class
 */
export interface WeeklyRewardResult {
	/** Number of rewards awarded */
	rewards_awarded: number;
	/** Number of students processed */
	students_processed: number;
	/** Errors encountered (if any) */
	errors: string[];
}

/**
 * Type for class_members table row
 */
export type ClassMember = Database['public']['Tables']['class_members']['Row'];

/**
 * Type for notifications table insert
 */
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
