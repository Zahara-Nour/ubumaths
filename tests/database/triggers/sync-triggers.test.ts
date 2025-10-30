// @ts-nocheck - Database schema integration tests validated at runtime
/**
 * Class Synchronization Trigger Tests
 *
 * Tests for triggers that synchronize class_members table with profiles.class_ids array
 *
 * Triggers tested:
 * - sync_class_members_insert (AFTER INSERT on class_members) → sync_class_members_to_class_ids()
 * - sync_class_members_delete (AFTER DELETE on class_members) → sync_class_members_to_class_ids()
 *
 * Background:
 * - class_members is the source of truth for student-class relationships
 * - profiles.class_ids is kept in sync for backward compatibility with legacy code
 * - These triggers ensure both stay synchronized automatically
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

describe('Class Synchronization Triggers', () => {
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

	describe('sync_class_members_insert', () => {
		it('should add class_id to profiles.class_ids when student joins class', async () => {
			// Arrange: Create student and class
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).withName('Math 101').create();

			// Verify initial state: class_ids should be null or empty
			const { data: initialProfile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(initialProfile?.class_ids).toBeNull();

			// Act: Insert class membership (student joins class)
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			// Wait for trigger to execute
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: class_ids array should contain the class_id
			const { data: updatedProfile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(updatedProfile?.class_ids).toBeDefined();
			expect(updatedProfile?.class_ids).toContain(classRoom.id);
			expect(updatedProfile?.class_ids).toHaveLength(1);
		});

		it('should handle multiple class memberships correctly (array operations)', async () => {
			// Arrange: Create student and multiple classes
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const mathClass = await TestData.class(teacher.id).withName('Math 101').create();
			const physicsClass = await TestData.class(teacher.id).withName('Physics 201').create();
			const chemistryClass = await TestData.class(teacher.id).withName('Chemistry 301').create();

			// Act: Add student to first class
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: mathClass.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify first class added
			let { data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(profile?.class_ids).toHaveLength(1);
			expect(profile?.class_ids).toContain(mathClass.id);

			// Act: Add student to second class
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: physicsClass.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify both classes present
			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(profile?.class_ids).toHaveLength(2);
			expect(profile?.class_ids).toContain(mathClass.id);
			expect(profile?.class_ids).toContain(physicsClass.id);

			// Act: Add student to third class
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: chemistryClass.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: All three classes should be in array
			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(profile?.class_ids).toHaveLength(3);
			expect(profile?.class_ids).toContain(mathClass.id);
			expect(profile?.class_ids).toContain(physicsClass.id);
			expect(profile?.class_ids).toContain(chemistryClass.id);
		});

		it('should maintain array uniqueness (no duplicates)', async () => {
			// Arrange: Create student and class
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();

			// Act: Add student to class
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify initial membership
			let { data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(profile?.class_ids).toHaveLength(1);

			// Act: Try to add same class again (should fail at DB level due to unique constraint)
			// But if it somehow succeeds, the class_ids should still not have duplicates
			const { error: duplicateError } = await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			// Assert: Insertion should fail due to unique constraint on (student_id, class_id)
			expect(duplicateError).not.toBeNull();
			expect(duplicateError?.code).toBe('23505'); // PostgreSQL unique violation code

			// Even after failed attempt, class_ids should remain unchanged
			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(profile?.class_ids).toHaveLength(1);
			expect(profile?.class_ids).toContain(classRoom.id);
		});

		it('should only affect the specific student being added to class', async () => {
			// Arrange: Create multiple students and one class
			const student1 = await TestData.profile()
				.withRole('student')
				.withFullName('Student One')
				.create();
			const student2 = await TestData.profile()
				.withRole('student')
				.withFullName('Student Two')
				.create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();

			// Act: Add only student1 to class
			await serviceClient.from('class_members').insert({
				student_id: student1.id,
				class_id: classRoom.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Only student1 should have the class_id
			const { data: profile1 } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student1.id)
				.single();

			const { data: profile2 } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student2.id)
				.single();

			expect(profile1?.class_ids).toContain(classRoom.id);
			expect(profile2?.class_ids).toBeNull(); // student2 not affected
		});
	});

	describe('sync_class_members_delete', () => {
		it('should remove class_id from profiles.class_ids when student leaves class', async () => {
			// Arrange: Create student, class, and membership
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();

			// Add student to class
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify student is in class
			let { data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(profile?.class_ids).toContain(classRoom.id);

			// Act: Remove student from class
			await serviceClient
				.from('class_members')
				.delete()
				.eq('student_id', student.id)
				.eq('class_id', classRoom.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: class_ids should no longer contain the class_id
			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(profile?.class_ids).toBeDefined();
			expect(profile?.class_ids).not.toContain(classRoom.id);
			expect(profile?.class_ids).toHaveLength(0);
		});

		it('should remove only the deleted class, keeping other classes', async () => {
			// Arrange: Create student and multiple classes
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const mathClass = await TestData.class(teacher.id).withName('Math').create();
			const physicsClass = await TestData.class(teacher.id).withName('Physics').create();
			const chemistryClass = await TestData.class(teacher.id).withName('Chemistry').create();

			// Add student to all three classes
			await serviceClient.from('class_members').insert([
				{ student_id: student.id, class_id: mathClass.id },
				{ student_id: student.id, class_id: physicsClass.id },
				{ student_id: student.id, class_id: chemistryClass.id }
			]);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify all three classes present
			let { data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(profile?.class_ids).toHaveLength(3);

			// Act: Remove student from physics class only
			await serviceClient
				.from('class_members')
				.delete()
				.eq('student_id', student.id)
				.eq('class_id', physicsClass.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Only physics should be removed, math and chemistry remain
			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(profile?.class_ids).toHaveLength(2);
			expect(profile?.class_ids).toContain(mathClass.id);
			expect(profile?.class_ids).not.toContain(physicsClass.id);
			expect(profile?.class_ids).toContain(chemistryClass.id);
		});

		it('should set class_ids to empty array when last class is removed', async () => {
			// Arrange: Create student with one class
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();

			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify class exists
			let { data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(profile?.class_ids).toHaveLength(1);

			// Act: Remove the only class
			await serviceClient
				.from('class_members')
				.delete()
				.eq('student_id', student.id)
				.eq('class_id', classRoom.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: class_ids should be empty array (not null)
			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(profile?.class_ids).toBeDefined();
			expect(profile?.class_ids).toEqual([]);
			expect(profile?.class_ids).toHaveLength(0);
		});

		it('should only affect the specific student being removed from class', async () => {
			// Arrange: Create two students in the same class
			const student1 = await TestData.profile()
				.withRole('student')
				.withFullName('Student One')
				.create();
			const student2 = await TestData.profile()
				.withRole('student')
				.withFullName('Student Two')
				.create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();

			// Add both students to class
			await serviceClient.from('class_members').insert([
				{ student_id: student1.id, class_id: classRoom.id },
				{ student_id: student2.id, class_id: classRoom.id }
			]);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify both students have the class
			let { data: profile1 } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student1.id)
				.single();

			let { data: profile2 } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student2.id)
				.single();

			expect(profile1?.class_ids).toContain(classRoom.id);
			expect(profile2?.class_ids).toContain(classRoom.id);

			// Act: Remove only student1 from class
			await serviceClient
				.from('class_members')
				.delete()
				.eq('student_id', student1.id)
				.eq('class_id', classRoom.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Only student1 should be affected
			({ data: profile1 } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student1.id)
				.single());

			({ data: profile2 } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student2.id)
				.single());

			expect(profile1?.class_ids).not.toContain(classRoom.id); // student1 removed
			expect(profile2?.class_ids).toContain(classRoom.id); // student2 unchanged
		});
	});

	describe('Bidirectional Synchronization (INSERT + DELETE)', () => {
		it('should handle rapid add/remove cycles correctly', async () => {
			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const classRoom = await TestData.class(teacher.id).create();

			// Act: Add student
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Added
			let { data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(profile?.class_ids).toContain(classRoom.id);

			// Act: Remove student
			await serviceClient
				.from('class_members')
				.delete()
				.eq('student_id', student.id)
				.eq('class_id', classRoom.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Removed
			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(profile?.class_ids).not.toContain(classRoom.id);

			// Act: Add student again
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: classRoom.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Added again
			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(profile?.class_ids).toContain(classRoom.id);
		});

		it('should keep class_ids synchronized with class_members as source of truth', async () => {
			// This test verifies that class_ids always reflects class_members state

			// Arrange
			const student = await TestData.profile().withRole('student').create();
			const teacher = await TestData.profile().withRole('teacher').create();
			const class1 = await TestData.class(teacher.id).withName('Class 1').create();
			const class2 = await TestData.class(teacher.id).withName('Class 2').create();
			const class3 = await TestData.class(teacher.id).withName('Class 3').create();

			// Act: Add to class1 and class2
			await serviceClient.from('class_members').insert([
				{ student_id: student.id, class_id: class1.id },
				{ student_id: student.id, class_id: class2.id }
			]);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Both classes in array
			let { data: memberships } = await serviceClient
				.from('class_members')
				.select('class_id')
				.eq('student_id', student.id);

			let { data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single();

			expect(memberships).toHaveLength(2);
			expect(profile?.class_ids).toHaveLength(2);
			expect(profile?.class_ids).toEqual(
				expect.arrayContaining(memberships?.map((m) => m.class_id) || [])
			);

			// Act: Add class3
			await serviceClient.from('class_members').insert({
				student_id: student.id,
				class_id: class3.id
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Three classes now
			({ data: memberships } = await serviceClient
				.from('class_members')
				.select('class_id')
				.eq('student_id', student.id));

			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(memberships).toHaveLength(3);
			expect(profile?.class_ids).toHaveLength(3);

			// Act: Remove class2
			await serviceClient
				.from('class_members')
				.delete()
				.eq('student_id', student.id)
				.eq('class_id', class2.id);

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: class_ids matches class_members (class1, class3 only)
			({ data: memberships } = await serviceClient
				.from('class_members')
				.select('class_id')
				.eq('student_id', student.id));

			({ data: profile } = await serviceClient
				.from('profiles')
				.select('class_ids')
				.eq('id', student.id)
				.single());

			expect(memberships).toHaveLength(2);
			expect(profile?.class_ids).toHaveLength(2);
			expect(profile?.class_ids).toContain(class1.id);
			expect(profile?.class_ids).not.toContain(class2.id);
			expect(profile?.class_ids).toContain(class3.id);
		});
	});
});
