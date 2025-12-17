/**
 * PDF Loading Utilities
 *
 * Handles PDF file validation, page extraction, and conversion to images.
 * Uses pdfjs-dist for PDF parsing (lazy loaded).
 *
 * @module whiteboard/utils/pdf-loader
 */

import type { Page, PageBackground, BackgroundPdf } from '../types/document';
import { createEmptyPage } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** Maximum PDF file size in bytes (20MB) */
export const MAX_PDF_SIZE = 20 * 1024 * 1024;

/** PDF MIME type */
export const PDF_MIME_TYPE = 'application/pdf';

/** Default scale for PDF rendering (2x for high DPI) */
export const PDF_RENDER_SCALE = 2;

// =============================================================================
// Types
// =============================================================================

export interface PdfValidationResult {
	valid: boolean;
	error?: string;
}

export interface PdfPageInfo {
	pageIndex: number;
	width: number;
	height: number;
}

export interface PdfImportOptions {
	/** Pages to import (empty = all pages) */
	pages?: number[];
	/** Fit mode for the background */
	fitMode: 'fit' | 'fill' | 'stretch';
}

export interface PdfLoadResult {
	success: boolean;
	totalPages?: number;
	pageInfos?: PdfPageInfo[];
	error?: string;
}

export interface PdfPageRenderResult {
	success: boolean;
	dataUrl?: string;
	width?: number;
	height?: number;
	error?: string;
}

export interface PdfImportResult {
	success: boolean;
	pages?: Page[];
	error?: string;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a PDF file before import
 */
export function validatePdfFile(file: File): PdfValidationResult {
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

// =============================================================================
// PDF.js Loading (Lazy)
// =============================================================================

let pdfjsLib: typeof import('pdfjs-dist') | null = null;

/**
 * Lazy load pdfjs-dist library
 */
async function getPdfjs(): Promise<typeof import('pdfjs-dist')> {
	if (pdfjsLib) return pdfjsLib;

	pdfjsLib = await import('pdfjs-dist');

	// Set worker source
	// @ts-expect-error - pdfjs-dist worker module lacks type declarations
	const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs');
	pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default as string;

	return pdfjsLib;
}

// =============================================================================
// PDF Loading Functions
// =============================================================================

/**
 * Load a PDF file and get page information
 */
export async function loadPdfFile(file: File): Promise<PdfLoadResult> {
	const validation = validatePdfFile(file);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	try {
		const pdfjs = await getPdfjs();
		const arrayBuffer = await file.arrayBuffer();
		const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

		const pageInfos: PdfPageInfo[] = [];

		for (let i = 0; i < pdf.numPages; i++) {
			const page = await pdf.getPage(i + 1); // PDF pages are 1-indexed
			const viewport = page.getViewport({ scale: 1 });
			pageInfos.push({
				pageIndex: i,
				width: viewport.width,
				height: viewport.height
			});
		}

		return {
			success: true,
			totalPages: pdf.numPages,
			pageInfos
		};
	} catch (error) {
		console.error('PDF load error:', error);
		return {
			success: false,
			error: 'Erreur lors de la lecture du PDF. Le fichier est peut-être corrompu.'
		};
	}
}

/**
 * Render a specific PDF page to a data URL
 */
export async function renderPdfPage(
	file: File,
	pageIndex: number,
	scale: number = PDF_RENDER_SCALE
): Promise<PdfPageRenderResult> {
	try {
		const pdfjs = await getPdfjs();
		const arrayBuffer = await file.arrayBuffer();
		const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

		if (pageIndex < 0 || pageIndex >= pdf.numPages) {
			return {
				success: false,
				error: `Page ${pageIndex + 1} inexistante. Le PDF a ${pdf.numPages} page(s).`
			};
		}

		const page = await pdf.getPage(pageIndex + 1);
		const viewport = page.getViewport({ scale });

		// Create canvas for rendering
		const canvas = document.createElement('canvas');
		canvas.width = viewport.width;
		canvas.height = viewport.height;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return { success: false, error: 'Canvas context not available' };
		}

		// Render page (cast to bypass strict type checking on RenderParameters)
		await page.render({
			canvasContext: ctx,
			viewport,
			canvas
		} as Parameters<typeof page.render>[0]).promise;

		const dataUrl = canvas.toDataURL('image/png');

		return {
			success: true,
			dataUrl,
			width: viewport.width / scale, // Original dimensions
			height: viewport.height / scale
		};
	} catch (error) {
		console.error('PDF render error:', error);
		return {
			success: false,
			error: 'Erreur lors du rendu de la page PDF.'
		};
	}
}

// =============================================================================
// Background Functions
// =============================================================================

/**
 * Create a PDF background for a page
 */
export function createPdfBackground(
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
export function setPageBackground(page: Page, background: PageBackground): Page {
	return {
		...page,
		background
	};
}

/**
 * Create a page with PDF background
 */
export function createPageWithPdfBackground(
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

// =============================================================================
// Fit Mode Functions
// =============================================================================

/**
 * Calculate dimensions based on fit mode
 */
export function calculateFitModeDimensions(
	sourceWidth: number,
	sourceHeight: number,
	targetWidth: number,
	targetHeight: number,
	fitMode: 'fit' | 'fill' | 'stretch'
): { width: number; height: number; x: number; y: number } {
	switch (fitMode) {
		case 'stretch':
			return { width: targetWidth, height: targetHeight, x: 0, y: 0 };

		case 'fill': {
			const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
			const width = Math.round(sourceWidth * scale);
			const height = Math.round(sourceHeight * scale);
			const x = Math.round((targetWidth - width) / 2);
			const y = Math.round((targetHeight - height) / 2);
			return { width, height, x, y };
		}

		case 'fit':
		default: {
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
export function getPageRange(totalPages: number, options?: PdfImportOptions): number[] {
	if (options?.pages && options.pages.length > 0) {
		return options.pages.filter((p) => p >= 0 && p < totalPages);
	}
	return Array.from({ length: totalPages }, (_, i) => i);
}

// =============================================================================
// Import Functions
// =============================================================================

/**
 * Import a PDF file as whiteboard pages
 */
export async function importPdfFile(
	file: File,
	options: PdfImportOptions = { fitMode: 'fit' }
): Promise<PdfImportResult> {
	// First, load to get page info
	const loadResult = await loadPdfFile(file);
	if (!loadResult.success || !loadResult.totalPages) {
		return { success: false, error: loadResult.error };
	}

	// Determine which pages to import
	const pageIndices = getPageRange(loadResult.totalPages, options);
	if (pageIndices.length === 0) {
		return { success: false, error: 'Aucune page à importer' };
	}

	// Render each page and create whiteboard pages
	const pages: Page[] = [];

	for (const pageIndex of pageIndices) {
		const renderResult = await renderPdfPage(file, pageIndex);

		if (!renderResult.success || !renderResult.dataUrl) {
			console.warn(`Failed to render PDF page ${pageIndex + 1}:`, renderResult.error);
			continue;
		}

		const page = createPageWithPdfBackground(
			renderResult.dataUrl,
			pageIndex,
			loadResult.totalPages,
			renderResult.width || 612,
			renderResult.height || 792
		);

		pages.push(page);
	}

	if (pages.length === 0) {
		return { success: false, error: 'Impossible de rendre les pages du PDF' };
	}

	return { success: true, pages };
}

/**
 * Import a single PDF page as background for current page
 */
export async function importPdfPageAsBackground(
	file: File,
	pageIndex: number
): Promise<{ success: boolean; background?: BackgroundPdf; error?: string }> {
	const loadResult = await loadPdfFile(file);
	if (!loadResult.success || !loadResult.totalPages) {
		return { success: false, error: loadResult.error };
	}

	const renderResult = await renderPdfPage(file, pageIndex);
	if (!renderResult.success || !renderResult.dataUrl) {
		return { success: false, error: renderResult.error };
	}

	const background = createPdfBackground(
		renderResult.dataUrl,
		pageIndex,
		loadResult.totalPages,
		renderResult.width || 612,
		renderResult.height || 792
	);

	return { success: true, background };
}
