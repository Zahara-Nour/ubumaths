/**
 * Instrument Renderer Base - Base interface and registry for geometric instruments
 *
 * This module defines the interface that all instrument renderers must implement,
 * as well as a registry for managing instrument renderers by name.
 *
 * @module constructions/instruments/base
 */

import type { InstrumentRuntimeState } from '../types';

// =============================================================================
// Instrument Renderer Interface
// =============================================================================

/**
 * Interface for instrument renderers
 *
 * Each instrument (ruler, compass, protractor, etc.) implements this interface
 * to provide SVG rendering and state management.
 *
 * @example
 * ```typescript
 * const renderer: InstrumentRenderer = {
 *   createSvgElement() {
 *     const group = createGroup('my-instrument');
 *     // Add SVG elements to the group
 *     return group;
 *   },
 *   updateSvgElement(element, state) {
 *     element.setAttribute('transform', `translate(${state.x}, ${state.y})`);
 *   },
 *   getDefaultState() {
 *     return { type: 'ruler', x: 0, y: 0, rotation: 0, scale: 1, visible: false };
 *   }
 * };
 * ```
 */
export interface InstrumentRenderer {
	/**
	 * Create the SVG element for this instrument
	 *
	 * This method creates the complete SVG representation of the instrument,
	 * including all visual elements (body, graduations, markings, etc.).
	 * The returned element should be a group (`<g>`) containing all parts.
	 *
	 * @returns The root SVG element for this instrument (typically an SVGGElement)
	 */
	createSvgElement(): SVGElement;

	/**
	 * Update the SVG element when state changes
	 *
	 * This method applies the current runtime state to the SVG element,
	 * updating its position, rotation, visibility, and opacity.
	 *
	 * @param element - The SVG element to update (returned by createSvgElement)
	 * @param state - The current runtime state of the instrument
	 */
	updateSvgElement(element: SVGElement, state: InstrumentRuntimeState): void;

	/**
	 * Get default state for this instrument
	 *
	 * Returns the initial runtime state for this instrument type.
	 * Instruments are typically hidden by default.
	 *
	 * @returns The default runtime state
	 */
	getDefaultState(): InstrumentRuntimeState;
}

// =============================================================================
// Instrument Registry
// =============================================================================

/**
 * Registry for instrument renderers
 *
 * Maps instrument names (e.g., 'ruler', 'compass') to their renderer implementations.
 */
export const instrumentRenderers = new Map<string, InstrumentRenderer>();

/**
 * Register an instrument renderer
 *
 * Adds a renderer to the registry, making it available for use in constructions.
 * Typically called automatically when importing an instrument module.
 *
 * @param name - The name of the instrument (e.g., 'ruler', 'compass')
 * @param renderer - The renderer implementation
 *
 * @example
 * ```typescript
 * registerInstrumentRenderer('ruler', rulerRenderer);
 * ```
 */
export function registerInstrumentRenderer(name: string, renderer: InstrumentRenderer): void {
	instrumentRenderers.set(name, renderer);
}

/**
 * Get an instrument renderer by name
 *
 * Retrieves a renderer from the registry.
 *
 * @param name - The name of the instrument
 * @returns The renderer, or undefined if not found
 *
 * @example
 * ```typescript
 * const renderer = getInstrumentRenderer('ruler');
 * if (renderer) {
 *   const element = renderer.createSvgElement();
 * }
 * ```
 */
export function getInstrumentRenderer(name: string): InstrumentRenderer | undefined {
	return instrumentRenderers.get(name);
}

/**
 * Check if an instrument renderer is registered
 *
 * @param name - The name of the instrument
 * @returns True if a renderer is registered for this name
 */
export function hasInstrumentRenderer(name: string): boolean {
	return instrumentRenderers.has(name);
}

/**
 * Get all registered instrument names
 *
 * @returns Array of registered instrument names
 */
export function getRegisteredInstruments(): string[] {
	return Array.from(instrumentRenderers.keys());
}
