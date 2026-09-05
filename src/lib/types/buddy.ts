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

/**
 * Narrows a `student_buddies` row to {@link BuddyState}.
 *
 * `palotin_type` is a plain text column in Postgres, so every read arrives as
 * `string` and cannot feed the message tables, which are keyed by the three
 * known palotins.
 *
 * An unrecognised value falls back to `giron`: a buddy whose type was written
 * by an older revision must keep talking to the student rather than break the
 * dashboard.
 */
export function toBuddyState(row: {
	student_id: string;
	palotin_type: string;
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
}): BuddyState {
	return {
		...row,
		palotin_type:
			row.palotin_type === 'pile' || row.palotin_type === 'cotice' ? row.palotin_type : 'giron'
	};
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
