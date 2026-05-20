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
export type {
	GeoStyleResolved,
	PointSVG,
	LineSVG,
	CircleSVG,
	ArcSVG,
	AngleSVG,
	SegmentMarkSVG,
	TextSVG
} from './svg-primitives';
export {
	resolveStyle,
	pointToSVG,
	segmentToSVG,
	lineToSVG,
	rayToSVG,
	circleToSVG,
	angleToSVG,
	segmentMarkToSVG,
	textToSVG
} from './svg-primitives';

// Angle label helper (shared across canvas / SVG / TikZ / Typst).
export { formatAngleLabel, unsignedAngleBetween } from './angle-label';

// Bisector direction helper (shared across SVG / TikZ / Typst renderers).
export { computeBisectorDirection } from './bisector-direction';

// Shared clipping helpers for math-coords exporters (TikZ, Typst, ...)
export type { LineEndpoints } from './viewport-clipping';
export { extendLineToViewport, extendRayToViewport } from './viewport-clipping';

// Rough.js rendering
export {
	seedFromId,
	styleToRoughOptions,
	shouldRenderRough,
	roughLine,
	roughCircle,
	roughArc,
	roughPolygon,
	roughAngle,
	roughSegmentMark,
	roughLineHTML,
	roughCircleHTML,
	roughArcHTML,
	roughPolygonHTML,
	roughAngleHTML,
	roughSegmentMarkHTML
} from './rough-geometry';

// Export formats
export type { TikZExportOptions } from './export-tikz';
export { exportToTikZ } from './export-tikz';
export type { TypstExportOptions } from './export-typst';
export { exportToTypst } from './export-typst';
export type { SVGExportOptions } from './export-svg';
export { exportToSVG } from './export-svg';
