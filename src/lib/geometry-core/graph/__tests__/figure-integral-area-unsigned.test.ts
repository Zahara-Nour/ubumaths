/**
 * Phase 1 (aire builtin) — `signed: boolean` flag on GeoIntegralArea +
 * `createIntegralArea` factory branch for aire géométrique (unsigned area).
 *
 * Spec: `docs/wip/geometry/aire-study.md` §0 (decision α — flag on existing
 * type, V1 backward compat preserved). 19 behaviors validated by the user.
 *
 * Red-first TDD: these tests must fail before implementation.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../../dsl';
import { numeric, type ScalarParam } from '../../types/geo-value';

interface GeoIntegralAreaShape {
	type: 'integralArea';
	id: string;
	functionId: string;
	lowerBound: ScalarParam;
	upperBound: ScalarParam;
	signed: boolean;
	antiderivative: unknown;
	compiledF: ((vars: { x: number }) => number) | null;
	integrationStatus: 'exact' | 'approximate' | 'unsupported';
	dependsOn: readonly string[];
	_scalarId: string;
}

function setupFigureWithFn(eq: string) {
	// Curve equations follow the active angle mode; DSL default is degrees.
	// These tests work in radians (mathAST native), so opt in explicitly.
	const { figure, symbols } = runDsl(`unite_angle("radians")\nf = courbe("${eq}")`);
	const fnId = symbols.get('f')!.figureId!;
	return { figure, fnId };
}

function getArea(figure: ReturnType<typeof setupFigureWithFn>['figure'], areaId: string) {
	return figure.getElementById(areaId) as unknown as GeoIntegralAreaShape;
}

// =============================================================================
// A. Backward compatibility V1 — signed defaults to true (integrale signed)
// =============================================================================

describe('createIntegralArea — V1 backward compatibility (signed defaults to true)', () => {
	it('A1: no options → signed is true', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const area = getArea(figure, areaId);
		expect(area.signed).toBe(true);
	});

	it('A2: explicit signed:true → identical to default', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1), {
			signed: true
		});
		const area = getArea(figure, areaId);
		expect(area.signed).toBe(true);
	});

	it('A3: signed=true compute returns F(b) - F(a) (signed, can be negative)', () => {
		// ∫₀¹ x³ - x dx = -1/4 (signed)
		const { figure, fnId } = setupFigureWithFn('y = x^3 - x');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(-1 / 4, 8);
	});

	it('A4: signed=true with inverted bounds → -∫ₐᵇ (convention standard)', () => {
		// ∫₁⁰ x² dx = -∫₀¹ x² dx = -1/3
		// (Note: y = x is parsed as a line, not a function; we use y = x^2 to stay in
		// the GeoFunction path.)
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(1), numeric(0));
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(-1 / 3, 8);
	});
});

// =============================================================================
// B. Aire géométrique — signed=false (new behavior)
// =============================================================================

describe('createIntegralArea — aire géométrique (signed=false)', () => {
	it('B6: explicit signed:false → element has signed:false', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1), {
			signed: false
		});
		const area = getArea(figure, areaId);
		expect(area.signed).toBe(false);
	});

	it('B7: f ≥ 0 → aire = integrale (positive)', () => {
		// aire(x², 0, 1) = 1/3
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1 / 3, 6);
	});

	it('B8: sign change → aire = sum of |sub-integrals| (positive)', () => {
		// aire(x³ - x, -1, 1) = 1/2 (vs integrale = 0)
		const { figure, fnId } = setupFigureWithFn('y = x^3 - x');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(-1), numeric(1), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(0.5, 6);
	});

	it('B9: tangent zero (multiplicité paire) → splittage harmless', () => {
		// aire((x-1)², 0, 2) = 2/3. Tangent zero at x=1 should not corrupt the sum.
		const { figure, fnId } = setupFigureWithFn('y = (x - 1)^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(2), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2 / 3, 6);
	});

	it('B10: trig sign change at π → aire(sin(x), 0, 2π) = 4', () => {
		const { figure, fnId } = setupFigureWithFn('y = sin(x)');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(2 * Math.PI), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(4, 6);
	});

	it('B11: cos(x) on [0, π] → aire = 2 (vs integrale = 0)', () => {
		const { figure, fnId } = setupFigureWithFn('y = cos(x)');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(Math.PI), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2, 6);
	});

	it('B12: signed=false ignores bounds orientation (a > b)', () => {
		// aire(x³ - x, 1, -1) = aire(x³ - x, -1, 1) = 0.5
		const { figure, fnId } = setupFigureWithFn('y = x^3 - x');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(1), numeric(-1), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(0.5, 6);
	});

	it('B13: equal bounds → aire = 0', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(2), numeric(2), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(0, 10);
	});

	it('B14: numeric fallback (gaussienne) → aire(e^{-x²}, -1, 1) ≈ 1.4937', () => {
		const { figure, fnId } = setupFigureWithFn('y = e^{-x^2}');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(-1), numeric(1), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1.4937, 3);
	});
});

// =============================================================================
// C. Réactivité — slider drag updates aire correctly
// =============================================================================

describe('createIntegralArea — reactivity (signed=false)', () => {
	it('C15: lower slider drag → aire recomputes correctly', () => {
		// f = x², b = 1 fixed, lower a starts at 0 (aire = 1/3) then moves to -1 (aire = 2/3)
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const lower = figure.createSlider(-2, 2, 0);
		const { scalarId } = figure.createIntegralArea(fnId, { scalarRef: lower }, numeric(1), {
			signed: false
		});
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1 / 3, 6);
		figure.beginTransaction();
		figure.moveSlider(lower, -1);
		figure.recompute();
		figure.commit();
		// aire(x², -1, 1) = 2/3 (positive, no sign change since x² ≥ 0)
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2 / 3, 6);
	});

	it('C16: upper slider drag → aire recomputes correctly', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const upper = figure.createSlider(0, 3, 1);
		const { scalarId } = figure.createIntegralArea(
			fnId,
			numeric(0),
			{ scalarRef: upper },
			{ signed: false }
		);
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1 / 3, 6);
		figure.beginTransaction();
		figure.moveSlider(upper, 2);
		figure.recompute();
		figure.commit();
		// aire(x², 0, 2) = 8/3
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(8 / 3, 6);
	});

	it('C17: slider drag past a zero of f → splittage adapts dynamically', () => {
		// f = sin(x), a = π/2, b = slider. At b = π/2, aire = 0; at b = 3π/2,
		// f changes sign at π → aire = |∫_{π/2}^{π} sin| + |∫_{π}^{3π/2} sin|
		// = |1 - 0| + |0 - 1| = 2
		const { figure, fnId } = setupFigureWithFn('y = sin(x)');
		const upper = figure.createSlider(0, 2 * Math.PI, Math.PI / 2);
		const { scalarId } = figure.createIntegralArea(
			fnId,
			numeric(Math.PI / 2),
			{ scalarRef: upper },
			{ signed: false }
		);
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(0, 6);
		figure.beginTransaction();
		figure.moveSlider(upper, (3 * Math.PI) / 2);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2, 6);
	});
});

// =============================================================================
// D. Validation inputs (héritée V1 — comportement inchangé pour signed=false)
// =============================================================================

describe('createIntegralArea — validation (signed=false inherits V1 errors)', () => {
	it('D18: rejects when functionId is not a GeoFunction (signed=false)', () => {
		const { figure } = setupFigureWithFn('y = x^2');
		const pt = figure.createFreePoint({ x: numeric(0), y: numeric(0) });
		expect(() => figure.createIntegralArea(pt, numeric(0), numeric(1), { signed: false })).toThrow(
			/function/i
		);
	});

	it('D19: rejects when scalarRef points to a non-existent id (signed=false)', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		expect(() =>
			figure.createIntegralArea(fnId, { scalarRef: 'ghost' }, numeric(1), { signed: false })
		).toThrow();
	});
});

// =============================================================================
// E. Bonus: deux areas indépendantes sur la même figure (signed=true + signed=false)
// =============================================================================

describe('createIntegralArea — coexistence signed/unsigned on same figure', () => {
	it('E20: integrale (signed) and aire (unsigned) on same f compute independently', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^3 - x');
		// integrale signed: F(1) - F(-1) = 0
		const { scalarId: integraleId } = figure.createIntegralArea(fnId, numeric(-1), numeric(1), {
			signed: true
		});
		// aire unsigned: 0.5
		const { scalarId: aireId } = figure.createIntegralArea(fnId, numeric(-1), numeric(1), {
			signed: false
		});
		expect(figure.getScalarValue(integraleId)).toBeCloseTo(0, 6);
		expect(figure.getScalarValue(aireId)).toBeCloseTo(0.5, 6);
	});
});
