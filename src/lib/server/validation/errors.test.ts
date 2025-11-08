/**
 * Tests for error validation schemas
 */

import { describe, it, expect } from 'vitest';
import { bulkResolveErrorsSchema } from './errors';

describe('bulkResolveErrorsSchema', () => {
	// ============================================================================
	// VALID CASES
	// ============================================================================

	describe('valid requests', () => {
		it('should accept valid request with error_type filter', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				error_type: 'client_js'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.error_type).toBe('client_js');
			}
		});

		it('should accept valid request with severity filter', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				severity: 'critical'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.severity).toBe('critical');
			}
		});

		it('should accept valid request with multiple filters and notes', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				error_type: 'server_api',
				severity: 'error',
				notes: 'Fixed in v1.2.0'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.error_type).toBe('server_api');
				expect(result.data.severity).toBe('error');
				expect(result.data.notes).toBe('Fixed in v1.2.0');
			}
		});

		it('should accept request with date range filters', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				date_from: '2025-01-01T00:00:00Z',
				date_to: '2025-01-31T23:59:59Z'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.date_from).toBe('2025-01-01T00:00:00Z');
				expect(result.data.date_to).toBe('2025-01-31T23:59:59Z');
			}
		});

		it('should accept all valid error_type values', () => {
			const validTypes = [
				'client_js',
				'server_api',
				'server_load',
				'server_action',
				'validation',
				'performance',
				'database'
			] as const;

			validTypes.forEach((type) => {
				const result = bulkResolveErrorsSchema.safeParse({ error_type: type });
				expect(result.success).toBe(true);
			});
		});

		it('should accept all valid severity values', () => {
			const validSeverities = ['info', 'warning', 'error', 'critical'] as const;

			validSeverities.forEach((severity) => {
				const result = bulkResolveErrorsSchema.safeParse({ severity });
				expect(result.success).toBe(true);
			});
		});

		it('should accept valid user_id UUID', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				user_id: '550e8400-e29b-41d4-a716-446655440000'
			});
			expect(result.success).toBe(true);
		});

		it('should accept search filter', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				search: 'TypeError'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.search).toBe('TypeError');
			}
		});
	});

	// ============================================================================
	// BOOLEAN TRANSFORMATION
	// ============================================================================

	describe('resolved field transformation', () => {
		it('should transform "true" string to boolean true', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				resolved: 'true'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.resolved).toBe(true);
			}
		});

		it('should transform "false" string to boolean false', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				resolved: 'false'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.resolved).toBe(false);
			}
		});

		it('should transform undefined string to undefined', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				search: 'error' // Need at least one filter
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.resolved).toBeUndefined();
			}
		});
	});

	// ============================================================================
	// INVALID CASES
	// ============================================================================

	describe('invalid requests', () => {
		it('should reject request with no filters', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				notes: 'Only notes, no filters'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Au moins un filtre doit être spécifié');
			}
		});

		it('should reject request with only notes', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				notes: 'Notes without any filters'
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid error_type', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				error_type: 'invalid_type'
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid severity', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				severity: 'severe'
			});
			expect(result.success).toBe(false);
		});

		it('should reject notes exceeding 2000 characters', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				severity: 'critical',
				notes: 'x'.repeat(2001)
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Notes trop longues');
			}
		});

		it('should reject invalid user_id format', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				user_id: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});

		it('should reject invalid date_from format', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				date_from: '2025-01-01' // Missing time component
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Date de début invalide');
			}
		});

		it('should reject invalid date_to format', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				date_to: 'invalid-date'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Date de fin invalide');
			}
		});

		it('should reject search exceeding 200 characters', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				search: 'x'.repeat(201)
			});
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe('edge cases', () => {
		it('should trim search string', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				search: '  TypeError  '
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.search).toBe('TypeError');
			}
		});

		it('should accept notes at exactly 2000 characters', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				severity: 'error',
				notes: 'x'.repeat(2000)
			});
			expect(result.success).toBe(true);
		});

		it('should accept search at exactly 200 characters', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				search: 'x'.repeat(200)
			});
			expect(result.success).toBe(true);
		});

		it('should accept empty notes string', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				severity: 'warning',
				notes: ''
			});
			expect(result.success).toBe(true);
		});

		it('should accept combination of all filters', () => {
			const result = bulkResolveErrorsSchema.safeParse({
				error_type: 'database',
				severity: 'critical',
				resolved: 'false',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				date_from: '2025-01-01T00:00:00Z',
				date_to: '2025-01-31T23:59:59Z',
				search: 'connection timeout',
				notes: 'Database connection pool exhausted'
			});
			expect(result.success).toBe(true);
		});
	});
});
