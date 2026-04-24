// Colors
export type { FunctionColor } from './colors';
export {
	FUNCTION_COLORS,
	getNextColor,
	getColorByIndex,
	isValidColor,
	isPaletteColor,
	normalizeColor
} from './colors';

// Bezier / SVG paths
export {
	catmullRomToBezier,
	pointsToCatmullRom,
	curveToSVGPath,
	curveToPolylinePath,
	createMathToSVGTransformer
} from './bezier';

// SVG primitives
export type { GeoStyleResolved, AngleMarkSVG, SegmentMarkSVG } from './svg-primitives';
export {
	resolveStyle,
	pointToSVG,
	segmentToSVG,
	lineToSVG,
	rayToSVG,
	circleToSVG,
	angleMarkToSVG,
	segmentMarkToSVG
} from './svg-primitives';
