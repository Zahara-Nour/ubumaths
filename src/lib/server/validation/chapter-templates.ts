/**
 * Chapter Templates Validation Schemas
 *
 * Zod schemas for validating chapter template API requests.
 * All schemas include helpful error messages in French.
 */

import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common';
import { chapterColorSchema, chapterIconSchema, displayOrderSchema } from './chapters';

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
 * Grade level values (French middle/high school)
 */
const GRADE_LEVEL_VALUES = ['6', '5', '4', '3', '2', '1', 'T'] as const;

/**
 * Grade level validation
 */
export const gradeLevelSchema = z.enum(GRADE_LEVEL_VALUES);

/**
 * Grades array validation
 */
export const gradesArraySchema = z
	.array(gradeLevelSchema)
	.max(7, 'Trop de niveaux selectionnes (max 7)');

// ============================================================================
// CONTENT SNAPSHOT SCHEMAS
// ============================================================================

/**
 * Document snapshot schema
 */
export const templateDocumentSnapshotSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre est trop long (max 200 caracteres)'),
	description: z
		.string()
		.trim()
		.max(1000, 'La description est trop longue (max 1000 caracteres)')
		.nullable(),
	documentUrl: z.string().url("L'URL du document est invalide"),
	sourceType: z.enum(['external_url', 'google_drive']),
	mimeType: z.string().max(100, 'Le type MIME est trop long').nullable(),
	displayOrder: displayOrderSchema
});

export type TemplateDocumentSnapshotInput = z.infer<typeof templateDocumentSnapshotSchema>;

/**
 * Quiz question snapshot schema
 */
export const templateQuizQuestionSnapshotSchema = z.object({
	questionTemplateId: uuidSchema.describe('ID du template de question'),
	pointsOverride: z
		.number()
		.int('Les points doivent etre un entier')
		.min(0, 'Les points doivent etre positifs')
		.max(100, 'Les points sont trop eleves (max 100)')
		.nullable(),
	displayOrder: displayOrderSchema
});

export type TemplateQuizQuestionSnapshotInput = z.infer<typeof templateQuizQuestionSnapshotSchema>;

/**
 * Checklist item snapshot schema
 */
export const templateChecklistItemSnapshotSchema = z.object({
	content: z
		.string()
		.trim()
		.min(1, 'Le contenu est requis')
		.max(500, 'Le contenu est trop long (max 500 caracteres)'),
	description: z
		.string()
		.trim()
		.max(1000, 'La description est trop longue (max 1000 caracteres)')
		.nullable(),
	displayOrder: displayOrderSchema
});

export type TemplateChecklistItemSnapshotInput = z.infer<
	typeof templateChecklistItemSnapshotSchema
>;

/**
 * Exercise snapshot schema
 */
export const templateExerciseSnapshotSchema = z.object({
	exerciseId: uuidSchema.describe("ID de l'exercice"),
	displayOrder: displayOrderSchema
});

export type TemplateExerciseSnapshotInput = z.infer<typeof templateExerciseSnapshotSchema>;

/**
 * Complete content snapshot schema
 */
export const templateContentSnapshotSchema = z.object({
	documents: z.array(templateDocumentSnapshotSchema).max(50, 'Trop de documents (max 50)'),
	quizQuestions: z
		.array(templateQuizQuestionSnapshotSchema)
		.max(100, 'Trop de questions (max 100)'),
	checklistItems: z.array(templateChecklistItemSnapshotSchema).max(50, "Trop d'elements (max 50)"),
	exercises: z.array(templateExerciseSnapshotSchema).max(50, "Trop d'exercices (max 50)")
});

export type TemplateContentSnapshotInput = z.infer<typeof templateContentSnapshotSchema>;

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
	icon: chapterIconSchema.optional().nullable(),
	contentSnapshot: templateContentSnapshotSchema.optional()
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
 * Schema for updating a template (draft only)
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
		icon: chapterIconSchema.optional().nullable(),
		contentSnapshot: templateContentSnapshotSchema.optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Au moins un champ doit etre fourni pour la mise a jour'
	});

export type UpdateChapterTemplateInput = z.infer<typeof updateChapterTemplateSchema>;

/**
 * Schema for publishing a template
 */
export const publishTemplateSchema = z.object({
	templateId: uuidSchema.describe('ID du template'),
	isPublic: z.boolean().default(false)
});

export type PublishTemplateInput = z.infer<typeof publishTemplateSchema>;

/**
 * Schema for archiving a template
 */
export const archiveTemplateSchema = z.object({
	templateId: uuidSchema.describe('ID du template')
});

export type ArchiveTemplateInput = z.infer<typeof archiveTemplateSchema>;

/**
 * Schema for updating content and creating a new version
 */
export const updateTemplateContentSchema = z.object({
	templateId: uuidSchema.describe('ID du template'),
	contentSnapshot: templateContentSnapshotSchema,
	changeSummary: z
		.string()
		.trim()
		.max(500, 'Le resume des modifications est trop long (max 500 caracteres)')
		.optional()
});

export type UpdateTemplateContentInput = z.infer<typeof updateTemplateContentSchema>;

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

/**
 * Schema for migrating a chapter to a new template version
 */
export const migrateChapterSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	targetVersion: z
		.number()
		.int('La version doit etre un entier')
		.min(1, 'La version doit etre positive')
});

export type MigrateChapterInput = z.infer<typeof migrateChapterSchema>;

/**
 * Schema for detaching a chapter from its template
 */
export const detachChapterSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre')
});

export type DetachChapterInput = z.infer<typeof detachChapterSchema>;

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
	/** Filter: only my templates */
	ownOnly: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	/** Filter: only public templates */
	publicOnly: z
		.string()
		.optional()
		.transform((val) => val === 'true'),
	/** Sort by field */
	sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'instantiationCount']).optional(),
	/** Sort direction */
	sortDir: z.enum(['asc', 'desc']).optional()
});

export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;

/**
 * Schema for checking template updates for a chapter
 */
export const checkTemplateUpdatesSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre')
});

export type CheckTemplateUpdatesInput = z.infer<typeof checkTemplateUpdatesSchema>;

/**
 * Schema for getting migration preview
 */
export const getMigrationPreviewSchema = z.object({
	chapterId: uuidSchema.describe('ID du chapitre'),
	targetVersion: z.number().int().min(1).optional() // If not provided, use latest
});

export type GetMigrationPreviewInput = z.infer<typeof getMigrationPreviewSchema>;

/**
 * Schema for listing template versions
 */
export const listTemplateVersionsQuerySchema = paginationSchema.extend({
	templateId: uuidSchema.describe('ID du template')
});

export type ListTemplateVersionsQuery = z.infer<typeof listTemplateVersionsQuerySchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create template request
 */
export function validateCreateTemplate(data: unknown) {
	return createChapterTemplateSchema.safeParse(data);
}

/**
 * Validate create template from chapter request
 */
export function validateCreateTemplateFromChapter(data: unknown) {
	return createTemplateFromChapterSchema.safeParse(data);
}

/**
 * Validate update template request
 */
export function validateUpdateTemplate(data: unknown) {
	return updateChapterTemplateSchema.safeParse(data);
}

/**
 * Validate publish template request
 */
export function validatePublishTemplate(data: unknown) {
	return publishTemplateSchema.safeParse(data);
}

/**
 * Validate instantiate template request
 */
export function validateInstantiateTemplate(data: unknown) {
	return instantiateTemplateSchema.safeParse(data);
}

/**
 * Validate migrate chapter request
 */
export function validateMigrateChapter(data: unknown) {
	return migrateChapterSchema.safeParse(data);
}

/**
 * Validate detach chapter request
 */
export function validateDetachChapter(data: unknown) {
	return detachChapterSchema.safeParse(data);
}

/**
 * Validate list templates query
 */
export function validateListTemplatesQuery(params: URLSearchParams) {
	return listTemplatesQuerySchema.safeParse(Object.fromEntries(params));
}

/**
 * Validate content snapshot
 */
export function validateContentSnapshot(data: unknown) {
	return templateContentSnapshotSchema.safeParse(data);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Template response schema
 */
export const templateResponseSchema = z.object({
	id: uuidSchema,
	createdBy: uuidSchema,
	status: templateStatusSchema,
	isPublic: z.boolean(),
	title: z.string(),
	description: z.string().nullable(),
	grades: z.array(z.string()),
	color: chapterColorSchema.nullable(),
	icon: chapterIconSchema.nullable(),
	instantiationCount: z.number().int().nonnegative(),
	currentVersion: z.number().int().positive(),
	createdAt: z.string(),
	updatedAt: z.string()
});

/**
 * Template version response schema
 */
export const templateVersionResponseSchema = z.object({
	id: uuidSchema,
	templateId: uuidSchema,
	versionNumber: z.number().int().positive(),
	createdBy: uuidSchema,
	changeSummary: z.string().nullable(),
	createdAt: z.string()
});

/**
 * Template instantiation response schema
 */
export const templateInstantiationResponseSchema = z.object({
	id: uuidSchema,
	templateId: uuidSchema.nullable(),
	templateVersion: z.number().int().positive(),
	chapterId: uuidSchema,
	currentTemplateVersion: z.number().int().positive().nullable(),
	isDetached: z.boolean(),
	instantiatedAt: z.string(),
	lastMigratedAt: z.string().nullable()
});

/**
 * Template list response schema
 */
export const templateListResponseSchema = z.object({
	templates: z.array(templateResponseSchema),
	total: z.number().int().nonnegative()
});

/**
 * Migration preview response schema
 */
export const migrationPreviewResponseSchema = z.object({
	instantiationId: uuidSchema,
	chapterId: uuidSchema,
	fromVersion: z.number().int().positive(),
	toVersion: z.number().int().positive(),
	changeSummary: z.string().nullable(),
	hasChanges: z.boolean()
});
