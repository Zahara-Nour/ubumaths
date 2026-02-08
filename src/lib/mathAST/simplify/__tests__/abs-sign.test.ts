/**
 * Tests for abs simplification with bounds-based sign assumptions.
 *
 * Verifies that simplify correctly removes absolute value when
 * TypeContext provides variable bounds that allow sign deduction,
 * or when the expression's sign can be inferred structurally
 * (e.g., exp(x) is always positive, x² is always non-negative).
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../simplify';
import {
	func,
	subtract,
	add,
	multiply,
	divide,
	variable,
	number,
	opposite,
	power
} from '../../factory';
import { toLatex } from '../../latex-generator';
import { inferType } from '../../numtype/infer';
import type { TypeContext } from '../../numtype/types';
import type { Bounds } from '$lib/math/intervals/algebra';

// =============================================================================
// Helpers
// =============================================================================

function abs(node: Parameters<typeof func>[1][0]) {
	return func('abs', [node]);
}

function exp(node: Parameters<typeof func>[1][0]) {
	return func('exp', [node]);
}

const x = variable('x');
const y = variable('y');

function ctxBounds(varName: string, bounds: Bounds): TypeContext {
	return { assumptions: new Map([[varName, { bounds }]]) };
}

function ctxSign(varName: string, sign: 'positive' | 'negative'): TypeContext {
	return { assumptions: new Map([[varName, { sign }]]) };
}

function ltBounds(value: number): Bounds {
	return { lower: null, upper: value, lowerInclusive: false, upperInclusive: false };
}

function gtBounds(value: number): Bounds {
	return { lower: value, upper: null, lowerInclusive: false, upperInclusive: false };
}

function closedBounds(a: number, b: number): Bounds {
	return { lower: a, upper: b, lowerInclusive: true, upperInclusive: true };
}

function simplifyLatex(node: Parameters<typeof simplify>[0], ctx?: TypeContext): string {
	return toLatex(simplify(node, { ctx }).result);
}

/** Assert result contains no absolute value bars */
function expectNoAbs(result: string) {
	expect(result).not.toContain('\\left|');
}

/** Assert result still contains absolute value bars */
function expectAbs(result: string) {
	expect(result).toContain('\\left|');
}

// =============================================================================
// Simple variable with sign assumptions
// =============================================================================

describe('abs with sign assumptions', () => {
	it('|x| -> x when x > 0', () => {
		expect(simplifyLatex(abs(x), ctxSign('x', 'positive'))).toBe('x');
	});

	it('|x| -> -x when x < 0', () => {
		expect(simplifyLatex(abs(x), ctxSign('x', 'negative'))).toBe('-x');
	});

	it('|x| unchanged without assumptions', () => {
		expectAbs(simplifyLatex(abs(x)));
	});
});

// =============================================================================
// Variable with bounds
// =============================================================================

describe('abs with bounds on variable', () => {
	it('|x| -> x when x > 0 (bounds)', () => {
		expect(simplifyLatex(abs(x), ctxBounds('x', gtBounds(0)))).toBe('x');
	});

	it('|x| -> -x when x < 0 (bounds)', () => {
		expect(simplifyLatex(abs(x), ctxBounds('x', ltBounds(0)))).toBe('-x');
	});

	it('|x| -> x when x in [3, 7]', () => {
		expect(simplifyLatex(abs(x), ctxBounds('x', closedBounds(3, 7)))).toBe('x');
	});

	it('|x| -> -x when x in [-5, -1]', () => {
		expect(simplifyLatex(abs(x), ctxBounds('x', closedBounds(-5, -1)))).toBe('-x');
	});

	it('|x| unchanged when x in [-1, 1] (crosses zero)', () => {
		expectAbs(simplifyLatex(abs(x), ctxBounds('x', closedBounds(-1, 1))));
	});
});

// =============================================================================
// Linear expressions: bounds propagation through arithmetic
// =============================================================================

describe('abs of linear expressions with bounds', () => {
	it('|x - 3| -> -x + 3 when x < 2', () => {
		expect(simplifyLatex(abs(subtract(x, number('3'))), ctxBounds('x', ltBounds(2)))).toBe(
			'-x + 3'
		);
	});

	it('|x - 3| -> x - 3 when x > 5', () => {
		expect(simplifyLatex(abs(subtract(x, number('3'))), ctxBounds('x', gtBounds(5)))).toBe('x - 3');
	});

	it('|x - 3| unchanged when x in [1, 4] (crosses zero at x=3)', () => {
		expectAbs(simplifyLatex(abs(subtract(x, number('3'))), ctxBounds('x', closedBounds(1, 4))));
	});

	it('|x + 2| -> x + 2 when x > 0 (sum of positives)', () => {
		expect(simplifyLatex(abs(add(x, number('2'))), ctxBounds('x', gtBounds(0)))).toBe('x + 2');
	});

	it('|x + 2| -> -x - 2 when x < -3', () => {
		expect(simplifyLatex(abs(add(x, number('2'))), ctxBounds('x', ltBounds(-3)))).toBe('-x - 2');
	});

	it('|x + 2| unchanged when x in [-5, 0] (sum crosses zero)', () => {
		expectAbs(simplifyLatex(abs(add(x, number('2'))), ctxBounds('x', closedBounds(-5, 0))));
	});

	it('|2x + 1| -> 2x + 1 when x > 0', () => {
		const expr = abs(add(multiply(number('2'), x), number('1')));
		expectNoAbs(simplifyLatex(expr, ctxBounds('x', gtBounds(0))));
	});
});

// =============================================================================
// Exponential function (always positive)
// =============================================================================

describe('abs of exp (always positive)', () => {
	it('|exp(x)| -> exp(x) without assumptions', () => {
		expectNoAbs(simplifyLatex(abs(exp(x))));
	});

	it('|exp(x)| -> exp(x) with x > 0', () => {
		expectNoAbs(simplifyLatex(abs(exp(x)), ctxBounds('x', gtBounds(0))));
	});

	it('|exp(x)| -> exp(x) with x < 0', () => {
		expectNoAbs(simplifyLatex(abs(exp(x)), ctxBounds('x', ltBounds(0))));
	});

	it('|-exp(x)| -> exp(x) (negation of always-positive)', () => {
		const result = simplifyLatex(abs(opposite(exp(x))));
		expectNoAbs(result);
		expect(result).not.toContain('-');
	});
});

// =============================================================================
// Even powers (always non-negative)
// =============================================================================

describe('abs of even powers', () => {
	it('|x²| -> x² (even power, handled by normalize)', () => {
		expectNoAbs(simplifyLatex(abs(power(x, number('2')))));
	});

	it('|x⁴| -> x⁴ (handled by normalize)', () => {
		expectNoAbs(simplifyLatex(abs(power(x, number('4')))));
	});

	it('|x³| unchanged without assumptions (odd power)', () => {
		expectAbs(simplifyLatex(abs(power(x, number('3')))));
	});

	// TODO: inferPowerType does not propagate sign for odd powers with sign assumptions
	it.skip('|x³| -> x³ when x > 0 (needs inferPowerType sign propagation)', () => {
		expectNoAbs(simplifyLatex(abs(power(x, number('3'))), ctxSign('x', 'positive')));
	});
});

// =============================================================================
// Sums that are always positive/negative
// =============================================================================

describe('abs of expressions that are always positive/negative', () => {
	// TODO: inferPowerType does not produce bounds for x², so x²+1 sign cannot be deduced
	it.skip('|x² + 1| -> x² + 1 (always >= 1, needs power bounds)', () => {
		expectNoAbs(simplifyLatex(abs(add(power(x, number('2')), number('1')))));
	});

	it.skip('|-x² - 1| -> x² + 1 (always negative inside, needs power bounds)', () => {
		expectNoAbs(simplifyLatex(abs(subtract(opposite(power(x, number('2'))), number('1')))));
	});

	it('|exp(x) + 1| -> exp(x) + 1 (always > 1)', () => {
		expectNoAbs(simplifyLatex(abs(add(exp(x), number('1')))));
	});

	it('|exp(x) - 1| unchanged without assumptions (crosses zero at x=0)', () => {
		expectAbs(simplifyLatex(abs(subtract(exp(x), number('1')))));
	});
});

// =============================================================================
// Products with known signs
// =============================================================================

describe('abs of products with sign assumptions', () => {
	it('|x * y| -> x * y when both x > 0 and y > 0', () => {
		const ctx: TypeContext = {
			assumptions: new Map([
				['x', { sign: 'positive' as const }],
				['y', { sign: 'positive' as const }]
			])
		};
		expectNoAbs(simplifyLatex(abs(multiply(x, y)), ctx));
	});

	it('|x * y| removed when x > 0, y < 0 (negative product)', () => {
		const ctx: TypeContext = {
			assumptions: new Map([
				['x', { sign: 'positive' as const }],
				['y', { sign: 'negative' as const }]
			])
		};
		expectNoAbs(simplifyLatex(abs(multiply(x, y)), ctx));
	});

	it('|x * y| unchanged when x > 0, y unknown', () => {
		expectAbs(simplifyLatex(abs(multiply(x, y)), ctxSign('x', 'positive')));
	});
});

// =============================================================================
// Quotients
// =============================================================================

describe('abs of quotients with sign assumptions', () => {
	it('|x / y| -> x / y when x > 0, y > 0', () => {
		const ctx: TypeContext = {
			assumptions: new Map([
				['x', { sign: 'positive' as const }],
				['y', { sign: 'positive' as const }]
			])
		};
		expectNoAbs(simplifyLatex(abs(divide(x, y)), ctx));
	});

	it('|x / y| removed when x > 0, y < 0', () => {
		const ctx: TypeContext = {
			assumptions: new Map([
				['x', { sign: 'positive' as const }],
				['y', { sign: 'negative' as const }]
			])
		};
		expectNoAbs(simplifyLatex(abs(divide(x, y)), ctx));
	});
});

// =============================================================================
// inferType bounds propagation (unit-level)
// =============================================================================

describe('inferType bounds propagation for sign deduction', () => {
	it('x - 3 is negative when x < 2', () => {
		expect(inferType(subtract(x, number('3')), ctxBounds('x', ltBounds(2))).sign).toBe('negative');
	});

	it('x - 3 is positive when x > 5', () => {
		expect(inferType(subtract(x, number('3')), ctxBounds('x', gtBounds(5))).sign).toBe('positive');
	});

	it('x - 3 sign unknown when x in [-1, 4]', () => {
		expect(
			inferType(subtract(x, number('3')), ctxBounds('x', closedBounds(-1, 4))).sign
		).toBeUndefined();
	});

	it('x + 2 is positive when x > 0', () => {
		expect(inferType(add(x, number('2')), ctxBounds('x', gtBounds(0))).sign).toBe('positive');
	});

	it('x + 2 is negative when x < -3', () => {
		expect(inferType(add(x, number('2')), ctxBounds('x', ltBounds(-3))).sign).toBe('negative');
	});

	it('-x is positive when x < 0', () => {
		expect(inferType(opposite(x), ctxBounds('x', ltBounds(0))).sign).toBe('positive');
	});

	it('-x is negative when x > 0', () => {
		expect(inferType(opposite(x), ctxBounds('x', gtBounds(0))).sign).toBe('negative');
	});

	it('2x is positive when x > 0', () => {
		expect(inferType(multiply(number('2'), x), ctxBounds('x', gtBounds(0))).sign).toBe('positive');
	});

	it('2x is negative when x < 0', () => {
		expect(inferType(multiply(number('2'), x), ctxBounds('x', ltBounds(0))).sign).toBe('negative');
	});

	it('x/2 is positive when x > 0', () => {
		expect(inferType(divide(x, number('2')), ctxBounds('x', gtBounds(0))).sign).toBe('positive');
	});

	it('exp(x) is always positive', () => {
		expect(inferType(exp(x)).sign).toBe('positive');
	});
});
