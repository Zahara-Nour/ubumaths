/**
 * Tests for GeoScalar DSL integration.
 *
 * Covers: distance(), angle(), norme() as scalar, slider(),
 * scalar arithmetic, scalar as parameter (rayon, angle, rapport),
 * locus with scalar chain.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

const defaultViewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function sym(result: ReturnType<typeof run>, name: string) {
	return result.symbols.allEntries().get(name);
}

// =============================================================================
// A. Scalar builtins
// =============================================================================

describe('DSL: distance() scalar', () => {
	it('creates a scalar with correct value', () => {
		const r = run(['A = point(0, 0)', 'B = point(3, 4)', 'd = distance(A, B)'].join('\n'));
		const s = sym(r, 'd');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(5, 10);
	});
});

describe('DSL: angle() scalar', () => {
	it('creates a scalar with correct angle value', () => {
		const r = run(
			['P = point(1, 0)', 'O = point(0, 0)', 'Q = point(0, 1)', 'a = angle(P, O, Q)'].join('\n')
		);
		const s = sym(r, 'a');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(90, 3);
	});
});

describe('DSL: norme() returns scalar', () => {
	it('creates a scalar element', () => {
		const r = run(
			['A = point(0, 0)', 'B = point(3, 4)', 'v = vecteur(A, B)', 'n = norme(v)'].join('\n')
		);
		const s = sym(r, 'n');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(5, 10);
	});
});

describe('DSL: slider()', () => {
	it('creates a slider with initial value', () => {
		const r = run('k = slider(min=0, max=10, valeur=3)');
		const s = sym(r, 'k');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBe(3);
	});

	it('clamps initial value to bounds', () => {
		const r = run('k = slider(min=0, max=10, valeur=20)');
		expect(r.figure.getScalarValue(sym(r, 'k')!.figureId!)).toBe(10);
	});
});

// =============================================================================
// B. Scalar arithmetic
// =============================================================================

describe('DSL: scalar arithmetic', () => {
	it('scalar / number creates composed scalar', () => {
		const r = run(
			['A = point(0, 0)', 'B = point(5, 0)', 'd = distance(A, B)', 'r = 3 / d'].join('\n')
		);
		const s = sym(r, 'r');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(0.6, 10);
	});

	it('number + scalar creates composed scalar', () => {
		const r = run(
			['A = point(0, 0)', 'B = point(5, 0)', 'd = distance(A, B)', 'r = 1 + 3/d'].join('\n')
		);
		const s = sym(r, 'r');
		expect(s).toBeDefined();
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(1.6, 10);
	});

	it('unary minus on scalar', () => {
		const r = run(
			['A = point(0, 0)', 'B = point(3, 0)', 'd = distance(A, B)', 'r = -d'].join('\n')
		);
		const s = sym(r, 'r');
		expect(s!.type).toBe('scalar');
		expect(r.figure.getScalarValue(s!.figureId!)).toBeCloseTo(-3, 10);
	});
});

// =============================================================================
// C. Scalar as parameter
// =============================================================================

describe('DSL: scalar as parameter', () => {
	it('cercle with scalar rayon', () => {
		const r = run(
			[
				'A = point(0, 0)',
				'B = point(3, 0)',
				'd = distance(A, B)',
				'O = point(5, 0)',
				'c = cercle(O, rayon=d)'
			].join('\n')
		);
		const circId = sym(r, 'c')!.figureId!;
		const el = r.figure.getElementById(circId)!;
		expect(el.type).toBe('circleByRadius');
		expect(el.dependsOn.length).toBeGreaterThan(1);
	});

	it('homothetie with scalar rapport', () => {
		const r = run(
			[
				'A = point(0, 0)',
				'B = point(5, 0)',
				'd = distance(A, B)',
				'r = 1 + 3/d',
				'C = point(1, 0)',
				'O = point(0, 0)',
				'P = homothetie(C, centre=O, rapport=r)'
			].join('\n')
		);
		const pos = r.figure.getPosition(sym(r, 'P')!.figureId!);
		expect(pos).not.toBeNull();
		// factor = 1 + 3/5 = 1.6, source = (1,0), center = (0,0) → (1.6, 0)
		const x = pos!.x.kind === 'numeric' ? pos!.x.value : 0;
		expect(x).toBeCloseTo(1.6, 5);
	});

	it('rotation with slider angle (degrees)', () => {
		const r = run(
			[
				't = slider(min=0, max=360, valeur=90)',
				'A = point(1, 0)',
				'O = point(0, 0)',
				'R = rotation(A, centre=O, angle=t)'
			].join('\n')
		);
		const pos = r.figure.getPosition(sym(r, 'R')!.figureId!);
		expect(pos).not.toBeNull();
		// 90 degrees: (1,0) → (0,1)
		const x = pos!.x.kind === 'numeric' ? pos!.x.value : 0;
		const y = pos!.y.kind === 'numeric' ? pos!.y.value : 0;
		expect(x).toBeCloseTo(0, 3);
		expect(y).toBeCloseTo(1, 3);
	});
});

// =============================================================================
// D. Locus with scalar chain (limacon)
// =============================================================================

describe('DSL: locus with scalar', () => {
	it('limacon de Pascal via scalar chain', () => {
		const r = run(
			[
				'K = point(0, 0)',
				'c = cercle(K, rayon=2)',
				'O = point(2, 0)',
				'A = point_sur(c, 90)',
				'n = distance(O, A)',
				'r = 1 + 3/n',
				'P = homothetie(A, centre=O, rapport=r)',
				'L = lieu(P, A)'
			].join('\n')
		);
		const locId = sym(r, 'L')!.figureId!;
		const curve = r.figure.computeLocusCurveForElement(locId, defaultViewport);
		expect(curve).not.toBeNull();
		expect(curve!.points.length).toBeGreaterThan(50);
	});
});

// =============================================================================
// E. Distinction distance() vs mesure()
// =============================================================================

describe('DSL: distance() vs mesure()', () => {
	it('distance() creates invisible scalar', () => {
		const r = run(['A = point(0, 0)', 'B = point(3, 4)', 'd = distance(A, B)'].join('\n'));
		const el = r.figure.getElementById(sym(r, 'd')!.figureId!);
		expect(el!.visible).toBe(false);
	});

	it('mesure() creates visible measure', () => {
		const r = run(['A = point(0, 0)', 'B = point(3, 4)', 'm = mesure(A, B)'].join('\n'));
		const el = r.figure.getElementById(sym(r, 'm')!.figureId!);
		expect(el!.visible).toBe(true);
	});

	it('mesure can be used as scalar param', () => {
		const r = run(
			[
				'A = point(0, 0)',
				'B = point(3, 0)',
				'm = mesure(A, B)',
				'O = point(5, 0)',
				'c = cercle(O, rayon=m)'
			].join('\n')
		);
		const circId = sym(r, 'c')!.figureId!;
		const el = r.figure.getElementById(circId)!;
		expect(el.dependsOn.length).toBeGreaterThan(1);
	});
});

// =============================================================================
// F. DSL scalar division by zero
// =============================================================================

describe('DSL: scalar division by zero', () => {
	it('scalar / 0 produces NaN, not 0', () => {
		const r = run(
			['A = point(0, 0)', 'B = point(0, 0)', 'd = distance(A, B)', 'r = 3 / d'].join('\n')
		);
		const val = r.figure.getScalarValue(sym(r, 'r')!.figureId!);
		// Should be NaN from the composed scalar, not 0
		expect(Number.isNaN(val)).toBe(true);
	});
});

// =============================================================================
// G. DSL scalar with multiple operations
// =============================================================================

describe('DSL: complex scalar expressions', () => {
	it('chain of operations: (1 + 3/d) * 2', () => {
		const r = run(
			['A = point(0, 0)', 'B = point(5, 0)', 'd = distance(A, B)', 'r = (1 + 3/d) * 2'].join('\n')
		);
		// (1 + 3/5) * 2 = 1.6 * 2 = 3.2
		expect(r.figure.getScalarValue(sym(r, 'r')!.figureId!)).toBeCloseTo(3.2, 10);
	});

	it('scalar * scalar', () => {
		const r = run(
			[
				'A = point(0, 0)',
				'B = point(3, 0)',
				'C = point(0, 4)',
				'd1 = distance(A, B)',
				'd2 = distance(A, C)',
				'p = d1 * d2'
			].join('\n')
		);
		// 3 * 4 = 12
		expect(r.figure.getScalarValue(sym(r, 'p')!.figureId!)).toBeCloseTo(12, 10);
	});

	it('slider used in arithmetic expression', () => {
		const r = run(['k = slider(min=0, max=10, valeur=4)', 'r = k * 2 + 1'].join('\n'));
		// 4 * 2 + 1 = 9
		expect(r.figure.getScalarValue(sym(r, 'r')!.figureId!)).toBeCloseTo(9, 10);
	});
});
