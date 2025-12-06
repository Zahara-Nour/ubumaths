/**
 * Point Object Renderer
 *
 * Renders point objects as visual markers (dot, cross, circle, or invisible).
 * Points can have optional labels displayed near them.
 *
 * @module constructions/objects/point
 */

import type { PointDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import {
	createSvgElement,
	createPointMarker,
	applyTextStyle,
	type TextStyle
} from '../core/renderer';
import { DEFAULT_POINT_RADIUS, DEFAULT_COLORS, DEFAULT_FONT_SIZE } from '../constants';

// =============================================================================
// Constants
// =============================================================================

/** Default label offset from point center */
const LABEL_OFFSET_X = 8;
const LABEL_OFFSET_Y = -8;

// =============================================================================
// Point Renderer
// =============================================================================

/**
 * Renderer for point objects
 *
 * Creates SVG elements representing points with various visual styles:
 * - dot: Filled circle
 * - cross: Plus sign (+)
 * - circle: Empty circle with stroke
 * - none: Invisible (for construction points)
 *
 * Points can also display an optional text label positioned near the marker.
 *
 * @example
 * ```typescript
 * const pointDef: PointDef = {
 *   kind: 'point',
 *   id: 'A',
 *   x: 100,
 *   y: 200,
 *   pointStyle: 'dot',
 *   label: 'A'
 * };
 * ```
 */
export const pointRenderer: ObjectRenderer<PointDef> = {
	kind: 'point',

	createSvgElement(def: PointDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get SVG coordinates from computed geometry
		const pos = geometry.position;
		if (!pos) {
			throw new Error(`Point ${def.id} has no computed position`);
		}

		const svgPos = transformer.mathToSvg(pos.x, pos.y);
		const radius = def.radius ?? DEFAULT_POINT_RADIUS;
		const pointStyle = def.pointStyle ?? 'dot';
		const effectiveStyle = getEffectiveStyle(def, state);

		// Create group to hold marker and optional label
		const group = createSvgElement('g');
		group.setAttribute('data-id', def.id);
		group.setAttribute('data-kind', 'point');
		group.classList.add('construction-point');

		// Create point marker
		const marker = createPointMarker(svgPos.x, svgPos.y, radius, effectiveStyle, pointStyle);

		if (marker) {
			marker.classList.add('point-marker');
			group.appendChild(marker);
		}

		// Create label if specified
		if (def.label) {
			const labelElement = createLabel(def.label, svgPos.x, svgPos.y, radius, effectiveStyle);
			labelElement.classList.add('point-label');
			group.appendChild(labelElement);
		}

		// Apply initial state
		applyStateToElement(group, state);

		return group;
	},

	updateSvgElement(element: SVGElement, def: PointDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get updated SVG coordinates
		const pos = geometry.position;
		if (!pos) {
			return;
		}

		const svgPos = transformer.mathToSvg(pos.x, pos.y);
		const radius = def.radius ?? DEFAULT_POINT_RADIUS;
		const pointStyle = def.pointStyle ?? 'dot';
		const effectiveStyle = getEffectiveStyle(def, state);

		// Update marker position
		const marker = element.querySelector('.point-marker');
		if (marker) {
			updateMarkerPosition(marker as SVGElement, svgPos.x, svgPos.y, radius, pointStyle);

			// Update style if needed
			const color = effectiveStyle.color ?? DEFAULT_COLORS.pointFill;
			if (pointStyle === 'dot') {
				marker.setAttribute('fill', color);
			} else {
				marker.setAttribute('stroke', color);
			}
		}

		// Update label position
		const label = element.querySelector('.point-label');
		if (label) {
			label.setAttribute('x', String(svgPos.x + LABEL_OFFSET_X));
			label.setAttribute('y', String(svgPos.y + LABEL_OFFSET_Y));
		}

		// Apply state (visibility, opacity)
		applyStateToElement(element, state);
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a text label for a point
 *
 * @param text - Label text content
 * @param x - Point x coordinate (SVG space)
 * @param y - Point y coordinate (SVG space)
 * @param radius - Point marker radius
 * @param style - Style properties
 * @returns SVG text element
 */
function createLabel(
	text: string,
	x: number,
	y: number,
	radius: number,
	style: { color?: string }
): SVGTextElement {
	const textElement = createSvgElement('text');
	textElement.setAttribute('x', String(x + LABEL_OFFSET_X));
	textElement.setAttribute('y', String(y + LABEL_OFFSET_Y));
	textElement.textContent = text;

	const textStyle: TextStyle = {
		fontSize: DEFAULT_FONT_SIZE,
		color: style.color ?? DEFAULT_COLORS.text,
		anchor: 'start',
		baseline: 'alphabetic'
	};

	applyTextStyle(textElement, textStyle);

	return textElement;
}

/**
 * Update marker position based on point style
 *
 * @param marker - SVG marker element
 * @param x - New x coordinate (SVG space)
 * @param y - New y coordinate (SVG space)
 * @param radius - Marker radius
 * @param pointStyle - Point visual style
 */
function updateMarkerPosition(
	marker: SVGElement,
	x: number,
	y: number,
	radius: number,
	pointStyle: 'dot' | 'cross' | 'circle' | 'none'
): void {
	if (pointStyle === 'dot' || pointStyle === 'circle') {
		// Circle element - update cx and cy
		marker.setAttribute('cx', String(x));
		marker.setAttribute('cy', String(y));
	} else if (pointStyle === 'cross') {
		// Path element - recalculate path
		const halfSize = radius;
		const path = `M ${x - halfSize} ${y} L ${x + halfSize} ${y} M ${x} ${y - halfSize} L ${x} ${y + halfSize}`;
		marker.setAttribute('d', path);
	}
}

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(pointRenderer);
