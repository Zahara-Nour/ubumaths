/**
 * Migration validation schemas
 * Comprehensive Zod schemas for all migration-related database operations
 */

import { z } from 'zod';

// ============================================================================
// MIGRATION STATUS ENUM
// ============================================================================

export const migrationStatusSchema = z.enum([
	'pending',
	'converted',
	'imported',
	'validated',
	'failed'
]);
export type MigrationStatus = z.infer<typeof migrationStatusSchema>;

// ============================================================================
// MIGRATION TRACKING SCHEMAS
// ============================================================================

/**
 * Schema for inserting migration tracking records
 */
export const migrationTrackingInsertSchema = z.object({
	old_question_hash: z.string().length(64, 'SHA-256 hash must be exactly 64 characters'), // SHA-256 hash
	old_question_index: z.number().int().min(0).max(999999, 'Question index too large'),
	old_description: z.string().min(1).max(500, 'Description must be between 1 and 500 characters'),
	migration_status: migrationStatusSchema,
	phase: z.number().int().min(1).max(4).nullable(),
	new_template_id: z.string().uuid('Invalid UUID format').nullable(),
	conversion_errors: z
		.array(
			z.object({
				code: z.string().max(50),
				message: z.string().max(500),
				canRetry: z.boolean()
			})
		)
		.max(50, 'Too many conversion errors')
		.default([]),
	conversion_notes: z.string().max(2000, 'Conversion notes too long').nullable(),
	converted_at: z.string().datetime().nullable().optional(),
	imported_at: z.string().datetime().nullable().optional(),
	validated_at: z.string().datetime().nullable().optional(),
	updated_at: z.string().datetime().optional()
});

/**
 * Schema for updating migration tracking records
 */
export const migrationTrackingUpdateSchema = migrationTrackingInsertSchema.partial().required({
	old_question_hash: true
});

// ============================================================================
// MIGRATION IMAGES SCHEMAS
// ============================================================================

/**
 * Schema for migration image records
 */
export const migrationImageSchema = z.object({
	old_path: z.string().min(1).max(500, 'Path must be between 1 and 500 characters'),
	new_path: z.string().min(1).max(500, 'Path must be between 1 and 500 characters'),
	file_size: z
		.number()
		.int()
		.positive('File size must be positive')
		.max(50 * 1024 * 1024, 'File size too large (max 50MB)')
		.nullable(),
	migration_status: z.enum(['pending', 'migrated', 'failed']),
	error_message: z.string().max(1000, 'Error message too long').nullable()
});

// ============================================================================
// MIGRATION STATE FILE SCHEMAS
// ============================================================================

/**
 * Phase status in state file
 */
export const phaseStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed']);

/**
 * Phase state in migration state file
 */
export const phaseStateSchema = z.object({
	status: phaseStatusSchema,
	questionsProcessed: z.number().int().min(0).max(999999),
	startDate: z.string().datetime().nullable(),
	endDate: z.string().datetime().nullable(),
	lastProcessedIndex: z.number().int().min(0).max(999999).optional(),
	lastCheckpoint: z.string().datetime().nullable().optional(),
	questionsSuccessful: z.number().int().min(0).max(999999).optional(),
	questionsFailed: z.number().int().min(0).max(999999).optional(),
	successRate: z.number().min(0).max(100).optional()
});

/**
 * Complete migration state file schema
 */
export const migrationStateSchema = z.object({
	version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (x.y.z)'),
	currentPhase: z.number().int().min(1).max(4),
	lastUpdated: z.string().datetime().nullable(),
	phases: z.object({
		'1': phaseStateSchema,
		'2': phaseStateSchema,
		'3': phaseStateSchema,
		'4': phaseStateSchema
	}),
	totalQuestions: z.number().int().min(0).max(999999),
	lastProcessedIndex: z.number().int().min(0).max(999999),
	failedQuestionIndices: z.array(z.number().int().min(0).max(999999)).max(10000)
});

export type MigrationState = z.infer<typeof migrationStateSchema>;
export type PhaseState = z.infer<typeof phaseStateSchema>;

// ============================================================================
// QUESTION MIGRATION SCHEMAS
// ============================================================================

/**
 * Schema for old question data being migrated
 */
export const oldQuestionSchema = z.object({
	type: z.string().max(100),
	description: z.string().max(500).optional(),
	subdescription: z.string().max(500).optional(),
	statement: z.string().max(5000),
	answer: z.unknown(), // Can be various types
	options: z.unknown().optional(),
	grade: z.string().max(50).optional(),
	theme: z.string().max(100).optional()
});

/**
 * Schema for question hash generation input
 */
export const questionHashInputSchema = z.object({
	type: z.string(),
	statement: z.string(),
	answer: z.unknown(),
	options: z.unknown().optional()
});

// ============================================================================
// BATCH PROCESSING SCHEMAS
// ============================================================================

/**
 * Schema for batch processing parameters
 */
export const batchProcessingSchema = z.object({
	batchSize: z.number().int().min(1).max(1000).default(50),
	startIndex: z.number().int().min(0).max(999999).default(0),
	endIndex: z.number().int().min(0).max(999999).default(999999),
	dryRun: z.boolean().default(false)
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate and sanitize migration tracking input
 */
export function validateMigrationTrackingInsert(data: unknown) {
	return migrationTrackingInsertSchema.safeParse(data);
}

/**
 * Validate and sanitize migration tracking update
 */
export function validateMigrationTrackingUpdate(data: unknown) {
	return migrationTrackingUpdateSchema.safeParse(data);
}

/**
 * Validate and sanitize migration state
 */
export function validateMigrationState(data: unknown) {
	return migrationStateSchema.safeParse(data);
}

/**
 * Validate migration image data
 */
export function validateMigrationImage(data: unknown) {
	return migrationImageSchema.safeParse(data);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a value is a valid migration status
 */
export function isMigrationStatus(value: unknown): value is MigrationStatus {
	return migrationStatusSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid phase number
 */
export function isValidPhase(value: unknown): value is 1 | 2 | 3 | 4 {
	const result = z.number().int().min(1).max(4).safeParse(value);
	return result.success;
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize a string for database storage
 */
export function sanitizeString(str: string, maxLength: number = 500): string {
	// Remove null bytes and control characters except newline and tab
	// eslint-disable-next-line no-control-regex
	const cleaned = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
	// Truncate to max length
	return cleaned.slice(0, maxLength);
}

/**
 * Sanitize an error message for storage
 */
export function sanitizeErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return sanitizeString(error.message, 1000);
	}
	return sanitizeString(String(error), 1000);
}

/**
 * Sanitize conversion errors array
 */
export function sanitizeConversionErrors(
	errors: unknown[]
): Array<{ code: string; message: string; canRetry: boolean }> {
	return errors
		.slice(0, 50) // Limit to 50 errors
		.map((error, index) => {
			if (typeof error === 'object' && error !== null) {
				const e = error as { code?: unknown; message?: unknown; canRetry?: unknown };
				const code = typeof e.code === 'string' ? e.code : `ERROR_${index}`;
				const message = typeof e.message === 'string' ? e.message : String(error);
				return {
					code: sanitizeString(code, 50),
					message: sanitizeString(message, 500),
					canRetry: Boolean(e.canRetry)
				};
			}
			return {
				code: `ERROR_${index}`,
				message: sanitizeString(String(error), 500),
				canRetry: false
			};
		});
}
