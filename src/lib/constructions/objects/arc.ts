/**
 * Arc Object Renderer
 *
 * Renders arc objects (portions of circles) defined by center,
 * radius, start angle, and end angle.
 *
 * @module constructions/objects/arc
 */

import type { ArcDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import { createSvgElement, applyLineStyle, arcToSvgPath, partialArcPath } from '../core/renderer';

// =============================================================================
// Arc Renderer
// =============================================================================

/**
 * Renderer for arc objects
 *
 * Creates SVG path elements representing arcs (portions of circles).
 * Arcs are defined by:
 * - Center point
 * - Radius
 * - Start angle (in degrees, counterclockwise from positive x-axis)
 * - End angle (in degrees)
 *
 * Supports progressive drawing animation via drawProgress state.
 *
 * @example
 * ```typescript
 * const arcDef: ArcDef = {
 *   kind: 'arc',
 *   id: 'arc1',
 *   center: 'O',
 *   radius: 50,
 *   startAngle: 0,
 *   endAngle: 90,
 *   style: { color: '#ea580c' }
 * };
 * ```
 */
export const arcRenderer: ObjectRenderer<ArcDef> = {
	kind: 'arc',

	createSvgElement(def: ArcDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get arc geometry
		const center = geometry.position;
		const radius = geometry.radius;
		const startAngle = geometry.startAngle;
		const endAngle = geometry.endAngle;

		if (!center || radius === undefined || startAngle === undefined || endAngle === undefined) {
			throw new Error(`Arc ${def.id} has incomplete geometry`);
		}

		// Transform to SVG coordinates
		const svgCenter = transformer.mathToSvg(center.x, center.y);
		const svgRadius = radius * ((transformer.scaleX + transformer.scaleY) / 2);
		const effectiveStyle = getEffectiveStyle(def, state);

		// Create path element
		const path = createSvgElement('path');
		path.setAttribute('data-id', def.id);
		path.setAttribute('data-kind', 'arc');
		path.classList.add('construction-arc');

		// Calculate path based on draw progress
		const progress = state.drawProgress ?? 1;
		const pathData = getArcPath(
			svgCenter.x,
			svgCenter.y,
			svgRadius,
			startAngle,
			endAngle,
			progress
		);
		path.setAttribute('d', pathData);

		// Apply style
		applyLineStyle(path, effectiveStyle);
		path.setAttribute('fill', 'none');

		// Store geometry for updates
		path.setAttribute('data-cx', String(svgCenter.x));
		path.setAttribute('data-cy', String(svgCenter.y));
		path.setAttribute('data-r', String(svgRadius));
		path.setAttribute('data-start', String(startAngle));
		path.setAttribute('data-end', String(endAngle));

		// Apply initial state
		applyStateToElement(path, state);

		return path;
	},

	updateSvgElement(element: SVGElement, def: ArcDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get updated geometry
		const center = geometry.position;
		const radius = geometry.radius;
		const startAngle = geometry.startAngle;
		const endAngle = geometry.endAngle;

		if (!center || radius === undefined || startAngle === undefined || endAngle === undefined) {
			return;
		}

		// Transform to SVG coordinates
		const svgCenter = transformer.mathToSvg(center.x, center.y);
		const svgRadius = radius * ((transformer.scaleX + transformer.scaleY) / 2);
		const effectiveStyle = getEffectiveStyle(def, state);

		// Update path based on draw progress
		const progress = state.drawProgress ?? 1;
		const pathData = getArcPath(
			svgCenter.x,
			svgCenter.y,
			svgRadius,
			startAngle,
			endAngle,
			progress
		);
		element.setAttribute('d', pathData);

		// Update stored geometry
		element.setAttribute('data-cx', String(svgCenter.x));
		element.setAttribute('data-cy', String(svgCenter.y));
		element.setAttribute('data-r', String(svgRadius));
		element.setAttribute('data-start', String(startAngle));
		element.setAttribute('data-end', String(endAngle));

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
 * Get SVG path data for an arc with optional draw progress
 *
 * @param cx - Center x coordinate (SVG space)
 * @param cy - Center y coordinate (SVG space)
 * @param r - Radius (SVG space)
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @param progress - Draw progress (0-1)
 * @returns SVG path data string
 */
function getArcPath(
	cx: number,
	cy: number,
	r: number,
	startAngle: number,
	endAngle: number,
	progress: number
): string {
	if (progress <= 0) {
		return '';
	}

	if (progress >= 1) {
		// Full arc
		return arcToSvgPath(cx, cy, r, startAngle, endAngle);
	}

	// Partial arc based on progress
	const actualEndAngle = startAngle + (endAngle - startAngle) * progress;
	return partialArcPath(cx, cy, r, startAngle, actualEndAngle, 1);
}

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(arcRenderer);
