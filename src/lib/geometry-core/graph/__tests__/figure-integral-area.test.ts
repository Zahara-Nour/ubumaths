/**
 * Phase 1 — figure.createIntegralArea() and GeoIntegralArea type.
 *
 * These tests are red-first (TDD). They exercise the factory method that
 * pairs a GeoIntegralArea (visual zone) with a GeoScalar (reactive value),
 * per the Option C decision in `docs/wip/geometry/integrale-study.md`.
 */

import { describe, it, expect, vi } from 'vitest';
import { runDsl } from '../../dsl';
import { numeric, type ScalarParam } from '../../types/geo-value';
import type { GeoScalar } from '../../types/elements';

interface IntegralAreaPair {
	areaId: string;
	scalarId: string;
}

interface GeoIntegralAreaShape {
	type: 'integralArea';
	id: string;
	functionId: string;
	lowerBound: ScalarParam;
	upperBound: ScalarParam;
	antiderivative: unknown;
	compiledF: ((vars: { x: number }) => number) | null;
	integrationStatus: 'exact' | 'approximate' | 'unsupported';
	dependsOn: readonly string[];
	_scalarId: string;
}

/** Set up a figure with a single function f and return ids. */
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

function getScalar(figure: ReturnType<typeof setupFigureWithFn>['figure'], scalarId: string) {
	return figure.getElementById(scalarId) as GeoScalar;
}

// =============================================================================
// A. Creation with numeric bounds
// =============================================================================

describe('createIntegralArea — numeric bounds', () => {
	it('returns a pair { areaId, scalarId }', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const result: IntegralAreaPair = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		expect(result.areaId).toBeDefined();
		expect(result.scalarId).toBeDefined();
		expect(result.areaId).not.toBe(result.scalarId);
	});

	it('creates an element of type "integralArea"', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const area = getArea(figure, areaId);
		expect(area.type).toBe('integralArea');
	});

	it('stores the functionId and bounds correctly', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const area = getArea(figure, areaId);
		expect(area.functionId).toBe(fnId);
		expect(area.lowerBound).toEqual(numeric(0));
		expect(area.upperBound).toEqual(numeric(1));
	});

	it('dependsOn includes only the function (no scalar refs for numeric bounds)', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const area = getArea(figure, areaId);
		expect(area.dependsOn).toEqual([fnId]);
	});

	it('creates a paired GeoScalar with scalarKind "expression"', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const scalar = getScalar(figure, scalarId);
		expect(scalar.type).toBe('scalar');
		expect(scalar.scalarKind).toBe('expression');
	});

	it('the scalar evaluates to F(b) - F(a) for a polynomial (exact path)', () => {
		// ∫₀¹ x² dx = 1/3
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1 / 3, 8);
	});

	it('the scalar evaluates correctly for a trigonometric integrand', () => {
		// ∫₀^π sin(x) dx = 2
		const { figure, fnId } = setupFigureWithFn('y = sin(x)');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(Math.PI));
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(2, 6);
	});
});

// =============================================================================
// B. Creation with scalar/slider refs (dynamic bounds)
// =============================================================================

describe('createIntegralArea — dynamic bounds (slider refs)', () => {
	it('accepts a slider for the lower bound and tracks dependency', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const sliderId = figure.createSlider(-1, 1, 0);
		const { areaId } = figure.createIntegralArea(fnId, { scalarRef: sliderId }, numeric(1));
		const area = getArea(figure, areaId);
		expect(area.lowerBound).toEqual({ scalarRef: sliderId });
		expect(area.dependsOn).toContain(fnId);
		expect(area.dependsOn).toContain(sliderId);
	});

	it('accepts a slider for the upper bound and tracks dependency', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const sliderId = figure.createSlider(0, 2, 1);
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), { scalarRef: sliderId });
		const area = getArea(figure, areaId);
		expect(area.upperBound).toEqual({ scalarRef: sliderId });
		expect(area.dependsOn).toContain(sliderId);
	});

	it('accepts sliders for both bounds simultaneously', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const aSlider = figure.createSlider(-1, 1, 0);
		const bSlider = figure.createSlider(0, 2, 1);
		const { areaId } = figure.createIntegralArea(
			fnId,
			{ scalarRef: aSlider },
			{ scalarRef: bSlider }
		);
		const area = getArea(figure, areaId);
		expect(area.dependsOn).toEqual(expect.arrayContaining([fnId, aSlider, bSlider]));
		expect(area.dependsOn).toHaveLength(3);
	});

	it('the scalar reacts when the slider value changes', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const upper = figure.createSlider(0, 2, 1);
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), { scalarRef: upper });
		// At b = 1, ∫₀¹ x² = 1/3
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1 / 3, 8);
		// Move slider: at b = 2, ∫₀² x² = 8/3
		figure.beginTransaction();
		figure.moveSlider(upper, 2);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(8 / 3, 8);
	});
});

// =============================================================================
// C. Symbolic cache (antiderivative + compiledF)
// =============================================================================

describe('createIntegralArea — symbolic cache', () => {
	it('stores the antiderivative and compiledF for an exactly-integrable function', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const area = getArea(figure, areaId);
		expect(area.integrationStatus).toBe('exact');
		expect(area.antiderivative).not.toBeNull();
		expect(area.compiledF).not.toBeNull();
		// compiledF should evaluate F(x) = x^3 / 3
		expect(area.compiledF!({ x: 0 })).toBeCloseTo(0, 10);
		expect(area.compiledF!({ x: 3 })).toBeCloseTo(9, 10); // 27/3 = 9
	});

	it('falls back to null antiderivative for non-elementary integrals', () => {
		// e^(-x²) has no elementary antiderivative.
		// Status is 'unsupported' for the symbolic path; the compute closure
		// runs numericIntegrate at evaluation time (covered by next test).
		const { figure, fnId } = setupFigureWithFn('y = exp(-x^2)');
		const { areaId } = figure.createIntegralArea(fnId, numeric(-1), numeric(1));
		const area = getArea(figure, areaId);
		expect(area.integrationStatus).toBe('unsupported');
		expect(area.antiderivative).toBeNull();
		expect(area.compiledF).toBeNull();
	});

	it('the scalar still computes a value when antiderivative is null (numeric fallback)', () => {
		// ∫₋₁¹ exp(-x²) dx ≈ 1.4937
		const { figure, fnId } = setupFigureWithFn('y = exp(-x^2)');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(-1), numeric(1));
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(1.4937, 3);
	});
});

// =============================================================================
// D. Reciprocal links between scalar and area
// =============================================================================

describe('createIntegralArea — reciprocal links', () => {
	it('area carries _scalarId pointing to the paired scalar', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId, scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const area = getArea(figure, areaId);
		expect(area._scalarId).toBe(scalarId);
	});

	it('scalar carries _visualAreaId pointing to the paired area', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId, scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const scalar = getScalar(figure, scalarId);
		expect(scalar._visualAreaId).toBe(areaId);
	});

	it('scalar dependsOn includes the function and slider refs (transitive)', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const lower = figure.createSlider(-1, 1, 0);
		const { scalarId } = figure.createIntegralArea(fnId, { scalarRef: lower }, numeric(1));
		const scalar = getScalar(figure, scalarId);
		expect(scalar.dependsOn).toEqual(expect.arrayContaining([fnId, lower]));
	});
});

// =============================================================================
// E. Error cases
// =============================================================================

describe('createIntegralArea — errors', () => {
	it('rejects when functionId is not a GeoFunction', () => {
		const { figure } = setupFigureWithFn('y = x^2');
		const pt = figure.createFreePoint({ x: numeric(0), y: numeric(0) });
		expect(() => figure.createIntegralArea(pt, numeric(0), numeric(1))).toThrow(/function/i);
	});

	it('rejects when functionId does not exist', () => {
		const { figure } = setupFigureWithFn('y = x^2');
		expect(() => figure.createIntegralArea('nope', numeric(0), numeric(1))).toThrow();
	});

	it('rejects when a scalarRef points to a non-existent id', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		expect(() => figure.createIntegralArea(fnId, { scalarRef: 'ghost' }, numeric(1))).toThrow();
	});

	it('rejects when a scalarRef points to an element that is neither slider nor scalar', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const pt = figure.createFreePoint({ x: numeric(0), y: numeric(0) });
		expect(() => figure.createIntegralArea(fnId, { scalarRef: pt }, numeric(1))).toThrow();
	});
});

// =============================================================================
// F. Edge cases (degenerate / inverted bounds)
// =============================================================================

describe('createIntegralArea — edge cases', () => {
	it('accepts equal bounds (lower === upper) — value is 0', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(2), numeric(2));
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(0, 10);
	});

	it('accepts inverted bounds (lower > upper) — value is opposite', () => {
		// ∫₁⁰ x² dx = -∫₀¹ x² dx = -1/3
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(1), numeric(0));
		expect(figure.getScalarValue(scalarId)).toBeCloseTo(-1 / 3, 8);
	});
});

// =============================================================================
// G. Visibility, label, and Phase-1 silence (no warns)
// =============================================================================

describe('createIntegralArea — visibility and labels', () => {
	it('the paired scalar is invisible by default', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const scalar = getScalar(figure, scalarId);
		expect(scalar.visible).toBe(false);
	});

	it('the area is visible by default', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		const area = getArea(figure, areaId);
		expect((area as unknown as { visible: boolean }).visible).toBe(true);
	});

	it('label option goes on the area, not the scalar', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId, scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1), {
			label: 'A'
		});
		const area = getArea(figure, areaId);
		const scalar = getScalar(figure, scalarId);
		expect((area as unknown as { label?: string }).label).toBe('A');
		expect(scalar.label).toBeUndefined();
	});

	it('Phase 1 is silent — no console.warn from the factory itself', () => {
		// Singularity warns are added in Phase 2 (DSL builtin). The low-level
		// factory should be silent so library consumers can use it without UX noise.
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const { figure, fnId } = setupFigureWithFn('y = 1/x');
			figure.createIntegralArea(fnId, numeric(-1), numeric(1));
			expect(warnSpy).not.toHaveBeenCalled();
		} finally {
			warnSpy.mockRestore();
		}
	});
});

// =============================================================================
// H. Undo / Redo as a single transaction
// =============================================================================

describe('createIntegralArea — undo / redo', () => {
	it('a single undo() removes both the area and the scalar', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const elementsBefore = figure.getAllElements().length;

		const { areaId, scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));
		expect(figure.getElementById(areaId)).toBeDefined();
		expect(figure.getElementById(scalarId)).toBeDefined();

		figure.undo();

		expect(figure.getElementById(areaId)).toBeUndefined();
		expect(figure.getElementById(scalarId)).toBeUndefined();
		expect(figure.getAllElements()).toHaveLength(elementsBefore);
	});

	it('redo() restores both elements with the same ids', () => {
		const { figure, fnId } = setupFigureWithFn('y = x^2');
		const { areaId, scalarId } = figure.createIntegralArea(fnId, numeric(0), numeric(1));

		figure.undo();
		expect(figure.getElementById(areaId)).toBeUndefined();

		figure.redo();
		expect(figure.getElementById(areaId)).toBeDefined();
		expect(figure.getElementById(scalarId)).toBeDefined();
	});
});
