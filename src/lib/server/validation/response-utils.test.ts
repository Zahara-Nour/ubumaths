/**
 * Tests for response validation utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
	validateResponse,
	validateJsonResponse,
	createPaginatedResponseSchema,
	successResponseSchema,
	errorResponseSchema,
	createDataWrapperSchema,
	uuidResponseSchema,
	countResponseSchema
} from './response-utils';

// Mock @sveltejs/kit error function
vi.mock('@sveltejs/kit', () => ({
	error: (status: number, message: string) => {
		const err = new Error(message);
		(err as Error & { status: number }).status = status;
		return err;
	}
}));

describe('response validation utilities', () => {
	// Mock console.error to avoid noise in test output
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	// ============================================================================
	// validateResponse
	// ============================================================================

	describe('validateResponse', () => {
		it('should return validated data for valid response', () => {
			const schema = z.object({
				id: z.string().uuid(),
				name: z.string()
			});

			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Test'
			};

			const result = validateResponse(schema, data, 'GET /api/test');

			expect(result).toEqual(data);
		});

		it('should throw 500 error for invalid response', () => {
			const schema = z.object({
				id: z.string().uuid(),
				name: z.string()
			});

			const invalidData = {
				id: 'not-a-uuid',
				name: 'Test'
			};

			expect(() => {
				validateResponse(schema, invalidData, 'GET /api/test');
			}).toThrow('Internal server error: Invalid response format');
		});

		it('should log detailed error without exposing to client', () => {
			const schema = z.object({
				secret: z.string()
			});

			const invalidData = {
				secret: 123 // Wrong type
			};

			try {
				validateResponse(schema, invalidData, 'GET /api/test');
			} catch {
				// Expected to throw
			}

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('[RESPONSE VALIDATION ERROR]'),
				expect.objectContaining({
					issues: expect.any(Array),
					data: expect.any(String)
				})
			);
		});

		it('should handle missing required fields', () => {
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional()
			});

			const data = {
				optional: 'present'
				// missing 'required'
			};

			expect(() => {
				validateResponse(schema, data, 'GET /api/test');
			}).toThrow();
		});

		it('should handle extra fields when strict mode not enabled', () => {
			const schema = z.object({
				id: z.string()
			});

			const data = {
				id: 'test',
				extra: 'field' // Extra field
			};

			// Should pass (Zod strips extra fields by default)
			const result = validateResponse(schema, data, 'GET /api/test');
			expect(result).toEqual({ id: 'test' });
		});
	});

	// ============================================================================
	// validateJsonResponse
	// ============================================================================

	describe('validateJsonResponse', () => {
		it('should be a wrapper around validateResponse', () => {
			const schema = z.object({
				success: z.boolean()
			});

			const data = { success: true };
			const result = validateJsonResponse(schema, data, 'GET /api/test');

			expect(result).toEqual(data);
		});

		it('should throw on invalid data', () => {
			const schema = z.object({
				count: z.number()
			});

			const invalidData = { count: 'not-a-number' };

			expect(() => {
				validateJsonResponse(schema, invalidData, 'GET /api/test');
			}).toThrow();
		});
	});

	// ============================================================================
	// createPaginatedResponseSchema
	// ============================================================================

	describe('createPaginatedResponseSchema', () => {
		it('should validate correct paginated response', () => {
			const itemSchema = z.object({
				id: z.string(),
				name: z.string()
			});

			const paginatedSchema = createPaginatedResponseSchema(itemSchema);

			const validData = {
				data: [
					{ id: '1', name: 'Item 1' },
					{ id: '2', name: 'Item 2' }
				],
				pagination: {
					page: 1,
					limit: 50,
					total: 100,
					totalPages: 2
				}
			};

			const result = paginatedSchema.safeParse(validData);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(validData);
			}
		});

		it('should reject missing pagination field', () => {
			const itemSchema = z.object({ id: z.string() });
			const paginatedSchema = createPaginatedResponseSchema(itemSchema);

			const invalidData = {
				data: [{ id: '1' }]
				// Missing pagination
			};

			const result = paginatedSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it('should reject invalid pagination values', () => {
			const itemSchema = z.object({ id: z.string() });
			const paginatedSchema = createPaginatedResponseSchema(itemSchema);

			const invalidData = {
				data: [{ id: '1' }],
				pagination: {
					page: -1, // Invalid
					limit: 50,
					total: 100,
					totalPages: 2
				}
			};

			const result = paginatedSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it('should accept empty data array', () => {
			const itemSchema = z.object({ id: z.string() });
			const paginatedSchema = createPaginatedResponseSchema(itemSchema);

			const validData = {
				data: [],
				pagination: {
					page: 1,
					limit: 50,
					total: 0,
					totalPages: 0
				}
			};

			const result = paginatedSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it('should validate items in data array', () => {
			const itemSchema = z.object({
				id: z.number(),
				name: z.string()
			});

			const paginatedSchema = createPaginatedResponseSchema(itemSchema);

			const invalidData = {
				data: [
					{ id: 1, name: 'Valid' },
					{ id: 'invalid', name: 'Invalid ID type' } // Invalid ID
				],
				pagination: {
					page: 1,
					limit: 50,
					total: 2,
					totalPages: 1
				}
			};

			const result = paginatedSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// successResponseSchema
	// ============================================================================

	describe('successResponseSchema', () => {
		it('should accept success response with message', () => {
			const data = {
				success: true,
				message: 'Operation completed successfully'
			};

			const result = successResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept success response without message', () => {
			const data = {
				success: true
			};

			const result = successResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject success: false', () => {
			const data = {
				success: false,
				message: 'Failed'
			};

			const result = successResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject missing success field', () => {
			const data = {
				message: 'No success field'
			};

			const result = successResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// errorResponseSchema
	// ============================================================================

	describe('errorResponseSchema', () => {
		it('should accept error response with message', () => {
			const data = {
				error: 'Something went wrong'
			};

			const result = errorResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept error response with details', () => {
			const data = {
				error: 'Validation failed',
				details: {
					field: 'email',
					message: 'Invalid email format'
				}
			};

			const result = errorResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject missing error field', () => {
			const data = {
				details: 'No error field'
			};

			const result = errorResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should accept any type for details field', () => {
			const testCases = [
				{ error: 'Test', details: 'string' },
				{ error: 'Test', details: 123 },
				{ error: 'Test', details: { nested: 'object' } },
				{ error: 'Test', details: ['array'] }
			];

			testCases.forEach((data) => {
				const result = errorResponseSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});
	});

	// ============================================================================
	// createDataWrapperSchema
	// ============================================================================

	describe('createDataWrapperSchema', () => {
		it('should create schema with custom key', () => {
			const dataSchema = z.object({
				id: z.string(),
				value: z.number()
			});

			const wrapperSchema = createDataWrapperSchema('assessment', dataSchema);

			const validData = {
				assessment: {
					id: 'test-id',
					value: 42
				}
			};

			const result = wrapperSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it('should reject wrong key name', () => {
			const dataSchema = z.object({ id: z.string() });
			const wrapperSchema = createDataWrapperSchema('assessment', dataSchema);

			const invalidData = {
				wrongKey: {
					id: 'test-id'
				}
			};

			const result = wrapperSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it('should validate nested data', () => {
			const dataSchema = z.object({
				id: z.string().uuid()
			});

			const wrapperSchema = createDataWrapperSchema('data', dataSchema);

			const invalidData = {
				data: {
					id: 'not-a-uuid' // Invalid UUID
				}
			};

			const result = wrapperSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// uuidResponseSchema
	// ============================================================================

	describe('uuidResponseSchema', () => {
		it('should accept valid UUID response', () => {
			const data = {
				id: '550e8400-e29b-41d4-a716-446655440000'
			};

			const result = uuidResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject invalid UUID', () => {
			const data = {
				id: 'not-a-uuid'
			};

			const result = uuidResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject missing id field', () => {
			const data = {};

			const result = uuidResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// countResponseSchema
	// ============================================================================

	describe('countResponseSchema', () => {
		it('should accept valid count response', () => {
			const data = {
				count: 42
			};

			const result = countResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should accept zero count', () => {
			const data = {
				count: 0
			};

			const result = countResponseSchema.safeParse(data);
			expect(result.success).toBe(true);
		});

		it('should reject negative count', () => {
			const data = {
				count: -5
			};

			const result = countResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject non-integer count', () => {
			const data = {
				count: 3.14
			};

			const result = countResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});

		it('should reject string count', () => {
			const data = {
				count: '42'
			};

			const result = countResponseSchema.safeParse(data);
			expect(result.success).toBe(false);
		});
	});

	// ============================================================================
	// Edge Cases & Integration
	// ============================================================================

	describe('edge cases', () => {
		it('should handle null values correctly', () => {
			const schema = z.object({
				value: z.string().nullable()
			});

			const data = { value: null };
			const result = validateResponse(schema, data, 'GET /api/test');

			expect(result).toEqual(data);
		});

		it('should handle nested objects', () => {
			const schema = z.object({
				user: z.object({
					id: z.string(),
					profile: z.object({
						name: z.string(),
						age: z.number()
					})
				})
			});

			const data = {
				user: {
					id: 'user-123',
					profile: {
						name: 'John',
						age: 30
					}
				}
			};

			const result = validateResponse(schema, data, 'GET /api/test');
			expect(result).toEqual(data);
		});

		it('should handle arrays of complex objects', () => {
			const schema = z.object({
				items: z.array(
					z.object({
						id: z.string(),
						metadata: z.record(z.string(), z.any())
					})
				)
			});

			const data = {
				items: [
					{ id: '1', metadata: { key: 'value' } },
					{ id: '2', metadata: { nested: { deep: 'value' } } }
				]
			};

			const result = validateResponse(schema, data, 'GET /api/test');
			expect(result).toEqual(data);
		});
	});
});
