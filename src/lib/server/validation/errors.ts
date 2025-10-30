/**
 * Error logging validation schemas
 */

import { z } from 'zod';

/**
 * Schema for logging errors (POST /api/errors/log)
 */
export const logErrorSchema = z.object({
	error_type: z.enum(['frontend', 'backend', 'api', 'database', 'unknown']),
	message: z.string().max(1000),
	url: z.string().url().max(500),
	stack_trace: z.string().max(5000).optional(),
	user_agent: z.string().max(500).optional(),
	severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
	metadata: z.record(z.string(), z.any()).optional()
});

/**
 * Schema for listing errors query parameters (GET /api/errors)
 * Admin only - all fields are optional filters
 */
export const listErrorsQuerySchema = z.object({
	error_type: z.enum(['frontend', 'backend', 'api', 'database', 'unknown']).optional(),
	severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
	resolved: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	user_id: z.string().uuid().optional(),
	date_from: z.string().datetime('Date de début invalide').optional(),
	date_to: z.string().datetime('Date de fin invalide').optional(),
	search: z.string().trim().max(200).optional(),
	limit: z.coerce.number().int().positive().max(100, 'Maximum 100 erreurs').default(50),
	offset: z.coerce.number().int().nonnegative().default(0)
});

/**
 * Schema for resolving errors (PUT /api/errors/[id])
 * Admin adds optional notes when resolving
 */
export const resolveErrorSchema = z.object({
	notes: z.string().max(2000, 'Notes trop longues (max 2000 caractères)').optional()
});

/**
 * Schema for cleanup old errors (POST /api/errors/cleanup)
 * Admin specifies how many days old errors should be deleted
 */
export const cleanupErrorsSchema = z.object({
	days_old: z
		.number()
		.int('Days must be an integer')
		.positive('Days must be positive')
		.max(365, 'Maximum 365 days')
		.default(90)
		.optional()
});
