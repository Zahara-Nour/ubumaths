/**
 * Health endpoint validation schemas
 * Schemas for health check and admin dashboard statistics
 */

import { z } from 'zod';

// ============================================================================
// STATUS ENUMS
// ============================================================================

/**
 * System health status
 */
export const healthStatusSchema = z.enum(['ok', 'degraded', 'down']);

/**
 * Background job status
 */
export const jobStatusSchema = z.enum(['running', 'success', 'failed', 'timeout']);

// ============================================================================
// HEALTH CHECK RESPONSE
// ============================================================================

/**
 * Simple health check response
 * Used by /api/health endpoint
 */
export const healthCheckResponseSchema = z.object({
	status: healthStatusSchema,
	latency_ms: z.number().int().positive().max(60000),
	timestamp: z.string().datetime(),
	error: z.string().optional()
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

// ============================================================================
// ERROR STATISTICS
// ============================================================================

/**
 * Error statistics section
 */
export const errorStatsSchema = z.object({
	critical: z.number().int().nonnegative().max(999999),
	unresolved: z.number().int().nonnegative().max(999999),
	lastHour: z.number().int().nonnegative().max(999999),
	trend7d: z.array(z.number().int().nonnegative().max(999999)).length(7)
});

// ============================================================================
// USER STATISTICS
// ============================================================================

/**
 * User by role breakdown
 */
export const usersByRoleSchema = z.object({
	students: z.number().int().nonnegative().max(999999),
	teachers: z.number().int().nonnegative().max(999999),
	admins: z.number().int().nonnegative().max(999999)
});

/**
 * User statistics section
 */
export const userStatsSchema = z.object({
	online: z.number().int().nonnegative().max(999999),
	active24h: z.number().int().nonnegative().max(999999),
	active7d: z.number().int().nonnegative().max(999999),
	active30d: z.number().int().nonnegative().max(999999),
	new7d: z.number().int().nonnegative().max(999999),
	byRole: usersByRoleSchema
});

// ============================================================================
// PERFORMANCE STATISTICS
// ============================================================================

/**
 * Performance statistics section
 */
export const performanceStatsSchema = z.object({
	avgResponseTime: z.number().int().nonnegative().max(60000),
	p95ResponseTime: z.number().int().nonnegative().max(60000),
	errorRate: z.number().nonnegative().max(100),
	slowQueries: z.number().int().nonnegative().max(999999)
});

// ============================================================================
// CONTENT STATISTICS
// ============================================================================

/**
 * Content statistics section
 */
export const contentStatsSchema = z.object({
	exercises: z.number().int().nonnegative().max(999999),
	assessments: z.number().int().nonnegative().max(999999),
	riddles: z.number().int().nonnegative().max(999999),
	srsDecks: z.number().int().nonnegative().max(999999),
	assignments24h: z.number().int().nonnegative().max(999999),
	completions24h: z.number().int().nonnegative().max(999999)
});

// ============================================================================
// JOB STATISTICS
// ============================================================================

/**
 * Individual job status
 */
export const jobStatusDetailSchema = z.object({
	name: z.string().min(1).max(255),
	status: jobStatusSchema,
	lastRun: z.string().datetime().nullable(),
	executionTime: z.number().int().nonnegative().max(3600000).nullable(),
	error: z.string().nullable()
});

/**
 * Job statistics section
 */
export const jobStatsSchema = z.object({
	total: z.number().int().nonnegative().max(999),
	running: z.number().int().nonnegative().max(999),
	failed: z.number().int().nonnegative().max(999),
	recentJobs: z.array(jobStatusDetailSchema).max(20)
});

// ============================================================================
// METADATA
// ============================================================================

/**
 * Response metadata
 */
export const healthMetadataSchema = z.object({
	cached: z.boolean(),
	generatedAt: z.string().datetime(),
	cacheExpiresAt: z.string().datetime().optional()
});

// ============================================================================
// COMPLETE HEALTH STATS RESPONSE
// ============================================================================

/**
 * Complete admin dashboard statistics response
 * Used by /api/admin/health-stats endpoint
 */
export const healthStatsResponseSchema = z.object({
	errors: errorStatsSchema,
	users: userStatsSchema,
	performance: performanceStatsSchema,
	content: contentStatsSchema,
	jobs: jobStatsSchema,
	meta: healthMetadataSchema
});

export type HealthStatsResponse = z.infer<typeof healthStatsResponseSchema>;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ErrorStats = z.infer<typeof errorStatsSchema>;
export type UserStats = z.infer<typeof userStatsSchema>;
export type PerformanceStats = z.infer<typeof performanceStatsSchema>;
export type ContentStats = z.infer<typeof contentStatsSchema>;
export type JobStats = z.infer<typeof jobStatsSchema>;
export type JobStatusDetail = z.infer<typeof jobStatusDetailSchema>;
export type HealthMetadata = z.infer<typeof healthMetadataSchema>;
