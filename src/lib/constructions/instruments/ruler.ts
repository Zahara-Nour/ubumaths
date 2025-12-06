/**
 * Ruler Instrument Renderer - SVG rendering for the graduated ruler
 *
 * This module provides the renderer for the ruler instrument used in
 * geometric constructions. The ruler displays a graduated scale with
 * centimeter and millimeter markings.
 *
 * Design:
 * - Body: Semi-transparent rectangle with a wood-like color
 * - Graduations: Small ticks at millimeter intervals, larger at centimeters
 * - Numbers: Displayed at centimeter marks
 * - Drawing edge: Bold line at the bottom where lines are traced
 *
 * Coordinate system:
 * - Origin (0,0) is at the top-left corner of the ruler
 * - The drawing edge is at the bottom (y = height)
 * - Rotation is applied around the origin
 *
 * @module constructions/instruments/ruler
 */

import type { InstrumentRuntimeState } from '../types';
import type { InstrumentRenderer } from './base';
import { registerInstrumentRenderer } from './base';
import { createSvgElement, createGroup } from '../core/renderer';
import { DEFAULT_RULER_LENGTH, DEFAULT_RULER_WIDTH } from '../constants';

// =============================================================================
// Ruler Constants
// =============================================================================

/**
 * Ruler dimensions in pixels
 */
const RULER_WIDTH = DEFAULT_RULER_LENGTH; // Length of the ruler (horizontal)
const RULER_HEIGHT = DEFAULT_RULER_WIDTH; // Height/thickness of the ruler

/**
 * Scale: pixels per centimeter
 *
 * At this scale, 1cm on the ruler corresponds to 40 pixels on screen.
 * This provides good visual clarity while keeping the ruler reasonably sized.
 */
const PIXELS_PER_CM = 40;

/**
 * Number of centimeters displayed on the ruler
 */
const RULER_CM_COUNT = Math.floor(RULER_WIDTH / PIXELS_PER_CM);

/**
 * Graduation heights in pixels
 */
const GRADUATION_HEIGHT_MM = 5; // 1mm ticks
const GRADUATION_HEIGHT_HALF_CM = 10; // 5mm ticks
const GRADUATION_HEIGHT_CM = 15; // 10mm (1cm) ticks

/**
 * Ruler visual styles
 */
const RULER_BODY_FILL = 'rgba(255, 220, 150, 0.8)'; // Semi-transparent wood color
const RULER_BODY_STROKE = '#8B4513'; // Saddle brown for border
const RULER_MARKINGS_COLOR = '#333333'; // Dark gray for graduations and text
const RULER_EDGE_WIDTH = 2; // Width of the drawing edge
const RULER_BORDER_RADIUS = 2; // Corner radius for rounded edges

// =============================================================================
// Ruler Renderer Implementation
// =============================================================================

/**
 * Ruler instrument renderer
 *
 * Creates and manages the SVG representation of a graduated ruler.
 *
 * @example
 * ```typescript
 * // Create the ruler SVG element
 * const rulerElement = rulerRenderer.createSvgElement();
 * svgContainer.appendChild(rulerElement);
 *
 * // Update position when state changes
 * rulerRenderer.updateSvgElement(rulerElement, {
 *   type: 'ruler',
 *   x: 100,
 *   y: 200,
 *   rotation: 15,
 *   scale: 1,
 *   visible: true
 * });
 * ```
 */
export const rulerRenderer: InstrumentRenderer = {
	/**
	 * Create the complete SVG element for the ruler
	 *
	 * The ruler consists of:
	 * 1. A semi-transparent rectangular body
	 * 2. Graduation marks at mm, 5mm, and cm intervals
	 * 3. Numeric labels at centimeter positions
	 * 4. A bold drawing edge at the bottom
	 *
	 * @returns SVG group element containing all ruler components
	 */
	createSvgElement(): SVGElement {
		const group = createGroup('construction-ruler');

		// Add CSS class for potential external styling
		group.setAttribute('class', 'construction-instrument ruler');

		// Create the ruler body (main rectangle)
		const body = createRulerBody();
		group.appendChild(body);

		// Create the drawing edge (bold line at bottom)
		const edge = createDrawingEdge();
		group.appendChild(edge);

		// Create graduations and labels
		const graduationsGroup = createGraduations();
		group.appendChild(graduationsGroup);

		return group;
	},

	/**
	 * Update the SVG element based on current runtime state
	 *
	 * Applies position, rotation, visibility, and opacity transformations.
	 *
	 * @param element - The ruler SVG group element
	 * @param state - Current instrument runtime state
	 */
	updateSvgElement(element: SVGElement, state: InstrumentRuntimeState): void {
		// Build transform string for position and rotation
		// Rotation is applied at the origin (top-left of ruler)
		const transform = `translate(${state.x}, ${state.y}) rotate(${state.rotation})`;
		element.setAttribute('transform', transform);

		// Apply visibility
		element.setAttribute('visibility', state.visible ? 'visible' : 'hidden');

		// Apply opacity (supports fade in/out animations)
		element.setAttribute('opacity', String(state.scale));
	},

	/**
	 * Get default state for the ruler
	 *
	 * The ruler is hidden by default and positioned at (100, 200).
	 *
	 * @returns Default instrument runtime state
	 */
	getDefaultState(): InstrumentRuntimeState {
		return {
			type: 'ruler',
			x: 100,
			y: 200,
			rotation: 0,
			visible: false, // Hidden by default
			scale: 1
		};
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create the ruler body rectangle
 *
 * The body is a semi-transparent rectangle with a wood-like appearance.
 *
 * @returns SVG rect element
 */
function createRulerBody(): SVGRectElement {
	const body = createSvgElement('rect');
	body.setAttribute('width', String(RULER_WIDTH));
	body.setAttribute('height', String(RULER_HEIGHT));
	body.setAttribute('fill', RULER_BODY_FILL);
	body.setAttribute('stroke', RULER_BODY_STROKE);
	body.setAttribute('stroke-width', '1');
	body.setAttribute('rx', String(RULER_BORDER_RADIUS));
	body.setAttribute('ry', String(RULER_BORDER_RADIUS));
	return body;
}

/**
 * Create the drawing edge line
 *
 * This is the bold line at the bottom of the ruler where the user
 * traces lines in the construction.
 *
 * @returns SVG line element
 */
function createDrawingEdge(): SVGLineElement {
	const edge = createSvgElement('line');
	edge.setAttribute('x1', '0');
	edge.setAttribute('y1', String(RULER_HEIGHT));
	edge.setAttribute('x2', String(RULER_WIDTH));
	edge.setAttribute('y2', String(RULER_HEIGHT));
	edge.setAttribute('stroke', RULER_MARKINGS_COLOR);
	edge.setAttribute('stroke-width', String(RULER_EDGE_WIDTH));
	return edge;
}

/**
 * Create all graduation marks and labels
 *
 * Generates ticks at millimeter intervals with varying heights:
 * - Every 1mm: short tick (5px)
 * - Every 5mm: medium tick (10px)
 * - Every 10mm (1cm): tall tick (15px) + number label
 *
 * @returns SVG group containing all graduations
 */
function createGraduations(): SVGGElement {
	const group = createGroup('ruler-graduations');

	// Pixels per millimeter
	const pixelsPerMm = PIXELS_PER_CM / 10;

	// Total number of millimeter marks
	const totalMm = RULER_CM_COUNT * 10;

	for (let mm = 0; mm <= totalMm; mm++) {
		const x = mm * pixelsPerMm;

		// Determine tick height based on position
		const isCm = mm % 10 === 0;
		const isHalfCm = mm % 5 === 0;

		let tickHeight: number;
		if (isCm) {
			tickHeight = GRADUATION_HEIGHT_CM;
		} else if (isHalfCm) {
			tickHeight = GRADUATION_HEIGHT_HALF_CM;
		} else {
			tickHeight = GRADUATION_HEIGHT_MM;
		}

		// Create the graduation tick
		const tick = createGraduationTick(x, tickHeight);
		group.appendChild(tick);

		// Add number label at centimeter positions (except 0)
		if (isCm && mm > 0) {
			const cm = mm / 10;
			const label = createCmLabel(x, cm);
			group.appendChild(label);
		}
	}

	return group;
}

/**
 * Create a single graduation tick mark
 *
 * @param x - X position of the tick
 * @param height - Height of the tick from the bottom edge
 * @returns SVG line element
 */
function createGraduationTick(x: number, height: number): SVGLineElement {
	const tick = createSvgElement('line');
	tick.setAttribute('x1', String(x));
	tick.setAttribute('y1', String(RULER_HEIGHT - height));
	tick.setAttribute('x2', String(x));
	tick.setAttribute('y2', String(RULER_HEIGHT));
	tick.setAttribute('stroke', RULER_MARKINGS_COLOR);
	tick.setAttribute('stroke-width', '1');
	return tick;
}

/**
 * Create a centimeter number label
 *
 * Labels are centered above their corresponding tick marks.
 *
 * @param x - X position of the label
 * @param cm - Centimeter value to display
 * @returns SVG text element
 */
function createCmLabel(x: number, cm: number): SVGTextElement {
	const label = createSvgElement('text');
	label.setAttribute('x', String(x));
	label.setAttribute('y', String(RULER_HEIGHT - GRADUATION_HEIGHT_CM - 3));
	label.setAttribute('text-anchor', 'middle');
	label.setAttribute('font-size', '10');
	label.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
	label.setAttribute('fill', RULER_MARKINGS_COLOR);
	label.textContent = String(cm);
	return label;
}

// =============================================================================
// Auto-registration
// =============================================================================

// Register the ruler renderer when this module is imported
registerInstrumentRenderer('ruler', rulerRenderer);
