/**
 * Image Loader for Typst WASM Compilation
 * ========================================
 *
 * Utilities for fetching external images and preparing them for
 * Typst WASM compilation. The Typst WASM compiler cannot access
 * external URLs directly due to browser sandboxing, so images must
 * be fetched beforehand and mapped to the virtual file system.
 *
 * @module typst/image-loader
 *
 * @example Basic usage
 * ```typescript
 * const urls = ['https://example.com/image1.png', 'https://example.com/image2.jpg'];
 * const images = await fetchExternalImages(urls);
 *
 * // Map to Typst virtual file system
 * for (const [url, data] of images) {
 *   const virtualPath = urlToVirtualPath(url);
 *   typst.mapShadow(virtualPath, data);
 * }
 * ```
 */

import { createLogger } from '$lib/utils/logger';

const logger = createLogger('typst-image-loader');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of fetching an image
 */
export interface ImageFetchResult {
	/** Original URL */
	url: string;

	/** Virtual path for Typst */
	virtualPath: string;

	/** Image data as Uint8Array (null if failed) */
	data: Uint8Array | null;

	/** Error message if failed */
	error?: string;
}

/**
 * Map of URL to image data
 */
export type ImageDataMap = Map<string, Uint8Array>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Virtual directory for external images in Typst
 */
const VIRTUAL_IMAGE_DIR = '/virtual/images';

/**
 * Supported image extensions
 */
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

// ============================================================================
// URL UTILITIES
// ============================================================================

/**
 * Check if a URL is an external HTTP/HTTPS URL
 *
 * @param url - URL to check
 * @returns True if external URL
 */
export function isExternalUrl(url: string): boolean {
	return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Convert an external URL to a virtual path for Typst
 *
 * Creates a deterministic virtual path based on the URL hash to ensure
 * the same URL always maps to the same virtual path.
 *
 * @param url - External URL
 * @returns Virtual path like '/virtual/images/abc123.png'
 *
 * @example
 * ```typescript
 * urlToVirtualPath('https://example.com/photos/cat.png');
 * // Returns: '/virtual/images/a1b2c3d4.png'
 * ```
 */
export function urlToVirtualPath(url: string): string {
	// Extract file extension from URL
	const urlObj = new URL(url);
	const pathname = urlObj.pathname;
	const extension = getFileExtension(pathname) || '.png';

	// Create a simple hash from the URL
	const hash = simpleHash(url);

	return `${VIRTUAL_IMAGE_DIR}/${hash}${extension}`;
}

/**
 * Extract file extension from a path
 *
 * @param path - File path or URL pathname
 * @returns Extension including dot (e.g., '.png') or null
 */
function getFileExtension(path: string): string | null {
	const lastDot = path.lastIndexOf('.');
	if (lastDot === -1) return null;

	const ext = path.slice(lastDot).toLowerCase();

	// Remove query string if present
	const queryIndex = ext.indexOf('?');
	const cleanExt = queryIndex > -1 ? ext.slice(0, queryIndex) : ext;

	return SUPPORTED_EXTENSIONS.includes(cleanExt) ? cleanExt : null;
}

/**
 * Simple string hash function
 *
 * Creates a deterministic hash from a string for use in file names.
 * Not cryptographically secure, just for creating unique identifiers.
 *
 * @param str - String to hash
 * @returns 8-character hex hash
 */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	// Convert to positive hex string
	return Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
}

// ============================================================================
// IMAGE FETCHING
// ============================================================================

/**
 * Fetch a single image as Uint8Array
 *
 * @param url - Image URL to fetch
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns Image data or throws on error
 */
export async function fetchImageAsBytes(url: string, timeout = 10000): Promise<Uint8Array> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			mode: 'cors',
			credentials: 'omit'
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		return new Uint8Array(arrayBuffer);
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Fetch multiple images in parallel
 *
 * Attempts to fetch all images, returning a map of successful fetches.
 * Failed fetches are logged but don't cause the entire operation to fail.
 *
 * @param urls - Array of image URLs to fetch
 * @param options - Fetch options
 * @returns Map of URL to image data (only successful fetches)
 *
 * @example
 * ```typescript
 * const urls = ['https://cdn.example.com/a.png', 'https://cdn.example.com/b.jpg'];
 * const images = await fetchExternalImages(urls);
 *
 * console.log(`Fetched ${images.size} of ${urls.length} images`);
 * ```
 */
export async function fetchExternalImages(
	urls: string[],
	options: { timeout?: number; concurrency?: number } = {}
): Promise<ImageDataMap> {
	const { timeout = 10000, concurrency = 4 } = options;
	const results = new Map<string, Uint8Array>();

	if (urls.length === 0) {
		return results;
	}

	logger.info('Fetching external images', { count: urls.length });

	// Process in batches to limit concurrency
	const batches: string[][] = [];
	for (let i = 0; i < urls.length; i += concurrency) {
		batches.push(urls.slice(i, i + concurrency));
	}

	for (const batch of batches) {
		const promises = batch.map(async (url) => {
			try {
				const data = await fetchImageAsBytes(url, timeout);
				results.set(url, data);
				logger.info('Image fetched successfully', {
					url: url.slice(0, 80),
					size: data.length
				});
			} catch (error) {
				logger.warn('Failed to fetch image', {
					url: url.slice(0, 80),
					error: error instanceof Error ? error.message : String(error)
				});
			}
		});

		await Promise.all(promises);
	}

	logger.info('Image fetching complete', {
		requested: urls.length,
		successful: results.size,
		failed: urls.length - results.size
	});

	return results;
}

/**
 * Fetch images and return results with virtual paths
 *
 * This is a higher-level function that returns detailed results
 * including virtual paths for each image.
 *
 * @param urls - Array of image URLs
 * @param options - Fetch options
 * @returns Array of fetch results with virtual paths
 */
export async function fetchImagesWithPaths(
	urls: string[],
	options: { timeout?: number } = {}
): Promise<ImageFetchResult[]> {
	const results: ImageFetchResult[] = [];

	const imageMap = await fetchExternalImages(urls, options);

	for (const url of urls) {
		const data = imageMap.get(url);
		results.push({
			url,
			virtualPath: urlToVirtualPath(url),
			data: data || null,
			error: data ? undefined : 'Failed to fetch image'
		});
	}

	return results;
}

// ============================================================================
// TYPST INTEGRATION
// ============================================================================

/**
 * Map fetched images to Typst virtual file system
 *
 * @param typst - Typst compiler instance
 * @param images - Map of URL to image data
 * @returns Map of URL to virtual path
 *
 * @example
 * ```typescript
 * const images = await fetchExternalImages(urls);
 * const pathMap = mapImagesToTypst(typst, images);
 *
 * // pathMap now contains URL -> virtual path mappings
 * // Use these paths in your Typst content
 * ```
 */
export function mapImagesToTypst(
	typst: { mapShadow: (path: string, content: Uint8Array) => void },
	images: ImageDataMap
): Map<string, string> {
	const pathMap = new Map<string, string>();

	for (const [url, data] of images) {
		const virtualPath = urlToVirtualPath(url);
		typst.mapShadow(virtualPath, data);
		pathMap.set(url, virtualPath);
		logger.info('Mapped image to virtual path', {
			url: url.slice(0, 60),
			virtualPath,
			size: data.length
		});
	}

	return pathMap;
}

/**
 * Extract all external image URLs from Typst content
 *
 * Parses the Typst content to find all #image() calls with external URLs.
 *
 * @param typstContent - Typst source code
 * @returns Array of external URLs found
 */
export function extractExternalImageUrls(typstContent: string): string[] {
	const urls: string[] = [];

	// Match #image("url") patterns with http/https URLs
	const imageRegex = /#image\s*\(\s*"(https?:\/\/[^"]+)"/g;
	let match;

	while ((match = imageRegex.exec(typstContent)) !== null) {
		urls.push(match[1]);
	}

	// Also check for image() in figure()
	const figureImageRegex = /image\s*\(\s*"(https?:\/\/[^"]+)"/g;
	while ((match = figureImageRegex.exec(typstContent)) !== null) {
		if (!urls.includes(match[1])) {
			urls.push(match[1]);
		}
	}

	return urls;
}
