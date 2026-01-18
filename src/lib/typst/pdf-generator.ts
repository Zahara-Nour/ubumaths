/**
 * PDF Generator Utility
 * =====================
 *
 * High-level utility for generating PDFs with automatic external image handling.
 * Wraps the TypstService to handle the complete workflow:
 * 1. Clear tracked images
 * 2. Generate Typst content
 * 3. Fetch and map external images to virtual file system
 * 4. Compile to PDF
 * 5. Clean up virtual file system
 *
 * @module typst/pdf-generator
 *
 * @example
 * ```typescript
 * import { generatePdfFromTypst } from '$lib/typst/pdf-generator';
 * import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
 *
 * const result = await generatePdfFromTypst(() =>
 *   generateStudentWorksheetTypst(worksheet, includeSolution)
 * );
 *
 * if (result.success) {
 *   // Use result.data (Uint8Array)
 * }
 * ```
 */

import { getTypstService, PRIORITY } from '$lib/typst/service';
import {
	clearTrackedExternalImages,
	getTrackedExternalImages
} from '$lib/ubumark/generators/typst-generator';
import { fetchExternalImages, urlToVirtualPath } from '$lib/typst/image-loader';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('pdf-generator');

// ============================================================================
// TYPES
// ============================================================================

export interface PdfGenerationResult {
	success: true;
	data: Uint8Array;
}

export interface PdfGenerationError {
	success: false;
	error: string;
}

export type PdfResult = PdfGenerationResult | PdfGenerationError;

export interface PdfGenerationOptions {
	/** Timeout for image fetching in ms (default: 10000) */
	imageFetchTimeout?: number;
	/** Priority for compilation queue (default: PRIORITY.URGENT) */
	priority?: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate a PDF from Typst content with automatic external image handling
 *
 * This function handles the complete PDF generation workflow:
 * 1. Initializes the Typst service
 * 2. Clears any previously tracked external images
 * 3. Calls the content generator to produce Typst markup
 * 4. Fetches any external images referenced in the content
 * 5. Maps those images to the Typst virtual file system
 * 6. Compiles the Typst content to PDF
 * 7. Cleans up the virtual file system
 *
 * @param generateContent - Function that generates Typst content string
 * @param options - Optional configuration
 * @returns Promise resolving to success with PDF data or error
 *
 * @example Basic usage
 * ```typescript
 * const result = await generatePdfFromTypst(() =>
 *   generateStudentWorksheetTypst(worksheet, true)
 * );
 *
 * if (result.success) {
 *   const blob = new Blob([result.data], { type: 'application/pdf' });
 *   // Download or display the PDF
 * } else {
 *   console.error(result.error);
 * }
 * ```
 *
 * @example With options
 * ```typescript
 * const result = await generatePdfFromTypst(
 *   () => myTypstGenerator(),
 *   { imageFetchTimeout: 15000, priority: PRIORITY.HIGH }
 * );
 * ```
 */
export async function generatePdfFromTypst(
	generateContent: () => string,
	options: PdfGenerationOptions = {}
): Promise<PdfResult> {
	const { imageFetchTimeout = 10000, priority = PRIORITY.URGENT } = options;

	try {
		// Initialize the Typst service
		const service = getTypstService();
		await service.initialize();

		// Clear tracked images before generating content
		clearTrackedExternalImages();

		// Generate Typst content (this will track external image URLs)
		const typstContent = generateContent();

		// Fetch and map external images to virtual file system
		const externalImageUrls = getTrackedExternalImages();
		if (externalImageUrls.length > 0) {
			logger.info('Fetching external images', { count: externalImageUrls.length });

			const imageData = await fetchExternalImages(externalImageUrls, {
				timeout: imageFetchTimeout
			});

			for (const [url, data] of imageData) {
				const virtualPath = urlToVirtualPath(url);
				service.mapShadow(virtualPath, data);
				logger.trace('Mapped image to virtual path', {
					url: url.slice(0, 60),
					virtualPath
				});
			}
		}

		// Compile to PDF
		const result = await service.compileWithPriority(typstContent, { format: 'pdf' }, priority);

		// Reset shadow file system to free memory
		service.resetShadow();

		if (!result.success || !result.data) {
			return {
				success: false,
				error: result.error || 'Erreur lors de la compilation PDF'
			};
		}

		return {
			success: true,
			data: result.data as Uint8Array
		};
	} catch (error) {
		logger.error('PDF generation failed', { error });
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Erreur lors de la generation du PDF'
		};
	}
}

/**
 * Generate PDF and trigger browser download
 *
 * Convenience function that generates a PDF and immediately triggers
 * a browser download with the specified filename.
 *
 * @param generateContent - Function that generates Typst content string
 * @param filename - Filename for the downloaded PDF (should end with .pdf)
 * @param options - Optional configuration
 * @returns Promise resolving to success boolean
 *
 * @example
 * ```typescript
 * const success = await generateAndDownloadPdf(
 *   () => generateStudentWorksheetTypst(worksheet, false),
 *   'mon_devoir.pdf'
 * );
 *
 * if (success) {
 *   toaster.success('PDF telecharge !');
 * } else {
 *   toaster.error('Erreur lors de la generation');
 * }
 * ```
 */
export async function generateAndDownloadPdf(
	generateContent: () => string,
	filename: string,
	options: PdfGenerationOptions = {}
): Promise<{ success: boolean; error?: string }> {
	const result = await generatePdfFromTypst(generateContent, options);

	if (!result.success) {
		return { success: false, error: result.error };
	}

	// Create blob and trigger download
	const blob = new Blob([new Uint8Array(result.data)], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);

	URL.revokeObjectURL(url);

	return { success: true };
}
