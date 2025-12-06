/**
 * Angle Mark Object Renderer
 *
 * Renders angle marks (arcs showing angles between two rays from a vertex).
 * Supports both regular arc marks and right angle markers (square).
 *
 * @module constructions/objects/angleMark
 */

import type { AngleMarkDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import {
	createSvgElement,
	applyLineStyle,
	arcToSvgPath,
	rightAngleMarkerPath
} from '../core/renderer';
import { DEFAULT_ANGLE_MARK_RADIUS, RIGHT_ANGLE_SIZE, DEG_TO_RAD, RAD_TO_DEG } from '../constants';

// =============================================================================
// Angle Mark Renderer
// =============================================================================

/**
 * Renderer for angle mark objects
 *
 * Creates SVG path elements representing angle marks.
 * The angle is defined by three points:
 * - point1: First ray endpoint
 * - vertex: The vertex of the angle
 * - point2: Second ray endpoint
 *
 * The angle is measured counterclockwise from ray (vertex->point1)
 * to ray (vertex->point2).
 *
 * @example
 * ```typescript
 * // Regular angle mark
 * const angleDef: AngleMarkDef = {
 *   kind: 'angleMark',
 *   id: 'angle1',
 *   point1: 'A',
 *   vertex: 'B',
 *   point2: 'C',
 *   radius: 25,
 *   style: { color: '#ea580c' }
 * };
 *
 * // Right angle marker (square)
 * const rightAngleDef: AngleMarkDef = {
 *   kind: 'angleMark',
 *   id: 'rightAngle',
 *   point1: 'A',
 *   vertex: 'B',
 *   point2: 'C',
 *   rightAngle: true
 * };
 * ```
 */
export const angleMarkRenderer: ObjectRenderer<AngleMarkDef> = {
	kind: 'angleMark',

	createSvgElement(def: AngleMarkDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get the three points: point1, vertex (position), point2 (position2)
		// Geometry convention: position = vertex, need to get all three from vertices array
		const vertices = geometry.vertices;

		if (!vertices || vertices.length < 3) {
			throw new Error(`AngleMark ${def.id} needs exactly 3 points`);
		}

		// Transform all points to SVG coordinates
		const svgPoint1 = transformer.mathToSvg(vertices[0].x, vertices[0].y);
		const svgVertex = transformer.mathToSvg(vertices[1].x, vertices[1].y);
		const svgPoint2 = transformer.mathToSvg(vertices[2].x, vertices[2].y);

		const radius = def.radius ?? DEFAULT_ANGLE_MARK_RADIUS;
		const effectiveStyle = getEffectiveStyle(def, state);

		// Create path element
		const path = createSvgElement('path');
		path.setAttribute('data-id', def.id);
		path.setAttribute('data-kind', 'angleMark');
		path.classList.add('construction-angle-mark');

		// Generate appropriate path based on angle type
		let pathData: string;
		if (def.rightAngle) {
			pathData = rightAngleMarkerPath(svgVertex, svgPoint1, svgPoint2, RIGHT_ANGLE_SIZE);
		} else {
			pathData = createAngleArcPath(svgPoint1, svgVertex, svgPoint2, radius);
		}

		path.setAttribute('d', pathData);

		// Apply style
		applyLineStyle(path, effectiveStyle);
		path.setAttribute('fill', 'none');

		// Apply initial state
		applyStateToElement(path, state);

		return path;
	},

	updateSvgElement(element: SVGElement, def: AngleMarkDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get updated points
		const vertices = geometry.vertices;

		if (!vertices || vertices.length < 3) {
			return;
		}

		// Transform all points to SVG coordinates
		const svgPoint1 = transformer.mathToSvg(vertices[0].x, vertices[0].y);
		const svgVertex = transformer.mathToSvg(vertices[1].x, vertices[1].y);
		const svgPoint2 = transformer.mathToSvg(vertices[2].x, vertices[2].y);

		const radius = def.radius ?? DEFAULT_ANGLE_MARK_RADIUS;
		const effectiveStyle = getEffectiveStyle(def, state);

		// Regenerate path
		let pathData: string;
		if (def.rightAngle) {
			pathData = rightAngleMarkerPath(svgVertex, svgPoint1, svgPoint2, RIGHT_ANGLE_SIZE);
		} else {
			pathData = createAngleArcPath(svgPoint1, svgVertex, svgPoint2, radius);
		}

		element.setAttribute('d', pathData);

		// Update style
		applyLineStyle(element, effectiveStyle);

		// Apply state (visibility, opacity)
		applyStateToElement(element, state);
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an arc path for an angle mark
 *
 * Calculates the angles from vertex to each ray point and creates
 * an arc between them.
 *
 * @param point1 - First ray point (SVG coordinates)
 * @param vertex - Angle vertex (SVG coordinates)
 * @param point2 - Second ray point (SVG coordinates)
 * @param radius - Arc radius in pixels
 * @returns SVG path data string
 */
function createAngleArcPath(
	point1: { x: number; y: number },
	vertex: { x: number; y: number },
	point2: { x: number; y: number },
	radius: number
): string {
	// Calculate angles from vertex to each point
	// Note: SVG y-axis is inverted, so we negate dy
	const angle1 = Math.atan2(-(point1.y - vertex.y), point1.x - vertex.x) * RAD_TO_DEG;
	const angle2 = Math.atan2(-(point2.y - vertex.y), point2.x - vertex.x) * RAD_TO_DEG;

	// Normalize angles to ensure we draw the smaller arc
	let startAngle = angle1;
	let endAngle = angle2;

	// Calculate the angular difference
	let diff = endAngle - startAngle;
	while (diff < 0) diff += 360;
	while (diff >= 360) diff -= 360;

	// If the difference is greater than 180, we need to go the other way
	// to draw the smaller angle
	if (diff > 180) {
		// Swap to draw the smaller arc
		const temp = startAngle;
		startAngle = endAngle;
		endAngle = temp;
	}

	// Use the standard arc path generator
	return arcToSvgPath(vertex.x, vertex.y, radius, startAngle, endAngle);
}

/**
 * Calculate the angle at a vertex in degrees
 *
 * @param point1 - First ray point
 * @param vertex - Angle vertex
 * @param point2 - Second ray point
 * @returns Angle in degrees (always positive, 0-180)
 */
export function calculateAngle(
	point1: { x: number; y: number },
	vertex: { x: number; y: number },
	point2: { x: number; y: number }
): number {
	// Vectors from vertex to each point
	const v1x = point1.x - vertex.x;
	const v1y = point1.y - vertex.y;
	const v2x = point2.x - vertex.x;
	const v2y = point2.y - vertex.y;

	// Dot product
	const dot = v1x * v2x + v1y * v2y;

	// Magnitudes
	const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
	const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

	// Angle via acos of normalized dot product
	if (mag1 < 1e-10 || mag2 < 1e-10) {
		return 0; // Degenerate case
	}

	const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
	return Math.acos(cosAngle) * RAD_TO_DEG;
}

/**
 * Check if an angle is approximately a right angle (90 degrees)
 *
 * @param point1 - First ray point
 * @param vertex - Angle vertex
 * @param point2 - Second ray point
 * @param tolerance - Angle tolerance in degrees (default: 1)
 * @returns True if the angle is approximately 90 degrees
 */
export function isRightAngle(
	point1: { x: number; y: number },
	vertex: { x: number; y: number },
	point2: { x: number; y: number },
	tolerance: number = 1
): boolean {
	const angle = calculateAngle(point1, vertex, point2);
	return Math.abs(angle - 90) < tolerance;
}

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(angleMarkRenderer);
