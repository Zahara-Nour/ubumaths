/**
 * Image URL Mapping Loader
 * ========================
 *
 * Loads and provides the image URL mapping from old paths to new Supabase Storage URLs.
 * The mapping file was generated during the image migration process.
 *
 * @module migration/image-url-mapping
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ImageUrlMapping } from './question-transformer';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAPPING_FILE_PATH = join(process.cwd(), 'scripts', 'image-url-mapping.json');

// ============================================================================
// CACHE
// ============================================================================

/**
 * Cached mapping to avoid reloading the file on every request
 */
let cachedMapping: ImageUrlMapping | null = null;

// ============================================================================
// LOADER
// ============================================================================

/**
 * Load the image URL mapping from the JSON file.
 *
 * The mapping is cached after first load to improve performance.
 * Call `clearImageUrlMappingCache()` to force reload.
 *
 * @returns The image URL mapping object
 * @throws Error if the file cannot be loaded or parsed
 */
export async function loadImageUrlMapping(): Promise<ImageUrlMapping> {
	if (cachedMapping) {
		return cachedMapping;
	}

	try {
		const content = await readFile(MAPPING_FILE_PATH, 'utf-8');
		cachedMapping = JSON.parse(content) as ImageUrlMapping;
		return cachedMapping;
	} catch (err) {
		// If file doesn't exist, return empty mapping
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			console.warn(`Image URL mapping file not found at ${MAPPING_FILE_PATH}, using empty mapping`);
			cachedMapping = {};
			return cachedMapping;
		}

		throw new Error(
			`Failed to load image URL mapping: ${err instanceof Error ? err.message : String(err)}`
		);
	}
}

/**
 * Clear the cached mapping to force reload on next call
 */
export function clearImageUrlMappingCache(): void {
	cachedMapping = null;
}

/**
 * Get statistics about the image mapping
 */
export async function getImageMappingStats(): Promise<{
	totalMappings: number;
	uniqueImages: number;
	pathFormats: number;
}> {
	const mapping = await loadImageUrlMapping();
	const values = Object.values(mapping);
	const uniqueUrls = new Set(values);

	return {
		totalMappings: Object.keys(mapping).length,
		uniqueImages: uniqueUrls.size,
		pathFormats: Math.round(Object.keys(mapping).length / uniqueUrls.size)
	};
}
