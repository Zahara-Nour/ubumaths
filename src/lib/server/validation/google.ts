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
	classId: uuidSchema.nullish(),
	categoryId: uuidSchema.nullish()
});

// ============================================================================
// COURSE WORK MATERIAL SHARING SCHEMAS
// ============================================================================

/**
 * Schema for material ID parameter validation
 */
export const materialIdParamSchema = z.object({
	id: z.string().uuid('Invalid material ID format')
});

/**
 * Schema for sharing course work materials
 * POST /api/google/materials/[id]/share
 */
export const shareMaterialSchema = z.object({
	classIds: z
		.array(z.string().uuid())
		.min(1, 'At least one class must be selected')
		.max(50, 'Cannot share with more than 50 classes at once'),
	categoryId: z.string().uuid().nullable().optional(),
	topicId: z.string().uuid().nullable().optional(),
	descriptionOverride: z
		.string()
		.max(5000, 'Description cannot exceed 5000 characters')
		.nullable()
		.optional(),
	visible: z.boolean().default(true)
});

/**
 * Schema for unsharing course work materials
 * DELETE /api/google/materials/[id]/share
 */
export const unshareMaterialSchema = z.object({
	classIds: z
		.array(z.string().uuid())
		.min(1, 'At least one class must be selected')
		.max(50, 'Cannot share with more than 50 classes at once')
});

/**
 * Schema for listing student shared materials
 * GET /api/student/shared-materials
 */
export const listStudentSharedMaterialsSchema = paginationSchema.extend({
	classId: uuidSchema.nullish(),
	categoryId: uuidSchema.nullish(),
	topicId: uuidSchema.nullish()
});
