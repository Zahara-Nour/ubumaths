/**
 * Tests for PDF Import functionality
 *
 * Tests PDF validation, page extraction, and background management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Page, PageBackground, BackgroundPdf } from '../types/document';
import { createEmptyPage } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** Maximum PDF file size in bytes (20MB) */
const MAX_PDF_SIZE = 20 * 1024 * 1024;

/** PDF MIME type */
const PDF_MIME_TYPE = 'application/pdf';

// =============================================================================
// Helper Types
// =============================================================================

interface PdfValidationResult {
	valid: boolean;
	error?: string;
}

interface _PdfPageInfo {
	pageIndex: number;
	width: number;
	height: number;
}

interface PdfImportOptions {
	/** Pages to import (empty = all pages) */
	pages?: number[];
	/** Fit mode for the background */
	fitMode: 'fit' | 'fill' | 'stretch';
}

// =============================================================================
// Helper Functions (to be implemented in pdf-loader.ts)
// =============================================================================

/**
 * Validate a PDF file before import
 */
function validatePdfFile(file: { type: string; size: number; name: string }): PdfValidationResult {
	// Check file type
	if (file.type !== PDF_MIME_TYPE) {
		return {
			valid: false,
			error: `Type de fichier non supporté: ${file.type}. Seuls les fichiers PDF sont acceptés.`
		};
	}

	// Check file size
	if (file.size > MAX_PDF_SIZE) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return {
			valid: false,
			error: `Fichier trop volumineux (${sizeMB}MB). Maximum: 20MB`
		};
	}

	return { valid: true };
}

/**
 * Create a PDF background for a page
 */
function createPdfBackground(
	pdfData: string,
	pageIndex: number,
	totalPages: number,
	width: number,
	height: number
): BackgroundPdf {
	return {
		type: 'pdf',
		pdfData,
		pageIndex,
		totalPages,
		width,
		height
	};
}

/**
 * Set background on a page
 */
function setPageBackground(page: Page, background: PageBackground): Page {
	return {
		...page,
		background
	};
}

/**
 * Create a page with PDF background
 */
function createPageWithPdfBackground(
	pdfData: string,
	pageIndex: number,
	totalPages: number,
	pdfWidth: number,
	pdfHeight: number
): Page {
	const page = createEmptyPage('A4');
	const background = createPdfBackground(pdfData, pageIndex, totalPages, pdfWidth, pdfHeight);
	return setPageBackground(page, background);
}

/**
 * Calculate dimensions based on fit mode
 */
function calculateFitModeDimensions(
	sourceWidth: number,
	sourceHeight: number,
	targetWidth: number,
	targetHeight: number,
	fitMode: 'fit' | 'fill' | 'stretch'
): { width: number; height: number; x: number; y: number } {
	switch (fitMode) {
		case 'stretch':
			// Stretch to fill exactly
			return { width: targetWidth, height: targetHeight, x: 0, y: 0 };

		case 'fill': {
			// Fill container, may crop
			const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
			const width = Math.round(sourceWidth * scale);
			const height = Math.round(sourceHeight * scale);
			const x = Math.round((targetWidth - width) / 2);
			const y = Math.round((targetHeight - height) / 2);
			return { width, height, x, y };
		}

		case 'fit':
		default: {
			// Fit inside container, may have margins
			const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
			const width = Math.round(sourceWidth * scale);
			const height = Math.round(sourceHeight * scale);
			const x = Math.round((targetWidth - width) / 2);
			const y = Math.round((targetHeight - height) / 2);
			return { width, height, x, y };
		}
	}
}

/**
 * Get page range from options
 */
function getPageRange(totalPages: number, options?: PdfImportOptions): number[] {
	if (options?.pages && options.pages.length > 0) {
		// Filter valid page indices
		return options.pages.filter((p) => p >= 0 && p < totalPages);
	}
	// All pages
	return Array.from({ length: totalPages }, (_, i) => i);
}

// =============================================================================
// Tests
// =============================================================================

describe('PDF File Validation', () => {
	it('accepts valid PDF files', () => {
		const result = validatePdfFile({
			type: 'application/pdf',
			size: 1024 * 1024,
			name: 'document.pdf'
		});
		expect(result.valid).toBe(true);
	});

	it('rejects non-PDF files', () => {
		const result = validatePdfFile({
			type: 'image/png',
			size: 1024 * 1024,
			name: 'image.png'
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Type de fichier non supporté');
	});

	it('rejects text files with pdf extension', () => {
		const result = validatePdfFile({
			type: 'text/plain',
			size: 1024,
			name: 'fake.pdf'
		});
		expect(result.valid).toBe(false);
	});

	it('rejects files larger than 20MB', () => {
		const result = validatePdfFile({
			type: 'application/pdf',
			size: 25 * 1024 * 1024,
			name: 'large.pdf'
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Fichier trop volumineux');
		expect(result.error).toContain('20MB');
	});

	it('accepts files exactly at 20MB limit', () => {
		const result = validatePdfFile({
			type: 'application/pdf',
			size: 20 * 1024 * 1024,
			name: 'exact.pdf'
		});
		expect(result.valid).toBe(true);
	});

	it('accepts small PDF files', () => {
		const result = validatePdfFile({
			type: 'application/pdf',
			size: 10 * 1024,
			name: 'small.pdf'
		});
		expect(result.valid).toBe(true);
	});
});

describe('PDF Background Creation', () => {
	it('creates a PDF background with correct type', () => {
		const background = createPdfBackground('base64-pdf-data', 0, 5, 612, 792);
		expect(background.type).toBe('pdf');
	});

	it('stores PDF data', () => {
		const pdfData = 'JVBERi0xLjQK...';
		const background = createPdfBackground(pdfData, 0, 1, 612, 792);
		expect(background.pdfData).toBe(pdfData);
	});

	it('stores page index', () => {
		const background = createPdfBackground('data', 3, 10, 612, 792);
		expect(background.pageIndex).toBe(3);
	});

	it('stores total pages count', () => {
		const background = createPdfBackground('data', 0, 15, 612, 792);
		expect(background.totalPages).toBe(15);
	});

	it('stores PDF page dimensions', () => {
		const background = createPdfBackground('data', 0, 1, 595, 842);
		expect(background.width).toBe(595);
		expect(background.height).toBe(842);
	});
});

describe('Page Background Setting', () => {
	let page: Page;

	beforeEach(() => {
		page = createEmptyPage('A4');
	});

	it('can set PDF background on page', () => {
		const background = createPdfBackground('pdf-data', 0, 1, 612, 792);
		const updated = setPageBackground(page, background);
		expect(updated.background.type).toBe('pdf');
	});

	it('preserves page elements when changing background', () => {
		// Simulate page with elements
		const pageWithElements: Page = {
			...page,
			elements: [
				{
					id: 'stroke-1',
					type: 'stroke',
					toolType: 'pen',
					points: [{ x: 0, y: 0 }],
					color: '#000',
					width: 2,
					opacity: 1
				}
			]
		};

		const background = createPdfBackground('pdf-data', 0, 1, 612, 792);
		const updated = setPageBackground(pageWithElements, background);

		expect(updated.elements).toHaveLength(1);
		expect(updated.elements[0].id).toBe('stroke-1');
	});

	it('preserves page dimensions when changing background', () => {
		const background = createPdfBackground('pdf-data', 0, 1, 612, 792);
		const updated = setPageBackground(page, background);

		expect(updated.width).toBe(page.width);
		expect(updated.height).toBe(page.height);
	});

	it('can replace PDF background with plain background', () => {
		const pdfBackground = createPdfBackground('pdf-data', 0, 1, 612, 792);
		const pageWithPdf = setPageBackground(page, pdfBackground);

		const plainBackground: PageBackground = {
			type: 'plain',
			style: 'grid',
			color: '#ffffff'
		};
		const updated = setPageBackground(pageWithPdf, plainBackground);

		expect(updated.background.type).toBe('plain');
	});
});

describe('Page Creation with PDF Background', () => {
	it('creates page with PDF background', () => {
		const page = createPageWithPdfBackground('pdf-data', 0, 5, 612, 792);
		expect(page.background.type).toBe('pdf');
	});

	it('new page has empty elements', () => {
		const page = createPageWithPdfBackground('pdf-data', 0, 1, 612, 792);
		expect(page.elements).toHaveLength(0);
	});

	it('page has unique ID', () => {
		const page1 = createPageWithPdfBackground('pdf-data', 0, 1, 612, 792);
		const page2 = createPageWithPdfBackground('pdf-data', 1, 2, 612, 792);
		expect(page1.id).not.toBe(page2.id);
	});
});

describe('Fit Mode Calculations', () => {
	const targetWidth = 794;
	const targetHeight = 1123;

	describe('fit mode', () => {
		it('fits landscape PDF in portrait page', () => {
			const result = calculateFitModeDimensions(842, 595, targetWidth, targetHeight, 'fit');
			// Should fit width, leaving vertical margins
			expect(result.width).toBeLessThanOrEqual(targetWidth);
			expect(result.height).toBeLessThanOrEqual(targetHeight);
		});

		it('fits portrait PDF in portrait page', () => {
			const result = calculateFitModeDimensions(595, 842, targetWidth, targetHeight, 'fit');
			expect(result.width).toBeLessThanOrEqual(targetWidth);
			expect(result.height).toBeLessThanOrEqual(targetHeight);
		});

		it('centers the result', () => {
			const result = calculateFitModeDimensions(400, 300, targetWidth, targetHeight, 'fit');
			// Should be centered horizontally
			expect(result.x).toBeGreaterThanOrEqual(0);
			// Should be centered vertically
			expect(result.y).toBeGreaterThanOrEqual(0);
		});

		it('maintains aspect ratio', () => {
			const sourceWidth = 800;
			const sourceHeight = 600;
			const sourceRatio = sourceWidth / sourceHeight;

			const result = calculateFitModeDimensions(
				sourceWidth,
				sourceHeight,
				targetWidth,
				targetHeight,
				'fit'
			);
			const resultRatio = result.width / result.height;

			expect(Math.abs(sourceRatio - resultRatio)).toBeLessThan(0.01);
		});
	});

	describe('fill mode', () => {
		it('fills page completely (may crop)', () => {
			const result = calculateFitModeDimensions(400, 300, targetWidth, targetHeight, 'fill');
			// Either width or height should match or exceed target
			expect(result.width >= targetWidth || result.height >= targetHeight).toBe(true);
		});

		it('maintains aspect ratio', () => {
			const sourceWidth = 800;
			const sourceHeight = 600;
			const sourceRatio = sourceWidth / sourceHeight;

			const result = calculateFitModeDimensions(
				sourceWidth,
				sourceHeight,
				targetWidth,
				targetHeight,
				'fill'
			);
			const resultRatio = result.width / result.height;

			expect(Math.abs(sourceRatio - resultRatio)).toBeLessThan(0.01);
		});

		it('can have negative offset for cropping', () => {
			const result = calculateFitModeDimensions(800, 600, targetWidth, targetHeight, 'fill');
			// One of the offsets should be negative (or zero if perfect fit)
			expect(result.x <= 0 || result.y <= 0).toBe(true);
		});
	});

	describe('stretch mode', () => {
		it('fills page exactly', () => {
			const result = calculateFitModeDimensions(400, 300, targetWidth, targetHeight, 'stretch');
			expect(result.width).toBe(targetWidth);
			expect(result.height).toBe(targetHeight);
		});

		it('always starts at origin', () => {
			const result = calculateFitModeDimensions(400, 300, targetWidth, targetHeight, 'stretch');
			expect(result.x).toBe(0);
			expect(result.y).toBe(0);
		});

		it('ignores source aspect ratio', () => {
			const result = calculateFitModeDimensions(100, 500, targetWidth, targetHeight, 'stretch');
			expect(result.width).toBe(targetWidth);
			expect(result.height).toBe(targetHeight);
		});
	});
});

describe('Page Range Selection', () => {
	const totalPages = 10;

	it('returns all pages when no options provided', () => {
		const range = getPageRange(totalPages);
		expect(range).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('returns all pages when pages array is empty', () => {
		const range = getPageRange(totalPages, { pages: [], fitMode: 'fit' });
		expect(range).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('returns specific pages when specified', () => {
		const range = getPageRange(totalPages, { pages: [0, 2, 5], fitMode: 'fit' });
		expect(range).toEqual([0, 2, 5]);
	});

	it('filters out invalid negative indices', () => {
		const range = getPageRange(totalPages, { pages: [-1, 0, 2], fitMode: 'fit' });
		expect(range).toEqual([0, 2]);
	});

	it('filters out indices beyond total pages', () => {
		const range = getPageRange(totalPages, { pages: [0, 5, 15, 20], fitMode: 'fit' });
		expect(range).toEqual([0, 5]);
	});

	it('handles single page selection', () => {
		const range = getPageRange(totalPages, { pages: [3], fitMode: 'fit' });
		expect(range).toEqual([3]);
	});

	it('handles single page PDF', () => {
		const range = getPageRange(1);
		expect(range).toEqual([0]);
	});
});

describe('PDF Background Serialization', () => {
	it('can serialize PDF background to JSON', () => {
		const background = createPdfBackground('base64-encoded-pdf-data', 2, 10, 612, 792);

		const json = JSON.stringify(background);
		const parsed = JSON.parse(json);

		expect(parsed.type).toBe('pdf');
		expect(parsed.pdfData).toBe('base64-encoded-pdf-data');
		expect(parsed.pageIndex).toBe(2);
		expect(parsed.totalPages).toBe(10);
		expect(parsed.width).toBe(612);
		expect(parsed.height).toBe(792);
	});

	it('page with PDF background serializes correctly', () => {
		const page = createPageWithPdfBackground('pdf-content', 0, 5, 595, 842);

		const json = JSON.stringify(page);
		const parsed = JSON.parse(json);

		expect(parsed.background.type).toBe('pdf');
		expect(parsed.background.pdfData).toBe('pdf-content');
	});
});

describe('Multi-page PDF Import', () => {
	it('creates one whiteboard page per PDF page', () => {
		const pdfPageCount = 5;
		const pages: Page[] = [];

		for (let i = 0; i < pdfPageCount; i++) {
			pages.push(createPageWithPdfBackground(`pdf-data-page-${i}`, i, pdfPageCount, 612, 792));
		}

		expect(pages).toHaveLength(5);
		pages.forEach((page, index) => {
			const bg = page.background as BackgroundPdf;
			expect(bg.pageIndex).toBe(index);
			expect(bg.totalPages).toBe(5);
		});
	});

	it('each page has unique ID', () => {
		const pages: Page[] = [];
		for (let i = 0; i < 3; i++) {
			pages.push(createPageWithPdfBackground('pdf-data', i, 3, 612, 792));
		}

		const ids = pages.map((p) => p.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(3);
	});

	it('imported pages have empty elements', () => {
		const pages: Page[] = [];
		for (let i = 0; i < 3; i++) {
			pages.push(createPageWithPdfBackground('pdf-data', i, 3, 612, 792));
		}

		pages.forEach((page) => {
			expect(page.elements).toHaveLength(0);
		});
	});
});

describe('PDF Import Integration', () => {
	it('validates then creates pages on successful import', () => {
		const file = {
			type: 'application/pdf',
			size: 1024 * 1024,
			name: 'document.pdf'
		};

		const validation = validatePdfFile(file);
		expect(validation.valid).toBe(true);

		if (validation.valid) {
			// Simulate 3-page PDF import
			const pages: Page[] = [];
			for (let i = 0; i < 3; i++) {
				pages.push(createPageWithPdfBackground('pdf-data', i, 3, 612, 792));
			}

			expect(pages).toHaveLength(3);
			pages.forEach((page) => {
				expect(page.background.type).toBe('pdf');
			});
		}
	});

	it('rejects invalid file and provides error', () => {
		const file = {
			type: 'text/plain',
			size: 1024,
			name: 'fake.pdf'
		};

		const validation = validatePdfFile(file);
		expect(validation.valid).toBe(false);
		expect(validation.error).toBeDefined();
	});
});
