/**
 * School and Academic Period validation schemas
 */

import { z } from 'zod';
import { uuidSchema } from './common';

// ============================================================================
// URL PARAMETER SCHEMAS
// ============================================================================

/**
 * Schema for school ID URL parameter
 */
export const schoolIdParamSchema = z.object({
	schoolId: uuidSchema
});

/**
 * Schema for school year ID URL parameter
 */
export const yearIdParamSchema = z.object({
	yearId: uuidSchema
});

/**
 * Schema for combined school + year URL parameters
 */
export const schoolYearParamsSchema = z.object({
	schoolId: uuidSchema,
	yearId: uuidSchema
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Link assessments response schema
 */
export const linkAssessmentsResponseSchema = z.object({
	success: z.literal(true),
	count: z.number().int().nonnegative(),
	message: z.string()
});

/**
 * Period with assessment count schema
 */
export const periodWithStatsSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	type: z.enum(['trimester', 'semester', 'quarter', 'custom']),
	start_date: z.string(), // date string
	end_date: z.string(), // date string
	period_order: z.number().int().positive(),
	assessments_count: z.number().int().nonnegative()
});

/**
 * Year stats response schema
 */
export const yearStatsResponseSchema = z.object({
	periods: z.array(periodWithStatsSchema)
});
