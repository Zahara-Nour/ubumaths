/**
 * Exercise Mastery Validation Schemas
 * ====================================
 * Zod schemas for validating exercise mastery API requests
 */

import { z } from 'zod';
import { uuidSchema } from './common';
import { MASTERY_STATUSES } from '$lib/types/exercise-mastery';

// ============================================================================
// MASTERY STATUS SCHEMA
// ============================================================================

/**
 * Mastery status enum validation
 */
export const masteryStatusSchema = z.enum(MASTERY_STATUSES, {
	message: 'Statut invalide. Valeurs acceptées: not_worked, mastered, needs_review'
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * URL parameter schema for exercise ID
 */
export const exerciseIdParamSchema = z.object({
	exerciseId: uuidSchema
});

/**
 * Request body schema for updating mastery status
 */
export const updateMasterySchema = z.object({
	status: masteryStatusSchema
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Single mastery item in list response
 */
export const masteryItemSchema = z.object({
	exercise_id: z.string().uuid(),
	status: masteryStatusSchema
});

/**
 * GET /api/student/exercise-mastery response
 */
export const masteryListResponseSchema = z.object({
	mastery: z.array(masteryItemSchema)
});

/**
 * PUT /api/student/exercise-mastery/[exerciseId] response
 */
export const masteryUpdateResponseSchema = z.object({
	success: z.literal(true),
	exercise_id: z.string().uuid(),
	status: masteryStatusSchema
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate exercise ID URL parameter
 */
export function validateExerciseIdParam(params: Record<string, string>) {
	return exerciseIdParamSchema.safeParse(params);
}

/**
 * Validate mastery update request body
 */
export function validateUpdateMastery(data: unknown) {
	return updateMasterySchema.safeParse(data);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type MasteryStatusInput = z.infer<typeof masteryStatusSchema>;
export type UpdateMasteryInput = z.infer<typeof updateMasterySchema>;
export type ExerciseIdParamInput = z.infer<typeof exerciseIdParamSchema>;
