// @ts-nocheck - Database schema integration tests validated at runtime
/**
 * Error Monitoring Trigger Tests
 *
 * Tests for triggers related to error logging and monitoring
 *
 * Triggers tested:
 * - trigger_set_error_signature (BEFORE INSERT on error_logs)
 *   → set_error_signature()
 * - trigger_update_error_occurrence (AFTER INSERT on error_logs)
 *   → update_error_occurrence()
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

describe('Error Monitoring Triggers', () => {
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

	describe('trigger_set_error_signature (BEFORE INSERT)', () => {
		it('should generate error_signature on insert', async () => {
			// Arrange & Act
			const errorLog = await TestData.errorLog()
				.withType('client_js')
				.withMessage('TypeError: Cannot read property')
				.withFile('/src/components/Button.svelte', 42)
				.create();

			// Assert: error_signature should be generated
			expect(errorLog.error_signature).toBeDefined();
			expect(errorLog.error_signature).not.toBeNull();
			expect(errorLog.error_signature).toHaveLength(64); // SHA-256 hash is 64 hex chars
		});

		it('should produce same signature for identical errors', async () => {
			// Arrange
			const errorConfig = {
				error_type: 'client_js',
				message: 'ReferenceError: x is not defined',
				file_path: '/src/lib/utils.ts',
				line_number: 100
			};

			// Act: Create two identical errors
			const error1 = await serviceClient
				.from('error_logs')
				.insert({
					error_type: errorConfig.error_type,
					message: errorConfig.message,
					file_path: errorConfig.file_path,
					line_number: errorConfig.line_number,
					url: 'https://test.com/page'
				})
				.select()
				.single();

			const error2 = await serviceClient
				.from('error_logs')
				.insert({
					error_type: errorConfig.error_type,
					message: errorConfig.message,
					file_path: errorConfig.file_path,
					line_number: errorConfig.line_number,
					url: 'https://test.com/other-page' // Different URL shouldn't affect signature
				})
				.select()
				.single();

			// Assert: Both should have identical signatures
			expect(error1.data?.error_signature).toBeDefined();
			expect(error2.data?.error_signature).toBeDefined();
			expect(error1.data?.error_signature).toBe(error2.data?.error_signature);
		});

		it('should produce different signatures for different errors', async () => {
			// Arrange & Act
			const error1 = await TestData.errorLog()
				.withMessage('Error A')
				.withFile('/src/a.ts', 10)
				.create();

			const error2 = await TestData.errorLog()
				.withMessage('Error B')
				.withFile('/src/b.ts', 20)
				.create();

			// Assert: Signatures should be different
			expect(error1.error_signature).toBeDefined();
			expect(error2.error_signature).toBeDefined();
			expect(error1.error_signature).not.toBe(error2.error_signature);
		});

		it('should use SHA-256 hash algorithm (not MD5)', async () => {
			// Note: The requirement mentions MD5, but the migration uses SHA-256 (digest(..., 'sha256'))
			// This test validates the actual implementation

			// Arrange & Act
			const errorLog = await TestData.errorLog()
				.withMessage('Test error for hash validation')
				.withFile('/test.ts', 1)
				.create();

			// Assert: SHA-256 produces 64 character hex string
			expect(errorLog.error_signature).toHaveLength(64);
			expect(errorLog.error_signature).toMatch(/^[a-f0-9]{64}$/); // Hex format
		});

		it('should handle NULL values in signature generation', async () => {
			// Arrange & Act: Create error without file_path and line_number
			const errorLog = await TestData.errorLog().withMessage('Error without location').create();

			// Assert: Should still generate signature (COALESCE handles NULLs)
			expect(errorLog.error_signature).toBeDefined();
			expect(errorLog.error_signature).not.toBeNull();
		});

		it('should generate different signatures when line number differs', async () => {
			// Arrange & Act
			const error1 = await TestData.errorLog()
				.withMessage('Same error')
				.withFile('/src/app.ts', 100)
				.create();

			const error2 = await TestData.errorLog()
				.withMessage('Same error')
				.withFile('/src/app.ts', 200)
				.create();

			// Assert: Different line numbers should produce different signatures
			expect(error1.error_signature).not.toBe(error2.error_signature);
		});
	});

	describe('trigger_update_error_occurrence (AFTER INSERT)', () => {
		it('should create error_occurrence record on first error', async () => {
			// Arrange & Act
			const errorLog = await TestData.errorLog()
				.withMessage('First occurrence')
				.withFile('/src/first.ts', 10)
				.create();

			// Wait for trigger to execute
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: error_occurrence should be created
			const { data: occurrence } = await serviceClient
				.from('error_occurrences')
				.select()
				.eq('error_signature', errorLog.error_signature!)
				.single();

			expect(occurrence).toBeDefined();
			expect(occurrence?.occurrence_count).toBe(1);
			expect(occurrence?.error_signature).toBe(errorLog.error_signature);
			expect(occurrence?.error_type).toBe(errorLog.error_type);
			expect(occurrence?.message).toBe(errorLog.message);
			expect(occurrence?.last_error_log_id).toBe(errorLog.id);
		});

		it('should increment occurrence_count on duplicate error', async () => {
			// Arrange: Create first error
			const error1 = await TestData.errorLog()
				.withMessage('Duplicate error')
				.withFile('/src/dup.ts', 50)
				.create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Act: Create identical error
			const error2 = await serviceClient
				.from('error_logs')
				.insert({
					error_type: error1.error_type,
					message: error1.message,
					file_path: error1.file_path,
					line_number: error1.line_number,
					url: 'https://test.com/page'
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: occurrence_count should be 2
			const { data: occurrence } = await serviceClient
				.from('error_occurrences')
				.select()
				.eq('error_signature', error1.error_signature!)
				.single();

			expect(occurrence?.occurrence_count).toBe(2);
			expect(occurrence?.last_error_log_id).toBe(error2.data?.id);
		});

		it('should update last_occurred_at (last_seen) on duplicate', async () => {
			// Arrange: Create first error
			const error1 = await TestData.errorLog()
				.withMessage('Time tracking error')
				.withFile('/src/time.ts', 1)
				.create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			const { data: firstOccurrence } = await serviceClient
				.from('error_occurrences')
				.select()
				.eq('error_signature', error1.error_signature!)
				.single();

			const firstLastSeen = firstOccurrence?.last_seen;

			// Wait to ensure timestamps differ
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Act: Create duplicate error
			await serviceClient
				.from('error_logs')
				.insert({
					error_type: error1.error_type,
					message: error1.message,
					file_path: error1.file_path,
					line_number: error1.line_number,
					url: 'https://test.com/page'
				})
				.select()
				.single();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: last_seen should be updated
			const { data: updatedOccurrence } = await serviceClient
				.from('error_occurrences')
				.select()
				.eq('error_signature', error1.error_signature!)
				.single();

			expect(updatedOccurrence?.last_seen).toBeDefined();
			expect(new Date(updatedOccurrence!.last_seen).getTime()).toBeGreaterThan(
				new Date(firstLastSeen!).getTime()
			);
		});

		it('should track occurrence count correctly for multiple duplicates', async () => {
			// Arrange
			const errorConfig = {
				error_type: 'server_api' as const,
				message: 'API timeout error',
				file_path: '/src/api/users.ts',
				line_number: 75,
				url: 'https://test.com/api/users'
			};

			// Act: Create same error 5 times
			const errors: Array<{ id: string; error_signature: string | null }> = [];
			for (let i = 0; i < 5; i++) {
				const { data } = await serviceClient
					.from('error_logs')
					.insert(errorConfig)
					.select()
					.single();
				if (data) errors.push(data);
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: occurrence_count should be 5
			const { data: occurrence } = await serviceClient
				.from('error_occurrences')
				.select()
				.eq('error_signature', errors[0].error_signature!)
				.single();

			expect(occurrence?.occurrence_count).toBe(5);
			expect(occurrence?.last_error_log_id).toBe(errors[4].id);
		});

		it('should maintain separate occurrence counts for different errors', async () => {
			// Arrange & Act
			const errorA = await TestData.errorLog()
				.withMessage('Error Type A')
				.withFile('/src/a.ts', 1)
				.create();

			const errorB = await TestData.errorLog()
				.withMessage('Error Type B')
				.withFile('/src/b.ts', 1)
				.create();

			// Create duplicate of Error A
			await serviceClient.from('error_logs').insert({
				error_type: errorA.error_type,
				message: errorA.message,
				file_path: errorA.file_path,
				line_number: errorA.line_number,
				url: 'https://test.com/page'
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: Each error should have its own occurrence count
			const { data: occurrenceA } = await serviceClient
				.from('error_occurrences')
				.select()
				.eq('error_signature', errorA.error_signature!)
				.single();

			const { data: occurrenceB } = await serviceClient
				.from('error_occurrences')
				.select()
				.eq('error_signature', errorB.error_signature!)
				.single();

			expect(occurrenceA?.occurrence_count).toBe(2); // Original + 1 duplicate
			expect(occurrenceB?.occurrence_count).toBe(1); // Only original
		});

		it('should denormalize error details to error_occurrences', async () => {
			// Arrange & Act
			const errorLog = await TestData.errorLog()
				.withType('database')
				.withMessage('Unique constraint violation')
				.withFile('/src/db/users.ts', 123)
				.withUrl('https://test.com/signup')
				.withSeverity('critical')
				.create();

			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert: error_occurrences should have denormalized fields
			const { data: occurrence } = await serviceClient
				.from('error_occurrences')
				.select()
				.eq('error_signature', errorLog.error_signature!)
				.single();

			expect(occurrence?.error_type).toBe('database');
			expect(occurrence?.severity).toBe('critical');
			expect(occurrence?.message).toBe('Unique constraint violation');
			expect(occurrence?.url).toBe('https://test.com/signup');
			expect(occurrence?.file_path).toBe('/src/db/users.ts');
			expect(occurrence?.line_number).toBe(123);
		});
	});
});
