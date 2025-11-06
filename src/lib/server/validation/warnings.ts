/**
 * Warnings system validation schemas
 * Validates warning types and operations for student discipline tracking
 */

import { z } from 'zod';

// ============================================================================
// WARNING TYPE SCHEMA
// ============================================================================

/**
 * Warning type enum
 * - C: Comportement (Behavior)
 * - M: Matériel (Equipment/Materials)
 * - R: Retard (Late)
 * - T: Travail (Work/Homework)
 */
export const warningTypeSchema = z.enum(['C', 'M', 'R', 'T']);

// ============================================================================
// ADD WARNING SCHEMA
// ============================================================================

/**
 * Schema for adding a warning to a student
 * Validates student_id, class_id, academic_period_id, and warning_type
 */
export const addWarningSchema = z.object({
	student_id: z.string().uuid('ID élève invalide'),
	class_id: z.string().uuid('ID classe invalide'),
	academic_period_id: z.string().uuid('ID période académique invalide'),
	warning_type: warningTypeSchema
});

/**
 * Inferred TypeScript type for add warning data
 */
export type AddWarningData = z.infer<typeof addWarningSchema>;

// ============================================================================
// REMOVE WARNING SCHEMA
// ============================================================================

/**
 * Schema for removing a warning
 * Validates warning_id (UUID)
 */
export const removeWarningSchema = z.object({
	warning_id: z.string().uuid('ID avertissement invalide')
});

/**
 * Inferred TypeScript type for remove warning data
 */
export type RemoveWarningData = z.infer<typeof removeWarningSchema>;

// ============================================================================
// GET WARNINGS SCHEMA
// ============================================================================

/**
 * Schema for retrieving warnings (query parameters)
 * Validates class_id and academic_period_id as optional filters
 */
export const getWarningsSchema = z.object({
	class_id: z.string().uuid('ID classe invalide').optional(),
	academic_period_id: z.string().uuid('ID période académique invalide').optional()
});

/**
 * Inferred TypeScript type for get warnings query params
 */
export type GetWarningsQuery = z.infer<typeof getWarningsSchema>;

// ============================================================================
// GET STUDENT WARNINGS SCHEMA
// ============================================================================

/**
 * Schema for retrieving warnings for a specific student
 * Validates student_id from route parameter
 */
export const getStudentWarningsSchema = z.object({
	student_id: z.string().uuid('ID élève invalide')
});

/**
 * Inferred TypeScript type for get student warnings params
 */
export type GetStudentWarningsParams = z.infer<typeof getStudentWarningsSchema>;
