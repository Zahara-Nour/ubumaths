/**
 * Tests for File Operations (Local .ubw save/load)
 *
 * Tests file validation, serialization, and download/upload functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WhiteboardDocument } from '../types/document';
import { createEmptyDocument, createEmptyPage } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** File extension for whiteboard documents */
const FILE_EXTENSION = '.ubw';

/** MIME type for whiteboard documents */
const MIME_TYPE = 'application/vnd.ubumaths.whiteboard+json';

/** Current file format version */
const CURRENT_VERSION = 1;

// =============================================================================
// Helper Types
// =============================================================================

interface FileValidationResult {
	valid: boolean;
	error?: string;
	document?: WhiteboardDocument;
}

interface _FileSaveOptions {
	filename?: string;
	includeMetadata?: boolean;
}

interface FileMetadata {
	version: number;
	createdAt: string;
	updatedAt: string;
	title: string;
	pageCount: number;
}

// =============================================================================
// Helper Functions (to be implemented in file-operations.ts)
// =============================================================================

/**
 * Validate a .ubw file content with Zod
 */
function validateUbwFile(content: string): FileValidationResult {
	try {
		const parsed = JSON.parse(content);

		// Check version
		if (typeof parsed.version !== 'number') {
			return { valid: false, error: 'Version manquante ou invalide' };
		}

		if (parsed.version > CURRENT_VERSION) {
			return {
				valid: false,
				error: `Version ${parsed.version} non supportée. Version max: ${CURRENT_VERSION}`
			};
		}

		// Check required fields
		if (!parsed.id || typeof parsed.id !== 'string') {
			return { valid: false, error: 'ID de document manquant' };
		}

		if (!parsed.title || typeof parsed.title !== 'string') {
			return { valid: false, error: 'Titre manquant' };
		}

		if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
			return { valid: false, error: 'Le document doit avoir au moins une page' };
		}

		// Validate pages
		for (let i = 0; i < parsed.pages.length; i++) {
			const page = parsed.pages[i];
			if (!page.id || typeof page.id !== 'string') {
				return { valid: false, error: `Page ${i + 1}: ID manquant` };
			}
			if (!Array.isArray(page.elements)) {
				return { valid: false, error: `Page ${i + 1}: elements invalides` };
			}
			if (typeof page.width !== 'number' || typeof page.height !== 'number') {
				return { valid: false, error: `Page ${i + 1}: dimensions invalides` };
			}
		}

		// Check currentPageIndex
		if (
			typeof parsed.currentPageIndex !== 'number' ||
			parsed.currentPageIndex < 0 ||
			parsed.currentPageIndex >= parsed.pages.length
		) {
			return { valid: false, error: 'Index de page courante invalide' };
		}

		return { valid: true, document: parsed as WhiteboardDocument };
	} catch {
		return { valid: false, error: 'Format JSON invalide' };
	}
}

/**
 * Generate filename with extension
 */
function generateFilename(title: string): string {
	// Sanitize title for filename
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
 * Serialize document for saving
 */
function serializeDocument(document: WhiteboardDocument): string {
	return JSON.stringify(document, null, 2);
}

/**
 * Extract metadata from document
 */
function extractMetadata(document: WhiteboardDocument): FileMetadata {
	return {
		version: document.version,
		createdAt: document.createdAt,
		updatedAt: document.updatedAt,
		title: document.title,
		pageCount: document.pages.length
	};
}

/**
 * Create a Blob for download
 */
function createDocumentBlob(document: WhiteboardDocument): Blob {
	const content = serializeDocument(document);
	return new Blob([content], { type: MIME_TYPE });
}

/**
 * Prepare document for save (update timestamps)
 */
function prepareForSave(document: WhiteboardDocument): WhiteboardDocument {
	return {
		...document,
		updatedAt: new Date().toISOString()
	};
}

/**
 * Validate filename
 */
function isValidFilename(filename: string): boolean {
	if (!filename.endsWith(FILE_EXTENSION)) return false;
	const basename = filename.slice(0, -FILE_EXTENSION.length);
	if (basename.length === 0) return false;
	if (/[<>:"/\\|?*]/.test(basename)) return false;
	return true;
}

// =============================================================================
// Tests: File Validation
// =============================================================================

describe('UBW File Validation', () => {
	let validDocument: WhiteboardDocument;

	beforeEach(() => {
		validDocument = createEmptyDocument('Test Document');
	});

	describe('Valid Files', () => {
		it('accepts valid document JSON', () => {
			const content = JSON.stringify(validDocument);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(true);
			expect(result.document).toBeDefined();
		});

		it('accepts document with multiple pages', () => {
			const doc = {
				...validDocument,
				pages: [createEmptyPage('A4'), createEmptyPage('A4'), createEmptyPage('A4')]
			};
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(true);
		});

		it('accepts document with elements', () => {
			const doc = {
				...validDocument,
				pages: [
					{
						...validDocument.pages[0],
						elements: [
							{
								id: 'stroke-1',
								type: 'stroke',
								toolType: 'pen',
								points: [{ x: 0, y: 0 }],
								color: '#000000',
								width: 2,
								opacity: 1
							}
						]
					}
				]
			};
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(true);
		});

		it('returns parsed document on success', () => {
			const content = JSON.stringify(validDocument);
			const result = validateUbwFile(content);
			expect(result.document?.id).toBe(validDocument.id);
			expect(result.document?.title).toBe(validDocument.title);
		});
	});

	describe('Invalid JSON', () => {
		it('rejects non-JSON content', () => {
			const result = validateUbwFile('not json');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('JSON');
		});

		it('rejects truncated JSON', () => {
			const result = validateUbwFile('{"id": "test"');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('JSON');
		});

		it('rejects empty string', () => {
			const result = validateUbwFile('');
			expect(result.valid).toBe(false);
		});
	});

	describe('Missing Fields', () => {
		it('rejects document without version', () => {
			const doc = { ...validDocument, version: undefined };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Version');
		});

		it('rejects document without id', () => {
			const doc = { ...validDocument, id: undefined };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('ID');
		});

		it('rejects document without title', () => {
			const doc = { ...validDocument, title: undefined };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Titre');
		});

		it('rejects document without pages', () => {
			const doc = { ...validDocument, pages: undefined };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('page');
		});

		it('rejects document with empty pages array', () => {
			const doc = { ...validDocument, pages: [] };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('page');
		});
	});

	describe('Version Validation', () => {
		it('accepts current version', () => {
			const doc = { ...validDocument, version: CURRENT_VERSION };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(true);
		});

		it('rejects future version', () => {
			const doc = { ...validDocument, version: CURRENT_VERSION + 1 };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('non supportée');
		});

		it('rejects non-numeric version', () => {
			const doc = { ...validDocument, version: 'v1' };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
		});
	});

	describe('Page Validation', () => {
		it('rejects page without id', () => {
			const doc = {
				...validDocument,
				pages: [{ ...validDocument.pages[0], id: undefined }]
			};
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Page 1');
		});

		it('rejects page without elements array', () => {
			const doc = {
				...validDocument,
				pages: [{ ...validDocument.pages[0], elements: 'not array' }]
			};
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('elements');
		});

		it('rejects page without dimensions', () => {
			const doc = {
				...validDocument,
				pages: [{ ...validDocument.pages[0], width: undefined }]
			};
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('dimensions');
		});
	});

	describe('Index Validation', () => {
		it('rejects negative currentPageIndex', () => {
			const doc = { ...validDocument, currentPageIndex: -1 };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Index');
		});

		it('rejects currentPageIndex beyond pages count', () => {
			const doc = { ...validDocument, currentPageIndex: 5 };
			const content = JSON.stringify(doc);
			const result = validateUbwFile(content);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Index');
		});
	});
});

// =============================================================================
// Tests: Filename Generation
// =============================================================================

describe('Filename Generation', () => {
	it('adds .ubw extension', () => {
		const filename = generateFilename('Mon Document');
		expect(filename.endsWith(FILE_EXTENSION)).toBe(true);
	});

	it('replaces spaces with underscores', () => {
		const filename = generateFilename('Mon Document Test');
		expect(filename).toBe('Mon_Document_Test.ubw');
	});

	it('removes invalid characters', () => {
		const filename = generateFilename('Test<>:"/\\|?*Document');
		expect(filename).toBe('TestDocument.ubw');
	});

	it('uses default name for empty title', () => {
		const filename = generateFilename('');
		expect(filename).toBe('Sans_titre.ubw');
	});

	it('uses default name for whitespace-only title', () => {
		const filename = generateFilename('   ');
		expect(filename).toBe('Sans_titre.ubw');
	});

	it('preserves accented characters', () => {
		const filename = generateFilename('Mathématiques 6ème');
		expect(filename).toBe('Mathématiques_6ème.ubw');
	});

	it('handles multiple consecutive spaces', () => {
		const filename = generateFilename('Mon   Document');
		expect(filename).toBe('Mon_Document.ubw');
	});
});

// =============================================================================
// Tests: Filename Validation
// =============================================================================

describe('Filename Validation', () => {
	it('accepts valid filename', () => {
		expect(isValidFilename('document.ubw')).toBe(true);
	});

	it('accepts filename with underscores', () => {
		expect(isValidFilename('mon_document.ubw')).toBe(true);
	});

	it('accepts filename with accents', () => {
		expect(isValidFilename('mathématiques.ubw')).toBe(true);
	});

	it('rejects filename without extension', () => {
		expect(isValidFilename('document')).toBe(false);
	});

	it('rejects wrong extension', () => {
		expect(isValidFilename('document.json')).toBe(false);
	});

	it('rejects empty basename', () => {
		expect(isValidFilename('.ubw')).toBe(false);
	});

	it('rejects invalid characters', () => {
		expect(isValidFilename('doc<test>.ubw')).toBe(false);
		expect(isValidFilename('doc:test.ubw')).toBe(false);
		expect(isValidFilename('doc/test.ubw')).toBe(false);
	});
});

// =============================================================================
// Tests: Document Serialization
// =============================================================================

describe('Document Serialization', () => {
	let document: WhiteboardDocument;

	beforeEach(() => {
		document = createEmptyDocument('Test');
	});

	it('serializes document to JSON string', () => {
		const result = serializeDocument(document);
		expect(typeof result).toBe('string');
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('preserves all document properties', () => {
		const serialized = serializeDocument(document);
		const parsed = JSON.parse(serialized);

		expect(parsed.id).toBe(document.id);
		expect(parsed.title).toBe(document.title);
		expect(parsed.version).toBe(document.version);
		expect(parsed.pages).toHaveLength(document.pages.length);
	});

	it('produces human-readable output', () => {
		const serialized = serializeDocument(document);
		expect(serialized).toContain('\n'); // Pretty printed
	});

	it('can be validated after serialization', () => {
		const serialized = serializeDocument(document);
		const validation = validateUbwFile(serialized);
		expect(validation.valid).toBe(true);
	});
});

// =============================================================================
// Tests: Metadata Extraction
// =============================================================================

describe('Metadata Extraction', () => {
	let document: WhiteboardDocument;

	beforeEach(() => {
		document = createEmptyDocument('Mon Document');
		document.pages = [createEmptyPage('A4'), createEmptyPage('A4'), createEmptyPage('A4')];
	});

	it('extracts version', () => {
		const metadata = extractMetadata(document);
		expect(metadata.version).toBe(document.version);
	});

	it('extracts title', () => {
		const metadata = extractMetadata(document);
		expect(metadata.title).toBe('Mon Document');
	});

	it('extracts page count', () => {
		const metadata = extractMetadata(document);
		expect(metadata.pageCount).toBe(3);
	});

	it('extracts timestamps', () => {
		const metadata = extractMetadata(document);
		expect(metadata.createdAt).toBe(document.createdAt);
		expect(metadata.updatedAt).toBe(document.updatedAt);
	});
});

// =============================================================================
// Tests: Blob Creation
// =============================================================================

describe('Document Blob Creation', () => {
	let document: WhiteboardDocument;

	beforeEach(() => {
		document = createEmptyDocument('Test');
	});

	it('creates Blob with correct MIME type', () => {
		const blob = createDocumentBlob(document);
		expect(blob.type).toBe(MIME_TYPE);
	});

	it('creates Blob with content', () => {
		const blob = createDocumentBlob(document);
		expect(blob.size).toBeGreaterThan(0);
	});

	it('Blob content matches serialized document', async () => {
		const blob = createDocumentBlob(document);
		const content = await blob.text();
		const serialized = serializeDocument(document);
		expect(content).toBe(serialized);
	});
});

// =============================================================================
// Tests: Save Preparation
// =============================================================================

describe('Prepare for Save', () => {
	let document: WhiteboardDocument;

	beforeEach(() => {
		document = createEmptyDocument('Test');
	});

	it('updates updatedAt timestamp', () => {
		// Set document to an old timestamp
		document.updatedAt = '2024-01-01T00:00:00.000Z';
		const original = document.updatedAt;

		const prepared = prepareForSave(document);

		expect(prepared.updatedAt).not.toBe(original);
		expect(new Date(prepared.updatedAt).getTime()).toBeGreaterThan(new Date(original).getTime());
	});

	it('preserves other properties', () => {
		const prepared = prepareForSave(document);

		expect(prepared.id).toBe(document.id);
		expect(prepared.title).toBe(document.title);
		expect(prepared.createdAt).toBe(document.createdAt);
		expect(prepared.pages).toEqual(document.pages);
	});

	it('does not mutate original document', () => {
		const originalUpdatedAt = document.updatedAt;
		prepareForSave(document);

		expect(document.updatedAt).toBe(originalUpdatedAt);
	});
});

// =============================================================================
// Tests: File Constants
// =============================================================================

describe('File Constants', () => {
	it('uses correct extension', () => {
		expect(FILE_EXTENSION).toBe('.ubw');
	});

	it('uses correct MIME type', () => {
		expect(MIME_TYPE).toBe('application/vnd.ubumaths.whiteboard+json');
	});

	it('current version is 1', () => {
		expect(CURRENT_VERSION).toBe(1);
	});
});

// =============================================================================
// Tests: Round-trip Save/Load
// =============================================================================

describe('Round-trip Save/Load', () => {
	it('document survives serialize -> validate cycle', () => {
		const original = createEmptyDocument('Test Document');
		original.pages[0].elements = [
			{
				id: 'stroke-1',
				type: 'stroke',
				toolType: 'pen',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 100 }
				],
				color: '#ff0000',
				width: 3,
				opacity: 1
			}
		];

		const serialized = serializeDocument(original);
		const validation = validateUbwFile(serialized);

		expect(validation.valid).toBe(true);
		expect(validation.document?.id).toBe(original.id);
		expect(validation.document?.pages[0].elements).toHaveLength(1);
	});

	it('complex document with all element types survives round-trip', () => {
		const original = createEmptyDocument('Complex Document');
		original.pages = [
			{
				...createEmptyPage('A4'),
				elements: [
					{
						id: 'stroke-1',
						type: 'stroke',
						toolType: 'pen',
						points: [{ x: 10, y: 10 }],
						color: '#000',
						width: 2,
						opacity: 1
					},
					{
						id: 'shape-1',
						type: 'shape',
						shapeType: 'rectangle',
						startPoint: { x: 50, y: 50 },
						endPoint: { x: 150, y: 100 },
						color: '#0000ff',
						width: 1,
						opacity: 1,
						fill: '#ffffff'
					},
					{
						id: 'text-1',
						type: 'textblock',
						position: { x: 200, y: 200 },
						width: 300,
						height: 100,
						markdownContent: '# Hello\n\nThis is **bold**',
						isEditing: false
					},
					{
						id: 'image-1',
						type: 'image',
						position: { x: 300, y: 300 },
						width: 200,
						height: 150,
						src: 'data:image/png;base64,abc123'
					}
				]
			}
		];

		const serialized = serializeDocument(original);
		const validation = validateUbwFile(serialized);

		expect(validation.valid).toBe(true);
		expect(validation.document?.pages[0].elements).toHaveLength(4);
	});

	it('multi-page document survives round-trip', () => {
		const original = createEmptyDocument('Multi-page');
		original.pages = [
			createEmptyPage('A4'),
			createEmptyPage('A4'),
			createEmptyPage('A3'),
			createEmptyPage('A4')
		];
		original.currentPageIndex = 2;

		const serialized = serializeDocument(original);
		const validation = validateUbwFile(serialized);

		expect(validation.valid).toBe(true);
		expect(validation.document?.pages).toHaveLength(4);
		expect(validation.document?.currentPageIndex).toBe(2);
	});
});

// =============================================================================
// Tests: File Size Considerations
// =============================================================================

describe('File Size', () => {
	it('empty document is small', () => {
		const document = createEmptyDocument('Empty');
		const serialized = serializeDocument(document);

		// Empty document should be less than 1KB
		expect(serialized.length).toBeLessThan(1024);
	});

	it('document with many strokes serializes correctly', () => {
		const document = createEmptyDocument('Many Strokes');

		// Add 100 strokes
		const strokes = [];
		for (let i = 0; i < 100; i++) {
			strokes.push({
				id: `stroke-${i}`,
				type: 'stroke',
				toolType: 'pen',
				points: Array.from({ length: 50 }, (_, j) => ({ x: j * 10, y: j * 10 })),
				color: '#000000',
				width: 2,
				opacity: 1
			});
		}
		document.pages[0].elements = strokes;

		const serialized = serializeDocument(document);
		const validation = validateUbwFile(serialized);

		expect(validation.valid).toBe(true);
	});
});
