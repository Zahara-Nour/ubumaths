/**
 * Content Field Helpers
 * =====================
 *
 * Utility functions for handling ContentField[] arrays.
 * Converts content fields to strings compatible with MathDisplay component.
 */

import type { ContentField } from '$lib/questions/types';

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Convert ContentField[] to string for MathDisplay
 *
 * Concatenates text fields and represents images as placeholders.
 * The output string can contain $$...$$ LaTeX expressions.
 *
 * @param fields - Array of content fields
 * @param options - Rendering options
 * @returns String compatible with MathDisplay component
 *
 * @example
 * const fields = [
 *   { type: 'text', content: 'Résoudre $$x^2 + 3$$' },
 *   { type: 'image', content: 'https://...', alt: 'Graphique' }
 * ];
 * const text = renderContentFields(fields);
 * // => "Résoudre $$x^2 + 3$$ [Image: Graphique]"
 */
export function renderContentFields(fields: ContentField[], options: RenderOptions = {}): string {
	const {
		imageRenderer = 'placeholder',
		separator = ' ',
		truncate = false,
		maxLength = 200
	} = options;

	// Convert each field to string
	const parts = fields.map((field) => {
		if (field.type === 'text') {
			return field.content;
		} else if (field.type === 'image') {
			switch (imageRenderer) {
				case 'placeholder':
					return `[Image${field.alt ? `: ${field.alt}` : ''}]`;
				case 'url':
					return `[Image: ${field.content}]`;
				case 'hidden':
					return '';
				default:
					return `[Image]`;
			}
		}
		return '';
	});

	// Join with separator
	let result = parts.filter(Boolean).join(separator);

	// Truncate if needed
	if (truncate && result.length > maxLength) {
		result = result.substring(0, maxLength) + '...';
	}

	return result;
}

/**
 * Extract plain text from ContentField[] (no LaTeX, no images)
 *
 * Useful for previews, SEO, or accessibility.
 *
 * @param fields - Array of content fields
 * @returns Plain text without LaTeX or images
 *
 * @example
 * const fields = [{ type: 'text', content: 'Résoudre $$x^2 + 3$$' }];
 * const plain = extractPlainText(fields);
 * // => "Résoudre x^2 + 3"
 */
export function extractPlainText(fields: ContentField[]): string {
	return fields
		.map((field) => {
			if (field.type === 'text') {
				// Remove LaTeX delimiters $$...$$
				return field.content.replace(/\$\$([^$]+)\$\$/g, '$1');
			}
			return '';
		})
		.filter(Boolean)
		.join(' ');
}

/**
 * Count characters in ContentField[] (excluding images)
 *
 * @param fields - Array of content fields
 * @returns Total character count
 */
export function countContentLength(fields: ContentField[]): number {
	return fields
		.filter((field) => field.type === 'text')
		.reduce((sum, field) => sum + field.content.length, 0);
}

/**
 * Check if ContentField[] contains images
 *
 * @param fields - Array of content fields
 * @returns True if at least one image is present
 */
export function hasImages(fields: ContentField[]): boolean {
	return fields.some((field) => field.type === 'image');
}

/**
 * Get all images from ContentField[]
 *
 * @param fields - Array of content fields
 * @returns Array of image fields
 */
export function extractImages(
	fields: ContentField[]
): Array<{ type: 'image'; content: string; alt?: string }> {
	return fields.filter((field) => field.type === 'image') as Array<{
		type: 'image';
		content: string;
		alt?: string;
	}>;
}

/**
 * Truncate ContentField[] to a maximum character length
 *
 * Preserves complete fields (doesn't split in the middle).
 *
 * @param fields - Array of content fields
 * @param maxLength - Maximum total character length
 * @returns Truncated array of fields
 */
export function truncateContentFields(fields: ContentField[], maxLength: number): ContentField[] {
	const result: ContentField[] = [];
	let currentLength = 0;

	for (const field of fields) {
		if (field.type === 'text') {
			const fieldLength = field.content.length;

			if (currentLength + fieldLength <= maxLength) {
				// Add entire field
				result.push(field);
				currentLength += fieldLength;
			} else if (currentLength < maxLength) {
				// Add truncated field
				const remaining = maxLength - currentLength;
				result.push({
					type: 'text',
					content: field.content.substring(0, remaining) + '...'
				});
				break;
			} else {
				// Already exceeded max length
				break;
			}
		} else if (field.type === 'image') {
			// Images don't count towards length, but add them
			result.push(field);
		}
	}

	return result;
}

// ============================================================================
// TYPES
// ============================================================================

export interface RenderOptions {
	/**
	 * How to render images in the output string
	 * - 'placeholder': [Image] or [Image: alt text]
	 * - 'url': [Image: https://...]
	 * - 'hidden': Don't show images in output
	 */
	imageRenderer?: 'placeholder' | 'url' | 'hidden';

	/**
	 * Separator between fields (default: single space)
	 */
	separator?: string;

	/**
	 * Whether to truncate the output
	 */
	truncate?: boolean;

	/**
	 * Maximum length for truncation (default: 200)
	 */
	maxLength?: number;
}
