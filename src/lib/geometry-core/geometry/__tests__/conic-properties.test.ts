import { describe, it, expect } from 'vitest';
import {
	asymptoteLines,
	axisLines,
	directrixLine,
	fociPoints,
	eccentricity,
	polarLine
} from '../conic-properties';
import type { ConicParams } from '../conic-classify';

// Helper: check that a line passes through a given point (within tolerance)
function linePassesThrough(
	line: { p1: { x: number; y: number }; p2: { x: number; y: number } },
	px: number,
	py: number,
	tol = 1e-8
): boolean {
	// Cross product of (p2-p1) and (P-p1) should be ~0
	const dx = line.p2.x - line.p1.x;
	const dy = line.p2.y - line.p1.y;
	const ex = px - line.p1.x;
	const ey = py - line.p1.y;
	return Math.abs(dx * ey - dy * ex) < tol;
}

// Helper: check two lines are perpendicular
function arePerpendicular(
	l1: { p1: { x: number; y: number }; p2: { x: number; y: number } },
	l2: { p1: { x: number; y: number }; p2: { x: number; y: number } },
	tol = 1e-8
): boolean {
	const dx1 = l1.p2.x - l1.p1.x;
	const dy1 = l1.p2.y - l1.p1.y;
	const dx2 = l2.p2.x - l2.p1.x;
	const dy2 = l2.p2.y - l2.p1.y;
	return Math.abs(dx1 * dx2 + dy1 * dy2) < tol;
}

// Helper: direction angle of a line
function lineAngle(line: { p1: { x: number; y: number }; p2: { x: number; y: number } }): number {
	return Math.atan2(line.p2.y - line.p1.y, line.p2.x - line.p1.x);
}

// =============================================================================
// asymptoteLines
// =============================================================================

describe('asymptoteLines', () => {
	it('returns null for non-hyperbola', () => {
		const ellipse: ConicParams = {
			type: 'ellipse',
			center: { x: 0, y: 0 },
			a: 3,
			b: 2,
			rotation: 0
		};
		expect(asymptoteLines(ellipse)).toBeNull();

		const parabola: ConicParams = {
			type: 'parabola',
			a: 1,
			b: 1,
			p: 0.5,
			vertex: { x: 0, y: 0 },
			rotation: 0
		};
		expect(asymptoteLines(parabola)).toBeNull();

		const circle: ConicParams = { type: 'circle', center: { x: 0, y: 0 }, a: 3, b: 3, rotation: 0 };
		expect(asymptoteLines(circle)).toBeNull();
	});

	it('standard hyperbola x^2/4 - y^2/9 = 1 has asymptotes y = ±(3/2)x', () => {
		const hyp: ConicParams = { type: 'hyperbola', center: { x: 0, y: 0 }, a: 2, b: 3, rotation: 0 };
		const result = asymptoteLines(hyp);
		expect(result).not.toBeNull();
		const [l1, l2] = result!;

		// Both pass through center
		expect(linePassesThrough(l1, 0, 0)).toBe(true);
		expect(linePassesThrough(l2, 0, 0)).toBe(true);

		// Asymptote slopes: ±3/2
		// l1 direction: (1, 3/2), l2 direction: (1, -3/2)
		expect(linePassesThrough(l1, 1, 1.5)).toBe(true);
		expect(linePassesThrough(l2, 1, -1.5)).toBe(true);
	});

	it('translated hyperbola has asymptotes through center', () => {
		const hyp: ConicParams = { type: 'hyperbola', center: { x: 2, y: 3 }, a: 1, b: 1, rotation: 0 };
		const result = asymptoteLines(hyp);
		expect(result).not.toBeNull();
		const [l1, l2] = result!;

		// Both pass through center (2,3)
		expect(linePassesThrough(l1, 2, 3)).toBe(true);
		expect(linePassesThrough(l2, 2, 3)).toBe(true);
	});

	it('rotated hyperbola has rotated asymptotes', () => {
		const theta = Math.PI / 4;
		const hyp: ConicParams = {
			type: 'hyperbola',
			center: { x: 0, y: 0 },
			a: 1,
			b: 1,
			rotation: theta
		};
		const result = asymptoteLines(hyp);
		expect(result).not.toBeNull();
		const [l1, l2] = result!;

		// a=b=1 => slopes ±1 in local frame => ±45° + 45° rotation
		// Asymptote 1: local slope 1 => direction (1,1) rotated by 45° => direction (0, √2) => vertical
		// Asymptote 2: local slope -1 => direction (1,-1) rotated by 45° => direction (√2, 0) => horizontal
		expect(linePassesThrough(l1, 0, 1)).toBe(true); // vertical through origin
		expect(linePassesThrough(l2, 1, 0)).toBe(true); // horizontal through origin
	});
});

// =============================================================================
// axisLines
// =============================================================================

describe('axisLines', () => {
	it('returns null for circle', () => {
		const circle: ConicParams = { type: 'circle', center: { x: 0, y: 0 }, a: 5, b: 5, rotation: 0 };
		expect(axisLines(circle)).toBeNull();
	});

	it('returns null for degenerate', () => {
		const deg: ConicParams = { type: 'degenerate', a: 0, b: 0, rotation: 0 };
		expect(axisLines(deg)).toBeNull();
	});

	it('ellipse: 2 perpendicular axes through center', () => {
		const ellipse: ConicParams = {
			type: 'ellipse',
			center: { x: 1, y: 2 },
			a: 5,
			b: 3,
			rotation: 0
		};
		const result = axisLines(ellipse);
		expect(result).not.toBeNull();
		expect(result!).toHaveLength(2);

		const [ax1, ax2] = result!;

		// Both pass through center
		expect(linePassesThrough(ax1, 1, 2)).toBe(true);
		expect(linePassesThrough(ax2, 1, 2)).toBe(true);

		// Perpendicular
		expect(arePerpendicular(ax1, ax2)).toBe(true);
	});

	it('ellipse with rotation: main axis at correct angle', () => {
		const theta = Math.PI / 6; // 30°
		const ellipse: ConicParams = {
			type: 'ellipse',
			center: { x: 0, y: 0 },
			a: 4,
			b: 2,
			rotation: theta
		};
		const result = axisLines(ellipse);
		expect(result).not.toBeNull();

		const angle1 = lineAngle(result![0]);
		expect(angle1).toBeCloseTo(theta, 8);
	});

	it('hyperbola: 2 perpendicular axes through center', () => {
		const hyp: ConicParams = { type: 'hyperbola', center: { x: 0, y: 0 }, a: 3, b: 2, rotation: 0 };
		const result = axisLines(hyp);
		expect(result).not.toBeNull();
		expect(result!).toHaveLength(2);
		expect(arePerpendicular(result![0], result![1])).toBe(true);
	});

	it('parabola: 1 axis through vertex', () => {
		const par: ConicParams = {
			type: 'parabola',
			a: 1,
			b: 1,
			p: 0.5,
			vertex: { x: 1, y: 2 },
			rotation: Math.PI / 2
		};
		const result = axisLines(par);
		expect(result).not.toBeNull();
		expect(result!).toHaveLength(1);

		// Passes through vertex
		expect(linePassesThrough(result![0], 1, 2)).toBe(true);

		// Direction along rotation (pi/2 = vertical)
		const angle = lineAngle(result![0]);
		expect(angle).toBeCloseTo(Math.PI / 2, 8);
	});
});

// =============================================================================
// directrixLine
// =============================================================================

describe('directrixLine', () => {
	it('returns null for non-parabola', () => {
		const ellipse: ConicParams = {
			type: 'ellipse',
			center: { x: 0, y: 0 },
			a: 3,
			b: 2,
			rotation: 0
		};
		expect(directrixLine(ellipse)).toBeNull();
	});

	it('parabola y = x^2/(4p): directrix at y = -p', () => {
		// Parabola opening upward: vertex (0,0), p=1, rotation=pi/2
		const par: ConicParams = {
			type: 'parabola',
			a: 1,
			b: 1,
			p: 1,
			vertex: { x: 0, y: 0 },
			rotation: Math.PI / 2
		};
		const result = directrixLine(par);
		expect(result).not.toBeNull();

		// Directrix center: (0, 0) - 1*(0, 1) = (0, -1)
		expect(linePassesThrough(result!, 0, -1)).toBe(true);

		// Directrix is horizontal (perpendicular to vertical axis)
		const dx = result!.p2.x - result!.p1.x;
		const dy = result!.p2.y - result!.p1.y;
		expect(Math.abs(dy)).toBeLessThan(1e-10); // horizontal
		expect(Math.abs(dx)).toBeGreaterThan(0.5);
	});

	it('parabola opening rightward: directrix vertical at x = -p', () => {
		// rotation = 0 means opening right
		const par: ConicParams = {
			type: 'parabola',
			a: 2,
			b: 2,
			p: 2,
			vertex: { x: 0, y: 0 },
			rotation: 0
		};
		const result = directrixLine(par);
		expect(result).not.toBeNull();

		// Directrix center at (-2, 0)
		expect(linePassesThrough(result!, -2, 0)).toBe(true);

		// Directrix is vertical
		const dx = result!.p2.x - result!.p1.x;
		expect(Math.abs(dx)).toBeLessThan(1e-10);
	});

	it('directrix is perpendicular to axis', () => {
		const par: ConicParams = {
			type: 'parabola',
			a: 1,
			b: 1,
			p: 1,
			vertex: { x: 0, y: 0 },
			rotation: Math.PI / 4
		};
		const dir = directrixLine(par);
		const axes = axisLines(par);
		expect(dir).not.toBeNull();
		expect(axes).not.toBeNull();
		expect(arePerpendicular(dir!, axes![0])).toBe(true);
	});
});

// =============================================================================
// fociPoints
// =============================================================================

describe('fociPoints', () => {
	it('returns null for degenerate', () => {
		const deg: ConicParams = { type: 'degenerate', a: 0, b: 0, rotation: 0 };
		expect(fociPoints(deg)).toBeNull();
	});

	it('circle: 1 focus at center', () => {
		const circle: ConicParams = { type: 'circle', center: { x: 3, y: 4 }, a: 5, b: 5, rotation: 0 };
		const result = fociPoints(circle);
		expect(result).not.toBeNull();
		expect(result!).toHaveLength(1);
		expect(result![0].x).toBeCloseTo(3);
		expect(result![0].y).toBeCloseTo(4);
	});

	it('ellipse: 2 foci symmetric about center, c = sqrt(a^2 - b^2)', () => {
		// a=5, b=3 => c=4
		const ellipse: ConicParams = {
			type: 'ellipse',
			center: { x: 0, y: 0 },
			a: 5,
			b: 3,
			rotation: 0
		};
		const result = fociPoints(ellipse);
		expect(result).not.toBeNull();
		expect(result!).toHaveLength(2);

		// Foci at (4, 0) and (-4, 0)
		expect(result![0].x).toBeCloseTo(4);
		expect(result![0].y).toBeCloseTo(0);
		expect(result![1].x).toBeCloseTo(-4);
		expect(result![1].y).toBeCloseTo(0);
	});

	it('hyperbola: 2 foci, c = sqrt(a^2 + b^2)', () => {
		// a=3, b=4 => c=5
		const hyp: ConicParams = { type: 'hyperbola', center: { x: 0, y: 0 }, a: 3, b: 4, rotation: 0 };
		const result = fociPoints(hyp);
		expect(result).not.toBeNull();
		expect(result!).toHaveLength(2);

		expect(result![0].x).toBeCloseTo(5);
		expect(result![0].y).toBeCloseTo(0);
		expect(result![1].x).toBeCloseTo(-5);
		expect(result![1].y).toBeCloseTo(0);
	});

	it('parabola: 1 focus at vertex + p along axis', () => {
		const par: ConicParams = {
			type: 'parabola',
			a: 1,
			b: 1,
			p: 2,
			vertex: { x: 1, y: 1 },
			rotation: 0
		};
		const result = fociPoints(par);
		expect(result).not.toBeNull();
		expect(result!).toHaveLength(1);
		expect(result![0].x).toBeCloseTo(3); // 1 + 2
		expect(result![0].y).toBeCloseTo(1);
	});

	it('rotated ellipse: foci along rotated axis', () => {
		const theta = Math.PI / 2;
		// a=5, b=3 => c=4, along vertical axis
		const ellipse: ConicParams = {
			type: 'ellipse',
			center: { x: 0, y: 0 },
			a: 5,
			b: 3,
			rotation: theta
		};
		const result = fociPoints(ellipse);
		expect(result).not.toBeNull();

		// Foci at (0, 4) and (0, -4)
		expect(result![0].x).toBeCloseTo(0);
		expect(result![0].y).toBeCloseTo(4);
		expect(result![1].x).toBeCloseTo(0);
		expect(result![1].y).toBeCloseTo(-4);
	});
});

// =============================================================================
// eccentricity
// =============================================================================

describe('eccentricity', () => {
	it('circle: e = 0', () => {
		const circle: ConicParams = { type: 'circle', center: { x: 0, y: 0 }, a: 5, b: 5, rotation: 0 };
		expect(eccentricity(circle)).toBe(0);
	});

	it('ellipse: 0 < e < 1', () => {
		// a=5, b=3 => e = sqrt(1 - 9/25) = sqrt(16/25) = 4/5 = 0.8
		const ellipse: ConicParams = {
			type: 'ellipse',
			center: { x: 0, y: 0 },
			a: 5,
			b: 3,
			rotation: 0
		};
		expect(eccentricity(ellipse)).toBeCloseTo(0.8);
	});

	it('parabola: e = 1', () => {
		const par: ConicParams = {
			type: 'parabola',
			a: 1,
			b: 1,
			p: 1,
			vertex: { x: 0, y: 0 },
			rotation: 0
		};
		expect(eccentricity(par)).toBe(1);
	});

	it('hyperbola: e > 1', () => {
		// a=3, b=4 => e = sqrt(1 + 16/9) = sqrt(25/9) = 5/3
		const hyp: ConicParams = { type: 'hyperbola', center: { x: 0, y: 0 }, a: 3, b: 4, rotation: 0 };
		expect(eccentricity(hyp)).toBeCloseTo(5 / 3);
	});

	it('degenerate: NaN', () => {
		const deg: ConicParams = { type: 'degenerate', a: 0, b: 0, rotation: 0 };
		expect(eccentricity(deg)).toBeNaN();
	});
});

// =============================================================================
// polarLine
// =============================================================================

describe('polarLine', () => {
	it('circle x^2 + y^2 - r^2 = 0: polar of external point', () => {
		// Circle: x² + y² - 25 = 0 (r=5), point P = (10, 0)
		// Polar: 10x + 0y - 25 = 0 => x = 2.5
		const result = polarLine([1, 0, 1, 0, 0, -25], 10, 0);
		expect(result).not.toBeNull();

		// The line x = 2.5 should pass through (2.5, 0) and (2.5, 1)
		expect(linePassesThrough(result!, 2.5, 0)).toBe(true);
		expect(linePassesThrough(result!, 2.5, 1)).toBe(true);
	});

	it('point on circle: polar is tangent', () => {
		// Circle x² + y² - 25 = 0, point (5, 0) on the circle
		// Polar: 5x - 25 = 0 => x = 5 (vertical tangent)
		const result = polarLine([1, 0, 1, 0, 0, -25], 5, 0);
		expect(result).not.toBeNull();
		expect(linePassesThrough(result!, 5, 0)).toBe(true);
		expect(linePassesThrough(result!, 5, 1)).toBe(true);
	});

	it('point at center: returns null (degenerate)', () => {
		// Circle x² + y² - 25 = 0, center (0,0)
		const result = polarLine([1, 0, 1, 0, 0, -25], 0, 0);
		expect(result).toBeNull();
	});

	it('ellipse: polar of a point', () => {
		// Ellipse x²/4 + y²/9 = 1 => (1/4)x² + (1/9)y² - 1 = 0
		// Or equivalently: 9x² + 4y² - 36 = 0 (A=9, B=0, C=4, D=0, E=0, F=-36)
		// Polar of (2, 0) (on the ellipse): 9*2*x + 4*0*y - 36 = 0 => 18x = 36 => x = 2
		const result = polarLine([9, 0, 4, 0, 0, -36], 2, 0);
		expect(result).not.toBeNull();
		expect(linePassesThrough(result!, 2, 0)).toBe(true);
		expect(linePassesThrough(result!, 2, 5)).toBe(true);
	});

	it('non-centered conic: correct polar computation', () => {
		// Circle (x-1)² + (y-1)² - 4 = 0
		// Expanded: x² - 2x + 1 + y² - 2y + 1 - 4 = 0
		// => x² + y² - 2x - 2y - 2 = 0  (A=1, B=0, C=1, D=-2, E=-2, F=-2)
		// Polar of P = (1, 1) (center): should be degenerate
		const result = polarLine([1, 0, 1, -2, -2, -2], 1, 1);
		expect(result).toBeNull();
	});

	it('polar of point for circle with known distance', () => {
		// Circle x² + y² - r² = 0, r = 5, point at (d, 0) with d = 10
		// Polar line at x = r²/d = 25/10 = 2.5
		const result = polarLine([1, 0, 1, 0, 0, -25], 10, 0);
		expect(result).not.toBeNull();
		expect(linePassesThrough(result!, 2.5, 0)).toBe(true);
	});
});
