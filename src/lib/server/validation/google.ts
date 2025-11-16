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
	classId: uuidSchema.nullish(),
	courseId: uuidSchema.nullish(),
	visible: z
		.string()
		.nullish()
		.transform((val) => {
			if (!val) return undefined;
			return val === 'true';
		})
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
 * Schema for bulk sharing course work materials
 * POST /api/google/materials/bulk-share
 */
export const bulkShareMaterialsSchema = z.object({
	materialIds: z
		.array(z.string().uuid())
		.min(1, 'At least one material must be selected')
		.max(50, 'Cannot share more than 50 materials at once'),
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
 * Schema for listing student shared materials
 * GET /api/student/shared-materials
 */
export const listStudentSharedMaterialsSchema = paginationSchema.extend({
	classId: uuidSchema.nullish(),
	categoryId: uuidSchema.nullish(),
	topicId: uuidSchema.nullish()
});

// ============================================================================
// TEACHER MATERIAL MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schema for listing shared materials (teacher view)
 * GET /api/google/shared-materials
 */
export const listSharedMaterialsSchema = paginationSchema.extend({
	classId: uuidSchema.nullish(),
	courseId: uuidSchema.nullish(),
	materialId: uuidSchema.nullish(),
	visible: z
		.string()
		.nullish()
		.transform((val) => {
			if (!val) return undefined;
			return val === 'true';
		})
});

/**
 * Schema for updating shared materials (teacher view)
 * PATCH /api/google/shared-materials
 */
export const updateSharedMaterialSchema = z
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
 * Schema for unsharing single material from single class (teacher view)
 * DELETE /api/google/courses/[courseId]/share?materialId=xxx&classId=xxx
 */
export const unshareSingleMaterialSchema = z.object({
	materialId: uuidSchema,
	classId: uuidSchema
});

// ============================================================================
// SHARED MATERIALS MANAGEMENT SCHEMAS (New RESTful Endpoints)
// ============================================================================

/**
 * Schema for sharing a single material with multiple classes (bulk)
 * POST /api/google/shared-materials
 */
export const shareSingleMaterialSchema = z.object({
	materialId: uuidSchema,
	classIds: z
		.array(uuidSchema)
		.min(1, 'At least one class must be selected')
		.max(50, 'Cannot share with more than 50 classes at once'),
	visible: z.boolean().default(true),
	categoryId: uuidSchema.nullable().optional(),
	topicId: uuidSchema.nullable().optional(),
	descriptionOverride: z
		.string()
		.max(2000, 'Description cannot exceed 2000 characters')
		.nullable()
		.optional()
});

/**
 * Schema for bulk unsharing a material from multiple classes
 * DELETE /api/google/shared-materials (bulk delete)
 */
export const bulkUnshareMaterialSchema = z.object({
	materialId: uuidSchema,
	classIds: z
		.array(uuidSchema)
		.min(1, 'At least one class must be specified')
		.max(50, 'Cannot unshare from more than 50 classes at once')
});

/**
 * Schema for updating a shared material by record ID
 * PATCH /api/google/shared-materials/[id]
 */
export const updateSharedMaterialByIdSchema = z
	.object({
		visible: z.boolean().optional(),
		categoryId: uuidSchema.nullable().optional(),
		topicId: uuidSchema.nullable().optional(),
		descriptionOverride: z
			.string()
			.max(2000, 'Description cannot exceed 2000 characters')
			.nullable()
			.optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided'
	});
