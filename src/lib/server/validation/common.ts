/**
 * Common validation schemas
 * Reusable Zod schemas shared across the application
 */

import { z } from 'zod';

// ============================================================================
// PRIMITIVE SCHEMAS
// ============================================================================

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Array of UUIDs
 */
export const uuidArraySchema = z.array(z.string().uuid('Invalid UUID format'));

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
	page: z
		.string()
		.nullish()
		.transform((v) => {
			if (!v) return 1;
			const parsed = parseInt(v, 10);
			if (isNaN(parsed) || parsed < 1 || parsed > 1000) return 1;
			return parsed;
		}),
	limit: z
		.string()
		.nullish()
		.transform((v) => {
			if (!v) return 50;
			const parsed = parseInt(v, 10);
			if (isNaN(parsed) || parsed < 1 || parsed > 100) return 50;
			return parsed;
		})
});

// ============================================================================
// ROLE SCHEMAS
// ============================================================================

/**
 * User role enum
 */
export const roleSchema = z.enum(['student', 'teacher', 'admin']);

/**
 * User role enum including 'all' (for targeting)
 */
export const roleWithAllSchema = z.enum(['all', 'student', 'teacher', 'admin']);

// ============================================================================
// DIFFICULTY & GRADE SCHEMAS
// ============================================================================

/**
 * Difficulty level (1 = easy, 2 = medium, 3 = hard)
 */
export const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

// Re-export grade schemas and utilities from unified system
export {
	gradeCodeSchema as gradeSchema,
	gradeFlexibleSchema,
	gradeArraySchema,
	gradeArrayFlexibleSchema
} from '$lib/server/validation/grades';

export { formatGradeForDisplay } from '$lib/utils/grades';

// ============================================================================
// VALIDATION HELPER FUNCTION
// ============================================================================

/**
 * Helper function for consistent error handling
 * Returns a structured validation result
 */
export function validateRequest<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): { success: true; data: T } | { success: false; error: string } {
	const result = schema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return {
		success: false,
		error: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
	};
}

// ============================================================================
// FORM DATA VALIDATION
// ============================================================================

/**
 * Helper to validate FormData with Zod
 * Converts FormData to object and validates against schema
 * Returns errors formatted for SvelteKit fail()
 */
export function validateFormData<T>(
	schema: z.ZodSchema<T>,
	formData: FormData
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
	const data = Object.fromEntries(formData);
	const validation = schema.safeParse(data);

	if (validation.success) {
		return { success: true, data: validation.data };
	}

	// Format errors for SvelteKit fail()
	const errors: Record<string, string[]> = {};
	validation.error.issues.forEach((issue) => {
		const path = issue.path.join('.') || 'form';
		if (!errors[path]) {
			errors[path] = [];
		}
		errors[path].push(issue.message);
	});

	return { success: false, errors };
}

/**
 * Coerce FormData values to appropriate types
 * All FormData values are strings by default, these helpers convert them
 */
export const formDataTransforms = {
	/** Trim whitespace from string */
	string: z.string().trim().min(1),

	/** Email validation with French error message */
	email: z.string().email('Email invalide'),

	/** Convert string to number */
	number: z.string().transform((val) => Number(val)),

	/** Convert string to integer */
	int: z
		.string()
		.transform((val) => parseInt(val, 10))
		.pipe(z.number().int()),

	/** Convert FormData checkbox/radio to boolean */
	boolean: z
		.string()
		.transform((val) => val === 'true' || val === 'on' || val === '1')
		.pipe(z.boolean()),

	/** Optional string (empty string becomes null) */
	optionalString: z.string().transform((val) => (val.trim() === '' ? null : val.trim())),

	/** Convert comma-separated string to array of strings */
	stringArray: z.string().transform((val) => val.split(',').map((v) => v.trim())),

	/** UUID validation */
	uuid: z.string().uuid('UUID invalide'),

	/** Optional UUID (empty string becomes null) */
	optionalUuid: z
		.string()
		.transform((val) => (val.trim() === '' ? null : val.trim()))
		.pipe(z.string().uuid('UUID invalide').nullable())
};

// ============================================================================
// MISCELLANEOUS SCHEMAS
// ============================================================================

/**
 * Schema for test mode toggle
 * POST /api/test-mode
 */
export const testModeSchema = z.object({
	enabled: z.boolean()
});
