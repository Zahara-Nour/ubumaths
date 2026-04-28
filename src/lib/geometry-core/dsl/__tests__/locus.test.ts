/**
 * Tests for lieu() — locus (lieu géométrique).
 *
 * Covers: driver on circle/segment/function/conic/arc/line,
 * reactivity, closed paths, discontinuities, error cases, serialization.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { runDsl, serializeDsl } from '../index';
import { numeric } from '../../types/geo-value';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

const defaultViewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function getLocusCurve(figure: ReturnType<typeof run>['figure'], locusId: string) {
	return figure.computeLocusCurveForElement(locusId, defaultViewport);
}

function getLocusId(symbols: Map<string, { figureId?: string }>, name: string): string {
	const sym = symbols.get(name);
	if (!sym?.figureId) throw new Error(`Symbol "${name}" not found`);
	return sym.figureId;
}

// =============================================================================
// Basic locus: driver on circle
// =============================================================================

describe('lieu() — driver on circle', () => {
	const script = [
		'O = point(0, 0)',
		'c = cercle(O, rayon=3)',
		'A = point_sur(c, 0)',
		'B = symetrie(A, centre=O)',
		'L = lieu(B, A)'
	].join('\n');

	it('creates a locus element', () => {
		const { figure, symbols } = run(script);
		const locId = getLocusId(symbols, 'L');
		const el = figure.getElementById(locId);
		expect(el).toBeDefined();
		expect(el!.type).toBe('locus');
	});

	it('produces a SampledCurve with points', () => {
		const { figure, symbols } = run(script);
		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(50);
	});

	it('symmetry through center on circle → circle locus', () => {
		const { figure, symbols } = run(script);
		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();

		// All points should be at distance 3 from origin (same circle)
		for (const pt of curve!.points) {
			const dist = Math.sqrt(pt.x ** 2 + pt.y ** 2);
			expect(dist).toBeCloseTo(3, 1);
		}
	});

	it('closed path has no discontinuities for circle driver', () => {
		const { figure, symbols } = run(script);
		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();
		expect(curve!.discontinuityIndices.length).toBe(0);
	});
});

// =============================================================================
// Driver on segment
// =============================================================================

describe('lieu() — driver on segment', () => {
	it('midpoint locus of segment driver → segment', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(10, 0)',
			's = segment(A, B)',
			'P = point(0, 6)',
			'D = point_sur(s, 0.5)',
			'M = milieu(D, P)',
			'L = lieu(M, D)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();

		// All points should have y ≈ 3 (midpoint between y=0 and y=6)
		for (const pt of curve!.points) {
			expect(pt.y).toBeCloseTo(3, 1);
		}

		// x range should span from 0 to 5 (midpoint of [0..10] with P.x=0)
		const xs = curve!.points.map((p) => p.x);
		expect(Math.min(...xs)).toBeCloseTo(0, 0);
		expect(Math.max(...xs)).toBeCloseTo(5, 0);
	});
});

// =============================================================================
// Driver on function curve
// =============================================================================

describe('lieu() — driver on function curve', () => {
	it('symmetry through origin of y=x^2 → inverted parabola', () => {
		const script = [
			'O = point(0, 0)',
			'f = courbe("y=x^2")',
			'A = point_sur(f, 0)',
			'B = symetrie(A, centre=O)',
			'L = lieu(B, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(50);

		// Points should satisfy B = -A, so y ≈ -x^2
		for (const pt of curve!.points) {
			if (Math.abs(pt.x) < 5) {
				expect(pt.y).toBeCloseTo(-(pt.x ** 2), 0);
			}
		}
	});
});

// =============================================================================
// Driver on quadratic curve (ellipse)
// =============================================================================

describe('lieu() — driver on quadratic curve', () => {
	it('driver on ellipse, midpoint with fixed point', () => {
		const script = [
			'P = point(5, 0)',
			'e = courbe("4*x^2 + 9*y^2 - 36 = 0")',
			'A = point_sur(e, 0)',
			'M = milieu(A, P)',
			'L = lieu(M, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(50);
	});
});

// =============================================================================
// Driver on arc
// =============================================================================

describe('lieu() — driver on arc', () => {
	it('locus from arc driver produces partial curve', () => {
		const script = [
			'O = point(0, 0)',
			'P = point(3, 0)',
			'Q = point(0, 3)',
			'a = arc(P, O, Q)',
			'A = point_sur(a, 0.5)',
			'B = symetrie(A, centre=O)',
			'L = lieu(B, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(10);
	});
});

// =============================================================================
// Driver on line
// =============================================================================

describe('lieu() — driver on line', () => {
	it('locus with driver on line produces curve', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(1, 0)',
			'd = droite(A, B)',
			'P = point(0, 4)',
			'D = point_sur(d, 0)',
			'M = milieu(D, P)',
			'L = lieu(M, D)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();

		// Midpoint of (t, 0) and (0, 4) → y should be ≈ 2
		for (const pt of curve!.points) {
			expect(pt.y).toBeCloseTo(2, 1);
		}
	});
});

// =============================================================================
// Reactivity
// =============================================================================

describe('lieu() — reactivity', () => {
	it('moving a free point updates the locus', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'P = point(5, 0)',
			'M = milieu(A, P)',
			'L = lieu(M, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve1 = getLocusCurve(figure, locId);
		expect(curve1).not.toBeNull();
		const firstPoint1 = curve1!.points[0];

		// Move P to (10, 0)
		const pId = symbols.get('P')!.figureId!;
		figure.movePoint(pId, numeric(10), numeric(0));
		figure.recompute();

		const curve2 = getLocusCurve(figure, locId);
		expect(curve2).not.toBeNull();
		// The locus should have changed
		const firstPoint2 = curve2!.points[0];
		expect(firstPoint2.x).not.toBeCloseTo(firstPoint1.x, 3);
	});
});

// =============================================================================
// Identity: driver = tracer
// =============================================================================

describe('lieu() — identity (driver = tracer)', () => {
	it('lieu(A, A) retraces the path', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'L = lieu(A, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();

		// All points should be on the circle of radius 3
		for (const pt of curve!.points) {
			const dist = Math.sqrt(pt.x ** 2 + pt.y ** 2);
			expect(dist).toBeCloseTo(3, 1);
		}
	});
});

// =============================================================================
// Error cases
// =============================================================================

describe('lieu() — error cases', () => {
	it('throws if driver is not a point_sur', () => {
		expect(() => run('A = point(0, 0)\nB = point(1, 1)\nL = lieu(B, A)')).toThrow(/point_sur/);
	});

	it('throws if tracer does not depend on driver', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'B = point(5, 5)',
			'L = lieu(B, A)'
		].join('\n');
		expect(() => run(script)).toThrow(/ne depend pas/);
	});

	it('throws with wrong argument count', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'L = lieu(A)'
		].join('\n');
		expect(() => run(script)).toThrow(/2 arguments/);
	});
});

// =============================================================================
// Serialization round-trip
// =============================================================================

describe('lieu() — serialization', () => {
	it('round-trips through serialize/parse', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'B = symetrie(A, centre=O)',
			'L = lieu(B, A)'
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);

		expect(serialized).toContain('lieu(');

		const { figure: fig2 } = runDsl(serialized);
		expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);

		// Both should produce valid locus curves
		const locId1 = sym1.get('L')!.figureId!;
		const curve1 = fig1.computeLocusCurveForElement(locId1, defaultViewport);
		expect(curve1).not.toBeNull();
	});
});

// =============================================================================
// Classic constructions
// =============================================================================

describe('lieu() — classic constructions', () => {
	it('midpoint locus: driver on circle, midpoint with fixed → ellipse-like curve', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=4)',
			'A = point_sur(c, 0)',
			'P = point(3, 0)',
			'M = milieu(A, P)',
			'L = lieu(M, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();

		// Midpoint of (4cos θ, 4sin θ) and (3, 0) → ((4cos θ+3)/2, 2sin θ)
		// This is an ellipse centered at (1.5, 0) with semi-axes 2 and 2
		for (const pt of curve!.points) {
			const dx = pt.x - 1.5;
			const dy = pt.y;
			const ellipseVal = (dx / 2) ** 2 + (dy / 2) ** 2;
			expect(ellipseVal).toBeCloseTo(1, 0);
		}
	});
});

// =============================================================================
// Edge cases
// =============================================================================

describe('lieu() — edge cases', () => {
	it('driver on ray: produces valid curve for t >= 0', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(1, 1)',
			'r = demidroite(A, B)',
			'D = point_sur(r, 1)',
			'P = point(5, 0)',
			'M = milieu(D, P)',
			'L = lieu(M, D)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(10);
	});

	it('tracer is intersection that disappears for some driver positions', () => {
		// Line-circle intersection: as driver moves along the segment,
		// the line through driver and fixed point may miss the circle
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=2)',
			'A = point(0, -5)',
			'B = point(0, 5)',
			's = segment(A, B)',
			'D = point_sur(s, 0.5)',
			'P = point(3, 0)',
			'd = droite(D, P)',
			'I = intersection(d, c, choix=1)',
			'L = lieu(I, D)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		// Curve exists but may have gaps where intersection disappears
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(5);
	});

	it('driver on circle with radius 0: degenerate locus', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=0)',
			'A = point_sur(c, 0)',
			'B = symetrie(A, centre=O)',
			'L = lieu(B, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		// All samples collapse to origin
		if (curve) {
			for (const pt of curve.points) {
				expect(pt.x).toBeCloseTo(0, 5);
				expect(pt.y).toBeCloseTo(0, 5);
			}
		}
	});

	it('two loci sharing the same driver produce independent curves', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'P1 = point(2, 0)',
			'P2 = point(-2, 0)',
			'M1 = milieu(A, P1)',
			'M2 = milieu(A, P2)',
			'L1 = lieu(M1, A)',
			'L2 = lieu(M2, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const loc1Id = getLocusId(symbols, 'L1');
		const loc2Id = getLocusId(symbols, 'L2');
		const curve1 = getLocusCurve(figure, loc1Id);
		const curve2 = getLocusCurve(figure, loc2Id);

		expect(curve1).not.toBeNull();
		expect(curve2).not.toBeNull();

		// Centers at (1,0) and (-1,0) respectively
		const cx1 = curve1!.points.reduce((s, p) => s + p.x, 0) / curve1!.points.length;
		const cx2 = curve2!.points.reduce((s, p) => s + p.x, 0) / curve2!.points.length;
		expect(cx1).toBeCloseTo(1, 0);
		expect(cx2).toBeCloseTo(-1, 0);
	});

	it('deep dependency chain: driver → rotation → symetrie → tracer', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=3)',
			'A = point_sur(c, 0)',
			'B = rotation(A, centre=O, angle=45)',
			'C = symetrie(B, centre=O)',
			'L = lieu(C, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();

		// C = -rotation(A, 45) still on circle of radius 3
		for (const pt of curve!.points) {
			const dist = Math.sqrt(pt.x ** 2 + pt.y ** 2);
			expect(dist).toBeCloseTo(3, 1);
		}
	});

	it('driver on function with asymptote produces discontinuities', () => {
		const script = [
			'O = point(0, 0)',
			'f = courbe("y = 1/x")',
			'A = point_sur(f, 1)',
			'B = symetrie(A, centre=O)',
			'L = lieu(B, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();
		// Should have discontinuities near x=0
		expect(curve!.discontinuityIndices.length).toBeGreaterThan(0);
	});

	it('degenerate segment (zero length): all samples at same point', () => {
		const script = [
			'A = point(3, 3)',
			'B = point(3, 3)',
			's = segment(A, B)',
			'D = point_sur(s, 0.5)',
			'P = point(0, 0)',
			'M = milieu(D, P)',
			'L = lieu(M, D)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		if (curve) {
			for (const pt of curve.points) {
				expect(pt.x).toBeCloseTo(1.5, 3);
				expect(pt.y).toBeCloseTo(1.5, 3);
			}
		}
	});

	it('rotation with non-right angle produces smooth closed curve', () => {
		const script = [
			'O = point(0, 0)',
			'c = cercle(O, rayon=2)',
			'A = point_sur(c, 0)',
			'P = point(4, 0)',
			'B = rotation(P, centre=A, angle=60)',
			'L = lieu(B, A)'
		].join('\n');
		const { figure, symbols } = run(script);

		const locId = getLocusId(symbols, 'L');
		const curve = getLocusCurve(figure, locId);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(50);
		// Closed path (driver on circle)
		expect(curve!.discontinuityIndices.length).toBe(0);
	});
});
