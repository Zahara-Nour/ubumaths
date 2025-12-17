/**
 * File Operations Utilities
 *
 * Handles .ubw file validation, serialization, download, and upload.
 *
 * @module whiteboard/utils/file-operations
 */

import { whiteboardDocumentSchema } from '../types/file-format';
import type { WhiteboardDocument } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** File extension for whiteboard documents */
export const FILE_EXTENSION = '.ubw';

/** MIME type for whiteboard documents */
export const MIME_TYPE = 'application/vnd.ubumaths.whiteboard+json';

/** Current file format version */
export const CURRENT_VERSION = 1;

// =============================================================================
// Types
// =============================================================================

export interface FileValidationResult {
	valid: boolean;
	error?: string;
	document?: WhiteboardDocument;
}

export interface FileSaveOptions {
	filename?: string;
}

export interface FileMetadata {
	version: number;
	createdAt: string;
	updatedAt: string;
	title: string;
	pageCount: number;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a .ubw file content with Zod
 */
export function validateUbwFile(content: string): FileValidationResult {
	try {
		const parsed = JSON.parse(content);

		// Use Zod schema for validation
		const result = whiteboardDocumentSchema.safeParse(parsed);

		if (!result.success) {
			const issue = result.error.issues[0];
			return {
				valid: false,
				error: `Validation: ${issue.path.join('.')} - ${issue.message}`
			};
		}

		// Additional version check
		if (result.data.version > CURRENT_VERSION) {
			return {
				valid: false,
				error: `Version ${result.data.version} non supportée. Version max: ${CURRENT_VERSION}`
			};
		}

		return { valid: true, document: result.data as WhiteboardDocument };
	} catch {
		return { valid: false, error: 'Format JSON invalide' };
	}
}

/**
 * Validate filename
 */
export function isValidFilename(filename: string): boolean {
	if (!filename.endsWith(FILE_EXTENSION)) return false;
	const basename = filename.slice(0, -FILE_EXTENSION.length);
	if (basename.length === 0) return false;
	if (/[<>:"/\\|?*]/.test(basename)) return false;
	return true;
}

// =============================================================================
// Filename Functions
// =============================================================================

/**
 * Generate filename with extension from title
 */
export function generateFilename(title: string): string {
	const trimmed = title.trim();
	if (!trimmed) {
		return `Sans_titre${FILE_EXTENSION}`;
	}

	const sanitized = trimmed
		.replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
		.replace(/\s+/g, '_'); // Replace spaces with underscore

	const basename = sanitized || 'Sans_titre';
	return `${basename}${FILE_EXTENSION}`;
}

/**
 * Extract title from filename
 */
export function extractTitleFromFilename(filename: string): string {
	if (!filename.endsWith(FILE_EXTENSION)) {
		return filename;
	}

	const basename = filename.slice(0, -FILE_EXTENSION.length);
	return basename.replace(/_/g, ' ').trim() || 'Sans titre';
}

// =============================================================================
// Serialization Functions
// =============================================================================

/**
 * Serialize document for saving
 */
export function serializeDocument(document: WhiteboardDocument): string {
	return JSON.stringify(document, null, 2);
}

/**
 * Extract metadata from document
 */
export function extractMetadata(document: WhiteboardDocument): FileMetadata {
	return {
		version: document.version,
		createdAt: document.createdAt,
		updatedAt: document.updatedAt,
		title: document.title,
		pageCount: document.pages.length
	};
}

/**
 * Prepare document for save (update timestamps)
 */
export function prepareForSave(document: WhiteboardDocument): WhiteboardDocument {
	return {
		...document,
		updatedAt: new Date().toISOString()
	};
}

// =============================================================================
// Blob Functions
// =============================================================================

/**
 * Create a Blob for download
 */
export function createDocumentBlob(document: WhiteboardDocument): Blob {
	const content = serializeDocument(document);
	return new Blob([content], { type: MIME_TYPE });
}

/**
 * Create object URL for download
 */
export function createDownloadUrl(document: WhiteboardDocument): string {
	const blob = createDocumentBlob(document);
	return URL.createObjectURL(blob);
}

/**
 * Revoke object URL after download
 */
export function revokeDownloadUrl(url: string): void {
	URL.revokeObjectURL(url);
}

// =============================================================================
// Download Functions
// =============================================================================

/**
 * Trigger file download
 */
export function downloadDocument(
	document: WhiteboardDocument,
	options: FileSaveOptions = {}
): void {
	const prepared = prepareForSave(document);
	const filename = options.filename || generateFilename(prepared.title);
	const url = createDownloadUrl(prepared);

	// Create and click download link
	const link = window.document.createElement('a');
	link.href = url;
	link.download = filename;
	link.style.display = 'none';

	window.document.body.appendChild(link);
	link.click();
	window.document.body.removeChild(link);

	// Cleanup URL after small delay
	setTimeout(() => revokeDownloadUrl(url), 1000);
}

// =============================================================================
// Upload Functions
// =============================================================================

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			const content = e.target?.result;
			if (typeof content === 'string') {
				resolve(content);
			} else {
				reject(new Error('Failed to read file as text'));
			}
		};

		reader.onerror = () => {
			reject(new Error('Error reading file'));
		};

		reader.readAsText(file);
	});
}

/**
 * Load document from file
 */
export async function loadDocumentFromFile(
	file: File
): Promise<{ success: boolean; document?: WhiteboardDocument; error?: string }> {
	// Validate file extension
	if (!file.name.endsWith(FILE_EXTENSION)) {
		return {
			success: false,
			error: `Type de fichier non supporté. Utilisez un fichier ${FILE_EXTENSION}`
		};
	}

	try {
		const content = await readFileAsText(file);
		const validation = validateUbwFile(content);

		if (!validation.valid) {
			return { success: false, error: validation.error };
		}

		return { success: true, document: validation.document };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Erreur lors de la lecture du fichier'
		};
	}
}

/**
 * Create file input and trigger file selection
 */
export function createFileInput(
	onFileSelected: (file: File) => void,
	accept: string = FILE_EXTENSION
): HTMLInputElement {
	const input = window.document.createElement('input');
	input.type = 'file';
	input.accept = accept;
	input.style.display = 'none';

	input.onchange = (e) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			onFileSelected(file);
		}
		// Cleanup
		input.remove();
	};

	return input;
}

/**
 * Open file picker and load document
 */
export function openFilePicker(
	onLoad: (result: { success: boolean; document?: WhiteboardDocument; error?: string }) => void
): void {
	const input = createFileInput(async (file) => {
		const result = await loadDocumentFromFile(file);
		onLoad(result);
	});

	window.document.body.appendChild(input);
	input.click();
}
