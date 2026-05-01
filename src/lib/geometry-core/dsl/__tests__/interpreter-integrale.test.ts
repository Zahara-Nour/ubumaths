/**
 * Phase 2 — DSL builtin `integrale(f, a, b)`.
 *
 * Wires the Phase 1 factory `figure.createIntegralArea` into the DSL
 * interpreter. The DSL variable bound to `integrale(...)` is the paired
 * GeoScalar (the value), while the GeoIntegralArea is created internally
 * and stylable via inline named arguments.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDsl } from '..';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	return runDsl(script);
}

// =============================================================================
// A. Parsing & validation
// =============================================================================

describe('integrale() — parsing & validation', () => {
	it('accepts a function and two numeric bounds', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1)`
		);
		const A = symbols.get('A');
		expect(A).toBeDefined();
		expect(A!.type).toBe('scalar');
		expect(A!.figureId).toBeDefined();
		// The exposed symbol is the scalar; the area exists as another element.
		const areas = figure.getAllElements().filter((e) => e.type === 'integralArea');
		expect(areas).toHaveLength(1);
	});

	it('rejects with no arguments', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
A = integrale()`
			)
		).toThrow(DslRuntimeError);
	});

	it('rejects with a single argument', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
A = integrale(f)`
			)
		).toThrow(DslRuntimeError);
	});

	it('rejects with two arguments', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
A = integrale(f, 0)`
			)
		).toThrow(DslRuntimeError);
	});

	it('rejects with four arguments', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
A = integrale(f, 0, 1, 2)`
			)
		).toThrow(DslRuntimeError);
	});

	it('rejects when the first argument is not a function', () => {
		expect(() =>
			run(
				`P = point(0, 0)
A = integrale(P, 0, 1)`
			)
		).toThrow(DslRuntimeError);
	});

	it('rejects when a bound is a string', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
A = integrale(f, "zero", 1)`
			)
		).toThrow(DslRuntimeError);
	});

	it('rejects when a bound is a non-scalar element', () => {
		expect(() =>
			run(
				`f = courbe("y = x^2")
P = point(0, 0)
A = integrale(f, P, 1)`
			)
		).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// B. Resolution & value
// =============================================================================

describe('integrale() — value resolution', () => {
	it('exposes the scalar value via the DSL variable (∫₀¹ x² = 1/3)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 3, 8);
	});

	it('accepts a slider as a bound and reacts when it moves', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
b = slider(min=0, max=2, valeur=1)
A = integrale(f, 0, b)`
		);
		const aId = symbols.get('A')!.figureId!;
		const bId = symbols.get('b')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 3, 8);

		figure.beginTransaction();
		figure.moveSlider(bId, 2);
		figure.recompute();
		figure.commit();
		expect(figure.getScalarValue(aId)).toBeCloseTo(8 / 3, 8);
	});

	it('accepts both bounds as sliders', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
a = slider(min=-1, max=1, valeur=0)
b = slider(min=0, max=2, valeur=1)
A = integrale(f, a, b)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1 / 3, 8);
	});

	it('falls back to numeric when the integral is non-elementary', () => {
		// ∫₋₁¹ exp(-x²) dx ≈ 1.4937
		const { figure, symbols } = run(
			`f = courbe("y = exp(-x^2)")
A = integrale(f, -1, 1)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(1.4937, 3);
	});
});

// =============================================================================
// C. Inline style on the area
// =============================================================================

describe('integrale() — inline style applied to the area', () => {
	it('couleur named arg sets the area color', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1, couleur="rouge")`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea');
		expect(area).toBeDefined();
		// Color resolved to a hex from "rouge"
		expect((area as { color?: string }).color).toBeDefined();
	});

	it('opacite_fond named arg sets the area fillOpacity', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1, opacite_fond=0.4)`
		);
		const area = figure.getAllElements().find((e) => e.type === 'integralArea');
		expect((area as { style?: { fillOpacity?: number } }).style?.fillOpacity).toBe(0.4);
	});

	it('does not apply style to the paired scalar', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1, couleur="rouge", opacite_fond=0.4)`
		);
		const scalar = figure.getElementById(symbols.get('A')!.figureId!);
		expect((scalar as { style?: { fillOpacity?: number } }).style?.fillOpacity).toBeUndefined();
	});
});

// =============================================================================
// D. Singularity warn integration
// =============================================================================

describe('integrale() — singularity warn', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('emits a console.warn when the integrand has a pole inside [a, b]', () => {
		run(
			`f = courbe("y = 1/x")
A = integrale(f, -1, 1)`
		);
		expect(warnSpy).toHaveBeenCalled();
	});

	it('does NOT warn when the integrand is clean on [a, b]', () => {
		run(
			`f = courbe("y = x^2")
A = integrale(f, 0, 1)`
		);
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('warns once per integrale() call (not per slider move)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = 1/x")
b = slider(min=-1, max=1, valeur=1)
A = integrale(f, -1, b)`
		);
		expect(warnSpy).toHaveBeenCalledTimes(1);
		warnSpy.mockClear();

		const bId = symbols.get('b')!.figureId!;
		figure.beginTransaction();
		figure.moveSlider(bId, 0.5);
		figure.recompute();
		figure.commit();
		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('warn message includes the source line number', () => {
		run(
			`f = courbe("y = 1/x")
A = integrale(f, -1, 1)`
		);
		const message = warnSpy.mock.calls[0][0] as string;
		expect(message).toMatch(/integrale ligne 2:/);
	});
});

// =============================================================================
// E. Inverted bounds (a > b) via DSL
// =============================================================================

describe('integrale() — inverted bounds', () => {
	it('accepts inverted bounds and returns the opposite value (∫₁⁰ x² dx = -1/3)', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
A = integrale(f, 1, 0)`
		);
		const aId = symbols.get('A')!.figureId!;
		expect(figure.getScalarValue(aId)).toBeCloseTo(-1 / 3, 8);
	});
});
