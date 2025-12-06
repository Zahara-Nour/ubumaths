/**
 * Line Object Renderer
 *
 * Renders infinite lines passing through two points.
 * The line extends to the canvas boundaries in both directions.
 *
 * @module constructions/objects/line
 */

import type { LineDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import { createSvgElement, applyLineStyle, segmentToSvgLine } from '../core/renderer';

// =============================================================================
// Line Renderer
// =============================================================================

/**
 * Renderer for infinite line objects
 *
 * Creates SVG line elements representing infinite lines through two points.
 * The line is clipped to the canvas boundaries but visually extends
 * beyond the two defining points.
 *
 * @example
 * ```typescript
 * const lineDef: LineDef = {
 *   kind: 'line',
 *   id: 'line1',
 *   through1: 'A',    // Reference to point A
 *   through2: 'B',    // Reference to point B
 *   style: { color: '#6b7280', lineStyle: 'dashed' }
 * };
 * ```
 */
export const lineRenderer: ObjectRenderer<LineDef> = {
	kind: 'line',

	createSvgElement(def: LineDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get the two points defining the line
		const pos1 = geometry.position;
		const pos2 = geometry.position2;

		if (!pos1 || !pos2) {
			throw new Error(`Line ${def.id} has incomplete geometry`);
		}

		// Calculate line equation and extend to canvas boundaries
		const extended = extendLineToCanvas(
			pos1.x,
			pos1.y,
			pos2.x,
			pos2.y,
			transformer.canvas.width,
			transformer.canvas.height,
			transformer
		);

		const effectiveStyle = getEffectiveStyle(def, state);

		// Create path element
		const path = createSvgElement('path');
		path.setAttribute('data-id', def.id);
		path.setAttribute('data-kind', 'line');
		path.classList.add('construction-line');

		// Set path
		const pathData = segmentToSvgLine(extended.x1, extended.y1, extended.x2, extended.y2);
		path.setAttribute('d', pathData);

		// Apply style
		applyLineStyle(path, effectiveStyle);
		path.setAttribute('fill', 'none');

		// Apply initial state
		applyStateToElement(path, state);

		return path;
	},

	updateSvgElement(element: SVGElement, def: LineDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get the two points defining the line
		const pos1 = geometry.position;
		const pos2 = geometry.position2;

		if (!pos1 || !pos2) {
			return;
		}

		// Recalculate extended line
		const extended = extendLineToCanvas(
			pos1.x,
			pos1.y,
			pos2.x,
			pos2.y,
			transformer.canvas.width,
			transformer.canvas.height,
			transformer
		);

		const effectiveStyle = getEffectiveStyle(def, state);

		// Update path
		const pathData = segmentToSvgLine(extended.x1, extended.y1, extended.x2, extended.y2);
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
 * Extend a line segment to the canvas boundaries
 *
 * Given two points defining a line, calculates where the line
 * intersects the canvas boundaries and returns those intersection points.
 *
 * @param x1 - First point x (math coordinates)
 * @param y1 - First point y (math coordinates)
 * @param x2 - Second point x (math coordinates)
 * @param y2 - Second point y (math coordinates)
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param transformer - Coordinate transformer
 * @returns Extended line endpoints in SVG coordinates
 */
function extendLineToCanvas(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	canvasWidth: number,
	canvasHeight: number,
	transformer: { mathToSvg: (x: number, y: number) => { x: number; y: number } }
): { x1: number; y1: number; x2: number; y2: number } {
	// Transform to SVG coordinates first
	const svgP1 = transformer.mathToSvg(x1, y1);
	const svgP2 = transformer.mathToSvg(x2, y2);

	// Direction vector
	const dx = svgP2.x - svgP1.x;
	const dy = svgP2.y - svgP1.y;

	// Handle vertical line
	if (Math.abs(dx) < 1e-10) {
		return {
			x1: svgP1.x,
			y1: 0,
			x2: svgP1.x,
			y2: canvasHeight
		};
	}

	// Handle horizontal line
	if (Math.abs(dy) < 1e-10) {
		return {
			x1: 0,
			y1: svgP1.y,
			x2: canvasWidth,
			y2: svgP1.y
		};
	}

	// Calculate intersections with canvas boundaries
	const intersections: { x: number; y: number }[] = [];

	// Left edge (x = 0)
	const tLeft = (0 - svgP1.x) / dx;
	const yLeft = svgP1.y + tLeft * dy;
	if (yLeft >= 0 && yLeft <= canvasHeight) {
		intersections.push({ x: 0, y: yLeft });
	}

	// Right edge (x = canvasWidth)
	const tRight = (canvasWidth - svgP1.x) / dx;
	const yRight = svgP1.y + tRight * dy;
	if (yRight >= 0 && yRight <= canvasHeight) {
		intersections.push({ x: canvasWidth, y: yRight });
	}

	// Top edge (y = 0)
	const tTop = (0 - svgP1.y) / dy;
	const xTop = svgP1.x + tTop * dx;
	if (xTop >= 0 && xTop <= canvasWidth) {
		intersections.push({ x: xTop, y: 0 });
	}

	// Bottom edge (y = canvasHeight)
	const tBottom = (canvasHeight - svgP1.y) / dy;
	const xBottom = svgP1.x + tBottom * dx;
	if (xBottom >= 0 && xBottom <= canvasWidth) {
		intersections.push({ x: xBottom, y: canvasHeight });
	}

	// Return two distinct intersection points
	if (intersections.length >= 2) {
		return {
			x1: intersections[0].x,
			y1: intersections[0].y,
			x2: intersections[1].x,
			y2: intersections[1].y
		};
	}

	// Fallback: return original segment if no intersections found
	return {
		x1: svgP1.x,
		y1: svgP1.y,
		x2: svgP2.x,
		y2: svgP2.y
	};
}

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(lineRenderer);
