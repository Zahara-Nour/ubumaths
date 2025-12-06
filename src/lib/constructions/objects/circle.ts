/**
 * Circle Object Renderer
 *
 * Renders circle objects as SVG circles or paths.
 * Supports filled and stroked circles, and progressive drawing animation.
 *
 * @module constructions/objects/circle
 */

import type { CircleDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import {
	createSvgElement,
	applyLineStyle,
	applyFillStyle,
	circleToSvgPath,
	partialArcPath
} from '../core/renderer';
import { DEFAULT_COLORS } from '../constants';

// =============================================================================
// Circle Renderer
// =============================================================================

/**
 * Renderer for circle objects
 *
 * Creates SVG elements representing circles. Circles can be:
 * - Stroked only (default)
 * - Filled with a color
 * - Both stroked and filled
 *
 * Supports draw animation through the drawProgress state property,
 * which controls how much of the circle arc is visible (0-1).
 *
 * @example
 * ```typescript
 * const circleDef: CircleDef = {
 *   kind: 'circle',
 *   id: 'c1',
 *   center: 'O',     // Reference to point O
 *   radius: 100,     // Or expression like "$radius"
 *   style: { color: '#1e40af', lineWidth: 2 }
 * };
 *
 * // Filled circle
 * const filledCircle: CircleDef = {
 *   kind: 'circle',
 *   id: 'c2',
 *   center: { x: 200, y: 200 },
 *   radius: 50,
 *   filled: true,
 *   fillColor: '#93c5fd'
 * };
 * ```
 */
export const circleRenderer: ObjectRenderer<CircleDef> = {
	kind: 'circle',

	createSvgElement(def: CircleDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get center position and radius from computed geometry
		const center = geometry.position;
		const radius = geometry.radius;

		if (!center || radius === undefined) {
			throw new Error(`Circle ${def.id} has incomplete geometry`);
		}

		// Transform center to SVG coordinates
		const svgCenter = transformer.mathToSvg(center.x, center.y);
		// Scale radius to SVG (use average of x and y scale for uniform scaling)
		const svgRadius = radius * ((transformer.scaleX + transformer.scaleY) / 2);
		const effectiveStyle = getEffectiveStyle(def, state);

		// Create group to hold circle and optional fill
		const group = createSvgElement('g');
		group.setAttribute('data-id', def.id);
		group.setAttribute('data-kind', 'circle');
		group.classList.add('construction-circle');

		// Create fill element if filled
		if (def.filled) {
			const fillCircle = createSvgElement('circle');
			fillCircle.classList.add('circle-fill');
			fillCircle.setAttribute('cx', String(svgCenter.x));
			fillCircle.setAttribute('cy', String(svgCenter.y));
			fillCircle.setAttribute('r', String(svgRadius));
			fillCircle.setAttribute('stroke', 'none');

			const fillColor = def.fillColor ?? effectiveStyle.color ?? DEFAULT_COLORS.primary;
			applyFillStyle(fillCircle, fillColor, 0.3);

			group.appendChild(fillCircle);
		}

		// Create stroke element (path for animation support)
		const strokePath = createSvgElement('path');
		strokePath.classList.add('circle-stroke');

		// Calculate path based on draw progress
		const progress = state.drawProgress ?? 1;
		const pathData = getCirclePath(svgCenter.x, svgCenter.y, svgRadius, progress);
		strokePath.setAttribute('d', pathData);

		// Apply line style
		applyLineStyle(strokePath, effectiveStyle);
		strokePath.setAttribute('fill', 'none');

		group.appendChild(strokePath);

		// Store geometry data for updates
		group.setAttribute('data-cx', String(svgCenter.x));
		group.setAttribute('data-cy', String(svgCenter.y));
		group.setAttribute('data-r', String(svgRadius));

		// Apply initial state
		applyStateToElement(group, state);

		return group;
	},

	updateSvgElement(element: SVGElement, def: CircleDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get updated geometry
		const center = geometry.position;
		const radius = geometry.radius;

		if (!center || radius === undefined) {
			return;
		}

		// Transform to SVG coordinates
		const svgCenter = transformer.mathToSvg(center.x, center.y);
		const svgRadius = radius * ((transformer.scaleX + transformer.scaleY) / 2);
		const effectiveStyle = getEffectiveStyle(def, state);
		const progress = state.drawProgress ?? 1;

		// Update fill circle if present
		const fillCircle = element.querySelector('.circle-fill');
		if (fillCircle) {
			fillCircle.setAttribute('cx', String(svgCenter.x));
			fillCircle.setAttribute('cy', String(svgCenter.y));
			fillCircle.setAttribute('r', String(svgRadius));

			const fillColor = def.fillColor ?? effectiveStyle.color ?? DEFAULT_COLORS.primary;
			applyFillStyle(fillCircle as SVGElement, fillColor, 0.3);
		}

		// Update stroke path
		const strokePath = element.querySelector('.circle-stroke');
		if (strokePath) {
			const pathData = getCirclePath(svgCenter.x, svgCenter.y, svgRadius, progress);
			strokePath.setAttribute('d', pathData);
			applyLineStyle(strokePath as SVGElement, effectiveStyle);
		}

		// Update stored geometry
		element.setAttribute('data-cx', String(svgCenter.x));
		element.setAttribute('data-cy', String(svgCenter.y));
		element.setAttribute('data-r', String(svgRadius));

		// Apply state (visibility, opacity)
		applyStateToElement(element, state);
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get SVG path data for a circle with optional draw progress
 *
 * @param cx - Center x coordinate (SVG space)
 * @param cy - Center y coordinate (SVG space)
 * @param r - Radius (SVG space)
 * @param progress - Draw progress (0-1)
 * @returns SVG path data string
 */
function getCirclePath(cx: number, cy: number, r: number, progress: number): string {
	if (progress >= 1) {
		// Full circle
		return circleToSvgPath(cx, cy, r);
	}

	if (progress <= 0) {
		// Empty path
		return '';
	}

	// Partial arc (start from top, go clockwise in SVG space)
	const startAngle = 90; // Top of circle
	const endAngle = 90 - progress * 360; // Progress determines arc length
	return partialArcPath(cx, cy, r, startAngle, endAngle, 1);
}

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(circleRenderer);
