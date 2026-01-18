/**
 * Rough.js Rendering Utilities
 *
 * Provides sketchy, hand-drawn rendering for shapes using the roughjs library.
 * All shapes in the whiteboard use roughjs for a consistent hand-drawn look.
 * The roughness level is controlled by the sloppiness presets (architect, artist, cartoonist).
 *
 * @module whiteboard/core/rough-renderer
 */

import rough from 'roughjs';
import type { RoughSVG } from 'roughjs/bin/svg';
import type { Options as RoughOptions } from 'roughjs/bin/core';
import type { ShapeElement, FillMode, ArrowElement, Arrowhead } from '../types/document';
import { getArrowPoints, getStartArrowhead, getEndArrowhead } from '../types/document';
import { getAdaptiveCornerRadius } from '../types/document';
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

	// Use adaptive corner radius like Excalidraw
	const hasRoundedCorners = (shape.cornerRadius ?? 0) > 0;
	const adaptiveRadius = getAdaptiveCornerRadius(w, h, hasRoundedCorners);

	if (adaptiveRadius > 0) {
		// Clamp radius to half the smallest dimension
		const maxRadius = Math.min(w, h) / 2;
		const radius = Math.min(adaptiveRadius, maxRadius);

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
 * Creates a line with hand-drawn arrowheads (supports multiple types)
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

	// Get arrowhead types (with defaults)
	const startArrowhead = getStartArrowhead(arrowShape);
	const endArrowhead = getEndArrowhead(arrowShape);

	// Get points using the unified model
	const points = getArrowPoints(arrowShape);

	if (effectiveArrowType === 'curved') {
		// Curved arrow: use points directly with rc.curve()
		const curvePoints: [number, number][] = points.map((p) => [p.x, p.y]);

		// Use preserveVertices: true to avoid random offsets at points (like Excalidraw)
		const curveOptions: RoughOptions = {
			...options,
			preserveVertices: true
		};

		const curveElement = rc.curve(curvePoints, curveOptions);
		g.appendChild(curveElement);

		// Start arrowhead (direction from second to first point)
		if (startArrowhead && points.length >= 2) {
			const dx = points[0].x - points[1].x;
			const dy = points[0].y - points[1].y;
			const head = renderArrowhead(rc, points[0].x, points[0].y, dx, dy, startArrowhead, options);
			if (head) g.appendChild(head);
		}

		// End arrowhead (use curve angle at endpoint)
		if (endArrowhead && points.length >= 2) {
			const waypoints = arrowShape.waypoints ?? [];
			const endAngle = getAngleOnCurvedPath(shape.start, shape.end, waypoints, 1);
			const angleRad = (endAngle * Math.PI) / 180;
			const dx = Math.cos(angleRad);
			const dy = Math.sin(angleRad);
			const endPoint = points[points.length - 1];
			const head = renderArrowhead(rc, endPoint.x, endPoint.y, dx, dy, endArrowhead, options);
			if (head) g.appendChild(head);
		}
	} else if (effectiveArrowType === 'elbow') {
		// Elbow arrow: draw segments between all points
		if (points.length >= 2) {
			// If only 2 points, calculate elbow point
			if (points.length === 2) {
				const direction = arrowShape.elbowDirection ?? 'horizontal-first';
				const elbowX = direction === 'horizontal-first' ? shape.end.x : shape.start.x;
				const elbowY = direction === 'horizontal-first' ? shape.start.y : shape.end.y;

				const line1 = rc.line(shape.start.x, shape.start.y, elbowX, elbowY, options);
				const line2 = rc.line(elbowX, elbowY, shape.end.x, shape.end.y, options);
				g.appendChild(line1);
				g.appendChild(line2);

				// Start arrowhead
				if (startArrowhead) {
					const dx = shape.start.x - elbowX;
					const dy = shape.start.y - elbowY;
					const head = renderArrowhead(
						rc,
						shape.start.x,
						shape.start.y,
						dx,
						dy,
						startArrowhead,
						options
					);
					if (head) g.appendChild(head);
				}

				// End arrowhead
				if (endArrowhead) {
					const dx = shape.end.x - elbowX;
					const dy = shape.end.y - elbowY;
					const head = renderArrowhead(rc, shape.end.x, shape.end.y, dx, dy, endArrowhead, options);
					if (head) g.appendChild(head);
				}
			} else {
				// Multi-point elbow: draw all segments
				for (let i = 0; i < points.length - 1; i++) {
					const line = rc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, options);
					g.appendChild(line);
				}

				// Start arrowhead (direction from second to first point)
				if (startArrowhead) {
					const dx = points[0].x - points[1].x;
					const dy = points[0].y - points[1].y;
					const head = renderArrowhead(
						rc,
						points[0].x,
						points[0].y,
						dx,
						dy,
						startArrowhead,
						options
					);
					if (head) g.appendChild(head);
				}

				// End arrowhead (direction from second-to-last to last point)
				if (endArrowhead) {
					const lastIdx = points.length - 1;
					const dx = points[lastIdx].x - points[lastIdx - 1].x;
					const dy = points[lastIdx].y - points[lastIdx - 1].y;
					const head = renderArrowhead(
						rc,
						points[lastIdx].x,
						points[lastIdx].y,
						dx,
						dy,
						endArrowhead,
						options
					);
					if (head) g.appendChild(head);
				}
			}
		}
	} else {
		// Sharp/straight arrow
		const line = rc.line(shape.start.x, shape.start.y, shape.end.x, shape.end.y, options);
		g.appendChild(line);

		// Start arrowhead
		if (startArrowhead) {
			const dx = shape.start.x - shape.end.x;
			const dy = shape.start.y - shape.end.y;
			const head = renderArrowhead(
				rc,
				shape.start.x,
				shape.start.y,
				dx,
				dy,
				startArrowhead,
				options
			);
			if (head) g.appendChild(head);
		}

		// End arrowhead
		if (endArrowhead) {
			const dx = shape.end.x - shape.start.x;
			const dy = shape.end.y - shape.start.y;
			const head = renderArrowhead(rc, shape.end.x, shape.end.y, dx, dy, endArrowhead, options);
			if (head) g.appendChild(head);
		}
	}

	return g;
}

// =============================================================================
// Arrowhead Rendering
// =============================================================================

/** Arrowhead configuration constants (like Excalidraw) */
const ARROWHEAD_SIZE = 25;
const ARROWHEAD_ANGLE_DEG = 20;
const ARROWHEAD_ANGLE_RAD = (ARROWHEAD_ANGLE_DEG * Math.PI) / 180;

/**
 * Render an arrowhead of the specified type.
 *
 * @param rc - RoughSVG instance
 * @param tipX - X coordinate of the arrow tip
 * @param tipY - Y coordinate of the arrow tip
 * @param dx - Direction X component (pointing toward the tip)
 * @param dy - Direction Y component (pointing toward the tip)
 * @param arrowheadType - Type of arrowhead to render
 * @param options - Rough.js options
 * @returns SVG group element containing the arrowhead, or null for 'none'
 */
function renderArrowhead(
	rc: RoughSVG,
	tipX: number,
	tipY: number,
	dx: number,
	dy: number,
	arrowheadType: Arrowhead | null,
	options: RoughOptions
): SVGGElement | null {
	if (!arrowheadType || arrowheadType === 'none') {
		return null;
	}

	// Common options for arrowheads: solid stroke, reduced roughness
	const arrowheadOptions: RoughOptions = {
		...options,
		fill: undefined,
		fillStyle: undefined,
		strokeLineDash: undefined, // Always solid for arrowhead
		roughness: Math.min(1, options.roughness ?? 0)
	};

	const angle = Math.atan2(dy, dx);

	switch (arrowheadType) {
		case 'arrow':
			return renderArrowheadArrow(rc, tipX, tipY, angle, arrowheadOptions);
		case 'triangle':
			return renderArrowheadTriangle(rc, tipX, tipY, angle, arrowheadOptions, options.stroke);
		case 'circle':
			return renderArrowheadCircle(rc, tipX, tipY, angle, arrowheadOptions, options.stroke);
		case 'bar':
			return renderArrowheadBar(rc, tipX, tipY, angle, arrowheadOptions);
		case 'diamond':
			return renderArrowheadDiamond(rc, tipX, tipY, angle, arrowheadOptions, options.stroke);
		default:
			return null;
	}
}

/**
 * Render the default 'arrow' arrowhead (two lines meeting at the tip).
 */
function renderArrowheadArrow(
	rc: RoughSVG,
	tipX: number,
	tipY: number,
	angle: number,
	options: RoughOptions
): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

	// Calculate wing points
	const x3 = tipX - ARROWHEAD_SIZE * Math.cos(angle - ARROWHEAD_ANGLE_RAD);
	const y3 = tipY - ARROWHEAD_SIZE * Math.sin(angle - ARROWHEAD_ANGLE_RAD);
	const x4 = tipX - ARROWHEAD_SIZE * Math.cos(angle + ARROWHEAD_ANGLE_RAD);
	const y4 = tipY - ARROWHEAD_SIZE * Math.sin(angle + ARROWHEAD_ANGLE_RAD);

	// Lines go FROM wing points TO tip
	const line1 = rc.line(x3, y3, tipX, tipY, options);
	const line2 = rc.line(x4, y4, tipX, tipY, options);

	g.appendChild(line1);
	g.appendChild(line2);

	return g;
}

/**
 * Render a filled triangle arrowhead.
 */
function renderArrowheadTriangle(
	rc: RoughSVG,
	tipX: number,
	tipY: number,
	angle: number,
	options: RoughOptions,
	fillColor: string | undefined
): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

	// Calculate triangle points
	const x3 = tipX - ARROWHEAD_SIZE * Math.cos(angle - ARROWHEAD_ANGLE_RAD);
	const y3 = tipY - ARROWHEAD_SIZE * Math.sin(angle - ARROWHEAD_ANGLE_RAD);
	const x4 = tipX - ARROWHEAD_SIZE * Math.cos(angle + ARROWHEAD_ANGLE_RAD);
	const y4 = tipY - ARROWHEAD_SIZE * Math.sin(angle + ARROWHEAD_ANGLE_RAD);

	const triangleOptions: RoughOptions = {
		...options,
		fill: fillColor,
		fillStyle: 'solid'
	};

	const triangle = rc.polygon(
		[
			[tipX, tipY],
			[x3, y3],
			[x4, y4]
		],
		triangleOptions
	);

	g.appendChild(triangle);

	return g;
}

/**
 * Render a filled circle arrowhead (useful for probability trees).
 */
function renderArrowheadCircle(
	rc: RoughSVG,
	tipX: number,
	tipY: number,
	angle: number,
	options: RoughOptions,
	fillColor: string | undefined
): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

	// Circle is centered slightly behind the tip
	const circleRadius = ARROWHEAD_SIZE * 0.35;
	const cx = tipX - circleRadius * Math.cos(angle);
	const cy = tipY - circleRadius * Math.sin(angle);

	const circleOptions: RoughOptions = {
		...options,
		fill: fillColor,
		fillStyle: 'solid'
	};

	const circle = rc.circle(cx, cy, circleRadius * 2, circleOptions);

	g.appendChild(circle);

	return g;
}

/**
 * Render a perpendicular bar arrowhead.
 */
function renderArrowheadBar(
	rc: RoughSVG,
	tipX: number,
	tipY: number,
	angle: number,
	options: RoughOptions
): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

	// Bar is perpendicular to the arrow direction
	const barLength = ARROWHEAD_SIZE * 0.6;
	const perpAngle = angle + Math.PI / 2;

	const x1 = tipX + barLength * Math.cos(perpAngle);
	const y1 = tipY + barLength * Math.sin(perpAngle);
	const x2 = tipX - barLength * Math.cos(perpAngle);
	const y2 = tipY - barLength * Math.sin(perpAngle);

	const bar = rc.line(x1, y1, x2, y2, options);

	g.appendChild(bar);

	return g;
}

/**
 * Render a filled diamond arrowhead (useful for flowcharts).
 */
function renderArrowheadDiamond(
	rc: RoughSVG,
	tipX: number,
	tipY: number,
	angle: number,
	options: RoughOptions,
	fillColor: string | undefined
): SVGGElement {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

	// Diamond is centered slightly behind the tip
	const diamondSize = ARROWHEAD_SIZE * 0.5;
	const cx = tipX - diamondSize * Math.cos(angle);
	const cy = tipY - diamondSize * Math.sin(angle);

	// Four corners of the diamond
	const perpAngle = angle + Math.PI / 2;
	const points: [number, number][] = [
		[tipX, tipY], // Front tip
		[cx + diamondSize * 0.5 * Math.cos(perpAngle), cy + diamondSize * 0.5 * Math.sin(perpAngle)], // Right
		[cx - diamondSize * Math.cos(angle), cy - diamondSize * Math.sin(angle)], // Back
		[cx - diamondSize * 0.5 * Math.cos(perpAngle), cy - diamondSize * 0.5 * Math.sin(perpAngle)] // Left
	];

	const diamondOptions: RoughOptions = {
		...options,
		fill: fillColor,
		fillStyle: 'solid'
	};

	const diamond = rc.polygon(points, diamondOptions);

	g.appendChild(diamond);

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
