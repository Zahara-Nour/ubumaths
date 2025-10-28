/**
 * Error logging validation schemas
 */

import { z } from 'zod';

/**
 * Schema for logging errors
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
