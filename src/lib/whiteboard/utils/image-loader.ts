/**
 * Image Loading Utilities
 *
 * Handles image file validation, loading, compression, and conversion to data URLs.
 *
 * @module whiteboard/utils/image-loader
 */

import type { ImageElement, Point } from '../types/document';

// =============================================================================
// Constants
// =============================================================================

/** Maximum image file size in bytes (5MB) */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Supported image MIME types */
export const SUPPORTED_IMAGE_TYPES = [
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/svg+xml',
	'image/webp'
] as const;

/** Minimum dimensions for images */
export const MIN_IMAGE_WIDTH = 50;
export const MIN_IMAGE_HEIGHT = 50;

/** Default dimensions for new images if not determinable */
export const DEFAULT_IMAGE_WIDTH = 400;
export const DEFAULT_IMAGE_HEIGHT = 300;

/** Maximum dimension (width or height) for imported images */
export const MAX_IMAGE_DIMENSION = 2000;

/** JPEG compression quality (0-1) for bitmap images */
export const JPEG_QUALITY = 0.8;

// =============================================================================
// Types
// =============================================================================

export interface ImageValidationResult {
	valid: boolean;
	error?: string;
}

export interface ImageLoadResult {
	success: boolean;
	dataUrl?: string;
	width?: number;
	height?: number;
	error?: string;
}

export interface ImageImportResult {
	success: boolean;
	element?: ImageElement;
	error?: string;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate an image file before import
 */
export function validateImageFile(file: File): ImageValidationResult {
	// Check file type
	if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
		return {
			valid: false,
			error: `Type de fichier non supporté: ${file.type}. Types acceptés: PNG, JPG, SVG, WebP`
		};
	}

	// Check file size
	if (file.size > MAX_IMAGE_SIZE) {
		const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
		return {
			valid: false,
			error: `Fichier trop volumineux (${sizeMB}MB). Maximum: 5MB`
		};
	}

	return { valid: true };
}

/**
 * Get file extension from filename (lowercase)
 */
export function getFileExtension(filename: string): string {
	const parts = filename.split('.');
	return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// =============================================================================
// Loading Functions
// =============================================================================

/**
 * Load an image file and get its dimensions
 */
export function loadImageFile(file: File): Promise<ImageLoadResult> {
	return new Promise((resolve) => {
		const validation = validateImageFile(file);
		if (!validation.valid) {
			resolve({ success: false, error: validation.error });
			return;
		}

		const reader = new FileReader();

		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			if (!dataUrl) {
				resolve({ success: false, error: 'Erreur lors de la lecture du fichier' });
				return;
			}

			// For SVG, we can use it directly without dimension check
			if (file.type === 'image/svg+xml') {
				// Try to get SVG dimensions
				getSvgDimensions(dataUrl)
					.then(({ width, height }) => {
						resolve({
							success: true,
							dataUrl,
							width: width || DEFAULT_IMAGE_WIDTH,
							height: height || DEFAULT_IMAGE_HEIGHT
						});
					})
					.catch(() => {
						resolve({
							success: true,
							dataUrl,
							width: DEFAULT_IMAGE_WIDTH,
							height: DEFAULT_IMAGE_HEIGHT
						});
					});
				return;
			}

			// For bitmap images, load to get dimensions and optionally compress
			const img = new Image();
			img.onload = () => {
				const { width, height, needsResize } = calculateImageDimensions(
					img.naturalWidth,
					img.naturalHeight
				);

				// Compress/resize if needed
				if (needsResize || file.type === 'image/png') {
					compressImage(img, width, height)
						.then((compressedDataUrl) => {
							resolve({
								success: true,
								dataUrl: compressedDataUrl,
								width,
								height
							});
						})
						.catch(() => {
							// Fall back to original
							resolve({
								success: true,
								dataUrl,
								width,
								height
							});
						});
				} else {
					resolve({
						success: true,
						dataUrl,
						width,
						height
					});
				}
			};

			img.onerror = () => {
				resolve({ success: false, error: 'Image invalide ou corrompue' });
			};

			img.src = dataUrl;
		};

		reader.onerror = () => {
			resolve({ success: false, error: 'Erreur lors de la lecture du fichier' });
		};

		reader.readAsDataURL(file);
	});
}

/**
 * Calculate final image dimensions, respecting max dimension
 */
export function calculateImageDimensions(
	originalWidth: number,
	originalHeight: number
): { width: number; height: number; needsResize: boolean } {
	const maxDim = MAX_IMAGE_DIMENSION;

	if (originalWidth <= maxDim && originalHeight <= maxDim) {
		return {
			width: originalWidth,
			height: originalHeight,
			needsResize: false
		};
	}

	const aspectRatio = originalWidth / originalHeight;
	let width: number;
	let height: number;

	if (originalWidth > originalHeight) {
		width = maxDim;
		height = Math.round(maxDim / aspectRatio);
	} else {
		height = maxDim;
		width = Math.round(maxDim * aspectRatio);
	}

	return { width, height, needsResize: true };
}

/**
 * Compress an image to JPEG with specified dimensions
 */
export function compressImage(
	img: HTMLImageElement,
	width: number,
	height: number
): Promise<string> {
	const canvas = document.createElement('canvas');

	return new Promise((resolve, reject) => {
		try {
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Canvas context not available'));
				return;
			}

			// Draw with white background (for transparency)
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.drawImage(img, 0, 0, width, height);

			const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
			resolve(dataUrl);
		} catch (error) {
			reject(error);
		} finally {
			// Explicitly clear canvas to help GC
			canvas.width = 0;
			canvas.height = 0;
		}
	});
}

/**
 * Get dimensions from SVG data URL
 */
function getSvgDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		try {
			// Validate data URL format
			if (!dataUrl.startsWith('data:image/svg+xml')) {
				reject(new Error('Invalid SVG data URL format'));
				return;
			}

			// Decode base64
			const parts = dataUrl.split(',');
			if (parts.length < 2) {
				reject(new Error('Missing base64 data in SVG data URL'));
				return;
			}

			const base64 = parts[1];
			if (!base64) {
				reject(new Error('Empty base64 data'));
				return;
			}

			const svgText = atob(base64);

			// Parse SVG
			const parser = new DOMParser();
			const doc = parser.parseFromString(svgText, 'image/svg+xml');
			const svg = doc.querySelector('svg');

			if (!svg) {
				reject(new Error('Invalid SVG'));
				return;
			}

			// Try to get dimensions from attributes
			const width = parseFloat(svg.getAttribute('width') || '0');
			const height = parseFloat(svg.getAttribute('height') || '0');

			if (width > 0 && height > 0) {
				resolve({ width, height });
				return;
			}

			// Try viewBox
			const viewBox = svg.getAttribute('viewBox');
			if (viewBox) {
				const viewBoxParts = viewBox.split(/\s+/).map(parseFloat);
				if (
					viewBoxParts.length >= 4 &&
					!isNaN(viewBoxParts[2]) &&
					!isNaN(viewBoxParts[3]) &&
					viewBoxParts[2] > 0 &&
					viewBoxParts[3] > 0
				) {
					resolve({ width: viewBoxParts[2], height: viewBoxParts[3] });
					return;
				}
			}

			reject(new Error('Could not determine SVG dimensions'));
		} catch (error) {
			reject(error);
		}
	});
}

// =============================================================================
// Element Creation
// =============================================================================

/**
 * Create an image element from loaded image data
 */
export function createImageElement(
	position: Point,
	width: number,
	height: number,
	src: string,
	originalFilename?: string
): ImageElement {
	return {
		id: crypto.randomUUID(),
		type: 'image',
		position,
		width: Math.max(width, MIN_IMAGE_WIDTH),
		height: Math.max(height, MIN_IMAGE_HEIGHT),
		src,
		originalFilename
	};
}

/**
 * Import an image file and create an element
 */
export async function importImageFile(file: File, position: Point): Promise<ImageImportResult> {
	const loadResult = await loadImageFile(file);

	if (!loadResult.success || !loadResult.dataUrl) {
		return {
			success: false,
			error: loadResult.error || "Erreur lors du chargement de l'image"
		};
	}

	const element = createImageElement(
		position,
		loadResult.width || DEFAULT_IMAGE_WIDTH,
		loadResult.height || DEFAULT_IMAGE_HEIGHT,
		loadResult.dataUrl,
		file.name
	);

	return { success: true, element };
}

// =============================================================================
// Element Manipulation
// =============================================================================

/**
 * Move an image element to a new position
 */
export function moveImageElement(element: ImageElement, newPosition: Point): ImageElement {
	return {
		...element,
		position: newPosition
	};
}

/**
 * Resize an image element
 */
export function resizeImageElement(
	element: ImageElement,
	newWidth: number,
	newHeight: number
): ImageElement {
	return {
		...element,
		width: Math.max(newWidth, MIN_IMAGE_WIDTH),
		height: Math.max(newHeight, MIN_IMAGE_HEIGHT)
	};
}

/**
 * Check if a point is inside an image element
 */
export function isPointInImage(point: Point, image: ImageElement): boolean {
	return (
		point.x >= image.position.x &&
		point.x <= image.position.x + image.width &&
		point.y >= image.position.y &&
		point.y <= image.position.y + image.height
	);
}

/**
 * Calculate dimensions maintaining aspect ratio to fit within bounds
 */
export function calculateFitDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number,
	maxHeight: number
): { width: number; height: number } {
	const aspectRatio = originalWidth / originalHeight;

	let width = originalWidth;
	let height = originalHeight;

	if (width > maxWidth) {
		width = maxWidth;
		height = width / aspectRatio;
	}

	if (height > maxHeight) {
		height = maxHeight;
		width = height * aspectRatio;
	}

	return {
		width: Math.round(width),
		height: Math.round(height)
	};
}
