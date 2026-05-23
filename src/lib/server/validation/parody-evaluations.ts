import { z } from 'zod';
import { GRADE_CODES } from '$lib/types/grades';

/**
 * Validation schemas for parody_evaluations server actions.
 *
 * Used by teacher form actions for upload/update/delete and shared with
 * the public listing page for query parameter filtering.
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPE = 'application/pdf';

const gradeCodeSchema = z.enum(GRADE_CODES);

const titleSchema = z
	.string()
	.trim()
	.min(1, 'Titre requis')
	.max(200, 'Titre trop long (max 200 caractères)');

const descriptionSchema = z
	.string()
	.trim()
	.max(2000, 'Description trop longue (max 2000 caractères)')
	.optional()
	.transform((v) => v || null);

const gradeLevelsSchema = z
	.array(gradeCodeSchema)
	.min(1, 'Sélectionnez au moins un niveau')
	.max(18, 'Trop de niveaux');

const tagsSchema = z
	.array(z.string().trim().min(1).max(50))
	.max(20, 'Maximum 20 thèmes')
	.default([]);

/**
 * Schema for the metadata part of the upload form (file is handled separately).
 */
export const uploadEvaluationMetadataSchema = z.object({
	title: titleSchema,
	description: descriptionSchema,
	gradeLevels: gradeLevelsSchema,
	tags: tagsSchema
});

export type UploadEvaluationMetadata = z.infer<typeof uploadEvaluationMetadataSchema>;

/**
 * Schema for updating an existing evaluation (file cannot be changed).
 */
export const updateEvaluationSchema = z.object({
	id: z.string().uuid('ID invalide'),
	title: titleSchema,
	description: descriptionSchema,
	gradeLevels: gradeLevelsSchema,
	tags: tagsSchema
});

export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>;

/**
 * Schema for delete action.
 */
export const deleteEvaluationSchema = z.object({
	id: z.string().uuid('ID invalide')
});

/**
 * Parse a JSON-encoded array field from FormData (used for grade_levels and tags).
 * Returns an empty array if the field is missing or unparseable.
 */
export function parseJsonArrayField(value: FormDataEntryValue | null): unknown {
	if (typeof value !== 'string' || value.length === 0) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
