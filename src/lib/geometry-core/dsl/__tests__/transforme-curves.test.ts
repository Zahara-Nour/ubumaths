import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import type { GeoQuadraticCurve, GeoImplicitCurve } from '../../types/elements';

describe('transforme() — GeoFunction → ImplicitCurve', () => {
	it('rotates y=x² by 90°', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'f = courbe("y = x^2")',
				'r = rotation(angle=90, centre=O)',
				'f2 = transforme(r, f)'
			].join('\n')
		);
		expect(symbols.get('f2')!.type).toBe('courbe');
		const el = figure.getElementById(symbols.get('f2')!.figureId!);
		expect(el!.type).toBe('implicitCurve');
		// The rotated curve: (1,0) on original → (0,1) on image
		// Check that the implicit fn evaluates to ~0 at the image of (1,1) → (-1,1)
		if (el!.type === 'implicitCurve') {
			const val = el.compiledFn({ x: -1, y: 1 });
			expect(Math.abs(val)).toBeLessThan(0.01);
		}
	});

	it('translates y=x² by (2,3)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2, 3)',
				'f = courbe("y = x^2")',
				't = translation(vecteur=(A, B))',
				'f2 = transforme(t, f)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('f2')!.figureId!);
		expect(el!.type).toBe('implicitCurve');
		// Original: (0,0) is on y=x². Image: (2,3) should be on transformed curve.
		if (el!.type === 'implicitCurve') {
			const val = el.compiledFn({ x: 2, y: 3 });
			expect(Math.abs(val)).toBeLessThan(0.01);
			// Also (3, 4) corresponds to (1, 1) on original
			const val2 = el.compiledFn({ x: 3, y: 4 });
			expect(Math.abs(val2)).toBeLessThan(0.01);
		}
	});

	it('central symmetry of y=x²', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'f = courbe("y = x^2")',
				's = symetrie(centre=O)',
				'f2 = transforme(s, f)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('f2')!.figureId!);
		if (el!.type === 'implicitCurve') {
			// (1,1) on original → (-1,-1) on image
			const val = el.compiledFn({ x: -1, y: -1 });
			expect(Math.abs(val)).toBeLessThan(0.01);
		}
	});
});

describe('transforme() — GeoQuadraticCurve → GeoQuadraticCurve', () => {
	it('translates a circle', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 0)',
				'c = courbe("x^2 + y^2 - 4 = 0")',
				't = translation(vecteur=(A, B))',
				'c2 = transforme(t, c)'
			].join('\n')
		);
		expect(symbols.get('c2')!.type).toBe('courbe');
		const el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoQuadraticCurve;
		expect(el.type).toBe('quadraticCurve');
		// Circle x²+y²=4 translated by (3,0) → (x-3)²+y²=4
		// At (5,0): (5-3)²+0²=4 ✓
		expect(el.conic.type).toBe('circle');
		expect(el.conic.center!.x).toBeCloseTo(3);
		expect(el.conic.center!.y).toBeCloseTo(0);
		expect(el.conic.a).toBeCloseTo(2);
	});

	it('rotates a circle around origin', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = courbe("{x^2}/4 + {y^2}/9 - 1 = 0")',
				'r = rotation(angle=90, centre=O)',
				'c2 = transforme(r, c)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoQuadraticCurve;
		expect(el.type).toBe('quadraticCurve');
		// Ellipse x²/4+y²/9=1 rotated 90° → x²/9+y²/4=1
		expect(el.conic.type).toBe('ellipse');
	});

	it('homothety scales a circle', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = courbe("x^2 + y^2 - 1 = 0")',
				'h = homothetie(rapport=3, centre=O)',
				'c2 = transforme(h, c)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoQuadraticCurve;
		expect(el.type).toBe('quadraticCurve');
		expect(el.conic.type).toBe('circle');
		expect(el.conic.a).toBeCloseTo(3);
	});

	it('reflects a conic (central symmetry)', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(3, 0)',
				'c = courbe("x^2 + y^2 - 4 = 0")',
				's = symetrie(centre=O)',
				'c2 = transforme(s, c)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoQuadraticCurve;
		expect(el.type).toBe('quadraticCurve');
		// Circle at origin reflected through (3,0) → center at (6,0)
		expect(el.conic.type).toBe('circle');
		expect(el.conic.center!.x).toBeCloseTo(6);
		expect(el.conic.a).toBeCloseTo(2);
	});
});

describe('transforme() — conic reactivity', () => {
	it('transformed conic updates when rotation center moves', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = courbe("x^2 + y^2 - 1 = 0")',
				'r = rotation(angle=90, centre=O)',
				'c2 = transforme(r, c)'
			].join('\n')
		);
		// Initially: circle at origin rotated around origin → still at origin
		let el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoQuadraticCurve;
		expect(el.conic.center!.x).toBeCloseTo(0);
		expect(el.conic.center!.y).toBeCloseTo(0);

		// Move O to (2, 0): now circle at origin rotated 90° around (2,0)
		// Image center: rotate (0,0) around (2,0) by 90° → (2, -2)
		const oId = symbols.get('O')!.figureId!;
		figure.movePoint(oId, { kind: 'numeric', value: 2 }, { kind: 'numeric', value: 0 });
		figure.recompute();

		el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoQuadraticCurve;
		expect(el.conic.center!.x).toBeCloseTo(2);
		expect(el.conic.center!.y).toBeCloseTo(-2);
		expect(el.conic.a).toBeCloseTo(1); // radius preserved
	});

	it('transformed conic updates when translation vector moves', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 0)',
				'c = courbe("x^2 + y^2 - 1 = 0")',
				't = translation(vecteur=(A, B))',
				'c2 = transforme(t, c)'
			].join('\n')
		);
		let el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoQuadraticCurve;
		expect(el.conic.center!.x).toBeCloseTo(3);

		// Move B to (5, 2)
		const bId = symbols.get('B')!.figureId!;
		figure.movePoint(bId, { kind: 'numeric', value: 5 }, { kind: 'numeric', value: 2 });
		figure.recompute();

		el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoQuadraticCurve;
		expect(el.conic.center!.x).toBeCloseTo(5);
		expect(el.conic.center!.y).toBeCloseTo(2);
	});
});

describe('transforme() — GeoImplicitCurve', () => {
	it('translates an implicit curve', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 0)',
				'c = courbe("x^3 + y^3 - 3*x*y = 0")',
				't = translation(vecteur=(A, B))',
				'c2 = transforme(t, c)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('c2')!.figureId!) as GeoImplicitCurve;
		expect(el.type).toBe('implicitCurve');
		// Original passes through (0,0). Image should pass through (1,0).
		const val = el.compiledFn({ x: 1, y: 0 });
		expect(Math.abs(val)).toBeLessThan(0.01);
	});
});

describe('Direct syntax — curves', () => {
	it('rotation(courbe, centre=O, angle=90) works for function', () => {
		const { symbols } = runDsl(
			['O = point(0, 0)', 'f = courbe("y = x^2")', 'f2 = rotation(f, centre=O, angle=90)'].join(
				'\n'
			)
		);
		expect(symbols.get('f2')!.type).toBe('courbe');
	});

	it('rotation(courbe, centre=O, angle=45) works for conic', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'c = courbe("x^2 + y^2 - 4 = 0")',
				'c2 = rotation(c, centre=O, angle=45)'
			].join('\n')
		);
		expect(symbols.get('c2')!.type).toBe('courbe');
	});
});

describe('transforme() — composition on curves', () => {
	it('compose(translation, rotation) applied to a function curve', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(0, 0)',
				'B = point(0, 1)',
				'r = rotation(angle=90, centre=O)',
				't = translation(vecteur=(A, B))',
				'f = courbe("y = x^2")',
				'comp = compose(t, r)',
				'f2 = transforme(comp, f)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('f2')!.figureId!);
		expect(el!.type).toBe('implicitCurve');
	});
});
