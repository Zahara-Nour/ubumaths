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
import {
	createSvgElement,
	createGroup,
	applyLineStyle,
	partialSegmentPath,
	arrowheadPath,
	calculateAngle
} from '../core/renderer';

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
		const progress = state.drawProgress ?? 1;

		// If no arrowheads, use simple path element
		if (!def.arrowHead) {
			const path = createSvgElement('path');
			path.setAttribute('data-id', def.id);
			path.setAttribute('data-kind', 'segment');
			path.classList.add('construction-segment');

			const pathData = partialSegmentPath(svgStart.x, svgStart.y, svgEnd.x, svgEnd.y, progress);
			path.setAttribute('d', pathData);

			applyLineStyle(path, effectiveStyle);
			path.setAttribute('fill', 'none');

			path.setAttribute('data-x1', String(svgStart.x));
			path.setAttribute('data-y1', String(svgStart.y));
			path.setAttribute('data-x2', String(svgEnd.x));
			path.setAttribute('data-y2', String(svgEnd.y));

			applyStateToElement(path, state);
			return path;
		}

		// With arrowheads, use a group containing line + arrowhead paths
		const group = createGroup();
		group.setAttribute('data-id', def.id);
		group.setAttribute('data-kind', 'segment');
		group.classList.add('construction-segment');

		// Create the line path
		const linePath = createSvgElement('path');
		linePath.classList.add('segment-line');
		const linePathData = partialSegmentPath(svgStart.x, svgStart.y, svgEnd.x, svgEnd.y, progress);
		linePath.setAttribute('d', linePathData);
		applyLineStyle(linePath, effectiveStyle);
		linePath.setAttribute('fill', 'none');
		group.appendChild(linePath);

		// Create arrowhead(s) if visible
		if (progress > 0) {
			const angle = calculateAngle(svgStart.x, svgStart.y, svgEnd.x, svgEnd.y);
			const arrowSize = (effectiveStyle.lineWidth ?? 1) * 5 + 5;

			// End arrowhead (at svgEnd)
			if (def.arrowHead === 'end' || def.arrowHead === 'both') {
				const currentX = svgStart.x + (svgEnd.x - svgStart.x) * progress;
				const currentY = svgStart.y + (svgEnd.y - svgStart.y) * progress;
				const arrowPath = createSvgElement('path');
				arrowPath.classList.add('segment-arrow-end');
				arrowPath.setAttribute('d', arrowheadPath(currentX, currentY, angle, arrowSize));
				applyLineStyle(arrowPath, effectiveStyle);
				arrowPath.setAttribute('fill', 'none');
				group.appendChild(arrowPath);
			}

			// Start arrowhead (at svgStart, pointing backward)
			if (def.arrowHead === 'start' || def.arrowHead === 'both') {
				const arrowPath = createSvgElement('path');
				arrowPath.classList.add('segment-arrow-start');
				arrowPath.setAttribute(
					'd',
					arrowheadPath(svgStart.x, svgStart.y, angle + Math.PI, arrowSize)
				);
				applyLineStyle(arrowPath, effectiveStyle);
				arrowPath.setAttribute('fill', 'none');
				group.appendChild(arrowPath);
			}
		}

		// Store coordinates for updates
		group.setAttribute('data-x1', String(svgStart.x));
		group.setAttribute('data-y1', String(svgStart.y));
		group.setAttribute('data-x2', String(svgEnd.x));
		group.setAttribute('data-y2', String(svgEnd.y));

		applyStateToElement(group, state);
		return group;
	},

	updateSvgElement(element: SVGElement, def: SegmentDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		const pos1 = geometry.position;
		const pos2 = geometry.position2;

		if (!pos1 || !pos2) {
			return;
		}

		const svgStart = transformer.mathToSvg(pos1.x, pos1.y);
		const svgEnd = transformer.mathToSvg(pos2.x, pos2.y);
		const effectiveStyle = getEffectiveStyle(def, state);
		const progress = state.drawProgress ?? 1;

		// Simple path without arrowheads
		if (!def.arrowHead) {
			const pathData = partialSegmentPath(svgStart.x, svgStart.y, svgEnd.x, svgEnd.y, progress);
			element.setAttribute('d', pathData);
			element.setAttribute('data-x1', String(svgStart.x));
			element.setAttribute('data-y1', String(svgStart.y));
			element.setAttribute('data-x2', String(svgEnd.x));
			element.setAttribute('data-y2', String(svgEnd.y));
			applyLineStyle(element, effectiveStyle);
			applyStateToElement(element, state);
			return;
		}

		// Group with arrowheads
		const linePath = element.querySelector('.segment-line');
		if (linePath) {
			const linePathData = partialSegmentPath(svgStart.x, svgStart.y, svgEnd.x, svgEnd.y, progress);
			linePath.setAttribute('d', linePathData);
			applyLineStyle(linePath as SVGElement, effectiveStyle);
		}

		const angle = calculateAngle(svgStart.x, svgStart.y, svgEnd.x, svgEnd.y);
		const arrowSize = (effectiveStyle.lineWidth ?? 1) * 5 + 5;

		// Update end arrowhead
		const endArrow = element.querySelector('.segment-arrow-end');
		if (endArrow && progress > 0) {
			const currentX = svgStart.x + (svgEnd.x - svgStart.x) * progress;
			const currentY = svgStart.y + (svgEnd.y - svgStart.y) * progress;
			endArrow.setAttribute('d', arrowheadPath(currentX, currentY, angle, arrowSize));
			applyLineStyle(endArrow as SVGElement, effectiveStyle);
			(endArrow as SVGElement).style.visibility = 'visible';
		} else if (endArrow) {
			(endArrow as SVGElement).style.visibility = 'hidden';
		}

		// Update start arrowhead
		const startArrow = element.querySelector('.segment-arrow-start');
		if (startArrow && progress > 0) {
			startArrow.setAttribute(
				'd',
				arrowheadPath(svgStart.x, svgStart.y, angle + Math.PI, arrowSize)
			);
			applyLineStyle(startArrow as SVGElement, effectiveStyle);
			(startArrow as SVGElement).style.visibility = 'visible';
		} else if (startArrow) {
			(startArrow as SVGElement).style.visibility = 'hidden';
		}

		element.setAttribute('data-x1', String(svgStart.x));
		element.setAttribute('data-y1', String(svgStart.y));
		element.setAttribute('data-x2', String(svgEnd.x));
		element.setAttribute('data-y2', String(svgEnd.y));

		applyStateToElement(element, state);
	}
};

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(segmentRenderer);
