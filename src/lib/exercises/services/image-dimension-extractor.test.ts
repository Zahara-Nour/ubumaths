/**
 * Image Dimension Extractor - Unit Tests
 * ========================================
 *
 * Tests for dimension extraction from various image formats:
 * - PNG: IHDR chunk parsing
 * - JPEG: SOF marker parsing
 * - GIF: Logical screen descriptor parsing
 * - WebP: VP8/VP8L/VP8X chunk parsing
 * - SVG: viewBox and attribute parsing
 */

import { describe, it, expect } from 'vitest';
import {
	extractDimensionsFromBuffer,
	extractDimensionsFromFile
} from './image-dimension-extractor';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a minimal valid PNG buffer with specific dimensions
 */
function createPngBuffer(width: number, height: number): Uint8Array {
	const buffer = new Uint8Array(24);

	// PNG signature
	buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

	// IHDR chunk length (13 bytes)
	buffer.set([0x00, 0x00, 0x00, 0x0d], 8);

	// IHDR chunk type
	buffer.set([0x49, 0x48, 0x44, 0x52], 12);

	// Width (big-endian)
	buffer[16] = (width >> 24) & 0xff;
	buffer[17] = (width >> 16) & 0xff;
	buffer[18] = (width >> 8) & 0xff;
	buffer[19] = width & 0xff;

	// Height (big-endian)
	buffer[20] = (height >> 24) & 0xff;
	buffer[21] = (height >> 16) & 0xff;
	buffer[22] = (height >> 8) & 0xff;
	buffer[23] = height & 0xff;

	return buffer;
}

/**
 * Create a minimal valid GIF buffer with specific dimensions
 */
function createGifBuffer(width: number, height: number): Uint8Array {
	const buffer = new Uint8Array(10);

	// GIF89a signature
	buffer.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0);

	// Logical screen width (little-endian)
	buffer[6] = width & 0xff;
	buffer[7] = (width >> 8) & 0xff;

	// Logical screen height (little-endian)
	buffer[8] = height & 0xff;
	buffer[9] = (height >> 8) & 0xff;

	return buffer;
}

/**
 * Create a minimal valid SVG buffer with specific dimensions
 */
function createSvgBuffer(width: number, height: number): Uint8Array {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"></svg>`;
	return new TextEncoder().encode(svg);
}

/**
 * Create an SVG buffer with width/height attributes
 */
function createSvgBufferWithAttributes(width: number, height: number): Uint8Array {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`;
	return new TextEncoder().encode(svg);
}

// ============================================================================
// PNG TESTS
// ============================================================================

describe('PNG Dimension Extraction', () => {
	it('should extract dimensions from valid PNG', () => {
		const buffer = createPngBuffer(800, 600);
		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(true);
		expect(result.dimensions).toEqual({
			width: 800,
			height: 600,
			aspectRatio: expect.closeTo(1.333333, 5)
		});
	});

	it('should extract dimensions from small PNG', () => {
		const buffer = createPngBuffer(100, 100);
		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(100);
		expect(result.dimensions?.height).toBe(100);
		expect(result.dimensions?.aspectRatio).toBe(1);
	});

	it('should extract dimensions from wide PNG', () => {
		const buffer = createPngBuffer(1920, 1080);
		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(1920);
		expect(result.dimensions?.height).toBe(1080);
	});

	it('should fail for invalid PNG signature', () => {
		const buffer = new Uint8Array(24);
		buffer.set([0x00, 0x00, 0x00, 0x00], 0); // Invalid signature

		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(false);
		expect(result.error).toContain('Failed to extract');
	});

	it('should fail for truncated PNG', () => {
		const buffer = new Uint8Array(10); // Too short
		buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(false);
	});

	it('should reject PNG with dimensions exceeding maximum', () => {
		const buffer = createPngBuffer(15000, 600); // Width > 10000

		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// GIF TESTS
// ============================================================================

describe('GIF Dimension Extraction', () => {
	it('should extract dimensions from GIF89a', () => {
		const buffer = createGifBuffer(400, 300);
		const result = extractDimensionsFromBuffer(buffer, 'image/gif');

		expect(result.success).toBe(true);
		expect(result.dimensions).toEqual({
			width: 400,
			height: 300,
			aspectRatio: expect.closeTo(1.333333, 5)
		});
	});

	it('should extract dimensions from GIF87a', () => {
		const buffer = createGifBuffer(200, 150);
		// Change to GIF87a
		buffer[4] = 0x37; // '7'

		const result = extractDimensionsFromBuffer(buffer, 'image/gif');

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(200);
		expect(result.dimensions?.height).toBe(150);
	});

	it('should handle small GIF dimensions', () => {
		const buffer = createGifBuffer(16, 16);
		const result = extractDimensionsFromBuffer(buffer, 'image/gif');

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(16);
		expect(result.dimensions?.height).toBe(16);
	});

	it('should fail for invalid GIF signature', () => {
		const buffer = new Uint8Array(10);
		buffer.set([0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 0);

		const result = extractDimensionsFromBuffer(buffer, 'image/gif');

		expect(result.success).toBe(false);
	});

	it('should fail for truncated GIF', () => {
		const buffer = new Uint8Array(6); // Only signature, no dimensions
		buffer.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 0);

		const result = extractDimensionsFromBuffer(buffer, 'image/gif');

		expect(result.success).toBe(false);
	});
});

// ============================================================================
// SVG TESTS
// ============================================================================

describe('SVG Dimension Extraction', () => {
	it('should extract dimensions from viewBox', () => {
		const buffer = createSvgBuffer(500, 400);
		const result = extractDimensionsFromBuffer(buffer, 'image/svg+xml');

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(500);
		expect(result.dimensions?.height).toBe(400);
	});

	it('should extract dimensions from width/height attributes', () => {
		const buffer = createSvgBufferWithAttributes(300, 200);
		const result = extractDimensionsFromBuffer(buffer, 'image/svg+xml');

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(300);
		expect(result.dimensions?.height).toBe(200);
	});

	it('should handle viewBox with comma separators', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,600,500"></svg>';
		const buffer = new TextEncoder().encode(svg);
		const result = extractDimensionsFromBuffer(buffer, 'image/svg+xml');

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(600);
		expect(result.dimensions?.height).toBe(500);
	});

	it('should provide default dimensions for SVG without explicit size', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
		const buffer = new TextEncoder().encode(svg);
		const result = extractDimensionsFromBuffer(buffer, 'image/svg+xml');

		expect(result.success).toBe(true);
		// Default dimensions
		expect(result.dimensions?.width).toBe(300);
		expect(result.dimensions?.height).toBe(150);
	});

	it('should fail for invalid SVG (no svg tag)', () => {
		const buffer = new TextEncoder().encode('<html><body></body></html>');
		const result = extractDimensionsFromBuffer(buffer, 'image/svg+xml');

		expect(result.success).toBe(false);
	});

	it('should handle SVG with decimal viewBox values', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100.5 75.3"></svg>';
		const buffer = new TextEncoder().encode(svg);
		const result = extractDimensionsFromBuffer(buffer, 'image/svg+xml');

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(101); // Rounded
		expect(result.dimensions?.height).toBe(75); // Rounded
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
	it('should fail for empty buffer', () => {
		const buffer = new Uint8Array(0);
		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(false);
		expect(result.error).toBe('Empty image buffer');
	});

	it('should fail for unsupported MIME type', () => {
		const buffer = new Uint8Array(100);
		const result = extractDimensionsFromBuffer(buffer, 'image/bmp');

		expect(result.success).toBe(false);
		expect(result.error).toContain('Unsupported image type');
	});

	it('should calculate correct aspect ratio for square image', () => {
		const buffer = createPngBuffer(512, 512);
		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(true);
		expect(result.dimensions?.aspectRatio).toBe(1);
	});

	it('should calculate correct aspect ratio for portrait image', () => {
		const buffer = createPngBuffer(600, 800);
		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(true);
		expect(result.dimensions?.aspectRatio).toBe(0.75);
	});

	it('should calculate correct aspect ratio for landscape image', () => {
		const buffer = createPngBuffer(1600, 900);
		const result = extractDimensionsFromBuffer(buffer, 'image/png');

		expect(result.success).toBe(true);
		expect(result.dimensions?.aspectRatio).toBeCloseTo(1.777778, 5);
	});
});

// ============================================================================
// FILE EXTRACTION TESTS
// ============================================================================

describe('extractDimensionsFromFile', () => {
	it('should extract dimensions from File object', async () => {
		const buffer = createPngBuffer(640, 480);
		const blob = new Blob([buffer as unknown as ArrayBuffer], { type: 'image/png' });
		const file = new File([blob], 'test.png', { type: 'image/png' });

		const result = await extractDimensionsFromFile(file);

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(640);
		expect(result.dimensions?.height).toBe(480);
	});

	it('should extract dimensions from GIF File', async () => {
		const buffer = createGifBuffer(320, 240);
		const blob = new Blob([buffer as unknown as ArrayBuffer], { type: 'image/gif' });
		const file = new File([blob], 'animation.gif', { type: 'image/gif' });

		const result = await extractDimensionsFromFile(file);

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(320);
		expect(result.dimensions?.height).toBe(240);
	});

	it('should extract dimensions from SVG File', async () => {
		const buffer = createSvgBuffer(1000, 800);
		const blob = new Blob([buffer as unknown as ArrayBuffer], { type: 'image/svg+xml' });
		const file = new File([blob], 'graphic.svg', { type: 'image/svg+xml' });

		const result = await extractDimensionsFromFile(file);

		expect(result.success).toBe(true);
		expect(result.dimensions?.width).toBe(1000);
		expect(result.dimensions?.height).toBe(800);
	});
});

// ============================================================================
// ASPECT RATIO TESTS
// ============================================================================

describe('Aspect Ratio Calculations', () => {
	const testCases: Array<{ width: number; height: number; expectedRatio: number }> = [
		{ width: 1920, height: 1080, expectedRatio: 1.777778 }, // 16:9
		{ width: 1280, height: 720, expectedRatio: 1.777778 }, // 16:9
		{ width: 1024, height: 768, expectedRatio: 1.333333 }, // 4:3
		{ width: 800, height: 600, expectedRatio: 1.333333 }, // 4:3
		{ width: 1000, height: 1000, expectedRatio: 1 }, // 1:1
		{ width: 2000, height: 1000, expectedRatio: 2 }, // 2:1
		{ width: 1000, height: 2000, expectedRatio: 0.5 } // 1:2
	];

	testCases.forEach(({ width, height, expectedRatio }) => {
		it(`should calculate ${expectedRatio} for ${width}x${height}`, () => {
			const buffer = createPngBuffer(width, height);
			const result = extractDimensionsFromBuffer(buffer, 'image/png');

			expect(result.success).toBe(true);
			expect(result.dimensions?.aspectRatio).toBeCloseTo(expectedRatio, 5);
		});
	});
});
