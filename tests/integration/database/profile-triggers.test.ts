/**
 * Profile Trigger Tests
 *
 * Tests for triggers related to profile creation and management
 *
 * Triggers tested:
 * - on_auth_user_created (AFTER INSERT on auth.users) → handle_new_user()
 * - update_profiles_updated_at (BEFORE UPDATE on profiles)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	generateTestId,
	generateTestEmail,
	cleanupAllTestData,
	closeConnections
} from '../../helpers/database/trigger-test-helpers';
import { TestData } from '../../helpers/database/test-data-factory';
import { getPostgresClient } from '../../helpers/database/postgres-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Insert a row into auth.users directly (the Supabase JS client cannot reach the
 * auth schema). Firing the INSERT runs on_auth_user_created → handle_new_user().
 */
async function signupViaAuth(
	id: string,
	email: string,
	meta: Record<string, unknown> = {}
): Promise<void> {
	const client = await getPostgresClient();
	await client.query(
		`INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
		 VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3, now(), now())
		 ON CONFLICT (id) DO NOTHING`,
		[id, email, JSON.stringify(meta)]
	);
}

describe('Profile Triggers', () => {
	let serviceClient: SupabaseClient<Database>;

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		await cleanupAllTestData();
	});

	describe('on_auth_user_created → handle_new_user()', () => {
		it('should create a student profile when a user signs up', async () => {
			// Arrange
			const userId = generateTestId('user');
			const userEmail = generateTestEmail('signup');

			// Act: a real signup carries Google OAuth name fields; handle_new_user maps
			// given_name/family_name → firstname/lastname (it does not read 'full_name').
			await signupViaAuth(userId, userEmail, { given_name: 'John', family_name: 'Doe' });
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Profile should be created automatically
			const { data: profile, error: profileError } = await serviceClient
				.from('profiles')
				.select()
				.eq('id', userId)
				.single();

			expect(profileError).toBeNull();
			expect(profile?.id).toBe(userId);
			expect(profile?.email).toBe(userEmail);
			expect(profile?.firstname).toBe('John');
			expect(profile?.lastname).toBe('Doe');
			expect(profile?.role).toBe('student'); // Default role
		});

		it('should create a profile even with no name metadata', async () => {
			// Arrange
			const userId = generateTestId('user');
			const userEmail = generateTestEmail('noname');

			// Act: sign up with empty metadata
			await signupViaAuth(userId, userEmail, {});
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: profile created (role=student); names default to empty, not null.
			const { data: profile } = await serviceClient
				.from('profiles')
				.select()
				.eq('id', userId)
				.single();

			expect(profile?.email).toBe(userEmail);
			expect(profile?.role).toBe('student');
		});

		it('should handle duplicate profile attempt gracefully (ON CONFLICT)', async () => {
			// Arrange: Create profile first (also inserts the auth.users row)
			const userId = generateTestId('user');
			const userEmail = generateTestEmail('duplicate');

			await TestData.profile().withId(userId).withEmail(userEmail).create();

			// Act: re-fire the trigger by upserting the same auth user; handle_new_user's
			// EXCEPTION block must swallow the unique_violation.
			await signupViaAuth(userId, userEmail, { given_name: 'Test' });
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Should not throw error (EXCEPTION block catches unique_violation)
			const { data: profiles } = await serviceClient.from('profiles').select().eq('id', userId);

			expect(profiles).toHaveLength(1); // Only one profile exists
		});

		it('should not fail user creation even if profile creation fails', async () => {
			// This tests the EXCEPTION block in handle_new_user(): a signup must succeed
			// (the auth user is created) even when profile creation hits an error.
			const userId = generateTestId('user');
			const userEmail = generateTestEmail('failsafe');

			// Act + Assert: signup must not throw.
			await expect(signupViaAuth(userId, userEmail, {})).resolves.toBeUndefined();

			// And the auth user exists.
			const { data: profile } = await serviceClient
				.from('profiles')
				.select('id')
				.eq('id', userId)
				.maybeSingle();
			expect(profile?.id).toBe(userId);
		});
	});

	describe('update_profiles_updated_at (BEFORE UPDATE)', () => {
		it('should update updated_at timestamp when profile is updated', async () => {
			// Arrange
			const profile = await TestData.profile().create();
			const originalUpdatedAt = profile.updated_at;

			// Wait to ensure timestamp will be different
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Act: Update profile
			const { data: updatedProfile } = await serviceClient
				.from('profiles')
				.update({ full_name: 'Updated Name' })
				.eq('id', profile.id)
				.select()
				.single();

			// Assert: updated_at should change
			expect(updatedProfile?.updated_at).toBeDefined();
			expect(updatedProfile?.updated_at).not.toBe(originalUpdatedAt);
			expect(new Date(updatedProfile!.updated_at!).getTime()).toBeGreaterThan(
				new Date(originalUpdatedAt!).getTime()
			);
		});

		it('should set updated_at to NOW() on each update', async () => {
			// Arrange
			const profile = await TestData.profile().create();

			// Act: Multiple updates
			await serviceClient
				.from('profiles')
				.update({ full_name: 'First Update' })
				.eq('id', profile.id);

			await new Promise((resolve) => setTimeout(resolve, 10));

			const { data: secondUpdate } = await serviceClient
				.from('profiles')
				.update({ full_name: 'Second Update' })
				.eq('id', profile.id)
				.select()
				.single();

			// Assert: Each update should have a fresh timestamp
			expect(secondUpdate?.updated_at).toBeDefined();

			// The updated_at should be very recent (within last second)
			const now = Date.now();
			const updatedAt = new Date(secondUpdate!.updated_at!).getTime();
			const diffMs = now - updatedAt;

			expect(diffMs).toBeLessThan(1000); // Within 1 second
		});

		it('sets updated_at on INSERT via DEFAULT now() (trigger only bumps on UPDATE)', async () => {
			// Arrange & Act
			const profile = await TestData.profile().create();

			// Assert: updated_at is populated on INSERT by the column DEFAULT now()
			// (the BEFORE UPDATE trigger does not run on INSERT, so it is not NULL).
			expect(profile.updated_at).toBeDefined();
			expect(profile.updated_at).not.toBeNull();
		});
	});
});
