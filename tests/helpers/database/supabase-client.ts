/**
 * Supabase Client Helpers for Tests
 *
 * Provides utilities for creating authenticated Supabase clients in tests.
 * This allows tests to interact with RPC functions that require authentication.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Default test password used for all test users
 * This matches the bcrypt hash in insertAuthUser()
 */
export const DEFAULT_TEST_PASSWORD = 'password123';

/**
 * Creates an authenticated Supabase client for testing
 *
 * This allows tests to call RPC functions that check auth.uid() or verify
 * student/teacher authorization. The client signs in with the provided credentials
 * and returns an authenticated client with a valid session.
 *
 * @param email - Email address of the test user (must exist in auth.users)
 * @param password - Password for the test user (default: 'password123')
 * @returns Authenticated Supabase client
 * @throws Error if sign-in fails
 *
 * @example
 * ```typescript
 * // Create test student with auth.users entry
 * const student = await TestData.profile()
 *   .withRole('student')
 *   .create();
 *
 * // Create authenticated client as the student
 * const studentClient = await createAuthenticatedClient(
 *   student.email,
 *   'password123'
 * );
 *
 * // Now RPC calls work with proper auth.uid()
 * const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
 *   p_student_id: student.id,
 *   p_count: 1,
 *   p_payment_method: 'gidouilles',
 *   p_gidouilles_cost: 10,
 *   p_vip_card_instance_id: null
 * });
 * ```
 */
export async function createAuthenticatedClient(
	email: string,
	password: string = DEFAULT_TEST_PASSWORD
): Promise<SupabaseClient<Database>> {
	// Get Supabase URL and anon key from environment
	const url = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
	const anonKey =
		process.env.SUPABASE_TEST_ANON_KEY ||
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

	// Create fresh Supabase client
	const client = createClient<Database>(url, anonKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});

	// Sign in with provided credentials
	const { data, error } = await client.auth.signInWithPassword({
		email,
		password
	});

	if (error) {
		throw new Error(`Failed to authenticate test user ${email}: ${error.message}`);
	}

	if (!data.session) {
		throw new Error(`Sign-in succeeded but no session returned for ${email}`);
	}

	return client;
}
