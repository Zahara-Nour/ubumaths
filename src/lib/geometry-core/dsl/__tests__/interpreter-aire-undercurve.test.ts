/**
 * Phase 2 — DSL builtin `aire(f, a, b)` (overload of existing `case 'aire'`).
 *
 * The pre-existing `case 'aire'` in builtins.ts computes a polygon area
 * from ≥ 3 point arguments. Phase 2 extends it: when called with
 * `aire(fn, a, b)` (3 args, first is a GeoFunction), the case routes to
 * `figure.createIntegralArea(..., { signed: false })` for the geometric
 * area between the curve and the x-axis.
 *
 * Spec: `docs/wip/geometry/aire-study.md` §3 (API DSL) + §0 décision 2 (overload).
 *
 * Red-first TDD.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDsl } from '..';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	return runDsl(script);
}

// =============================================================================
// A. Polygon-area regression — existing aire(P1, P2, P3) behavior preserved
// =============================================================================

describe('aire() — polygon area (V1 regression, pre-existing behavior)', () => {
	it('A1: aire(P1, P2, P3) for a triangle is unaffected by the overload', () => {
		const { figure, symbols } = run(
			`P1 = point(0, 0)
P2 = point(2, 0)
P3 = point(0, 2)
A = aire(P1, P2, P3)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(2, 8);
	});

	it('A2: aire(P1, P2, P3, P4) for a quadrilateral still works (>= 3 args)', () => {
		const { figure, symbols } = run(
			`P1 = point(0, 0)
P2 = point(2, 0)
P3 = point(2, 2)
P4 = point(0, 2)
A = aire(P1, P2, P3, P4)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(4, 8);
	});

	it('A3: < 3 args still throws the same error as before', () => {
		expect(() =>
			run(
				`P1 = point(0, 0)
P2 = point(1, 0)
A = aire(P1, P2)`
			)
		).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// B. Aire-under-curve overload — aire(f, a, b)
// =============================================================================

describe('aire() — under-curve overload (signed=false)', () => {
	it('B1: aire(f, 0, 1) with f = x^2 returns 1/3 (positive)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 3, 6);
	});

	it('B2: aire(f, -1, 1) with f = x^3 - x returns 0.5 (vs integrale = 0)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^3 - x")
A = aire(f, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(0.5, 6);
	});

	it('B3: the exposed symbol is a scalar (the value)', () => {
		const { symbols } = run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1)`
		);
		const A = symbols.get('A');
		expect(A).toBeDefined();
		expect(A!.type).toBe('scalar');
	});

	it('B4: a GeoIntegralArea (signed=false) is created internally', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1)`
		);
		const areas = figure.getAllElements().filter((e) => e.type === 'integralArea');
		expect(areas).toHaveLength(1);
		expect((areas[0] as unknown as { signed: boolean }).signed).toBe(false);
	});

	it('B5: integrale and aire on same f are independent (integrale signed=true, aire signed=false)', () => {
		const { figure } = run(
			`f = courbe("y = x^3 - x")
I = integrale(f, -1, 1)
A = aire(f, -1, 1)`
		);
		const areas = figure.getAllElements().filter((e) => e.type === 'integralArea') as unknown as {
			signed: boolean;
		}[];
		expect(areas).toHaveLength(2);
		const signedFlags = areas.map((a) => a.signed).sort();
		expect(signedFlags).toEqual([false, true]);
	});

	it('B6: aire(f, a, b) with sliders reacts to slider drag', () => {
		const { figure, symbols } = run(
			`f = courbe("y = sin(x)")
b = slider(min=0, max=10, valeur=3.14159265358979)
A = aire(f, 0, b)`
		);
		const aId = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;
		// At b ≈ π, aire = 2 (∫₀^π sin = 2, no sign change)
		expect(figure.getScalarValue(aId)).toBeCloseTo(2, 4);
		// Move b past π to 2π → aire = 4 (sign change at π handled)
		figure.beginTransaction();
		figure.moveSlider(bId, 2 * Math.PI);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(aId)).toBeCloseTo(4, 4);
	});

	it('B7: numeric fallback works (gaussienne)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = e^{-x^2}")
A = aire(f, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1.4937, 3);
	});

	it('B8: inverted bounds → same value (orientation ignored for aire)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^3 - x")
A = aire(f, 1, -1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(0.5, 6);
	});
});

// =============================================================================
// C. Inline style on the aire area (same named args as integrale)
// =============================================================================

describe('aire() — inline style', () => {
	it('C1: couleur named arg sets the area color', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1, couleur="rouge")`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea');
		expect(area).toBeDefined();
		expect((area as { color?: string }).color).toBeDefined();
	});

	it('C2: opacite_fond named arg sets the area fillOpacity', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1, opacite_fond=0.5)`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea');
		expect((area as { style?: { fillOpacity?: number } }).style?.fillOpacity).toBe(0.5);
	});

	it('C3: aire defaults to green (#22c55e) when no couleur is specified', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1)`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea');
		expect((area as { color?: string }).color).toBe('#22c55e');
	});

	it('C4: explicit couleur overrides the green default (via applyInlineStyle on el.style.color)', () => {
		// When user passes couleur="rouge", applyInlineStyle sets el.style.color
		// which takes precedence over el.color in resolveStyle (cf. svg-primitives.ts:82).
		const { figure } = run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1, couleur="rouge")`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea') as unknown as {
			color?: string;
			style?: { color?: string };
		};
		// el.color may still be the green default, but el.style.color must reflect "rouge".
		expect(area.style?.color).toBeDefined();
		expect(area.style?.color).not.toBe('#22c55e');
	});

	it('C5: integrale stays blue (V1 default unchanged), aire is green', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
I = integrale(f, 0, 1)
A = aire(f, 0, 1)`
		);
		const areas = figure.getAllElements().filter((e) => e.type === 'integralArea') as unknown as {
			signed: boolean;
			color?: string;
		}[];
		const integraleArea = areas.find((a) => a.signed === true);
		const aireArea = areas.find((a) => a.signed === false);
		expect(integraleArea?.color).not.toBe('#22c55e'); // not green (default blue or whatever V1 uses)
		expect(aireArea?.color).toBe('#22c55e');
	});
});

// =============================================================================
// D. Singularity warn — same as integrale, but message says "aire"
// =============================================================================

describe('aire() — singularity warn', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('D1: emits a console.warn when the integrand has a pole inside [a, b]', () => {
		run(
			`f = courbe("y = 1/x")
A = aire(f, -1, 1)`
		);
		expect(warnSpy).toHaveBeenCalled();
	});

	it('D2: warn message prefix is "aire ligne X:" (not "integrale")', () => {
		run(
			`f = courbe("y = 1/x")
A = aire(f, -1, 1)`
		);
		const message = warnSpy.mock.calls[0][0] as string;
		expect(message).toMatch(/aire ligne 2:/);
		expect(message).not.toMatch(/integrale ligne/);
	});

	it('D3: does NOT warn when the integrand is clean on [a, b]', () => {
		run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1)`
		);
		expect(warnSpy).not.toHaveBeenCalled();
	});
});

// =============================================================================
// E. Disambiguation edge cases
// =============================================================================

describe('aire() — overload disambiguation', () => {
	it('E1: aire(f, a, b) where a, b are scalars → routes to under-curve branch', () => {
		// All 3 args are non-points → first arg being a function should trigger overload.
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
a = slider(min=-1, max=1, valeur=0)
b = slider(min=0, max=2, valeur=1)
A = aire(f, a, b)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 3, 6);
		const areas = figure.getAllElements().filter((e) => e.type === 'integralArea');
		expect(areas).toHaveLength(1);
	});

	it('E2: aire(f, a, b) where bounds are not numbers/scalars → clear error', () => {
		// Bounds must be numbers or scalar/slider refs. A point is not valid.
		expect(() =>
			run(
				`f = courbe("y = x^2")
P = point(0, 0)
A = aire(f, P, 1)`
			)
		).toThrow(DslRuntimeError);
	});
});
