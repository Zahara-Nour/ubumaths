/**
 * Conic Properties
 *
 * Pure geometric computations for conic sections:
 * asymptotes, axes of symmetry, directrix, foci, eccentricity, polar line.
 *
 * All functions take ConicParams (from classifyConic) and/or raw coefficients,
 * and return coordinates defining the geometric objects.
 */

import type { ConicParams } from './conic-classify';

// =============================================================================
// Types
// =============================================================================

export interface ConicLine {
	readonly p1: { readonly x: number; readonly y: number };
	readonly p2: { readonly x: number; readonly y: number };
}

export interface ConicPoint {
	readonly x: number;
	readonly y: number;
}

// =============================================================================
// Asymptotes (hyperbola only)
// =============================================================================

/**
 * Compute the two asymptote lines of a hyperbola.
 *
 * In local frame: y = ±(b/a)x through the center.
 * Rotated by theta and translated to (cx, cy).
 *
 * Returns null if the conic is not a hyperbola.
 */
export function asymptoteLines(conic: ConicParams): [ConicLine, ConicLine] | null {
	if (conic.type !== 'hyperbola' || !conic.center) return null;

	const { x: cx, y: cy } = conic.center;
	const { a, b, rotation: theta } = conic;
	const cos = Math.cos(theta);
	const sin = Math.sin(theta);

	// Asymptote slopes in local frame: ±b/a
	// Direction vectors in local frame: (1, b/a) and (1, -b/a)
	// Rotated to world frame:
	//   dir1 = (cos - (b/a)*sin, sin + (b/a)*cos)
	//   dir2 = (cos + (b/a)*sin, sin - (b/a)*cos)
	const slope = b / a;

	const dx1 = cos - slope * sin;
	const dy1 = sin + slope * cos;
	const dx2 = cos + slope * sin;
	const dy2 = sin - slope * cos;

	return [
		{ p1: { x: cx, y: cy }, p2: { x: cx + dx1, y: cy + dy1 } },
		{ p1: { x: cx, y: cy }, p2: { x: cx + dx2, y: cy + dy2 } }
	];
}

// =============================================================================
// Axes of symmetry
// =============================================================================

/**
 * Compute the axes of symmetry of a conic.
 *
 * - Ellipse/Hyperbola: 2 axes through the center at angles theta and theta+pi/2
 * - Parabola: 1 axis through the vertex along the rotation direction
 * - Circle: returns null (infinite axes)
 * - Degenerate: returns null
 */
export function axisLines(conic: ConicParams): ConicLine[] | null {
	if (conic.type === 'circle' || conic.type === 'degenerate') return null;

	if (conic.type === 'parabola') {
		if (!conic.vertex) return null;
		const { x: vx, y: vy } = conic.vertex;
		const cos = Math.cos(conic.rotation);
		const sin = Math.sin(conic.rotation);
		return [{ p1: { x: vx, y: vy }, p2: { x: vx + cos, y: vy + sin } }];
	}

	// Ellipse or hyperbola
	if (!conic.center) return null;
	const { x: cx, y: cy } = conic.center;
	const cos = Math.cos(conic.rotation);
	const sin = Math.sin(conic.rotation);

	return [
		// Main axis (along rotation angle)
		{ p1: { x: cx, y: cy }, p2: { x: cx + cos, y: cy + sin } },
		// Secondary axis (perpendicular)
		{ p1: { x: cx, y: cy }, p2: { x: cx - sin, y: cy + cos } }
	];
}

// =============================================================================
// Directrix (parabola only)
// =============================================================================

/**
 * Compute the directrix of a parabola.
 *
 * The directrix is perpendicular to the axis, at distance p from the vertex,
 * on the opposite side from the focus.
 *
 * Returns null if the conic is not a parabola.
 */
export function directrixLine(conic: ConicParams): ConicLine | null {
	if (conic.type !== 'parabola' || !conic.vertex || conic.p == null) return null;

	const { x: vx, y: vy } = conic.vertex;
	const p = conic.p;
	const cos = Math.cos(conic.rotation);
	const sin = Math.sin(conic.rotation);

	// Directrix center: vertex - p along axis direction
	const dx = vx - p * cos;
	const dy = vy - p * sin;

	// Directrix direction: perpendicular to axis
	return { p1: { x: dx, y: dy }, p2: { x: dx - sin, y: dy + cos } };
}

// =============================================================================
// Foci
// =============================================================================

/**
 * Compute the focus/foci of a conic.
 *
 * - Ellipse: 2 foci at center ± c along main axis, c = sqrt(a² - b²)
 * - Hyperbola: 2 foci at center ± c along main axis, c = sqrt(a² + b²)
 * - Parabola: 1 focus at vertex + p along axis
 * - Circle: 1 focus at center (both foci coincide)
 * - Degenerate: returns null
 */
export function fociPoints(conic: ConicParams): ConicPoint[] | null {
	if (conic.type === 'degenerate') return null;

	if (conic.type === 'circle') {
		if (!conic.center) return null;
		return [{ x: conic.center.x, y: conic.center.y }];
	}

	if (conic.type === 'parabola') {
		if (!conic.vertex || conic.p == null) return null;
		const cos = Math.cos(conic.rotation);
		const sin = Math.sin(conic.rotation);
		return [{ x: conic.vertex.x + conic.p * cos, y: conic.vertex.y + conic.p * sin }];
	}

	// Ellipse or hyperbola
	if (!conic.center) return null;
	const { x: cx, y: cy } = conic.center;
	const { a, b, rotation: theta } = conic;
	const cos = Math.cos(theta);
	const sin = Math.sin(theta);

	const c = conic.type === 'ellipse' ? Math.sqrt(a * a - b * b) : Math.sqrt(a * a + b * b);

	return [
		{ x: cx + c * cos, y: cy + c * sin },
		{ x: cx - c * cos, y: cy - c * sin }
	];
}

// =============================================================================
// Eccentricity
// =============================================================================

/**
 * Compute the eccentricity of a conic.
 *
 * - Circle: 0
 * - Ellipse: sqrt(1 - b²/a²) ∈ (0, 1)
 * - Parabola: 1
 * - Hyperbola: sqrt(1 + b²/a²) > 1
 * - Degenerate: NaN
 */
export function eccentricity(conic: ConicParams): number {
	switch (conic.type) {
		case 'circle':
			return 0;
		case 'ellipse':
			return Math.sqrt(1 - (conic.b * conic.b) / (conic.a * conic.a));
		case 'parabola':
			return 1;
		case 'hyperbola':
			return Math.sqrt(1 + (conic.b * conic.b) / (conic.a * conic.a));
		case 'degenerate':
			return NaN;
	}
}

// =============================================================================
// Polar line
// =============================================================================

/**
 * Compute the polar line of a point P with respect to a conic.
 *
 * Given Ax² + Bxy + Cy² + Dx + Ey + F = 0 and P = (px, py),
 * the polar line equation is:
 *   A·x·px + (B/2)(x·py + y·px) + C·y·py + (D/2)(x + px) + (E/2)(y + py) + F = 0
 *
 * Rearranging as ax + by + c = 0:
 *   a = A·px + (B/2)·py + D/2
 *   b = (B/2)·px + C·py + E/2
 *   c = (D/2)·px + (E/2)·py + F
 *
 * Returns null if the resulting line is degenerate (a ≈ 0 and b ≈ 0),
 * which happens when P is the center of the conic.
 */
export function polarLine(
	coeffs: readonly [number, number, number, number, number, number],
	px: number,
	py: number
): ConicLine | null {
	const [A, B, C, D, E, F] = coeffs;

	const la = A * px + (B / 2) * py + D / 2;
	const lb = (B / 2) * px + C * py + E / 2;
	const lc = (D / 2) * px + (E / 2) * py + F;

	const EPSILON = 1e-10;

	// Degenerate case: point is at the center
	if (Math.abs(la) < EPSILON && Math.abs(lb) < EPSILON) return null;

	// Find two points on the line ax + by + c = 0
	if (Math.abs(lb) > Math.abs(la)) {
		// Use x = 0 and x = 1
		const y0 = -lc / lb;
		const y1 = -(la + lc) / lb;
		return { p1: { x: 0, y: y0 }, p2: { x: 1, y: y1 } };
	} else {
		// Use y = 0 and y = 1
		const x0 = -lc / la;
		const x1 = -(lb + lc) / la;
		return { p1: { x: x0, y: 0 }, p2: { x: x1, y: 1 } };
	}
}
