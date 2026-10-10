/**
 * Tests de l'import PDF du tableau blanc : validation du fichier, overlay PDF,
 * création des pages, modes d'ajustement, sélection des pages.
 *
 * Teste le vrai module `utils/pdf-loader`. Le rendu pdf.js (`loadPdfFile`,
 * `renderPdfPage`, `importPdfFile`) demande un navigateur : il n'est pas couvert ici.
 *
 * Modèle de l'application : `Page.background` n'est qu'un fond uni ; un PDF
 * importé vit dans `Page.overlay`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Page, BackgroundPdf } from '../types/document';
import { createEmptyPage, DEFAULT_BACKGROUND } from '../types/document';
import {
	MAX_PDF_SIZE,
	PDF_MIME_TYPE,
	validatePdfFile,
	createPdfBackground,
	setPageOverlay,
	createPageWithPdfBackground,
	calculateFitModeDimensions,
	getPageRange
} from '../utils/pdf-loader';

// =============================================================================
// Helpers
// =============================================================================

/** Un vrai `File` dont la taille en octets est exactement `size`. */
function makeFile(name: string, type: string, size: number): File {
	return new File([new Uint8Array(size)], name, { type });
}

/** L'overlay PDF d'une page, ou un échec explicite s'il manque. */
function pdfOverlayOf(page: Page): BackgroundPdf {
	const overlay = page.overlay;
	if (overlay?.type !== 'pdf') throw new Error('overlay PDF attendu');
	return overlay;
}

// =============================================================================
// Tests
// =============================================================================

describe('Constantes du module', () => {
	it('fixe la limite à 20 Mo et le type MIME PDF', () => {
		expect(MAX_PDF_SIZE).toBe(20 * 1024 * 1024);
		expect(PDF_MIME_TYPE).toBe('application/pdf');
	});
});

describe('PDF File Validation', () => {
	it('accepts valid PDF files', () => {
		const result = validatePdfFile(makeFile('document.pdf', 'application/pdf', 1024 * 1024));
		expect(result).toEqual({ valid: true });
	});

	it('rejects non-PDF files', () => {
		const result = validatePdfFile(makeFile('image.png', 'image/png', 1024));
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Type de fichier non supporté');
		expect(result.error).toContain('image/png');
	});

	it('rejects text files with pdf extension', () => {
		const result = validatePdfFile(makeFile('fake.pdf', 'text/plain', 1024));
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Type de fichier non supporté');
	});

	it('rejects a file without MIME type, even named .pdf', () => {
		const result = validatePdfFile(makeFile('sans-type.pdf', '', 1024));
		expect(result.valid).toBe(false);
	});

	it('rejects files larger than 20MB', () => {
		const result = validatePdfFile(makeFile('large.pdf', 'application/pdf', 25 * 1024 * 1024));
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Fichier trop volumineux (25.0MB). Maximum: 20MB');
	});

	it('accepts files exactly at 20MB limit', () => {
		const result = validatePdfFile(makeFile('exact.pdf', 'application/pdf', MAX_PDF_SIZE));
		expect(result.valid).toBe(true);
	});

	it('rejects a file one byte over the limit', () => {
		const result = validatePdfFile(makeFile('limite.pdf', 'application/pdf', MAX_PDF_SIZE + 1));
		expect(result.valid).toBe(false);
		expect(result.error).toContain('Fichier trop volumineux');
	});

	it('accepts small PDF files', () => {
		const result = validatePdfFile(makeFile('small.pdf', 'application/pdf', 10 * 1024));
		expect(result.valid).toBe(true);
	});
});

describe('PDF Background Creation', () => {
	it('builds the full PDF overlay', () => {
		const background = createPdfBackground('JVBERi0xLjQK...', 3, 10, 595, 842);
		expect(background).toEqual({
			type: 'pdf',
			pdfData: 'JVBERi0xLjQK...',
			pageIndex: 3,
			totalPages: 10,
			width: 595,
			height: 842
		});
	});

	it('omits contentArea when not given', () => {
		const background = createPdfBackground('data', 0, 1, 612, 792);
		expect('contentArea' in background).toBe(false);
	});

	it('stores contentArea when given', () => {
		const contentArea = { x: 20, y: 20, w: 776, h: 1016 };
		const background = createPdfBackground('data', 0, 1, 612, 792, contentArea);
		expect(background.contentArea).toEqual(contentArea);
	});
});

describe('Page Overlay Setting', () => {
	let page: Page;

	beforeEach(() => {
		page = createEmptyPage('A4');
	});

	it('puts the PDF in overlay and keeps the plain background', () => {
		const overlay = createPdfBackground('pdf-data', 0, 1, 612, 792);
		const updated = setPageOverlay(page, overlay);
		expect(updated.overlay).toEqual(overlay);
		expect(updated.background).toEqual(page.background);
		expect(updated.background.type).toBe('plain');
	});

	it('does not mutate the original page', () => {
		const overlay = createPdfBackground('pdf-data', 0, 1, 612, 792);
		setPageOverlay(page, overlay);
		expect(page.overlay).toBeUndefined();
	});

	it('preserves page elements when setting overlay', () => {
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
				},
				{
					id: 'stroke-2',
					type: 'stroke',
					toolType: 'pen',
					points: [{ x: 5, y: 5 }],
					color: '#f00',
					width: 3,
					opacity: 1
				}
			]
		};

		const updated = setPageOverlay(
			pageWithElements,
			createPdfBackground('pdf-data', 0, 1, 612, 792)
		);

		expect(updated.elements.map((e) => e.id)).toEqual(['stroke-1', 'stroke-2']);
	});

	it('preserves page id and dimensions when setting overlay', () => {
		const updated = setPageOverlay(page, createPdfBackground('pdf-data', 0, 1, 612, 792));
		expect(updated.id).toBe(page.id);
		expect(updated.width).toBe(page.width);
		expect(updated.height).toBe(page.height);
	});

	it('replaces an existing PDF overlay', () => {
		const first = setPageOverlay(page, createPdfBackground('page-1', 0, 2, 612, 792));
		const second = setPageOverlay(first, createPdfBackground('page-2', 1, 2, 612, 792));
		expect(pdfOverlayOf(second).pdfData).toBe('page-2');
		expect(pdfOverlayOf(second).pageIndex).toBe(1);
	});
});

describe('Page Creation with PDF Background', () => {
	it('creates page with PDF overlay over the default plain background', () => {
		const page = createPageWithPdfBackground('pdf-data', 2, 5, 612, 792);
		expect(page.background).toEqual(DEFAULT_BACKGROUND);
		expect(page.overlay).toEqual({
			type: 'pdf',
			pdfData: 'pdf-data',
			pageIndex: 2,
			totalPages: 5,
			width: 612,
			height: 792
		});
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

	it('does not share the default background object', () => {
		const page = createPageWithPdfBackground('pdf-data', 0, 1, 612, 792);
		expect(page.background).not.toBe(DEFAULT_BACKGROUND);
	});

	describe('normal mode', () => {
		it('sizes the page to the PDF, points converted to pixels (96/72)', () => {
			// Lettre US : 612 × 792 pt → 816 × 1056 px
			const page = createPageWithPdfBackground('pdf-data', 0, 1, 612, 792);
			expect(page.width).toBe(816);
			expect(page.height).toBe(1056);
		});

		it('rounds the converted dimensions', () => {
			// A4 : 595 × 842 pt → 793,33… × 1122,66… px
			const page = createPageWithPdfBackground('pdf-data', 0, 1, 595, 842);
			expect(page.width).toBe(793);
			expect(page.height).toBe(1123);
		});

		it('keeps the PDF dimensions in points in the overlay, without contentArea', () => {
			const overlay = pdfOverlayOf(createPageWithPdfBackground('pdf-data', 0, 1, 595, 842));
			expect(overlay.width).toBe(595);
			expect(overlay.height).toBe(842);
			expect(overlay.contentArea).toBeUndefined();
		});

		it('is the default mode', () => {
			const implicit = createPageWithPdfBackground('pdf-data', 0, 1, 612, 792);
			const explicit = createPageWithPdfBackground('pdf-data', 0, 1, 612, 792, 'normal');
			expect(implicit.width).toBe(explicit.width);
			expect(implicit.height).toBe(explicit.height);
			expect(implicit.overlay).toEqual(explicit.overlay);
		});
	});

	describe('extended mode', () => {
		it('doubles the width of a portrait PDF, content in the left half with margin', () => {
			const page = createPageWithPdfBackground('pdf-data', 0, 1, 612, 792, 'extended');
			expect(page.width).toBe(816 * 2);
			expect(page.height).toBe(1056);
			expect(pdfOverlayOf(page).contentArea).toEqual({ x: 20, y: 20, w: 776, h: 1016 });
		});

		it('doubles the height of a landscape PDF, content in the top half with margin', () => {
			const page = createPageWithPdfBackground('pdf-data', 0, 1, 792, 612, 'extended');
			expect(page.width).toBe(1056);
			expect(page.height).toBe(816 * 2);
			expect(pdfOverlayOf(page).contentArea).toEqual({ x: 20, y: 20, w: 1016, h: 776 });
		});

		it('treats a square PDF as landscape (doubles the height)', () => {
			const page = createPageWithPdfBackground('pdf-data', 0, 1, 600, 600, 'extended');
			expect(page.width).toBe(800);
			expect(page.height).toBe(1600);
		});
	});
});

describe('Fit Mode Calculations', () => {
	const targetWidth = 794;
	const targetHeight = 1123;

	describe('fit mode', () => {
		it('fits landscape PDF in portrait page: full width, vertical margins', () => {
			// échelle min(794/842, 1123/595) = 794/842
			const result = calculateFitModeDimensions(842, 595, targetWidth, targetHeight, 'fit');
			expect(result).toEqual({ width: 794, height: 561, x: 0, y: 281 });
		});

		it('fits portrait PDF in portrait page', () => {
			const result = calculateFitModeDimensions(595, 842, targetWidth, targetHeight, 'fit');
			expect(result.width).toBeLessThanOrEqual(targetWidth);
			expect(result.height).toBeLessThanOrEqual(targetHeight);
			expect(result.width === targetWidth || result.height === targetHeight).toBe(true);
		});

		it('centers the result', () => {
			const result = calculateFitModeDimensions(400, 300, targetWidth, targetHeight, 'fit');
			expect(result.x).toBe(Math.round((targetWidth - result.width) / 2));
			expect(result.y).toBe(Math.round((targetHeight - result.height) / 2));
			expect(result.x).toBe(0);
			expect(result.y).toBeGreaterThan(0);
		});

		it('maintains aspect ratio', () => {
			const result = calculateFitModeDimensions(800, 600, targetWidth, targetHeight, 'fit');
			expect(Math.abs(800 / 600 - result.width / result.height)).toBeLessThan(0.01);
		});
	});

	describe('fill mode', () => {
		it('fills page completely (may crop)', () => {
			const result = calculateFitModeDimensions(400, 300, targetWidth, targetHeight, 'fill');
			expect(result.width).toBeGreaterThanOrEqual(targetWidth);
			expect(result.height).toBeGreaterThanOrEqual(targetHeight);
		});

		it('maintains aspect ratio', () => {
			const result = calculateFitModeDimensions(800, 600, targetWidth, targetHeight, 'fill');
			expect(Math.abs(800 / 600 - result.width / result.height)).toBeLessThan(0.01);
		});

		it('has a negative offset on the cropped axis', () => {
			const result = calculateFitModeDimensions(800, 600, targetWidth, targetHeight, 'fill');
			// paysage dans portrait : la hauteur remplit, la largeur déborde
			expect(result.height).toBe(targetHeight);
			expect(result.x).toBeLessThan(0);
			expect(result.y).toBe(0);
		});
	});

	describe('stretch mode', () => {
		it('fills page exactly from the origin', () => {
			const result = calculateFitModeDimensions(400, 300, targetWidth, targetHeight, 'stretch');
			expect(result).toEqual({ width: targetWidth, height: targetHeight, x: 0, y: 0 });
		});

		it('ignores source aspect ratio', () => {
			const result = calculateFitModeDimensions(100, 500, targetWidth, targetHeight, 'stretch');
			expect(result).toEqual({ width: targetWidth, height: targetHeight, x: 0, y: 0 });
		});
	});
});

describe('Page Range Selection', () => {
	const totalPages = 10;

	it('returns all pages when no options provided', () => {
		expect(getPageRange(totalPages)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('returns all pages when pages array is empty', () => {
		expect(getPageRange(totalPages, { pages: [], fitMode: 'fit' })).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9
		]);
	});

	it('returns specific pages when specified', () => {
		expect(getPageRange(totalPages, { pages: [0, 2, 5], fitMode: 'fit' })).toEqual([0, 2, 5]);
	});

	it('filters out invalid negative indices', () => {
		expect(getPageRange(totalPages, { pages: [-1, 0, 2], fitMode: 'fit' })).toEqual([0, 2]);
	});

	it('filters out indices beyond total pages', () => {
		expect(getPageRange(totalPages, { pages: [0, 5, 10, 15, 20], fitMode: 'fit' })).toEqual([0, 5]);
	});

	it('returns an empty range when every requested page is out of bounds', () => {
		expect(getPageRange(totalPages, { pages: [10, 11], fitMode: 'fit' })).toEqual([]);
	});

	it('handles single page selection', () => {
		expect(getPageRange(totalPages, { pages: [3], fitMode: 'fit' })).toEqual([3]);
	});

	it('handles single page PDF', () => {
		expect(getPageRange(1)).toEqual([0]);
	});
});

describe('PDF Background Serialization', () => {
	it('can serialize PDF background to JSON', () => {
		const background = createPdfBackground('base64-encoded-pdf-data', 2, 10, 612, 792);
		expect(JSON.parse(JSON.stringify(background))).toEqual(background);
	});

	it('page with PDF overlay serializes correctly', () => {
		const page = createPageWithPdfBackground('pdf-content', 0, 5, 595, 842, 'extended');
		expect(JSON.parse(JSON.stringify(page))).toEqual(page);
	});
});

describe('Multi-page PDF Import', () => {
	it('creates one whiteboard page per PDF page, with its own index', () => {
		const pdfPageCount = 5;
		const pages: Page[] = [];
		for (let i = 0; i < pdfPageCount; i++) {
			pages.push(createPageWithPdfBackground(`pdf-data-page-${i}`, i, pdfPageCount, 612, 792));
		}

		expect(pages).toHaveLength(5);
		pages.forEach((page, index) => {
			const overlay = pdfOverlayOf(page);
			expect(overlay.pageIndex).toBe(index);
			expect(overlay.totalPages).toBe(5);
			expect(overlay.pdfData).toBe(`pdf-data-page-${index}`);
		});
		expect(new Set(pages.map((p) => p.id)).size).toBe(5);
	});
});
