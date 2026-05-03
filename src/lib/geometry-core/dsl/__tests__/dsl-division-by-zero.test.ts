/**
 * Tests for the division-by-zero convention in the DSL evaluator.
 *
 * V2 #2 (F simple) of the dsl-mathast-routing follow-ups.
 *
 * Convention:
 * - Number/number division and modulo follow IEEE 754 / JS native semantics.
 *   This aligns the legacy DSL path with the mathAST static path so the same
 *   expression produces the same value regardless of the route taken.
 * - Reactive scalar binary ops keep their NaN-coerce post-process (see
 *   `evaluateScalarBinary` and the reactive closure in `tryEvaluateAsMathExpr`).
 *   Reason: a scalar is rendered as a coordinate and we want it to "disappear"
 *   on non-finite, not be catapulted off-screen.
 * - Vector/scalar division by zero still throws (preserves the finite-only
 *   invariant on GeoNumeric coordinates). To revisit in V3.
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';

function run(script: string) {
	return runDsl(script);
}

describe('division by zero — number/number (IEEE 754)', () => {
	it('r = 1/0 returns Infinity (no throw)', () => {
		const { symbols } = run('r = 1/0');
		expect(symbols.get('r')?.value).toBe(Infinity);
	});

	it('r = -1/0 returns -Infinity', () => {
		const { symbols } = run('r = -1/0');
		expect(symbols.get('r')?.value).toBe(-Infinity);
	});

	it('r = 0/0 returns NaN', () => {
		const { symbols } = run('r = 0/0');
		expect(Number.isNaN(symbols.get('r')!.value)).toBe(true);
	});

	it('r = 1/(2-2) returns Infinity (denominator computed to 0)', () => {
		const { symbols } = run('r = 1/(2-2)');
		expect(symbols.get('r')?.value).toBe(Infinity);
	});

	it('r = 1/0 + 1 propagates Infinity', () => {
		const { symbols } = run('r = 1/0 + 1');
		expect(symbols.get('r')?.value).toBe(Infinity);
	});

	it('inf literal still works (regression for parser-inf tests)', () => {
		const { symbols } = run('a = inf\nb = inf + 1\nc = 1/inf');
		expect(symbols.get('a')?.value).toBe(Infinity);
		expect(symbols.get('b')?.value).toBe(Infinity);
		expect(symbols.get('c')?.value).toBe(0);
	});
});

describe('division by zero — legacy path (number/number, routing bypassed)', () => {
	// excentricite() returns a plain number (BuiltinScalarResult), so the
	// outer `/ 0` lands in `case 'binary'` with both operands typed as 'nombre'
	// — this is the legacy site that used to throw 'Division par zero' before
	// F simple. The reactive scalar path (distance, slider, …) is exercised in
	// the next describe block.

	it('r = excentricite(c) / 0 returns Infinity (no throw)', () => {
		// excentricite of a non-circle ellipse > 0 → the division yields Infinity.
		const { symbols } = run(
			['c = courbe("9*x^2 + 25*y^2 - 225 = 0")', 'exc = excentricite(c)', 'r = exc / 0'].join('\n')
		);
		expect(symbols.get('r')?.value).toBe(Infinity);
	});

	it('r = excentricite(c) / 0 returns NaN when excentricite is 0 (circle case)', () => {
		const { symbols } = run(
			['c = courbe("x^2 + y^2 - 9 = 0")', 'exc = excentricite(c)', 'r = exc / 0'].join('\n')
		);
		expect(Number.isNaN(symbols.get('r')!.value)).toBe(true);
	});
});

describe('division by zero — modulo (IEEE 754)', () => {
	it('r = 5 % 0 returns NaN', () => {
		const { symbols } = run('r = 5 % 0');
		// JS: 5 % 0 = NaN. The legacy DSL formula `((l % r) + r) % r` still
		// yields NaN when r === 0. No throw expected.
		expect(Number.isNaN(symbols.get('r')!.value)).toBe(true);
	});
});

describe('division by zero — reactive scalar (NaN-coerce preserved)', () => {
	it('scalar / 0 still produces NaN (reactive path uses NaN-coerce for rendering)', () => {
		const { figure, symbols } = run(
			['A = point(0, 0)', 'B = point(0, 0)', 'd = distance(A, B)', 'r = 3 / d'].join('\n')
		);
		const val = figure.getScalarValue(symbols.get('r')!.figureId!);
		// Scalar reactive: should NOT be Infinity, should be NaN so the rendered
		// element disappears rather than being catapulted off-screen.
		expect(Number.isNaN(val)).toBe(true);
	});
});

describe('division by zero — vector / scalar still throws', () => {
	it('vec / 0 throws "Division par zero" (preserves GeoNumeric finite invariant)', () => {
		// Vector/scalar division by zero would require numeric(Infinity) which
		// violates the finite-only invariant on coordinates. V3 follow-up to
		// unify with IEEE 754 if/when that invariant is relaxed.
		expect(() => run(['u = vecteur(1, 2)', 'v = u / 0'].join('\n'))).toThrow(
			/[Dd]ivision par zero/
		);
	});
});

describe('division by zero — full equivalence DSL legacy = mathAST static', () => {
	it('r = a/b with a, b numbers gives the same result whether routed or not', () => {
		// `a/b` where a, b are number-typed in symbol table. isMathPureExpr is
		// true → routing applies. parseCustom reads "a/b", evaluates with
		// staticBindings, returns Infinity. Equivalent to legacy path.
		const { symbols } = run('a = 1\nb = 0\nr = a/b');
		expect(symbols.get('r')?.value).toBe(Infinity);
	});

	it('r = (a + 1) / 0 gives Infinity (a defined)', () => {
		const { symbols } = run('a = 5\nr = (a + 1) / 0');
		expect(symbols.get('r')?.value).toBe(Infinity);
	});
});
