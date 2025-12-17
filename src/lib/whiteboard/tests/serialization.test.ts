/**
 * Tests for Whiteboard Serialization
 */

import { describe, it, expect } from 'vitest';
import { createEmptyDocument, UBW_FILE_VERSION } from '../types/document';
import {
	serialize,
	deserialize,
	generateFilename,
	UBW_EXTENSION,
	UBW_MIME_TYPE,
	serializeToBlob
} from '../core/serialization';
import { validateDocument } from '../types/file-format';

describe('Serialization', () => {
	describe('serialize', () => {
		it('serializes a document to valid JSON string', () => {
			const doc = createEmptyDocument('Test');
			const json = serialize(doc);

			expect(() => JSON.parse(json)).not.toThrow();
		});

		it('preserves all document properties', () => {
			const doc = createEmptyDocument('Test Document');
			const json = serialize(doc);
			const parsed = JSON.parse(json);

			expect(parsed.id).toBe(doc.id);
			expect(parsed.title).toBe('Test Document');
			expect(parsed.version).toBe(UBW_FILE_VERSION);
			expect(parsed.pages).toHaveLength(1);
		});

		it('produces compact JSON by default', () => {
			const doc = createEmptyDocument();
			const json = serialize(doc);

			expect(json).not.toContain('\n');
		});

		it('produces pretty JSON when requested', () => {
			const doc = createEmptyDocument();
			const json = serialize(doc, true);

			expect(json).toContain('\n');
			expect(json).toContain('  '); // Indentation
		});
	});

	describe('deserialize', () => {
		it('deserializes a valid document', () => {
			const original = createEmptyDocument('Test');
			const json = serialize(original);
			const result = deserialize(json);

			expect(result.success).toBe(true);
			expect(result.document).toBeDefined();
			expect(result.document?.id).toBe(original.id);
			expect(result.document?.title).toBe('Test');
		});

		it('returns error for invalid JSON', () => {
			const result = deserialize('not valid json {{{');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid JSON');
		});

		it('returns error for incompatible version', () => {
			const doc = createEmptyDocument();
			const json = serialize(doc).replace('"version":1', '"version":999');
			const result = deserialize(json);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Incompatible file version');
		});

		it('returns error for missing required fields', () => {
			const result = deserialize('{"id": "test"}');

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('returns error for invalid UUID', () => {
			const doc = createEmptyDocument();
			const json = serialize(doc).replace(doc.id, 'not-a-uuid');
			const result = deserialize(json);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid');
		});

		it('validates element types', () => {
			const doc = createEmptyDocument();
			// Add an invalid element type
			const json = serialize(doc).replace('"elements":[]', '"elements":[{"type":"invalid"}]');
			const result = deserialize(json);

			expect(result.success).toBe(false);
		});
	});

	describe('round-trip serialization', () => {
		it('preserves document through serialize/deserialize cycle', () => {
			const original = createEmptyDocument('Round Trip Test');
			const json = serialize(original);
			const result = deserialize(json);

			expect(result.success).toBe(true);
			expect(result.document).toEqual(original);
		});
	});
});

describe('File Format Validation', () => {
	describe('validateDocument', () => {
		it('validates a correct document', () => {
			const doc = createEmptyDocument();
			const result = validateDocument(doc);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
		});

		it('rejects document with invalid color format', () => {
			const doc = createEmptyDocument();
			const modified = {
				...doc,
				pages: [
					{
						...doc.pages[0],
						background: {
							type: 'plain' as const,
							style: 'plain' as const,
							color: 'not-a-color' // Invalid
						}
					}
				]
			};
			const result = validateDocument(modified);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('rejects document with currentPageIndex out of bounds', () => {
			const doc = {
				...createEmptyDocument(),
				currentPageIndex: 99 // Out of bounds
			};
			const result = validateDocument(doc);

			expect(result.success).toBe(false);
		});

		it('rejects document with empty pages array', () => {
			const doc = {
				...createEmptyDocument(),
				pages: []
			};
			const result = validateDocument(doc);

			expect(result.success).toBe(false);
		});

		it('rejects stroke with too many points', () => {
			const doc = createEmptyDocument();
			const tooManyPoints = Array.from({ length: 60000 }, (_, i) => ({ x: i, y: i }));
			const modified = {
				...doc,
				pages: [
					{
						...doc.pages[0],
						elements: [
							{
								id: crypto.randomUUID(),
								type: 'stroke' as const,
								toolType: 'pen' as const,
								points: tooManyPoints,
								color: '#000000',
								width: 2,
								opacity: 1
							}
						]
					}
				]
			};
			const result = validateDocument(modified);

			expect(result.success).toBe(false);
		});
	});
});

describe('Filename Generation', () => {
	describe('generateFilename', () => {
		it('generates filename with .ubw extension', () => {
			const doc = createEmptyDocument('Test');
			const filename = generateFilename(doc);

			expect(filename.endsWith(UBW_EXTENSION)).toBe(true);
		});

		it('sanitizes special characters in title', () => {
			const doc = createEmptyDocument('Test/File:Name*With?Invalid<Chars>');
			const filename = generateFilename(doc);

			expect(filename).not.toContain('/');
			expect(filename).not.toContain(':');
			expect(filename).not.toContain('*');
			expect(filename).not.toContain('?');
		});

		it('replaces spaces with hyphens', () => {
			const doc = createEmptyDocument('My Document Title');
			const filename = generateFilename(doc);

			expect(filename).toContain('my-document-title');
		});

		it('includes timestamp by default', () => {
			const doc = createEmptyDocument('Test');
			const filename = generateFilename(doc);
			const today = new Date().toISOString().slice(0, 10);

			expect(filename).toContain(today);
		});

		it('can exclude timestamp', () => {
			const doc = createEmptyDocument('Test');
			const filename = generateFilename(doc, false);
			const today = new Date().toISOString().slice(0, 10);

			expect(filename).not.toContain(today);
			expect(filename).toBe('test.ubw');
		});

		it('preserves French accents', () => {
			const doc = createEmptyDocument('Géométrie élémentaire');
			const filename = generateFilename(doc, false);

			expect(filename).toContain('géométrie');
			expect(filename).toContain('élémentaire');
		});

		it('truncates very long titles', () => {
			const longTitle = 'A'.repeat(100);
			const doc = createEmptyDocument(longTitle);
			const filename = generateFilename(doc, false);

			// Title part should be max 50 chars
			expect(filename.length).toBeLessThanOrEqual(50 + UBW_EXTENSION.length);
		});
	});
});

describe('Blob Serialization', () => {
	describe('serializeToBlob', () => {
		it('creates a Blob with correct MIME type', () => {
			const doc = createEmptyDocument();
			const blob = serializeToBlob(doc);

			expect(blob).toBeInstanceOf(Blob);
			expect(blob.type).toBe(UBW_MIME_TYPE);
		});

		it('creates a Blob with document content', async () => {
			const doc = createEmptyDocument('Blob Test');
			const blob = serializeToBlob(doc);
			const text = await blob.text();
			const parsed = JSON.parse(text);

			expect(parsed.title).toBe('Blob Test');
		});
	});
});
