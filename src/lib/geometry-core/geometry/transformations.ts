/**
 * Geometric transformations — exact when inputs are exact.
 *
 * Direct formulas (not matrices). For composition of transformations,
 * matrices can be added later.
 *
 * For rotations with remarkable angles (pi/2, pi/3, pi/4, pi/6),
 * MathAST evaluate(mode:'exact') knows the exact values of cos and sin,
 * so the result stays exact.
 */

import type { GeoPoint } from '../types/primitives';
import type { GeoValue } from '../types/geo-value';
import { exact } from '../types/geo-value';
import { geoAdd, geoSub, geoMul, geoDiv, simplifyExact } from '../compute/geo-arithmetic';
import { cos, sin } from '$lib/mathAST';

function geoCos(angle: GeoValue): GeoValue {
	if (angle.kind === 'exact') {
		return exact(simplifyExact(cos(angle.node)));
	}
	return { kind: 'numeric', value: Math.cos(angle.value) };
}

function geoSin(angle: GeoValue): GeoValue {
	if (angle.kind === 'exact') {
		return exact(simplifyExact(sin(angle.node)));
	}
	return { kind: 'numeric', value: Math.sin(angle.value) };
}

/**
 * Translate a point by a vector (dx, dy).
 */
export function translate(point: GeoPoint, vector: GeoPoint): GeoPoint {
	return {
		x: geoAdd(point.x, vector.x),
		y: geoAdd(point.y, vector.y)
	};
}

/**
 * Rotate a point around a center by an angle (radians, as GeoValue).
 */
export function rotate(point: GeoPoint, center: GeoPoint, angle: GeoValue): GeoPoint {
	const dx = geoSub(point.x, center.x);
	const dy = geoSub(point.y, center.y);
	const cosA = geoCos(angle);
	const sinA = geoSin(angle);

	return {
		x: geoAdd(center.x, geoSub(geoMul(dx, cosA), geoMul(dy, sinA))),
		y: geoAdd(center.y, geoAdd(geoMul(dx, sinA), geoMul(dy, cosA)))
	};
}

/**
 * Reflect a point through a center (central symmetry).
 * result = 2*center - point.
 */
export function reflectPoint(point: GeoPoint, center: GeoPoint): GeoPoint {
	return {
		x: geoSub(geoAdd(center.x, center.x), point.x),
		y: geoSub(geoAdd(center.y, center.y), point.y)
	};
}

/**
 * Reflect a point over a line defined by two points (axial symmetry).
 * Projects the point onto the line, then reflects: result = 2*projection - point.
 * Returns null if the line is degenerate (lineP1 === lineP2).
 */
export function reflectOverLine(
	point: GeoPoint,
	lineP1: GeoPoint,
	lineP2: GeoPoint
): GeoPoint | null {
	const dx = geoSub(lineP2.x, lineP1.x);
	const dy = geoSub(lineP2.y, lineP1.y);
	const fx = geoSub(point.x, lineP1.x);
	const fy = geoSub(point.y, lineP1.y);

	// t = (f · d) / (d · d)
	const dotFD = geoAdd(geoMul(fx, dx), geoMul(fy, dy));
	const dotDD = geoAdd(geoMul(dx, dx), geoMul(dy, dy));
	const t = geoDiv(dotFD, dotDD);
	if (t === null) return null; // degenerate line (lineP1 === lineP2)

	// Projection = lineP1 + t * d
	const projX = geoAdd(lineP1.x, geoMul(t, dx));
	const projY = geoAdd(lineP1.y, geoMul(t, dy));

	// Reflection = 2 * projection - point
	return {
		x: geoSub(geoAdd(projX, projX), point.x),
		y: geoSub(geoAdd(projY, projY), point.y)
	};
}

/**
 * Project a point orthogonally onto a line defined by two points.
 * Returns null if the line is degenerate (lineP1 === lineP2).
 */
export function projectOnLine(
	point: GeoPoint,
	lineP1: GeoPoint,
	lineP2: GeoPoint
): GeoPoint | null {
	const dx = geoSub(lineP2.x, lineP1.x);
	const dy = geoSub(lineP2.y, lineP1.y);
	const fx = geoSub(point.x, lineP1.x);
	const fy = geoSub(point.y, lineP1.y);

	// t = (f · d) / (d · d)
	const dotFD = geoAdd(geoMul(fx, dx), geoMul(fy, dy));
	const dotDD = geoAdd(geoMul(dx, dx), geoMul(dy, dy));
	const t = geoDiv(dotFD, dotDD);
	if (t === null) return null;

	return {
		x: geoAdd(lineP1.x, geoMul(t, dx)),
		y: geoAdd(lineP1.y, geoMul(t, dy))
	};
}

/**
 * Dilate a point from a center by a scale factor (homothety).
 * result = center + factor * (point - center).
 */
export function dilate(point: GeoPoint, center: GeoPoint, factor: GeoValue): GeoPoint {
	const dx = geoSub(point.x, center.x);
	const dy = geoSub(point.y, center.y);

	return {
		x: geoAdd(center.x, geoMul(factor, dx)),
		y: geoAdd(center.y, geoMul(factor, dy))
	};
}
