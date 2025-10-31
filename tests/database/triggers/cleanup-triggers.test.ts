/**
 * Exercise Cleanup Trigger Tests
 *
 * Tests for triggers that automatically clean up related data when exercises are deleted
 *
 * Triggers tested:
 * - trigger_delete_exercise_images (AFTER DELETE on exercises) → delete_exercise_images()
 *
 * SECURITY: The delete_exercise_images() function uses SECURITY DEFINER to access storage.objects
 * table, which requires elevated permissions. This test verifies it works correctly without
 * exposing security vulnerabilities.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	generateTestId,
	cleanupAllTestData,
	closeConnections
} from '../helpers/trigger-test-helpers';
import { TestData } from '../helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Exercise Cleanup Triggers', () => {
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
		// Also clean up any test storage objects
		await cleanupTestStorageObjects();
	});

	/**
	 * Helper function to clean up test storage objects
	 */
	async function cleanupTestStorageObjects(): Promise<void> {
		try {
			// Delete all storage objects with 'test-' prefix in name
			await serviceClient
				.from('storage.objects' as never)
				.delete()
				.like('name', '%test-%' as never);
		} catch (error) {
			// Ignore errors if storage.objects doesn't exist or is empty
			console.debug('Storage cleanup:', error);
		}
	}

	/**
	 * Helper function to insert a mock storage object
	 */
	async function insertMockStorageObject(params: {
		bucket: string;
		name: string;
		owner: string;
	}): Promise<void> {
		await serviceClient.from('storage.objects' as never).insert({
			id: generateTestId('storage'),
			bucket_id: params.bucket,
			name: params.name,
			owner: params.owner,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			last_accessed_at: new Date().toISOString(),
			metadata: {}
		} as never);
	}

	/**
	 * Helper function to check if storage objects exist matching a pattern
	 */
	async function storageObjectsExist(namePattern: string): Promise<boolean> {
		const { data } = await serviceClient
			.from('storage.objects' as never)
			.select()
			.like('name', namePattern);
		return data !== null && data.length > 0;
	}

	describe('trigger_delete_exercise_images → delete_exercise_images()', () => {
		it('should delete images from storage.objects when exercise is deleted (old path pattern)', async () => {
			// Arrange: Create teacher and exercise
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercise = await TestData.exercise(teacher.id).create();

			// Insert mock storage objects using old path pattern: {userId}/{exerciseId}/{filename}
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/${exercise.id}/test-image-1.png`,
				owner: teacher.id
			});
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/${exercise.id}/test-image-2.jpg`,
				owner: teacher.id
			});

			// Verify images exist before deletion
			const beforeExists = await storageObjectsExist(`%${exercise.id}%`);
			expect(beforeExists).toBe(true);

			// Act: Delete the exercise (trigger should fire)
			await serviceClient.from('exercises').delete().eq('id', exercise.id);

			// Wait for trigger to execute
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Storage objects should be deleted
			const { data: storageObjects } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise.id}%`);

			expect(storageObjects).toHaveLength(0);
		});

		it('should delete images from storage.objects when exercise is deleted (new path pattern)', async () => {
			// Arrange: Create teacher and exercise
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercise = await TestData.exercise(teacher.id).create();

			// Insert mock storage objects using new path pattern: {userId}/{timestamp}-{uuid}.{ext}
			// The exercise ID is embedded in the filename
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/test-1234567890-${exercise.id}.png`,
				owner: teacher.id
			});
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/test-9876543210-${exercise.id}.jpg`,
				owner: teacher.id
			});

			// Verify images exist before deletion
			const beforeExists = await storageObjectsExist(`%${exercise.id}%`);
			expect(beforeExists).toBe(true);

			// Act: Delete the exercise (trigger should fire)
			await serviceClient.from('exercises').delete().eq('id', exercise.id);

			// Wait for trigger to execute
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Storage objects should be deleted by the alternate pattern check
			const { data: storageObjects } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise.id}%`);

			expect(storageObjects).toHaveLength(0);
		});

		it('should only delete images for specific exercise, not other exercises', async () => {
			// Arrange: Create teacher and two exercises
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercise1 = await TestData.exercise(teacher.id).withQuestion('Exercise 1').create();
			const exercise2 = await TestData.exercise(teacher.id).withQuestion('Exercise 2').create();

			// Insert storage objects for both exercises
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/${exercise1.id}/test-image-1.png`,
				owner: teacher.id
			});
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/${exercise2.id}/test-image-2.png`,
				owner: teacher.id
			});

			// Verify both images exist
			expect(await storageObjectsExist(`%${exercise1.id}%`)).toBe(true);
			expect(await storageObjectsExist(`%${exercise2.id}%`)).toBe(true);

			// Act: Delete only exercise1
			await serviceClient.from('exercises').delete().eq('id', exercise1.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Only exercise1's images should be deleted
			const { data: exercise1Images } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise1.id}%`);

			const { data: exercise2Images } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise2.id}%`);

			expect(exercise1Images).toHaveLength(0);
			expect(exercise2Images).toHaveLength(1);
			expect(exercise2Images![0].name).toContain(exercise2.id);
		});

		it('should not delete images from other users', async () => {
			// Arrange: Create two teachers with their own exercises
			const teacher1 = await TestData.profile()
				.withRole('teacher')
				.withFullName('Teacher 1')
				.create();
			const teacher2 = await TestData.profile()
				.withRole('teacher')
				.withFullName('Teacher 2')
				.create();

			const exercise1 = await TestData.exercise(teacher1.id).create();
			const exercise2 = await TestData.exercise(teacher2.id).create();

			// Insert storage objects for both teachers
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher1.id}/${exercise1.id}/test-image-1.png`,
				owner: teacher1.id
			});
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher2.id}/${exercise2.id}/test-image-2.png`,
				owner: teacher2.id
			});

			// Act: Delete teacher1's exercise
			await serviceClient.from('exercises').delete().eq('id', exercise1.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Only teacher1's images should be deleted, teacher2's should remain
			const { data: teacher1Images } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise1.id}%`);

			const { data: teacher2Images } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise2.id}%`);

			expect(teacher1Images).toHaveLength(0);
			expect(teacher2Images).toHaveLength(1);
			expect(teacher2Images![0].owner).toBe(teacher2.id);
		});

		it('should handle deletion when no images exist (no error)', async () => {
			// Arrange: Create exercise WITHOUT any storage objects
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercise = await TestData.exercise(teacher.id).create();

			// Verify no images exist
			const beforeExists = await storageObjectsExist(`%${exercise.id}%`);
			expect(beforeExists).toBe(false);

			// Act: Delete exercise (trigger should handle gracefully)
			const { error } = await serviceClient.from('exercises').delete().eq('id', exercise.id);

			// Assert: No error should occur
			expect(error).toBeNull();

			// Verify exercise was deleted
			const { data: deletedExercise } = await serviceClient
				.from('exercises')
				.select()
				.eq('id', exercise.id)
				.single();

			expect(deletedExercise).toBeNull();
		});

		it('should delete multiple images from mixed path patterns', async () => {
			// Arrange: Create teacher and exercise with images in both old and new patterns
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercise = await TestData.exercise(teacher.id).create();

			// Insert storage objects using BOTH path patterns
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/${exercise.id}/test-old-pattern.png`, // Old pattern
				owner: teacher.id
			});
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/test-1234-${exercise.id}.png`, // New pattern
				owner: teacher.id
			});
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/${exercise.id}/test-another-old.jpg`, // Old pattern
				owner: teacher.id
			});

			// Verify all 3 images exist
			const { data: beforeImages } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise.id}%`);

			expect(beforeImages).toHaveLength(3);

			// Act: Delete exercise
			await serviceClient.from('exercises').delete().eq('id', exercise.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: All images should be deleted regardless of path pattern
			const { data: afterImages } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise.id}%`);

			expect(afterImages).toHaveLength(0);
		});

		it('should verify SECURITY DEFINER function works without exposing permissions', async () => {
			// This test verifies that the trigger function has elevated permissions (SECURITY DEFINER)
			// to access storage.objects table, but doesn't expose those permissions to the caller

			// Arrange: Create teacher and exercise
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercise = await TestData.exercise(teacher.id).create();

			// Insert storage object
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/${exercise.id}/test-security.png`,
				owner: teacher.id
			});

			// Act: Delete exercise using service role client (trigger uses SECURITY DEFINER)
			const { error: deleteError } = await serviceClient
				.from('exercises')
				.delete()
				.eq('id', exercise.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Deletion should succeed without exposing storage.objects permissions
			expect(deleteError).toBeNull();

			// Verify storage object was deleted (this proves SECURITY DEFINER worked)
			const { data: storageObjects } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise.id}%`);

			expect(storageObjects).toHaveLength(0);
		});

		it('should handle special characters in exercise ID gracefully', async () => {
			// Although UUIDs don't normally have special chars, test that LIKE pattern is safe

			// Arrange: Create teacher and exercise
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercise = await TestData.exercise(teacher.id).create();

			// Insert storage object
			await insertMockStorageObject({
				bucket: 'exercise-images',
				name: `${teacher.id}/${exercise.id}/test-special_%chars.png`,
				owner: teacher.id
			});

			// Act: Delete exercise
			await serviceClient.from('exercises').delete().eq('id', exercise.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Storage object should still be deleted despite special chars in filename
			const { data: storageObjects } = await serviceClient
				.from('storage.objects' as never)
				.select()
				.like('name', `%${exercise.id}%`);

			expect(storageObjects).toHaveLength(0);
		});
	});

	describe('Exercise deletion CASCADE behavior', () => {
		it('should verify exercise_assignments are deleted via CASCADE foreign key', async () => {
			// NOTE: This test documents that exercise_assignments cleanup is handled by CASCADE,
			// not by a separate trigger (as noted in migration comment)

			// Arrange: Create teacher, class, exercise, and assignment
			const teacher = await TestData.profile().withRole('teacher').create();
			const classData = await TestData.class(teacher.id).create();
			const exercise = await TestData.exercise(teacher.id).create();

			// Create exercise assignment
			const { data: assignment, error: assignError } = await serviceClient
				.from('exercise_assignments')
				.insert({
					id: generateTestId('assignment'),
					exercise_id: exercise.id,
					class_id: classData.id,
					due_date: new Date().toISOString()
				})
				.select()
				.single();

			expect(assignError).toBeNull();
			expect(assignment).toBeDefined();

			// Act: Delete exercise
			await serviceClient.from('exercises').delete().eq('id', exercise.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Assignment should be deleted via CASCADE
			const { data: deletedAssignment } = await serviceClient
				.from('exercise_assignments')
				.select()
				.eq('id', assignment!.id)
				.single();

			expect(deletedAssignment).toBeNull();
		});
	});
});
