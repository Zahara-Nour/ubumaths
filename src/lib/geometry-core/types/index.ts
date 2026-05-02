// GeoValue
export type { GeoValue, GeoExact, GeoNumeric } from './geo-value';
export { exact, numeric, isExact, isNumeric } from './geo-value';

// Primitives
export type { Radians, Vec2, GeoPoint, NumericPoint, Box } from './primitives';
export { radians, radiansToDegrees } from './primitives';

// Elements
export type {
	GeoStyle,
	GeoElementBase,
	GeoElement,
	GeoElementType,
	GeoPointElement,
	GeoLineLikeElement,
	GeoFreePoint,
	GeoMidpoint,
	GeoIntersectionLL,
	GeoReflectedPoint,
	GeoRotatedPoint,
	GeoTranslatedPoint,
	GeoDilatedPoint,
	GeoReflectedOverLine,
	GeoSegment,
	GeoLine,
	GeoRay,
	GeoCircle,
	GeoAngleMark,
	GeoSegmentMark,
	GeoText,
	GeoMathText,
	GeoRichText,
	GeoImage,
	GeoCircleByRadius,
	GeoCircleByPoint,
	GeoArc,
	GeoArcByAngles,
	GeoArcByPoints,
	GeoPolygon,
	GeoFunction,
	GeoFunctionDomain,
	GeoPointOnCurve,
	GeoTangentLine,
	GeoLocus,
	LineEquation
} from './elements';
export {
	isFreePoint,
	isMidpoint,
	isIntersectionLL,
	isReflectedPoint,
	isRotatedPoint,
	isTranslatedPoint,
	isDilatedPoint,
	isReflectedOverLine,
	isPointElement,
	isAngleMark,
	isSegmentMark,
	isText,
	isMathText,
	isRichText,
	isImage,
	isSegment,
	isLine,
	isRay,
	isCircle,
	isCircleByRadius,
	isLineLike,
	isCircleByPoint,
	isPolygon,
	isArc,
	isArcByAngles,
	isArcByPoints,
	isFunction,
	isPointOnCurve,
	isTangentLine,
	isLocus
} from './elements';

// Schemas
export type { GeoValueSerialized, GeoElementSerialized, FigureStateSerialized } from './schemas';
export {
	geoValueSchema,
	geoPointSchema,
	geoStyleSchema,
	geoElementSchema,
	figureStateSchema,
	FIGURE_STATE_VERSION,
	serializeGeoValue,
	deserializeGeoValue
} from './schemas';
