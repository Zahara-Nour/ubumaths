/**
 * Re-exports from geometry-core/rendering/bezier.
 *
 * This file maintains backward compatibility — all existing imports
 * from '$lib/grapheur/bezier' continue to work.
 */

export {
	catmullRomToBezier,
	pointsToCatmullRom,
	curveToSVGPath,
	curveToPolylinePath,
	createMathToSVGTransformer
} from '$lib/geometry-core/rendering/bezier';
