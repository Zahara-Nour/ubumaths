/**
 * Assignment Tracking Trigger Tests
 *
 * Tests for exercise completion tracking triggers
 *
 * Migration: supabase/migrations/20251027005912_create_exercise_assignments.sql
 *
 * Triggers tested:
 * - trigger_update_completion_last_viewed (BEFORE UPDATE on exercise_completions)
 *   → update_completion_last_viewed()
 *
 * Trigger behavior:
 * - Updates last_viewed_at when view_count increments
 * - WHEN: NEW.view_count > OLD.view_count
 * - Sets last_viewed_at = NOW()
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../helpers/trigger-test-helpers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

type ExerciseCompletion = Database['public']['Tables']['exercise_completions']['Row'];

describe('Exercise Completion Tracking Triggers', () => {
	let serviceClient: SupabaseClient<Database>;
	let testTeacher: Database['public']['Tables']['profiles']['Row'];
	let testStudent: Database['public']['Tables']['profiles']['Row'];
	let testExercise: Database['public']['Tables']['exercises']['Row'];

	beforeAll(async () => {
		serviceClient = createServiceRoleClient();
	});

	afterAll(async () => {
		await cleanupAllTestData();
		await closeConnections();
	});

	beforeEach(async () => {
		await cleanupAllTestData();

		// Create test teacher
		const { data: teacher } = await serviceClient
			.from('profiles')
			.insert({
				id: '550e8400-e29b-41d4-a716-446655440001',
				email: `teacher-${Date.now()}@test.com`,
				role: 'teacher',
				full_name: 'Test Teacher'
			})
			.select()
			.single();

		testTeacher = teacher!;

		// Create test student
		const { data: student } = await serviceClient
			.from('profiles')
			.insert({
				id: '550e8400-e29b-41d4-a716-446655440002',
				email: `student-${Date.now()}@test.com`,
				role: 'student',
				full_name: 'Test Student'
			})
			.select()
			.single();

		testStudent = student!;

		// Create test exercise
		const { data: exercise } = await serviceClient
			.from('exercises')
			.insert({
				created_by: testTeacher.id,
				difficulty: 1,
				statement_md: 'What is 2 + 2?',
				solution_md: 'The answer is 4',
				is_public: true
			})
			.select()
			.single();

		testExercise = exercise!;
	});

	/**
	 * Helper to create an exercise completion
	 */
	async function createCompletion(
		overrides?: Partial<Database['public']['Tables']['exercise_completions']['Insert']>
	): Promise<ExerciseCompletion> {
		const { data, error } = await serviceClient
			.from('exercise_completions')
			.insert({
				exercise_id: testExercise.id,
				student_id: testStudent.id,
				view_count: 1,
				...overrides
			})
			.select()
			.single();

		if (error) throw error;
		return data;
	}

	describe('trigger_update_completion_last_viewed (BEFORE UPDATE)', () => {
		it('should update last_viewed_at when view_count increases', async () => {
			// Arrange: Create completion with initial view
			const completion = await createCompletion({ view_count: 1 });
			const originalLastViewedAt = completion.last_viewed_at;

			// Wait to ensure timestamp will be different
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Act: Increment view_count
			const { data: updated } = await serviceClient
				.from('exercise_completions')
				.update({ view_count: 2 })
				.eq('id', completion.id)
				.select()
				.single();

			// Assert: last_viewed_at should be updated
			expect(updated).toBeDefined();
			expect(updated!.view_count).toBe(2);
			expect(updated!.last_viewed_at).toBeDefined();

			// last_viewed_at should be more recent than original
			const originalTime = new Date(originalLastViewedAt).getTime();
			const updatedTime = new Date(updated!.last_viewed_at).getTime();

			expect(updatedTime).toBeGreaterThan(originalTime);
		});

		it('should NOT update last_viewed_at when view_count does not change', async () => {
			// Arrange
			const completion = await createCompletion({ view_count: 5 });
			const originalLastViewedAt = completion.last_viewed_at;

			// Wait
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Act: Update completed_at without changing view_count
			const { data: updated } = await serviceClient
				.from('exercise_completions')
				.update({ completed_at: new Date().toISOString() })
				.eq('id', completion.id)
				.select()
				.single();

			// Assert: last_viewed_at should NOT change (WHEN clause prevents trigger)
			expect(updated).toBeDefined();
			expect(updated!.last_viewed_at).toBe(originalLastViewedAt);
		});

		it('should update last_viewed_at on multiple view increments', async () => {
			// Arrange
			const completion = await createCompletion({ view_count: 1 });

			// Act: Simulate student viewing exercise multiple times
			const timestamps: string[] = [completion.last_viewed_at];

			for (let i = 2; i <= 5; i++) {
				await new Promise((resolve) => setTimeout(resolve, 10));

				const { data: updated } = await serviceClient
					.from('exercise_completions')
					.update({ view_count: i })
					.eq('id', completion.id)
					.select()
					.single();

				timestamps.push(updated!.last_viewed_at);
			}

			// Assert: Each view should have updated last_viewed_at
			expect(timestamps).toHaveLength(5);

			// Verify timestamps are monotonically increasing
			for (let i = 1; i < timestamps.length; i++) {
				const prevTime = new Date(timestamps[i - 1]).getTime();
				const currTime = new Date(timestamps[i]).getTime();
				expect(currTime).toBeGreaterThanOrEqual(prevTime);
			}
		});

		it('should set last_viewed_at to NOW() (recent timestamp)', async () => {
			// Arrange
			const completion = await createCompletion({ view_count: 1 });

			// Act: Increment view count
			const { data: updated } = await serviceClient
				.from('exercise_completions')
				.update({ view_count: 2 })
				.eq('id', completion.id)
				.select()
				.single();

			// Assert: last_viewed_at should be very recent (within 2 seconds)
			const now = Date.now();
			const lastViewedTime = new Date(updated!.last_viewed_at).getTime();
			const diffMs = now - lastViewedTime;

			expect(diffMs).toBeLessThan(2000); // Within 2 seconds
		});

		it('should handle view_count decrease gracefully (edge case)', async () => {
			// Arrange: Create completion with higher view count
			const completion = await createCompletion({ view_count: 10 });
			const originalLastViewedAt = completion.last_viewed_at;

			// Wait
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Act: Decrease view_count (unlikely in production, but test WHEN clause)
			const { data: updated } = await serviceClient
				.from('exercise_completions')
				.update({ view_count: 5 })
				.eq('id', completion.id)
				.select()
				.single();

			// Assert: last_viewed_at should NOT update (WHEN: NEW > OLD)
			expect(updated).toBeDefined();
			expect(updated!.view_count).toBe(5);
			expect(updated!.last_viewed_at).toBe(originalLastViewedAt);
		});

		it('should NOT fire on INSERT (trigger is BEFORE UPDATE only)', async () => {
			// Arrange & Act: Create new completion
			const completion = await createCompletion({ view_count: 3 });

			// Assert: last_viewed_at is set by DEFAULT NOW() (not trigger)
			expect(completion.last_viewed_at).toBeDefined();

			// Verify it's recent (from DEFAULT, not trigger)
			const now = Date.now();
			const lastViewedTime = new Date(completion.last_viewed_at).getTime();
			const diffMs = now - lastViewedTime;

			expect(diffMs).toBeLessThan(2000); // Within 2 seconds
		});
	});

	describe('Integration with completion workflow', () => {
		it('should track last viewed correctly in student practice session', async () => {
			// Arrange: Student starts practicing an exercise
			const completion = await createCompletion({ view_count: 1, completed_at: null });

			// Act: Simulate realistic practice session
			// View 1: Initial load (already created)
			const initialLastViewed = completion.last_viewed_at;

			await new Promise((resolve) => setTimeout(resolve, 100));

			// View 2: Student returns to exercise
			const { data: view2 } = await serviceClient
				.from('exercise_completions')
				.update({ view_count: 2 })
				.eq('id', completion.id)
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// View 3: Student checks answer again
			const { data: view3 } = await serviceClient
				.from('exercise_completions')
				.update({ view_count: 3 })
				.eq('id', completion.id)
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// View 4: Student marks as complete
			const { data: completed } = await serviceClient
				.from('exercise_completions')
				.update({
					view_count: 4,
					completed_at: new Date().toISOString()
				})
				.eq('id', completion.id)
				.select()
				.single();

			// Assert: Each view updated last_viewed_at
			const times = [
				new Date(initialLastViewed).getTime(),
				new Date(view2!.last_viewed_at).getTime(),
				new Date(view3!.last_viewed_at).getTime(),
				new Date(completed!.last_viewed_at).getTime()
			];

			// Verify progression
			expect(times[1]).toBeGreaterThan(times[0]);
			expect(times[2]).toBeGreaterThan(times[1]);
			expect(times[3]).toBeGreaterThan(times[2]);

			// Final completion should have both completed_at and updated last_viewed_at
			expect(completed!.completed_at).toBeDefined();
			expect(completed!.view_count).toBe(4);
		});

		it('should support "recently viewed" feature with accurate timestamps', async () => {
			// Arrange: Create multiple completions for different exercises
			const exercises = await Promise.all([
				serviceClient
					.from('exercises')
					.insert({
						created_by: testTeacher.id,
						difficulty: 1,
						statement_md: 'Exercise 1?',
						solution_md: 'Answer: 1',
						is_public: true
					})
					.select()
					.single(),
				serviceClient
					.from('exercises')
					.insert({
						created_by: testTeacher.id,
						difficulty: 1,
						statement_md: 'Exercise 2?',
						solution_md: 'Answer: 2',
						is_public: true
					})
					.select()
					.single(),
				serviceClient
					.from('exercises')
					.insert({
						created_by: testTeacher.id,
						difficulty: 1,
						statement_md: 'Exercise 3?',
						solution_md: 'Answer: 3',
						is_public: true
					})
					.select()
					.single()
			]);

			// Create completions
			const comp1 = await serviceClient
				.from('exercise_completions')
				.insert({
					exercise_id: exercises[0].data!.id,
					student_id: testStudent.id,
					view_count: 1
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 50));

			await serviceClient
				.from('exercise_completions')
				.insert({
					exercise_id: exercises[1].data!.id,
					student_id: testStudent.id,
					view_count: 1
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 50));

			await serviceClient
				.from('exercise_completions')
				.insert({
					exercise_id: exercises[2].data!.id,
					student_id: testStudent.id,
					view_count: 1
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Act: Student views exercise 1 again (making it most recent)
			await serviceClient
				.from('exercise_completions')
				.update({ view_count: 2 })
				.eq('id', comp1.data!.id);

			// Assert: Query "recently viewed" (ordered by last_viewed_at DESC)
			const { data: recentlyViewed } = await serviceClient
				.from('exercise_completions')
				.select()
				.eq('student_id', testStudent.id)
				.order('last_viewed_at', { ascending: false });

			// Exercise 1 should be first (most recently viewed)
			expect(recentlyViewed).toHaveLength(3);
			expect(recentlyViewed![0].exercise_id).toBe(exercises[0].data!.id);
			expect(recentlyViewed![0].view_count).toBe(2);
		});

		it('should handle concurrent view tracking (multiple tabs)', async () => {
			// Arrange
			const completion = await createCompletion({ view_count: 1 });

			// Act: Simulate student opening exercise in multiple tabs
			// Each tab increments view_count sequentially
			const updatePromises = Array.from(
				{ length: 3 },
				(_, i) =>
					new Promise<void>((resolve) => {
						setTimeout(async () => {
							await serviceClient
								.from('exercise_completions')
								.update({ view_count: 2 + i })
								.eq('id', completion.id);
							resolve();
						}, i * 50);
					})
			);

			await Promise.all(updatePromises);

			// Assert: Final view_count should be 4 (1 + 3 increments)
			const { data: final } = await serviceClient
				.from('exercise_completions')
				.select()
				.eq('id', completion.id)
				.single();

			expect(final!.view_count).toBe(4);

			// last_viewed_at should be very recent
			const now = Date.now();
			const lastViewedTime = new Date(final!.last_viewed_at).getTime();
			const diffMs = now - lastViewedTime;

			expect(diffMs).toBeLessThan(3000); // Within 3 seconds
		});
	});

	describe('Edge cases', () => {
		it('should handle view_count = 0 to view_count = 1 transition', async () => {
			// Arrange: Manually create completion with view_count = 0 (edge case)
			const { data: completion } = await serviceClient
				.from('exercise_completions')
				.insert({
					exercise_id: testExercise.id,
					student_id: testStudent.id,
					view_count: 0 // Edge case: 0 initial views
				})
				.select()
				.single();

			const originalLastViewed = completion!.last_viewed_at;

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Act: First view
			const { data: updated } = await serviceClient
				.from('exercise_completions')
				.update({ view_count: 1 })
				.eq('id', completion!.id)
				.select()
				.single();

			// Assert: last_viewed_at should update (0 < 1)
			expect(updated!.view_count).toBe(1);
			expect(new Date(updated!.last_viewed_at).getTime()).toBeGreaterThan(
				new Date(originalLastViewed).getTime()
			);
		});

		it('should preserve completed_at when updating view_count', async () => {
			// Arrange: Create completed exercise
			const completedAt = new Date().toISOString();
			const completion = await createCompletion({
				view_count: 5,
				completed_at: completedAt
			});

			// Act: Increment view_count (student reviews completed exercise)
			const { data: updated } = await serviceClient
				.from('exercise_completions')
				.update({ view_count: 6 })
				.eq('id', completion.id)
				.select()
				.single();

			// Assert: completed_at should remain unchanged
			expect(updated!.completed_at).toBe(completedAt);
			expect(updated!.view_count).toBe(6);

			// But last_viewed_at should update
			expect(new Date(updated!.last_viewed_at).getTime()).toBeGreaterThan(
				new Date(completion.last_viewed_at).getTime()
			);
		});

		it('should handle NULL completed_at correctly', async () => {
			// Arrange
			const completion = await createCompletion({
				view_count: 1,
				completed_at: null
			});

			// Act: Increment views while still incomplete
			await serviceClient
				.from('exercise_completions')
				.update({ view_count: 2 })
				.eq('id', completion.id);

			await new Promise((resolve) => setTimeout(resolve, 10));

			await serviceClient
				.from('exercise_completions')
				.update({ view_count: 3 })
				.eq('id', completion.id);

			// Assert: completed_at should still be NULL
			const { data: final } = await serviceClient
				.from('exercise_completions')
				.select()
				.eq('id', completion.id)
				.single();

			expect(final!.completed_at).toBeNull();
			expect(final!.view_count).toBe(3);

			// last_viewed_at should be recent
			const now = Date.now();
			const lastViewedTime = new Date(final!.last_viewed_at).getTime();
			expect(now - lastViewedTime).toBeLessThan(2000);
		});
	});
});
