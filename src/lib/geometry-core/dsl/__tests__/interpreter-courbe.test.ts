/**
 * Integration tests for the courbe() builtin — line detection from equations.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { geoToNumber } from '../../compute/to-number';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

describe('courbe — line detection from equation', () => {
	it('creates a line from explicit equation y = 2*x + 3', () => {
		const { figure } = run('d = courbe("y = 2*x + 3")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);
	});

	it('creates hidden support points', () => {
		const { figure } = run('d = courbe("y = 2*x + 3")');
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		expect(points).toHaveLength(2);
		expect(points[0].visible).toBe(false);
		expect(points[1].visible).toBe(false);
	});

	it('creates a line from implicit equation 2*x - y + 3 = 0', () => {
		const { figure } = run('d = courbe("2*x - y + 3 = 0")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);
	});

	it('creates correct points for y = 2*x + 3', () => {
		const { figure } = run('d = courbe("y = 2*x + 3")');
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');

		// y = 2x + 3 → at x=0, y=3; at x=1, y=5
		const pos0 = figure.getPosition(points[0].id);
		const pos1 = figure.getPosition(points[1].id);
		expect(pos0).toBeDefined();
		expect(pos1).toBeDefined();

		// One point should be (0, 3) and the other (1, 5)
		const p0x = geoToNumber(pos0!.x);
		const p0y = geoToNumber(pos0!.y);
		const p1x = geoToNumber(pos1!.x);
		const p1y = geoToNumber(pos1!.y);

		expect(p0x).toBeCloseTo(0);
		expect(p0y).toBeCloseTo(3);
		expect(p1x).toBeCloseTo(1);
		expect(p1y).toBeCloseTo(5);
	});

	it('creates a vertical line from x = 3', () => {
		const { figure } = run('d = courbe("x = 3")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);

		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		const pos0 = figure.getPosition(points[0].id);
		const pos1 = figure.getPosition(points[1].id);

		// Both x values should be 3
		expect(geoToNumber(pos0!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos1!.x)).toBeCloseTo(3);
		// y values should differ
		expect(geoToNumber(pos0!.y)).not.toBeCloseTo(geoToNumber(pos1!.y));
	});

	it('creates a horizontal line from y = -1', () => {
		const { figure } = run('d = courbe("y = -1")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);

		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		const pos0 = figure.getPosition(points[0].id);
		const pos1 = figure.getPosition(points[1].id);

		// Both y values should be -1
		expect(geoToNumber(pos0!.y)).toBeCloseTo(-1);
		expect(geoToNumber(pos1!.y)).toBeCloseTo(-1);
	});

	it('handles implicit form without = 0: courbe("2*x - y + 3")', () => {
		const { figure } = run('d = courbe("2*x - y + 3")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);
	});

	it('throws for degenerate equation 0 = 0', () => {
		expect(() => run('d = courbe("0 = 0")')).toThrow(DslRuntimeError);
	});

	it('throws when argument is not a string', () => {
		expect(() => run('A = point(0,0)\nd = courbe(A)')).toThrow(DslRuntimeError);
	});
});

describe('courbe — function curves y=f(x)', () => {
	it('creates a GeoFunction for y = x^2', () => {
		const { figure } = run('c = courbe("y = x^2")');
		const functions = figure.getAllElements().filter((e) => e.type === 'function');
		expect(functions).toHaveLength(1);
	});

	it('creates a GeoFunction for y = sin(x)', () => {
		const { figure } = run('c = courbe("y = sin(x)")');
		const functions = figure.getAllElements().filter((e) => e.type === 'function');
		expect(functions).toHaveLength(1);
	});

	it('creates a GeoFunction for implicit form x^2 - y = 0', () => {
		const { figure } = run('c = courbe("x^2 - y = 0")');
		const functions = figure.getAllElements().filter((e) => e.type === 'function');
		expect(functions).toHaveLength(1);
	});

	it('stores the equation string', () => {
		const { figure } = run('c = courbe("y = exp(x)")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		expect(fn).toBeDefined();
		if (fn && fn.type === 'function') {
			expect(fn.equation).toBe('y = exp(x)');
		}
	});

	it('compiles a working evaluator', () => {
		const { figure } = run('c = courbe("y = x^2")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		if (fn && fn.type === 'function') {
			expect(fn.compiledFn({ x: 3 })).toBeCloseTo(9);
			expect(fn.compiledFn({ x: -2 })).toBeCloseTo(4);
		}
	});

	it('compiles a working derivative', () => {
		const { figure } = run('c = courbe("y = x^2")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		if (fn && fn.type === 'function') {
			// f(x) = x^2, f'(x) = 2x
			expect(fn.compiledDerivative({ x: 3 })).toBeCloseTo(6);
			expect(fn.compiledDerivative({ x: -1 })).toBeCloseTo(-2);
		}
	});

	it('handles x*y = 1 as y = 1/x', () => {
		const { figure } = run('c = courbe("x*y = 1")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		expect(fn).toBeDefined();
		if (fn && fn.type === 'function') {
			expect(fn.compiledFn({ x: 2 })).toBeCloseTo(0.5);
		}
	});

	it('handles 2*y - x^2 = 0 as y = x^2/2', () => {
		const { figure } = run('c = courbe("2*y - x^2 = 0")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		if (fn && fn.type === 'function') {
			expect(fn.compiledFn({ x: 4 })).toBeCloseTo(8);
		}
	});

	it('y^2 = x is now handled as a quadratic curve (parabola)', () => {
		const { figure } = run('c = courbe("y^2 = x")');
		const qc = figure.getAllElements().filter((e) => e.type === 'quadraticCurve');
		expect(qc).toHaveLength(1);
	});
});

// =============================================================================
// point_sur — point constrained on curve
// =============================================================================

describe('point_sur — point on curve', () => {
	it('creates a pointOnCurve at given x', () => {
		const { figure } = run('f = courbe("y = x^2")\nP = point_sur(f, 3)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnCurve');
		expect(pts).toHaveLength(1);
	});

	it('computes correct position on the curve', () => {
		const { figure, symbols } = run('f = courbe("y = x^2")\nP = point_sur(f, 3)');
		const pos = figure.getPosition(symbols.get('P')!.figureId!);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(9); // 3^2
	});

	it('defaults to x=0 when no x given', () => {
		const { figure, symbols } = run('f = courbe("y = x^2 + 1")\nP = point_sur(f)');
		const pos = figure.getPosition(symbols.get('P')!.figureId!);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1); // 0^2 + 1
	});

	it('throws when first arg is not a function', () => {
		expect(() => run('A = point(0,0)\nP = point_sur(A, 1)')).toThrow(DslRuntimeError);
	});

	it('is visible and part of point elements', () => {
		const { figure } = run('f = courbe("y = x^2")\nP = point_sur(f, 2)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnCurve');
		expect(pts[0].visible).toBe(true);
	});
});

// =============================================================================
// zeros / extrema / inflections
// =============================================================================

describe('zeros — find zeros of a function', () => {
	it('finds zeros of y = x^2 - 4', () => {
		const { figure } = run('f = courbe("y = x^2 - 4")\nZ = zeros(f)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnCurve');
		// At least 2 zeros: x = -2 and x = 2
		expect(pts.length).toBeGreaterThanOrEqual(2);
	});

	it('zeros are non-draggable', () => {
		const { figure } = run('f = courbe("y = x^2 - 4")\nZ = zeros(f)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnCurve');
		expect(pts.length).toBeGreaterThanOrEqual(2);
		for (const pt of pts) {
			if (pt.type === 'pointOnCurve') {
				expect(pt.draggable).toBe(false);
			}
		}
	});

	it('zeros are at correct positions', () => {
		const { figure } = run('f = courbe("y = x^2 - 4")\nZ = zeros(f)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnCurve');
		expect(pts.length).toBeGreaterThanOrEqual(2);
		const ys = pts.map((p) => {
			const pos = figure.getPosition(p.id);
			return pos ? geoToNumber(pos.y) : null;
		});
		// All y values should be close to 0
		for (const y of ys) {
			if (y !== null) expect(Math.abs(y)).toBeLessThan(0.01);
		}
	});
});

describe('extrema — find local min/max', () => {
	it('finds extrema of y = x^3 - 3*x', () => {
		const { figure } = run('f = courbe("y = x^3 - 3*x")\nE = extrema(f)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnCurve');
		// Should find min at x=1 and max at x=-1
		expect(pts.length).toBeGreaterThanOrEqual(2);
	});

	it('finds minimum of y = x^2', () => {
		const { figure } = run('f = courbe("y = x^2")\nE = extrema(f)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnCurve');
		expect(pts.length).toBeGreaterThanOrEqual(1);
		const pos = figure.getPosition(pts[0].id);
		if (pos) {
			expect(geoToNumber(pos.x)).toBeCloseTo(0, 0);
			expect(geoToNumber(pos.y)).toBeCloseTo(0, 0);
		}
	});
});

// =============================================================================
// courbe — quadratic curves (conics)
// =============================================================================

describe('courbe — quadratic curves (conics)', () => {
	it('creates a quadraticCurve for x^2 + y^2 - 9 = 0 (circle)', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 9 = 0")');
		const qc = figure.getAllElements().filter((e) => e.type === 'quadraticCurve');
		expect(qc).toHaveLength(1);
		if (qc[0].type === 'quadraticCurve') {
			expect(qc[0].conic.type).toBe('circle');
			expect(qc[0].conic.a).toBeCloseTo(3);
		}
	});

	it('creates a quadraticCurve for x^2 - y^2 - 1 = 0 (hyperbola)', () => {
		const { figure } = run('c = courbe("x^2 - y^2 - 1 = 0")');
		const qc = figure.getAllElements().filter((e) => e.type === 'quadraticCurve');
		expect(qc).toHaveLength(1);
		if (qc[0].type === 'quadraticCurve') {
			expect(qc[0].conic.type).toBe('hyperbola');
		}
	});

	it('creates a quadraticCurve for x^2 + x*y + y^2 - 1 = 0 (general conic)', () => {
		const { figure } = run('c = courbe("x^2 + x*y + y^2 - 1 = 0")');
		const qc = figure.getAllElements().filter((e) => e.type === 'quadraticCurve');
		expect(qc).toHaveLength(1);
		if (qc[0].type === 'quadraticCurve') {
			expect(qc[0].conic.type).toBe('ellipse');
		}
	});

	it('stores the equation string', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 9 = 0")');
		const qc = figure.getAllElements().find((e) => e.type === 'quadraticCurve');
		if (qc && qc.type === 'quadraticCurve') {
			expect(qc.equation).toBe('x^2 + y^2 - 9 = 0');
		}
	});

	it('stores numeric coefficients', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 9 = 0")');
		const qc = figure.getAllElements().find((e) => e.type === 'quadraticCurve');
		if (qc && qc.type === 'quadraticCurve') {
			// [A, B, C, D, E, F] = [1, 0, 1, 0, 0, -9]
			expect(qc.coefficients[0]).toBeCloseTo(1); // A
			expect(qc.coefficients[1]).toBeCloseTo(0); // B
			expect(qc.coefficients[2]).toBeCloseTo(1); // C
			expect(qc.coefficients[5]).toBeCloseTo(-9); // F
		}
	});

	it('y = x^2 is still handled as GeoFunction (not quadratic curve)', () => {
		const { figure } = run('c = courbe("y = x^2")');
		const functions = figure.getAllElements().filter((e) => e.type === 'function');
		const qc = figure.getAllElements().filter((e) => e.type === 'quadraticCurve');
		expect(functions).toHaveLength(1);
		expect(qc).toHaveLength(0);
	});

	it('creates implicit curve for non-polynomial sin(x) + y^2 = 1', () => {
		const { figure } = run('c = courbe("sin(x) + y^2 = 1")');
		const implicits = figure.getAllElements().filter((e) => e.type === 'implicitCurve');
		expect(implicits).toHaveLength(1);
	});

	it('creates implicit curve for degree 3 curve x^3 + y^3 = 1', () => {
		const { figure } = run('c = courbe("x^3 + y^3 = 1")');
		const implicits = figure.getAllElements().filter((e) => e.type === 'implicitCurve');
		expect(implicits).toHaveLength(1);
	});
});

// =============================================================================
// point_sur / tangente / zeros on quadratic curves
// =============================================================================

describe('point_sur on quadratic curve', () => {
	it('creates a pointOnQuadraticCurve at angle 0 (default)', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 9 = 0")\nP = point_sur(c)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnQuadraticCurve');
		expect(pts).toHaveLength(1);
	});

	it('point at angle 0 on circle r=3 is at (3, 0)', () => {
		const { figure, symbols } = run('c = courbe("x^2 + y^2 - 9 = 0")\nP = point_sur(c, 0)');
		const pos = figure.getPosition(symbols.get('P')!.figureId!);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('point at angle 90 on circle r=3 is at (0, 3)', () => {
		const { figure, symbols } = run('c = courbe("x^2 + y^2 - 9 = 0")\nP = point_sur(c, 90)');
		const pos = figure.getPosition(symbols.get('P')!.figureId!);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});
});

describe('tangente on quadratic curve', () => {
	it('creates a tangentToQuadratic with a point', () => {
		const { figure } = run(
			'c = courbe("x^2 + y^2 - 9 = 0")\nP = point_sur(c, 0)\nt = tangente(c, P)'
		);
		const tgs = figure.getAllElements().filter((e) => e.type === 'tangentToQuadratic');
		expect(tgs).toHaveLength(1);
	});

	it('creates a tangentToQuadratic with a fixed angle', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 9 = 0")\nt = tangente(c, 45)');
		const tgs = figure.getAllElements().filter((e) => e.type === 'tangentToQuadratic');
		expect(tgs).toHaveLength(1);
	});
});

describe('zeros on quadratic curve', () => {
	it('finds zeros of circle x^2 + y^2 - 9 = 0 (two x-intercepts)', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 9 = 0")\nZ = zeros(c)');
		// x² - 9 = 0 → x = ±3
		const visiblePts = figure.getAllElements().filter((e) => e.type === 'freePoint' && e.visible);
		expect(visiblePts.length).toBeGreaterThanOrEqual(2);
	});

	it('zeros are at correct x positions for circle', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 9 = 0")\nZ = zeros(c)');
		const pts = figure
			.getAllElements()
			.filter((e) => e.type === 'freePoint' && e.visible && !e.draggable);
		const xs = pts
			.map((p) => {
				const pos = figure.getPosition(p.id);
				return pos ? geoToNumber(pos.x) : null;
			})
			.filter((x): x is number => x !== null)
			.sort((a, b) => a - b);
		expect(xs).toHaveLength(2);
		expect(xs[0]).toBeCloseTo(-3);
		expect(xs[1]).toBeCloseTo(3);
	});

	it('zeros y-values are 0', () => {
		const { figure } = run('c = courbe("x^2 + y^2 - 9 = 0")\nZ = zeros(c)');
		const pts = figure
			.getAllElements()
			.filter((e) => e.type === 'freePoint' && e.visible && !e.draggable);
		expect(pts.length).toBeGreaterThan(0);
		for (const pt of pts) {
			const pos = figure.getPosition(pt.id);
			if (pos) expect(geoToNumber(pos.y)).toBeCloseTo(0);
		}
	});
});

describe('inflections — find inflection points', () => {
	it('finds inflection of y = x^3', () => {
		const { figure } = run('f = courbe("y = x^3")\nI = inflections(f)');
		const pts = figure.getAllElements().filter((e) => e.type === 'pointOnCurve');
		expect(pts.length).toBeGreaterThanOrEqual(1);
		const pos = figure.getPosition(pts[0].id);
		if (pos) {
			expect(geoToNumber(pos.x)).toBeCloseTo(0, 0);
		}
	});
});
