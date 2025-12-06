/**
 * Pencil Instrument Renderer - SVG rendering for the drawing pencil
 *
 * This module provides the renderer for the pencil instrument used in
 * geometric constructions. The pencil can trace lines on the canvas
 * and is used in conjunction with the ruler for precise drawings.
 *
 * Design:
 * - Realistic pencil shape with hexagonal body
 * - Sharpened tip with graphite point
 * - Eraser end (pink)
 * - Optional trace line showing the path
 *
 * Coordinate system:
 * - Origin (0,0) is at the tip of the pencil
 * - The pencil body extends upward (negative y)
 * - Rotation is applied around the tip
 *
 * @module constructions/instruments/pencil
 */

import type { InstrumentRuntimeState } from '../types';
import type { InstrumentRenderer } from './base';
import { registerInstrumentRenderer } from './base';
import { createSvgElement, createGroup } from '../core/renderer';

// =============================================================================
// Pencil Constants
// =============================================================================

/**
 * Pencil dimensions in pixels
 */
const PENCIL_LENGTH = 120; // Total length of the pencil
const PENCIL_BODY_WIDTH = 10; // Width of the hexagonal body
const PENCIL_TIP_LENGTH = 15; // Length of the sharpened tip
const PENCIL_ERASER_LENGTH = 12; // Length of the eraser end
const PENCIL_FERRULE_LENGTH = 6; // Metal band holding eraser

/**
 * Pencil visual styles
 */
const PENCIL_BODY_COLOR = '#FCD34D'; // Yellow pencil body
const PENCIL_BODY_STRIPE = '#F59E0B'; // Darker yellow stripe
const PENCIL_WOOD_COLOR = '#D97706'; // Exposed wood at tip
const PENCIL_GRAPHITE_COLOR = '#374151'; // Dark graphite point
const PENCIL_FERRULE_COLOR = '#9CA3AF'; // Silver/gray metal band
const PENCIL_ERASER_COLOR = '#F472B6'; // Pink eraser

/**
 * Drawing trace style
 */
const TRACE_COLOR = '#1E40AF'; // Blue trace line
const TRACE_WIDTH = 2;

// =============================================================================
// Types
// =============================================================================

/**
 * Extended pencil state with drawing information
 */
interface PencilExtendedState extends InstrumentRuntimeState {
	/** Whether the pencil is currently drawing */
	drawing?: boolean;
	/** Current trace path (SVG path data) */
	tracePath?: string;
}

// =============================================================================
// Pencil Renderer Implementation
// =============================================================================

/**
 * Pencil instrument renderer
 *
 * Creates and manages the SVG representation of a drawing pencil.
 * The pencil can move around the canvas and leave trace marks when drawing.
 *
 * @example
 * ```typescript
 * // Create the pencil SVG element
 * const pencilElement = pencilRenderer.createSvgElement();
 * svgContainer.appendChild(pencilElement);
 *
 * // Update position when state changes
 * pencilRenderer.updateSvgElement(pencilElement, {
 *   type: 'pencil',
 *   x: 150,
 *   y: 250,
 *   rotation: -30,
 *   scale: 1,
 *   visible: true
 * });
 * ```
 */
export const pencilRenderer: InstrumentRenderer = {
	/**
	 * Create the complete SVG element for the pencil
	 *
	 * The pencil consists of:
	 * 1. Graphite tip (point)
	 * 2. Exposed wood cone
	 * 3. Hexagonal body
	 * 4. Metal ferrule
	 * 5. Pink eraser
	 *
	 * @returns SVG group element containing all pencil components
	 */
	createSvgElement(): SVGElement {
		const group = createGroup('construction-pencil');

		// Add CSS class for potential external styling
		group.setAttribute('class', 'construction-instrument pencil');

		// Create trace path (will be updated when drawing)
		const trace = createSvgElement('path');
		trace.setAttribute('data-trace', 'true');
		trace.setAttribute('fill', 'none');
		trace.setAttribute('stroke', TRACE_COLOR);
		trace.setAttribute('stroke-width', String(TRACE_WIDTH));
		trace.setAttribute('stroke-linecap', 'round');
		trace.setAttribute('stroke-linejoin', 'round');
		trace.setAttribute('d', ''); // Empty initially
		group.appendChild(trace);

		// Create pencil body group (will be rotated)
		const pencilBody = createGroup('pencil-body');

		// Build pencil from tip to eraser (tip at origin)
		// The pencil extends in negative Y direction (upward in default SVG coords)

		// 1. Graphite tip
		const graphiteTip = createGraphiteTip();
		pencilBody.appendChild(graphiteTip);

		// 2. Wood cone (sharpened part)
		const woodCone = createWoodCone();
		pencilBody.appendChild(woodCone);

		// 3. Hexagonal body
		const body = createPencilBody();
		pencilBody.appendChild(body);

		// 4. Ferrule (metal band)
		const ferrule = createFerrule();
		pencilBody.appendChild(ferrule);

		// 5. Eraser
		const eraser = createEraser();
		pencilBody.appendChild(eraser);

		group.appendChild(pencilBody);

		return group;
	},

	/**
	 * Update the SVG element based on current runtime state
	 *
	 * Applies position, rotation, visibility, and opacity transformations.
	 *
	 * @param element - The pencil SVG group element
	 * @param state - Current instrument runtime state
	 */
	updateSvgElement(element: SVGElement, state: InstrumentRuntimeState): void {
		const extendedState = state as PencilExtendedState;

		// Build transform string for position and rotation
		// The tip of the pencil is at the position (x, y)
		// Default rotation: pencil points down-right at 45 degrees
		const defaultRotation = 45;
		const transform = `translate(${state.x}, ${state.y}) rotate(${state.rotation + defaultRotation})`;
		element.setAttribute('transform', transform);

		// Apply visibility
		element.setAttribute('visibility', state.visible ? 'visible' : 'hidden');

		// Apply opacity (supports fade in/out animations)
		element.setAttribute('opacity', String(state.scale));

		// Update trace path if drawing
		const tracePath = element.querySelector('[data-trace="true"]');
		if (tracePath && extendedState.tracePath) {
			tracePath.setAttribute('d', extendedState.tracePath);
		}
	},

	/**
	 * Get default state for the pencil
	 *
	 * The pencil is hidden by default and positioned at (150, 150).
	 *
	 * @returns Default instrument runtime state
	 */
	getDefaultState(): InstrumentRuntimeState {
		return {
			type: 'pencil',
			x: 150,
			y: 150,
			rotation: 0,
			visible: false,
			scale: 1
		};
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create the graphite tip (the actual drawing point)
 *
 * A small dark circle/cone at the very tip.
 *
 * @returns SVG element for the graphite tip
 */
function createGraphiteTip(): SVGElement {
	const group = createGroup('graphite-tip');

	// Small cone shape
	const tip = createSvgElement('polygon');
	const tipHeight = 4;
	const tipWidth = 2;
	tip.setAttribute('points', `0,0 ${-tipWidth},${-tipHeight} ${tipWidth},${-tipHeight}`);
	tip.setAttribute('fill', PENCIL_GRAPHITE_COLOR);

	group.appendChild(tip);
	return group;
}

/**
 * Create the wood cone (sharpened part exposing wood)
 *
 * A cone shape showing the exposed wood around the graphite.
 *
 * @returns SVG element for the wood cone
 */
function createWoodCone(): SVGElement {
	const group = createGroup('wood-cone');

	// Start after graphite tip
	const startY = -4;
	const endY = -PENCIL_TIP_LENGTH;
	const bottomWidth = PENCIL_BODY_WIDTH / 2;
	const topWidth = 2; // Narrow at tip

	// Cone polygon
	const cone = createSvgElement('polygon');
	cone.setAttribute(
		'points',
		`${-topWidth},${startY} ${topWidth},${startY} ${bottomWidth},${endY} ${-bottomWidth},${endY}`
	);
	cone.setAttribute('fill', PENCIL_WOOD_COLOR);
	cone.setAttribute('stroke', '#92400E');
	cone.setAttribute('stroke-width', '0.5');

	// Wood grain lines
	const grain1 = createSvgElement('line');
	grain1.setAttribute('x1', '-1');
	grain1.setAttribute('y1', String(startY - 2));
	grain1.setAttribute('x2', String(-bottomWidth + 2));
	grain1.setAttribute('y2', String(endY + 2));
	grain1.setAttribute('stroke', '#B45309');
	grain1.setAttribute('stroke-width', '0.5');

	const grain2 = createSvgElement('line');
	grain2.setAttribute('x1', '1');
	grain2.setAttribute('y1', String(startY - 2));
	grain2.setAttribute('x2', String(bottomWidth - 2));
	grain2.setAttribute('y2', String(endY + 2));
	grain2.setAttribute('stroke', '#B45309');
	grain2.setAttribute('stroke-width', '0.5');

	group.appendChild(cone);
	group.appendChild(grain1);
	group.appendChild(grain2);

	return group;
}

/**
 * Create the pencil body (hexagonal shape)
 *
 * The main body of the pencil with a yellow color and stripes.
 *
 * @returns SVG element for the pencil body
 */
function createPencilBody(): SVGElement {
	const group = createGroup('pencil-body-main');

	const startY = -PENCIL_TIP_LENGTH;
	const bodyLength =
		PENCIL_LENGTH - PENCIL_TIP_LENGTH - PENCIL_ERASER_LENGTH - PENCIL_FERRULE_LENGTH;
	const endY = startY - bodyLength;
	const halfWidth = PENCIL_BODY_WIDTH / 2;

	// Main body rectangle (simplified hexagon as rectangle with facets)
	const body = createSvgElement('rect');
	body.setAttribute('x', String(-halfWidth));
	body.setAttribute('y', String(endY));
	body.setAttribute('width', String(PENCIL_BODY_WIDTH));
	body.setAttribute('height', String(bodyLength));
	body.setAttribute('fill', PENCIL_BODY_COLOR);
	body.setAttribute('stroke', '#D97706');
	body.setAttribute('stroke-width', '0.5');

	// Center stripe (darker yellow)
	const stripe = createSvgElement('rect');
	stripe.setAttribute('x', String(-halfWidth + 2));
	stripe.setAttribute('y', String(endY));
	stripe.setAttribute('width', '2');
	stripe.setAttribute('height', String(bodyLength));
	stripe.setAttribute('fill', PENCIL_BODY_STRIPE);

	// Highlight edge
	const highlight = createSvgElement('rect');
	highlight.setAttribute('x', String(halfWidth - 2));
	highlight.setAttribute('y', String(endY));
	highlight.setAttribute('width', '1.5');
	highlight.setAttribute('height', String(bodyLength));
	highlight.setAttribute('fill', '#FDE68A');
	highlight.setAttribute('opacity', '0.6');

	group.appendChild(body);
	group.appendChild(stripe);
	group.appendChild(highlight);

	return group;
}

/**
 * Create the ferrule (metal band holding the eraser)
 *
 * A silver/gray metallic band.
 *
 * @returns SVG element for the ferrule
 */
function createFerrule(): SVGElement {
	const group = createGroup('pencil-ferrule');

	const bodyLength =
		PENCIL_LENGTH - PENCIL_TIP_LENGTH - PENCIL_ERASER_LENGTH - PENCIL_FERRULE_LENGTH;
	const startY = -PENCIL_TIP_LENGTH - bodyLength;
	const endY = startY - PENCIL_FERRULE_LENGTH;
	const halfWidth = PENCIL_BODY_WIDTH / 2;

	// Main ferrule
	const ferrule = createSvgElement('rect');
	ferrule.setAttribute('x', String(-halfWidth));
	ferrule.setAttribute('y', String(endY));
	ferrule.setAttribute('width', String(PENCIL_BODY_WIDTH));
	ferrule.setAttribute('height', String(PENCIL_FERRULE_LENGTH));
	ferrule.setAttribute('fill', PENCIL_FERRULE_COLOR);
	ferrule.setAttribute('stroke', '#6B7280');
	ferrule.setAttribute('stroke-width', '0.5');

	// Crimping lines (decorative grooves)
	const crimp1 = createSvgElement('line');
	crimp1.setAttribute('x1', String(-halfWidth));
	crimp1.setAttribute('y1', String(endY + 2));
	crimp1.setAttribute('x2', String(halfWidth));
	crimp1.setAttribute('y2', String(endY + 2));
	crimp1.setAttribute('stroke', '#6B7280');
	crimp1.setAttribute('stroke-width', '0.5');

	const crimp2 = createSvgElement('line');
	crimp2.setAttribute('x1', String(-halfWidth));
	crimp2.setAttribute('y1', String(endY + 4));
	crimp2.setAttribute('x2', String(halfWidth));
	crimp2.setAttribute('y2', String(endY + 4));
	crimp2.setAttribute('stroke', '#6B7280');
	crimp2.setAttribute('stroke-width', '0.5');

	group.appendChild(ferrule);
	group.appendChild(crimp1);
	group.appendChild(crimp2);

	return group;
}

/**
 * Create the eraser (pink rubber end)
 *
 * The eraser at the end of the pencil.
 *
 * @returns SVG element for the eraser
 */
function createEraser(): SVGElement {
	const group = createGroup('pencil-eraser');

	const bodyLength =
		PENCIL_LENGTH - PENCIL_TIP_LENGTH - PENCIL_ERASER_LENGTH - PENCIL_FERRULE_LENGTH;
	const ferruleEnd = -PENCIL_TIP_LENGTH - bodyLength - PENCIL_FERRULE_LENGTH;
	const endY = ferruleEnd - PENCIL_ERASER_LENGTH;
	const halfWidth = (PENCIL_BODY_WIDTH - 1) / 2; // Slightly narrower than body

	// Eraser body with rounded top
	const eraser = createSvgElement('path');
	const pathData = `
		M ${-halfWidth} ${ferruleEnd}
		L ${-halfWidth} ${endY + 3}
		Q ${-halfWidth} ${endY} 0 ${endY}
		Q ${halfWidth} ${endY} ${halfWidth} ${endY + 3}
		L ${halfWidth} ${ferruleEnd}
		Z
	`;
	eraser.setAttribute('d', pathData);
	eraser.setAttribute('fill', PENCIL_ERASER_COLOR);
	eraser.setAttribute('stroke', '#EC4899');
	eraser.setAttribute('stroke-width', '0.5');

	// Highlight
	const highlight = createSvgElement('ellipse');
	highlight.setAttribute('cx', '1');
	highlight.setAttribute('cy', String(endY + 4));
	highlight.setAttribute('rx', '2');
	highlight.setAttribute('ry', '1.5');
	highlight.setAttribute('fill', '#F9A8D4');
	highlight.setAttribute('opacity', '0.5');

	group.appendChild(eraser);
	group.appendChild(highlight);

	return group;
}

/**
 * Update the trace path for the pencil
 *
 * This is called when the pencil is drawing to show the line being drawn.
 *
 * @param element - The pencil SVG group element
 * @param pathData - SVG path data string for the trace
 */
export function updatePencilTrace(element: SVGElement, pathData: string): void {
	const tracePath = element.querySelector('[data-trace="true"]');
	if (tracePath) {
		tracePath.setAttribute('d', pathData);
	}
}

/**
 * Clear the trace path
 *
 * @param element - The pencil SVG group element
 */
export function clearPencilTrace(element: SVGElement): void {
	const tracePath = element.querySelector('[data-trace="true"]');
	if (tracePath) {
		tracePath.setAttribute('d', '');
	}
}

// =============================================================================
// Auto-registration
// =============================================================================

// Register the pencil renderer when this module is imported
registerInstrumentRenderer('pencil', pencilRenderer);
