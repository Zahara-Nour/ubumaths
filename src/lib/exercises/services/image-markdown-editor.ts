/**
 * Image Markdown Editor Utilities
 * ================================
 *
 * Utilities for finding and extracting image markdown at cursor position,
 * enabling editing of existing images in the markdown editor.
 *
 * @see src/lib/exercises/parser/markdown-parser.ts for image parsing
 * @see src/lib/components/exercises/ExerciseMarkdownEditor.svelte
 */

import type { ImageSizeClass, ImageAlignment } from '$lib/ubumark';

/**
 * Extracted image data from markdown syntax
 */
export interface ExtractedImage {
	/** Full markdown string: ![alt](url){attrs} */
	fullMatch: string;
	/** Start position in the text */
	start: number;
	/** End position in the text */
	end: number;
	/** Image URL */
	url: string;
	/** Alt text */
	alt: string;
	/** Optional title */
	title?: string;
	/** Size class (inline, small, medium, large, full) */
	sizeClass?: ImageSizeClass;
	/** Custom width percentage */
	widthPercent?: number;
	/** Alignment (left, center, right) */
	alignment?: ImageAlignment;
	/** Caption text */
	caption?: string;
}

/**
 * Regex for markdown images with optional attributes: ![alt](url "title"){attrs}
 *
 * Captures:
 * - Group 1: alt text
 * - Group 2: URL
 * - Group 3: title (optional)
 * - Group 4: attributes (optional)
 */
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?/g;

/**
 * Valid size class values
 */
const VALID_SIZE_CLASSES: ImageSizeClass[] = ['inline', 'small', 'medium', 'large', 'full'];

/**
 * Valid alignment values
 */
const VALID_ALIGNMENTS: ImageAlignment[] = ['left', 'center', 'right'];

/**
 * Find image markdown at or near cursor position
 *
 * Searches the text for image markdown and returns the one that
 * contains or is closest to the cursor position.
 *
 * @param text - Full markdown text
 * @param cursorPosition - Cursor position in the text
 * @returns ExtractedImage if found, null otherwise
 *
 * @example
 * ```typescript
 * const text = 'Some text ![alt](image.png){size=medium} more text';
 * const image = findImageAtCursor(text, 15);
 * // Returns { fullMatch: '![alt](image.png){size=medium}', start: 10, end: 40, ... }
 * ```
 */
export function findImageAtCursor(text: string, cursorPosition: number): ExtractedImage | null {
	// Reset regex
	IMAGE_REGEX.lastIndex = 0;

	let match: RegExpExecArray | null;
	let closestImage: ExtractedImage | null = null;
	let closestDistance = Infinity;

	while ((match = IMAGE_REGEX.exec(text)) !== null) {
		const start = match.index;
		const end = start + match[0].length;

		// Check if cursor is inside this image
		if (cursorPosition >= start && cursorPosition <= end) {
			return parseImageMatch(match, start, end);
		}

		// Track closest image for nearby cursor
		const distanceToStart = Math.abs(cursorPosition - start);
		const distanceToEnd = Math.abs(cursorPosition - end);
		const minDistance = Math.min(distanceToStart, distanceToEnd);

		// Only consider images within 5 characters of cursor
		if (minDistance < closestDistance && minDistance <= 5) {
			closestDistance = minDistance;
			closestImage = parseImageMatch(match, start, end);
		}
	}

	return closestImage;
}

/**
 * Find all images in the text
 *
 * @param text - Full markdown text
 * @returns Array of extracted images
 */
export function findAllImages(text: string): ExtractedImage[] {
	IMAGE_REGEX.lastIndex = 0;

	const images: ExtractedImage[] = [];
	let match: RegExpExecArray | null;

	while ((match = IMAGE_REGEX.exec(text)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		images.push(parseImageMatch(match, start, end));
	}

	return images;
}

/**
 * Parse a regex match into ExtractedImage
 */
function parseImageMatch(match: RegExpExecArray, start: number, end: number): ExtractedImage {
	const [fullMatch, alt, url, title, attributesStr] = match;

	const extracted: ExtractedImage = {
		fullMatch,
		start,
		end,
		url,
		alt: alt || ''
	};

	if (title) {
		extracted.title = title;
	}

	// Parse attributes if present
	if (attributesStr) {
		parseAttributes(attributesStr, extracted);
	}

	return extracted;
}

/**
 * Parse attribute string and populate extracted image
 */
function parseAttributes(attributesStr: string, extracted: ExtractedImage): void {
	// Parse size: size=medium or size="medium"
	const sizeMatch = attributesStr.match(/size=["']?(\w+)["']?/);
	if (sizeMatch && VALID_SIZE_CLASSES.includes(sizeMatch[1] as ImageSizeClass)) {
		extracted.sizeClass = sizeMatch[1] as ImageSizeClass;
	}

	// Parse width: width=50% or width=50
	const widthMatch = attributesStr.match(/width=["']?(\d+)%?["']?/);
	if (widthMatch) {
		const width = parseInt(widthMatch[1], 10);
		if (width >= 0 && width <= 100) {
			extracted.widthPercent = width;
		}
	}

	// Parse alignment: align=center or align="center"
	const alignMatch = attributesStr.match(/align=["']?(\w+)["']?/);
	if (alignMatch && VALID_ALIGNMENTS.includes(alignMatch[1] as ImageAlignment)) {
		extracted.alignment = alignMatch[1] as ImageAlignment;
	}

	// Parse caption: caption="text" or caption='text'
	const captionMatch = attributesStr.match(/caption=["']([^"']+)["']/);
	if (captionMatch) {
		extracted.caption = captionMatch[1];
	}
}

/**
 * Generate markdown string from image attributes
 *
 * @param url - Image URL
 * @param alt - Alt text
 * @param options - Optional attributes
 * @returns Markdown string
 *
 * @example
 * ```typescript
 * generateImageMarkdown('image.png', 'My image', { sizeClass: 'large', alignment: 'center' });
 * // Returns: '![My image](image.png){size=large align=center}'
 * ```
 */
export function generateImageMarkdown(
	url: string,
	alt: string,
	options?: {
		title?: string;
		sizeClass?: ImageSizeClass;
		widthPercent?: number;
		alignment?: ImageAlignment;
		caption?: string;
	}
): string {
	// Build base markdown
	let markdown = `![${alt}](${url}`;

	// Add title if present
	if (options?.title) {
		markdown += ` "${options.title}"`;
	}

	markdown += ')';

	// Build attributes
	const attrs: string[] = [];

	if (options?.widthPercent !== undefined) {
		attrs.push(`width=${options.widthPercent}%`);
	} else if (options?.sizeClass && options.sizeClass !== 'medium') {
		// Only add size if not default
		attrs.push(`size=${options.sizeClass}`);
	}

	if (options?.alignment && options.alignment !== 'center') {
		// Only add alignment if not default
		attrs.push(`align=${options.alignment}`);
	}

	if (options?.caption) {
		const escapedCaption = options.caption.replace(/"/g, '\\"');
		attrs.push(`caption="${escapedCaption}"`);
	}

	// Add attributes block if any
	if (attrs.length > 0) {
		markdown += `{${attrs.join(' ')}}`;
	}

	return markdown;
}

/**
 * Replace image markdown in text
 *
 * @param text - Full markdown text
 * @param oldImage - Image to replace (with start/end positions)
 * @param newMarkdown - New markdown string
 * @returns Updated text
 */
export function replaceImageMarkdown(
	text: string,
	oldImage: ExtractedImage,
	newMarkdown: string
): string {
	return text.substring(0, oldImage.start) + newMarkdown + text.substring(oldImage.end);
}
