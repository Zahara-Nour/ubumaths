/**
 * Google Classroom validation schemas
 * Zod schemas for Google Classroom coursework sharing endpoints
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';

// ============================================================================
// COURSEWORK SHARING SCHEMAS
// ============================================================================

/**
 * Schema for sharing coursework with a class
 * POST /api/google/courses/[courseId]/share
 */
export const shareCourseworkRequestSchema = z.object({
	courseworkId: uuidSchema,
	classId: uuidSchema,
	visible: z.boolean().default(true),
	categoryId: uuidSchema.nullable().optional(),
	customDescription: z
		.string()
		.max(2000, 'Description cannot exceed 2000 characters')
		.nullable()
		.optional()
});

/**
 * Schema for updating shared coursework
 * PATCH /api/google/shared-coursework
 */
export const updateSharedCourseworkSchema = z
	.object({
		visible: z.boolean().optional(),
		categoryId: uuidSchema.nullable().optional(),
		customDescription: z
			.string()
			.max(2000, 'Description cannot exceed 2000 characters')
			.nullable()
			.optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided'
	});

/**
 * Schema for listing shared coursework
 * GET /api/google/shared-coursework
 */
export const listSharedCourseworkSchema = paginationSchema.extend({
	classId: uuidSchema.optional(),
	courseId: uuidSchema.optional(),
	visible: z.coerce.boolean().optional()
});

/**
 * Schema for unsharing coursework
 * DELETE /api/google/courses/[courseId]/share
 */
export const unshareCourseworkSchema = z.object({
	courseworkId: uuidSchema,
	classId: uuidSchema
});

/**
 * Schema for course ID parameter validation
 */
export const courseIdParamSchema = z.object({
	courseId: uuidSchema
});

/**
 * Schema for listing student shared coursework
 * GET /api/student/shared-coursework
 */
export const listStudentSharedCourseworkSchema = paginationSchema.extend({
	classId: uuidSchema.optional(),
	categoryId: uuidSchema.optional()
});
