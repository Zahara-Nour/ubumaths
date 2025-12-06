/**
 * Construction Instruments Module - SVG renderers for geometric instruments
 *
 * This module provides renderers for the instruments used in geometric
 * constructions (ruler, compass, protractor, set square). Each instrument
 * can create its SVG representation and update it based on runtime state.
 *
 * Currently implemented:
 * - Ruler (graduated rule for measuring and drawing straight lines)
 * - Compass (for drawing circles and arcs)
 * - Pencil (for drawing lines and freehand traces)
 *
 * Planned:
 * - Protractor (for measuring angles)
 * - Set square (for drawing perpendiculars and specific angles)
 *
 * @module constructions/instruments
 *
 * @example
 * ```typescript
 * import {
 *   getInstrumentRenderer,
 *   rulerRenderer,
 *   compassRenderer,
 *   pencilRenderer,
 *   type InstrumentRenderer
 * } from '$lib/constructions/instruments';
 *
 * // Get a renderer by name
 * const renderer = getInstrumentRenderer('ruler');
 * if (renderer) {
 *   const element = renderer.createSvgElement();
 *   svgRoot.appendChild(element);
 *
 *   // Update when state changes
 *   renderer.updateSvgElement(element, {
 *     type: 'ruler',
 *     x: 100,
 *     y: 200,
 *     rotation: 0,
 *     scale: 1,
 *     visible: true
 *   });
 * }
 *
 * // Use compass for arc drawing
 * const compass = getInstrumentRenderer('compass');
 * if (compass) {
 *   const compassElement = compass.createSvgElement();
 *   compass.updateSvgElement(compassElement, {
 *     type: 'compass',
 *     x: 200,
 *     y: 300,
 *     rotation: 0,
 *     scale: 1,
 *     visible: true,
 *     compassRadius: 100
 *   });
 * }
 * ```
 */

// Import instrument modules to trigger auto-registration
import './ruler';
import './compass';
import './pencil';

// =============================================================================
// Base Exports
// =============================================================================

export type { InstrumentRenderer } from './base';

export {
	instrumentRenderers,
	registerInstrumentRenderer,
	getInstrumentRenderer,
	hasInstrumentRenderer,
	getRegisteredInstruments
} from './base';

// =============================================================================
// Instrument Exports
// =============================================================================

export { rulerRenderer } from './ruler';

export { compassRenderer, calculateDrawingTipOffset, calculateRadiusFromAngle } from './compass';

export { pencilRenderer, updatePencilTrace, clearPencilTrace } from './pencil';
