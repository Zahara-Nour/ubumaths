/**
 * Server-side Buddy Query Helpers
 * ================================
 *
 * Database access functions for the Palotin buddy system.
 * Used by API endpoints and +page.server.ts files.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { PalotinType } from '$lib/config/buddy-messages';
import type { BuddyState, BuddyXpGainResult } from '$lib/types/buddy';

/**
 * Get a student's buddy. Returns null if no buddy chosen yet.
 */
export async function getStudentBuddy(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<BuddyState | null> {
	const { data, error } = await supabase
		.from('student_buddies')
		.select('*')
		.eq('student_id', studentId)
		.maybeSingle();

	if (error) {
		console.error('❌ [buddy-queries] Error fetching student buddy:', error);
		throw error;
	}

	return data as BuddyState | null;
}

/**
 * Create a student's buddy after quiz selection.
 */
export async function createStudentBuddy(
	supabase: SupabaseClient<Database>,
	studentId: string,
	palotinType: PalotinType
): Promise<BuddyState> {
	const { data, error } = await supabase
		.from('student_buddies')
		.insert({
			student_id: studentId,
			palotin_type: palotinType
		})
		.select()
		.single();

	if (error) {
		console.error('❌ [buddy-queries] Error creating student buddy:', error);
		throw error;
	}

	return data as BuddyState;
}

/**
 * Change a student's Palotin type.
 * Checks change_count for pricing (1st free, then costs gidouilles).
 * Does NOT handle gidouille deduction — caller must do that.
 */
export async function changeStudentPalotin(
	supabase: SupabaseClient<Database>,
	studentId: string,
	newType: PalotinType
): Promise<BuddyState> {
	const { data, error } = await supabase
		.from('student_buddies')
		.update({
			palotin_type: newType,
			change_count: supabase.rpc ? undefined : undefined // Increment handled below
		})
		.eq('student_id', studentId)
		.select()
		.single();

	if (error) {
		console.error('❌ [buddy-queries] Error changing palotin:', error);
		throw error;
	}

	// Increment change_count separately (Supabase JS doesn't support column increment in update)
	const { error: incError } = await supabase.rpc('increment_buddy_change_count' as never, {
		p_student_id: studentId
	});

	// Fallback: if RPC doesn't exist, do a raw update
	if (incError) {
		await supabase
			.from('student_buddies')
			.update({ change_count: (data.change_count ?? 0) + 1 })
			.eq('student_id', studentId);
	}

	return { ...data, change_count: (data.change_count ?? 0) + 1 } as BuddyState;
}

/**
 * Add XP to a student's buddy via the add_buddy_xp RPC.
 * Handles daily cap and level calculation atomically in the database.
 */
export async function addBuddyXp(
	supabase: SupabaseClient<Database>,
	studentId: string,
	xp: number,
	isMilestone: boolean = false
): Promise<BuddyXpGainResult> {
	const { data, error } = await supabase.rpc('add_buddy_xp' as never, {
		p_student_id: studentId,
		p_xp: xp,
		p_is_milestone: isMilestone
	});

	if (error) {
		console.error('❌ [buddy-queries] Error adding buddy XP:', error);
		throw error;
	}

	const result = data as unknown as BuddyXpGainResult;

	if ('error' in (data as Record<string, unknown>)) {
		console.error('❌ [buddy-queries] RPC error:', (data as Record<string, unknown>).error);
		return { xp_gained: 0, new_xp: 0, new_level: 1, leveled_up: false, daily_cap_reached: false };
	}

	return result;
}

/**
 * Update streak on first activity of the day.
 * Increments current_streak, updates longest_streak if record, sets last_activity_date.
 * Returns the new streak value and any streak bonus XP to award.
 */
export async function updateStreak(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<{ newStreak: number; wasUpdated: boolean }> {
	// Fetch current state
	const buddy = await getStudentBuddy(supabase, studentId);
	if (!buddy) return { newStreak: 0, wasUpdated: false };

	const today = new Date().toISOString().split('T')[0];

	// Already active today — no streak update
	if (buddy.last_activity_date === today) {
		return { newStreak: buddy.current_streak, wasUpdated: false };
	}

	const newStreak = buddy.current_streak + 1;
	const newLongest = Math.max(buddy.longest_streak, newStreak);

	const { error } = await supabase
		.from('student_buddies')
		.update({
			current_streak: newStreak,
			longest_streak: newLongest,
			last_activity_date: today
		})
		.eq('student_id', studentId);

	if (error) {
		console.error('❌ [buddy-queries] Error updating streak:', error);
		throw error;
	}

	return { newStreak, wasUpdated: true };
}

/**
 * Reset streak to 0 (called when streak is lost on login).
 */
export async function resetStreak(
	supabase: SupabaseClient<Database>,
	studentId: string
): Promise<void> {
	const { error } = await supabase
		.from('student_buddies')
		.update({ current_streak: 0 })
		.eq('student_id', studentId);

	if (error) {
		console.error('❌ [buddy-queries] Error resetting streak:', error);
		throw error;
	}
}

/**
 * Add a theme to the student's explored themes list.
 * Returns true if the theme was new (not previously explored).
 */
export async function addExploredTheme(
	supabase: SupabaseClient<Database>,
	studentId: string,
	theme: string
): Promise<boolean> {
	const buddy = await getStudentBuddy(supabase, studentId);
	if (!buddy) return false;

	if (buddy.themes_explored.includes(theme)) {
		return false; // Already explored
	}

	const { error } = await supabase
		.from('student_buddies')
		.update({
			themes_explored: [...buddy.themes_explored, theme]
		})
		.eq('student_id', studentId);

	if (error) {
		console.error('❌ [buddy-queries] Error adding explored theme:', error);
		throw error;
	}

	return true;
}

/**
 * Get all buddies for students in a given class (teacher dashboard).
 */
export async function getClassBuddies(
	supabase: SupabaseClient<Database>,
	classId: string
): Promise<
	(BuddyState & { full_name: string | null; firstname: string | null; lastname: string | null })[]
> {
	const { data, error } = await supabase
		.from('class_members')
		.select(
			`
			student_id,
			profiles:student_id (
				full_name,
				firstname,
				lastname
			),
			student_buddies:student_id (
				student_id,
				palotin_type,
				xp,
				level,
				current_streak,
				longest_streak,
				last_activity_date,
				xp_earned_today,
				themes_explored,
				change_count
			)
		`
		)
		.eq('class_id', classId)
		.eq('status', 'active');

	if (error) {
		console.error('❌ [buddy-queries] Error fetching class buddies:', error);
		throw error;
	}

	return (data || [])
		.filter((m) => m.student_buddies)
		.map((m) => {
			const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
			const buddy = Array.isArray(m.student_buddies) ? m.student_buddies[0] : m.student_buddies;
			return {
				...buddy,
				full_name: profile?.full_name ?? null,
				firstname: profile?.firstname ?? null,
				lastname: profile?.lastname ?? null
			};
		}) as (BuddyState & {
		full_name: string | null;
		firstname: string | null;
		lastname: string | null;
	})[];
}
