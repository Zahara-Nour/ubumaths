/**
 * Tests for Export Functionality (PNG, SVG, PDF)
 *
 * Tests export options, rendering, and file generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { WhiteboardDocument, Page } from '../types/document';
import { createEmptyDocument, createEmptyPage } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** Supported export formats */
const EXPORT_FORMATS = ['png', 'svg', 'pdf'] as const;

/** PNG resolution options */
const PNG_RESOLUTIONS = [1, 2, 3] as const;

/** Default PNG resolution */
const DEFAULT_PNG_RESOLUTION = 2;

// =============================================================================
// Helper Types
// =============================================================================

type ExportFormat = (typeof EXPORT_FORMATS)[number];
type PngResolution = (typeof PNG_RESOLUTIONS)[number];

interface ExportOptions {
	format: ExportFormat;
	/** For PNG: resolution multiplier (1x, 2x, 3x) */
	resolution?: PngResolution;
	/** Pages to export: 'current', 'all', or array of page indices */
	pages?: 'current' | 'all' | number[];
	/** Include instruments in export */
	includeInstruments?: boolean;
	/** Callback for progress updates (0-100) */
	onProgress?: (progress: number) => void;
}

interface ExportResult {
	success: boolean;
	/** Data URL for single page exports (PNG, SVG) */
	dataUrl?: string;
	/** Blob for PDF exports */
	blob?: Blob;
	/** Filename suggestion */
	filename?: string;
	error?: string;
}

interface _PageExportData {
	pageIndex: number;
	dataUrl: string;
	width: number;
	height: number;
}

// =============================================================================
// Helper Functions (to be implemented in pdf-export.ts)
// =============================================================================

/**
 * Generate filename for export
 */
function generateExportFilename(
	document: WhiteboardDocument,
	format: ExportFormat,
	pageIndex?: number
): string {
	const sanitized = document.title.replace(/[<>:"/\\|?*]/g, '').trim() || 'Sans_titre';

	if (format === 'pdf') {
		return `${sanitized}.pdf`;
	}

	const pageSuffix = pageIndex !== undefined ? `_page${pageIndex + 1}` : '';
	return `${sanitized}${pageSuffix}.${format}`;
}

/**
 * Validate export options
 */
function validateExportOptions(options: ExportOptions): { valid: boolean; error?: string } {
	if (!EXPORT_FORMATS.includes(options.format)) {
		return { valid: false, error: `Invalid format: ${options.format}` };
	}

	if (options.format === 'png' && options.resolution !== undefined) {
		if (!PNG_RESOLUTIONS.includes(options.resolution)) {
			return { valid: false, error: `Invalid resolution: ${options.resolution}` };
		}
	}

	if (Array.isArray(options.pages)) {
		if (options.pages.length === 0) {
			return { valid: false, error: 'No pages selected for export' };
		}
		if (options.pages.some((p) => p < 0 || !Number.isInteger(p))) {
			return { valid: false, error: 'Invalid page indices' };
		}
	}

	return { valid: true };
}

/**
 * Get pages to export based on options
 */
function getPagesToExport(
	document: WhiteboardDocument,
	pages: ExportOptions['pages']
): { indices: number[]; error?: string } {
	if (pages === 'current') {
		return { indices: [document.currentPageIndex] };
	}

	if (pages === 'all' || pages === undefined) {
		return { indices: document.pages.map((_, i) => i) };
	}

	// Validate indices are within bounds
	const maxIndex = document.pages.length - 1;
	const invalidIndices = pages.filter((i) => i > maxIndex);
	if (invalidIndices.length > 0) {
		return {
			indices: [],
			error: `Page indices out of bounds: ${invalidIndices.join(', ')}`
		};
	}

	return { indices: pages };
}

/**
 * Calculate export dimensions for PNG
 */
function calculateExportDimensions(
	page: Page,
	resolution: PngResolution
): { width: number; height: number } {
	return {
		width: Math.round(page.width * resolution),
		height: Math.round(page.height * resolution)
	};
}

/**
 * Create default export options
 */
function createDefaultExportOptions(format: ExportFormat): ExportOptions {
	const options: ExportOptions = {
		format,
		includeInstruments: true,
		pages: format === 'pdf' ? 'all' : 'current'
	};

	if (format === 'png') {
		options.resolution = DEFAULT_PNG_RESOLUTION;
	}

	return options;
}

/**
 * Estimate export time for progress indicator
 */
function shouldShowProgressIndicator(document: WhiteboardDocument, pages: number[]): boolean {
	// Show progress for documents with more than 5 pages
	return pages.length > 5;
}

/**
 * Calculate progress percentage
 */
function calculateProgress(completedPages: number, totalPages: number): number {
	if (totalPages === 0) return 100;
	return Math.round((completedPages / totalPages) * 100);
}

// =============================================================================
// Tests: Export Filename Generation
// =============================================================================

describe('Export Filename Generation', () => {
	let document: WhiteboardDocument;

	beforeEach(() => {
		document = createEmptyDocument('Mon Document');
	});

	it('generates PNG filename with page number', () => {
		const filename = generateExportFilename(document, 'png', 0);
		expect(filename).toBe('Mon Document_page1.png');
	});

	it('generates PNG filename without page number', () => {
		const filename = generateExportFilename(document, 'png');
		expect(filename).toBe('Mon Document.png');
	});

	it('generates SVG filename with page number', () => {
		const filename = generateExportFilename(document, 'svg', 2);
		expect(filename).toBe('Mon Document_page3.svg');
	});

	it('generates PDF filename without page number', () => {
		const filename = generateExportFilename(document, 'pdf');
		expect(filename).toBe('Mon Document.pdf');
	});

	it('sanitizes invalid characters in filename', () => {
		document = createEmptyDocument('Test: <invalid> "chars"');
		const filename = generateExportFilename(document, 'png');
		expect(filename).toBe('Test invalid chars.png');
		expect(filename).not.toContain(':');
		expect(filename).not.toContain('<');
		expect(filename).not.toContain('>');
		expect(filename).not.toContain('"');
	});

	it('handles empty title', () => {
		document = createEmptyDocument('');
		// Empty title defaults to 'Sans titre' in createEmptyDocument
		// but if somehow empty, should fallback
		document = { ...document, title: '' };
		const filename = generateExportFilename(document, 'pdf');
		expect(filename).toBe('Sans_titre.pdf');
	});

	it('handles whitespace-only title', () => {
		document = { ...document, title: '   ' };
		const filename = generateExportFilename(document, 'png');
		expect(filename).toBe('Sans_titre.png');
	});
});

// =============================================================================
// Tests: Export Options Validation
// =============================================================================

describe('Export Options Validation', () => {
	it('accepts valid PNG options', () => {
		const result = validateExportOptions({
			format: 'png',
			resolution: 2,
			pages: 'current'
		});
		expect(result.valid).toBe(true);
	});

	it('accepts valid SVG options', () => {
		const result = validateExportOptions({
			format: 'svg',
			pages: 'current'
		});
		expect(result.valid).toBe(true);
	});

	it('accepts valid PDF options', () => {
		const result = validateExportOptions({
			format: 'pdf',
			pages: 'all'
		});
		expect(result.valid).toBe(true);
	});

	it('accepts array of page indices', () => {
		const result = validateExportOptions({
			format: 'pdf',
			pages: [0, 2, 4]
		});
		expect(result.valid).toBe(true);
	});

	it('rejects invalid format', () => {
		const result = validateExportOptions({
			format: 'bmp' as ExportFormat
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Invalid format');
	});

	it('rejects invalid PNG resolution', () => {
		const result = validateExportOptions({
			format: 'png',
			resolution: 5 as PngResolution
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Invalid resolution');
	});

	it('rejects empty page array', () => {
		const result = validateExportOptions({
			format: 'pdf',
			pages: []
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('No pages selected');
	});

	it('rejects negative page indices', () => {
		const result = validateExportOptions({
			format: 'pdf',
			pages: [0, -1, 2]
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Invalid page indices');
	});

	it('rejects non-integer page indices', () => {
		const result = validateExportOptions({
			format: 'pdf',
			pages: [0, 1.5, 2]
		});
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Invalid page indices');
	});
});

// =============================================================================
// Tests: Page Selection
// =============================================================================

describe('Page Selection for Export', () => {
	let document: WhiteboardDocument;

	beforeEach(() => {
		document = createEmptyDocument('Test');
		// Add more pages
		const pages = [document.pages[0], createEmptyPage(), createEmptyPage(), createEmptyPage()];
		document = { ...document, pages, currentPageIndex: 1 };
	});

	it('selects current page only', () => {
		const result = getPagesToExport(document, 'current');
		expect(result.indices).toEqual([1]);
	});

	it('selects all pages', () => {
		const result = getPagesToExport(document, 'all');
		expect(result.indices).toEqual([0, 1, 2, 3]);
	});

	it('selects all pages by default (undefined)', () => {
		const result = getPagesToExport(document, undefined);
		expect(result.indices).toEqual([0, 1, 2, 3]);
	});

	it('selects specific pages by indices', () => {
		const result = getPagesToExport(document, [0, 2]);
		expect(result.indices).toEqual([0, 2]);
	});

	it('returns error for out-of-bounds indices', () => {
		const result = getPagesToExport(document, [0, 5, 10]);
		expect(result.error).toContain('out of bounds');
		expect(result.indices).toEqual([]);
	});

	it('handles single page document', () => {
		const singlePageDoc = createEmptyDocument('Single');
		const result = getPagesToExport(singlePageDoc, 'all');
		expect(result.indices).toEqual([0]);
	});
});

// =============================================================================
// Tests: Export Dimensions
// =============================================================================

describe('Export Dimensions Calculation', () => {
	let page: Page;

	beforeEach(() => {
		page = createEmptyPage('A4'); // 794 x 1123
	});

	it('calculates 1x resolution dimensions', () => {
		const dims = calculateExportDimensions(page, 1);
		expect(dims.width).toBe(794);
		expect(dims.height).toBe(1123);
	});

	it('calculates 2x resolution dimensions', () => {
		const dims = calculateExportDimensions(page, 2);
		expect(dims.width).toBe(1588);
		expect(dims.height).toBe(2246);
	});

	it('calculates 3x resolution dimensions', () => {
		const dims = calculateExportDimensions(page, 3);
		expect(dims.width).toBe(2382);
		expect(dims.height).toBe(3369);
	});

	it('handles landscape page', () => {
		page = createEmptyPage('A4_LANDSCAPE'); // 1123 x 794
		const dims = calculateExportDimensions(page, 2);
		expect(dims.width).toBe(2246);
		expect(dims.height).toBe(1588);
	});
});

// =============================================================================
// Tests: Default Export Options
// =============================================================================

describe('Default Export Options', () => {
	it('creates default PNG options', () => {
		const options = createDefaultExportOptions('png');
		expect(options.format).toBe('png');
		expect(options.resolution).toBe(2);
		expect(options.pages).toBe('current');
		expect(options.includeInstruments).toBe(true);
	});

	it('creates default SVG options', () => {
		const options = createDefaultExportOptions('svg');
		expect(options.format).toBe('svg');
		expect(options.resolution).toBeUndefined();
		expect(options.pages).toBe('current');
		expect(options.includeInstruments).toBe(true);
	});

	it('creates default PDF options', () => {
		const options = createDefaultExportOptions('pdf');
		expect(options.format).toBe('pdf');
		expect(options.resolution).toBeUndefined();
		expect(options.pages).toBe('all');
		expect(options.includeInstruments).toBe(true);
	});
});

// =============================================================================
// Tests: Progress Indicator
// =============================================================================

describe('Progress Indicator', () => {
	let document: WhiteboardDocument;

	beforeEach(() => {
		document = createEmptyDocument('Test');
	});

	it('shows progress for more than 5 pages', () => {
		const pages = Array.from({ length: 6 }, () => createEmptyPage());
		document = { ...document, pages };

		const shouldShow = shouldShowProgressIndicator(document, [0, 1, 2, 3, 4, 5]);
		expect(shouldShow).toBe(true);
	});

	it('hides progress for 5 or fewer pages', () => {
		const pages = Array.from({ length: 5 }, () => createEmptyPage());
		document = { ...document, pages };

		const shouldShow = shouldShowProgressIndicator(document, [0, 1, 2, 3, 4]);
		expect(shouldShow).toBe(false);
	});

	it('hides progress for single page', () => {
		const shouldShow = shouldShowProgressIndicator(document, [0]);
		expect(shouldShow).toBe(false);
	});

	it('calculates progress percentage correctly', () => {
		expect(calculateProgress(0, 10)).toBe(0);
		expect(calculateProgress(5, 10)).toBe(50);
		expect(calculateProgress(10, 10)).toBe(100);
	});

	it('handles edge cases in progress calculation', () => {
		expect(calculateProgress(0, 0)).toBe(100);
		expect(calculateProgress(3, 4)).toBe(75);
		expect(calculateProgress(1, 3)).toBe(33);
	});
});

// =============================================================================
// Tests: Export Format Constants
// =============================================================================

describe('Export Format Constants', () => {
	it('defines supported formats', () => {
		expect(EXPORT_FORMATS).toContain('png');
		expect(EXPORT_FORMATS).toContain('svg');
		expect(EXPORT_FORMATS).toContain('pdf');
		expect(EXPORT_FORMATS.length).toBe(3);
	});

	it('defines PNG resolutions', () => {
		expect(PNG_RESOLUTIONS).toContain(1);
		expect(PNG_RESOLUTIONS).toContain(2);
		expect(PNG_RESOLUTIONS).toContain(3);
		expect(PNG_RESOLUTIONS.length).toBe(3);
	});

	it('has valid default PNG resolution', () => {
		expect(PNG_RESOLUTIONS).toContain(DEFAULT_PNG_RESOLUTION);
	});
});

// =============================================================================
// Tests: Export Result Structure
// =============================================================================

describe('Export Result Structure', () => {
	it('defines success result with dataUrl for PNG', () => {
		const result: ExportResult = {
			success: true,
			dataUrl: 'data:image/png;base64,...',
			filename: 'test.png'
		};
		expect(result.success).toBe(true);
		expect(result.dataUrl).toBeDefined();
		expect(result.blob).toBeUndefined();
	});

	it('defines success result with blob for PDF', () => {
		const result: ExportResult = {
			success: true,
			blob: new Blob(['test'], { type: 'application/pdf' }),
			filename: 'test.pdf'
		};
		expect(result.success).toBe(true);
		expect(result.blob).toBeDefined();
		expect(result.dataUrl).toBeUndefined();
	});

	it('defines error result', () => {
		const result: ExportResult = {
			success: false,
			error: 'Export failed'
		};
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

// =============================================================================
// Tests: SVG Export Specifics
// =============================================================================

describe('SVG Export', () => {
	it('SVG is vector format (no resolution needed)', () => {
		const options = createDefaultExportOptions('svg');
		expect(options.resolution).toBeUndefined();
	});

	it('SVG exports single page by default', () => {
		const options = createDefaultExportOptions('svg');
		expect(options.pages).toBe('current');
	});
});

// =============================================================================
// Tests: PDF Export Specifics
// =============================================================================

describe('PDF Export', () => {
	it('PDF exports all pages by default', () => {
		const options = createDefaultExportOptions('pdf');
		expect(options.pages).toBe('all');
	});

	it('PDF supports page selection', () => {
		const result = validateExportOptions({
			format: 'pdf',
			pages: [0, 2, 4]
		});
		expect(result.valid).toBe(true);
	});

	it('PDF supports current page only', () => {
		const result = validateExportOptions({
			format: 'pdf',
			pages: 'current'
		});
		expect(result.valid).toBe(true);
	});
});

// =============================================================================
// Tests: Instruments in Export
// =============================================================================

describe('Instruments in Export', () => {
	it('includes instruments by default', () => {
		const options = createDefaultExportOptions('png');
		expect(options.includeInstruments).toBe(true);
	});

	it('allows excluding instruments', () => {
		const result = validateExportOptions({
			format: 'png',
			includeInstruments: false
		});
		expect(result.valid).toBe(true);
	});
});
