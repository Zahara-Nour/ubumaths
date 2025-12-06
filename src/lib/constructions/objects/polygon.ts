/**
 * Polygon Object Renderer
 *
 * Renders polygon objects defined by an ordered list of vertices.
 * Supports filled and stroked polygons.
 *
 * @module constructions/objects/polygon
 */

import type { PolygonDef } from '../types';
import type { ObjectRenderer, RenderContext } from './base';
import { registerObjectRenderer, applyStateToElement, getEffectiveStyle } from './base';
import {
	createSvgElement,
	applyLineStyle,
	applyFillStyle,
	polygonToSvgPath
} from '../core/renderer';
import { DEFAULT_COLORS } from '../constants';

// =============================================================================
// Polygon Renderer
// =============================================================================

/**
 * Renderer for polygon objects
 *
 * Creates SVG path elements representing closed polygons.
 * Polygons are defined by an ordered list of vertices (point IDs or
 * inline coordinates).
 *
 * @example
 * ```typescript
 * const triangleDef: PolygonDef = {
 *   kind: 'polygon',
 *   id: 'triangle',
 *   vertices: ['A', 'B', 'C'],  // References to points
 *   filled: true,
 *   fillColor: '#93c5fd',
 *   style: { color: '#1e40af', lineWidth: 2 }
 * };
 *
 * // Or with inline coordinates
 * const squareDef: PolygonDef = {
 *   kind: 'polygon',
 *   id: 'square',
 *   vertices: [
 *     { x: 0, y: 0 },
 *     { x: 100, y: 0 },
 *     { x: 100, y: 100 },
 *     { x: 0, y: 100 }
 *   ]
 * };
 * ```
 */
export const polygonRenderer: ObjectRenderer<PolygonDef> = {
	kind: 'polygon',

	createSvgElement(def: PolygonDef, context: RenderContext): SVGElement {
		const { transformer, geometry, state } = context;

		// Get vertices from computed geometry
		const vertices = geometry.vertices;

		if (!vertices || vertices.length < 3) {
			throw new Error(`Polygon ${def.id} needs at least 3 vertices`);
		}

		// Transform vertices to SVG coordinates
		const svgVertices = vertices.map((v) => transformer.mathToSvg(v.x, v.y));
		const effectiveStyle = getEffectiveStyle(def, state);

		// Create group to hold fill and stroke
		const group = createSvgElement('g');
		group.setAttribute('data-id', def.id);
		group.setAttribute('data-kind', 'polygon');
		group.classList.add('construction-polygon');

		// Create fill path if filled
		if (def.filled) {
			const fillPath = createSvgElement('path');
			fillPath.classList.add('polygon-fill');
			fillPath.setAttribute('d', polygonToSvgPath(svgVertices, true));
			fillPath.setAttribute('stroke', 'none');

			const fillColor = def.fillColor ?? effectiveStyle.color ?? DEFAULT_COLORS.primary;
			applyFillStyle(fillPath, fillColor, 0.3);

			group.appendChild(fillPath);
		}

		// Create stroke path
		const strokePath = createSvgElement('path');
		strokePath.classList.add('polygon-stroke');
		strokePath.setAttribute('d', polygonToSvgPath(svgVertices, true));

		// Apply line style
		applyLineStyle(strokePath, effectiveStyle);
		strokePath.setAttribute('fill', 'none');

		group.appendChild(strokePath);

		// Apply initial state
		applyStateToElement(group, state);

		return group;
	},

	updateSvgElement(element: SVGElement, def: PolygonDef, context: RenderContext): void {
		const { transformer, geometry, state } = context;

		// Get updated vertices
		const vertices = geometry.vertices;

		if (!vertices || vertices.length < 3) {
			return;
		}

		// Transform vertices to SVG coordinates
		const svgVertices = vertices.map((v) => transformer.mathToSvg(v.x, v.y));
		const effectiveStyle = getEffectiveStyle(def, state);
		const pathData = polygonToSvgPath(svgVertices, true);

		// Update fill path
		const fillPath = element.querySelector('.polygon-fill');
		if (fillPath) {
			fillPath.setAttribute('d', pathData);
			const fillColor = def.fillColor ?? effectiveStyle.color ?? DEFAULT_COLORS.primary;
			applyFillStyle(fillPath as SVGElement, fillColor, 0.3);
		}

		// Update stroke path
		const strokePath = element.querySelector('.polygon-stroke');
		if (strokePath) {
			strokePath.setAttribute('d', pathData);
			applyLineStyle(strokePath as SVGElement, effectiveStyle);
		}

		// Apply state (visibility, opacity)
		applyStateToElement(element, state);
	}
};

// =============================================================================
// Registration
// =============================================================================

registerObjectRenderer(polygonRenderer);
