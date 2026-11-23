/**
 * Re-exports from geometry-core/viewport.
 *
 * This file maintains backward compatibility — all existing imports
 * from '#lib/grapheur/viewport.ts' continue to work.
 */

export {
	DEFAULT_VIEWPORT,
	createTransformer,
	panViewport,
	zoomViewport,
	resetViewport,
	createViewport,
	getViewportMetrics,
	isValidViewport,
	clampViewport,
	fitViewport
} from '#lib/geometry-core/viewport/index.ts';

export type { CoordinateTransformer } from '#lib/geometry-core/viewport/index.ts';
