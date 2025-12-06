/**
 * Construction Objects - Object renderer exports and registration
 *
 * This module exports all object renderers and ensures they are registered
 * with the renderer registry. Import this module to enable rendering of
 * all geometric object types.
 *
 * @module constructions/objects
 *
 * @example
 * ```typescript
 * // Import to register all renderers
 * import '$lib/constructions/objects';
 *
 * // Or import specific items
 * import {
 *   getObjectRenderer,
 *   pointRenderer,
 *   segmentRenderer
 * } from '$lib/constructions/objects';
 * ```
 */

// =============================================================================
// Side-effect imports - Register all renderers
// =============================================================================

// These imports trigger the auto-registration of each renderer
import './point';
import './segment';
import './circle';
import './line';
import './ray';
import './arc';
import './polygon';
import './text';
import './angleMark';

// =============================================================================
// Base exports
// =============================================================================

export {
	type ObjectRenderer,
	type RenderContext,
	type ComputedGeometry,
	registerObjectRenderer,
	getObjectRenderer,
	getRegisteredKinds,
	hasRenderer,
	applyStateToElement,
	getEffectiveStyle
} from './base';

// =============================================================================
// Individual renderer exports
// =============================================================================

export { pointRenderer } from './point';
export { segmentRenderer } from './segment';
export { circleRenderer } from './circle';
export { lineRenderer } from './line';
export { rayRenderer } from './ray';
export { arcRenderer } from './arc';
export { polygonRenderer } from './polygon';
export { textRenderer } from './text';
export { angleMarkRenderer, calculateAngle, isRightAngle } from './angleMark';

// =============================================================================
// Convenience type for all renderer kinds
// =============================================================================

/**
 * All supported object kinds
 */
export type SupportedObjectKind =
	| 'point'
	| 'segment'
	| 'circle'
	| 'line'
	| 'ray'
	| 'arc'
	| 'polygon'
	| 'text'
	| 'angleMark';

/**
 * Array of all supported object kinds for iteration
 */
export const SUPPORTED_OBJECT_KINDS: readonly SupportedObjectKind[] = [
	'point',
	'segment',
	'circle',
	'line',
	'ray',
	'arc',
	'polygon',
	'text',
	'angleMark'
] as const;
