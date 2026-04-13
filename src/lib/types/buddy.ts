/**
 * Buddy System Types
 * ==================
 *
 * Types specific to the Palotin buddy system.
 * For DB row types, see database-helpers.ts (StudentBuddy, BuddySkin).
 */

import type { PalotinType } from '$lib/config/buddy-messages';

/** Current buddy state for client-side rendering */
export interface BuddyState {
	student_id: string;
	palotin_type: PalotinType;
	xp: number;
	level: number;
	current_streak: number;
	longest_streak: number;
	last_activity_date: string | null;
	xp_earned_today: number;
	last_xp_date: string | null;
	themes_explored: string[];
	change_count: number;
	equipped_skin_id: string | null;
}

/** Buddy expression states for avatar display */
export type BuddyExpression = 'neutral' | 'happy' | 'sad' | 'thinking' | 'excited' | 'encouraging';

/** Result of an XP gain operation (returned by add_buddy_xp RPC) */
export interface BuddyXpGainResult {
	xp_gained: number;
	new_xp: number;
	new_level: number;
	leveled_up: boolean;
	daily_cap_reached: boolean;
}

/** Quiz answer for Palotin selection */
export interface BuddyQuizAnswer {
	question: number;
	palotin: PalotinType;
}

/** Quiz result after scoring */
export interface BuddyQuizResult {
	suggested: PalotinType;
	scores: Record<PalotinType, number>;
}
