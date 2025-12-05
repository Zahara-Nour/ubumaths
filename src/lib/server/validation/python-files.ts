/**
 * Python Files validation schemas
 *
 * Zod schemas for validating Python file API requests
 */

import { z } from 'zod';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum number of Python files per user */
export const MAX_PYTHON_FILES_PER_USER = 50;

/** Maximum code size in characters (500KB) */
export const MAX_CODE_SIZE = 500000;

/** Maximum title length */
export const MAX_TITLE_LENGTH = 200;

/** Maximum description length */
export const MAX_DESCRIPTION_LENGTH = 2000;

/** Maximum instructions length */
export const MAX_INSTRUCTIONS_LENGTH = 5000;

// =============================================================================
// CREATE/UPDATE SCHEMAS
// =============================================================================

/**
 * Schema for creating a Python file
 */
export const createPythonFileSchema = z.object({
	title: z
		.string()
		.min(1, 'Le titre est requis')
		.max(MAX_TITLE_LENGTH, `Le titre ne doit pas depasser ${MAX_TITLE_LENGTH} caracteres`),
	description: z
		.string()
		.max(
			MAX_DESCRIPTION_LENGTH,
			`La description ne doit pas depasser ${MAX_DESCRIPTION_LENGTH} caracteres`
		)
		.optional()
		.nullable(),
	code: z
		.string()
		.min(1, 'Le code est requis')
		.max(MAX_CODE_SIZE, `Le code ne doit pas depasser ${MAX_CODE_SIZE} caracteres`),
	is_public: z.boolean().default(false)
});

/**
 * Schema for updating a Python file (all fields optional)
 */
export const updatePythonFileSchema = z.object({
	title: z
		.string()
		.min(1, 'Le titre est requis')
		.max(MAX_TITLE_LENGTH, `Le titre ne doit pas depasser ${MAX_TITLE_LENGTH} caracteres`)
		.optional(),
	description: z
		.string()
		.max(
			MAX_DESCRIPTION_LENGTH,
			`La description ne doit pas depasser ${MAX_DESCRIPTION_LENGTH} caracteres`
		)
		.optional()
		.nullable(),
	code: z
		.string()
		.min(1, 'Le code est requis')
		.max(MAX_CODE_SIZE, `Le code ne doit pas depasser ${MAX_CODE_SIZE} caracteres`)
		.optional(),
	is_public: z.boolean().optional()
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

/**
 * Schema for listing Python files query parameters
 */
export const listPythonFilesQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	includeAssigned: z
		.enum(['true', 'false'])
		.default('true')
		.transform((v) => v === 'true'),
	onlyMine: z
		.enum(['true', 'false'])
		.default('false')
		.transform((v) => v === 'true')
});

/**
 * Schema for listing student files query parameters (for teachers)
 */
export const studentFilesQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	class_id: z.string().uuid('ID de classe invalide').optional(),
	student_id: z.string().uuid("ID d'etudiant invalide").optional()
});

// =============================================================================
// ASSIGNMENT SCHEMAS
// =============================================================================

/**
 * Schema for assigning a file to classes
 */
export const assignPythonFileSchema = z.object({
	class_ids: z
		.array(z.string().uuid('ID de classe invalide'))
		.min(1, 'Au moins une classe est requise')
		.max(50, 'Maximum 50 classes par assignation'),
	instructions: z
		.string()
		.max(
			MAX_INSTRUCTIONS_LENGTH,
			`Les instructions ne doivent pas depasser ${MAX_INSTRUCTIONS_LENGTH} caracteres`
		)
		.optional()
		.nullable(),
	due_date: z.string().datetime({ message: 'Format de date invalide' }).optional().nullable()
});

// =============================================================================
// PARAMETER SCHEMAS
// =============================================================================

/**
 * Schema for UUID parameter validation
 */
export const uuidParamSchema = z.string().uuid('ID invalide');

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreatePythonFileInput = z.infer<typeof createPythonFileSchema>;
export type UpdatePythonFileInput = z.infer<typeof updatePythonFileSchema>;
export type ListPythonFilesQuery = z.infer<typeof listPythonFilesQuerySchema>;
export type StudentFilesQuery = z.infer<typeof studentFilesQuerySchema>;
export type AssignPythonFileInput = z.infer<typeof assignPythonFileSchema>;
