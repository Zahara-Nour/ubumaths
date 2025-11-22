/**
 * Image Dimensions Service
 * ========================
 *
 * Service for managing image dimensions across multiple output formats (HTML, LaTeX, Typst).
 * Provides semantic sizing with size classes and percentage-based dimensions.
 *
 * @module exercises/services/image-dimensions
 */

import type { ImageNode, ImageSizeClass, ImageAlignment } from '../types';
import { DEFAULT_IMAGE_SIZE_MAPPINGS } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Output format for image rendering
 *
 * - `html`: Web rendering (CSS units)
 * - `latex`: LaTeX document (textwidth units)
 * - `typst`: Typst document (percentage units)
 */
export type OutputFormat = 'html' | 'latex' | 'typst';

/**
 * Computed image dimensions for a specific format
 *
 * @example HTML dimensions
 * ```typescript
 * const dims: ImageDimensions = {
 *   width: '50%',
 *   maxWidth: '600px',
 *   maxHeight: '400px'
 * };
 * ```
 *
 * @example LaTeX dimensions
 * ```typescript
 * const dims: ImageDimensions = {
 *   width: '0.5\\textwidth'
 * };
 * ```
 */
export interface ImageDimensions {
	/** Primary width value (CSS, LaTeX, or Typst format) */
	width: string;
	/** Maximum width constraint (HTML only) */
	maxWidth?: string;
	/** Maximum height constraint (HTML only) */
	maxHeight?: string;
	/** Explicit height value (rarely used) */
	height?: string;
}

// ============================================================================
// DIMENSION FUNCTIONS
// ============================================================================

/**
 * Get dimensions for an image node in a specific output format
 *
 * Priority order:
 * 1. If `widthPercent` is specified, use percentage-based dimensions
 * 2. Otherwise, use `sizeClass` (defaults to 'medium')
 *
 * @param node - Image node with sizing properties
 * @param format - Target output format
 * @returns Computed dimensions for the format
 *
 * @example Using widthPercent
 * ```typescript
 * const node: ImageNode = {
 *   type: 'image',
 *   src: 'diagram.png',
 *   widthPercent: 75
 * };
 * getDimensionsForFormat(node, 'html');
 * // { width: '75%' }
 *
 * getDimensionsForFormat(node, 'latex');
 * // { width: '0.75\\textwidth' }
 * ```
 *
 * @example Using sizeClass
 * ```typescript
 * const node: ImageNode = {
 *   type: 'image',
 *   src: 'figure.png',
 *   sizeClass: 'large'
 * };
 * getDimensionsForFormat(node, 'html');
 * // { width: '75%', maxWidth: '900px' }
 * ```
 *
 * @example Default size
 * ```typescript
 * const node: ImageNode = {
 *   type: 'image',
 *   src: 'image.png'
 * };
 * getDimensionsForFormat(node, 'html');
 * // { width: '50%', maxWidth: '600px' } (medium default)
 * ```
 */
export function getDimensionsForFormat(node: ImageNode, format: OutputFormat): ImageDimensions {
	// Priority 1: Use widthPercent if specified
	if (node.widthPercent !== undefined) {
		return getPercentDimensions(node.widthPercent, format);
	}

	// Priority 2: Use sizeClass (default: 'medium')
	const sizeClass = node.sizeClass || 'medium';
	const mapping = DEFAULT_IMAGE_SIZE_MAPPINGS[sizeClass];

	if (format === 'html') {
		return mapping.html;
	}

	return { width: format === 'latex' ? mapping.latex : mapping.typst };
}

/**
 * Convert percentage to format-specific dimension
 *
 * Clamps percentage to 0-100 range for safety.
 *
 * @param percent - Percentage of text/container width (0-100)
 * @param format - Target output format
 * @returns Dimensions with percentage-based width
 *
 * @example HTML format
 * ```typescript
 * getPercentDimensions(50, 'html');
 * // { width: '50%' }
 * ```
 *
 * @example LaTeX format
 * ```typescript
 * getPercentDimensions(75, 'latex');
 * // { width: '0.75\\textwidth' }
 * ```
 *
 * @example Typst format
 * ```typescript
 * getPercentDimensions(100, 'typst');
 * // { width: '100%' }
 * ```
 *
 * @example Clamped value
 * ```typescript
 * getPercentDimensions(150, 'html');
 * // { width: '100%' } (clamped from 150)
 * ```
 */
function getPercentDimensions(percent: number, format: OutputFormat): ImageDimensions {
	// Clamp to 0-100 range
	const clampedPercent = Math.max(0, Math.min(100, percent));

	switch (format) {
		case 'html':
			return { width: `${clampedPercent}%` };
		case 'latex': {
			// Limit to 2 decimal places for clean LaTeX output
			const ratio = Math.round((clampedPercent / 100) * 100) / 100;
			return { width: `${ratio}\\textwidth` };
		}
		case 'typst':
			return { width: `${clampedPercent}%` };
	}
}

// ============================================================================
// SIZE CLASS DETECTION
// ============================================================================

/**
 * Auto-detect appropriate size class based on image dimensions and aspect ratio
 *
 * Heuristics:
 * - Very wide (panoramic, ratio > 3) -> 'full'
 * - Very tall (portrait, ratio < 0.4) -> 'small' (avoid overflow)
 * - Small images (< 200x200) -> 'small'
 * - Large images (> 800 wide or > 600 tall) -> 'large'
 * - Wide images (ratio > 2) -> 'large'
 * - Default -> 'medium'
 *
 * @param width - Original image width in pixels
 * @param height - Original image height in pixels
 * @returns Recommended size class
 *
 * @example Panoramic image
 * ```typescript
 * autoDetectSizeClass(1200, 300); // 'full' (ratio 4.0)
 * ```
 *
 * @example Portrait image
 * ```typescript
 * autoDetectSizeClass(200, 600); // 'small' (ratio 0.33)
 * ```
 *
 * @example Small icon
 * ```typescript
 * autoDetectSizeClass(100, 100); // 'small'
 * ```
 *
 * @example Large photo
 * ```typescript
 * autoDetectSizeClass(1000, 750); // 'large' (width > 800)
 * ```
 *
 * @example Standard image
 * ```typescript
 * autoDetectSizeClass(400, 300); // 'medium' (default)
 * ```
 */
export function autoDetectSizeClass(width: number, height: number): ImageSizeClass {
	// Guard against invalid dimensions (division by zero, NaN, Infinity)
	if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
		return 'medium'; // Safe default for invalid input
	}

	const aspectRatio = width / height;

	// Very wide (panoramic) -> full
	if (aspectRatio > 3) return 'full';

	// Very tall (portrait) -> small to avoid overflow
	if (aspectRatio < 0.4) return 'small';

	// Small images -> small
	if (width < 200 && height < 200) return 'small';

	// Large images -> large
	if (width > 800 || height > 600) return 'large';

	// Wide images -> large
	if (aspectRatio > 2) return 'large';

	// Default -> medium
	return 'medium';
}

// ============================================================================
// ALIGNMENT STYLES
// ============================================================================

/**
 * Get alignment styles for a specific output format
 *
 * Generates format-specific CSS/LaTeX/Typst code for image alignment.
 *
 * @param alignment - Image alignment ('left', 'center', 'right')
 * @param format - Target output format
 * @returns Alignment style string for the format
 *
 * @example HTML alignment
 * ```typescript
 * getAlignmentStyles('center', 'html');
 * // 'margin-left: auto; margin-right: auto;'
 *
 * getAlignmentStyles('left', 'html');
 * // 'margin-right: auto;'
 *
 * getAlignmentStyles('right', 'html');
 * // 'margin-left: auto;'
 * ```
 *
 * @example LaTeX alignment
 * ```typescript
 * getAlignmentStyles('center', 'latex');
 * // '\\centering'
 *
 * getAlignmentStyles('left', 'latex');
 * // '\\raggedright'
 * ```
 *
 * @example Typst alignment
 * ```typescript
 * getAlignmentStyles('center', 'typst');
 * // 'align: center'
 * ```
 *
 * @example Default alignment (center)
 * ```typescript
 * getAlignmentStyles(undefined, 'html');
 * // 'margin-left: auto; margin-right: auto;'
 * ```
 */
export function getAlignmentStyles(
	alignment: ImageAlignment | undefined,
	format: OutputFormat
): string {
	const align = alignment || 'center';

	switch (format) {
		case 'html':
			switch (align) {
				case 'left':
					return 'margin-right: auto;';
				case 'right':
					return 'margin-left: auto;';
				case 'center':
					return 'margin-left: auto; margin-right: auto;';
			}
			break;
		case 'latex':
			switch (align) {
				case 'left':
					return '\\raggedright';
				case 'right':
					return '\\raggedleft';
				case 'center':
					return '\\centering';
			}
			break;
		case 'typst':
			switch (align) {
				case 'left':
					return 'align: left';
				case 'right':
					return 'align: right';
				case 'center':
					return 'align: center';
			}
			break;
	}

	// Unreachable but TypeScript requires it
	return '';
}

// ============================================================================
// FIGURE ENVIRONMENT DETECTION
// ============================================================================

/**
 * Determine if image should be wrapped in figure environment
 *
 * Figure environments are used for:
 * - Images with captions
 * - Block-level images (non-inline)
 *
 * In LaTeX, this wraps the image in `\begin{figure}...\end{figure}`.
 * In Typst, this uses the `#figure()` function.
 * In HTML, this wraps in `<figure>` with optional `<figcaption>`.
 *
 * @param node - Image node to check
 * @returns True if figure environment should be used
 *
 * @example Image with caption
 * ```typescript
 * const node: ImageNode = {
 *   type: 'image',
 *   src: 'graph.png',
 *   caption: 'Figure 1: Sales data'
 * };
 * shouldUseFigureEnvironment(node); // true
 * ```
 *
 * @example Block-level image (non-inline)
 * ```typescript
 * const node: ImageNode = {
 *   type: 'image',
 *   src: 'diagram.png',
 *   sizeClass: 'large'
 * };
 * shouldUseFigureEnvironment(node); // true
 * ```
 *
 * @example Inline image
 * ```typescript
 * const node: ImageNode = {
 *   type: 'image',
 *   src: 'icon.png',
 *   sizeClass: 'inline'
 * };
 * shouldUseFigureEnvironment(node); // false
 * ```
 *
 * @example Simple image without caption or size class
 * ```typescript
 * const node: ImageNode = {
 *   type: 'image',
 *   src: 'photo.jpg'
 * };
 * shouldUseFigureEnvironment(node); // false (defaults to medium, no caption)
 * ```
 */
export function shouldUseFigureEnvironment(node: ImageNode): boolean {
	return !!(node.caption || (node.sizeClass && node.sizeClass !== 'inline'));
}
