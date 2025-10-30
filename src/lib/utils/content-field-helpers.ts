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
