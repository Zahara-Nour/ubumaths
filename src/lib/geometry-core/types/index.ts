// GeoValue
export type { GeoValue, GeoExact, GeoNumeric } from './geo-value';
export { exact, numeric, isExact, isNumeric } from './geo-value';

// Primitives
export type { Radians, Vec2, GeoPoint, NumericPoint, Box } from './primitives';
export { radians, radiansToDegrees } from './primitives';

// Elements
export type {
	GeoElement,
	GeoElementType,
	GeoPointElement,
	GeoFreePoint,
	GeoMidpoint,
	GeoSegment,
	GeoLine,
	GeoRay,
	GeoCircle,
	GeoCircleByRadius,
	GeoCircleByPoint,
	GeoPolygon
} from './elements';
export {
	isFreePoint,
	isMidpoint,
	isPointElement,
	isSegment,
	isLine,
	isRay,
	isCircle,
	isCircleByRadius,
	isCircleByPoint,
	isPolygon
} from './elements';
