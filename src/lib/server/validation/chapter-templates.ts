/**
 * Chapter Templates Validation Schemas
 *
 * Zod schemas for validating chapter template API requests.
 * All schemas include helpful error messages in French.
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';
import { chapterColorSchema, chapterIconSchema } from './chapters';
import { gradeCodeSchema } from './grades';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Template status values
 */
const TEMPLATE_STATUS_VALUES = ['draft', 'published', 'archived'] as const;

/**
 * Template status validation
 */
export const templateStatusSchema = z.enum(TEMPLATE_STATUS_VALUES);

/**
 * Grades array validation - accepts all valid grade codes
 */
export const gradesArraySchema = z
	.array(gradeCodeSchema)
	.max(18, 'Trop de niveaux selectionnes (max 18)');

// ============================================================================
// TEMPLATE CRUD SCHEMAS
// ============================================================================

/**
 * Schema for creating a new template from scratch
 */
export const createChapterTemplateSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre est trop long (max 200 caracteres)'),
	description: z
		.string()
		.trim()
		.max(2000, 'La description est trop longue (max 2000 caracteres)')
		.optional()
		.nullable(),
	grades: gradesArraySchema.default([]),
	color: chapterColorSchema.optional().nullable(),
	icon: chapterIconSchema.optional().nullable()
});

export type CreateChapterTemplateInput = z.infer<typeof createChapterTemplateSchema>;

/**
 * Schema for creating a template from an existing chapter
 */
export const createTemplateFromChapterSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre source'),
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre est trop long (max 200 caracteres)'),
	description: z
		.string()
		.trim()
		.max(2000, 'La description est trop longue (max 2000 caracteres)')
		.optional()
		.nullable(),
	grades: gradesArraySchema.default([])
});

export type CreateTemplateFromChapterInput = z.infer<typeof createTemplateFromChapterSchema>;

/**
 * Schema for updating a template's metadata (title, description, grades, color, icon)
 */
export const updateChapterTemplateSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, 'Le titre est requis')
			.max(200, 'Le titre est trop long (max 200 caracteres)')
			.optional(),
		description: z
			.string()
			.trim()
			.max(2000, 'La description est trop longue (max 2000 caracteres)')
			.optional()
			.nullable(),
		grades: gradesArraySchema.optional(),
		color: chapterColorSchema.optional().nullable(),
		icon: chapterIconSchema.optional().nullable()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit etre fourni pour la mise a jour'
	});

export type UpdateChapterTemplateInput = z.infer<typeof updateChapterTemplateSchema>;

// ============================================================================
// INSTANTIATION SCHEMAS
// ============================================================================

/**
 * Schema for instantiating a template into a chapter
 */
export const instantiateTemplateSchema = z.object({
	templateId: uuidSchema.describe('ID du template'),
	classId: uuidSchema.describe('ID de la classe cible'),
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre est trop long (max 200 caracteres)')
		.optional(),
	isVisible: z.boolean().default(false)
});

export type InstantiateTemplateInput = z.infer<typeof instantiateTemplateSchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Schema for listing templates
 */
export const listTemplatesQuerySchema = paginationSchema.extend({
	/** Filter by status */
	status: templateStatusSchema.optional(),
	/** Filter by grades (comma-separated) */
	grades: z
		.string()
		.optional()
		.transform((val) => (val ? val.split(',') : undefined)),
	/** Search by title */
	search: z.string().max(100, 'La recherche est trop longue').optional(),
	/** Sort by field */
	sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'instantiationCount']).optional(),
	/** Sort direction */
	sortDir: z.enum(['asc', 'desc']).optional()
});

export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
