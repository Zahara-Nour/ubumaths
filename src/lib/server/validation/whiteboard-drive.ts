/**
 * Whiteboard Drive Sync Validation Schemas
 * Zod schemas for whiteboard Google Drive sync endpoints
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Google Drive file ID pattern: alphanumeric with dashes and underscores, 10-50 chars */
const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{10,50}$/;

// ============================================================================
// SAVE TO DRIVE SCHEMAS
// ============================================================================

/**
 * Schema for saving whiteboard to Google Drive
 * POST /api/whiteboard/drive/save
 */
export const saveToDriveRequestSchema = z.object({
	/** Whiteboard document (validated separately by validateUbwFile) */
	document: z.record(z.string(), z.unknown()),
	/** File name (without extension) */
	fileName: z
		.string()
		.min(1, 'File name is required')
		.max(255, 'File name cannot exceed 255 characters')
		.transform((val) => val.trim()),
	/** Existing file ID to update (optional - creates new if not provided) */
	fileId: z.string().regex(DRIVE_FILE_ID_REGEX, 'Invalid Google Drive file ID').optional()
});

export type SaveToDriveRequest = z.infer<typeof saveToDriveRequestSchema>;

// ============================================================================
// LOAD FROM DRIVE SCHEMAS
// ============================================================================

/**
 * Schema for loading whiteboard from Google Drive
 * GET /api/whiteboard/drive/load/[fileId]
 */
export const loadFromDriveParamsSchema = z.object({
	fileId: z.string().regex(DRIVE_FILE_ID_REGEX, 'Invalid Google Drive file ID')
});

export type LoadFromDriveParams = z.infer<typeof loadFromDriveParamsSchema>;

// ============================================================================
// RESPONSE TYPES (for documentation)
// ============================================================================

/**
 * Response type for save operation
 */
export interface SaveToDriveResponse {
	success: boolean;
	fileId: string;
	modifiedTime: string;
}

/**
 * Response type for list operation
 */
export interface ListDriveFilesResponse {
	files: Array<{
		id: string;
		name: string;
		modifiedTime: string;
	}>;
}

/**
 * Response type for load operation
 */
export interface LoadFromDriveResponse {
	document: unknown;
	fileId: string;
	name: string;
	modifiedTime: string;
}
