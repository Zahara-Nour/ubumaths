/**
 * PDF Export Module
 *
 * Handles export to PNG, SVG, and PDF formats.
 * Uses jspdf for PDF generation.
 *
 * @module whiteboard/core/pdf-export
 */

import type {
	WhiteboardDocument,
	Page,
	AnnotationElement,
	AnnotationStroke,
	AnnotationShape,
	AnnotationStamp
} from '../types/document';
import { smoothStroke, pointsToSvgPath, getToolOptions } from './stroke-smoothing';
import { renderRoughShapeToSvgString } from './rough-renderer';
import { isPageExpanded, getExportScaleFactor, getOriginalDimensions } from './page-expansion';

// =============================================================================
// Constants
// =============================================================================

/** Supported export formats */
export const EXPORT_FORMATS = ['png', 'svg', 'pdf'] as const;

/** PNG resolution options */
export const PNG_RESOLUTIONS = [1, 2, 3] as const;

/** Default PNG resolution */
export const DEFAULT_PNG_RESOLUTION = 2;

/** Threshold for showing progress indicator */
export const PROGRESS_THRESHOLD_PAGES = 5;

// =============================================================================
// Types
// =============================================================================

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type PngResolution = (typeof PNG_RESOLUTIONS)[number];

export interface ExportOptions {
	format: ExportFormat;
	/** For PNG: resolution multiplier (1x, 2x, 3x) */
	resolution?: PngResolution;
	/** Pages to export: 'current', 'all', or array of page indices */
	pages?: 'current' | 'all' | number[];
	/** Include instruments in export */
	includeInstruments?: boolean;
	/** Include annotations in export (default: true) */
	includeAnnotations?: boolean;
	/** Callback for progress updates (0-100) */
	onProgress?: (progress: number) => void;
}

export interface ExportResult {
	success: boolean;
	/** Data URL for single page exports (PNG, SVG) */
	dataUrl?: string;
	/** Blob for PDF exports */
	blob?: Blob;
	/** Filename suggestion */
	filename?: string;
	error?: string;
}

export interface PageExportData {
	pageIndex: number;
	dataUrl: string;
	width: number;
	height: number;
}

// =============================================================================
// Filename Generation
// =============================================================================

/**
 * Generate filename for export
 */
export function generateExportFilename(
	document: WhiteboardDocument,
	format: ExportFormat,
	pageIndex?: number
): string {
	const sanitized = document.title.replace(/[<>:"/\\|?*]/g, '').trim() || 'Sans_titre';

	if (format === 'pdf') {
		return `${sanitized}.pdf`;
	}

	const pageSuffix = pageIndex !== undefined ? `_page${pageIndex + 1}` : '';
	return `${sanitized}${pageSuffix}.${format}`;
}

// =============================================================================
// Options Validation
// =============================================================================

/**
 * Validate export options
 */
export function validateExportOptions(options: ExportOptions): { valid: boolean; error?: string } {
	if (!EXPORT_FORMATS.includes(options.format)) {
		return { valid: false, error: `Format invalide : ${options.format}` };
	}

	if (options.format === 'png' && options.resolution !== undefined) {
		if (!PNG_RESOLUTIONS.includes(options.resolution)) {
			return { valid: false, error: `Résolution invalide : ${options.resolution}` };
		}
	}

	if (Array.isArray(options.pages)) {
		if (options.pages.length === 0) {
			return { valid: false, error: 'Aucune page sélectionnée' };
		}
		if (options.pages.some((p) => p < 0 || !Number.isInteger(p))) {
			return { valid: false, error: 'Numéros de pages invalides' };
		}
	}

	return { valid: true };
}

/**
 * Create default export options for a format
 */
export function createDefaultExportOptions(format: ExportFormat): ExportOptions {
	const options: ExportOptions = {
		format,
		includeInstruments: true,
		pages: format === 'pdf' ? 'all' : 'current'
	};

	if (format === 'png') {
		options.resolution = DEFAULT_PNG_RESOLUTION;
	}

	return options;
}

// =============================================================================
// Page Selection
// =============================================================================

/**
 * Get pages to export based on options
 */
export function getPagesToExport(
	document: WhiteboardDocument,
	pages: ExportOptions['pages']
): { indices: number[]; error?: string } {
	if (pages === 'current') {
		return { indices: [document.currentPageIndex] };
	}

	if (pages === 'all' || pages === undefined) {
		return { indices: document.pages.map((_, i) => i) };
	}

	// Validate indices are within bounds
	const maxIndex = document.pages.length - 1;
	const invalidIndices = pages.filter((i) => i > maxIndex);
	if (invalidIndices.length > 0) {
		return {
			indices: [],
			error: `Pages hors limites : ${invalidIndices.map((i) => i + 1).join(', ')}`
		};
	}

	return { indices: pages };
}

// =============================================================================
// Dimensions
// =============================================================================

/**
 * Calculate export dimensions for PNG
 * Uses original dimensions for expanded pages
 */
export function calculateExportDimensions(
	page: Page,
	resolution: PngResolution
): { width: number; height: number } {
	const dims = isPageExpanded(page)
		? getOriginalDimensions(page)
		: { width: page.width, height: page.height };
	return {
		width: Math.round(dims.width * resolution),
		height: Math.round(dims.height * resolution)
	};
}

// =============================================================================
// Progress
// =============================================================================

/**
 * Check if progress indicator should be shown
 */
export function shouldShowProgressIndicator(
	_document: WhiteboardDocument,
	pages: number[]
): boolean {
	return pages.length > PROGRESS_THRESHOLD_PAGES;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(completedPages: number, totalPages: number): number {
	if (totalPages === 0) return 100;
	return Math.round((completedPages / totalPages) * 100);
}

// =============================================================================
// SVG Export
// =============================================================================

/**
 * Export a page to SVG string
 *
 * For expanded pages, scales content to fit original dimensions.
 * The viewBox uses original dimensions, and content is wrapped in a scale transform.
 */
export function exportPageToSvg(
	page: Page,
	document: WhiteboardDocument,
	options: ExportOptions
): string {
	// Determine output dimensions (original size for expanded pages)
	const expanded = isPageExpanded(page);
	const outputDims = expanded
		? getOriginalDimensions(page)
		: { width: page.width, height: page.height };
	const scaleFactor = expanded ? getExportScaleFactor(page) : 1;

	// Start SVG with output dimensions
	let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputDims.width}" height="${outputDims.height}" viewBox="0 0 ${outputDims.width} ${outputDims.height}">`;

	// For expanded pages, wrap content in a scale group
	if (expanded) {
		svg += `<g transform="scale(${scaleFactor})">`;
	}

	// Add background (uses full page dimensions, will be scaled)
	svg += renderBackgroundToSvg(page);

	// Add elements
	for (const element of page.elements) {
		svg += renderElementToSvg(element);
	}

	// Add instruments if requested
	if (options.includeInstruments && document.instruments) {
		svg += renderInstrumentsToSvg(document.instruments);
	}

	// Add annotations if requested (and visible in document)
	const includeAnnotations = options.includeAnnotations ?? true;
	const annotationsVisible = document.annotationsVisible ?? true;
	if (includeAnnotations && annotationsVisible && page.annotations) {
		svg += renderAnnotationsToSvg(page.annotations);
	}

	// Close scale group if expanded
	if (expanded) {
		svg += '</g>';
	}

	svg += '</svg>';
	return svg;
}

/**
 * Render background to SVG
 */
function renderBackgroundToSvg(page: Page): string {
	const { width, height, background } = page;

	if (background.type === 'plain') {
		const gridSpacing = background.gridSpacing ?? 20;
		const gridOpacity = background.gridOpacity ?? 0.3;

		let svg = `<rect width="${width}" height="${height}" fill="${background.color}"/>`;

		// Add grid/ruled/dotted/triangular/hexagonal patterns
		switch (background.style) {
			case 'grid':
				svg += renderGridPattern(width, height, gridSpacing, gridOpacity);
				break;
			case 'ruled':
				svg += renderRuledPattern(width, height, gridSpacing, gridOpacity);
				break;
			case 'dotted':
				svg += renderDottedPattern(width, height, gridSpacing, gridOpacity);
				break;
			case 'triangular':
				svg += renderTriangularPattern(width, height, gridSpacing, gridOpacity);
				break;
			case 'triangular-dotted':
				svg += renderTriangularDottedPattern(width, height, gridSpacing, gridOpacity);
				break;
			case 'hexagonal':
				svg += renderHexagonalPattern(width, height, gridSpacing, gridOpacity);
				break;
			case 'hexagonal-dotted':
				svg += renderHexagonalDottedPattern(width, height, gridSpacing, gridOpacity);
				break;
		}

		return svg;
	}

	if (background.type === 'image') {
		const safeSrc = sanitizeImageSrc(background.src);
		if (!safeSrc) {
			return `<rect width="${width}" height="${height}" fill="#f0f0f0"/>`;
		}
		return `<image href="${safeSrc}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`;
	}

	// PDF background - render as image from stored data
	if (background.type === 'pdf') {
		// PDF backgrounds are rendered as images
		return `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
	}

	return `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
}

/**
 * Render grid pattern
 */
function renderGridPattern(
	width: number,
	height: number,
	spacing: number = 20,
	opacity: number = 0.3
): string {
	let svg = `<g stroke="#000000" stroke-width="0.5" opacity="${opacity}">`;

	// Vertical lines
	for (let x = spacing; x < width; x += spacing) {
		svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}"/>`;
	}

	// Horizontal lines
	for (let y = spacing; y < height; y += spacing) {
		svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}"/>`;
	}

	svg += '</g>';
	return svg;
}

/**
 * Render ruled pattern (horizontal lines only)
 */
function renderRuledPattern(
	width: number,
	height: number,
	spacing: number = 24,
	opacity: number = 0.3
): string {
	let svg = `<g stroke="#000000" stroke-width="0.5" opacity="${opacity}">`;

	for (let y = spacing; y < height; y += spacing) {
		svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}"/>`;
	}

	svg += '</g>';
	return svg;
}

/**
 * Render dotted pattern
 */
function renderDottedPattern(
	width: number,
	height: number,
	spacing: number = 20,
	opacity: number = 0.3
): string {
	let svg = `<g fill="#000000" opacity="${opacity}">`;

	for (let x = spacing; x < width; x += spacing) {
		for (let y = spacing; y < height; y += spacing) {
			svg += `<circle cx="${x}" cy="${y}" r="1.5"/>`;
		}
	}

	svg += '</g>';
	return svg;
}

/**
 * Render triangular (isometric) grid pattern
 */
function renderTriangularPattern(
	width: number,
	height: number,
	spacing: number = 20,
	opacity: number = 0.3
): string {
	const triHeight = spacing * 0.866; // sqrt(3)/2

	let svg = `<g stroke="#000000" stroke-width="0.5" fill="none" opacity="${opacity}">`;

	// Draw rows of triangles
	let row = 0;
	for (let y = 0; y < height + triHeight; y += triHeight) {
		const offset = row % 2 === 0 ? 0 : spacing / 2;
		for (let x = offset; x < width + spacing; x += spacing) {
			// Upper triangle (pointing up)
			if (row % 2 === 0) {
				svg += `<path d="M ${x} ${y + triHeight} L ${x + spacing / 2} ${y} L ${x + spacing} ${y + triHeight} Z"/>`;
			} else {
				// Lower triangle (pointing down)
				svg += `<path d="M ${x} ${y} L ${x + spacing / 2} ${y + triHeight} L ${x + spacing} ${y} Z"/>`;
			}
		}
		row++;
	}

	svg += '</g>';
	return svg;
}

/**
 * Render triangular dotted pattern
 */
function renderTriangularDottedPattern(
	width: number,
	height: number,
	spacing: number = 20,
	opacity: number = 0.3
): string {
	const triHeight = spacing * 0.866;

	let svg = `<g fill="#000000" opacity="${opacity}">`;

	let row = 0;
	for (let y = 0; y < height + triHeight; y += triHeight) {
		const offset = row % 2 === 0 ? 0 : spacing / 2;
		for (let x = offset; x < width + spacing; x += spacing) {
			svg += `<circle cx="${x}" cy="${y}" r="2"/>`;
		}
		row++;
	}

	svg += '</g>';
	return svg;
}

/**
 * Render hexagonal (honeycomb) grid pattern
 */
function renderHexagonalPattern(
	width: number,
	height: number,
	spacing: number = 20,
	opacity: number = 0.3
): string {
	const s = spacing / 2;
	const h = s * 0.866; // sqrt(3)/2

	let svg = `<g stroke="#000000" stroke-width="0.5" fill="none" opacity="${opacity}">`;

	for (let row = 0; row * h * 2 < height + h * 2; row++) {
		for (let col = 0; col * s * 3 < width + s * 3; col++) {
			const offsetX = col * s * 3;
			const offsetY = row * h * 2;

			// First hexagon
			svg += `<path d="M ${offsetX + s * 0.5} ${offsetY} L ${offsetX + s * 1.5} ${offsetY} L ${offsetX + s * 2} ${offsetY + h} L ${offsetX + s * 1.5} ${offsetY + h * 2} L ${offsetX + s * 0.5} ${offsetY + h * 2} L ${offsetX} ${offsetY + h} Z"/>`;

			// Second hexagon (offset)
			svg += `<path d="M ${offsetX + s * 2} ${offsetY + h} L ${offsetX + s * 3} ${offsetY + h} L ${offsetX + s * 3.5} ${offsetY + h * 2} L ${offsetX + s * 3} ${offsetY + h * 3} L ${offsetX + s * 2} ${offsetY + h * 3} L ${offsetX + s * 1.5} ${offsetY + h * 2} Z"/>`;
		}
	}

	svg += '</g>';
	return svg;
}

/**
 * Render hexagonal dotted pattern
 */
function renderHexagonalDottedPattern(
	width: number,
	height: number,
	spacing: number = 20,
	opacity: number = 0.3
): string {
	const s = spacing / 2;
	const h = s * 0.866;

	let svg = `<g fill="#000000" opacity="${opacity}">`;

	for (let row = 0; row * h * 2 < height + h * 2; row++) {
		for (let col = 0; col * s * 3 < width + s * 3; col++) {
			const offsetX = col * s * 3;
			const offsetY = row * h * 2;

			// Hexagon vertices
			svg += `<circle cx="${offsetX + s * 0.5}" cy="${offsetY}" r="2"/>`;
			svg += `<circle cx="${offsetX + s * 1.5}" cy="${offsetY}" r="2"/>`;
			svg += `<circle cx="${offsetX + s * 2}" cy="${offsetY + h}" r="2"/>`;
			svg += `<circle cx="${offsetX + s * 1.5}" cy="${offsetY + h * 2}" r="2"/>`;
			svg += `<circle cx="${offsetX + s * 0.5}" cy="${offsetY + h * 2}" r="2"/>`;
			svg += `<circle cx="${offsetX}" cy="${offsetY + h}" r="2"/>`;
		}
	}

	svg += '</g>';
	return svg;
}

/**
 * Render element to SVG
 */
function renderElementToSvg(element: Page['elements'][number]): string {
	switch (element.type) {
		case 'stroke':
			return renderStrokeToSvg(element);
		case 'shape':
			return renderShapeToSvg(element);
		case 'textblock':
			return renderTextBlockToSvg(element);
		case 'image':
			return renderImageToSvg(element);
		default:
			return '';
	}
}

/**
 * Render stroke element to SVG
 * Uses the same smoothing algorithm as the canvas for consistent rendering
 * All strokes use perfect-freehand for natural handwriting look
 */
function renderStrokeToSvg(element: Extract<Page['elements'][number], { type: 'stroke' }>): string {
	if (element.points.length === 0) return '';

	const opacity = element.toolType === 'highlighter' ? element.opacity : 1;

	// For single point, render a small circle
	if (element.points.length === 1) {
		const p = element.points[0];
		const r = element.width / 2;
		return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${element.color}" opacity="${opacity}"/>`;
	}

	// Get smoothing options for this tool type (same as canvas rendering)
	const smoothingOptions = getToolOptions(element.toolType, element.width, element.color, opacity);

	// Generate smooth outline points using perfect-freehand algorithm
	const outlinePoints = smoothStroke([...element.points], smoothingOptions);

	if (outlinePoints.length === 0) {
		// Fallback to simple line if smoothing fails
		const pathData = element.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
		return `<path d="${pathData}" stroke="${element.color}" stroke-width="${element.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
	}

	// Convert outline points to SVG path with quadratic Bezier curves
	const pathData = pointsToSvgPath(outlinePoints);

	// Render as filled shape (same as canvas)
	return `<path d="${pathData}" fill="${element.color}" opacity="${opacity}"/>`;
}

/**
 * Render shape element to SVG
 * All shapes use roughjs for consistent hand-drawn look
 */
function renderShapeToSvg(element: Extract<Page['elements'][number], { type: 'shape' }>): string {
	return renderRoughShapeToSvgString(element);
}

/**
 * Render text block to SVG using native SVG text elements (safe, no XSS risk)
 * Note: This is a simplified rendering that doesn't support markdown formatting
 */
function renderTextBlockToSvg(
	element: Extract<Page['elements'][number], { type: 'textblock' }>
): string {
	const { position, width, height, markdownContent } = element;

	// Use native SVG text elements for security (no foreignObject/innerHTML)
	const lines = markdownContent.split('\n');
	const lineHeight = 18;
	const padding = 8;
	const maxLines = Math.floor((height - padding * 2) / lineHeight);

	let svg = `<g>`;
	// Background for text block
	svg += `<rect x="${position.x}" y="${position.y}" width="${width}" height="${height}" fill="#ffffff" stroke="#e5e5e5" stroke-width="1" rx="2"/>`;

	// Render text lines
	const displayLines = lines.slice(0, maxLines);
	displayLines.forEach((line, i) => {
		const y = position.y + padding + 14 + i * lineHeight;
		const x = position.x + padding;

		// Truncate long lines
		const maxChars = Math.floor((width - padding * 2) / 8);
		const truncatedLine = line.length > maxChars ? line.substring(0, maxChars - 3) + '...' : line;

		svg += `<text x="${x}" y="${y}" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#000">${escapeHtml(truncatedLine)}</text>`;
	});

	// Show ellipsis if content is truncated
	if (lines.length > maxLines) {
		const y = position.y + height - padding;
		svg += `<text x="${position.x + padding}" y="${y}" font-family="system-ui, sans-serif" font-size="12" fill="#666">...</text>`;
	}

	svg += `</g>`;
	return svg;
}

/**
 * Render image element to SVG
 */
function renderImageToSvg(element: Extract<Page['elements'][number], { type: 'image' }>): string {
	const { position, width, height, src } = element;

	// Sanitize image source to prevent XSS
	const safeSrc = sanitizeImageSrc(src);
	if (!safeSrc) {
		// Return placeholder for invalid/unsafe images
		return `<rect x="${position.x}" y="${position.y}" width="${width}" height="${height}" fill="#f0f0f0" stroke="#ccc"/>`;
	}

	return `<image href="${safeSrc}" x="${position.x}" y="${position.y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
}

/**
 * Render instruments to SVG (simplified outlines)
 */
function renderInstrumentsToSvg(instruments: WhiteboardDocument['instruments']): string {
	let svg = '<g class="instruments">';

	for (const [type, state] of Object.entries(instruments)) {
		if (!state.visible) continue;

		const { x, y, rotation } = state;
		svg += `<g transform="translate(${x}, ${y}) rotate(${rotation})">`;

		// Simplified instrument representations
		switch (type) {
			case 'ruler':
				svg += `<rect x="0" y="0" width="300" height="40" fill="#f5f5dc" stroke="#000" stroke-width="1" opacity="0.9"/>`;
				break;
			case 'protractor':
				svg += `<path d="M 0 100 A 100 100 0 0 1 200 100 L 100 100 Z" fill="#f5f5dc" stroke="#000" stroke-width="1" opacity="0.9"/>`;
				break;
			case 'setSquare':
				svg += `<polygon points="0,0 200,0 0,200" fill="#f5f5dc" stroke="#000" stroke-width="1" opacity="0.9"/>`;
				break;
		}

		svg += '</g>';
	}

	svg += '</g>';
	return svg;
}

// =============================================================================
// Annotation Export
// =============================================================================

/**
 * Render all annotations to SVG
 */
function renderAnnotationsToSvg(annotations: readonly AnnotationElement[]): string {
	let svg = '<g class="annotations">';

	for (const annotation of annotations) {
		svg += renderAnnotationToSvg(annotation);
	}

	svg += '</g>';
	return svg;
}

/**
 * Render a single annotation element to SVG
 */
function renderAnnotationToSvg(annotation: AnnotationElement): string {
	switch (annotation.type) {
		case 'stroke':
			return renderAnnotationStrokeToSvg(annotation);
		case 'shape':
			return renderAnnotationShapeToSvg(annotation);
		case 'stamp':
			return renderAnnotationStampToSvg(annotation);
		default:
			return '';
	}
}

/**
 * Render annotation stroke to SVG
 * Uses the same smoothing algorithm as the annotation layer for consistent rendering
 */
function renderAnnotationStrokeToSvg(stroke: AnnotationStroke): string {
	if (stroke.points.length === 0) return '';

	const opacity = stroke.toolType === 'highlighter' ? stroke.opacity : 1;

	// For single point, render a small circle
	if (stroke.points.length === 1) {
		const p = stroke.points[0];
		const r = stroke.width / 2;
		return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${stroke.color}" opacity="${opacity}"/>`;
	}

	// Get smoothing options for this tool type (same as canvas rendering)
	const smoothingOptions = getToolOptions(stroke.toolType, stroke.width, stroke.color, opacity);

	// Generate smooth outline points using perfect-freehand algorithm
	const outlinePoints = smoothStroke([...stroke.points], smoothingOptions);

	if (outlinePoints.length === 0) {
		// Fallback to simple line if smoothing fails
		const pathData = stroke.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
		return `<path d="${pathData}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
	}

	// Convert outline points to SVG path with quadratic Bezier curves
	const pathData = pointsToSvgPath(outlinePoints);

	// Render as filled shape (same as canvas)
	return `<path d="${pathData}" fill="${stroke.color}" opacity="${opacity}"/>`;
}

/**
 * Render annotation shape to SVG
 */
function renderAnnotationShapeToSvg(shape: AnnotationShape): string {
	const { start, end, color, strokeWidth, strokeStyle, fillMode, fill, opacity, rotation } = shape;

	// Calculate shape bounds
	const minX = Math.min(start.x, end.x);
	const minY = Math.min(start.y, end.y);
	const maxX = Math.max(start.x, end.x);
	const maxY = Math.max(start.y, end.y);
	const width = maxX - minX;
	const height = maxY - minY;
	const centerX = minX + width / 2;
	const centerY = minY + height / 2;

	// Fill and stroke attributes
	const fillAttr = fillMode === 'none' ? 'none' : fill || color;
	const fillOpacity = fillMode === 'none' ? 0 : opacity;
	const strokeDasharray =
		strokeStyle === 'dashed' ? `8 ${8 + strokeWidth}` : strokeStyle === 'dotted' ? `2 4` : '';

	// Build transform for rotation
	const transform = rotation ? ` transform="rotate(${rotation} ${centerX} ${centerY})"` : '';

	let svg = '';

	switch (shape.shapeType) {
		case 'line':
			svg = `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"${strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : ''}${transform}/>`;
			break;

		case 'rectangle':
			svg = `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${fillAttr}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"${strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : ''}${transform}/>`;
			break;

		case 'circle': {
			const rx = width / 2;
			const ry = height / 2;
			svg = `<ellipse cx="${centerX}" cy="${centerY}" rx="${rx}" ry="${ry}" fill="${fillAttr}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"${strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : ''}${transform}/>`;
			break;
		}

		case 'arrow': {
			// Draw line with arrowhead
			const dx = end.x - start.x;
			const dy = end.y - start.y;
			const len = Math.sqrt(dx * dx + dy * dy);
			if (len < 1) break;

			const arrowSize = Math.min(20, len / 3);
			const ux = dx / len;
			const uy = dy / len;

			// Arrowhead points
			const tipX = end.x;
			const tipY = end.y;
			const baseX = end.x - ux * arrowSize;
			const baseY = end.y - uy * arrowSize;
			const perpX = -uy * arrowSize * 0.4;
			const perpY = ux * arrowSize * 0.4;

			const arrowPath = `M ${start.x} ${start.y} L ${baseX} ${baseY} M ${tipX} ${tipY} L ${baseX + perpX} ${baseY + perpY} L ${baseX - perpX} ${baseY - perpY} Z`;
			svg = `<path d="${arrowPath}" fill="${color}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"${strokeDasharray ? ` stroke-dasharray="${strokeDasharray}"` : ''}${transform}/>`;
			break;
		}
	}

	return svg;
}

/**
 * Render annotation stamp to SVG
 */
function renderAnnotationStampToSvg(stamp: AnnotationStamp): string {
	const { position, stampType, size, color, rotation, fill, fillOpacity, opacity } = stamp;

	const centerX = position.x;
	const centerY = position.y;

	// Build transform for rotation
	const transform = rotation ? `rotate(${rotation} ${centerX} ${centerY})` : '';

	let svg = '<g';
	if (transform) {
		svg += ` transform="${transform}"`;
	}
	svg += '>';

	// Optional background fill
	if (fill) {
		const bgOpacity = fillOpacity ?? 1;
		const bgRadius = size * 0.6;
		svg += `<circle cx="${centerX}" cy="${centerY}" r="${bgRadius}" fill="${fill}" opacity="${bgOpacity * opacity}"/>`;
	}

	// Stamp text (emoji or character)
	const escapedStamp = escapeHtml(stampType);
	svg += `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="central" font-size="${size}" fill="${color}" opacity="${opacity}">${escapedStamp}</text>`;

	svg += '</g>';
	return svg;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Sanitize image source for SVG export
 * Only allows safe data: URLs and blob: URLs
 * Rejects javascript:, http:, and SVG data URLs (which can contain scripts)
 */
function sanitizeImageSrc(src: string): string {
	// Allow blob URLs (locally created)
	if (src.startsWith('blob:')) {
		return src;
	}

	// Allow data URLs but NOT SVG (SVG can contain scripts)
	if (src.startsWith('data:image/')) {
		// Reject SVG data URLs as they can contain embedded scripts
		if (src.startsWith('data:image/svg+xml')) {
			console.warn('[Export] SVG data URLs rejected for security');
			return '';
		}
		return src;
	}

	// Reject all other protocols (javascript:, http:, https:, etc.)
	console.warn('[Export] Unsafe image source rejected:', src.substring(0, 50));
	return '';
}

// =============================================================================
// PNG Export
// =============================================================================

/**
 * Export a page to PNG data URL
 */
export async function exportPageToPng(
	page: Page,
	document: WhiteboardDocument,
	options: ExportOptions
): Promise<ExportResult> {
	try {
		const resolution = options.resolution ?? DEFAULT_PNG_RESOLUTION;
		const { width, height } = calculateExportDimensions(page, resolution);

		// Create SVG first
		const svgString = exportPageToSvg(page, document, options);

		// Convert SVG to PNG via canvas
		const canvas = window.document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return { success: false, error: 'Impossible de créer le contexte canvas' };
		}

		// Create image from SVG
		const img = new Image();
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		return new Promise((resolve) => {
			img.onload = () => {
				// Scale for resolution
				ctx.scale(resolution, resolution);
				ctx.drawImage(img, 0, 0);
				URL.revokeObjectURL(url);

				const dataUrl = canvas.toDataURL('image/png');

				// Clear canvas for GC
				canvas.width = 0;
				canvas.height = 0;

				resolve({
					success: true,
					dataUrl,
					filename: generateExportFilename(document, 'png', document.currentPageIndex)
				});
			};

			img.onerror = () => {
				URL.revokeObjectURL(url);

				// Clear canvas for GC even on error
				canvas.width = 0;
				canvas.height = 0;

				resolve({ success: false, error: 'Échec du rendu SVG' });
			};

			img.src = url;
		});
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Échec de l'export PNG"
		};
	}
}

// =============================================================================
// Thumbnail Generation (WebP)
// =============================================================================

/** Default thumbnail width in pixels */
const THUMBNAIL_WIDTH = 200;

/** Default thumbnail quality (0-1) */
const THUMBNAIL_QUALITY = 0.7;

export interface ThumbnailOptions {
	/** Target width in pixels (height calculated from aspect ratio) */
	width?: number;
	/** WebP quality (0-1), default 0.7 */
	quality?: number;
}

export interface ThumbnailResult {
	success: boolean;
	/** WebP data URL */
	dataUrl?: string;
	/** Width in pixels */
	width?: number;
	/** Height in pixels */
	height?: number;
	/** Approximate size in bytes */
	sizeBytes?: number;
	error?: string;
}

/**
 * Generate a WebP thumbnail of the first page
 * Optimized for small file size while maintaining decent quality
 * Uses original dimensions for expanded pages
 */
export async function generateThumbnail(
	page: Page,
	document: WhiteboardDocument,
	options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
	try {
		const targetWidth = options.width ?? THUMBNAIL_WIDTH;
		const quality = options.quality ?? THUMBNAIL_QUALITY;

		// Use original dimensions for expanded pages
		const pageDims = isPageExpanded(page)
			? getOriginalDimensions(page)
			: { width: page.width, height: page.height };

		// Calculate dimensions maintaining aspect ratio
		const aspectRatio = pageDims.height / pageDims.width;
		const width = Math.round(targetWidth);
		const height = Math.round(targetWidth * aspectRatio);

		// Create SVG at original size (we'll scale via canvas)
		const svgString = exportPageToSvg(page, document, {
			format: 'png', // Not actually used, but required
			includeInstruments: false
		});

		// Convert SVG to WebP via canvas
		const canvas = window.document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return { success: false, error: 'Impossible de créer le contexte canvas' };
		}

		// Create image from SVG
		const img = new Image();
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		return new Promise((resolve) => {
			img.onload = () => {
				// Draw scaled image
				ctx.drawImage(img, 0, 0, width, height);
				URL.revokeObjectURL(url);

				// Try WebP first, fallback to JPEG if not supported
				let dataUrl = canvas.toDataURL('image/webp', quality);

				// Check if WebP is actually supported (some browsers return PNG)
				if (!dataUrl.startsWith('data:image/webp')) {
					// Fallback to JPEG
					dataUrl = canvas.toDataURL('image/jpeg', quality);
				}

				// Estimate size (base64 is ~33% larger than binary)
				const base64Length = dataUrl.split(',')[1]?.length ?? 0;
				const sizeBytes = Math.round((base64Length * 3) / 4);

				// Clear canvas for GC
				canvas.width = 0;
				canvas.height = 0;

				resolve({
					success: true,
					dataUrl,
					width,
					height,
					sizeBytes
				});
			};

			img.onerror = () => {
				URL.revokeObjectURL(url);
				canvas.width = 0;
				canvas.height = 0;
				resolve({ success: false, error: 'Échec du rendu SVG' });
			};

			img.src = url;
		});
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Échec de la génération du thumbnail'
		};
	}
}

// =============================================================================
// SVG Export (public)
// =============================================================================

/**
 * Export current page to SVG data URL
 */
export function exportToSvg(document: WhiteboardDocument, options: ExportOptions): ExportResult {
	try {
		const pageIndex =
			options.pages === 'current' || options.pages === undefined
				? document.currentPageIndex
				: Array.isArray(options.pages)
					? options.pages[0]
					: 0;

		const page = document.pages[pageIndex];
		if (!page) {
			return { success: false, error: `Page ${pageIndex} not found` };
		}

		const svgString = exportPageToSvg(page, document, options);
		const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

		return {
			success: true,
			dataUrl,
			filename: generateExportFilename(document, 'svg', pageIndex)
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Échec de l'export SVG"
		};
	}
}

// =============================================================================
// PDF Export
// =============================================================================

/**
 * Export document to PDF
 * Uses jspdf library (dynamically imported)
 *
 * For expanded pages, the PDF uses original page dimensions
 * and the content is scaled to fit.
 */
export async function exportToPdf(
	document: WhiteboardDocument,
	options: ExportOptions
): Promise<ExportResult> {
	try {
		// Get pages to export
		const { indices, error } = getPagesToExport(document, options.pages);
		if (error) {
			return { success: false, error };
		}

		// Dynamically import jspdf
		const { jsPDF } = await import('jspdf');

		// Determine dimensions from first page (use original if expanded)
		const firstPage = document.pages[indices[0]];
		const firstPageDims = isPageExpanded(firstPage)
			? getOriginalDimensions(firstPage)
			: { width: firstPage.width, height: firstPage.height };
		const orientation = firstPageDims.width > firstPageDims.height ? 'landscape' : 'portrait';

		// Create PDF with original dimensions
		const pdf = new jsPDF({
			orientation,
			unit: 'px',
			format: [firstPageDims.width, firstPageDims.height]
		});

		// Export each page
		for (let i = 0; i < indices.length; i++) {
			const pageIndex = indices[i];
			const page = document.pages[pageIndex];

			// Get output dimensions (original if expanded)
			const pageDims = isPageExpanded(page)
				? getOriginalDimensions(page)
				: { width: page.width, height: page.height };

			if (i > 0) {
				// Add new page with correct dimensions (original if expanded)
				const pageOrientation = pageDims.width > pageDims.height ? 'landscape' : 'portrait';
				pdf.addPage([pageDims.width, pageDims.height], pageOrientation);
			}

			// Render page to SVG (already handles scaling for expanded pages)
			const svgString = exportPageToSvg(page, document, options);

			// Convert SVG to image and add to PDF (using original dimensions)
			await addSvgToPdfPage(pdf, svgString, pageDims.width, pageDims.height);

			// Report progress
			if (options.onProgress) {
				options.onProgress(calculateProgress(i + 1, indices.length));
			}
		}

		// Generate blob
		const blob = pdf.output('blob');

		return {
			success: true,
			blob,
			filename: generateExportFilename(document, 'pdf')
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Échec de l'export PDF"
		};
	}
}

/**
 * Resolution multiplier for PDF export
 * 2x provides good quality while keeping file sizes reasonable
 * (4x was causing 80MB+ PDFs due to uncompressed PNG)
 */
const PDF_RESOLUTION_MULTIPLIER = 2;

/**
 * JPEG quality for PDF export (0-1)
 * 0.85 provides good visual quality with significant compression
 */
const PDF_JPEG_QUALITY = 0.85;

/**
 * Add SVG content to PDF page
 * Uses JPEG compression to reduce file size dramatically
 */
async function addSvgToPdfPage(
	pdf: InstanceType<typeof import('jspdf').jsPDF>,
	svgString: string,
	width: number,
	height: number
): Promise<void> {
	return new Promise((resolve, reject) => {
		const scale = PDF_RESOLUTION_MULTIPLIER;
		const canvas = window.document.createElement('canvas');
		canvas.width = width * scale;
		canvas.height = height * scale;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			reject(new Error('Failed to create canvas context'));
			return;
		}

		// Fill white background (JPEG doesn't support transparency)
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const img = new Image();
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		img.onload = () => {
			ctx.scale(scale, scale);
			ctx.drawImage(img, 0, 0);
			URL.revokeObjectURL(url);

			// Use JPEG with compression instead of PNG (much smaller file size)
			const dataUrl = canvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY);

			// Add image to PDF
			pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);

			// Clear canvas for GC
			canvas.width = 0;
			canvas.height = 0;

			resolve();
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);

			// Clear canvas for GC even on error
			canvas.width = 0;
			canvas.height = 0;

			reject(new Error('Échec du rendu SVG'));
		};

		img.src = url;
	});
}

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export document based on options
 */
export async function exportDocument(
	document: WhiteboardDocument,
	options: ExportOptions
): Promise<ExportResult> {
	// Validate options
	const validation = validateExportOptions(options);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	switch (options.format) {
		case 'svg':
			return exportToSvg(document, options);

		case 'png': {
			const pageIndex =
				options.pages === 'current'
					? document.currentPageIndex
					: Array.isArray(options.pages)
						? options.pages[0]
						: 0;
			const page = document.pages[pageIndex];
			if (!page) {
				return { success: false, error: `Page ${pageIndex} not found` };
			}
			return exportPageToPng(page, document, options);
		}

		case 'pdf':
			return exportToPdf(document, options);

		default:
			return { success: false, error: `Unsupported format: ${options.format}` };
	}
}

// =============================================================================
// Download Helpers
// =============================================================================

/**
 * Trigger download of export result
 */
export function downloadExportResult(result: ExportResult): void {
	if (!result.success) return;

	const filename = result.filename || 'export';

	if (result.dataUrl) {
		const link = window.document.createElement('a');
		link.href = result.dataUrl;
		link.download = filename;
		link.click();
	} else if (result.blob) {
		const url = URL.createObjectURL(result.blob);
		const link = window.document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();

		// Revoke URL after delay to ensure download starts
		setTimeout(() => {
			URL.revokeObjectURL(url);
		}, 1000);
	}
}
