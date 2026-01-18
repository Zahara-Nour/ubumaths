/**
 * Whiteboard Serialization
 *
 * Handles serialization and deserialization of whiteboard documents
 * to/from the .ubw file format (JSON).
 *
 * @module whiteboard/core/serialization
 */

import type { WhiteboardDocument, ArrowElement, ArrowType } from '../types/document';
import { validateDocument, isVersionCompatible } from '../types/file-format';

/** MIME type for .ubw files */
export const UBW_MIME_TYPE = 'application/vnd.ubumaths.whiteboard+json';

/** File extension */
export const UBW_EXTENSION = '.ubw';

// =============================================================================
// Migration
// =============================================================================

/**
 * Migrates arrow elements from old `elbowed` format to new `arrowType` format.
 *
 * Migration rules:
 * - `elbowed: true` → `arrowType: 'elbow'`
 * - No `arrowType` and no `elbowed` → `arrowType: 'sharp'`
 * - Already has `arrowType` → no change
 *
 * @param data - Parsed document data (may be mutated)
 * @returns Migrated data
 */
function migrateArrowTypes(data: unknown): unknown {
	if (typeof data !== 'object' || data === null) return data;

	const doc = data as Record<string, unknown>;
	if (!Array.isArray(doc.pages)) return data;

	for (const page of doc.pages) {
		if (typeof page !== 'object' || page === null) continue;
		const pageObj = page as Record<string, unknown>;
		if (!Array.isArray(pageObj.elements)) continue;

		pageObj.elements = pageObj.elements.map((element: unknown) => {
			if (typeof element !== 'object' || element === null) return element;

			const el = element as Record<string, unknown>;

			// Only process arrow elements
			if (el.type !== 'shape' || el.shapeType !== 'arrow') return element;

			// Skip if already has arrowType
			if (el.arrowType) return element;

			// Determine arrowType from elbowed flag
			const arrowType: ArrowType = el.elbowed === true ? 'elbow' : 'sharp';

			return {
				...el,
				arrowType
			} as ArrowElement;
		});
	}

	return data;
}

/**
 * Migrates arrow elements from legacy waypoints to new unified points[] model.
 *
 * Migration rules:
 * - If `points[]` already exists → no change
 * - Sharp arrows: `points = [start, end]`
 * - Curved arrows with waypoints: `points = [start, ...waypoints.position, end]`
 * - Elbow arrows: `points = [start, end]` (routing will be recalculated)
 *
 * Also ensures default arrowhead (endArrowhead: 'arrow') is set for legacy arrows.
 *
 * @param data - Parsed document data (may be mutated)
 * @returns Migrated data
 */
function migrateArrowPointsModel(data: unknown): unknown {
	if (typeof data !== 'object' || data === null) return data;

	const doc = data as Record<string, unknown>;
	if (!Array.isArray(doc.pages)) return data;

	for (const page of doc.pages) {
		if (typeof page !== 'object' || page === null) continue;
		const pageObj = page as Record<string, unknown>;
		if (!Array.isArray(pageObj.elements)) continue;

		pageObj.elements = pageObj.elements.map((element: unknown) => {
			if (typeof element !== 'object' || element === null) return element;

			const el = element as Record<string, unknown>;

			// Only process arrow elements
			if (el.type !== 'shape' || el.shapeType !== 'arrow') return element;

			// Skip if already has points[]
			if (Array.isArray(el.points) && el.points.length >= 2) return element;

			// Get start and end points
			const start = el.start as { x: number; y: number } | undefined;
			const end = el.end as { x: number; y: number } | undefined;

			if (!start || !end) return element;

			// Build points array based on arrow type
			const arrowType = (el.arrowType as string) ?? 'sharp';
			let points: Array<{ x: number; y: number }>;

			if (arrowType === 'curved' && Array.isArray(el.waypoints)) {
				// Curved: include waypoint positions
				const waypointPositions = el.waypoints
					.filter(
						(wp): wp is { position: { x: number; y: number } } =>
							wp && typeof wp === 'object' && 'position' in wp
					)
					.map((wp) => wp.position);
				points = [start, ...waypointPositions, end];
			} else {
				// Sharp and elbow: just start and end
				points = [start, end];
			}

			return {
				...el,
				points
			};
		});
	}

	return data;
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize a whiteboard document to JSON string
 *
 * @param document - The document to serialize
 * @param pretty - Whether to pretty-print the JSON (default: false)
 * @returns JSON string
 */
export function serialize(document: WhiteboardDocument, pretty: boolean = false): string {
	return JSON.stringify(document, null, pretty ? 2 : undefined);
}

/**
 * Serialize a document to a Blob for download
 *
 * @param document - The document to serialize
 * @returns Blob with correct MIME type
 */
export function serializeToBlob(document: WhiteboardDocument): Blob {
	const json = serialize(document, true);
	return new Blob([json], { type: UBW_MIME_TYPE });
}

// =============================================================================
// Deserialization
// =============================================================================

export interface DeserializationResult {
	success: boolean;
	document?: WhiteboardDocument;
	error?: string;
}

/**
 * Deserialize a JSON string to a whiteboard document
 *
 * @param json - JSON string to parse
 * @returns Deserialization result with document or error
 */
export function deserialize(json: string): DeserializationResult {
	// Try to parse JSON
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch (_e) {
		return {
			success: false,
			error: 'Invalid JSON: Unable to parse file'
		};
	}

	// Check version compatibility first
	if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
		const version = (parsed as { version: unknown }).version;
		if (typeof version === 'number' && !isVersionCompatible(version)) {
			return {
				success: false,
				error: `Incompatible file version: ${version}. Expected version 1.`
			};
		}
	}

	// Apply migrations before validation (in order)
	let migrated = migrateArrowTypes(parsed);
	migrated = migrateArrowPointsModel(migrated);

	// Validate with Zod schema
	const validation = validateDocument(migrated);

	if (!validation.success) {
		return {
			success: false,
			error: validation.error
		};
	}

	return {
		success: true,
		document: validation.data as WhiteboardDocument
	};
}

/**
 * Deserialize from a File object
 *
 * @param file - File to read and parse
 * @returns Promise resolving to deserialization result
 */
export async function deserializeFromFile(file: File): Promise<DeserializationResult> {
	// Check file extension
	if (!file.name.toLowerCase().endsWith(UBW_EXTENSION)) {
		return {
			success: false,
			error: `Invalid file type: Expected ${UBW_EXTENSION} file`
		};
	}

	// Check file size (max 50MB)
	const MAX_FILE_SIZE = 50 * 1024 * 1024;
	if (file.size > MAX_FILE_SIZE) {
		return {
			success: false,
			error: 'File too large: Maximum size is 50MB'
		};
	}

	try {
		const text = await file.text();
		return deserialize(text);
	} catch (_e) {
		return {
			success: false,
			error: 'Failed to read file'
		};
	}
}

// =============================================================================
// File Operations
// =============================================================================

/**
 * Generate a filename for the document
 *
 * @param document - The document
 * @param includeTimestamp - Whether to include timestamp (default: true)
 * @returns Filename with .ubw extension
 */
export function generateFilename(
	document: WhiteboardDocument,
	includeTimestamp: boolean = true
): string {
	// Sanitize title for filename
	const sanitizedTitle = document.title
		.replace(/[^a-zA-Z0-9\u00C0-\u017F\s-]/g, '') // Keep letters, numbers, accents, spaces, hyphens
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.substring(0, 50) // Limit length
		.toLowerCase();

	if (includeTimestamp) {
		const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
		return `${sanitizedTitle}-${timestamp}${UBW_EXTENSION}`;
	}

	return `${sanitizedTitle}${UBW_EXTENSION}`;
}

/**
 * Trigger a file download
 *
 * @param document - The document to download
 * @param filename - Optional custom filename
 */
export function downloadDocument(doc: WhiteboardDocument, filename?: string): void {
	if (typeof globalThis.document === 'undefined') {
		console.warn('[Whiteboard] Cannot download in non-browser environment');
		return;
	}

	const blob = serializeToBlob(doc);
	const url = URL.createObjectURL(blob);

	const link = globalThis.document.createElement('a');
	link.href = url;
	link.download = filename ?? generateFilename(doc);

	// Trigger download
	globalThis.document.body.appendChild(link);
	link.click();

	// Cleanup
	globalThis.document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
