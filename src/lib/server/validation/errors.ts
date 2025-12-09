/**
 * Error logging validation schemas
 */

import { z } from 'zod';

/**
 * Schema for logging errors (POST /api/errors/log)
 * Matches ErrorType and ErrorSeverity from errorMonitoring.ts
 */
export const logErrorSchema = z.object({
	// Classification - matches ErrorType
	error_type: z.enum([
		'client_js',
		'server_api',
		'server_load',
		'server_action',
		'validation',
		'performance',
		'database'
	]),
	// Matches ErrorSeverity
	severity: z.enum(['info', 'warning', 'error', 'critical']).optional().default('error'),
	message: z.string().min(1).max(1000),
	url: z.string().min(1).max(500), // Removed .url() to allow relative paths

	// Error details
	stack_trace: z.string().max(5000).optional(),
	error_name: z.string().max(200).optional(),
	file_path: z.string().max(500).optional(),
	line_number: z.number().int().nonnegative().optional(),
	column_number: z.number().int().nonnegative().optional(),

	// Browser context
	user_agent: z.string().max(500).optional(),
	browser_name: z.string().max(100).optional(),
	browser_version: z.string().max(50).optional(),
	os_name: z.string().max(100).optional(),
	device_type: z.enum(['mobile', 'tablet', 'desktop']).optional(),
	viewport_width: z.number().int().positive().max(10000).optional(),
	viewport_height: z.number().int().positive().max(10000).optional(),

	// Additional context
	context: z.record(z.string(), z.unknown()).optional(),
	tags: z.array(z.string().max(100)).max(20).optional()
});

/**
 * Schema for listing errors query parameters (GET /api/errors)
 * Admin only - all fields are optional filters
 */
export const listErrorsQuerySchema = z.object({
	error_type: z
		.enum([
			'client_js',
			'server_api',
			'server_load',
			'server_action',
			'validation',
			'performance',
			'database'
		])
		.optional(),
	severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
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

/**
 * Schema for bulk resolving errors (POST /api/errors/bulk-resolve)
 * Admin specifies filters to determine which errors to resolve
 */
export const bulkResolveErrorsSchema = z
	.object({
		// Filter parameters (same as ErrorFilters)
		error_type: z
			.enum([
				'client_js',
				'server_api',
				'server_load',
				'server_action',
				'validation',
				'performance',
				'database'
			])
			.optional(),
		severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
		resolved: z
			.string()
			.optional()
			.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
		user_id: z.string().uuid().optional(),
		date_from: z.string().datetime('Date de début invalide').optional(),
		date_to: z.string().datetime('Date de fin invalide').optional(),
		search: z.string().trim().max(200).optional(),
		// Resolution notes
		notes: z.string().max(2000, 'Notes trop longues (max 2000 caractères)').optional()
	})
	.refine(
		(data) => {
			// Require at least one filter to prevent accidentally resolving everything
			return !!(
				data.error_type ||
				data.severity ||
				data.resolved !== undefined ||
				data.user_id ||
				data.date_from ||
				data.date_to ||
				data.search
			);
		},
		{
			message:
				'Au moins un filtre doit être spécifié pour éviter de résoudre toutes les erreurs accidentellement'
		}
	);
