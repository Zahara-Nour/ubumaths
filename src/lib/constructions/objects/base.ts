/**
 * Object Renderer Base - Interface and registry for geometric object renderers
 *
 * This module defines the base interface that all object renderers must implement,
 * and provides a registry for dynamically looking up renderers by object kind.
 *
 * Each renderer is responsible for:
 * 1. Creating SVG elements from object definitions
 * 2. Updating SVG elements when object state changes
 * 3. Providing default state for new objects
 *
 * @module constructions/objects/base
 */

import type { ObjectDef, ObjectState, Position, StyleProps } from '../types';
import type { CoordinateTransformer } from '../core/renderer';

// =============================================================================
// Types
// =============================================================================

/**
 * Computed geometry for an object after expression evaluation
 *
 * This contains the resolved numeric values in math coordinates,
 * ready to be transformed to SVG coordinates.
 */
export interface ComputedGeometry {
	/** Primary position (for points, centers, etc.) */
	position?: Position;
	/** Secondary position (for segments end point, etc.) */
	position2?: Position;
	/** Radius value (for circles, arcs) */
	radius?: number;
	/** Start angle in degrees (for arcs) */
	startAngle?: number;
	/** End angle in degrees (for arcs) */
	endAngle?: number;
	/** Array of positions (for polygons) */
	vertices?: readonly Position[];
}

/**
 * Render context provided to object renderers
 *
 * Contains all the information needed to render an object,
 * including coordinate transformation and computed geometry.
 */
export interface RenderContext {
	/** Coordinate transformer for math-to-SVG conversion */
	readonly transformer: CoordinateTransformer;
	/** Computed geometry values (positions, radii, etc.) in math coordinates */
	readonly geometry: ComputedGeometry;
	/** Current object state */
	readonly state: ObjectState;
}

/**
 * Interface for object renderers
 *
 * Each geometric object type (point, segment, circle, etc.) has a renderer
 * that implements this interface. The renderer handles SVG element creation
 * and updates.
 *
 * @template T - The specific ObjectDef type this renderer handles
 *
 * @example
 * ```typescript
 * const pointRenderer: ObjectRenderer<PointDef> = {
 *   createSvgElement(def, context) {
 *     const { x, y } = context.transformer.mathToSvg(
 *       context.geometry.position!.x,
 *       context.geometry.position!.y
 *     );
 *     // Create and return SVG element
 *   },
 *   // ...
 * };
 * ```
 */
export interface ObjectRenderer<T extends ObjectDef = ObjectDef> {
	/**
	 * Create the SVG element for this object
	 *
	 * Called once when the object is first created. The returned element
	 * is added to the SVG canvas and later updated via updateSvgElement.
	 *
	 * @param def - Object definition
	 * @param context - Render context with transformer and computed geometry
	 * @returns SVG element (usually a group containing the object graphics)
	 */
	createSvgElement(def: T, context: RenderContext): SVGElement;

	/**
	 * Update the SVG element when state changes
	 *
	 * Called whenever the object's state changes (visibility, position,
	 * style, animation progress, etc.). Should efficiently update only
	 * the changed attributes.
	 *
	 * @param element - The SVG element to update (created by createSvgElement)
	 * @param def - Object definition
	 * @param context - Render context with updated geometry and state
	 */
	updateSvgElement(element: SVGElement, def: T, context: RenderContext): void;

	/**
	 * Get the object kind this renderer handles
	 *
	 * Used for type discrimination and registry lookup.
	 *
	 * @returns The object kind string (e.g., 'point', 'segment')
	 */
	readonly kind: T['kind'];
}

// =============================================================================
// Registry
// =============================================================================

/**
 * Registry of object renderers by kind
 *
 * This map stores all registered object renderers, keyed by their object kind.
 * Renderers are auto-registered when their modules are imported.
 */
const objectRenderers = new Map<string, ObjectRenderer>();

/**
 * Register an object renderer for a specific object kind
 *
 * This function should be called by each renderer module to register itself.
 * Duplicate registrations for the same kind will override the previous renderer.
 *
 * @param renderer - The renderer to register
 *
 * @example
 * ```typescript
 * // In point.ts
 * export const pointRenderer: ObjectRenderer<PointDef> = {
 *   kind: 'point',
 *   // ...
 * };
 *
 * registerObjectRenderer(pointRenderer);
 * ```
 */
export function registerObjectRenderer<T extends ObjectDef>(renderer: ObjectRenderer<T>): void {
	objectRenderers.set(renderer.kind, renderer as ObjectRenderer);
}

/**
 * Get the renderer for a specific object kind
 *
 * @param kind - The object kind to look up
 * @returns The registered renderer, or undefined if not found
 *
 * @example
 * ```typescript
 * const renderer = getObjectRenderer('point');
 * if (renderer) {
 *   const element = renderer.createSvgElement(pointDef, context);
 * }
 * ```
 */
export function getObjectRenderer(kind: string): ObjectRenderer | undefined {
	return objectRenderers.get(kind);
}

/**
 * Get all registered renderer kinds
 *
 * @returns Array of registered object kinds
 */
export function getRegisteredKinds(): string[] {
	return [...objectRenderers.keys()];
}

/**
 * Check if a renderer is registered for a given kind
 *
 * @param kind - The object kind to check
 * @returns True if a renderer is registered
 */
export function hasRenderer(kind: string): boolean {
	return objectRenderers.has(kind);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Apply common state properties to an SVG element
 *
 * Sets visibility and opacity based on the object state.
 * This should be called by all renderers in updateSvgElement.
 *
 * @param element - SVG element to update
 * @param state - Object state
 */
export function applyStateToElement(element: SVGElement, state: ObjectState): void {
	// Visibility
	element.setAttribute('visibility', state.visible ? 'visible' : 'hidden');

	// Opacity from state (overrides style opacity)
	const styleOpacity = state.style?.opacity ?? 1;
	element.setAttribute('opacity', String(styleOpacity));
}

/**
 * Get effective style by merging definition style with state style overrides
 *
 * @param def - Object definition
 * @param state - Object state
 * @returns Merged style properties
 */
export function getEffectiveStyle(def: ObjectDef, state: ObjectState): StyleProps {
	return {
		...def.style,
		...state.style
	};
}
