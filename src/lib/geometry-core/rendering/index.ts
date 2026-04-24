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
export type { GeoStyleResolved, AngleMarkSVG, SegmentMarkSVG, MeasureSVG } from './svg-primitives';
export {
	resolveStyle,
	pointToSVG,
	segmentToSVG,
	lineToSVG,
	rayToSVG,
	circleToSVG,
	angleMarkToSVG,
	segmentMarkToSVG,
	measureToSVG
} from './svg-primitives';

// Export formats
export type { TikZExportOptions } from './export-tikz';
export { exportToTikZ } from './export-tikz';
export type { TypstExportOptions } from './export-typst';
export { exportToTypst } from './export-typst';
export type { SVGExportOptions } from './export-svg';
export { exportToSVG } from './export-svg';
