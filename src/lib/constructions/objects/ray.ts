/**
 * Ray Object Renderer
 *
 * Renders rays (half-lines) starting from an origin point
 * and extending through another point to the canvas boundary.
 *
 * @module constructions/objects/ray
 */

import type { RayDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import { createSvgElement, applyLineStyle, segmentToSvgLine } from '../core/renderer';

// =============================================================================
// Ray Renderer
// =============================================================================

/**
 * Renderer for ray objects
 *
 * Creates SVG line elements representing rays (half-lines).
 * A ray starts at an origin point and extends infinitely in the direction
 * of a second point, clipped to the canvas boundary.
 *
 * @example
 * ```typescript
 * const rayDef: RayDef = {
 *   kind: 'ray',
 *   id: 'ray1',
 *   from: 'A',       // Origin point
 *   through: 'B',    // Direction point
 *   style: { color: '#16a34a' }
 * };
 * ```
 */
export const rayRenderer: ObjectRenderer<RayDef> = {
	kind: 'ray',

	createSvgElement(def: RayDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get origin and direction points
		const origin = geometry.position;
		const direction = geometry.position2;

		if (!origin || !direction) {
			throw new Error(`Ray ${def.id} has incomplete geometry`);
		}

		// Calculate ray endpoint at canvas boundary
		const extended = extendRayToCanvas(
			origin.x,
			origin.y,
			direction.x,
			direction.y,
			transformer.canvas.width,
			transformer.canvas.height,
			transformer
		);

		const effectiveStyle = getEffectiveStyle(def, state);

		// Create path element
		const path = createSvgElement('path');
		path.setAttribute('data-id', def.id);
		path.setAttribute('data-kind', 'ray');
		path.classList.add('construction-ray');

		// Set path from origin to canvas boundary
		const svgOrigin = transformer.mathToSvg(origin.x, origin.y);
		const pathData = segmentToSvgLine(svgOrigin.x, svgOrigin.y, extended.x, extended.y);
		path.setAttribute('d', pathData);

		// Apply style
		applyLineStyle(path, effectiveStyle);
		path.setAttribute('fill', 'none');

		// Apply initial state
		applyStateToElement(path, state);

		return path;
	},

	updateSvgElement(element: SVGElement, def: RayDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get origin and direction points
		const origin = geometry.position;
		const direction = geometry.position2;

		if (!origin || !direction) {
			return;
		}

		// Recalculate ray endpoint
		const extended = extendRayToCanvas(
			origin.x,
			origin.y,
			direction.x,
			direction.y,
			transformer.canvas.width,
			transformer.canvas.height,
			transformer
		);

		const effectiveStyle = getEffectiveStyle(def, state);

		// Update path
		const svgOrigin = transformer.mathToSvg(origin.x, origin.y);
		const pathData = segmentToSvgLine(svgOrigin.x, svgOrigin.y, extended.x, extended.y);
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
 * Extend a ray from origin through direction point to canvas boundary
 *
 * @param originX - Origin x (math coordinates)
 * @param originY - Origin y (math coordinates)
 * @param dirX - Direction point x (math coordinates)
 * @param dirY - Direction point y (math coordinates)
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param transformer - Coordinate transformer
 * @returns Extended endpoint in SVG coordinates
 */
function extendRayToCanvas(
	originX: number,
	originY: number,
	dirX: number,
	dirY: number,
	canvasWidth: number,
	canvasHeight: number,
	transformer: { mathToSvg: (x: number, y: number) => { x: number; y: number } }
): { x: number; y: number } {
	// Transform to SVG coordinates
	const svgOrigin = transformer.mathToSvg(originX, originY);
	const svgDir = transformer.mathToSvg(dirX, dirY);

	// Direction vector (from origin toward direction point)
	const dx = svgDir.x - svgOrigin.x;
	const dy = svgDir.y - svgOrigin.y;

	// Handle degenerate case (origin equals direction)
	if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
		return { x: svgOrigin.x, y: svgOrigin.y };
	}

	// Find intersection with canvas boundaries in the direction of the ray
	// We need positive t values (extending from origin toward direction)
	let tMax = Infinity;

	// Check each boundary
	if (dx > 1e-10) {
		// Moving right, check right edge
		const t = (canvasWidth - svgOrigin.x) / dx;
		if (t > 0) tMax = Math.min(tMax, t);
	} else if (dx < -1e-10) {
		// Moving left, check left edge
		const t = (0 - svgOrigin.x) / dx;
		if (t > 0) tMax = Math.min(tMax, t);
	}

	if (dy > 1e-10) {
		// Moving down (SVG y), check bottom edge
		const t = (canvasHeight - svgOrigin.y) / dy;
		if (t > 0) tMax = Math.min(tMax, t);
	} else if (dy < -1e-10) {
		// Moving up (SVG y), check top edge
		const t = (0 - svgOrigin.y) / dy;
		if (t > 0) tMax = Math.min(tMax, t);
	}

	// Calculate endpoint
	if (tMax === Infinity) {
		// Fallback: just extend a reasonable distance
		tMax = 10;
	}

	return {
		x: svgOrigin.x + dx * tMax,
		y: svgOrigin.y + dy * tMax
	};
}

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(rayRenderer);
