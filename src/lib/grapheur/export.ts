/**
 * Graph Export Utilities
 *
 * Provides SVG and PNG export functionality for the grapheur.
 * Uses browser-native APIs without external dependencies.
 *
 * @module grapheur/export
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Export format options
 */
export type ExportFormat = 'svg' | 'png';

/**
 * PNG export scale options
 */
export type ExportScale = 1 | 2 | 3;

/**
 * Options for graph export
 */
export interface ExportOptions {
	/** Export format */
	readonly format: ExportFormat;
	/** Scale factor for PNG (1x, 2x Retina, 3x HD) */
	readonly scale?: ExportScale;
	/** Include background color */
	readonly includeBackground?: boolean;
}

/**
 * Style values for export (resolved from CSS variables)
 */
interface ExportStyles {
	readonly background: string;
	readonly gridMinor: string;
	readonly gridMajor: string;
	readonly axis: string;
	readonly axisLabel: string;
	readonly tickMark: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Light mode style values */
const LIGHT_STYLES: ExportStyles = {
	background: '#ffffff',
	gridMinor: '#e5e5e5',
	gridMajor: '#d4d4d4',
	axis: '#374151',
	axisLabel: '#6b7280',
	tickMark: '#9ca3af'
};

/** Dark mode style values */
const DARK_STYLES: ExportStyles = {
	background: '#1a1a2e',
	gridMinor: '#2a2a3e',
	gridMajor: '#3a3a52',
	axis: '#9ca3af',
	axisLabel: '#9ca3af',
	tickMark: '#6b7280'
};

// =============================================================================
// Style Resolution
// =============================================================================

/**
 * Get export styles based on current theme
 */
function getExportStyles(isDark: boolean): ExportStyles {
	return isDark ? DARK_STYLES : LIGHT_STYLES;
}

/**
 * Check if dark mode is active
 */
export function isDarkMode(): boolean {
	if (typeof document === 'undefined') return false;
	return document.documentElement.classList.contains('dark');
}

// =============================================================================
// SVG Preparation
// =============================================================================

/**
 * Clone and prepare SVG element for export
 *
 * @param svg - Original SVG element
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @param isDark - Whether dark mode is active
 * @returns Prepared SVG string
 */
export function prepareSvgForExport(
	svg: SVGSVGElement,
	width: number,
	height: number,
	isDark: boolean
): string {
	// Clone the SVG to avoid modifying the original
	const clone = svg.cloneNode(true) as SVGSVGElement;

	// Remove interactive elements and event handlers
	removeInteractiveElements(clone);

	// Ensure proper SVG attributes
	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clone.setAttribute('width', String(width));
	clone.setAttribute('height', String(height));
	clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

	// Remove Svelte-specific attributes
	removeSvelteAttributes(clone);

	// Get styles for current theme
	const styles = getExportStyles(isDark);

	// Add background rectangle as first child
	addBackground(clone, width, height, styles.background);

	// Inline all styles
	inlineStyles(clone, styles);

	// Serialize to string
	const serializer = new XMLSerializer();
	return serializer.serializeToString(clone);
}

/**
 * Remove interactive overlay elements (hover, tooltips)
 */
function removeInteractiveElements(svg: SVGSVGElement): void {
	// Remove curve hover elements
	const curveHover = svg.querySelector('.curve-hover');
	if (curveHover) {
		curveHover.remove();
	}

	// Remove any tooltip elements
	const tooltips = svg.querySelectorAll('.tooltip');
	tooltips.forEach((tooltip) => tooltip.remove());

	// Remove hit areas (invisible click targets)
	const hitAreas = svg.querySelectorAll('.hit-area');
	hitAreas.forEach((hitArea) => hitArea.remove());
}

/**
 * Remove Svelte-specific class attributes
 */
function removeSvelteAttributes(element: Element): void {
	// Remove svelte-* class suffixes
	const className = element.getAttribute('class');
	if (className) {
		// Keep class names but remove Svelte hash suffixes
		const cleanedClass = className
			.split(' ')
			.filter((cls) => !cls.startsWith('svelte-'))
			.join(' ');
		if (cleanedClass) {
			element.setAttribute('class', cleanedClass);
		} else {
			element.removeAttribute('class');
		}
	}

	// Remove data-svelte-* attributes
	const attributes = Array.from(element.attributes);
	for (const attr of attributes) {
		if (attr.name.startsWith('data-svelte')) {
			element.removeAttribute(attr.name);
		}
	}

	// Recurse to children
	for (const child of element.children) {
		removeSvelteAttributes(child);
	}
}

/**
 * Add background rectangle to SVG
 */
function addBackground(svg: SVGSVGElement, width: number, height: number, color: string): void {
	const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	bg.setAttribute('width', String(width));
	bg.setAttribute('height', String(height));
	bg.setAttribute('fill', color);

	// Insert as first child
	svg.insertBefore(bg, svg.firstChild);
}

/**
 * Inline CSS styles as SVG attributes
 */
function inlineStyles(svg: SVGSVGElement, styles: ExportStyles): void {
	// Grid lines
	const gridMinor = svg.querySelectorAll('.grid-line-minor, [class*="grid-line-minor"]');
	gridMinor.forEach((el) => {
		el.setAttribute('stroke', styles.gridMinor);
		el.setAttribute('stroke-width', '0.5');
	});

	const gridMajor = svg.querySelectorAll('.grid-line-major, [class*="grid-line-major"]');
	gridMajor.forEach((el) => {
		el.setAttribute('stroke', styles.gridMajor);
		el.setAttribute('stroke-width', '1');
	});

	// Axis lines
	const axisLines = svg.querySelectorAll('.axis-line, [class*="axis-line"]');
	axisLines.forEach((el) => {
		el.setAttribute('stroke', styles.axis);
		el.setAttribute('stroke-width', '1.5');
	});

	// Tick marks
	const tickMarks = svg.querySelectorAll('.tick-mark, [class*="tick-mark"]');
	tickMarks.forEach((el) => {
		el.setAttribute('stroke', styles.tickMark);
		el.setAttribute('stroke-width', '1');
	});

	// Axis labels
	const axisLabels = svg.querySelectorAll('.axis-label, [class*="axis-label"]');
	axisLabels.forEach((el) => {
		el.setAttribute('fill', styles.axisLabel);
		el.setAttribute('font-family', 'ui-monospace, Consolas, monospace');
		el.setAttribute('font-size', '10');
	});

	// Axis names (x, y labels)
	const axisNames = svg.querySelectorAll('.axis-name, [class*="axis-name"]');
	axisNames.forEach((el) => {
		el.setAttribute('fill', styles.axis);
		el.setAttribute('font-family', 'Georgia, serif');
		el.setAttribute('font-style', 'italic');
		el.setAttribute('font-size', '14');
	});

	// Function curves - already have inline stroke from func.color
	const curves = svg.querySelectorAll('.function-curve, [class*="function-curve"]');
	curves.forEach((el) => {
		if (!el.getAttribute('stroke-width')) {
			el.setAttribute('stroke-width', '2');
		}
		if (!el.getAttribute('fill')) {
			el.setAttribute('fill', 'none');
		}
	});

	// Intersection markers
	const markers = svg.querySelectorAll('.marker, [class*="marker"]');
	markers.forEach((el) => {
		if (!el.getAttribute('stroke')) {
			el.setAttribute('stroke', 'white');
		}
		el.setAttribute('stroke-width', '2');
	});
}

// =============================================================================
// PNG Export
// =============================================================================

/**
 * Convert SVG string to PNG blob
 *
 * @param svgString - Prepared SVG string
 * @param width - Original width
 * @param height - Original height
 * @param scale - Scale factor (1, 2, or 3)
 * @returns Promise resolving to PNG blob
 */
export async function exportAsPng(
	svgString: string,
	width: number,
	height: number,
	scale: ExportScale = 2
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		// Create canvas with scaled dimensions
		const canvas = document.createElement('canvas');
		canvas.width = width * scale;
		canvas.height = height * scale;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			reject(new Error('Failed to get canvas context'));
			return;
		}

		// Scale the context for high-DPI rendering
		ctx.scale(scale, scale);

		// Create image from SVG blob
		const img = new Image();
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		img.onload = () => {
			// Draw image to canvas
			ctx.drawImage(img, 0, 0);

			// Cleanup blob URL
			URL.revokeObjectURL(url);

			// Convert canvas to PNG blob
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error('Failed to create PNG blob'));
					}
				},
				'image/png',
				1.0 // Quality (1.0 = maximum)
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load SVG image'));
		};

		img.src = url;
	});
}

// =============================================================================
// Download Utilities
// =============================================================================

/**
 * Generate export filename with timestamp
 *
 * @param format - Export format (svg or png)
 * @returns Filename string
 */
export function generateFilename(format: ExportFormat): string {
	const now = new Date();
	const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
	return `graphe-${timestamp}.${format}`;
}

/**
 * Trigger file download
 *
 * @param data - File data (Blob or string)
 * @param filename - Filename to save as
 * @param mimeType - MIME type for string data
 */
export function downloadFile(data: Blob | string, filename: string, mimeType?: string): void {
	let blob: Blob;

	if (typeof data === 'string') {
		blob = new Blob([data], { type: mimeType || 'text/plain' });
	} else {
		blob = data;
	}

	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;

	// Trigger download
	document.body.appendChild(link);
	link.click();

	// Cleanup
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

// =============================================================================
// High-Level Export Functions
// =============================================================================

/**
 * Export graph as SVG file
 *
 * @param svg - SVG element to export
 * @param width - Width in pixels
 * @param height - Height in pixels
 */
export function exportSvg(svg: SVGSVGElement, width: number, height: number): void {
	const isDark = isDarkMode();
	const svgString = prepareSvgForExport(svg, width, height, isDark);
	const filename = generateFilename('svg');
	downloadFile(svgString, filename, 'image/svg+xml');
}

/**
 * Export graph as PNG file
 *
 * @param svg - SVG element to export
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @param scale - Scale factor (1, 2, or 3)
 */
export async function exportPng(
	svg: SVGSVGElement,
	width: number,
	height: number,
	scale: ExportScale = 2
): Promise<void> {
	const isDark = isDarkMode();
	const svgString = prepareSvgForExport(svg, width, height, isDark);
	const pngBlob = await exportAsPng(svgString, width, height, scale);
	const filename = generateFilename('png');
	downloadFile(pngBlob, filename);
}
