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
