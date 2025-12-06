/**
 * Segment Object Renderer
 *
 * Renders segment objects as lines between two points.
 * Supports progressive drawing animation via drawProgress state.
 *
 * @module constructions/objects/segment
 */

import type { SegmentDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import { createSvgElement, applyLineStyle, partialSegmentPath } from '../core/renderer';

// =============================================================================
// Segment Renderer
// =============================================================================

/**
 * Renderer for segment objects
 *
 * Creates SVG line elements representing segments between two points.
 * The segment endpoints can be:
 * - References to existing point objects (by ID)
 * - Inline coordinate expressions
 *
 * Supports draw animation through the drawProgress state property,
 * which controls how much of the segment is visible (0-1).
 *
 * @example
 * ```typescript
 * const segmentDef: SegmentDef = {
 *   kind: 'segment',
 *   id: 'AB',
 *   from: 'A',  // Reference to point A
 *   to: 'B',    // Reference to point B
 *   style: { color: '#1e40af', lineWidth: 2 }
 * };
 *
 * // Or with inline coordinates
 * const segmentDef2: SegmentDef = {
 *   kind: 'segment',
 *   id: 'seg1',
 *   from: { x: 100, y: 200 },
 *   to: { x: 300, y: 400 }
 * };
 * ```
 */
export const segmentRenderer: ObjectRenderer<SegmentDef> = {
	kind: 'segment',

	createSvgElement(def: SegmentDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get SVG coordinates from computed geometry
		const pos1 = geometry.position;
		const pos2 = geometry.position2;

		if (!pos1 || !pos2) {
			throw new Error(`Segment ${def.id} has incomplete geometry`);
		}

		const svgStart = transformer.mathToSvg(pos1.x, pos1.y);
		const svgEnd = transformer.mathToSvg(pos2.x, pos2.y);
		const effectiveStyle = getEffectiveStyle(def, state);

		// Create path element (using path instead of line for animation support)
		const path = createSvgElement('path');
		path.setAttribute('data-id', def.id);
		path.setAttribute('data-kind', 'segment');
		path.classList.add('construction-segment');

		// Set initial path based on draw progress
		const progress = state.drawProgress ?? 1;
		const pathData = partialSegmentPath(svgStart.x, svgStart.y, svgEnd.x, svgEnd.y, progress);
		path.setAttribute('d', pathData);

		// Apply style
		applyLineStyle(path, effectiveStyle);
		path.setAttribute('fill', 'none');

		// Store endpoint coordinates for updates
		path.setAttribute('data-x1', String(svgStart.x));
		path.setAttribute('data-y1', String(svgStart.y));
		path.setAttribute('data-x2', String(svgEnd.x));
		path.setAttribute('data-y2', String(svgEnd.y));

		// Apply initial state
		applyStateToElement(path, state);

		return path;
	},

	updateSvgElement(element: SVGElement, def: SegmentDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get updated SVG coordinates
		const pos1 = geometry.position;
		const pos2 = geometry.position2;

		if (!pos1 || !pos2) {
			return;
		}

		const svgStart = transformer.mathToSvg(pos1.x, pos1.y);
		const svgEnd = transformer.mathToSvg(pos2.x, pos2.y);
		const effectiveStyle = getEffectiveStyle(def, state);

		// Update path based on draw progress
		const progress = state.drawProgress ?? 1;
		const pathData = partialSegmentPath(svgStart.x, svgStart.y, svgEnd.x, svgEnd.y, progress);
		element.setAttribute('d', pathData);

		// Update stored coordinates
		element.setAttribute('data-x1', String(svgStart.x));
		element.setAttribute('data-y1', String(svgStart.y));
		element.setAttribute('data-x2', String(svgEnd.x));
		element.setAttribute('data-y2', String(svgEnd.y));

		// Update style
		applyLineStyle(element, effectiveStyle);

		// Apply state (visibility, opacity)
		applyStateToElement(element, state);
	}
};

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(segmentRenderer);
