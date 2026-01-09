/**
 * Tests for Phase 1 simplification rules (radicals only)
 * and semantic expression checks (isZeroExpression, isOneExpression)
 *
 * Note: Arithmetic and power rules have been moved to Phase 2 (polynomial normalization)
 * and are tested in normalize.test.ts
 */

import { describe, test, expect } from 'vitest';
import type { MathNode } from '../../types';
import { applyRadicalRules, simplify } from '../rules/index';
import { isZeroExpression, isOneExpression } from '../normalize';

// =============================================================================
// Helper Functions
// =============================================================================

function num(value: string): MathNode {
	return { type: 'number', value };
}

function variable(name: string): MathNode {
	return { type: 'variable', name };
}

function add(left: MathNode, right: MathNode): MathNode {
	return { type: 'addition', left, right };
}

function sub(left: MathNode, right: MathNode): MathNode {
	return { type: 'subtraction', left, right };
}

function mul(left: MathNode, right: MathNode): MathNode {
	return { type: 'multiplication', left, right, displayStyle: 'implicit' };
}

function div(numerator: MathNode, denominator: MathNode): MathNode {
	return { type: 'division', numerator, denominator, displayStyle: 'fraction' };
}

function power(base: MathNode, exponent: MathNode): MathNode {
	return { type: 'superscript', base, superscript: exponent };
}

function sqrt(arg: MathNode): MathNode {
	return { type: 'function', name: 'sqrt', args: [arg] };
}

// =============================================================================
// Radical Rules Tests (Phase 1)
// =============================================================================

describe('Radical Rules (Phase 1)', () => {
	describe('applyRadicalRules', () => {
		describe('sqrt(a) * sqrt(b) = sqrt(ab)', () => {
			test('sqrt(2) * sqrt(3) = sqrt(6)', () => {
				const node = mul(sqrt(num('2')), sqrt(num('3')));
				const result = applyRadicalRules(node);
				expect(result).toEqual(sqrt(mul(num('2'), num('3'))));
			});

			test('sqrt(x) * sqrt(y) = sqrt(xy)', () => {
				const node = mul(sqrt(variable('x')), sqrt(variable('y')));
				const result = applyRadicalRules(node);
				expect(result).toEqual(sqrt(mul(variable('x'), variable('y'))));
			});

			test('non-sqrt multiplication returns null', () => {
				const node = mul(variable('x'), variable('y'));
				const result = applyRadicalRules(node);
				expect(result).toBeNull();
			});

			test('mixed sqrt and non-sqrt returns null', () => {
				const node = mul(sqrt(num('2')), variable('x'));
				const result = applyRadicalRules(node);
				expect(result).toBeNull();
			});
		});

		describe('no simplification cases', () => {
			test('sqrt(x) returns null (no rule applies)', () => {
				const node = sqrt(variable('x'));
				const result = applyRadicalRules(node);
				expect(result).toBeNull();
			});

			test('sqrt(2) returns null (no rule applies)', () => {
				const node = sqrt(num('2'));
				const result = applyRadicalRules(node);
				expect(result).toBeNull();
			});

			test('addition returns null', () => {
				const node = add(sqrt(num('2')), sqrt(num('3')));
				const result = applyRadicalRules(node);
				expect(result).toBeNull();
			});
		});
	});

	describe('simplify (recursive)', () => {
		test('nested sqrt multiplication', () => {
			// (sqrt(2) * sqrt(3)) + x should simplify inner part
			const node = add(mul(sqrt(num('2')), sqrt(num('3'))), variable('x'));
			const result = simplify(node);
			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left).toEqual(sqrt(mul(num('2'), num('3'))));
				expect(result.right).toEqual(variable('x'));
			}
		});

		test('sqrt in division numerator', () => {
			const node = div(mul(sqrt(num('2')), sqrt(num('3'))), variable('x'));
			const result = simplify(node);
			expect(result.type).toBe('division');
			if (result.type === 'division') {
				expect(result.numerator).toEqual(sqrt(mul(num('2'), num('3'))));
			}
		});
	});
});

// =============================================================================
// Semantic Expression Checks Tests
// =============================================================================

describe('isZeroExpression', () => {
	describe('literal zeros', () => {
		test('0 is zero', () => {
			expect(isZeroExpression(num('0'))).toBe(true);
		});

		test('0.0 is zero', () => {
			expect(isZeroExpression(num('0.0'))).toBe(true);
		});

		test('0.00 is zero', () => {
			expect(isZeroExpression(num('0.00'))).toBe(true);
		});
	});

	describe('algebraic zeros', () => {
		test('x - x = 0', () => {
			expect(isZeroExpression(sub(variable('x'), variable('x')))).toBe(true);
		});

		test('x + (-x) = 0', () => {
			const negX: MathNode = { type: 'opposite', operand: variable('x') };
			expect(isZeroExpression(add(variable('x'), negX))).toBe(true);
		});

		test('0 * x = 0', () => {
			expect(isZeroExpression(mul(num('0'), variable('x')))).toBe(true);
		});

		test('x * 0 = 0', () => {
			expect(isZeroExpression(mul(variable('x'), num('0')))).toBe(true);
		});

		test('0 / x = 0', () => {
			expect(isZeroExpression(div(num('0'), variable('x')))).toBe(true);
		});
	});

	describe('non-zeros', () => {
		test('1 is not zero', () => {
			expect(isZeroExpression(num('1'))).toBe(false);
		});

		test('x is not zero', () => {
			expect(isZeroExpression(variable('x'))).toBe(false);
		});

		test('x + 1 is not zero', () => {
			expect(isZeroExpression(add(variable('x'), num('1')))).toBe(false);
		});
	});
});

describe('isOneExpression', () => {
	describe('literal ones', () => {
		test('1 is one', () => {
			expect(isOneExpression(num('1'))).toBe(true);
		});

		test('1.0 is one', () => {
			expect(isOneExpression(num('1.0'))).toBe(true);
		});

		test('1.00 is one', () => {
			expect(isOneExpression(num('1.00'))).toBe(true);
		});
	});

	describe('algebraic ones', () => {
		test('x / x = 1', () => {
			expect(isOneExpression(div(variable('x'), variable('x')))).toBe(true);
		});

		test('x^0 = 1', () => {
			expect(isOneExpression(power(variable('x'), num('0')))).toBe(true);
		});

		// Note: (x + 1) / (x + 1) = 1 is NOT tested because our normalization
		// doesn't perform polynomial GCD simplification. The numerator and denominator
		// remain as separate polynomials.

		test('1 * 1 = 1', () => {
			expect(isOneExpression(mul(num('1'), num('1')))).toBe(true);
		});

		test('1^n = 1', () => {
			expect(isOneExpression(power(num('1'), num('5')))).toBe(true);
		});
	});

	describe('non-ones', () => {
		test('0 is not one', () => {
			expect(isOneExpression(num('0'))).toBe(false);
		});

		test('2 is not one', () => {
			expect(isOneExpression(num('2'))).toBe(false);
		});

		test('x is not one', () => {
			expect(isOneExpression(variable('x'))).toBe(false);
		});

		test('x + 1 is not one', () => {
			expect(isOneExpression(add(variable('x'), num('1')))).toBe(false);
		});
	});
});
