/**
 * Phase 2 — NaN guard for `integrale()` and `aire()` when the integrand has
 * a divergent discontinuity inside [a, b].
 *
 * These tests are intentionally RED: the builtins currently call
 * `integrateDefinite` / `numericIntegrate` unconditionally without consulting
 * `analyzeRangeContinuity` for the divergence verdict.  The NaN guard will be
 * wired in Phase 2 implementation tasks 2.3–2.5.
 *
 * Reference: docs/wip/geometry/singularity-rigorous-progress.md §Phase 2.
 *
 * Assertions use `Number.isNaN(value)` rather than `expect(value).toBe(NaN)`
 * because `NaN !== NaN` in JavaScript; `toBe(NaN)` always fails.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDsl } from '..';

function run(script: string) {
	// Singularity tests use trig integrands in radians (mathAST native).
	// DSL default mode is degrees, so opt into radians for the whole file.
	return runDsl(`unite_angle("radians")\n${script}`);
}

// =============================================================================
// A. integrale() — divergent discontinuity → NaN
// =============================================================================

describe('integrale() — divergent discontinuity returns NaN', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('A1: integrale(1/x, -1, 1) → NaN (pole at interior x=0)', () => {
		// 1/x has an infinite discontinuity at x=0 which is strictly inside [-1, 1].
		// The integral diverges; antisymmetry produces 0 numerically — that 0 is wrong.
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
A = integrale(f, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isNaN(value)).toBe(true);
	});

	it('A2: integrale(1/(x^2-1), -2, 2) → NaN (poles at ±1 interior)', () => {
		// Two infinite poles at x=-1 and x=1, both interior to [-2, 2].
		const { figure, symbols } = run(
			`f = courbe("y = 1/(x^2-1)")
A = integrale(f, -2, 2)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isNaN(value)).toBe(true);
	});

	it('A3: integrale(tan(x), 0, 2π) → NaN (poles at π/2 and 3π/2 interior)', () => {
		// tan has infinite poles at π/2 ≈ 1.5708 and 3π/2 ≈ 4.7124, both interior.
		// Using the numeric value 6.283185307179586 for 2π.
		const twoPI = 6.283185307179586;
		const { figure, symbols } = run(
			`f = courbe("y = tan(x)")
A = integrale(f, 0, ${twoPI})`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isNaN(value)).toBe(true);
	});

	it('A4: integrale(1/x, 0, 1) → NaN (pole at lower boundary, interior limit = +∞)', () => {
		// x=0 is at the lower bound; the right-hand limit is +∞ → diverges.
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
A = integrale(f, 0, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isNaN(value)).toBe(true);
	});

	it('A5: integrale(sin(1/x), -1, 1) → NaN (essential discontinuity at x=0)', () => {
		// sin(1/x) oscillates infinitely near x=0 (essential discontinuity).
		// NOTE: the numeric integrator may already return NaN for sin(1/x) because
		// Simpson's rule diverges near the origin. This test validates that the NaN
		// guard *also* fires via the analyzeRangeContinuity path (essential → diverges),
		// not only because the numeric integrator happened to fail. Once the NaN guard
		// is wired, this test acts as a double guarantee. If it currently passes, that
		// is acceptable — it will remain green after Phase 2 implementation.
		const { figure, symbols } = run(
			`f = courbe("y = sin(1/x)")
A = integrale(f, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isNaN(value)).toBe(true);
	});
});

// =============================================================================
// B. integrale() — convergent/clean cases → finite value
// =============================================================================

describe('integrale() — convergent or clean integrand returns a finite value', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('B1: integrale(sin(x)/x, -1, 1) → finite ≈ 1.892 (removable discontinuity at 0)', () => {
		// sin(x)/x has a removable discontinuity at x=0 (limit = 1).
		// The integral converges: ∫₋₁¹ sin(x)/x dx = 2·Si(1) ≈ 1.8921.
		//
		// Currently RED for two reasons:
		//   1. The NaN guard does not exist yet, so the builtin falls through to
		//      numericIntegrate, which samples at x=0 and gets NaN from sin(0)/0.
		//   2. Once the NaN guard is implemented, `analyzeRangeContinuity` must
		//      classify this as `removable` (causesDivergence=false), and the
		//      numeric integrator must be called with a midpoint-safe strategy
		//      (or the antiderivative path used) to avoid sampling the singularity.
		//
		// This test will turn green only after both the guard *and* the numeric
		// fallback for removable cases are implemented in Phase 2.
		const { figure, symbols } = run(
			`f = courbe("y = sin(x)/x")
A = integrale(f, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isFinite(value) && !Number.isNaN(value)).toBe(true);
		expect(value).toBeCloseTo(1.8921, 1);
		// Removable discontinuity → no warn
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('B2: integrale(1/x^2, 1, 4) → 3/4 (pole at 0 is outside [1, 4], convergent)', () => {
		// 1/x² has an infinite discontinuity at x=0, but [1, 4] does not contain it.
		// ∫₁⁴ 1/x² dx = [-1/x]₁⁴ = -1/4 + 1 = 3/4.
		// Note: floor(x) and sign(x) are excluded as courbe() cannot compile them.
		const { figure, symbols } = run(
			`f = courbe("y = 1/x^2")
A = integrale(f, 1, 4)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isFinite(value) && !Number.isNaN(value)).toBe(true);
		expect(value).toBeCloseTo(3 / 4, 6);
		// Pole at 0 is outside [1, 4] → no warn
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('B3: integrale(x^2, 0, 1) → 1/3 (clean polynomial — regression)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 3, 8);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('B5: integrale(x^2, 1, 0) → -1/3 (inverted bounds preserve sign via direction)', () => {
		// Validates the `direction * total` accounting in the signed numeric path:
		// reversing the bounds must negate the result.
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = integrale(f, 1, 0)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(-1 / 3, 8);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('B4: integrale(1/x, 1, 5) → ln(5) ≈ 1.6094 (discontinuity at 0 is outside [1, 5])', () => {
		// The pole at x=0 lies strictly to the left of the integration range [1, 5].
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
A = integrale(f, 1, 5)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isFinite(value) && !Number.isNaN(value)).toBe(true);
		expect(value).toBeCloseTo(Math.log(5), 4);
		// Discontinuity outside [1, 5] → no warn
		expect(warnSpy).not.toHaveBeenCalled();
	});
});

// =============================================================================
// C. aire() — NaN and finite behavior
// =============================================================================

describe('aire() — divergent discontinuity returns NaN, boundary-safe returns finite', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('C1: aire(sqrt(x), 0, 4) → 16/3 ≈ 5.333 (boundary-safe: right limit at 0 is 0)', () => {
		// sqrt has an infinite discontinuity at x=0 (derivative blow-up), but the
		// function itself is continuous and the one-sided limit sqrt(x) → 0 as x→0+
		// is finite.  analyzeRangeContinuity should classify this as boundary-safe
		// (causesDivergence=false), so no NaN and no warn.
		const { figure, symbols } = run(
			`f = courbe("y = sqrt(x)")
A = aire(f, 0, 4)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isFinite(value) && !Number.isNaN(value)).toBe(true);
		expect(value).toBeCloseTo(16 / 3, 3);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('C2: aire(1/x, -1, 1) → NaN (pole at interior x=0 diverges)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
A = aire(f, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isNaN(value)).toBe(true);
	});

	it('C3: aire(x^2, 0, 1) → 1/3 (clean polynomial — regression)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = aire(f, 0, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 3, 6);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('C4: aire(sin(x)/x, -1, 1) → finite ≈ 1.892 (signed=false + interior removable)', () => {
		// Exercises the signed=false split path: removable point at x=0 must be
		// added as a sliver-split breakpoint to avoid sampling sin(0)/0.
		// The integrand stays positive on [-1, 1] (≈ 1 near 0), so the unsigned
		// area equals the signed integral ≈ 2·Si(1) ≈ 1.8921.
		const { figure, symbols } = run(
			`f = courbe("y = sin(x)/x")
A = aire(f, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		const value = figure.getScalarValue(aId);
		expect(Number.isFinite(value) && !Number.isNaN(value)).toBe(true);
		expect(value).toBeCloseTo(1.8921, 1);
		expect(warnSpy).not.toHaveBeenCalled();
	});
});

// =============================================================================
// D. Reactivity — NaN guard must re-evaluate on every slider drag
// =============================================================================

describe('integrale() — NaN guard is reactive to slider-driven bounds', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('D1: drag-into-divergence — bound crossing a pole switches value from finite to NaN and back', () => {
		// f = 1/(x-3), discontinuity at x=3.
		// Initial state: b=2 → [0, 2], pole at 3 is outside → finite value.
		// After drag: b=4 → [0, 4], pole at 3 is now inside → NaN.
		// After drag back: b=2 → [0, 2], pole outside again → finite.
		const { figure, symbols } = run(
			`f = courbe("y = 1/(x-3)")
b = slider(min=1, max=5, valeur=2)
A = integrale(f, 0, b)`
		);
		const aId = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;

		// Initial state: [0, 2], pole at 3 outside → finite (≈ ln(2/3) ≈ -0.405)
		const initialValue = figure.getScalarValue(aId);
		expect(Number.isFinite(initialValue) && !Number.isNaN(initialValue)).toBe(true);

		// Drag b to 4: [0, 4] now contains the pole at x=3 → NaN
		figure.beginTransaction();
		figure.moveSlider(bId, 4);
		figure.recompute();
		figure.commit();
		const valueAfterDragIn = figure.getScalarValue(aId);
		expect(Number.isNaN(valueAfterDragIn)).toBe(true);

		// Drag b back to 2: [0, 2], pole outside → finite again
		figure.beginTransaction();
		figure.moveSlider(bId, 2);
		figure.recompute();
		figure.commit();
		const valueAfterDragOut = figure.getScalarValue(aId);
		expect(Number.isFinite(valueAfterDragOut) && !Number.isNaN(valueAfterDragOut)).toBe(true);
	});
});
