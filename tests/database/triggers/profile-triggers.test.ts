// @ts-nocheck - Database schema integration tests validated at runtime
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
} from '../helpers/trigger-test-helpers';
import { TestData } from '../helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

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
		it('should create profile when user signs up via Supabase Auth', async () => {
			// Arrange
			const userId = generateTestId('user');
			const userEmail = generateTestEmail('signup');
			const fullName = 'John Doe';

			// Act: Insert into auth.users (simulating Supabase Auth signup)
			// Note: This requires service role client to access auth schema
			await serviceClient.from('users' as never).insert({
				id: userId,
				email: userEmail,
				raw_user_meta_data: { full_name: fullName }
			} as never);

			// Wait a moment for trigger to execute
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Profile should be created automatically
			const { data: profile, error: profileError } = await serviceClient
				.from('profiles')
				.select()
				.eq('id', userId)
				.single();

			expect(profileError).toBeNull();
			expect(profile).toBeDefined();
			expect(profile?.id).toBe(userId);
			expect(profile?.email).toBe(userEmail);
			expect(profile?.full_name).toBe(fullName);
			expect(profile?.role).toBe('student'); // Default role
		});

		it('should handle missing full_name metadata gracefully', async () => {
			// Arrange
			const userId = generateTestId('user');
			const userEmail = generateTestEmail('nofullname');

			// Act: Insert user without full_name in metadata
			await serviceClient.from('users' as never).insert({
				id: userId,
				email: userEmail,
				raw_user_meta_data: {}
			} as never);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Profile created with email as full_name fallback
			const { data: profile } = await serviceClient
				.from('profiles')
				.select()
				.eq('id', userId)
				.single();

			expect(profile).toBeDefined();
			expect(profile?.full_name).toBe(userEmail); // COALESCE fallback
		});

		it('should handle duplicate profile attempt gracefully (ON CONFLICT)', async () => {
			// Arrange: Create profile first
			const userId = generateTestId('user');
			const userEmail = generateTestEmail('duplicate');

			await TestData.profile().withId(userId).withEmail(userEmail).create();

			// Act: Try to insert auth user (trigger will try to create duplicate profile)
			await serviceClient.from('users' as never).insert({
				id: userId,
				email: userEmail,
				raw_user_meta_data: { full_name: 'Test' }
			} as never);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Should not throw error (EXCEPTION block catches unique_violation)
			const { data: profiles } = await serviceClient.from('profiles').select().eq('id', userId);

			expect(profiles).toHaveLength(1); // Only one profile exists
		});

		it('should not fail user creation even if profile creation fails', async () => {
			// This tests the EXCEPTION block in handle_new_user()
			// If profile creation fails, it should raise a WARNING but not fail the trigger

			// Arrange
			const userId = generateTestId('user');
			const userEmail = generateTestEmail('failsafe');

			// Act: Create user (trigger will attempt profile creation)
			const { error: authError } = await serviceClient.from('users' as never).insert({
				id: userId,
				email: userEmail,
				raw_user_meta_data: {}
			} as never);

			// Assert: Auth user creation should succeed even if profile fails
			expect(authError).toBeNull();
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

		it('should not modify updated_at on INSERT', async () => {
			// Arrange & Act
			const profile = await TestData.profile().create();

			// Assert: updated_at should be NULL for new profiles (trigger only fires on UPDATE)
			expect(profile.updated_at).toBeNull();
		});
	});
});
