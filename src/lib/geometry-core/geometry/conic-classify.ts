/**
 * Conic Classification
 *
 * Classifies a conic section from its 6 coefficients:
 *   Ax² + Bxy + Cy² + Dx + Ey + F = 0
 *
 * Extracts geometric parameters (type, center, semi-axes, rotation angle)
 * for parametric rendering.
 */

// =============================================================================
// Types
// =============================================================================

export type ConicType = 'circle' | 'ellipse' | 'hyperbola' | 'parabola' | 'degenerate';

export interface ConicParams {
	readonly type: ConicType;
	/** Center of the conic (undefined for parabola/degenerate). */
	readonly center?: { readonly x: number; readonly y: number };
	/** Semi-axis a (≥ b for ellipse; transverse for hyperbola). */
	readonly a: number;
	/** Semi-axis b (≤ a for ellipse; conjugate for hyperbola). */
	readonly b: number;
	/** Rotation angle in radians (from the positive x-axis to the conic's main axis). */
	readonly rotation: number;
	/** For parabolas: focal parameter p (distance from vertex to focus). */
	readonly p?: number;
	/** For parabolas: vertex position. */
	readonly vertex?: { readonly x: number; readonly y: number };
}

// =============================================================================
// Constants
// =============================================================================

const EPSILON = 1e-10;

function near0(v: number): boolean {
	return Math.abs(v) < EPSILON;
}

// =============================================================================
// Main classification
// =============================================================================

/**
 * Classify a conic and extract geometric parameters.
 *
 * @param A - coefficient of x²
 * @param B - coefficient of xy
 * @param C - coefficient of y²
 * @param D - coefficient of x
 * @param E - coefficient of y
 * @param F - constant term
 */
export function classifyConic(
	A: number,
	B: number,
	C: number,
	D: number,
	E: number,
	F: number
): ConicParams {
	// Discriminant of the quadratic part
	const disc = B * B - 4 * A * C;

	// 3x3 matrix determinant (for degeneracy check)
	//     | A   B/2  D/2 |
	// M = | B/2  C   E/2 |
	//     | D/2 E/2   F  |
	const det3 =
		A * (C * F - (E / 2) * (E / 2)) -
		(B / 2) * ((B / 2) * F - (E / 2) * (D / 2)) +
		(D / 2) * ((B / 2) * (E / 2) - C * (D / 2));

	// Degenerate conic: det(M) = 0
	if (near0(det3)) {
		return classifyDegenerate(A, B, C, D, E, F);
	}

	// Parabola: disc = 0 (but not degenerate)
	if (near0(disc)) {
		return classifyParabola(A, B, C, D, E, F);
	}

	// Ellipse/circle (disc < 0) or hyperbola (disc > 0)
	return classifyEllipseOrHyperbola(A, B, C, D, E, F, disc);
}

// =============================================================================
// Ellipse / Circle / Hyperbola
// =============================================================================

function classifyEllipseOrHyperbola(
	A: number,
	B: number,
	C: number,
	D: number,
	E: number,
	F: number,
	disc: number
): ConicParams {
	// Step 1: Rotation angle to eliminate xy term
	// tan(2θ) = B / (A - C)
	let theta: number;
	if (near0(B)) {
		theta = 0;
	} else if (near0(A - C)) {
		theta = Math.PI / 4;
	} else {
		theta = Math.atan2(B, A - C) / 2;
	}

	const cos = Math.cos(theta);
	const sin = Math.sin(theta);

	// Rotated coefficients (B' should be ~0)
	const A2 = A * cos * cos + B * cos * sin + C * sin * sin;
	const C2 = A * sin * sin - B * cos * sin + C * cos * cos;
	const D2 = D * cos + E * sin;
	const E2 = -D * sin + E * cos;
	// F unchanged by rotation

	// Step 2: Center in rotated frame (translation to eliminate linear terms)
	// A2·x0 + D2/2 = 0 → x0 = -D2/(2·A2)
	// C2·y0 + E2/2 = 0 → y0 = -E2/(2·C2)
	const x0r = near0(A2) ? 0 : -D2 / (2 * A2);
	const y0r = near0(C2) ? 0 : -E2 / (2 * C2);

	// Step 3: Constant after translation
	const F2 = F + A2 * x0r * x0r + C2 * y0r * y0r + D2 * x0r + E2 * y0r;

	// Step 4: Center in original frame (rotate back)
	const cx = x0r * cos - y0r * sin;
	const cy = x0r * sin + y0r * cos;

	// Step 5: Semi-axes from A2·x² + C2·y² + F2 = 0
	// → x²/(-F2/A2) + y²/(-F2/C2) = 1
	if (near0(F2)) {
		// Degenerate (single point)
		return { type: 'degenerate', center: { x: cx, y: cy }, a: 0, b: 0, rotation: theta };
	}

	const semiA2 = -F2 / A2;
	const semiB2 = -F2 / C2;

	if (disc < 0) {
		// Ellipse or circle
		// Both semiA2 and semiB2 should be positive
		if (semiA2 <= 0 || semiB2 <= 0) {
			return { type: 'degenerate', center: { x: cx, y: cy }, a: 0, b: 0, rotation: theta };
		}

		const sa = Math.sqrt(semiA2);
		const sb = Math.sqrt(semiB2);

		// Convention: a ≥ b, adjust rotation if needed
		let a: number, b: number, rot: number;
		if (sa >= sb) {
			a = sa;
			b = sb;
			rot = theta;
		} else {
			a = sb;
			b = sa;
			rot = theta + Math.PI / 2;
		}

		// Normalize rotation to [-π/2, π/2]
		rot = normalizeAngle(rot);

		const isCircle = Math.abs(a - b) < EPSILON;
		return {
			type: isCircle ? 'circle' : 'ellipse',
			center: { x: cx, y: cy },
			a,
			b,
			rotation: isCircle ? 0 : rot
		};
	} else {
		// Hyperbola: one of semiA2, semiB2 is positive, the other negative
		// Standard form: x²/a² - y²/b² = 1
		let a: number, b: number, rot: number;
		if (semiA2 > 0) {
			a = Math.sqrt(semiA2);
			b = Math.sqrt(-semiB2);
			rot = theta;
		} else {
			a = Math.sqrt(semiB2);
			b = Math.sqrt(-semiA2);
			rot = theta + Math.PI / 2;
		}

		rot = normalizeAngle(rot);
		return { type: 'hyperbola', center: { x: cx, y: cy }, a, b, rotation: rot };
	}
}

// =============================================================================
// Parabola
// =============================================================================

function classifyParabola(
	A: number,
	B: number,
	C: number,
	D: number,
	E: number,
	F: number
): ConicParams {
	// Rotation to eliminate xy term
	let theta: number;
	if (near0(B)) {
		theta = 0;
	} else if (near0(A - C)) {
		theta = Math.PI / 4;
	} else {
		theta = Math.atan2(B, A - C) / 2;
	}

	const cos = Math.cos(theta);
	const sin = Math.sin(theta);

	const A2 = A * cos * cos + B * cos * sin + C * sin * sin;
	const C2 = A * sin * sin - B * cos * sin + C * cos * cos;
	const D2 = D * cos + E * sin;
	const E2 = -D * sin + E * cos;

	// After rotation, one of A2 or C2 is ~0
	// Standard form: A2·x² + D2·x + E2·y + F = 0 (if C2 ≈ 0)
	// or C2·y² + D2·x + E2·y + F = 0 (if A2 ≈ 0)
	let p: number;
	let vertex: { x: number; y: number };
	let rot: number;

	if (near0(C2)) {
		// A2·x² + D2·x + E2·y + F = 0
		// Complete the square: A2(x + D2/(2A2))² + E2·y + F - D2²/(4A2) = 0
		// → y = -(A2/E2)·(x - h)² + k
		const h = -D2 / (2 * A2);
		const k = -(F - (D2 * D2) / (4 * A2)) / E2;
		p = Math.abs(E2 / (2 * A2));
		// Vertex in original coords
		vertex = { x: h * cos - k * sin, y: h * sin + k * cos };
		// Parabola opens along rotated y-axis
		rot = theta + (E2 / A2 > 0 ? -Math.PI / 2 : Math.PI / 2);
	} else {
		// C2·y² + D2·x + E2·y + F = 0
		const k = -E2 / (2 * C2);
		const h = -(F - (E2 * E2) / (4 * C2)) / D2;
		p = Math.abs(D2 / (2 * C2));
		vertex = { x: h * cos - k * sin, y: h * sin + k * cos };
		rot = theta + (D2 / C2 > 0 ? Math.PI : 0);
	}

	rot = normalizeAngle(rot);
	return { type: 'parabola', vertex, a: p, b: p, p, rotation: rot };
}

// =============================================================================
// Degenerate
// =============================================================================

function classifyDegenerate(
	A: number,
	B: number,
	C: number,
	D: number,
	E: number,
	_F: number
): ConicParams {
	// Try to find a center anyway for rendering hints
	const denom = 4 * A * C - B * B;
	if (!near0(denom)) {
		const cx = (B * E - 2 * C * D) / denom;
		const cy = (B * D - 2 * A * E) / denom;
		return { type: 'degenerate', center: { x: cx, y: cy }, a: 0, b: 0, rotation: 0 };
	}
	return { type: 'degenerate', a: 0, b: 0, rotation: 0 };
}

// =============================================================================
// Helpers
// =============================================================================

/** Normalize angle to [-π/2, π/2]. */
function normalizeAngle(angle: number): number {
	while (angle > Math.PI / 2) angle -= Math.PI;
	while (angle < -Math.PI / 2) angle += Math.PI;
	return angle;
}
