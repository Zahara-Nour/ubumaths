/**
 * Document Upload Validation Schemas
 */

import { z } from 'zod';
import { gradeCodeSchema } from './grades';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
	'application/pdf',
	'text/plain',
	'text/markdown',
	'text/x-markdown'
] as const;

/**
 * Document upload metadata schema
 */
export const documentUploadSchema = z.object({
	title: z
		.string()
		.min(1, 'Le titre est requis')
		.max(200, 'Le titre ne peut pas dépasser 200 caractères')
		.trim(),
	description: z
		.string()
		.max(1000, 'La description ne peut pas dépasser 1000 caractères')
		.optional(),
	grades: z.array(gradeCodeSchema).max(15, 'Maximum 15 niveaux').default([]),
	topics: z.array(z.string().max(50)).max(10, 'Maximum 10 thèmes').default([]),
	enabledForRag: z.boolean().default(true)
});

/**
 * File validation schema (for FormData parsing)
 */
export const fileValidationSchema = z.object({
	name: z.string().min(1),
	size: z
		.number()
		.positive()
		.max(
			MAX_FILE_SIZE,
			`La taille du fichier ne peut pas dépasser ${MAX_FILE_SIZE / 1024 / 1024}MB`
		),
	type: z.enum(ALLOWED_MIME_TYPES, {
		message: 'Type de fichier non supporté. Formats acceptés: PDF, TXT, MD'
	})
});

/**
 * Document list query parameters
 */
export const documentListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().max(200).optional(),
	sourceType: z
		.enum(['question_template', 'exercise', 'markdown_doc', 'google_drive', 'manual_upload'])
		.optional(),
	/** Single grade filter */
	grade: gradeCodeSchema.optional(),
	topic: z.string().optional(),
	enabledOnly: z
		.enum(['true', 'false'])
		.default('true')
		.transform((val) => val === 'true')
});

/**
 * Document update schema
 */
export const documentUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	grades: z.array(gradeCodeSchema).max(15).optional(),
	topics: z.array(z.string().max(50)).max(10).optional(),
	enabledForRag: z.boolean().optional()
});

/**
 * Document delete schema
 */
export const documentDeleteSchema = z.object({
	documentId: z.string().uuid('ID de document invalide')
});

export type DocumentUpload = z.infer<typeof documentUploadSchema>;
export type FileValidation = z.infer<typeof fileValidationSchema>;
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
export type DocumentUpdate = z.infer<typeof documentUpdateSchema>;
