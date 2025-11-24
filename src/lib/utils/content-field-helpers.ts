/**
 * Content Field Helpers
 * =====================
 *
 * Utility functions for handling ContentField[] arrays.
 */

import type { ContentField } from '$lib/questions/types';

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

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
