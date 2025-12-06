/**
 * Construction Renderer - SVG rendering utilities
 *
 * This module provides utilities for rendering geometric constructions to SVG.
 * It handles coordinate transformation (math coordinates to SVG), SVG element
 * creation, and style application.
 *
 * @module constructions/core/renderer
 */

import type { LineStyle, StyleProps } from '../types';
import {
	SVG_NS,
	DEFAULT_LINE_WIDTH,
	DEFAULT_COLORS,
	DEFAULT_FONT_SIZE,
	DEFAULT_FONT_FAMILY,
	DASH_PATTERN_DASHED,
	DASH_PATTERN_DOTTED,
	DEG_TO_RAD
} from '../constants';

// =============================================================================
// Types
// =============================================================================

/**
 * Viewport configuration for coordinate transformation
 *
 * Defines the mathematical coordinate system bounds that map to the canvas.
 */
export interface Viewport {
	/** Minimum x value in math coordinates */
	readonly xMin: number;
	/** Maximum x value in math coordinates */
	readonly xMax: number;
	/** Minimum y value in math coordinates */
	readonly yMin: number;
	/** Maximum y value in math coordinates */
	readonly yMax: number;
}

/**
 * Canvas dimensions
 */
export interface CanvasDimensions {
	/** Width in pixels */
	readonly width: number;
	/** Height in pixels */
	readonly height: number;
}

/**
 * Coordinate transformer for converting between math and SVG coordinates
 *
 * In math coordinates, y increases upward.
 * In SVG coordinates, y increases downward.
 */
export interface CoordinateTransformer {
	/**
	 * Convert math coordinates to SVG coordinates
	 *
	 * @param x - X coordinate in math space
	 * @param y - Y coordinate in math space
	 * @returns Coordinates in SVG space
	 */
	mathToSvg(x: number, y: number): { x: number; y: number };

	/**
	 * Convert SVG coordinates to math coordinates
	 *
	 * @param x - X coordinate in SVG space
	 * @param y - Y coordinate in SVG space
	 * @returns Coordinates in math space
	 */
	svgToMath(x: number, y: number): { x: number; y: number };

	/** Scale factor for x-axis (pixels per unit) */
	readonly scaleX: number;

	/** Scale factor for y-axis (pixels per unit, positive value) */
	readonly scaleY: number;

	/** Canvas dimensions */
	readonly canvas: CanvasDimensions;

	/** Viewport bounds */
	readonly viewport: Viewport;
}

/**
 * Text style properties for SVG text elements
 */
export interface TextStyle {
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	fontFamily?: string;
	/** Font weight */
	fontWeight?: 'normal' | 'bold';
	/** Text color */
	color?: string;
	/** Text anchor (horizontal alignment) */
	anchor?: 'start' | 'middle' | 'end';
	/** Dominant baseline (vertical alignment) */
	baseline?: 'auto' | 'middle' | 'hanging' | 'alphabetic';
}

// =============================================================================
// SVG Element Creation
// =============================================================================

/**
 * Create an SVG element with the correct namespace
 *
 * @param tagName - SVG element tag name
 * @returns The created SVG element
 *
 * @example
 * ```typescript
 * const circle = createSvgElement('circle');
 * circle.setAttribute('cx', '100');
 * circle.setAttribute('cy', '100');
 * circle.setAttribute('r', '50');
 * ```
 */
export function createSvgElement<K extends keyof SVGElementTagNameMap>(
	tagName: K
): SVGElementTagNameMap[K] {
	return document.createElementNS(SVG_NS, tagName) as SVGElementTagNameMap[K];
}

/**
 * Create an SVG group element
 *
 * @param id - Optional ID for the group
 * @returns The created group element
 */
export function createGroup(id?: string): SVGGElement {
	const group = createSvgElement('g');
	if (id) {
		group.setAttribute('id', id);
	}
	return group;
}

/**
 * Create an SVG root element with viewBox
 *
 * @param width - Width of the canvas
 * @param height - Height of the canvas
 * @returns The created SVG element
 */
export function createSvgRoot(width: number, height: number): SVGSVGElement {
	const svg = createSvgElement('svg');
	svg.setAttribute('width', String(width));
	svg.setAttribute('height', String(height));
	svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
	svg.setAttribute('xmlns', SVG_NS);
	return svg;
}

// =============================================================================
// Coordinate Transformation
// =============================================================================

/**
 * Create a coordinate transformer for converting between math and SVG coordinates
 *
 * By default, creates an identity mapping where (0,0) is at the top-left
 * and the canvas dimensions match the viewport. For a centered coordinate
 * system or custom bounds, provide a viewport.
 *
 * @param canvas - Canvas dimensions in pixels
 * @param viewport - Optional viewport bounds (defaults to canvas dimensions)
 * @returns Coordinate transformer
 *
 * @example
 * ```typescript
 * // Simple 1:1 mapping (SVG-style coordinates)
 * const simple = createTransformer({ width: 800, height: 600 });
 *
 * // Centered math coordinates (-400 to 400 on x-axis)
 * const centered = createTransformer(
 *   { width: 800, height: 600 },
 *   { xMin: -400, xMax: 400, yMin: -300, yMax: 300 }
 * );
 *
 * // Convert coordinates
 * const svgPoint = centered.mathToSvg(0, 0); // { x: 400, y: 300 } (center)
 * ```
 */
export function createTransformer(
	canvas: CanvasDimensions,
	viewport?: Viewport
): CoordinateTransformer {
	// Default viewport: (0,0) at top-left, y increases downward (SVG-style)
	const vp: Viewport = viewport ?? {
		xMin: 0,
		xMax: canvas.width,
		yMin: 0,
		yMax: canvas.height
	};

	// Calculate scale factors
	const scaleX = canvas.width / (vp.xMax - vp.xMin);
	const scaleY = canvas.height / (vp.yMax - vp.yMin);

	return {
		mathToSvg(x: number, y: number): { x: number; y: number } {
			// Map x from [xMin, xMax] to [0, width]
			const svgX = (x - vp.xMin) * scaleX;
			// Map y from [yMin, yMax] to [height, 0] (inverted for math coordinates)
			// In math, y increases upward; in SVG, y increases downward
			const svgY = canvas.height - (y - vp.yMin) * scaleY;
			return { x: svgX, y: svgY };
		},

		svgToMath(x: number, y: number): { x: number; y: number } {
			// Inverse of mathToSvg
			const mathX = x / scaleX + vp.xMin;
			const mathY = (canvas.height - y) / scaleY + vp.yMin;
			return { x: mathX, y: mathY };
		},

		scaleX,
		scaleY,
		canvas,
		viewport: vp
	};
}

/**
 * Create a transformer for simple SVG coordinates (no inversion)
 *
 * This is useful when working directly in SVG/screen coordinates
 * where (0,0) is at the top-left.
 *
 * @param canvas - Canvas dimensions
 * @returns Identity coordinate transformer
 */
export function createIdentityTransformer(canvas: CanvasDimensions): CoordinateTransformer {
	return {
		mathToSvg(x: number, y: number): { x: number; y: number } {
			return { x, y };
		},
		svgToMath(x: number, y: number): { x: number; y: number } {
			return { x, y };
		},
		scaleX: 1,
		scaleY: 1,
		canvas,
		viewport: { xMin: 0, xMax: canvas.width, yMin: 0, yMax: canvas.height }
	};
}

// =============================================================================
// SVG Path Generation
// =============================================================================

/**
 * Generate SVG path for a point marker (cross shape)
 *
 * @param x - Center x coordinate (in SVG space)
 * @param y - Center y coordinate (in SVG space)
 * @param size - Size of the cross in pixels
 * @returns SVG path data string
 *
 * @example
 * ```typescript
 * const path = pointToSvgCross(100, 100, 5);
 * // Returns: "M 95 100 L 105 100 M 100 95 L 100 105"
 * ```
 */
export function pointToSvgCross(x: number, y: number, size: number): string {
	const halfSize = size / 2;
	return `M ${x - halfSize} ${y} L ${x + halfSize} ${y} M ${x} ${y - halfSize} L ${x} ${y + halfSize}`;
}

/**
 * Generate SVG path for a point marker (X shape)
 *
 * @param x - Center x coordinate (in SVG space)
 * @param y - Center y coordinate (in SVG space)
 * @param size - Size of the X in pixels
 * @returns SVG path data string
 */
export function pointToSvgX(x: number, y: number, size: number): string {
	const halfSize = size / 2;
	return `M ${x - halfSize} ${y - halfSize} L ${x + halfSize} ${y + halfSize} M ${x - halfSize} ${y + halfSize} L ${x + halfSize} ${y - halfSize}`;
}

/**
 * Generate SVG line path for a segment
 *
 * @param x1 - Start x coordinate (in SVG space)
 * @param y1 - Start y coordinate (in SVG space)
 * @param x2 - End x coordinate (in SVG space)
 * @param y2 - End y coordinate (in SVG space)
 * @returns SVG path data string
 *
 * @example
 * ```typescript
 * const path = segmentToSvgLine(0, 0, 100, 100);
 * // Returns: "M 0 0 L 100 100"
 * ```
 */
export function segmentToSvgLine(x1: number, y1: number, x2: number, y2: number): string {
	return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/**
 * Generate SVG path for a circle
 *
 * Uses two arc commands to create a complete circle.
 *
 * @param cx - Center x coordinate (in SVG space)
 * @param cy - Center y coordinate (in SVG space)
 * @param r - Radius in pixels
 * @returns SVG path data string
 *
 * @example
 * ```typescript
 * const path = circleToSvgPath(100, 100, 50);
 * // Returns: "M 100 50 A 50 50 0 1 1 100 150 A 50 50 0 1 1 100 50"
 * ```
 */
export function circleToSvgPath(cx: number, cy: number, r: number): string {
	// Draw circle using two arcs (top half and bottom half)
	const top = cy - r;
	const bottom = cy + r;
	return `M ${cx} ${top} A ${r} ${r} 0 1 1 ${cx} ${bottom} A ${r} ${r} 0 1 1 ${cx} ${top}`;
}

/**
 * Generate SVG path for an arc
 *
 * Angles are measured in degrees, counterclockwise from the positive x-axis.
 *
 * @param cx - Center x coordinate (in SVG space)
 * @param cy - Center y coordinate (in SVG space)
 * @param r - Radius in pixels
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @returns SVG path data string
 *
 * @example
 * ```typescript
 * const path = arcToSvgPath(100, 100, 50, 0, 90);
 * // Returns an arc from 3 o'clock to 12 o'clock
 * ```
 */
export function arcToSvgPath(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number
): string {
	// Convert angles to radians
	// Note: SVG y-axis is inverted, so we negate angles
	const startRad = -startAngle * DEG_TO_RAD;
	const endRad = -endAngle * DEG_TO_RAD;

	// Calculate start and end points
	const x1 = cx + r * Math.cos(startRad);
	const y1 = cy + r * Math.sin(startRad);
	const x2 = cx + r * Math.cos(endRad);
	const y2 = cy + r * Math.sin(endRad);

	// Determine arc direction and size
	let angleDiff = endAngle - startAngle;
	// Normalize angle difference
	while (angleDiff < 0) angleDiff += 360;
	while (angleDiff >= 360) angleDiff -= 360;

	// Large arc flag: 1 if arc > 180 degrees
	const largeArcFlag = angleDiff > 180 ? 1 : 0;
	// Sweep flag: 0 for counterclockwise (in SVG inverted space)
	const sweepFlag = 0;

	return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`;
}

/**
 * Generate SVG path for a polygon
 *
 * @param points - Array of points in SVG space
 * @param closed - Whether to close the path (default: true)
 * @returns SVG path data string
 *
 * @example
 * ```typescript
 * const path = polygonToSvgPath([
 *   { x: 0, y: 0 },
 *   { x: 100, y: 0 },
 *   { x: 50, y: 87 }
 * ]);
 * // Returns: "M 0 0 L 100 0 L 50 87 Z"
 * ```
 */
export function polygonToSvgPath(
	points: readonly { x: number; y: number }[],
	closed: boolean = true
): string {
	if (points.length === 0) return '';
	if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

	let path = `M ${points[0].x} ${points[0].y}`;
	for (let i = 1; i < points.length; i++) {
		path += ` L ${points[i].x} ${points[i].y}`;
	}
	if (closed) {
		path += ' Z';
	}
	return path;
}

/**
 * Generate SVG path for a right angle marker (small square)
 *
 * @param vertex - Vertex point of the angle (in SVG space)
 * @param point1 - First ray point
 * @param point2 - Second ray point
 * @param size - Size of the square marker in pixels
 * @returns SVG path data string
 */
export function rightAngleMarkerPath(
	vertex: { x: number; y: number },
	point1: { x: number; y: number },
	point2: { x: number; y: number },
	size: number
): string {
	// Calculate unit vectors for both rays
	const dx1 = point1.x - vertex.x;
	const dy1 = point1.y - vertex.y;
	const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
	const ux1 = dx1 / len1;
	const uy1 = dy1 / len1;

	const dx2 = point2.x - vertex.x;
	const dy2 = point2.y - vertex.y;
	const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
	const ux2 = dx2 / len2;
	const uy2 = dy2 / len2;

	// Calculate the three corners of the square
	const p1 = { x: vertex.x + ux1 * size, y: vertex.y + uy1 * size };
	const p2 = { x: vertex.x + ux1 * size + ux2 * size, y: vertex.y + uy1 * size + uy2 * size };
	const p3 = { x: vertex.x + ux2 * size, y: vertex.y + uy2 * size };

	return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`;
}

// =============================================================================
// Partial Path Generation (for animations)
// =============================================================================

/**
 * Generate a partial segment path for drawing animations
 *
 * @param x1 - Start x coordinate
 * @param y1 - Start y coordinate
 * @param x2 - End x coordinate
 * @param y2 - End y coordinate
 * @param progress - Progress from 0 to 1
 * @returns SVG path data string for the partial segment
 */
export function partialSegmentPath(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	progress: number
): string {
	const clampedProgress = Math.max(0, Math.min(1, progress));
	const endX = x1 + (x2 - x1) * clampedProgress;
	const endY = y1 + (y2 - y1) * clampedProgress;
	return `M ${x1} ${y1} L ${endX} ${endY}`;
}

/**
 * Generate a partial arc path for drawing animations
 *
 * @param cx - Center x coordinate
 * @param cy - Center y coordinate
 * @param r - Radius
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @param progress - Progress from 0 to 1
 * @returns SVG path data string for the partial arc
 */
export function partialArcPath(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
	progress: number
): string {
	const clampedProgress = Math.max(0, Math.min(1, progress));
	const currentEndAngle = startAngle + (endAngle - startAngle) * clampedProgress;
	return arcToSvgPath(cx, cy, r, startAngle, currentEndAngle);
}

// =============================================================================
// Style Application
// =============================================================================

/**
 * Get the SVG dash array for a line style
 *
 * @param style - Line style ('solid', 'dashed', 'dotted')
 * @returns SVG stroke-dasharray value or null for solid
 */
export function getDashArray(style: LineStyle): string | null {
	switch (style) {
		case 'dashed':
			return DASH_PATTERN_DASHED;
		case 'dotted':
			return DASH_PATTERN_DOTTED;
		case 'solid':
		default:
			return null;
	}
}

/**
 * Apply line style properties to an SVG element
 *
 * @param element - SVG element to style
 * @param style - Style properties to apply
 *
 * @example
 * ```typescript
 * const line = createSvgElement('path');
 * applyLineStyle(line, {
 *   color: '#ff0000',
 *   lineWidth: 2,
 *   lineStyle: 'dashed',
 *   opacity: 0.8
 * });
 * ```
 */
export function applyLineStyle(element: SVGElement, style: StyleProps): void {
	// Stroke color
	const color = style.color ?? DEFAULT_COLORS.primary;
	element.setAttribute('stroke', color);

	// Line width
	const lineWidth = style.lineWidth ?? DEFAULT_LINE_WIDTH;
	element.setAttribute('stroke-width', String(lineWidth));

	// Dash pattern
	const dashArray = getDashArray(style.lineStyle ?? 'solid');
	if (dashArray) {
		element.setAttribute('stroke-dasharray', dashArray);
	} else {
		element.removeAttribute('stroke-dasharray');
	}

	// Opacity
	if (style.opacity !== undefined && style.opacity !== 1) {
		element.setAttribute('opacity', String(style.opacity));
	} else {
		element.removeAttribute('opacity');
	}

	// Default fill to none for lines
	if (!element.hasAttribute('fill')) {
		element.setAttribute('fill', 'none');
	}
}

/**
 * Apply fill style to an SVG element
 *
 * @param element - SVG element to style
 * @param fillColor - Fill color
 * @param opacity - Optional opacity (0-1)
 */
export function applyFillStyle(element: SVGElement, fillColor: string, opacity?: number): void {
	element.setAttribute('fill', fillColor);
	if (opacity !== undefined && opacity !== 1) {
		element.setAttribute('fill-opacity', String(opacity));
	}
}

/**
 * Apply text style properties to an SVG text element
 *
 * @param element - SVG text element to style
 * @param style - Text style properties to apply
 *
 * @example
 * ```typescript
 * const text = createSvgElement('text');
 * text.textContent = 'A';
 * applyTextStyle(text, {
 *   fontSize: 16,
 *   color: '#000000',
 *   anchor: 'middle'
 * });
 * ```
 */
export function applyTextStyle(element: SVGElement, style: TextStyle): void {
	// Font size
	const fontSize = style.fontSize ?? DEFAULT_FONT_SIZE;
	element.setAttribute('font-size', String(fontSize));

	// Font family
	const fontFamily = style.fontFamily ?? DEFAULT_FONT_FAMILY;
	element.setAttribute('font-family', fontFamily);

	// Font weight
	if (style.fontWeight) {
		element.setAttribute('font-weight', style.fontWeight);
	}

	// Fill color (text uses fill, not stroke)
	const color = style.color ?? DEFAULT_COLORS.text;
	element.setAttribute('fill', color);

	// Text anchor (horizontal alignment)
	if (style.anchor) {
		element.setAttribute('text-anchor', style.anchor);
	}

	// Dominant baseline (vertical alignment)
	if (style.baseline) {
		element.setAttribute('dominant-baseline', style.baseline);
	}
}

/**
 * Apply point style to create a point marker element
 *
 * @param x - X coordinate in SVG space
 * @param y - Y coordinate in SVG space
 * @param radius - Point radius in pixels
 * @param style - Style properties
 * @param pointStyle - Point visual style ('dot', 'cross', 'circle', 'none')
 * @returns SVG element representing the point, or null for 'none' style
 */
export function createPointMarker(
	x: number,
	y: number,
	radius: number,
	style: StyleProps,
	pointStyle: 'dot' | 'cross' | 'circle' | 'none' = 'dot'
): SVGElement | null {
	if (pointStyle === 'none') {
		return null;
	}

	const color = style.color ?? DEFAULT_COLORS.pointFill;

	if (pointStyle === 'dot') {
		const circle = createSvgElement('circle');
		circle.setAttribute('cx', String(x));
		circle.setAttribute('cy', String(y));
		circle.setAttribute('r', String(radius));
		circle.setAttribute('fill', color);
		if (style.opacity !== undefined && style.opacity !== 1) {
			circle.setAttribute('opacity', String(style.opacity));
		}
		return circle;
	}

	if (pointStyle === 'circle') {
		const circle = createSvgElement('circle');
		circle.setAttribute('cx', String(x));
		circle.setAttribute('cy', String(y));
		circle.setAttribute('r', String(radius));
		circle.setAttribute('fill', 'none');
		circle.setAttribute('stroke', color);
		circle.setAttribute('stroke-width', String(style.lineWidth ?? 2));
		if (style.opacity !== undefined && style.opacity !== 1) {
			circle.setAttribute('opacity', String(style.opacity));
		}
		return circle;
	}

	if (pointStyle === 'cross') {
		const path = createSvgElement('path');
		path.setAttribute('d', pointToSvgCross(x, y, radius * 2));
		path.setAttribute('stroke', color);
		path.setAttribute('stroke-width', String(style.lineWidth ?? 2));
		path.setAttribute('fill', 'none');
		if (style.opacity !== undefined && style.opacity !== 1) {
			path.setAttribute('opacity', String(style.opacity));
		}
		return path;
	}

	return null;
}

// =============================================================================
// Grid Generation
// =============================================================================

/**
 * Generate SVG path for a grid
 *
 * @param canvas - Canvas dimensions
 * @param spacing - Grid line spacing in pixels
 * @returns SVG path data string for the grid
 */
export function generateGridPath(canvas: CanvasDimensions, spacing: number): string {
	let path = '';

	// Vertical lines
	for (let x = spacing; x < canvas.width; x += spacing) {
		path += `M ${x} 0 L ${x} ${canvas.height} `;
	}

	// Horizontal lines
	for (let y = spacing; y < canvas.height; y += spacing) {
		path += `M 0 ${y} L ${canvas.width} ${y} `;
	}

	return path.trim();
}

/**
 * Create a grid SVG element
 *
 * @param canvas - Canvas dimensions
 * @param spacing - Grid line spacing
 * @param color - Grid line color
 * @returns SVG path element for the grid
 */
export function createGrid(
	canvas: CanvasDimensions,
	spacing: number,
	color: string = DEFAULT_COLORS.grid
): SVGPathElement {
	const path = createSvgElement('path');
	path.setAttribute('d', generateGridPath(canvas, spacing));
	path.setAttribute('stroke', color);
	path.setAttribute('stroke-width', '1');
	path.setAttribute('fill', 'none');
	path.setAttribute('opacity', '0.5');
	return path;
}

// =============================================================================
// Visibility Helpers
// =============================================================================

/**
 * Set visibility of an SVG element
 *
 * @param element - SVG element
 * @param visible - Whether the element should be visible
 */
export function setVisibility(element: SVGElement, visible: boolean): void {
	element.setAttribute('visibility', visible ? 'visible' : 'hidden');
}

/**
 * Set opacity of an SVG element with optional fade animation
 *
 * @param element - SVG element
 * @param opacity - Target opacity (0-1)
 */
export function setOpacity(element: SVGElement, opacity: number): void {
	element.setAttribute('opacity', String(Math.max(0, Math.min(1, opacity))));
}

// =============================================================================
// Transform Helpers
// =============================================================================

/**
 * Apply a translation transform to an SVG element
 *
 * @param element - SVG element
 * @param dx - X translation
 * @param dy - Y translation
 */
export function setTranslation(element: SVGElement, dx: number, dy: number): void {
	element.setAttribute('transform', `translate(${dx}, ${dy})`);
}

/**
 * Apply a rotation transform to an SVG element
 *
 * @param element - SVG element
 * @param angle - Rotation angle in degrees
 * @param cx - Center x coordinate (optional)
 * @param cy - Center y coordinate (optional)
 */
export function setRotation(element: SVGElement, angle: number, cx?: number, cy?: number): void {
	if (cx !== undefined && cy !== undefined) {
		element.setAttribute('transform', `rotate(${angle}, ${cx}, ${cy})`);
	} else {
		element.setAttribute('transform', `rotate(${angle})`);
	}
}

/**
 * Apply combined translate and rotate transform
 *
 * @param element - SVG element
 * @param dx - X translation
 * @param dy - Y translation
 * @param angle - Rotation angle in degrees
 * @param cx - Center x for rotation (relative to translated position)
 * @param cy - Center y for rotation (relative to translated position)
 */
export function setTransform(
	element: SVGElement,
	dx: number,
	dy: number,
	angle: number,
	cx?: number,
	cy?: number
): void {
	let transform = `translate(${dx}, ${dy})`;
	if (angle !== 0) {
		if (cx !== undefined && cy !== undefined) {
			transform += ` rotate(${angle}, ${cx}, ${cy})`;
		} else {
			transform += ` rotate(${angle})`;
		}
	}
	element.setAttribute('transform', transform);
}
