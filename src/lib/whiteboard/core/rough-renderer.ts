/**
 * Rough.js Rendering Utilities
 *
 * Provides sketchy, hand-drawn rendering for shapes and strokes
 * using the roughjs library. This module is used when elements
 * have renderStyle: 'sketch'.
 *
 * @module whiteboard/core/rough-renderer
 */

import rough from 'roughjs';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { Options as RoughOptions } from 'roughjs/bin/core';
import type { ShapeElement, StrokeElement, Point, FillMode, ArrowElement } from '../types/document';
import { getPolygonVertices, getStarVertices } from './shapes';
import { getAngleOnCurvedPath } from './curved-path';

// =============================================================================
// Types
// =============================================================================

export interface RoughRenderResult {
	/** SVG group element containing the rough rendering */
	element: SVGGElement;
	/** Any additional defs needed (patterns, markers) */
	defs: SVGElement[];
}

// =============================================================================
// Fill Style Mapping
// =============================================================================

/**
 * Map our FillMode to roughjs fillStyle
 * Note: roughjs fillStyle values: 'hachure' | 'solid' | 'zigzag' | 'cross-hatch' | 'dots' | 'dashed' | 'zigzag-line'
 */
function mapFillStyle(fillMode: FillMode | undefined): string | undefined {
	switch (fillMode) {
		case 'none':
			return undefined;
		case 'solid':
			return 'solid';
		case 'hatched':
			return 'hachure'; // Legacy mapping
		case 'hachure':
			return 'hachure';
		case 'crosshatch':
			return 'cross-hatch';
		case 'zigzag':
			return 'zigzag';
		default:
			return undefined;
	}
}

/**
 * Generate a random seed for roughjs if not provided
 */
function getOrCreateSeed(seed: number | undefined): number {
	return seed ?? Math.floor(Math.random() * 2147483647);
}

// =============================================================================
// Shape Rendering
// =============================================================================

/**
 * Get stroke dash array for roughjs based on stroke style
 * Returns array of [dash, gap] values relative to stroke width
 */
function getStrokeLineDash(
	strokeStyle: string | undefined,
	strokeWidth: number
): number[] | undefined {
	switch (strokeStyle) {
		case 'dashed':
			return [strokeWidth * 4, strokeWidth * 2];
		case 'dotted':
			return [strokeWidth, strokeWidth * 2];
		default:
			return undefined;
	}
}

/**
 * Create roughjs options from a shape element
 */
function createRoughOptions(shape: ShapeElement, seed: number, roughness: number): RoughOptions {
	const hasFill = shape.fillMode && shape.fillMode !== 'none' && shape.fill;
	const strokeLineDash = getStrokeLineDash(shape.strokeStyle, shape.strokeWidth);

	return {
		seed,
		roughness,
		stroke: shape.color,
		strokeWidth: shape.strokeWidth,
		strokeLineDash,
		fill: hasFill ? shape.fill : undefined,
		fillStyle: hasFill ? mapFillStyle(shape.fillMode) : undefined,
		fillWeight: shape.strokeWidth * 0.5,
		hachureAngle: 45,
		hachureGap: shape.strokeWidth * 4
	};
}

/**
 * Render a rectangle shape using roughjs
 * Supports rounded corners using SVG path with quadratic Bezier curves (like Excalidraw)
 */
function renderRoughRectangle(
	rc: RoughSVG,
	shape: ShapeElement,
	options: RoughOptions
): SVGGElement {
	const x = Math.min(shape.start.x, shape.end.x);
	const y = Math.min(shape.start.y, shape.end.y);
	const w = Math.abs(shape.end.x - shape.start.x);
	const h = Math.abs(shape.end.y - shape.start.y);

	// Check for corner radius
	const r = shape.cornerRadius ?? 0;

	if (r > 0) {
		// Clamp radius to half the smallest dimension
		const maxRadius = Math.min(w, h) / 2;
		const radius = Math.min(r, maxRadius);

		// Build SVG path with rounded corners using quadratic Bezier curves (like Excalidraw)
		// Path goes: top-left corner -> top edge -> top-right corner -> right edge -> etc.
		const path = `
			M ${x + radius} ${y}
			L ${x + w - radius} ${y}
			Q ${x + w} ${y}, ${x + w} ${y + radius}
			L ${x + w} ${y + h - radius}
			Q ${x + w} ${y + h}, ${x + w - radius} ${y + h}
			L ${x + radius} ${y + h}
			Q ${x} ${y + h}, ${x} ${y + h - radius}
			L ${x} ${y + radius}
			Q ${x} ${y}, ${x + radius} ${y}
		`;

		// Use preserveVertices for continuous path (like Excalidraw's continuousPath=true)
		return rc.path(path, { ...options, preserveVertices: true });
	}

	return rc.rectangle(x, y, w, h, options);
}

/**
 * Render a circle/ellipse shape using roughjs
 */
function renderRoughEllipse(rc: RoughSVG, shape: ShapeElement, options: RoughOptions): SVGGElement {
	const cx = (shape.start.x + shape.end.x) / 2;
	const cy = (shape.start.y + shape.end.y) / 2;
	const w = Math.abs(shape.end.x - shape.start.x);
	const h = Math.abs(shape.end.y - shape.start.y);

	return rc.ellipse(cx, cy, w, h, options);
}

/**
 * Render a line shape using roughjs
 */
function renderRoughLine(rc: RoughSVG, shape: ShapeElement, options: RoughOptions): SVGGElement {
	return rc.line(shape.start.x, shape.start.y, shape.end.x, shape.end.y, options);
}

/**
 * Render an arrow shape using roughjs
 * Creates a line with a hand-drawn arrowhead
 * Supports straight, elbow, and curved arrows
 */
function renderRoughArrow(
	rc: RoughSVG,
	shape: ShapeElement | ArrowElement,
	options: RoughOptions
): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

	const arrowShape = shape as ArrowElement;
	const effectiveArrowType = arrowShape.arrowType ?? (arrowShape.elbowed ? 'elbow' : 'sharp');

	if (effectiveArrowType === 'curved') {
		// Curved arrow: pass waypoints directly to rc.curve() like Excalidraw does
		// Key: use preserveVertices to ensure curve passes through exact points
		const waypoints = arrowShape.waypoints ?? [];

		// Build points array: start + waypoints + end
		const curvePoints: [number, number][] = [
			[shape.start.x, shape.start.y],
			...waypoints.map((wp) => [wp.position.x, wp.position.y] as [number, number]),
			[shape.end.x, shape.end.y]
		];

		// Use preserveVertices: true to avoid random offsets at points (like Excalidraw)
		const curveOptions: RoughOptions = {
			...options,
			preserveVertices: true
		};

		const curveElement = rc.curve(curvePoints, curveOptions);
		g.appendChild(curveElement);

		// Add arrowhead at the end, using the angle at the endpoint
		const endAngle = getAngleOnCurvedPath(shape.start, shape.end, waypoints, 1);
		const angleRad = (endAngle * Math.PI) / 180;
		const dx = Math.cos(angleRad);
		const dy = Math.sin(angleRad);
		const arrowhead = createRoughArrowhead(rc, shape.end.x, shape.end.y, dx, dy, options);
		g.appendChild(arrowhead);
	} else if (effectiveArrowType === 'elbow') {
		// Elbow arrow: draw the L-shaped path
		const direction = arrowShape.elbowDirection ?? 'horizontal-first';
		const elbowX = direction === 'horizontal-first' ? shape.end.x : shape.start.x;
		const elbowY = direction === 'horizontal-first' ? shape.start.y : shape.end.y;

		// Draw two line segments
		const line1 = rc.line(shape.start.x, shape.start.y, elbowX, elbowY, options);
		const line2 = rc.line(elbowX, elbowY, shape.end.x, shape.end.y, options);
		g.appendChild(line1);
		g.appendChild(line2);

		// Calculate arrowhead direction based on the last segment
		const dx = shape.end.x - elbowX;
		const dy = shape.end.y - elbowY;
		const arrowhead = createRoughArrowhead(rc, shape.end.x, shape.end.y, dx, dy, options);
		g.appendChild(arrowhead);
	} else {
		// Sharp/straight arrow
		const line = rc.line(shape.start.x, shape.start.y, shape.end.x, shape.end.y, options);
		g.appendChild(line);

		// Add arrowhead
		const dx = shape.end.x - shape.start.x;
		const dy = shape.end.y - shape.start.y;
		const arrowhead = createRoughArrowhead(rc, shape.end.x, shape.end.y, dx, dy, options);
		g.appendChild(arrowhead);
	}

	return g;
}

/**
 * Create a hand-drawn arrowhead (like Excalidraw)
 */
function createRoughArrowhead(
	rc: RoughSVG,
	tipX: number,
	tipY: number,
	dx: number,
	dy: number,
	options: RoughOptions
): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

	// Excalidraw uses size=25 for arrows, angle=20 degrees
	const size = 25;
	const arrowAngle = (20 * Math.PI) / 180; // 20 degrees in radians

	// Calculate angle of the incoming line
	const angle = Math.atan2(dy, dx);

	// Calculate arrowhead wing points
	const x3 = tipX - size * Math.cos(angle - arrowAngle);
	const y3 = tipY - size * Math.sin(angle - arrowAngle);
	const x4 = tipX - size * Math.cos(angle + arrowAngle);
	const y4 = tipY - size * Math.sin(angle + arrowAngle);

	// Draw the two lines of the arrowhead (from wing tips TO the arrow tip, like Excalidraw)
	const arrowheadOptions: RoughOptions = {
		...options,
		fill: undefined,
		fillStyle: undefined,
		strokeLineDash: undefined, // Always solid for arrowhead
		roughness: Math.min(1, options.roughness ?? 0) // Reduced roughness like Excalidraw
	};

	// Lines go FROM wing points TO tip (like Excalidraw: generator.line(x3, y3, x2, y2))
	const line1 = rc.line(x3, y3, tipX, tipY, arrowheadOptions);
	const line2 = rc.line(x4, y4, tipX, tipY, arrowheadOptions);

	g.appendChild(line1);
	g.appendChild(line2);

	return g;
}

/**
 * Render a polygon shape using roughjs
 */
function renderRoughPolygon(rc: RoughSVG, shape: ShapeElement, options: RoughOptions): SVGGElement {
	const cx = (shape.start.x + shape.end.x) / 2;
	const cy = (shape.start.y + shape.end.y) / 2;
	const rx = Math.abs(shape.end.x - shape.start.x) / 2;
	const ry = Math.abs(shape.end.y - shape.start.y) / 2;

	let vertices: Array<{ x: number; y: number }>;

	switch (shape.shapeType) {
		case 'pentagon':
			vertices = getPolygonVertices(cx, cy, rx, ry, 5);
			break;
		case 'hexagon':
			vertices = getPolygonVertices(cx, cy, rx, ry, 6);
			break;
		case 'star':
			vertices = getStarVertices(cx, cy, rx, ry, 0.4);
			break;
		default:
			// Fallback to a simple line
			return rc.line(shape.start.x, shape.start.y, shape.end.x, shape.end.y, options);
	}

	// Convert to array of [x, y] tuples for roughjs
	const points = vertices.map((p) => [p.x, p.y] as [number, number]);

	return rc.polygon(points, options);
}

/**
 * Render a shape element in sketch mode using roughjs
 */
export function renderRoughShape(
	svgElement: SVGSVGElement,
	shape: ShapeElement
): RoughRenderResult {
	const rc = rough.svg(svgElement);
	const seed = getOrCreateSeed(shape.roughSeed);
	const roughness = shape.roughness ?? 1;
	const options = createRoughOptions(shape, seed, roughness);

	let element: SVGGElement;

	switch (shape.shapeType) {
		case 'rectangle':
			element = renderRoughRectangle(rc, shape, options);
			break;
		case 'circle':
			element = renderRoughEllipse(rc, shape, options);
			break;
		case 'line':
			element = renderRoughLine(rc, shape, options);
			break;
		case 'arrow':
			element = renderRoughArrow(rc, shape, options);
			break;
		case 'pentagon':
		case 'hexagon':
		case 'star':
			element = renderRoughPolygon(rc, shape, options);
			break;
		default:
			// Fallback to line
			element = renderRoughLine(rc, shape, options);
	}

	// Apply opacity if needed
	if (shape.opacity !== undefined && shape.opacity < 1) {
		element.setAttribute('opacity', String(shape.opacity));
	}

	// Apply rotation if needed
	if (shape.rotation && shape.rotation !== 0) {
		const cx = (shape.start.x + shape.end.x) / 2;
		const cy = (shape.start.y + shape.end.y) / 2;
		element.setAttribute('transform', `rotate(${shape.rotation} ${cx} ${cy})`);
	}

	return { element, defs: [] };
}

// =============================================================================
// Stroke Rendering
// =============================================================================

/**
 * Convert points to SVG path d attribute (simple polyline)
 */
function pointsToPathD(points: readonly Point[]): string {
	if (points.length === 0) return '';
	if (points.length === 1) {
		return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y}`;
	}

	const [first, ...rest] = points;
	return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')}`;
}

/**
 * Render a stroke element in sketch mode using roughjs
 * Uses roughjs path rendering for a hand-drawn look
 */
export function renderRoughStroke(svgElement: SVGSVGElement, stroke: StrokeElement): SVGGElement {
	const rc = rough.svg(svgElement);
	const seed = getOrCreateSeed(stroke.roughSeed);

	// For strokes, use lower roughness to preserve the user's drawing intent
	const roughness = 0.5;

	const options: RoughOptions = {
		seed,
		roughness,
		stroke: stroke.color,
		strokeWidth: stroke.width,
		fill: 'none',
		simplification: 0.3 // Simplify complex paths for better performance
	};

	// Convert points to path
	const pathD = pointsToPathD(stroke.points);

	const element = rc.path(pathD, options);

	// Apply opacity if needed
	if (stroke.opacity !== undefined && stroke.opacity < 1) {
		element.setAttribute('opacity', String(stroke.opacity));
	}

	return element;
}

// =============================================================================
// SVG String Generation (for export)
// =============================================================================

/**
 * Render a rough shape to an SVG string (for export)
 */
export function renderRoughShapeToSvgString(shape: ShapeElement): string {
	// Create a temporary SVG element
	const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	const { element, defs } = renderRoughShape(tempSvg, shape);

	// Build the SVG string
	let result = '';

	if (defs.length > 0) {
		result += '<defs>';
		for (const def of defs) {
			result += def.outerHTML;
		}
		result += '</defs>';
	}

	result += element.outerHTML;

	return result;
}

/**
 * Render a rough stroke to an SVG string (for export)
 */
export function renderRoughStrokeToSvgString(stroke: StrokeElement): string {
	// Create a temporary SVG element
	const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	const element = renderRoughStroke(tempSvg, stroke);

	return element.outerHTML;
}
