/**
 * Response Validation Utilities
 * ==============================
 *
 * Utilities for validating API response data against Zod schemas.
 * Ensures all API responses match expected formats before sending to clients.
 *
 * IMPORTANT: Response validation catches internal bugs, not client errors.
 * If response doesn't match schema, it's OUR bug (500 error).
 *
 * @module response-utils
 */

import { z } from 'zod';
import { error } from '@sveltejs/kit';

/**
 * Validates API response data against a Zod schema
 * Throws 500 error if response doesn't match schema (internal error)
 *
 * This is different from input validation (400 errors):
 * - Input validation = client's fault (bad request)
 * - Response validation = server's fault (internal error)
 *
 * @param schema - Zod schema to validate against
 * @param data - Response data to validate
 * @param endpoint - Endpoint name for logging (e.g., "GET /api/assessments")
 * @returns Validated and typed data
 * @throws 500 error if validation fails
 *
 * @example
 * ```typescript
 * const validated = validateResponse(
 *   assessmentResponseSchema,
 *   dbData,
 *   'GET /api/assessments/[id]'
 * );
 * return json(validated);
 * ```
 */
export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown, endpoint: string): T {
	const validation = schema.safeParse(data);

	if (!validation.success) {
		// Log detailed error for debugging (never expose to client)
		console.error(`[RESPONSE VALIDATION ERROR] ${endpoint}:`, {
			issues: validation.error.issues,
			data: JSON.stringify(data, null, 2)
		});

		// Throw generic 500 error (don't expose internal structure)
		throw error(500, 'Internal server error: Invalid response format');
	}

	return validation.data;
}

/**
 * Validates API response for json() return
 * Convenience wrapper around validateResponse for JSON responses
 *
 * @param schema - Zod schema to validate against
 * @param data - Response data to validate
 * @param endpoint - Endpoint name for logging
 * @returns Validated and typed data
 *
 * @example
 * ```typescript
 * const validated = validateJsonResponse(
 *   assessmentListResponseSchema,
 *   { data: assessments },
 *   'GET /api/assessments'
 * );
 * return json(validated);
 * ```
 */
export function validateJsonResponse<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
	endpoint: string
): T {
	return validateResponse(schema, data, endpoint);
}

/**
 * Creates a paginated response schema
 * Standard pagination format used across all list endpoints
 *
 * @param itemSchema - Zod schema for individual items in the list
 * @returns Zod schema for paginated response
 *
 * @example
 * ```typescript
 * const assessmentListSchema = createPaginatedResponseSchema(assessmentResponseSchema);
 *
 * // Response structure:
 * {
 *   data: Assessment[],
 *   pagination: {
 *     page: 1,
 *     limit: 50,
 *     total: 123,
 *     totalPages: 3
 *   }
 * }
 * ```
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
	return z.object({
		data: z.array(itemSchema),
		pagination: z.object({
			page: z.number().int().positive(),
			limit: z.number().int().positive(),
			total: z.number().int().nonnegative(),
			totalPages: z.number().int().nonnegative()
		})
	});
}

/**
 * Standard success response schema
 * Used for endpoints that return simple success confirmation
 *
 * @example
 * ```typescript
 * const validated = validateJsonResponse(
 *   successResponseSchema,
 *   { success: true, message: 'Exercise deleted' },
 *   'DELETE /api/exercises/[id]'
 * );
 * ```
 */
export const successResponseSchema = z.object({
	success: z.literal(true),
	message: z.string().optional()
});

/**
 * Standard error response schema
 * Used for error responses (400, 403, 404, etc.)
 *
 * @example
 * ```typescript
 * return json(
 *   { error: 'Assessment not found' },
 *   { status: 404 }
 * );
 * ```
 */
export const errorResponseSchema = z.object({
	error: z.string(),
	details: z.unknown().optional()
});

/**
 * Creates a response schema with data wrapper
 * Many endpoints return { [key]: data } format
 *
 * @param key - Property name for the data (e.g., 'assessment', 'exercises')
 * @param dataSchema - Zod schema for the data
 * @returns Zod schema for wrapped response
 *
 * @example
 * ```typescript
 * const schema = createDataWrapperSchema('assessment', assessmentResponseSchema);
 *
 * // Response structure: { assessment: Assessment }
 * ```
 */
export function createDataWrapperSchema<T extends z.ZodTypeAny>(key: string, dataSchema: T) {
	return z.object({
		[key]: dataSchema
	});
}

/**
 * Creates a stats object schema
 * Common pattern for endpoints that return statistics
 *
 * @example
 * ```typescript
 * const statsSchema = z.object({
 *   total_attempts: z.number().int().nonnegative(),
 *   average_score: z.number().min(0).max(100).nullable(),
 *   completion_rate: z.number().min(0).max(100)
 * });
 * ```
 */
export const createStatsSchema = <T extends z.ZodRawShape>(fields: T) => z.object(fields);

/**
 * UUID response schema (for endpoints that return just an ID)
 *
 * @example
 * ```typescript
 * const schema = z.object({ id: z.string().uuid() });
 * ```
 */
export const uuidResponseSchema = z.object({
	id: z.string().uuid()
});

/**
 * Count response schema (for count/stats endpoints)
 *
 * @example
 * ```typescript
 * const validated = validateJsonResponse(
 *   countResponseSchema,
 *   { count: 42 },
 *   'GET /api/notifications/unread-count'
 * );
 * ```
 */
export const countResponseSchema = z.object({
	count: z.number().int().nonnegative()
});
