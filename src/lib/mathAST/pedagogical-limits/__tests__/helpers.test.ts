/**
 * Tests for pedagogical-limits/helpers.ts.
 *
 * Coverage:
 * - `evaluateAtPoint` returns correct numeric values for polynomial,
 *   rational, transcendental, and unsupported nodes.
 * - `divideByCommonRoot` divise N et D par (x − a), exactement (noyau
 *   `factor/`), point négatif compris ; refuse si a n'est pas racine des deux.
 * - `formatApproachShort`, `formatLinearFactor`,
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
	classifyApproach,
	divideByCommonRoot,
	evaluateAtPoint,
	findConjugate,
	formatApproachShort,
	formatLinearFactor,
	getSqrtArg,
	isAtInfinity,
	isSqrt,
	normalizeDirection
} from '../helpers';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { fromInteger, rational } from '../../normal/rational';

describe('helpers — evaluateAtPoint', () => {
	it('returns the value of a polynomial at a point', () => {
		// f(x) = x² + 2x + 1 ; f(3) = 9 + 6 + 1 = 16
		const expr = add(
			add(power(variable('x'), number('2')), multiply(number('2'), variable('x'), 'implicit')),
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
		const expr = divide(number('1'), subtract(variable('x'), number('2')), 'fraction');
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

	// Lot 6a (simplify-carte § 25, § 96) : la puissance et la réciproque d'une
	// fonction, l'indice d'une racine étaient ignorés
	it('évalue la puissance d’une fonction : sin²(x) en 1', () => {
		expect(evaluateAtPoint(parseLatex('\\sin^2(x)'), 'x', 1)).toBeCloseTo(Math.sin(1) ** 2);
	});

	it('évalue la réciproque : cos⁻¹(x) en 0,5 = arccos(0,5)', () => {
		expect(evaluateAtPoint(parseLatex('\\cos^{-1}(x)'), 'x', 0.5)).toBeCloseTo(Math.acos(0.5));
	});

	it('évalue une racine n-ième réelle : ∛x en −8', () => {
		expect(evaluateAtPoint(parseLatex('\\sqrt[3]{x}'), 'x', -8)).toBeCloseTo(-2);
	});
});

describe('helpers — divideByCommonRoot', () => {
	const divideAt = (n: string, d: string, a: number) =>
		divideByCommonRoot(parseLatex(n), parseLatex(d), 'x', fromInteger(a));

	it('divise x² − 9 et x + 3 par (x + 3) en −3 : x − 3 et 1', () => {
		const result = divideAt('x^2-9', 'x+3', -3);
		expect(result && toLatex(result.numerator)).toBe('x - 3');
		expect(result && toLatex(result.denominator)).toBe('1');
	});

	it('divise 2x³ − 6x + 4 par (x − 1) une seule fois (racine double)', () => {
		const result = divideAt('2x^3-6x+4', 'x^2-1', 1);
		expect(result && toLatex(result.numerator)).toBe('2 x^2 + 2 x - 4');
		expect(result && toLatex(result.denominator)).toBe('x + 1');
	});

	it('refuse quand a n’est pas racine des deux', () => {
		expect(divideAt('x^2-4', 'x-1', 2)).toBeNull();
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
		expect(formatLinearFactor('x', fromInteger(0))).toBe('x');
		expect(formatLinearFactor('x', fromInteger(2))).toBe('(x − 2)');
		expect(formatLinearFactor('x', fromInteger(-3))).toBe('(x + 3)');
		expect(formatLinearFactor('x', rational(1n, 2n))).toBe('(2x − 1)');
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
