/**
 * Tests for pedagogical-limits/helpers.ts.
 *
 * Coverage:
 * - `evaluateAtPoint` returns correct numeric values for polynomial,
 *   rational, transcendental, and unsupported nodes.
 * - `isRootAt` detects polynomial roots within tolerance.
 * - `asPolynomial` extracts coefficients for canonical polynomials and
 *   refuses non-polynomial input.
 * - `syntheticDivide` returns correct quotient + remainder for the iconic
 *   `(x²−4)/(x−2)` and similar Tle-spé cases ; flags non-roots via the
 *   remainder.
 * - `polyToNode` round-trips coefficients to MathNode and the result
 *   evaluates back to the polynomial value.
 * - `formatApproachShort`, `formatLinearFactor`, `buildLinearFactor`,
 *   `classifyApproach`, `normalizeDirection` cover the formatting / direction
 *   utilities.
 */

import { describe, expect, it } from 'vitest';
import {
	add,
	divide,
	infinity,
	multiply,
	number,
	opposite,
	power,
	subtract,
	variable
} from '../../factory';
import {
	asPolynomial,
	buildLinearFactor,
	classifyApproach,
	evaluateAtPoint,
	findConjugate,
	formatApproachShort,
	formatLinearFactor,
	getSqrtArg,
	isAtInfinity,
	isRootAt,
	isSqrt,
	normalizeDirection,
	polyToNode,
	syntheticDivide
} from '../helpers';

describe('helpers — evaluateAtPoint', () => {
	it('returns the value of a polynomial at a point', () => {
		// f(x) = x² + 2x + 1 ; f(3) = 9 + 6 + 1 = 16
		const expr = add(
			add(power(variable('x'), number('2')), multiply(number('2'), variable('x'))),
			number('1')
		);
		expect(evaluateAtPoint(expr, 'x', 3)).toBeCloseTo(16);
	});

	it('returns null when expression contains a different variable', () => {
		const expr = add(variable('x'), variable('y'));
		expect(evaluateAtPoint(expr, 'x', 1)).toBeNull();
	});

	it('returns null on division by zero', () => {
		// 1/(x-2) at x=2
		const expr = divide(number('1'), subtract(variable('x'), number('2')));
		expect(evaluateAtPoint(expr, 'x', 2)).toBeNull();
	});

	it('handles unary minus and unary plus', () => {
		const expr = opposite(variable('x'));
		expect(evaluateAtPoint(expr, 'x', 3)).toBeCloseTo(-3);
	});

	it('evaluates basic transcendental functions', () => {
		expect(
			evaluateAtPoint({ type: 'function', name: 'sin', args: [number('0')] }, 'x', 0)
		).toBeCloseTo(0);
		expect(
			evaluateAtPoint({ type: 'function', name: 'exp', args: [number('0')] }, 'x', 0)
		).toBeCloseTo(1);
		expect(
			evaluateAtPoint({ type: 'function', name: 'sqrt', args: [number('4')] }, 'x', 0)
		).toBeCloseTo(2);
	});

	it('returns null on log of non-positive argument', () => {
		expect(
			evaluateAtPoint({ type: 'function', name: 'ln', args: [opposite(number('1'))] }, 'x', 0)
		).toBeNull();
	});

	it('returns null on sqrt of negative argument', () => {
		expect(
			evaluateAtPoint({ type: 'function', name: 'sqrt', args: [opposite(number('1'))] }, 'x', 0)
		).toBeNull();
	});
});

describe('helpers — isRootAt', () => {
	it('detects x² − 4 has a root at x = 2', () => {
		const expr = subtract(power(variable('x'), number('2')), number('4'));
		expect(isRootAt(expr, 'x', 2)).toBe(true);
	});

	it('detects x² − 4 has a root at x = −2', () => {
		const expr = subtract(power(variable('x'), number('2')), number('4'));
		expect(isRootAt(expr, 'x', -2)).toBe(true);
	});

	it('detects x² − 4 is NOT zero at x = 1', () => {
		const expr = subtract(power(variable('x'), number('2')), number('4'));
		expect(isRootAt(expr, 'x', 1)).toBe(false);
	});

	it('detects x − 2 is zero at x = 2', () => {
		const expr = subtract(variable('x'), number('2'));
		expect(isRootAt(expr, 'x', 2)).toBe(true);
	});
});

describe('helpers — asPolynomial', () => {
	it('reads x as [0, 1]', () => {
		expect(asPolynomial(variable('x'), 'x')).toEqual([0, 1]);
	});

	it('reads x² − 4 as [−4, 0, 1]', () => {
		const expr = subtract(power(variable('x'), number('2')), number('4'));
		expect(asPolynomial(expr, 'x')).toEqual([-4, 0, 1]);
	});

	it('reads x − 2 as [−2, 1]', () => {
		const expr = subtract(variable('x'), number('2'));
		expect(asPolynomial(expr, 'x')).toEqual([-2, 1]);
	});

	it('reads (x − 1)·(x + 2) = x² + x − 2 as [−2, 1, 1]', () => {
		const expr = multiply(
			subtract(variable('x'), number('1')),
			add(variable('x'), number('2')),
			'implicit'
		);
		expect(asPolynomial(expr, 'x')).toEqual([-2, 1, 1]);
	});

	it('refuses sin(x) (non-polynomial)', () => {
		const expr: import('../../types').MathNode = {
			type: 'function',
			name: 'sin',
			args: [variable('x')]
		};
		expect(asPolynomial(expr, 'x')).toBeNull();
	});

	it('refuses x^(1/2) (non-integer exponent)', () => {
		const expr = power(variable('x'), divide(number('1'), number('2')));
		expect(asPolynomial(expr, 'x')).toBeNull();
	});
});

describe('helpers — syntheticDivide', () => {
	it('divides x² − 4 by (x − 2) → quotient x + 2, remainder 0', () => {
		const result = syntheticDivide([-4, 0, 1], 2);
		expect(result.quotient).toEqual([2, 1]);
		expect(result.remainder).toBeCloseTo(0);
	});

	it('divides x³ − 8 by (x − 2) → quotient x² + 2x + 4, remainder 0', () => {
		const result = syntheticDivide([-8, 0, 0, 1], 2);
		expect(result.quotient).toEqual([4, 2, 1]);
		expect(result.remainder).toBeCloseTo(0);
	});

	it('flags non-root via remainder ≠ 0', () => {
		const result = syntheticDivide([-4, 0, 1], 1); // x²−4 at x=1 → remainder = -3
		expect(result.remainder).toBeCloseTo(-3);
	});

	it('handles empty polynomial', () => {
		const result = syntheticDivide([], 5);
		expect(result.quotient).toEqual([]);
		expect(result.remainder).toBe(0);
	});
});

describe('helpers — polyToNode', () => {
	it('converts [2, 1] back to a node evaluating to 2 + x', () => {
		const node = polyToNode([2, 1], 'x');
		expect(evaluateAtPoint(node, 'x', 5)).toBeCloseTo(7);
	});

	it('converts [−4, 0, 1] back to x² − 4', () => {
		const node = polyToNode([-4, 0, 1], 'x');
		expect(evaluateAtPoint(node, 'x', 3)).toBeCloseTo(5); // 9 − 4
	});

	it('converts [0] to number 0', () => {
		const node = polyToNode([0], 'x');
		expect(evaluateAtPoint(node, 'x', 5)).toBeCloseTo(0);
	});

	it('converts empty coeffs to number 0', () => {
		const node = polyToNode([], 'x');
		expect(evaluateAtPoint(node, 'x', 5)).toBeCloseTo(0);
	});

	it('encodes a -1 coefficient monomial as `opposite(...)` (not subtract(0, ...))', () => {
		// −x² + 2x → the −x² monomial must be `opposite(power(x, 2))`, not
		// `subtract(0, power(x, 2))`. This anchors the cosmetic AST shape that
		// the renderer (and any downstream simplifier) expects.
		const node = polyToNode([0, 2, -1], 'x'); // = 2x − x²
		// numerical round-trip still holds
		expect(evaluateAtPoint(node, 'x', 3)).toBeCloseTo(-3); // 6 − 9 = −3
		// AST shape : the topmost is an addition (2x is first because we
		// traverse high-degree-first then push, and 2x is degree 1 ; opposite
		// is built for −x²). Walk the tree to find the `opposite` node.
		const json = JSON.stringify(node);
		expect(json).toContain('"opposite"');
		expect(json).not.toMatch(/"subtraction"[^}]*"left":\{"type":"number","value":"0"/);
	});
});

describe('helpers — approach formatting', () => {
	it('classifyApproach', () => {
		expect(classifyApproach(infinity('positive'))).toBe('positive-infinity');
		expect(classifyApproach(infinity('negative'))).toBe('negative-infinity');
		expect(classifyApproach(number('2'))).toBe('finite');
	});

	it('isAtInfinity', () => {
		expect(isAtInfinity(infinity('positive'))).toBe(true);
		expect(isAtInfinity(infinity('negative'))).toBe(true);
		expect(isAtInfinity(number('0'))).toBe(false);
	});

	it('formatApproachShort', () => {
		expect(formatApproachShort(infinity('positive'))).toBe('+∞');
		expect(formatApproachShort(infinity('negative'))).toBe('−∞');
		expect(formatApproachShort(number('2'))).toBe('2');
		expect(formatApproachShort(variable('a'))).toBe('a');
	});

	it('formatLinearFactor', () => {
		expect(formatLinearFactor('x', 0)).toBe('x');
		expect(formatLinearFactor('x', 2)).toBe('(x − 2)');
		expect(formatLinearFactor('x', -3)).toBe('(x + 3)');
	});

	it('buildLinearFactor produces correct AST', () => {
		const f = buildLinearFactor('x', 2);
		expect(f.type).toBe('subtraction');
		const fNeg = buildLinearFactor('x', -3);
		expect(fNeg.type).toBe('addition');
	});
});

describe('helpers — direction', () => {
	it('normalizeDirection defaults to both', () => {
		expect(normalizeDirection(undefined)).toBe('both');
		expect(normalizeDirection('left')).toBe('left');
		expect(normalizeDirection('right')).toBe('right');
		expect(normalizeDirection('both')).toBe('both');
	});
});

describe('helpers — conjugate / rationalisation', () => {
	function sqrtNode(arg: import('../../types').MathNode) {
		return { type: 'function' as const, name: 'sqrt', args: [arg] };
	}

	it('isSqrt detects sqrt(x) function call', () => {
		expect(isSqrt(sqrtNode(variable('x')))).toBe(true);
	});

	it('isSqrt rejects non-sqrt nodes', () => {
		expect(isSqrt(variable('x'))).toBe(false);
		expect(isSqrt(power(variable('x'), number('2')))).toBe(false);
		expect(isSqrt(power(variable('x'), number('3')))).toBe(false);
	});

	it('getSqrtArg returns sqrt argument', () => {
		const arg = add(variable('x'), number('1'));
		const result = getSqrtArg(sqrtNode(arg));
		expect(result).toBe(arg);
	});

	it('getSqrtArg refuses arbitrary superscripts (not just ^{1/2})', () => {
		// Without the isSqrt guard, getSqrtArg(x^3) would silently return `x`.
		expect(getSqrtArg(power(variable('x'), number('3')))).toBeNull();
	});

	it('findConjugate handles √a − b form', () => {
		const expr = subtract(sqrtNode(add(variable('x'), number('1'))), number('1'));
		const result = findConjugate(expr);
		expect(result).not.toBeNull();
		// expanded should be (x+1) − 1² = (x+1) − 1
		expect(result?.expanded).toBeDefined();
	});

	it('findConjugate handles b − √a form', () => {
		const expr = subtract(number('2'), sqrtNode(variable('x')));
		const result = findConjugate(expr);
		expect(result).not.toBeNull();
	});

	it('findConjugate handles √a + b form', () => {
		const expr = add(sqrtNode(add(variable('x'), number('4'))), number('2'));
		const result = findConjugate(expr);
		expect(result).not.toBeNull();
	});

	it('findConjugate handles b + √a form', () => {
		const expr = add(number('2'), sqrtNode(variable('x')));
		const result = findConjugate(expr);
		expect(result).not.toBeNull();
	});

	it('findConjugate refuses non-conjugate-able expressions', () => {
		expect(findConjugate(variable('x'))).toBeNull();
		expect(findConjugate(power(variable('x'), number('2')))).toBeNull();
		// two sqrts — not handled in V1.1.a
		expect(findConjugate(subtract(sqrtNode(variable('x')), sqrtNode(variable('y'))))).toBeNull();
	});

	it('findConjugate transparent unwraps delimiter nodes', () => {
		const inner = subtract(sqrtNode(variable('x')), number('1'));
		const wrapped = {
			type: 'delimiter' as const,
			delimiters: 'parentheses' as const,
			content: inner
		};
		const result = findConjugate(wrapped);
		expect(result).not.toBeNull();
	});
});
