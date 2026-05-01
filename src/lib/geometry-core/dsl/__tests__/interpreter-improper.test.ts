/**
 * V5 improper integrals — end-to-end DSL tests.
 *
 * Covers Phase 2 (helper routing) + Phase 3 (figure layer + numeric core)
 * via the public DSL surface : `integrale(f, a, b)`, `aire(f, a, b)`,
 * `aire_entre(f, g, a, b)` with one or both bounds = ±inf.
 *
 * Spec: docs/wip/geometry/improper-integrals-study.md.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDsl } from '..';

function run(script: string) {
	return runDsl(script);
}

let warnSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
	warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
	warnSpy.mockRestore();
});

// =============================================================================
// integrale() — improper, signed
// =============================================================================

describe('integrale() — improper bounds', () => {
	it('case 1: integrale(exp(-x), 0, +inf) ≈ 1', () => {
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x)")
A = integrale(f, 0, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1, 4);
	});

	it('case 2: integrale(exp(-x^2), -inf, +inf) ≈ √π', () => {
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x^2)")
A = integrale(f, -inf, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(Math.sqrt(Math.PI), 4);
	});

	it('case 3: integrale(1/(1+x^2), -inf, +inf) ≈ π', () => {
		const { figure, symbols } = run(
			`f = courbe("y = 1/(1+x^2)")
A = integrale(f, -inf, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(Math.PI, 4);
	});

	it('case 4: integrale(1/x^2, 1, +inf) ≈ 1', () => {
		const { figure, symbols } = run(
			`f = courbe("y = 1/x^2")
A = integrale(f, 1, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1, 4);
	});

	it('divergent: integrale(1/x, 1, +inf) → NaN', () => {
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
A = integrale(f, 1, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(Number.isNaN(figure.getScalarValue(aId))).toBe(true);
	});

	it('divergent: integrale(sin(x), 0, +inf) → NaN', () => {
		const { figure, symbols } = run(
			`f = courbe("y = sin(x)")
A = integrale(f, 0, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(Number.isNaN(figure.getScalarValue(aId))).toBe(true);
	});

	it('left-infinite: integrale(exp(x), -inf, 0) ≈ 1', () => {
		const { figure, symbols } = run(
			`f = courbe("y = exp(x)")
A = integrale(f, -inf, 0)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1, 4);
	});

	it('inf without sign also accepted', () => {
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x)")
A = integrale(f, 0, inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1, 4);
	});
});

// =============================================================================
// aire() — improper, unsigned
// =============================================================================

describe('aire() — improper bounds', () => {
	it('case 7: aire(1/x^2, 1, +inf) = 1', () => {
		const { figure, symbols } = run(
			`f = courbe("y = 1/x^2")
A = aire(f, 1, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1, 4);
	});

	it('aire(exp(-x), 0, +inf) = 1 (always positive integrand)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x)")
A = aire(f, 0, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1, 4);
	});

	it('aire(exp(-x^2), -inf, +inf) ≈ √π', () => {
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x^2)")
A = aire(f, -inf, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(Math.sqrt(Math.PI), 4);
	});
});

// =============================================================================
// aire_entre() — improper, between two curves
// =============================================================================

describe('aire_entre() — improper bounds', () => {
	it('aire_entre(exp(-x), exp(-2x), 0, +inf) = 1/2', () => {
		// ∫₀^∞ (e^{-x} − e^{-2x}) dx = 1 − 1/2 = 1/2
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x)")
g = courbe("y = exp(-2*x)")
A = aire_entre(f, g, 0, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(0.5, 4);
	});

	it('aire_entre with divergent integrand → NaN', () => {
		// ∫₁^∞ (1/x − 1/x²) dx — first term diverges.
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
g = courbe("y = 1/x^2")
A = aire_entre(f, g, 1, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(Number.isNaN(figure.getScalarValue(aId))).toBe(true);
	});
});

// =============================================================================
// Slider reactivity — improper integrals respond to slider drags
// =============================================================================

describe('improper — slider reactivity', () => {
	it('integrale(exp(-x), a, +inf) updates when slider a moves', () => {
		const { figure, symbols } = run(
			`a = slider(min=0, max=5, valeur=0)
f = courbe("y = exp(-x)")
A = integrale(f, a, +inf)`
		);
		const aId = symbols.get('A')!.figureId!;
		// At a=0: value = 1.
		expect(figure.getScalarValue(aId)).toBeCloseTo(1, 4);
		// Move slider to a=2: value = e^{-2} ≈ 0.1353.
		const sliderId = symbols.get('a')!.figureId!;
		figure.beginTransaction();
		figure.moveSlider(sliderId, 2);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(aId)).toBeCloseTo(Math.exp(-2), 3);
	});
});
