/**
 * CRON Jobs validation schemas
 * Schemas for admin CRON monitoring endpoints
 */

import { z } from 'zod';

// ============================================================================
// JOB STATUS ENUM
// ============================================================================

/**
 * Background job status values
 */
export const cronJobStatusSchema = z.enum(['running', 'success', 'failed', 'timeout']);
export type CronJobStatus = z.infer<typeof cronJobStatusSchema>;

// ============================================================================
// QUERY PARAMS - GET /api/admin/cron/jobs
// ============================================================================

/**
 * Query parameters for listing CRON job executions
 */
export const cronJobsQuerySchema = z.object({
	job_name: z
		.string()
		.max(100, 'Job name must be 100 characters or less')
		.optional()
		.transform((val) => (val === '' ? undefined : val)),
	status: z.enum(['all', 'running', 'success', 'failed', 'timeout']).default('all'),
	period: z.enum(['24h', '7d', '30d']).default('7d'),
	limit: z.coerce
		.number()
		.int('Limit must be an integer')
		.min(1, 'Limit must be at least 1')
		.max(100, 'Limit cannot exceed 100')
		.default(50),
	offset: z.coerce
		.number()
		.int('Offset must be an integer')
		.min(0, 'Offset cannot be negative')
		.default(0)
});

export type CronJobsQuery = z.infer<typeof cronJobsQuerySchema>;

// ============================================================================
// REQUEST BODY - POST /api/admin/cron/trigger
// ============================================================================

/**
 * Allowed CRON job paths that can be triggered manually
 */
const ALLOWED_JOB_PATHS = [
	'/api/cron/daily-summaries-and-rewards',
	'/api/cleanup/all',
	'/api/riddles/auto-select-daily'
] as const;

/**
 * Request body for triggering a CRON job manually
 */
export const cronTriggerBodySchema = z.object({
	job_path: z
		.string()
		.min(1, 'Job path is required')
		.refine(
			(path) => ALLOWED_JOB_PATHS.includes(path as (typeof ALLOWED_JOB_PATHS)[number]),
			`Job path must be one of: ${ALLOWED_JOB_PATHS.join(', ')}`
		)
});

export type CronTriggerBody = z.infer<typeof cronTriggerBodySchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Single job execution record
 */
export const cronJobRunSchema = z.object({
	id: z.string().uuid(),
	job_name: z.string(),
	status: cronJobStatusSchema,
	started_at: z.string().datetime(),
	completed_at: z.string().datetime().nullable(),
	execution_time_ms: z.number().int().nonnegative().nullable(),
	error_message: z.string().nullable(),
	metadata: z.record(z.string(), z.unknown()).nullable()
});

export type CronJobRun = z.infer<typeof cronJobRunSchema>;

/**
 * Statistics for the selected period
 */
export const cronJobsStatsSchema = z.object({
	total_runs_period: z.number().int().nonnegative(),
	success_count: z.number().int().nonnegative(),
	failed_count: z.number().int().nonnegative(),
	avg_execution_time_ms: z.number().int().nonnegative()
});

export type CronJobsStats = z.infer<typeof cronJobsStatsSchema>;

/**
 * Pagination info
 */
export const cronJobsPaginationSchema = z.object({
	total: z.number().int().nonnegative(),
	limit: z.number().int().positive(),
	offset: z.number().int().nonnegative()
});

export type CronJobsPagination = z.infer<typeof cronJobsPaginationSchema>;

/**
 * Full response for GET /api/admin/cron/jobs
 */
export const cronJobsResponseSchema = z.object({
	jobs: z.array(cronJobRunSchema),
	stats: cronJobsStatsSchema,
	pagination: cronJobsPaginationSchema
});

export type CronJobsResponse = z.infer<typeof cronJobsResponseSchema>;

/**
 * Response for POST /api/admin/cron/trigger
 */
export const cronTriggerResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	job_path: z.string(),
	triggered_at: z.string().datetime()
});

export type CronTriggerResponse = z.infer<typeof cronTriggerResponseSchema>;

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export { ALLOWED_JOB_PATHS };
