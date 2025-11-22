/**
 * Image Upload Validation - Unit Tests
 * =====================================
 *
 * Tests for image upload validation schemas and helpers:
 * - File metadata validation
 * - Response schema validation
 * - MIME type checking
 * - File signature validation
 */

import { describe, it, expect } from 'vitest';
import {
	imageFileMetadataSchema,
	imageMetadataSchema,
	imageUploadResponseSchema,
	validateImageFileMetadata,
	validateImageUploadResponse,
	isAllowedMimeType,
	getMimeTypeFromExtension,
	validateFileSignature,
	MAX_IMAGE_SIZE_BYTES,
	MAX_IMAGE_DIMENSION,
	ALLOWED_IMAGE_MIME_TYPES,
	EXTENSION_TO_MIME
} from './image-upload';

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Constants', () => {
	it('should have correct max file size (5MB)', () => {
		expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
	});

	it('should have correct max dimension (10000px)', () => {
		expect(MAX_IMAGE_DIMENSION).toBe(10000);
	});

	it('should include all expected MIME types', () => {
		expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/jpeg');
		expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/png');
		expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/gif');
		expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/webp');
		expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/svg+xml');
		expect(ALLOWED_IMAGE_MIME_TYPES).toHaveLength(5);
	});

	it('should have correct extension mappings', () => {
		expect(EXTENSION_TO_MIME['.jpg']).toBe('image/jpeg');
		expect(EXTENSION_TO_MIME['.jpeg']).toBe('image/jpeg');
		expect(EXTENSION_TO_MIME['.png']).toBe('image/png');
		expect(EXTENSION_TO_MIME['.gif']).toBe('image/gif');
		expect(EXTENSION_TO_MIME['.webp']).toBe('image/webp');
		expect(EXTENSION_TO_MIME['.svg']).toBe('image/svg+xml');
	});
});

// ============================================================================
// IMAGE FILE METADATA SCHEMA TESTS
// ============================================================================

describe('imageFileMetadataSchema', () => {
	it('should accept valid JPEG file metadata', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'photo.jpg',
			size: 1024 * 1024, // 1MB
			type: 'image/jpeg'
		});

		expect(result.success).toBe(true);
	});

	it('should accept valid PNG file metadata', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'graph.png',
			size: 500000,
			type: 'image/png'
		});

		expect(result.success).toBe(true);
	});

	it('should accept valid WebP file metadata', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'image.webp',
			size: 200000,
			type: 'image/webp'
		});

		expect(result.success).toBe(true);
	});

	it('should accept valid SVG file metadata', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'icon.svg',
			size: 5000,
			type: 'image/svg+xml'
		});

		expect(result.success).toBe(true);
	});

	it('should reject empty filename', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: '',
			size: 1000,
			type: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject filename without valid extension', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'document.pdf',
			size: 1000,
			type: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject file size exceeding maximum', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'large.png',
			size: MAX_IMAGE_SIZE_BYTES + 1,
			type: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject zero file size', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'empty.png',
			size: 0,
			type: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject negative file size', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'invalid.png',
			size: -100,
			type: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject invalid MIME type', () => {
		const result = imageFileMetadataSchema.safeParse({
			filename: 'document.pdf',
			size: 1000,
			type: 'application/pdf'
		});

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// IMAGE METADATA SCHEMA TESTS
// ============================================================================

describe('imageMetadataSchema', () => {
	it('should accept valid image metadata', () => {
		const result = imageMetadataSchema.safeParse({
			url: 'https://example.supabase.co/storage/image.png',
			width: 800,
			height: 600,
			aspectRatio: 1.333333,
			filename: 'image.png',
			size: 123456,
			mimeType: 'image/png'
		});

		expect(result.success).toBe(true);
	});

	it('should reject invalid URL', () => {
		const result = imageMetadataSchema.safeParse({
			url: 'not-a-url',
			width: 800,
			height: 600,
			aspectRatio: 1.333333,
			filename: 'image.png',
			size: 123456,
			mimeType: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject width exceeding maximum', () => {
		const result = imageMetadataSchema.safeParse({
			url: 'https://example.com/image.png',
			width: MAX_IMAGE_DIMENSION + 1,
			height: 600,
			aspectRatio: 1.5,
			filename: 'image.png',
			size: 123456,
			mimeType: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject height exceeding maximum', () => {
		const result = imageMetadataSchema.safeParse({
			url: 'https://example.com/image.png',
			width: 800,
			height: MAX_IMAGE_DIMENSION + 1,
			aspectRatio: 1.5,
			filename: 'image.png',
			size: 123456,
			mimeType: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject zero width', () => {
		const result = imageMetadataSchema.safeParse({
			url: 'https://example.com/image.png',
			width: 0,
			height: 600,
			aspectRatio: 0,
			filename: 'image.png',
			size: 123456,
			mimeType: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject negative aspect ratio', () => {
		const result = imageMetadataSchema.safeParse({
			url: 'https://example.com/image.png',
			width: 800,
			height: 600,
			aspectRatio: -1,
			filename: 'image.png',
			size: 123456,
			mimeType: 'image/png'
		});

		expect(result.success).toBe(false);
	});

	it('should reject infinite aspect ratio', () => {
		const result = imageMetadataSchema.safeParse({
			url: 'https://example.com/image.png',
			width: 800,
			height: 600,
			aspectRatio: Infinity,
			filename: 'image.png',
			size: 123456,
			mimeType: 'image/png'
		});

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// IMAGE UPLOAD RESPONSE SCHEMA TESTS
// ============================================================================

describe('imageUploadResponseSchema', () => {
	it('should accept valid success response', () => {
		const result = imageUploadResponseSchema.safeParse({
			success: true,
			data: {
				url: 'https://example.com/image.png',
				width: 800,
				height: 600,
				aspectRatio: 1.333333,
				filename: 'image.png',
				size: 123456,
				mimeType: 'image/png'
			}
		});

		expect(result.success).toBe(true);
	});

	it('should accept valid error response', () => {
		const result = imageUploadResponseSchema.safeParse({
			success: false,
			error: 'File type not allowed'
		});

		expect(result.success).toBe(true);
	});

	it('should reject success response without data', () => {
		const result = imageUploadResponseSchema.safeParse({
			success: true
		});

		expect(result.success).toBe(false);
	});

	it('should reject error response without error message', () => {
		const result = imageUploadResponseSchema.safeParse({
			success: false
		});

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('validateImageFileMetadata', () => {
	it('should return success for valid data', () => {
		const result = validateImageFileMetadata({
			filename: 'test.jpg',
			size: 1000,
			type: 'image/jpeg'
		});

		expect(result.success).toBe(true);
	});

	it('should return error for invalid data', () => {
		const result = validateImageFileMetadata({
			filename: '',
			size: -1,
			type: 'invalid'
		});

		expect(result.success).toBe(false);
	});
});

describe('validateImageUploadResponse', () => {
	it('should validate success response', () => {
		const result = validateImageUploadResponse({
			success: true,
			data: {
				url: 'https://example.com/image.png',
				width: 100,
				height: 100,
				aspectRatio: 1,
				filename: 'test.png',
				size: 1000,
				mimeType: 'image/png'
			}
		});

		expect(result.success).toBe(true);
	});

	it('should validate error response', () => {
		const result = validateImageUploadResponse({
			success: false,
			error: 'Upload failed'
		});

		expect(result.success).toBe(true);
	});
});

describe('isAllowedMimeType', () => {
	it('should return true for allowed MIME types', () => {
		expect(isAllowedMimeType('image/jpeg')).toBe(true);
		expect(isAllowedMimeType('image/png')).toBe(true);
		expect(isAllowedMimeType('image/gif')).toBe(true);
		expect(isAllowedMimeType('image/webp')).toBe(true);
		expect(isAllowedMimeType('image/svg+xml')).toBe(true);
	});

	it('should return false for disallowed MIME types', () => {
		expect(isAllowedMimeType('application/pdf')).toBe(false);
		expect(isAllowedMimeType('image/bmp')).toBe(false);
		expect(isAllowedMimeType('video/mp4')).toBe(false);
		expect(isAllowedMimeType('text/plain')).toBe(false);
	});
});

describe('getMimeTypeFromExtension', () => {
	it('should return correct MIME type for known extensions', () => {
		expect(getMimeTypeFromExtension('image.jpg')).toBe('image/jpeg');
		expect(getMimeTypeFromExtension('image.jpeg')).toBe('image/jpeg');
		expect(getMimeTypeFromExtension('image.png')).toBe('image/png');
		expect(getMimeTypeFromExtension('image.gif')).toBe('image/gif');
		expect(getMimeTypeFromExtension('image.webp')).toBe('image/webp');
		expect(getMimeTypeFromExtension('image.svg')).toBe('image/svg+xml');
	});

	it('should handle uppercase extensions', () => {
		expect(getMimeTypeFromExtension('IMAGE.JPG')).toBe('image/jpeg');
		expect(getMimeTypeFromExtension('IMAGE.PNG')).toBe('image/png');
	});

	it('should return null for unknown extensions', () => {
		expect(getMimeTypeFromExtension('document.pdf')).toBeNull();
		expect(getMimeTypeFromExtension('image.bmp')).toBeNull();
		expect(getMimeTypeFromExtension('video.mp4')).toBeNull();
	});

	it('should handle filenames with multiple dots', () => {
		expect(getMimeTypeFromExtension('my.image.file.png')).toBe('image/png');
	});
});

// ============================================================================
// FILE SIGNATURE VALIDATION TESTS
// ============================================================================

describe('validateFileSignature', () => {
	it('should validate PNG signature', () => {
		const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		expect(validateFileSignature(buffer, 'image/png')).toBe(true);
	});

	it('should validate JPEG signature', () => {
		const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
		expect(validateFileSignature(buffer, 'image/jpeg')).toBe(true);
	});

	it('should validate GIF87a signature', () => {
		const buffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
		expect(validateFileSignature(buffer, 'image/gif')).toBe(true);
	});

	it('should validate GIF89a signature', () => {
		const buffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
		expect(validateFileSignature(buffer, 'image/gif')).toBe(true);
	});

	it('should validate WebP signature (RIFF + WEBP)', () => {
		// RIFF....WEBP (positions 0-3 and 8-11)
		const buffer = new Uint8Array(12);
		buffer.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
		buffer.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP

		expect(validateFileSignature(buffer, 'image/webp')).toBe(true);
	});

	it('should validate SVG with svg tag', () => {
		const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
		const buffer = new TextEncoder().encode(svgContent);

		expect(validateFileSignature(buffer, 'image/svg+xml')).toBe(true);
	});

	it('should validate SVG with XML declaration', () => {
		const svgContent = '<?xml version="1.0"?><svg></svg>';
		const buffer = new TextEncoder().encode(svgContent);

		expect(validateFileSignature(buffer, 'image/svg+xml')).toBe(true);
	});

	it('should reject mismatched signature', () => {
		// PNG signature but claiming to be JPEG
		const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		expect(validateFileSignature(buffer, 'image/jpeg')).toBe(false);
	});

	it('should reject invalid PNG signature', () => {
		const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
		expect(validateFileSignature(buffer, 'image/png')).toBe(false);
	});

	it('should reject truncated buffer', () => {
		const buffer = new Uint8Array([0x89, 0x50]); // Too short for PNG
		expect(validateFileSignature(buffer, 'image/png')).toBe(false);
	});

	it('should reject unknown MIME type', () => {
		const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
		expect(validateFileSignature(buffer, 'image/unknown')).toBe(false);
	});
});
