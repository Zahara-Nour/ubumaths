/**
 * Tests for Image Import functionality
 *
 * Tests image validation, compression, and element management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { ImageElement, Point } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** Maximum image file size in bytes (5MB) */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Supported image MIME types */
const SUPPORTED_IMAGE_TYPES = [
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/svg+xml',
	'image/webp'
];

/** Default dimensions for new images */
const _DEFAULT_IMAGE_WIDTH = 400;
const _DEFAULT_IMAGE_HEIGHT = 300;

/** Minimum dimensions for images */
const MIN_IMAGE_WIDTH = 50;
const MIN_IMAGE_HEIGHT = 50;

// =============================================================================
// Helper Types
// =============================================================================

interface _ImageImportResult {
	success: boolean;
	element?: ImageElement;
	error?: string;
}

interface ImageValidationResult {
	valid: boolean;
	error?: string;
}

// =============================================================================
// Helper Functions (to be implemented in image-loader.ts)
// =============================================================================

/**
 * Validate an image file before import
 */
function validateImageFile(file: {
	type: string;
	size: number;
	name: string;
}): ImageValidationResult {
	// Check file type
	if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
		return {
			valid: false,
			error: `Type de fichier non supporté: ${file.type}. Types acceptés: PNG, JPG, SVG, WebP`
		};
	}

	// Check file size
	if (file.size > MAX_IMAGE_SIZE) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return {
			valid: false,
			error: `Fichier trop volumineux (${sizeMB}MB). Maximum: 5MB`
		};
	}

	return { valid: true };
}

/**
 * Create an image element from validated data
 */
function createImageElement(
	position: Point,
	width: number,
	height: number,
	src: string,
	originalFilename?: string
): ImageElement {
	return {
		id: crypto.randomUUID(),
		type: 'image',
		position,
		width: Math.max(width, MIN_IMAGE_WIDTH),
		height: Math.max(height, MIN_IMAGE_HEIGHT),
		src,
		originalFilename
	};
}

/**
 * Move an image element to a new position
 */
function moveImageElement(element: ImageElement, newPosition: Point): ImageElement {
	return {
		...element,
		position: newPosition
	};
}

/**
 * Resize an image element
 */
function resizeImageElement(
	element: ImageElement,
	newWidth: number,
	newHeight: number
): ImageElement {
	return {
		...element,
		width: Math.max(newWidth, MIN_IMAGE_WIDTH),
		height: Math.max(newHeight, MIN_IMAGE_HEIGHT)
	};
}

/**
 * Check if a point is inside an image element
 */
function isPointInImage(point: Point, image: ImageElement): boolean {
	return (
		point.x >= image.position.x &&
		point.x <= image.position.x + image.width &&
		point.y >= image.position.y &&
		point.y <= image.position.y + image.height
	);
}

/**
 * Calculate dimensions maintaining aspect ratio to fit within max bounds
 */
function calculateFitDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number,
	maxHeight: number
): { width: number; height: number } {
	const aspectRatio = originalWidth / originalHeight;

	let width = originalWidth;
	let height = originalHeight;

	// Scale down if needed
	if (width > maxWidth) {
		width = maxWidth;
		height = width / aspectRatio;
	}

	if (height > maxHeight) {
		height = maxHeight;
		width = height * aspectRatio;
	}

	return {
		width: Math.round(width),
		height: Math.round(height)
	};
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
	const parts = filename.split('.');
	return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// =============================================================================
// Tests
// =============================================================================

describe('Image File Validation', () => {
	it('accepts PNG files', () => {
		const result = validateImageFile({
			type: 'image/png',
			size: 1024 * 1024,
			name: 'test.png'
		});
		expect(result.valid).toBe(true);
	});

	it('accepts JPEG files', () => {
		const result = validateImageFile({
			type: 'image/jpeg',
			size: 1024 * 1024,
			name: 'test.jpg'
		});
		expect(result.valid).toBe(true);
	});

	it('accepts SVG files', () => {
		const result = validateImageFile({
			type: 'image/svg+xml',
			size: 50 * 1024,
			name: 'test.svg'
		});
		expect(result.valid).toBe(true);
	});

	it('accepts WebP files', () => {
		const result = validateImageFile({
			type: 'image/webp',
			size: 1024 * 1024,
			name: 'test.webp'
		});
		expect(result.valid).toBe(true);
	});

	it('rejects unsupported file types', () => {
		const result = validateImageFile({
			type: 'image/gif',
			size: 1024 * 1024,
			name: 'test.gif'
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Type de fichier non supporté');
	});

	it('rejects non-image files', () => {
		const result = validateImageFile({
			type: 'application/pdf',
			size: 1024 * 1024,
			name: 'test.pdf'
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Type de fichier non supporté');
	});

	it('rejects files larger than 5MB', () => {
		const result = validateImageFile({
			type: 'image/png',
			size: 6 * 1024 * 1024,
			name: 'large.png'
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Fichier trop volumineux');
		expect(result.error).toContain('5MB');
	});

	it('accepts files exactly at 5MB limit', () => {
		const result = validateImageFile({
			type: 'image/png',
			size: 5 * 1024 * 1024,
			name: 'exact.png'
		});
		expect(result.valid).toBe(true);
	});

	it('accepts small files', () => {
		const result = validateImageFile({
			type: 'image/png',
			size: 1024,
			name: 'tiny.png'
		});
		expect(result.valid).toBe(true);
	});
});

describe('ImageElement Type', () => {
	it('has correct type discriminator', () => {
		const element = createImageElement(
			{ x: 100, y: 100 },
			400,
			300,
			'data:image/png;base64,abc123'
		);
		expect(element.type).toBe('image');
	});

	it('has a valid UUID id', () => {
		const element = createImageElement(
			{ x: 100, y: 100 },
			400,
			300,
			'data:image/png;base64,abc123'
		);
		expect(element.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
	});

	it('stores position, dimensions, and src', () => {
		const element = createImageElement(
			{ x: 50, y: 75 },
			400,
			300,
			'data:image/png;base64,abc123',
			'photo.png'
		);
		expect(element.position).toEqual({ x: 50, y: 75 });
		expect(element.width).toBe(400);
		expect(element.height).toBe(300);
		expect(element.src).toBe('data:image/png;base64,abc123');
		expect(element.originalFilename).toBe('photo.png');
	});
});

describe('ImageElement Creation', () => {
	it('creates an image with specified dimensions', () => {
		const element = createImageElement({ x: 100, y: 200 }, 500, 400, 'data:image/jpeg;base64,xyz');
		expect(element.width).toBe(500);
		expect(element.height).toBe(400);
	});

	it('enforces minimum width', () => {
		const element = createImageElement({ x: 100, y: 200 }, 30, 200, 'data:image/png;base64,abc');
		expect(element.width).toBe(MIN_IMAGE_WIDTH);
	});

	it('enforces minimum height', () => {
		const element = createImageElement({ x: 100, y: 200 }, 200, 20, 'data:image/png;base64,abc');
		expect(element.height).toBe(MIN_IMAGE_HEIGHT);
	});

	it('stores original filename when provided', () => {
		const element = createImageElement(
			{ x: 0, y: 0 },
			100,
			100,
			'data:image/png;base64,abc',
			'my-photo.png'
		);
		expect(element.originalFilename).toBe('my-photo.png');
	});

	it('allows undefined original filename', () => {
		const element = createImageElement({ x: 0, y: 0 }, 100, 100, 'data:image/png;base64,abc');
		expect(element.originalFilename).toBeUndefined();
	});
});

describe('ImageElement Position', () => {
	it('can be positioned at any point', () => {
		const element = createImageElement({ x: 500, y: 600 }, 200, 150, 'data:image/png;base64,abc');
		expect(element.position.x).toBe(500);
		expect(element.position.y).toBe(600);
	});

	it('allows negative positions', () => {
		const element = createImageElement({ x: -50, y: -30 }, 200, 150, 'data:image/png;base64,abc');
		expect(element.position.x).toBe(-50);
		expect(element.position.y).toBe(-30);
	});

	it('can be moved to a new position', () => {
		const element = createImageElement({ x: 100, y: 100 }, 200, 150, 'data:image/png;base64,abc');
		const moved = moveImageElement(element, { x: 300, y: 400 });
		expect(moved.position).toEqual({ x: 300, y: 400 });
	});

	it('preserves other properties when moved', () => {
		const element = createImageElement(
			{ x: 100, y: 100 },
			200,
			150,
			'data:image/png;base64,abc',
			'test.png'
		);
		const moved = moveImageElement(element, { x: 300, y: 400 });
		expect(moved.id).toBe(element.id);
		expect(moved.width).toBe(200);
		expect(moved.height).toBe(150);
		expect(moved.src).toBe('data:image/png;base64,abc');
		expect(moved.originalFilename).toBe('test.png');
	});
});

describe('ImageElement Resize', () => {
	let element: ImageElement;

	beforeEach(() => {
		element = createImageElement({ x: 100, y: 100 }, 300, 200, 'data:image/png;base64,abc');
	});

	it('can be resized to larger dimensions', () => {
		const resized = resizeImageElement(element, 500, 400);
		expect(resized.width).toBe(500);
		expect(resized.height).toBe(400);
	});

	it('can be resized to smaller dimensions', () => {
		const resized = resizeImageElement(element, 150, 100);
		expect(resized.width).toBe(150);
		expect(resized.height).toBe(100);
	});

	it('enforces minimum width on resize', () => {
		const resized = resizeImageElement(element, 30, 200);
		expect(resized.width).toBe(MIN_IMAGE_WIDTH);
	});

	it('enforces minimum height on resize', () => {
		const resized = resizeImageElement(element, 200, 20);
		expect(resized.height).toBe(MIN_IMAGE_HEIGHT);
	});

	it('preserves position when resized', () => {
		const resized = resizeImageElement(element, 500, 400);
		expect(resized.position).toEqual({ x: 100, y: 100 });
	});

	it('preserves src when resized', () => {
		const resized = resizeImageElement(element, 500, 400);
		expect(resized.src).toBe('data:image/png;base64,abc');
	});
});

describe('ImageElement Hit Testing', () => {
	let element: ImageElement;

	beforeEach(() => {
		// Element at (100, 100) with size 300x200
		element = createImageElement({ x: 100, y: 100 }, 300, 200, 'data:image/png;base64,abc');
	});

	it('detects point inside element', () => {
		expect(isPointInImage({ x: 200, y: 200 }, element)).toBe(true);
	});

	it('detects point on top-left corner', () => {
		expect(isPointInImage({ x: 100, y: 100 }, element)).toBe(true);
	});

	it('detects point on bottom-right corner', () => {
		expect(isPointInImage({ x: 400, y: 300 }, element)).toBe(true);
	});

	it('rejects point above element', () => {
		expect(isPointInImage({ x: 200, y: 50 }, element)).toBe(false);
	});

	it('rejects point below element', () => {
		expect(isPointInImage({ x: 200, y: 350 }, element)).toBe(false);
	});

	it('rejects point left of element', () => {
		expect(isPointInImage({ x: 50, y: 200 }, element)).toBe(false);
	});

	it('rejects point right of element', () => {
		expect(isPointInImage({ x: 450, y: 200 }, element)).toBe(false);
	});
});

describe('Aspect Ratio Calculations', () => {
	it('returns original dimensions when they fit', () => {
		const result = calculateFitDimensions(200, 150, 400, 300);
		expect(result).toEqual({ width: 200, height: 150 });
	});

	it('scales down landscape image to fit width', () => {
		const result = calculateFitDimensions(800, 400, 400, 400);
		expect(result.width).toBe(400);
		expect(result.height).toBe(200);
	});

	it('scales down portrait image to fit height', () => {
		const result = calculateFitDimensions(400, 800, 400, 400);
		expect(result.width).toBe(200);
		expect(result.height).toBe(400);
	});

	it('maintains aspect ratio for square image', () => {
		const result = calculateFitDimensions(500, 500, 200, 200);
		expect(result.width).toBe(200);
		expect(result.height).toBe(200);
	});

	it('handles very wide images', () => {
		const result = calculateFitDimensions(2000, 100, 400, 300);
		expect(result.width).toBe(400);
		expect(result.height).toBe(20);
	});

	it('handles very tall images', () => {
		const result = calculateFitDimensions(100, 2000, 400, 300);
		expect(result.width).toBe(15);
		expect(result.height).toBe(300);
	});

	it('rounds dimensions to integers', () => {
		const result = calculateFitDimensions(333, 222, 200, 200);
		expect(Number.isInteger(result.width)).toBe(true);
		expect(Number.isInteger(result.height)).toBe(true);
	});
});

describe('File Extension Parsing', () => {
	it('extracts png extension', () => {
		expect(getFileExtension('image.png')).toBe('png');
	});

	it('extracts jpg extension', () => {
		expect(getFileExtension('photo.jpg')).toBe('jpg');
	});

	it('extracts jpeg extension', () => {
		expect(getFileExtension('photo.jpeg')).toBe('jpeg');
	});

	it('handles multiple dots in filename', () => {
		expect(getFileExtension('my.photo.backup.png')).toBe('png');
	});

	it('returns empty string for files without extension', () => {
		expect(getFileExtension('noextension')).toBe('');
	});

	it('converts extension to lowercase', () => {
		expect(getFileExtension('IMAGE.PNG')).toBe('png');
	});

	it('handles empty string', () => {
		expect(getFileExtension('')).toBe('');
	});
});

describe('ImageElement Serialization', () => {
	it('can serialize to JSON', () => {
		const element = createImageElement(
			{ x: 100, y: 200 },
			300,
			200,
			'data:image/png;base64,abc123',
			'test.png'
		);
		const json = JSON.stringify(element);
		const parsed = JSON.parse(json);

		expect(parsed.type).toBe('image');
		expect(parsed.position).toEqual({ x: 100, y: 200 });
		expect(parsed.width).toBe(300);
		expect(parsed.height).toBe(200);
		expect(parsed.src).toBe('data:image/png;base64,abc123');
		expect(parsed.originalFilename).toBe('test.png');
	});

	it('preserves data URL in serialization', () => {
		const dataUrl =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
		const element = createImageElement({ x: 0, y: 0 }, 100, 100, dataUrl);
		const json = JSON.stringify(element);
		const parsed = JSON.parse(json);

		expect(parsed.src).toBe(dataUrl);
	});
});

describe('Image Import Integration', () => {
	// These tests verify the integration patterns

	it('validates then creates element on successful import', () => {
		const file = {
			type: 'image/png',
			size: 1024 * 1024,
			name: 'test.png'
		};

		const validation = validateImageFile(file);
		expect(validation.valid).toBe(true);

		if (validation.valid) {
			const element = createImageElement(
				{ x: 100, y: 100 },
				400,
				300,
				'data:image/png;base64,abc',
				file.name
			);
			expect(element.type).toBe('image');
			expect(element.originalFilename).toBe('test.png');
		}
	});

	it('rejects and provides error message on failed validation', () => {
		const file = {
			type: 'image/gif',
			size: 10 * 1024 * 1024,
			name: 'animation.gif'
		};

		const validation = validateImageFile(file);
		expect(validation.valid).toBe(false);
		expect(validation.error).toBeDefined();
	});
});

describe('Multiple Images', () => {
	it('can create multiple independent images', () => {
		const img1 = createImageElement(
			{ x: 100, y: 100 },
			200,
			150,
			'data:image/png;base64,abc',
			'img1.png'
		);
		const img2 = createImageElement(
			{ x: 400, y: 100 },
			200,
			150,
			'data:image/png;base64,xyz',
			'img2.png'
		);

		expect(img1.id).not.toBe(img2.id);
		expect(img1.src).not.toBe(img2.src);
	});

	it('images can overlap', () => {
		const img1 = createImageElement({ x: 100, y: 100 }, 300, 200, 'data:image/png;base64,abc');
		const img2 = createImageElement({ x: 200, y: 150 }, 300, 200, 'data:image/png;base64,xyz');

		// Point in overlap region
		const overlapPoint: Point = { x: 250, y: 200 };
		expect(isPointInImage(overlapPoint, img1)).toBe(true);
		expect(isPointInImage(overlapPoint, img2)).toBe(true);
	});
});
