/**
 * Image Dimension Extraction Service
 * ====================================
 *
 * Extracts width, height, and aspect ratio from image files
 * without requiring external libraries like sharp.
 *
 * SUPPORTED FORMATS:
 * - PNG: Reads IHDR chunk
 * - JPEG: Reads SOF0/SOF2 markers
 * - GIF: Reads logical screen descriptor
 * - WebP: Reads VP8/VP8L/VP8X chunks
 * - SVG: Parses viewBox or width/height attributes
 *
 * @module exercises/services/image-dimension-extractor
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of dimension extraction
 */
export interface ExtractedDimensions {
	/** Image width in pixels */
	width: number;
	/** Image height in pixels */
	height: number;
	/** Aspect ratio (width / height) */
	aspectRatio: number;
}

/**
 * Result of dimension extraction operation
 */
export interface DimensionExtractionResult {
	success: boolean;
	dimensions?: ExtractedDimensions;
	error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DIMENSION = 10000;

// ============================================================================
// PNG DIMENSION EXTRACTION
// ============================================================================

/**
 * Extract dimensions from PNG file
 * PNG stores dimensions in the IHDR chunk (bytes 16-23)
 *
 * @param buffer - File buffer
 * @returns Dimensions or null if invalid
 */
function extractPngDimensions(buffer: Uint8Array): ExtractedDimensions | null {
	// PNG signature: 89 50 4E 47 0D 0A 1A 0A
	// IHDR chunk starts at byte 8, dimensions at bytes 16-23
	if (buffer.length < 24) {
		return null;
	}

	// Verify PNG signature
	const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (!pngSignature.every((byte, i) => buffer[i] === byte)) {
		return null;
	}

	// Read width and height from IHDR chunk (big-endian)
	const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
	const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];

	if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
		return null;
	}

	return {
		width,
		height,
		aspectRatio: Number((width / height).toFixed(6))
	};
}

// ============================================================================
// JPEG DIMENSION EXTRACTION
// ============================================================================

/**
 * Extract dimensions from JPEG file
 * JPEG stores dimensions in SOF (Start of Frame) markers
 *
 * @param buffer - File buffer
 * @returns Dimensions or null if invalid
 */
function extractJpegDimensions(buffer: Uint8Array): ExtractedDimensions | null {
	// JPEG starts with FF D8
	if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
		return null;
	}

	let offset = 2;

	// Search for SOF markers (FF C0 - FF CF, except C4, C8, CC)
	while (offset < buffer.length - 9) {
		if (buffer[offset] !== 0xff) {
			offset++;
			continue;
		}

		const marker = buffer[offset + 1];

		// Skip any padding FF bytes
		if (marker === 0xff) {
			offset++;
			continue;
		}

		// SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
		const isSOF =
			(marker >= 0xc0 && marker <= 0xc3) ||
			(marker >= 0xc5 && marker <= 0xc7) ||
			(marker >= 0xc9 && marker <= 0xcb) ||
			(marker >= 0xcd && marker <= 0xcf);

		if (isSOF) {
			// SOF structure: marker(2) + length(2) + precision(1) + height(2) + width(2)
			if (offset + 9 > buffer.length) {
				return null;
			}

			const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
			const width = (buffer[offset + 7] << 8) | buffer[offset + 8];

			if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
				return null;
			}

			return {
				width,
				height,
				aspectRatio: Number((width / height).toFixed(6))
			};
		}

		// Skip to next marker
		if (marker === 0xd9 || marker === 0x00) {
			// End of image or escaped FF
			offset += 2;
		} else if (marker >= 0xd0 && marker <= 0xd8) {
			// Restart markers (no length)
			offset += 2;
		} else {
			// Read segment length and skip
			const segmentLength = (buffer[offset + 2] << 8) | buffer[offset + 3];
			offset += 2 + segmentLength;
		}
	}

	return null;
}

// ============================================================================
// GIF DIMENSION EXTRACTION
// ============================================================================

/**
 * Extract dimensions from GIF file
 * GIF stores dimensions in the logical screen descriptor
 *
 * @param buffer - File buffer
 * @returns Dimensions or null if invalid
 */
function extractGifDimensions(buffer: Uint8Array): ExtractedDimensions | null {
	// GIF87a or GIF89a signature
	if (buffer.length < 10) {
		return null;
	}

	const signature = String.fromCharCode(...buffer.slice(0, 6));
	if (signature !== 'GIF87a' && signature !== 'GIF89a') {
		return null;
	}

	// Logical screen descriptor: width (2 bytes LE) + height (2 bytes LE)
	const width = buffer[6] | (buffer[7] << 8);
	const height = buffer[8] | (buffer[9] << 8);

	if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
		return null;
	}

	return {
		width,
		height,
		aspectRatio: Number((width / height).toFixed(6))
	};
}

// ============================================================================
// WEBP DIMENSION EXTRACTION
// ============================================================================

/**
 * Extract dimensions from WebP file
 * WebP has three formats: VP8 (lossy), VP8L (lossless), VP8X (extended)
 *
 * @param buffer - File buffer
 * @returns Dimensions or null if invalid
 */
function extractWebpDimensions(buffer: Uint8Array): ExtractedDimensions | null {
	// RIFF....WEBP
	if (buffer.length < 30) {
		return null;
	}

	const riff = String.fromCharCode(...buffer.slice(0, 4));
	const webp = String.fromCharCode(...buffer.slice(8, 12));

	if (riff !== 'RIFF' || webp !== 'WEBP') {
		return null;
	}

	const chunk = String.fromCharCode(...buffer.slice(12, 16));

	if (chunk === 'VP8 ') {
		// Lossy WebP
		// Frame tag starts at byte 23 (after chunk header)
		if (buffer.length < 30) return null;

		// Skip to frame header (10 bytes into VP8 chunk data)
		// Width at bytes 26-27 (14-bit), Height at bytes 28-29 (14-bit)
		const width = (buffer[26] | (buffer[27] << 8)) & 0x3fff;
		const height = (buffer[28] | (buffer[29] << 8)) & 0x3fff;

		if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
			return null;
		}

		return {
			width,
			height,
			aspectRatio: Number((width / height).toFixed(6))
		};
	} else if (chunk === 'VP8L') {
		// Lossless WebP
		if (buffer.length < 25) return null;

		// Signature byte at 20 (should be 0x2f)
		if (buffer[20] !== 0x2f) return null;

		// Width and height are stored as 14-bit values in bytes 21-24
		const bits = buffer[21] | (buffer[22] << 8) | (buffer[23] << 16) | (buffer[24] << 24);
		const width = (bits & 0x3fff) + 1;
		const height = ((bits >> 14) & 0x3fff) + 1;

		if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
			return null;
		}

		return {
			width,
			height,
			aspectRatio: Number((width / height).toFixed(6))
		};
	} else if (chunk === 'VP8X') {
		// Extended WebP
		if (buffer.length < 30) return null;

		// Canvas width at bytes 24-26 (24-bit LE) + 1
		// Canvas height at bytes 27-29 (24-bit LE) + 1
		const width = (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
		const height = (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1;

		if (width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
			return null;
		}

		return {
			width,
			height,
			aspectRatio: Number((width / height).toFixed(6))
		};
	}

	return null;
}

// ============================================================================
// SVG DIMENSION EXTRACTION
// ============================================================================

/**
 * Extract dimensions from SVG file
 * SVG dimensions come from viewBox, width/height attributes, or default
 *
 * @param buffer - File buffer
 * @returns Dimensions or null if invalid
 */
function extractSvgDimensions(buffer: Uint8Array): ExtractedDimensions | null {
	const text = new TextDecoder().decode(buffer);

	// Find the <svg> tag
	const svgMatch = text.match(/<svg[^>]*>/i);
	if (!svgMatch) {
		return null;
	}

	const svgTag = svgMatch[0];

	// Try to extract from viewBox first (most reliable)
	const viewBoxMatch = svgTag.match(/viewBox\s*=\s*["']([^"']+)["']/i);
	if (viewBoxMatch) {
		const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
		if (parts.length >= 4) {
			const width = parseFloat(parts[2]);
			const height = parseFloat(parts[3]);

			if (
				!isNaN(width) &&
				!isNaN(height) &&
				width > 0 &&
				height > 0 &&
				width <= MAX_DIMENSION &&
				height <= MAX_DIMENSION
			) {
				return {
					width: Math.round(width),
					height: Math.round(height),
					aspectRatio: Number((width / height).toFixed(6))
				};
			}
		}
	}

	// Try width and height attributes
	const widthMatch = svgTag.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)/i);
	const heightMatch = svgTag.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)/i);

	if (widthMatch && heightMatch) {
		const width = parseFloat(widthMatch[1]);
		const height = parseFloat(heightMatch[1]);

		if (
			!isNaN(width) &&
			!isNaN(height) &&
			width > 0 &&
			height > 0 &&
			width <= MAX_DIMENSION &&
			height <= MAX_DIMENSION
		) {
			return {
				width: Math.round(width),
				height: Math.round(height),
				aspectRatio: Number((width / height).toFixed(6))
			};
		}
	}

	// Default dimensions for SVG without explicit size
	// Use a reasonable default that can be scaled
	return {
		width: 300,
		height: 150,
		aspectRatio: 2
	};
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract dimensions from an image buffer
 *
 * @param buffer - Image file buffer
 * @param mimeType - Declared MIME type of the image
 * @returns Extraction result with dimensions or error
 *
 * @example
 * const result = extractDimensionsFromBuffer(buffer, 'image/png');
 * if (result.success) {
 *   console.log(`${result.dimensions.width}x${result.dimensions.height}`);
 * }
 */
export function extractDimensionsFromBuffer(
	buffer: Uint8Array,
	mimeType: string
): DimensionExtractionResult {
	if (buffer.length === 0) {
		return {
			success: false,
			error: 'Empty image buffer'
		};
	}

	let dimensions: ExtractedDimensions | null = null;

	try {
		switch (mimeType) {
			case 'image/png':
				dimensions = extractPngDimensions(buffer);
				break;
			case 'image/jpeg':
				dimensions = extractJpegDimensions(buffer);
				break;
			case 'image/gif':
				dimensions = extractGifDimensions(buffer);
				break;
			case 'image/webp':
				dimensions = extractWebpDimensions(buffer);
				break;
			case 'image/svg+xml':
				dimensions = extractSvgDimensions(buffer);
				break;
			default:
				return {
					success: false,
					error: `Unsupported image type: ${mimeType}`
				};
		}

		if (!dimensions) {
			return {
				success: false,
				error: `Failed to extract dimensions from ${mimeType} image`
			};
		}

		return {
			success: true,
			dimensions
		};
	} catch (err) {
		console.error('Error extracting image dimensions:', err);
		return {
			success: false,
			error: 'Error parsing image file'
		};
	}
}

/**
 * Extract dimensions from a File object
 *
 * @param file - Image File object
 * @returns Extraction result with dimensions or error
 *
 * @example
 * const result = await extractDimensionsFromFile(file);
 * if (result.success) {
 *   console.log(`Aspect ratio: ${result.dimensions.aspectRatio}`);
 * }
 */
export async function extractDimensionsFromFile(file: File): Promise<DimensionExtractionResult> {
	try {
		const arrayBuffer = await file.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);
		return extractDimensionsFromBuffer(buffer, file.type);
	} catch (err) {
		console.error('Error reading file for dimension extraction:', err);
		return {
			success: false,
			error: 'Error reading image file'
		};
	}
}
