/**
 * Server-Side Test Mode Utilities
 * =================================
 *
 * Helper functions for determining teacher test mode on the server.
 *
 * BEHAVIOR:
 * - Test teachers (is_test = true) are ALWAYS in test mode
 * - Regular teachers can toggle test mode via user_preferences
 * - Default to FALSE if no preference is set
 *
 * USAGE:
 * ```ts
 * import { getTeacherTestMode } from '$lib/server/test-mode';
 *
 * const isTestMode = await getTeacherTestMode(userId, supabase);
 * // Use isTestMode to filter student queries
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Get teacher's test mode status
 *
 * Returns true if:
 * - Teacher is a test user (is_test = true), OR
 * - Teacher has test mode enabled in preferences
 *
 * @param userId - Teacher's user ID
 * @param supabase - Supabase client instance
 * @returns boolean - Whether teacher should see test students
 */
export async function getTeacherTestMode(
	userId: string,
	supabase: SupabaseClient<Database>
): Promise<boolean> {
	// First, check if the teacher is a test user
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('is_test')
		.eq('id', userId)
		.single();

	if (profileError) {
		console.error('[getTeacherTestMode] Error fetching profile:', profileError);
		return false; // Default to showing real students on error
	}

	// Test teachers are always in test mode
	if (profile.is_test) {
		return true;
	}

	// For regular teachers, check their preference
	const { data: preference, error: prefError } = await supabase
		.from('user_preferences')
		.select('test_mode_enabled')
		.eq('user_id', userId)
		.maybeSingle(); // Use maybeSingle() since preference might not exist

	if (prefError) {
		console.error('[getTeacherTestMode] Error fetching preferences:', prefError);
		return false; // Default to showing real students on error
	}

	const testMode = preference?.test_mode_enabled ?? false;

	// Return preference value, or false if no preference exists
	return testMode;
}

/**
 * Update teacher's test mode preference
 *
 * NOTE: This should only be called for non-test teachers.
 * Test teachers are always in test mode and cannot toggle it.
 *
 * @param userId - Teacher's user ID
 * @param enabled - Whether to enable test mode
 * @param supabase - Supabase client instance
 * @returns boolean - Success status
 */
export async function setTeacherTestMode(
	userId: string,
	enabled: boolean,
	supabase: SupabaseClient<Database>
): Promise<boolean> {
	// Upsert the preference (insert if doesn't exist, update if it does)
	const { error } = await supabase.from('user_preferences').upsert(
		{
			user_id: userId,
			test_mode_enabled: enabled,
			updated_at: new Date().toISOString()
		},
		{
			onConflict: 'user_id'
		}
	);

	if (error) {
		console.error('[setTeacherTestMode] Error updating preference:', error);
		return false;
	}

	return true;
}
