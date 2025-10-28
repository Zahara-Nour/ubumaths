/**
 * Geometry Trigger Tests
 *
 * Tests for triggers related to geometry exercise attempts
 *
 * Triggers tested:
 * - update_geometry_attempts_last_saved (BEFORE UPDATE on geometry_exercise_attempts)
 *   → update_attempt_last_saved_at()
 * - calculate_geometry_score (BEFORE INSERT OR UPDATE on geometry_exercise_attempts)
 *   → calculate_geometry_final_score()
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
	createServiceRoleClient,
	cleanupAllTestData,
	closeConnections
} from '../helpers/trigger-test-helpers';
import { TestData } from '../helpers/test-data-factory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

describe('Geometry Triggers', () => {
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

	describe('update_geometry_attempts_last_saved (BEFORE UPDATE)', () => {
		it('should update last_saved_at when status is in_progress', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();
			const attempt = await TestData.geometryExerciseAttempt(exercise.id, student.id).create();

			const originalLastSavedAt = attempt.last_saved_at;

			// Wait to ensure timestamp will be different
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Act: Update attempt while status is in_progress
			const { data: updatedAttempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.update({ current_step: 1 })
				.eq('id', attempt.id)
				.select()
				.single();

			// Assert: last_saved_at should be updated
			expect(updatedAttempt?.last_saved_at).toBeDefined();
			expect(updatedAttempt?.last_saved_at).not.toBe(originalLastSavedAt);
			expect(new Date(updatedAttempt!.last_saved_at).getTime()).toBeGreaterThan(
				new Date(originalLastSavedAt).getTime()
			);
		});

		it('should NOT update last_saved_at when status is submitted', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();
			const attempt = await TestData.geometryExerciseAttempt(exercise.id, student.id)
				.withStatus('submitted')
				.create();

			const originalLastSavedAt = attempt.last_saved_at;

			// Wait to ensure we can detect if timestamp changes
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Act: Update attempt when status is submitted
			const { data: updatedAttempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.update({ teacher_feedback: 'Good work!' })
				.eq('id', attempt.id)
				.select()
				.single();

			// Assert: last_saved_at should NOT be updated (trigger condition not met)
			expect(updatedAttempt?.last_saved_at).toBe(originalLastSavedAt);
		});

		it('should NOT update last_saved_at when status is completed', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();
			const attempt = await TestData.geometryExerciseAttempt(exercise.id, student.id)
				.withStatus('graded')
				.create();

			const originalLastSavedAt = attempt.last_saved_at;

			// Wait to ensure we can detect if timestamp changes
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Act: Update attempt when status is graded
			const { data: updatedAttempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.update({ teacher_feedback: 'Excellent!' })
				.eq('id', attempt.id)
				.select()
				.single();

			// Assert: last_saved_at should NOT be updated
			expect(updatedAttempt?.last_saved_at).toBe(originalLastSavedAt);
		});
	});

	describe('calculate_geometry_score (BEFORE INSERT OR UPDATE)', () => {
		it('should calculate final_score correctly on INSERT', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();

			// Act: Insert attempt with raw_score and penalties
			const { data: attempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.insert({
					exercise_id: exercise.id,
					student_id: student.id,
					status: 'in_progress',
					raw_score: 80,
					hint_penalties: 10,
					time_penalties: 5
				})
				.select()
				.single();

			// Assert: final_score = 80 - 10 - 5 = 65
			expect(attempt?.final_score).toBe(65);
			expect(attempt?.raw_score).toBe(80);
			expect(attempt?.hint_penalties).toBe(10);
			expect(attempt?.time_penalties).toBe(5);
		});

		it('should calculate final_score correctly on UPDATE', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();
			const attempt = await TestData.geometryExerciseAttempt(exercise.id, student.id).create();

			// Act: Update with raw_score and penalties
			const { data: updatedAttempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.update({
					raw_score: 90,
					hint_penalties: 15,
					time_penalties: 10
				})
				.eq('id', attempt.id)
				.select()
				.single();

			// Assert: final_score = 90 - 15 - 10 = 65
			expect(updatedAttempt?.final_score).toBe(65);
			expect(updatedAttempt?.raw_score).toBe(90);
		});

		it('should subtract penalties from raw_score correctly', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();

			// Act: Create attempt with various penalty scenarios
			const { data: attempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.insert({
					exercise_id: exercise.id,
					student_id: student.id,
					status: 'submitted',
					raw_score: 100,
					hint_penalties: 25,
					time_penalties: 15
				})
				.select()
				.single();

			// Assert: 100 - 25 - 15 = 60
			expect(attempt?.final_score).toBe(60);
		});

		it('should ensure final_score never goes negative (GREATEST function)', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();

			// Act: Create attempt where penalties exceed raw_score
			const { data: attempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.insert({
					exercise_id: exercise.id,
					student_id: student.id,
					status: 'submitted',
					raw_score: 30,
					hint_penalties: 25,
					time_penalties: 20
				})
				.select()
				.single();

			// Assert: GREATEST(0, 30 - 25 - 20) = GREATEST(0, -15) = 0
			expect(attempt?.final_score).toBe(0);
			expect(attempt?.final_score).toBeGreaterThanOrEqual(0);
		});

		it('should NOT calculate final_score when raw_score is NULL', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();

			// Act: Create attempt without raw_score
			const { data: attempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.insert({
					exercise_id: exercise.id,
					student_id: student.id,
					status: 'in_progress',
					hint_penalties: 10,
					time_penalties: 5
				})
				.select()
				.single();

			// Assert: final_score should be NULL (trigger condition WHEN raw_score IS NOT NULL)
			expect(attempt?.final_score).toBeNull();
			expect(attempt?.raw_score).toBeNull();
		});

		it('should handle zero penalties correctly', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();

			// Act: Create attempt with no penalties
			const { data: attempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.insert({
					exercise_id: exercise.id,
					student_id: student.id,
					status: 'submitted',
					raw_score: 95,
					hint_penalties: 0,
					time_penalties: 0
				})
				.select()
				.single();

			// Assert: final_score equals raw_score
			expect(attempt?.final_score).toBe(95);
			expect(attempt?.raw_score).toBe(95);
		});

		it('should recalculate final_score when penalties change', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const student = await TestData.profile().withRole('student').create();
			const exercise = await TestData.geometryExercise(teacher.id).create();
			const attempt = await TestData.geometryExerciseAttempt(exercise.id, student.id)
				.withRawScore(100)
				.withHintPenalties(10)
				.withTimePenalties(5)
				.create();

			// Initial: 100 - 10 - 5 = 85
			expect(attempt.final_score).toBe(85);

			// Act: Update penalties
			const { data: updatedAttempt } = await serviceClient
				.from('geometry_exercise_attempts')
				.update({
					hint_penalties: 20,
					time_penalties: 15
				})
				.eq('id', attempt.id)
				.select()
				.single();

			// Assert: Recalculated to 100 - 20 - 15 = 65
			expect(updatedAttempt?.final_score).toBe(65);
		});
	});
});
