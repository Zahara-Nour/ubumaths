/**
 * Geometric intersections — exact when inputs are exact.
 *
 * All functions take GeoPoint coordinates and return GeoPoint results.
 * Uses MathAST for exact arithmetic (no float intermediate steps).
 *
 * intersectLQ / intersectQQ work in plain `number` because conic coefficients
 * are already numeric. Results use `numeric()` wrapper.
 */

import type { GeoPoint } from '../types/primitives';
import type { GeoValue } from '../types/geo-value';
import { numeric } from '../types/geo-value';
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
import type { MathNode } from '$lib/mathAST/types';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import { subtract, add, multiply, variable } from '$lib/mathAST/factory';
import { numericNode } from '$lib/mathAST/common/numeric';
import { compile } from '$lib/mathAST/eval/compile';
import { findRoots } from '$lib/mathAST/analysis/roots';

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

	// Check discriminant sign via float (for branching).
	// Tolerance is relative to b² to handle varying coordinate scales.
	const discNum = geoToNumber(disc);
	const bNum = geoToNumber(b);
	const discTol = Math.max(1e-10, 1e-10 * bNum * bNum);
	if (discNum < -discTol) return null; // no intersection

	const results: GeoPoint[] = [];

	if (Math.abs(discNum) < discTol) {
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

	// Scale-relative tolerances (absolute thresholds fail at extreme scales)
	const EPS = 1e-10;
	const sumR2 = (r1 + r2) ** 2;
	const diffR2 = (r1 - r2) ** 2;

	if (d2 < EPS * EPS) return null; // concentric (d < EPS)
	if (d2 > sumR2 * (1 + EPS)) return null; // too far apart
	if (d2 < diffR2 * (1 - EPS)) return null; // one inside other

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
	// Find two points on this line.
	// Use the coefficient with the larger absolute value to avoid
	// catastrophic cancellation from dividing by near-zero values.
	let lp1: GeoPoint;
	let lp2: GeoPoint;

	const absA = Math.abs(geoToNumber(A));
	const absB = Math.abs(geoToNumber(B));

	if (absA >= absB && absA > 0) {
		// x = (C - B*y) / A
		// Point 1: y = 0 => x = C/A
		const x0 = geoDiv(C, A);
		if (x0 === null) return null;
		lp1 = { x: x0, y: geoFromNumber(0) };
		// Point 2: y = 1 => x = (C - B) / A
		const x1 = geoDiv(geoSub(C, B), A);
		if (x1 === null) return null;
		lp2 = { x: x1, y: geoFromNumber(1) };
	} else if (absB > 0) {
		// y = (C - A*x) / B
		// Point 1: x = 0 => y = C/B
		const y0 = geoDiv(C, B);
		if (y0 === null) return null;
		lp1 = { x: geoFromNumber(0), y: y0 };
		// Point 2: x = 1 => y = (C - A) / B
		const y1 = geoDiv(geoSub(C, A), B);
		if (y1 === null) return null;
		lp2 = { x: geoFromNumber(1), y: y1 };
	} else {
		return null; // degenerate
	}

	// Intersect radical line with circle 1
	const pts = intersectLC(lp1, lp2, center1, radius1);

	// Stable ordering: sort by cross product of (center1→center2) × (center1→point).
	// This gives a consistent "left/right" side regardless of radical line parameterization.
	if (pts && pts.length === 2) {
		const ddx = geoToNumber(dxG);
		const ddy = geoToNumber(dyG);
		const cross0 =
			ddx * geoToNumber(geoSub(pts[0].y, cy1)) - ddy * geoToNumber(geoSub(pts[0].x, cx1));
		const cross1 =
			ddx * geoToNumber(geoSub(pts[1].y, cy1)) - ddy * geoToNumber(geoSub(pts[1].x, cx1));
		if (cross0 < cross1) {
			// swap to ensure pts[0] has larger cross product (consistent "left" side)
			const tmp = pts[0];
			pts[0] = pts[1];
			pts[1] = tmp;
		}
	}

	return pts;
}

// =============================================================================
// Conic intersections (LQ / QQ) — numeric arithmetic
// =============================================================================

/** Coefficient tuple for Ax² + Bxy + Cy² + Dx + Ey + F = 0 */
type ConicCoeffs = readonly [number, number, number, number, number, number];

/**
 * Intersect a line with a quadratic curve (conic section).
 * Line defined by two GeoPoints. Conic defined by 6 coefficients [A,B,C,D,E,F].
 * Returns 0, 1, or 2 intersection points, or null if none.
 *
 * Method: substitute parametric line x=x1+t*dx, y=y1+t*dy into conic equation,
 * yielding a quadratic in t.
 */
export function intersectLQ(
	lineP1: GeoPoint,
	lineP2: GeoPoint,
	coeffs: ConicCoeffs
): GeoPoint[] | null {
	const [A, B, C, D, E, F] = coeffs;
	const x1 = geoToNumber(lineP1.x);
	const y1 = geoToNumber(lineP1.y);
	const dx = geoToNumber(lineP2.x) - x1;
	const dy = geoToNumber(lineP2.y) - y1;

	// Quadratic in t: a*t² + b*t + c = 0
	const a = A * dx * dx + B * dx * dy + C * dy * dy;
	const b = 2 * A * x1 * dx + B * (x1 * dy + y1 * dx) + 2 * C * y1 * dy + D * dx + E * dy;
	const c = A * x1 * x1 + B * x1 * y1 + C * y1 * y1 + D * x1 + E * y1 + F;

	const ts = solveQuadratic(a, b, c);
	if (ts.length === 0) return null;

	const results: GeoPoint[] = ts.map((t) => ({
		x: numeric(x1 + t * dx),
		y: numeric(y1 + t * dy)
	}));

	return results;
}

/**
 * Intersect two quadratic curves (conic sections).
 * Each conic defined by 6 coefficients [A,B,C,D,E,F].
 * Returns 0 to 4 intersection points, or null if none.
 *
 * Method: pencil of conics.
 * 1. Find λ such that C1 + λ·C2 is degenerate (det of 3×3 matrix = 0, cubic in λ)
 * 2. Factor the degenerate conic into two lines
 * 3. Intersect each line with C1 via intersectLQ
 * 4. Deduplicate
 */
export function intersectQQ(coeffs1: ConicCoeffs, coeffs2: ConicCoeffs): GeoPoint[] | null {
	// Try pencil approach with multiple λ values for robustness
	const lambdas = findDegenerateLambdas(coeffs1, coeffs2);

	const allPoints: GeoPoint[] = [];

	for (const lambda of lambdas) {
		// Form degenerate conic C1 + λ·C2
		const dc: [number, number, number, number, number, number] = [
			coeffs1[0] + lambda * coeffs2[0],
			coeffs1[1] + lambda * coeffs2[1],
			coeffs1[2] + lambda * coeffs2[2],
			coeffs1[3] + lambda * coeffs2[3],
			coeffs1[4] + lambda * coeffs2[4],
			coeffs1[5] + lambda * coeffs2[5]
		];

		const lines = factorDegenerateConic(dc);
		if (!lines) continue;

		// Intersect each line with the first conic
		for (const line of [lines.line1, lines.line2]) {
			const pts = intersectLQ(line[0], line[1], coeffs1);
			if (pts) {
				for (const p of pts) {
					allPoints.push(p);
				}
			}
		}

		// If we got enough points, stop
		if (deduplicatePoints(allPoints).length >= 4) break;
	}

	const unique = deduplicatePoints(allPoints);
	return unique.length > 0 ? unique : null;
}

// =============================================================================
// Private helpers
// =============================================================================

const NUMERIC_TOL = 1e-8;

/** Solve a*x² + b*x + c = 0. Returns real roots (0, 1, or 2). */
function solveQuadratic(a: number, b: number, c: number): number[] {
	if (Math.abs(a) < 1e-12) {
		// Linear case: b*x + c = 0
		if (Math.abs(b) < 1e-12) return [];
		return [-c / b];
	}

	const disc = b * b - 4 * a * c;
	const tol = Math.max(1e-10, 1e-10 * b * b);

	if (disc < -tol) return [];

	if (Math.abs(disc) < tol) {
		// Single root (tangent)
		return [-b / (2 * a)];
	}

	const sqrtDisc = Math.sqrt(disc);
	return [(-b - sqrtDisc) / (2 * a), (-b + sqrtDisc) / (2 * a)];
}

/**
 * Solve a*x³ + b*x² + c*x + d = 0. Returns all real roots.
 * Uses Cardano's formula with trigonometric method for 3 real roots.
 */
function solveCubic(a: number, b: number, c: number, d: number): number[] {
	if (Math.abs(a) < 1e-12) {
		return solveQuadratic(b, c, d);
	}

	// Normalize: x³ + px² + qx + r = 0
	const p = b / a;
	const q = c / a;
	const r = d / a;

	// Depressed cubic: t³ + pt + q = 0 where x = t - p/3
	const p2 = p * p;
	const Q = (3 * q - p2) / 9;
	const R = (9 * p * q - 27 * r - 2 * p * p2) / 54;

	const disc = Q * Q * Q + R * R;

	// Relative tolerance for discriminant (scales with coefficient magnitude)
	const discScale = Math.abs(Q * Q * Q) + R * R + 1e-30;
	const discTol = 1e-10 * discScale;

	const roots: number[] = [];
	const shift = -p / 3;

	if (disc > discTol) {
		// One real root
		const sqrtDisc = Math.sqrt(disc);
		const S = Math.cbrt(R + sqrtDisc);
		const T = Math.cbrt(R - sqrtDisc);
		roots.push(S + T + shift);
	} else if (disc < -discTol) {
		// Three real roots (casus irreducibilis)
		const denom = Math.sqrt(Math.max(0, -Q * Q * Q));
		if (denom < 1e-15) {
			roots.push(shift);
			return roots;
		}
		const ratio = Math.max(-1, Math.min(1, R / denom));
		const theta = Math.acos(ratio);
		const twoSqrtQ = 2 * Math.sqrt(-Q);
		roots.push(twoSqrtQ * Math.cos(theta / 3) + shift);
		roots.push(twoSqrtQ * Math.cos((theta + 2 * Math.PI) / 3) + shift);
		roots.push(twoSqrtQ * Math.cos((theta + 4 * Math.PI) / 3) + shift);
	} else {
		// Double root
		const S = Math.cbrt(R);
		roots.push(2 * S + shift);
		if (Math.abs(S) > 1e-12) {
			roots.push(-S + shift);
		}
	}

	return roots;
}

/**
 * Build the 3×3 symmetric conic matrix from coefficients [A,B,C,D,E,F]:
 *   | A    B/2  D/2 |
 *   | B/2  C    E/2 |
 *   | D/2  E/2  F   |
 */
function conicMatrix(
	coeffs: ConicCoeffs
): [[number, number, number], [number, number, number], [number, number, number]] {
	const [A, B, C, D, E, F] = coeffs;
	return [
		[A, B / 2, D / 2],
		[B / 2, C, E / 2],
		[D / 2, E / 2, F]
	];
}

/** Determinant of a 3×3 matrix */
function det3(
	m: [[number, number, number], [number, number, number], [number, number, number]]
): number {
	return (
		m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
		m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
		m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
	);
}

/**
 * Find λ values where det(M1 + λ·M2) = 0 (degenerate conic in pencil).
 * The determinant is a cubic polynomial in λ.
 */
function findDegenerateLambdas(coeffs1: ConicCoeffs, coeffs2: ConicCoeffs): number[] {
	const m1 = conicMatrix(coeffs1);
	const m2 = conicMatrix(coeffs2);

	// det(M1 + λ·M2) is cubic in λ.
	// Evaluate at 4 points and interpolate, or expand directly.
	// Direct expansion: det(M1 + λ·M2) = a3·λ³ + a2·λ² + a1·λ + a0
	// a0 = det(M1), a3 = det(M2)
	// Use evaluation at λ = 0, 1, -1, 2 to get coefficients.
	const v0 = det3(m1); // λ = 0

	const evalAt = (lambda: number): number => {
		const m: [[number, number, number], [number, number, number], [number, number, number]] = [
			[m1[0][0] + lambda * m2[0][0], m1[0][1] + lambda * m2[0][1], m1[0][2] + lambda * m2[0][2]],
			[m1[1][0] + lambda * m2[1][0], m1[1][1] + lambda * m2[1][1], m1[1][2] + lambda * m2[1][2]],
			[m1[2][0] + lambda * m2[2][0], m1[2][1] + lambda * m2[2][1], m1[2][2] + lambda * m2[2][2]]
		];
		return det3(m);
	};

	const v1 = evalAt(1);
	const vm1 = evalAt(-1);
	const v2 = evalAt(2);

	// Lagrange interpolation for cubic through (0, v0), (1, v1), (-1, vm1), (2, v2)
	// f(λ) = a3·λ³ + a2·λ² + a1·λ + a0
	const a0 = v0;
	// v1 = a3 + a2 + a1 + a0
	// vm1 = -a3 + a2 - a1 + a0
	// v2 = 8*a3 + 4*a2 + 2*a1 + a0
	const sumA = v1 - a0; // a3 + a2 + a1
	const diffA = vm1 - a0; // -a3 + a2 - a1
	// sumA + diffA = 2*a2 => a2 = (sumA + diffA) / 2
	const a2 = (sumA + diffA) / 2;
	// sumA - diffA = 2*a3 + 2*a1
	const sumA3A1 = (sumA - diffA) / 2; // a3 + a1
	// v2 = 8*a3 + 4*a2 + 2*a1 + a0
	// 8*a3 + 2*a1 = v2 - 4*a2 - a0
	// 4*(2*a3 + a1/2) but let's use: 8*a3 + 2*a1 = v2 - 4*a2 - a0
	const eightA3plus2A1 = v2 - 4 * a2 - a0;
	// a3 + a1 = sumA3A1
	// 8*a3 + 2*a1 = eightA3plus2A1
	// => 6*a3 = eightA3plus2A1 - 2*sumA3A1
	const a3 = (eightA3plus2A1 - 2 * sumA3A1) / 6;
	const a1 = sumA3A1 - a3;

	return solveCubic(a3, a2, a1, a0);
}

/**
 * Factor a degenerate conic (det ≈ 0) into two lines.
 * A degenerate conic represents a pair of lines (possibly coincident or complex).
 *
 * Returns two lines as pairs of GeoPoints, or null if factoring fails.
 */
function factorDegenerateConic(
	coeffs: [number, number, number, number, number, number]
): { line1: [GeoPoint, GeoPoint]; line2: [GeoPoint, GeoPoint] } | null {
	const [A, B, C, D, E, F] = coeffs;

	// The conic Ax² + Bxy + Cy² + Dx + Ey + F = 0 is a product of two lines:
	// (a1·x + b1·y + c1)(a2·x + b2·y + c2) = 0
	// Expanding: a1·a2·x² + (a1·b2+a2·b1)·xy + b1·b2·y² + (a1·c2+a2·c1)·x + (b1·c2+b2·c1)·y + c1·c2 = 0

	// Strategy: find the lines by finding the cofactor matrix and its eigenstructure.
	// For a rank-2 degenerate conic, the matrix M has rank ≤ 2.
	// The kernel gives us useful info. For rank 1, M = v·vᵀ.

	// Simpler approach: use the adjugate matrix.
	// For a degenerate conic M (3×3 symmetric, det=0), the adjugate adj(M) = cof(M)ᵀ
	// has rank 1 (or 0). If rank 1, adj(M) = k·p·pᵀ where p is the intersection of the two lines.
	// The lines pass through p and are tangent to C1.

	// Even simpler: just try to solve directly.
	// If A ≠ 0, treat as quadratic in x: A·x² + (By+D)·x + (Cy²+Ey+F) = 0
	// discriminant in x: (By+D)² - 4A(Cy²+Ey+F) = (B²-4AC)y² + (2BD-4AE)y + (D²-4AF)

	// If the conic is degenerate, this discriminant is a perfect square.
	// Let's use a direct approach: sample several y values, solve for x, and fit lines.

	// Approach: find two lines by analyzing the upper-left 2×2 submatrix of the conic.
	// The homogeneous part is Ax² + Bxy + Cy².
	// Factor: find slopes m1, m2 such that A + B·m + C·m² = 0 (where the line is x + m·y = k)
	// Wait, that's for lines of form x = m·y + k. Let's think differently.

	// The pair of lines: if we write them as L1: l1·x + m1·y + n1 = 0 and L2: l2·x + m2·y + n2 = 0
	// Then A = l1·l2, B = l1·m2 + l2·m1, C = m1·m2

	// Case 1: A ≠ 0 — we can factor in x
	if (Math.abs(A) > 1e-10) {
		// Quadratic in x: A·x² + (By+D)·x + (Cy²+Ey+F) = 0
		// disc_x = (By+D)² - 4A(Cy²+Ey+F)
		//        = (B²-4AC)y² + (2BD-4AE)y + (D²-4AF)
		const discA = B * B - 4 * A * C;
		const discB = 2 * B * D - 4 * A * E;
		const discC = D * D - 4 * A * F;

		// For degenerate conic, this should be a perfect square: (αy+β)²
		// discA·y² + discB·y + discC = (αy+β)² => α² = discA, 2αβ = discB, β² = discC
		// Handle the factoring by finding two specific points on each line.
		return factorViaQuadraticInX(A, B, C, D, E, F, discA, discB, discC);
	}

	// Case 2: A = 0 but C ≠ 0 — factor as quadratic in y
	if (Math.abs(C) > 1e-10) {
		// Swap roles: treat as C·y² + (Bx+E)·y + (Ax²+Dx+F) = 0
		// Since A=0: C·y² + (Bx+E)·y + (Dx+F) = 0
		const discA = B * B; // B² - 4·C·0 = B²
		const discB = 2 * B * E - 4 * C * D;
		const discC = E * E - 4 * C * F;
		return factorViaQuadraticInY(A, B, C, D, E, F, discA, discB, discC);
	}

	// Case 3: A = 0, C = 0 — Bxy + Dx + Ey + F = 0
	if (Math.abs(B) > 1e-10) {
		// Bxy + Dx + Ey + F = (Bx + E)(y + D/B) + F - ED/B
		// Only degenerate when F - ED/B ≈ 0
		const residual = F - (E * D) / B;
		if (Math.abs(residual) > 1e-8 * (Math.abs(F) + Math.abs((E * D) / B) + 1)) {
			return null; // not truly degenerate in this form
		}
		// Two lines: Bx + E = 0 and y + D/B = 0
		const xVal = -E / B;
		const yVal = -D / B;
		return {
			line1: [
				{ x: numeric(xVal), y: numeric(0) },
				{ x: numeric(xVal), y: numeric(1) }
			],
			line2: [
				{ x: numeric(0), y: numeric(yVal) },
				{ x: numeric(1), y: numeric(yVal) }
			]
		};
	}

	// Case 4: A=B=C=0 — Dx + Ey + F = 0 (single line, or constant)
	// This is a single line (rank 1 or less), not a pair of lines
	if (Math.abs(D) > 1e-10 || Math.abs(E) > 1e-10) {
		// Return same line twice (degenerate pair)
		const p1 = linePoint(D, E, F, 0);
		const p2 = linePoint(D, E, F, 1);
		if (!p1 || !p2) return null;
		return { line1: [p1, p2], line2: [p1, p2] };
	}

	return null;
}

/** Get a point on line ax + by + c = 0 using parameter t */
function linePoint(a: number, b: number, c: number, t: number): GeoPoint | null {
	if (Math.abs(a) > Math.abs(b)) {
		// x = (-c - b*t) / a, y = t
		return { x: numeric((-c - b * t) / a), y: numeric(t) };
	}
	if (Math.abs(b) > 1e-12) {
		// y = (-c - a*t) / b, x = t
		return { x: numeric(t), y: numeric((-c - a * t) / b) };
	}
	return null;
}

/** Factor degenerate conic as quadratic in x */
function factorViaQuadraticInX(
	A: number,
	B: number,
	C: number,
	D: number,
	E: number,
	F: number,
	discA: number,
	discB: number,
	discC: number
): { line1: [GeoPoint, GeoPoint]; line2: [GeoPoint, GeoPoint] } | null {
	// The two lines come from: x = [-(By+D) ± √(disc(y))] / (2A)
	// where disc(y) = discA·y² + discB·y + discC should be a perfect square (αy+β)²

	// Find α, β such that disc(y) = (αy+β)²
	let alpha: number, beta: number;

	if (Math.abs(discA) > 1e-10) {
		if (discA < 0) {
			// Complex lines — no real intersection
			return null;
		}
		alpha = Math.sqrt(discA);
		// β = discB / (2α)
		beta = discB / (2 * alpha);
		// Verify: β² should ≈ discC (for a truly degenerate conic)
		if (Math.abs(beta * beta - discC) > 1e-6 * (Math.abs(discC) + 1)) {
			return null; // not truly degenerate — numeric drift from pencil step
		}
	} else {
		alpha = 0;
		if (Math.abs(discC) < 1e-10) {
			beta = 0;
		} else if (discC > 0) {
			beta = Math.sqrt(discC);
		} else {
			return null; // complex
		}
	}

	// Two lines:
	// Line 1: 2A·x + (B-α)·y + (D-β) = 0
	// Line 2: 2A·x + (B+α)·y + (D+β) = 0
	const l1a = 2 * A,
		l1b = B - alpha,
		l1c = D - beta;
	const l2a = 2 * A,
		l2b = B + alpha,
		l2c = D + beta;

	const p1a = linePoint(l1a, l1b, l1c, 0);
	const p1b = linePoint(l1a, l1b, l1c, 1);
	const p2a = linePoint(l2a, l2b, l2c, 0);
	const p2b = linePoint(l2a, l2b, l2c, 1);

	if (!p1a || !p1b || !p2a || !p2b) return null;

	return { line1: [p1a, p1b], line2: [p2a, p2b] };
}

/** Factor degenerate conic as quadratic in y */
function factorViaQuadraticInY(
	A: number,
	B: number,
	C: number,
	D: number,
	E: number,
	F: number,
	discA: number,
	discB: number,
	discC: number
): { line1: [GeoPoint, GeoPoint]; line2: [GeoPoint, GeoPoint] } | null {
	// The two lines from: y = [-(Bx+E) ± √(disc(x))] / (2C)
	// disc(x) = discA·x² + discB·x + discC = (αx+β)²

	let alpha: number, beta: number;

	if (Math.abs(discA) > 1e-10) {
		if (discA < 0) return null;
		alpha = Math.sqrt(discA);
		beta = discB / (2 * alpha);
		if (Math.abs(beta * beta - discC) > 1e-6 * (Math.abs(discC) + 1)) {
			return null;
		}
	} else {
		alpha = 0;
		if (Math.abs(discC) < 1e-10) {
			beta = 0;
		} else if (discC > 0) {
			beta = Math.sqrt(discC);
		} else {
			return null;
		}
	}

	// Two lines:
	// Line 1: (B-α)·x + 2C·y + (E-β) = 0
	// Line 2: (B+α)·x + 2C·y + (E+β) = 0
	const l1a = B - alpha,
		l1b = 2 * C,
		l1c = E - beta;
	const l2a = B + alpha,
		l2b = 2 * C,
		l2c = E + beta;

	const p1a = linePoint(l1a, l1b, l1c, 0);
	const p1b = linePoint(l1a, l1b, l1c, 1);
	const p2a = linePoint(l2a, l2b, l2c, 0);
	const p2b = linePoint(l2a, l2b, l2c, 1);

	if (!p1a || !p1b || !p2a || !p2b) return null;

	return { line1: [p1a, p1b], line2: [p2a, p2b] };
}

// =============================================================================
// Function intersections (LF / FF) — hybrid symbolic + numeric
// =============================================================================

/**
 * Intersect a line with a function curve y=f(x).
 *
 * Strategy:
 * 1. Compute line equation y = mx + p (or handle vertical x = k)
 * 2. Build h(x) = f(x) - (mx + p) symbolically
 * 3. Call findRoots(h, compile(h), 'x', xMin, xMax)
 * 4. For each root x0, intersection point is (x0, f(x0))
 * 5. Sort by x ascending for deterministic index ordering
 *
 * For vertical lines x = k: single point (k, f(k)) if f(k) is finite.
 */
export function intersectLF(
	lineP1: GeoPoint,
	lineP2: GeoPoint,
	fnExpression: MathNode,
	compiledFn: CompiledFn,
	xMin: number,
	xMax: number
): GeoPoint[] | null {
	const x1 = geoToNumber(lineP1.x);
	const y1 = geoToNumber(lineP1.y);
	const x2 = geoToNumber(lineP2.x);
	const y2 = geoToNumber(lineP2.y);

	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.sqrt(dx * dx + dy * dy);

	// Vertical or near-vertical line: use relative threshold
	if (len < 1e-12 || Math.abs(dx) / len < 1e-10) {
		const k = (x1 + x2) / 2;
		const yVal = compiledFn({ x: k });
		if (!Number.isFinite(yVal)) return null;
		return [{ x: numeric(k), y: numeric(yVal) }];
	}

	// Line y = mx + p
	const m = dy / dx;
	const p = y1 - m * x1;

	// Guard against degenerate slope (shouldn't happen after the check above)
	if (!Number.isFinite(m) || !Number.isFinite(p)) {
		const k = (x1 + x2) / 2;
		const yVal = compiledFn({ x: k });
		if (!Number.isFinite(yVal)) return null;
		return [{ x: numeric(k), y: numeric(yVal) }];
	}

	// h(x) = f(x) - (m*x + p)
	const lineExpr = add(multiply(numericNode(m), variable('x')), numericNode(p));
	const h = subtract(fnExpression, lineExpr);
	const compiledH = compile(h);

	const roots = findRoots(h, compiledH, 'x', xMin, xMax);
	if (roots.length === 0) return null;

	const points: GeoPoint[] = roots
		.map((root) => {
			const yVal = compiledFn({ x: root.x });
			if (!Number.isFinite(yVal)) return null;
			return { x: numeric(root.x), y: numeric(yVal) };
		})
		.filter((p): p is GeoPoint => p !== null);

	return points.length === 0 ? null : points;
}

/**
 * Intersect two function curves y=f(x) and y=g(x).
 *
 * Strategy:
 * 1. Build h(x) = f(x) - g(x) symbolically
 * 2. Call findRoots(h, compile(h), 'x', xMin, xMax)
 * 3. For each root x0, intersection point is (x0, f(x0))
 */
export function intersectFF(
	fn1Expression: MathNode,
	fn1Compiled: CompiledFn,
	fn2Expression: MathNode,
	xMin: number,
	xMax: number
): GeoPoint[] | null {
	const h = subtract(fn1Expression, fn2Expression);
	const compiledH = compile(h);

	const roots = findRoots(h, compiledH, 'x', xMin, xMax);
	if (roots.length === 0) return null;

	const points: GeoPoint[] = roots
		.map((root) => {
			const yVal = fn1Compiled({ x: root.x });
			if (!Number.isFinite(yVal)) return null;
			return { x: numeric(root.x), y: numeric(yVal) };
		})
		.filter((p): p is GeoPoint => p !== null);

	return points.length === 0 ? null : points;
}

/** Remove duplicate points (distance < tolerance) */
function deduplicatePoints(pts: GeoPoint[], tol: number = NUMERIC_TOL): GeoPoint[] {
	const result: GeoPoint[] = [];
	for (const p of pts) {
		const px = geoToNumber(p.x);
		const py = geoToNumber(p.y);
		const isDuplicate = result.some((r) => {
			const dx = px - geoToNumber(r.x);
			const dy = py - geoToNumber(r.y);
			return Math.sqrt(dx * dx + dy * dy) < tol;
		});
		if (!isDuplicate) result.push(p);
	}
	return result;
}
