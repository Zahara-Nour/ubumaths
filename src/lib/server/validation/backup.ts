/**
 * Validation schemas for Exercise Backup/Restore System
 *
 * Provides Zod schemas for validating backup files during import operations.
 * Ensures data integrity and provides helpful error messages.
 *
 * @module server/validation/backup
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Current backup format version */
export const BACKUP_VERSION = '1.0' as const;

/** Backup format identifier */
export const BACKUP_FORMAT = 'ubumaths-backup' as const;

/** Maximum file size in bytes (50 MB) */
export const MAX_BACKUP_SIZE_BYTES = 50 * 1024 * 1024;

/** Maximum number of records per table */
export const MAX_RECORDS = {
	exercises: 100000,
	exercise_templates: 10000,
	exercise_favorites: 1000000,
	exercise_share_tokens: 100000
} as const;

// ============================================================================
// BASE SCHEMAS (reused across tables)
// ============================================================================

/** UUID schema */
const uuidSchema = z.string().uuid('Invalid UUID format');

/** ISO 8601 datetime schema */
const datetimeSchema = z.string().datetime({ offset: true }).or(z.string().datetime());

/** Email schema for reference */
const emailSchema = z.string().email();

// ============================================================================
// EXERCISE BACKUP RECORD SCHEMA
// ============================================================================

/**
 * Schema for a single exercise record in backup
 * Matches database.ts exercises Row type
 */
export const exerciseBackupRecordSchema = z.object({
	// Primary key
	id: uuidSchema,

	// Metadata
	slug: z.string().nullable(),
	title: z.string().nullable(),
	source: z.string().nullable(),
	difficulty: z.number().int().min(1).max(3),
	tags: z.array(z.string()),

	// Content
	statement_md: z.string(),
	solution_md: z.string(),

	// Additional metadata
	grade_levels: z.array(z.string()).nullable(),
	topic: z.string().nullable(),
	is_public: z.boolean(),
	distribution_mode: z.string(),

	// JSONB fields (stored as Json in DB)
	variables: z.unknown(), // Can be complex JSONB structure
	variations: z.unknown().nullable(),
	shared: z.unknown().nullable(),
	resources: z.unknown().nullable(),
	generic_functions: z.array(z.string()).nullable(),

	// Audit fields
	created_at: datetimeSchema,
	updated_at: datetimeSchema,
	created_by: uuidSchema,

	// Optional: email for human reference (not stored in DB)
	_created_by_email: emailSchema.optional()
});

export type ExerciseBackupRecord = z.infer<typeof exerciseBackupRecordSchema>;

// ============================================================================
// EXERCISE TEMPLATE BACKUP RECORD SCHEMA
// ============================================================================

/**
 * Schema for a single exercise template record in backup
 * Matches database.ts exercise_templates Row type
 */
export const templateBackupRecordSchema = z.object({
	// Primary key
	id: uuidSchema,

	// Metadata
	title: z.string(),
	description: z.string().nullable(),

	// Template content
	template_data: z.unknown(), // JSONB - exercise export format

	// System vs user
	is_system: z.boolean(),

	// Audit fields
	created_at: datetimeSchema,
	updated_at: datetimeSchema,
	created_by: uuidSchema.nullable(), // null for system templates

	// Optional: email for human reference
	_created_by_email: emailSchema.optional()
});

export type TemplateBackupRecord = z.infer<typeof templateBackupRecordSchema>;

// ============================================================================
// EXERCISE FAVORITE BACKUP RECORD SCHEMA
// ============================================================================

/**
 * Schema for a single exercise favorite record in backup
 * Matches database.ts exercise_favorites Row type
 */
export const favoriteBackupRecordSchema = z.object({
	// Composite key fields
	user_id: uuidSchema,
	exercise_id: uuidSchema,

	// Audit
	created_at: datetimeSchema,

	// Optional: email for human reference
	_user_email: emailSchema.optional()
});

export type FavoriteBackupRecord = z.infer<typeof favoriteBackupRecordSchema>;

// ============================================================================
// EXERCISE SHARE TOKEN BACKUP RECORD SCHEMA
// ============================================================================

/**
 * Schema for a single exercise share token record in backup
 * Matches database.ts exercise_share_tokens Row type
 */
export const tokenBackupRecordSchema = z.object({
	// Primary key
	id: uuidSchema,

	// Core fields
	exercise_id: uuidSchema,
	token: z.string().min(1).max(100),
	created_by: uuidSchema,

	// Token metadata
	expires_at: datetimeSchema.nullable(),
	is_active: z.boolean(),
	access_count: z.number().int().nonnegative(),
	last_accessed_at: datetimeSchema.nullable(),

	// Audit
	created_at: datetimeSchema,

	// Optional: email for human reference
	_created_by_email: emailSchema.optional()
});

export type TokenBackupRecord = z.infer<typeof tokenBackupRecordSchema>;

// ============================================================================
// BACKUP METADATA SCHEMA
// ============================================================================

/**
 * Schema for backup metadata
 */
export const backupMetadataSchema = z.object({
	tables_included: z.array(z.string()),
	record_counts: z.object({
		exercises: z.number().int().nonnegative().max(MAX_RECORDS.exercises),
		exercise_templates: z.number().int().nonnegative().max(MAX_RECORDS.exercise_templates),
		exercise_favorites: z.number().int().nonnegative().max(MAX_RECORDS.exercise_favorites),
		exercise_share_tokens: z.number().int().nonnegative().max(MAX_RECORDS.exercise_share_tokens)
	}),
	app_version: z.string().optional()
});

export type BackupMetadata = z.infer<typeof backupMetadataSchema>;

// ============================================================================
// FULL BACKUP SCHEMA
// ============================================================================

/**
 * Schema for complete exercise backup file
 */
export const exerciseBackupSchema = z.object({
	// Version info
	version: z.literal(BACKUP_VERSION),
	format: z.literal(BACKUP_FORMAT),

	// Creation info
	created_at: datetimeSchema,
	created_by: emailSchema,

	// Metadata
	metadata: backupMetadataSchema,

	// Data
	data: z.object({
		exercises: z.array(exerciseBackupRecordSchema).max(MAX_RECORDS.exercises),
		exercise_templates: z.array(templateBackupRecordSchema).max(MAX_RECORDS.exercise_templates),
		exercise_favorites: z.array(favoriteBackupRecordSchema).max(MAX_RECORDS.exercise_favorites),
		exercise_share_tokens: z.array(tokenBackupRecordSchema).max(MAX_RECORDS.exercise_share_tokens)
	})
});

export type ExerciseBackup = z.infer<typeof exerciseBackupSchema>;

// ============================================================================
// RESTORE OPTIONS SCHEMA
// ============================================================================

/**
 * Schema for restore options
 */
export const restoreOptionsSchema = z.object({
	/** How to handle ID conflicts */
	conflict_strategy: z.enum(['skip', 'replace']).default('skip'),

	/** Reassign exercises with missing created_by to admin */
	reassign_orphans_to_admin: z.boolean().default(false),

	/** Admin ID to reassign orphans to (required if reassign_orphans_to_admin is true) */
	admin_id: uuidSchema.optional()
});

export type RestoreOptions = z.infer<typeof restoreOptionsSchema>;

// ============================================================================
// RESTORE RESULT TYPES
// ============================================================================

/**
 * Result of a restore operation
 */
export interface RestoreResult {
	success: boolean;
	stats: {
		exercises: { imported: number; skipped: number; replaced: number; failed: number };
		exercise_templates: { imported: number; skipped: number; replaced: number; failed: number };
		exercise_favorites: { imported: number; skipped: number; replaced: number; failed: number };
		exercise_share_tokens: { imported: number; skipped: number; replaced: number; failed: number };
	};
	errors: Array<{
		table: string;
		record_id: string;
		error: string;
	}>;
}

/**
 * Backup statistics (for UI display)
 */
export interface BackupStats {
	exercises: number;
	exercise_templates: number;
	exercise_favorites: number;
	exercise_share_tokens: number;
	total: number;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a complete backup file
 *
 * @param data - Backup data to validate (typically from JSON.parse)
 * @returns Validation result with success flag and data or error
 */
export function validateBackup(data: unknown): {
	success: boolean;
	data?: ExerciseBackup;
	error?: string;
} {
	try {
		const validated = exerciseBackupSchema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

/**
 * Validate restore options
 *
 * @param data - Options data to validate
 * @returns Validation result with success flag and data or error
 */
export function validateRestoreOptions(data: unknown): {
	success: boolean;
	data?: RestoreOptions;
	error?: string;
} {
	try {
		const validated = restoreOptionsSchema.parse(data);

		// Additional validation: admin_id required if reassign_orphans_to_admin
		if (validated.reassign_orphans_to_admin && !validated.admin_id) {
			return {
				success: false,
				error: 'admin_id is required when reassign_orphans_to_admin is true'
			};
		}

		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
			return { success: false, error: messages.join('; ') };
		}
		return { success: false, error: String(error) };
	}
}

/**
 * Check if backup file size is within limits
 *
 * @param sizeBytes - File size in bytes
 * @returns true if within limits
 */
export function isBackupSizeValid(sizeBytes: number): boolean {
	return sizeBytes > 0 && sizeBytes <= MAX_BACKUP_SIZE_BYTES;
}

/**
 * Get human-readable max file size
 */
export function getMaxFileSizeDisplay(): string {
	return `${MAX_BACKUP_SIZE_BYTES / (1024 * 1024)} MB`;
}
