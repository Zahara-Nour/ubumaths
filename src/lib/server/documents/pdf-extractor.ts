/**
 * PDF Text Extraction Service
 *
 * Extracts text content from PDF files for RAG indexing.
 * Uses pdf-parse for extraction (server-side only).
 */

// Dynamic import to avoid issues with SSR
type PdfParseFunction = (
	buffer: Buffer,
	options?: { max?: number }
) => Promise<{
	text: string;
	numpages: number;
	info: {
		Title?: string;
		Author?: string;
		Subject?: string;
		Keywords?: string;
		CreationDate?: string;
	};
}>;

let pdfParse: PdfParseFunction | null = null;

async function getPdfParse(): Promise<PdfParseFunction> {
	if (!pdfParse) {
		const pdfModule = (await import('pdf-parse')) as unknown as
			| { default: PdfParseFunction }
			| PdfParseFunction;
		// pdf-parse exports the function directly in ESM or as default
		pdfParse =
			'default' in pdfModule
				? (pdfModule.default as PdfParseFunction)
				: (pdfModule as PdfParseFunction);
	}
	return pdfParse;
}

export interface PdfExtractionResult {
	success: boolean;
	text?: string;
	pageCount?: number;
	metadata?: {
		title?: string;
		author?: string;
		subject?: string;
		keywords?: string;
		creationDate?: Date;
	};
	error?: string;
}

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
	try {
		const parse = await getPdfParse();
		const data = await parse(buffer, {
			// Limit pages to avoid memory issues with large PDFs
			max: 100
		});

		if (!data.text || data.text.trim().length === 0) {
			return {
				success: false,
				error: 'No text content found in PDF (might be scanned/image-based)'
			};
		}

		// Clean up extracted text
		const cleanedText = cleanPdfText(data.text);

		return {
			success: true,
			text: cleanedText,
			pageCount: data.numpages,
			metadata: {
				title: data.info?.Title,
				author: data.info?.Author,
				subject: data.info?.Subject,
				keywords: data.info?.Keywords,
				creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined
			}
		};
	} catch (error) {
		console.error('PDF extraction failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to extract PDF text'
		};
	}
}

/**
 * Clean up PDF extracted text
 */
function cleanPdfText(text: string): string {
	return (
		text
			// Remove excessive whitespace
			.replace(/\s+/g, ' ')
			// Remove page break markers
			.replace(/\f/g, '\n\n')
			// Remove hyphenation at line breaks
			.replace(/-\s*\n\s*/g, '')
			// Normalize line breaks
			.replace(/\n{3,}/g, '\n\n')
			// Trim
			.trim()
	);
}

/**
 * Extract text from a markdown file
 */
export function extractTextFromMarkdown(content: string): string {
	// Remove frontmatter
	let text = content.replace(/^---[\s\S]*?---\n*/m, '');

	// Keep headings as-is (useful for context)
	// Remove code blocks but keep content description
	text = text.replace(/```[\s\S]*?```/g, '[code block]');

	// Remove inline code
	text = text.replace(/`[^`]+`/g, (match) => match.slice(1, -1));

	// Remove links but keep text
	text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

	// Remove images
	text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

	// Remove HTML tags
	text = text.replace(/<[^>]+>/g, '');

	// Remove emphasis markers
	text = text.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');

	// Normalize whitespace
	text = text.replace(/\s+/g, ' ').trim();

	return text;
}

/**
 * Extract text from plain text file
 */
export function extractTextFromPlainText(content: string): string {
	return content.replace(/\s+/g, ' ').trim();
}

/**
 * Detect file type from buffer
 */
export function detectFileType(buffer: Buffer): 'pdf' | 'text' | 'markdown' | 'unknown' {
	// Check for PDF magic bytes
	if (buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF') {
		return 'pdf';
	}

	// Try to decode as text
	try {
		const text = buffer.toString('utf-8');

		// Check for markdown indicators
		if (text.match(/^#\s|^\*\*|^-\s\[|```/m)) {
			return 'markdown';
		}

		// Assume plain text if valid UTF-8
		return 'text';
	} catch {
		return 'unknown';
	}
}

/**
 * Extract text from any supported file type
 */
export async function extractText(buffer: Buffer, mimeType?: string): Promise<PdfExtractionResult> {
	// Determine file type
	let fileType: 'pdf' | 'text' | 'markdown' | 'unknown';

	if (mimeType) {
		if (mimeType === 'application/pdf') {
			fileType = 'pdf';
		} else if (mimeType === 'text/markdown' || mimeType.endsWith('.md')) {
			fileType = 'markdown';
		} else if (mimeType.startsWith('text/')) {
			fileType = 'text';
		} else {
			fileType = detectFileType(buffer);
		}
	} else {
		fileType = detectFileType(buffer);
	}

	switch (fileType) {
		case 'pdf':
			return extractTextFromPdf(buffer);

		case 'markdown': {
			const mdText = extractTextFromMarkdown(buffer.toString('utf-8'));
			return {
				success: true,
				text: mdText,
				pageCount: 1
			};
		}

		case 'text': {
			const plainText = extractTextFromPlainText(buffer.toString('utf-8'));
			return {
				success: true,
				text: plainText,
				pageCount: 1
			};
		}

		default:
			return {
				success: false,
				error: 'Unsupported file type'
			};
	}
}
