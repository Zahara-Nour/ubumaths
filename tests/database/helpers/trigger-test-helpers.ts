// @ts-nocheck - Database schema integration tests validated at runtime
/**
 * Test Helpers for Database Trigger Tests
 *
 * Provides utilities for testing PostgreSQL triggers in Supabase with a local Docker instance.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { deleteTestAuthUsers, closePostgresClient } from './postgres-client';

/**
 * Creates a Supabase client for trigger testing
 *
 * Uses local Supabase instance running in Docker (port 54321)
 * Started with: supabase start
 */
export function createTestSupabaseClient(): SupabaseClient<Database> {
	const url = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
	const anonKey =
		process.env.SUPABASE_TEST_ANON_KEY ||
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

	return createClient<Database>(url, anonKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});
}

/**
 * Creates a service role client for operations requiring elevated permissions
 * (e.g., inserting into auth.users, bypassing RLS)
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
	const url = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
	const serviceRoleKey =
		process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

	return createClient<Database>(url, serviceRoleKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});
}

/**
 * Generates a unique test ID (valid UUID format)
 * Uses crypto.randomUUID() for PostgreSQL UUID column compatibility
 */
export function generateTestId(_prefix: string): string {
	// Generate a valid UUID v4 for PostgreSQL UUID columns
	// Note: prefix parameter kept for API compatibility but not used
	return crypto.randomUUID();
}

/**
 * Generates a unique test email
 */
export function generateTestEmail(prefix = 'test'): string {
	return `${generateTestId(prefix)}@test.com`;
}

/**
 * Clean up test data by deleting from specified tables
 *
 * IMPORTANT: Order matters due to foreign key constraints.
 * Delete children before parents.
 */
export async function cleanupTestData(
	supabase: SupabaseClient<Database>,
	tables: string[]
): Promise<void> {
	for (const table of tables) {
		// Use service role client to bypass RLS
		const serviceClient = createServiceRoleClient();
		await serviceClient
			.from(table as never)
			.delete()
			.like('email', '%@test.com%');
	}
}

/**
 * Cleanup all test data across all tables
 * Useful for afterAll/afterEach hooks
 */
export async function cleanupAllTestData(): Promise<void> {
	const serviceClient = createServiceRoleClient();

	// Order matters - delete children before parents
	const tables = [
		// Game system
		'game_challenge_attempts',
		'game_combats',
		'game_player_achievements',
		'game_leaderboards',
		'game_spell_decks',
		'game_players',

		// Assessments & exercises
		'assessment_responses',
		'assessment_attempts',
		'assessments',
		'exercise_completions',
		'exercise_assignments',
		'exercises',

		// SRS
		'srs_card_stats',
		'srs_cards',
		'srs_decks',

		// Messages
		'message_attachments_v2',
		'message_inbox',
		'private_messages',
		'message_drafts',
		'messages',

		// Chat
		'conversation_participants',
		'chat_conversations',

		// Classes
		'class_members',
		'assignments',
		'classes',

		// User data
		'student_progress',
		'pending_students',
		'profiles'
	];

	for (const table of tables) {
		try {
			// Delete rows where email contains @test.com (test data marker)
			await serviceClient
				.from(table as never)
				.delete()
				.like('email', '%@test.com%');
		} catch (error) {
			// Some tables don't have email column, that's OK
			console.debug(`Cleanup ${table}:`, error);
		}
	}

	// Clean up auth.users table using direct PostgreSQL client
	// (Supabase client cannot access auth schema)
	await deleteTestAuthUsers();
}

/**
 * Wait for a condition to be true (useful for async triggers)
 *
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms (default: 5000)
 * @param interval - Polling interval in ms (default: 100)
 */
export async function waitForCondition(
	condition: () => Promise<boolean>,
	timeout = 5000,
	interval = 100
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Insert a test profile with specified role
 */
export async function insertTestProfile(params: {
	id?: string;
	email?: string;
	role: 'student' | 'teacher' | 'admin';
	fullName?: string;
}): Promise<Database['public']['Tables']['profiles']['Row']> {
	const serviceClient = createServiceRoleClient();

	const profile = {
		id: params.id || generateTestId('user'),
		email: params.email || generateTestEmail(),
		role: params.role,
		full_name: params.fullName || `Test ${params.role}`,
		created_at: new Date().toISOString()
	};

	const { data, error } = await serviceClient.from('profiles').insert(profile).select().single();

	if (error) throw error;
	return data;
}

/**
 * Insert a test class
 */
export async function insertTestClass(params: {
	teacherId: string;
	name?: string;
}): Promise<Database['public']['Tables']['classes']['Row']> {
	const serviceClient = createServiceRoleClient();

	const classData = {
		id: generateTestId('class'),
		teacher_id: params.teacherId,
		name: params.name || 'Test Class',
		created_at: new Date().toISOString()
	};

	const { data, error } = await serviceClient.from('classes').insert(classData).select().single();

	if (error) throw error;
	return data;
}

/**
 * Insert a test exercise
 */
export async function insertTestExercise(params: {
	createdBy: string;
	type?: string;
}): Promise<Database['public']['Tables']['exercises']['Row']> {
	const serviceClient = createServiceRoleClient();

	const exercise = {
		id: generateTestId('exercise'),
		created_by: params.createdBy,
		type: params.type || 'multiple_choice',
		question: 'Test question?',
		answer: '42',
		created_at: new Date().toISOString()
	};

	const { data, error } = await serviceClient.from('exercises').insert(exercise).select().single();

	if (error) throw error;
	return data;
}

/**
 * Close all database connections
 * Call this in afterAll hooks to prevent connection leaks
 */
export async function closeConnections(): Promise<void> {
	await closePostgresClient();
}
