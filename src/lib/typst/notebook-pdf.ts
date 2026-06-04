/**
 * Notebook PDF generation orchestrator.
 *
 * Wraps `generatePdfFromTypst` to handle two notebook-specific concerns:
 *  - extract inline base64 PNG outputs and map them to the Typst shadow FS
 *    BEFORE compilation (so the generator's `#image("/notebook/...")` refs
 *    resolve correctly)
 *  - return a "filename + bytes" tuple ready for browser download or
 *    server-side persistence
 *
 * External image URLs in markdown cells (`![alt](https://...)`) are handled
 * automatically by the underlying `generatePdfFromTypst` pipeline.
 *
 * @module typst/notebook-pdf
 */

import { generatePdfFromTypst, type PdfResult } from './pdf-generator';
import { getTypstService } from './service';
import {
	NotebookGenerator,
	extractInlineImages,
	type NotebookExportOptions
} from './generators/notebook-generator';
import type { PythonNotebook } from '$lib/types/notebook';

export interface GenerateNotebookPdfInput {
	notebook: PythonNotebook;
	options: NotebookExportOptions;
	/** Optional override of the cover-page author/student line. */
	authorName?: string;
}

/**
 * Generate a PDF from a notebook, with inline PNG images mapped via the
 * Typst shadow file system. Returns the same `PdfResult` shape as
 * `generatePdfFromTypst`.
 */
export async function generateNotebookPdf(input: GenerateNotebookPdfInput): Promise<PdfResult> {
	const generator = new NotebookGenerator();

	// Pre-extract inline PNGs and map them to the shadow FS. We do this
	// BEFORE `generatePdfFromTypst` runs so they persist through the
	// external-image fetch step and into the compile call. The final
	// `resetShadow()` inside `generatePdfFromTypst` cleans them up after.
	const inlineImages = extractInlineImages(input.notebook);
	if (inlineImages.size > 0) {
		const service = getTypstService();
		await service.initialize();
		service.mapShadowBatch(inlineImages);
	}

	return generatePdfFromTypst(() => {
		const result = generator.generate({
			notebook: input.notebook,
			options: input.options,
			authorName: input.authorName
		});
		return result.typstContent;
	});
}

/**
 * Build the download filename for a notebook PDF.
 * Pattern: `{title_sanitized}_{YYYY-MM-DD}.pdf`. Date format matches the
 * archive convention used elsewhere in the app (worksheet exports).
 */
export function buildNotebookPdfFilename(title: string, date: Date = new Date()): string {
	// NFD decomposition + strip combining diacriticals (U+0300–U+036F) so
	// "Démo" becomes "Demo" in the filename. Then squash everything that
	// isn't ASCII alphanumeric / dash / underscore.
	const safe =
		title
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-zA-Z0-9_-]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.slice(0, 80) || 'notebook';
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${safe}_${yyyy}-${mm}-${dd}.pdf`;
}

/**
 * Generate notebook PDF + trigger browser download in one call.
 * Convenience wrapper used by the toolbar button.
 */
export async function generateAndDownloadNotebookPdf(
	input: GenerateNotebookPdfInput
): Promise<{ success: boolean; error?: string; filename?: string }> {
	const result = await generateNotebookPdf(input);
	if (!result.success) {
		return { success: false, error: result.error };
	}

	const filename = buildNotebookPdfFilename(input.notebook.title);
	const blob = new Blob([new Uint8Array(result.data)], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);

	return { success: true, filename };
}
