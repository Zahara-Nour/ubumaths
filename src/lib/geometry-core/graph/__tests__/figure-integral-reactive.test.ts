/**
 * Phase 3 — reactive compute consolidation for integrale().
 *
 * The reactive path is implemented in Phase 1 (the compute closure on the
 * paired scalar). These tests lock in the contract under realistic
 * scenarios: multi-slider, nested scalars, undo/redo, cascade, NaN
 * resilience, numeric fallback under drag.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../../dsl';

function run(script: string) {
	return runDsl(script);
}

// =============================================================================
// A. Independent scalars: two integrals, two sliders
// =============================================================================

describe('integrale reactivity — independence', () => {
	it('two integrals on independent sliders update independently', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
a = slider(min=0, max=2, valeur=1)
b = slider(min=0, max=2, valeur=1)
A = integrale(f, 0, a)
B = integrale(f, 0, b)`
		);
		const aSlider = symbols.get('a')!.figureId!;
		const bSlider = symbols.get('b')!.figureId!;
		const aId = symbols.get('A')!.figureId!;
		const bId = symbols.get('B')!.figureId!;

		// Initial: ∫₀¹ x² = 1/3
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 3, 8);
		expect(figure.getScalarValue(bId)).toBeCloseTo(1 / 3, 8);

		// Move only `a` slider — only A should change.
		figure.beginTransaction();
		figure.moveSlider(aSlider, 2);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(aId)).toBeCloseTo(8 / 3, 8);
		expect(figure.getScalarValue(bId)).toBeCloseTo(1 / 3, 8);

		// Move only `b` slider — only B should change.
		figure.beginTransaction();
		figure.moveSlider(bSlider, 0);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(aId)).toBeCloseTo(8 / 3, 8);
		expect(figure.getScalarValue(bId)).toBeCloseTo(0, 10);
	});

	it('two integrals on the same function with different bounds compute correctly', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1)
B = integrale(f, 1, 2)`
		);
		// A = 1/3, B = ∫₁² x² = 8/3 - 1/3 = 7/3
		expect(figure.getScalarValue(symbols.get('A')!.figureId!)).toBeCloseTo(1 / 3, 8);
		expect(figure.getScalarValue(symbols.get('B')!.figureId!)).toBeCloseTo(7 / 3, 8);
	});
});

// =============================================================================
// B. Bound = derived scalar (not a slider)
// =============================================================================

describe('integrale reactivity — derived scalar bound', () => {
	it('reacts when a bound is a distance scalar that depends on a moving point', () => {
		// Bound `b` = distance(O, P) where O is fixed and P is movable.
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
O = point(0, 0)
P = point(1, 0)
b = distance(O, P)
A = integrale(f, 0, b)`
		);
		const A = symbols.get('A')!.figureId!;
		const P = symbols.get('P')!.figureId!;
		// Initial: distance = 1, ∫₀¹ x² = 1/3
		expect(figure.getScalarValue(A)).toBeCloseTo(1 / 3, 8);

		// Move P to (2, 0): distance = 2, ∫₀² x² = 8/3
		figure.beginTransaction();
		figure.movePoint(P, { kind: 'numeric', value: 2 }, { kind: 'numeric', value: 0 });
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(A)).toBeCloseTo(8 / 3, 8);
	});
});

// =============================================================================
// C. Undo / redo of slider drag
// =============================================================================

describe('integrale reactivity — undo/redo of slider drag', () => {
	it('undo of a slider move reverts the integral value; redo re-applies', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
b = slider(min=0, max=2, valeur=1)
A = integrale(f, 0, b)`
		);
		const A = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;
		expect(figure.getScalarValue(A)).toBeCloseTo(1 / 3, 8);

		figure.beginTransaction();
		figure.moveSlider(bId, 2);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(A)).toBeCloseTo(8 / 3, 8);

		figure.undo();
		figure.recompute();
		expect(figure.getScalarValue(A)).toBeCloseTo(1 / 3, 8);

		figure.redo();
		figure.recompute();
		expect(figure.getScalarValue(A)).toBeCloseTo(8 / 3, 8);
	});
});

// =============================================================================
// D. Cascade deletion of the integral pair via undo
// =============================================================================

describe('integrale reactivity — pair undo', () => {
	it('undoing the integral removes both the area and the scalar atomically', () => {
		// Note: DSL statements are not auto-wrapped in undo transactions, so
		// only operations that explicitly `beginTransaction()` end up on the
		// undo stack. `createIntegralArea` does, so this is the unit we test.
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1)`
		);
		const fId = symbols.get('f')!.figureId!;
		const A = symbols.get('A')!.figureId!;

		const allIntegralAreas = figure.getAllElements().filter((e) => e.type === 'integralArea');
		expect(allIntegralAreas).toHaveLength(1);
		const areaId = allIntegralAreas[0].id;

		// Undo: removes the integral pair (area + scalar) atomically.
		figure.undo();
		expect(figure.getElementById(A)).toBeUndefined();
		expect(figure.getElementById(areaId)).toBeUndefined();
		// The function is untouched (it was added outside any transaction).
		expect(figure.getElementById(fId)).toBeDefined();
	});
});

// =============================================================================
// E. NaN resilience: bounds escape function domain
// =============================================================================

describe('integrale reactivity — domain edge cases', () => {
	it('returns NaN gracefully when bounds escape the function domain (ln on [0.5, slider])', () => {
		const { figure, symbols } = run(
			`f = courbe("y = ln(x)")
b = slider(min=-2, max=3, valeur=2)
A = integrale(f, 0.5, b)`
		);
		const A = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;
		// Initial: ∫₀.₅² ln(x) dx is well-defined.
		const v0 = figure.getScalarValue(A);
		expect(v0).toBeDefined();
		expect(Number.isFinite(v0!)).toBe(true);

		// Drag b to -1: argument of ln crosses zero — value becomes NaN/undefined.
		figure.beginTransaction();
		figure.moveSlider(bId, -1);
		figure.recompute();
		figure.commit();
		const v1 = figure.getScalarValue(A);
		expect(v1 === undefined || Number.isNaN(v1)).toBe(true);

		// Bring b back to 2 — recovers a finite value.
		figure.beginTransaction();
		figure.moveSlider(bId, 2);
		figure.recompute();
		figure.commit();
		const v2 = figure.getScalarValue(A);
		expect(v2).toBeCloseTo(v0!, 8);
	});
});

// =============================================================================
// F. Numeric fallback under drag (non-elementary integrand)
// =============================================================================

describe('integrale reactivity — numeric fallback', () => {
	it('Simpson fallback recomputes correctly when a slider moves (exp(-x^2))', () => {
		// ∫₋ᵇᵇ exp(-x²) dx — non-elementary, numeric fallback every recompute.
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x^2)")
b = slider(min=0, max=3, valeur=1)
A = integrale(f, 0, b)`
		);
		const A = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;

		// At b = 1, ∫₀¹ exp(-x²) dx ≈ 0.7468
		expect(figure.getScalarValue(A)).toBeCloseTo(0.7468, 3);

		// At b = 2, ∫₀² ≈ 0.8821
		figure.beginTransaction();
		figure.moveSlider(bId, 2);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(A)).toBeCloseTo(0.8821, 3);

		// At b = 0.5, ∫₀^0.5 ≈ 0.4613
		figure.beginTransaction();
		figure.moveSlider(bId, 0.5);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(A)).toBeCloseTo(0.4613, 3);
	});
});

// =============================================================================
// G. Performance bench (skipped by default — run manually with -t "perf")
// =============================================================================

describe.skip('integrale reactivity — perf', () => {
	const ITERATIONS = 1000;

	it('symbolic path: < 1 ms per evaluation', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^3 + 2*x^2 - x + 1")
b = slider(min=-2, max=2, valeur=0)
A = integrale(f, 0, b)`
		);
		const A = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;

		// Warmup
		for (let i = 0; i < 10; i++) {
			figure.beginTransaction();
			figure.moveSlider(bId, (i % 2) * 2 - 1);
			figure.recompute();
			figure.commit();
		}

		const t0 = performance.now();
		for (let i = 0; i < ITERATIONS; i++) {
			const v = -2 + (4 * i) / ITERATIONS;
			figure.beginTransaction();
			figure.moveSlider(bId, v);
			figure.recompute();
			figure.commit();
			void figure.getScalarValue(A);
		}
		const elapsed = performance.now() - t0;
		const perEval = elapsed / ITERATIONS;

		console.log(`symbolic-path: ${perEval.toFixed(4)} ms / eval (${ITERATIONS} iters)`);
		expect(perEval).toBeLessThan(1);
	});

	it('numeric path: < 5 ms per evaluation', () => {
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x^2)")
b = slider(min=0, max=3, valeur=1)
A = integrale(f, 0, b)`
		);
		const A = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;

		for (let i = 0; i < 10; i++) {
			figure.beginTransaction();
			figure.moveSlider(bId, (i % 3) + 0.5);
			figure.recompute();
			figure.commit();
		}

		const t0 = performance.now();
		for (let i = 0; i < ITERATIONS; i++) {
			const v = 0.1 + (2.9 * i) / ITERATIONS;
			figure.beginTransaction();
			figure.moveSlider(bId, v);
			figure.recompute();
			figure.commit();
			void figure.getScalarValue(A);
		}
		const elapsed = performance.now() - t0;
		const perEval = elapsed / ITERATIONS;

		console.log(`numeric-path: ${perEval.toFixed(4)} ms / eval (${ITERATIONS} iters)`);
		expect(perEval).toBeLessThan(5);
	});
});
