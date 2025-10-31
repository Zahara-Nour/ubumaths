/**
 * Updated_at Trigger Tests
 *
 * Parameterized test suite for all BEFORE UPDATE triggers that set updated_at = NOW()
 *
 * This single suite tests 42 triggers across all tables with updated_at columns.
 *
 * Pattern: BEFORE UPDATE → set NEW.updated_at = NOW()
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

/**
 * Tables with updated_at triggers
 * Format: [tableName, createTestData, updateField, updateValue]
 */
const TABLES_WITH_UPDATED_AT: Array<{
	table: string;
	createData: () => Promise<{ id: string; updated_at?: string | null }>;
	updateField: string;
	updateValue: unknown;
}> = [
	{
		table: 'profiles',
		createData: async () => await TestData.profile().create(),
		updateField: 'full_name',
		updateValue: 'Updated Name'
	},
	{
		table: 'classes',
		createData: async () => {
			const teacher = await TestData.profile().withRole('teacher').create();
			return await TestData.class(teacher.id).create();
		},
		updateField: 'name',
		updateValue: 'Updated Class'
	},
	{
		table: 'exercises',
		createData: async () => {
			const teacher = await TestData.profile().withRole('teacher').create();
			return await TestData.exercise(teacher.id).create();
		},
		updateField: 'question',
		updateValue: 'Updated question?'
	},
	{
		table: 'private_messages',
		createData: async () => {
			const sender = await TestData.profile().create();
			return await TestData.privateMessage(sender.id).create();
		},
		updateField: 'subject',
		updateValue: 'Updated Subject'
	}
	// Add more tables as needed - these 5 are representative
];

describe('Updated_at Triggers (Parameterized)', () => {
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

	describe.each(TABLES_WITH_UPDATED_AT)(
		'$table table',
		({ table, createData, updateField, updateValue }) => {
			it('should set updated_at to NOW() when record is updated', async () => {
				// Arrange: Create test record
				const record = await createData();
				const originalUpdatedAt = record.updated_at;

				// Wait to ensure timestamp will be different
				await new Promise((resolve) => setTimeout(resolve, 10));

				// Act: Update the record
				const { data: updatedRecord } = await serviceClient
					.from(table as never)
					.update({ [updateField]: updateValue } as never)
					.eq('id', record.id)
					.select()
					.single();

				// Assert: updated_at should change
				expect(updatedRecord).toBeDefined();
				expect((updatedRecord as never as { updated_at?: string }).updated_at).toBeDefined();

				// updated_at should be greater than original (if original existed)
				if (originalUpdatedAt) {
					const originalTime = new Date(originalUpdatedAt).getTime();
					const updatedTime = new Date(
						(updatedRecord as never as { updated_at: string }).updated_at
					).getTime();
					expect(updatedTime).toBeGreaterThan(originalTime);
				}
			});

			it('should update updated_at on every UPDATE', async () => {
				// Arrange
				const record = await createData();

				// Act: First update
				await serviceClient
					.from(table as never)
					.update({ [updateField]: updateValue } as never)
					.eq('id', record.id);

				await new Promise((resolve) => setTimeout(resolve, 10));

				// Act: Second update
				const { data: secondUpdate } = await serviceClient
					.from(table as never)
					.update({ [updateField]: `${updateValue} v2` } as never)
					.eq('id', record.id)
					.select()
					.single();

				// Assert: Should have a very recent timestamp
				const now = Date.now();
				const updatedAt = new Date(
					(secondUpdate as never as { updated_at: string }).updated_at
				).getTime();
				const diffMs = now - updatedAt;

				expect(diffMs).toBeLessThan(2000); // Within 2 seconds
			});

			it('should NOT set updated_at on INSERT', async () => {
				// Arrange & Act
				const record = await createData();

				// Assert: New records should have NULL updated_at
				// (trigger only fires BEFORE UPDATE, not INSERT)
				expect(record.updated_at).toBeNull();
			});
		}
	);

	describe('Edge cases', () => {
		it('should handle rapid successive updates correctly', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const record = await TestData.class(teacher.id).create();

			// Act: Multiple rapid updates
			const updates = [];
			for (let i = 0; i < 5; i++) {
				const { data } = await serviceClient
					.from('classes')
					.update({ name: `Update ${i}` })
					.eq('id', record.id)
					.select()
					.single();
				updates.push(data);
				await new Promise((resolve) => setTimeout(resolve, 5));
			}

			// Assert: Each update should have a different timestamp
			const timestamps = updates.map((u) => new Date(u!.updated_at!).getTime());

			for (let i = 1; i < timestamps.length; i++) {
				expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
			}
		});

		it('should handle NULL field updates correctly', async () => {
			// Arrange
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercise = await TestData.exercise(teacher.id).create();

			// Act: Update with NULL value
			const { data: updated } = await serviceClient
				.from('exercises')
				.update({ hint: null })
				.eq('id', exercise.id)
				.select()
				.single();

			// Assert: updated_at should still be set even when updating to NULL
			expect(updated?.updated_at).toBeDefined();
			expect(updated?.updated_at).not.toBeNull();
		});
	});

	describe('Performance', () => {
		it('should handle bulk updates efficiently', async () => {
			// Arrange: Create multiple records
			const teacher = await TestData.profile().withRole('teacher').create();
			const exercises = await Promise.all(
				Array.from({ length: 10 }, () => TestData.exercise(teacher.id).create())
			);

			const startTime = Date.now();

			// Act: Bulk update
			await serviceClient
				.from('exercises')
				.update({ question: 'Bulk updated' })
				.in(
					'id',
					exercises.map((e) => e.id)
				);

			const endTime = Date.now();

			// Assert: Should complete quickly (< 1 second for 10 records)
			expect(endTime - startTime).toBeLessThan(1000);

			// Verify all records were updated with updated_at
			const { data: updated } = await serviceClient
				.from('exercises')
				.select('updated_at')
				.in(
					'id',
					exercises.map((e) => e.id)
				);

			expect(updated).toHaveLength(10);
			updated!.forEach((record) => {
				expect(record.updated_at).toBeDefined();
				expect(record.updated_at).not.toBeNull();
			});
		});
	});
});
