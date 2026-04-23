/**
 * Geometric intersections — exact when inputs are exact.
 *
 * All functions take GeoPoint coordinates and return GeoPoint results.
 * Uses MathAST for exact arithmetic (no float intermediate steps).
 */

import type { GeoPoint } from '../types/primitives';
import type { GeoValue } from '../types/geo-value';
import {
	geoAdd,
	geoSub,
	geoMul,
	geoDiv,
	geoSqrt,
	geoOpposite,
	geoFromNumber
} from '../compute/geo-arithmetic';
import { geoIsZero } from '../compute/compare';
import { geoToNumber } from '../compute/to-number';

/**
 * Intersect two lines defined by two points each.
 * Returns the intersection point, or null if parallel/coincident.
 *
 * Uses the parametric form: P = P1 + t*(P2-P1), Q = P3 + s*(P4-P3)
 * Solves the 2x2 system via cross product (determinant).
 */
export function intersectLL(
	p1: GeoPoint,
	p2: GeoPoint,
	p3: GeoPoint,
	p4: GeoPoint
): GeoPoint | null {
	// Direction vectors
	const d1x = geoSub(p2.x, p1.x);
	const d1y = geoSub(p2.y, p1.y);
	const d2x = geoSub(p4.x, p3.x);
	const d2y = geoSub(p4.y, p3.y);

	// Cross product (determinant): d1 × d2
	const cross = geoSub(geoMul(d1x, d2y), geoMul(d1y, d2x));

	if (geoIsZero(cross)) return null; // parallel or coincident

	// Parameter t: ((p3 - p1) × d2) / cross
	const diffX = geoSub(p3.x, p1.x);
	const diffY = geoSub(p3.y, p1.y);
	const tNum = geoSub(geoMul(diffX, d2y), geoMul(diffY, d2x));
	const t = geoDiv(tNum, cross);

	if (t === null) return null;

	// Intersection = p1 + t * d1
	return {
		x: geoAdd(p1.x, geoMul(t, d1x)),
		y: geoAdd(p1.y, geoMul(t, d1y))
	};
}

/**
 * Intersect a line with a circle.
 * Line defined by two points. Circle defined by center and radius (GeoValue).
 * Returns 0, 1, or 2 intersection points, or null if none.
 *
 * Method: substitute parametric line into circle equation, solve quadratic.
 */
export function intersectLC(
	lineP1: GeoPoint,
	lineP2: GeoPoint,
	center: GeoPoint,
	radius: GeoValue
): GeoPoint[] | null {
	// Direction vector of line
	const dx = geoSub(lineP2.x, lineP1.x);
	const dy = geoSub(lineP2.y, lineP1.y);

	// Vector from center to lineP1
	const fx = geoSub(lineP1.x, center.x);
	const fy = geoSub(lineP1.y, center.y);

	// Quadratic coefficients: a*t^2 + b*t + c = 0
	// a = dx^2 + dy^2
	const a = geoAdd(geoMul(dx, dx), geoMul(dy, dy));
	// b = 2*(fx*dx + fy*dy)
	const b = geoMul(geoFromNumber(2), geoAdd(geoMul(fx, dx), geoMul(fy, dy)));
	// c = fx^2 + fy^2 - r^2
	const c = geoSub(geoAdd(geoMul(fx, fx), geoMul(fy, fy)), geoMul(radius, radius));

	// Discriminant = b^2 - 4ac
	const disc = geoSub(geoMul(b, b), geoMul(geoFromNumber(4), geoMul(a, c)));

	// Check discriminant sign via float (for branching)
	const discNum = geoToNumber(disc);
	if (discNum < -1e-10) return null; // no intersection

	const results: GeoPoint[] = [];

	if (Math.abs(discNum) < 1e-10) {
		// Tangent: one intersection
		const t = geoDiv(geoOpposite(b), geoMul(geoFromNumber(2), a));
		if (t === null) return null;
		results.push({
			x: geoAdd(lineP1.x, geoMul(t, dx)),
			y: geoAdd(lineP1.y, geoMul(t, dy))
		});
	} else {
		// Secant: two intersections
		const sqrtDisc = geoSqrt(disc);
		if (sqrtDisc === null) return null;
		const twoA = geoMul(geoFromNumber(2), a);

		for (const sign of [-1, 1] as const) {
			const signedSqrt = sign === -1 ? geoOpposite(sqrtDisc) : sqrtDisc;
			const t = geoDiv(geoAdd(geoOpposite(b), signedSqrt), twoA);
			if (t === null) continue;
			results.push({
				x: geoAdd(lineP1.x, geoMul(t, dx)),
				y: geoAdd(lineP1.y, geoMul(t, dy))
			});
		}
	}

	return results.length > 0 ? results : null;
}

/**
 * Intersect two circles.
 * Each circle defined by center and radius (GeoValue).
 * Returns 0, 1, or 2 intersection points, or null if none.
 *
 * Method: subtract the two circle equations to get the radical line,
 * then intersect that line with one of the circles.
 */
export function intersectCC(
	center1: GeoPoint,
	radius1: GeoValue,
	center2: GeoPoint,
	radius2: GeoValue
): GeoPoint[] | null {
	// Distance² between centers (no sqrt needed — compare d² with (r1±r2)²)
	const dxG = geoSub(center2.x, center1.x);
	const dyG = geoSub(center2.y, center1.y);
	const d2 = geoToNumber(geoAdd(geoMul(dxG, dxG), geoMul(dyG, dyG)));

	const r1 = geoToNumber(radius1);
	const r2 = geoToNumber(radius2);

	if (d2 < 1e-20) return null; // concentric (d² ≈ 0)
	if (d2 > (r1 + r2) ** 2 + 1e-10) return null; // too far apart (d² > (r1+r2)²)
	if (d2 < (r1 - r2) ** 2 - 1e-10) return null; // one inside other (d² < (r1-r2)²)

	// Radical line: subtracting (x-cx1)^2+(y-cy1)^2=r1^2 from (x-cx2)^2+(y-cy2)^2=r2^2
	// gives a linear equation: 2*(cx2-cx1)*x + 2*(cy2-cy1)*y = r1^2 - r2^2 + cx2^2 - cx1^2 + cy2^2 - cy1^2
	// This defines the radical line. We find two points on it and intersect with circle 1.

	// Exact computation of radical line via GeoValue
	const cx1 = center1.x;
	const cy1 = center1.y;
	const cx2 = center2.x;
	const cy2 = center2.y;

	// 2*(cx2 - cx1)
	const A = geoMul(geoFromNumber(2), geoSub(cx2, cx1));
	// 2*(cy2 - cy1)
	const B = geoMul(geoFromNumber(2), geoSub(cy2, cy1));
	// r1^2 - r2^2 + cx2^2 - cx1^2 + cy2^2 - cy1^2
	const C = geoAdd(
		geoSub(geoMul(radius1, radius1), geoMul(radius2, radius2)),
		geoAdd(geoSub(geoMul(cx2, cx2), geoMul(cx1, cx1)), geoSub(geoMul(cy2, cy2), geoMul(cy1, cy1)))
	);

	// Radical line: A*x + B*y = C
	// Find two points on this line
	let lp1: GeoPoint;
	let lp2: GeoPoint;

	if (!geoIsZero(A)) {
		// x = (C - B*y) / A
		// Point 1: y = 0 => x = C/A
		const x0 = geoDiv(C, A);
		if (x0 === null) return null;
		lp1 = { x: x0, y: geoFromNumber(0) };
		// Point 2: y = 1 => x = (C - B) / A
		const x1 = geoDiv(geoSub(C, B), A);
		if (x1 === null) return null;
		lp2 = { x: x1, y: geoFromNumber(1) };
	} else if (!geoIsZero(B)) {
		// B*y = C => y = C/B
		const y0 = geoDiv(C, B);
		if (y0 === null) return null;
		lp1 = { x: geoFromNumber(0), y: y0 };
		lp2 = { x: geoFromNumber(1), y: y0 };
	} else {
		return null; // degenerate
	}

	// Intersect radical line with circle 1
	return intersectLC(lp1, lp2, center1, radius1);
}
