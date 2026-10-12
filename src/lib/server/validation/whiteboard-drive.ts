/**
 * Whiteboard Drive Sync Validation Schemas
 * Zod schemas for whiteboard Google Drive sync endpoints
 */

import { z } from 'zod';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Google Drive file ID pattern: alphanumeric with dashes and underscores, 10-50 chars */
export const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{10,50}$/;

// ============================================================================
// SAVE TO DRIVE SCHEMAS
// ============================================================================

/** Data URL regex pattern for images */
const DATA_URL_IMAGE_REGEX = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/;

/** Maximum thumbnail size (100KB in base64 ~ 75KB binary) */
const MAX_THUMBNAIL_BASE64_LENGTH = 150000;

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
		.min(1, 'Nom de fichier requis')
		.max(255, 'Nom de fichier trop long (255 caractères au maximum)')
		.transform((val) => val.trim()),
	/** Existing file ID to update (optional - creates new if not provided) */
	fileId: z
		.string()
		.regex(DRIVE_FILE_ID_REGEX, 'Identifiant de fichier Google Drive invalide')
		.optional(),
	/** Target folder ID (optional - uses app root folder if not provided) */
	folderId: z.string().regex(DRIVE_FILE_ID_REGEX, 'Identifiant de dossier invalide').optional(),
	/** Optional thumbnail data URL (WebP/JPEG/PNG) */
	thumbnail: z
		.string()
		.regex(DATA_URL_IMAGE_REGEX, 'Format de miniature invalide')
		.max(MAX_THUMBNAIL_BASE64_LENGTH, 'Miniature trop lourde (100 Ko au maximum)')
		.optional(),
	/** Mark this save as an autosave (hidden from gallery) */
	isAutosave: z.boolean().optional(),
	/** Original file ID this autosave is for (required if isAutosave is true) */
	originalFileId: z
		.string()
		.regex(DRIVE_FILE_ID_REGEX, 'Identifiant du fichier d’origine invalide')
		.optional()
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
	fileId: z.string().regex(DRIVE_FILE_ID_REGEX, 'Identifiant de fichier Google Drive invalide')
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

// ============================================================================
// LIST FILES SCHEMAS
// ============================================================================

/**
 * Schema for list files query params
 * GET /api/whiteboard/drive/list?folderId=xxx
 */
export const listFilesQuerySchema = z.object({
	/** Optional folder ID to list files from (defaults to app root) */
	folderId: z.string().regex(DRIVE_FILE_ID_REGEX, 'Identifiant de dossier invalide').optional()
});

export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;

// ============================================================================
// CREATE FOLDER SCHEMAS
// ============================================================================

/**
 * Schema for creating a folder
 * POST /api/whiteboard/drive/folder
 */
export const createFolderRequestSchema = z.object({
	/** Folder name */
	name: z
		.string()
		.min(1, 'Nom de dossier requis')
		.max(255, 'Nom de dossier trop long (255 caractères au maximum)')
		.transform((val) => val.trim()),
	/** Parent folder ID */
	parentFolderId: z.string().regex(DRIVE_FILE_ID_REGEX, 'Identifiant du dossier parent invalide')
});

export type CreateFolderRequest = z.infer<typeof createFolderRequestSchema>;
