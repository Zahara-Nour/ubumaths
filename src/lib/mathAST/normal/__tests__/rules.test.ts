/**
 * Tests for simplification rules (arithmetic, powers, radicals)
 */

import { describe, test, expect } from 'vitest';
import type { MathNode } from '../../types';
import {
	applyArithmeticRules,
	simplifyArithmetic,
	isZeroNode,
	isOneNode
} from '../rules/arithmetic';
import { applyPowerRules } from '../rules/powers';
import { applyRadicalRules } from '../rules/radicals';
import { simplify } from '../rules/index';

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

function opposite(operand: MathNode): MathNode {
	return { type: 'opposite', operand };
}

function positive(operand: MathNode): MathNode {
	return { type: 'positive', operand };
}

function sqrt(arg: MathNode): MathNode {
	return { type: 'function', name: 'sqrt', args: [arg] };
}

function _root(arg: MathNode, index: MathNode): MathNode {
	return { type: 'function', name: 'root', args: [arg, index] };
}

// =============================================================================
// Arithmetic Rules Tests
// =============================================================================

describe('Arithmetic Rules', () => {
	describe('isZeroNode', () => {
		test('recognizes 0', () => {
			expect(isZeroNode(num('0'))).toBe(true);
		});

		test('recognizes 0.0', () => {
			expect(isZeroNode(num('0.0'))).toBe(true);
		});

		test('rejects non-zero', () => {
			expect(isZeroNode(num('1'))).toBe(false);
			expect(isZeroNode(num('0.1'))).toBe(false);
		});

		test('rejects variables', () => {
			expect(isZeroNode(variable('x'))).toBe(false);
		});
	});

	describe('isOneNode', () => {
		test('recognizes 1', () => {
			expect(isOneNode(num('1'))).toBe(true);
		});

		test('recognizes 1.0', () => {
			expect(isOneNode(num('1.0'))).toBe(true);
		});

		test('rejects non-one', () => {
			expect(isOneNode(num('0'))).toBe(false);
			expect(isOneNode(num('2'))).toBe(false);
		});
	});

	describe('applyArithmeticRules', () => {
		describe('Addition rules', () => {
			test('0 + x = x', () => {
				const node = add(num('0'), variable('x'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(variable('x'));
			});

			test('x + 0 = x', () => {
				const node = add(variable('x'), num('0'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(variable('x'));
			});

			test('non-zero addition returns null', () => {
				const node = add(num('1'), variable('x'));
				const result = applyArithmeticRules(node);
				expect(result).toBeNull();
			});
		});

		describe('Subtraction rules', () => {
			test('x - 0 = x', () => {
				const node = sub(variable('x'), num('0'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(variable('x'));
			});

			test('non-zero subtraction returns null', () => {
				const node = sub(variable('x'), num('1'));
				const result = applyArithmeticRules(node);
				expect(result).toBeNull();
			});
		});

		describe('Multiplication rules', () => {
			test('0 * x = 0', () => {
				const node = mul(num('0'), variable('x'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(num('0'));
			});

			test('x * 0 = 0', () => {
				const node = mul(variable('x'), num('0'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(num('0'));
			});

			test('1 * x = x', () => {
				const node = mul(num('1'), variable('x'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(variable('x'));
			});

			test('x * 1 = x', () => {
				const node = mul(variable('x'), num('1'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(variable('x'));
			});

			test('non-identity multiplication returns null', () => {
				const node = mul(num('2'), variable('x'));
				const result = applyArithmeticRules(node);
				expect(result).toBeNull();
			});
		});

		describe('Division rules', () => {
			test('x / 1 = x', () => {
				const node = div(variable('x'), num('1'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(variable('x'));
			});

			test('0 / x = 0', () => {
				const node = div(num('0'), variable('x'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(num('0'));
			});

			test('non-identity division returns null', () => {
				const node = div(variable('x'), num('2'));
				const result = applyArithmeticRules(node);
				expect(result).toBeNull();
			});
		});

		describe('Power rules', () => {
			test('x^0 = 1', () => {
				const node = power(variable('x'), num('0'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(num('1'));
			});

			test('x^1 = x', () => {
				const node = power(variable('x'), num('1'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(variable('x'));
			});

			test('0^n = 0 (n > 0)', () => {
				const node = power(num('0'), num('2'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(num('0'));
			});

			test('1^n = 1', () => {
				const node = power(num('1'), num('5'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(num('1'));
			});

			test('non-identity power returns null', () => {
				const node = power(variable('x'), num('2'));
				const result = applyArithmeticRules(node);
				expect(result).toBeNull();
			});
		});

		describe('Unary rules', () => {
			test('-0 = 0', () => {
				const node = opposite(num('0'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(num('0'));
			});

			test('+x = x', () => {
				const node = positive(variable('x'));
				const result = applyArithmeticRules(node);
				expect(result).toEqual(variable('x'));
			});
		});
	});

	describe('simplifyArithmetic (recursive)', () => {
		test('nested: 1 * (x + 0) = x', () => {
			const node = mul(num('1'), add(variable('x'), num('0')));
			const result = simplifyArithmetic(node);
			expect(result).toEqual(variable('x'));
		});

		test('nested: (0 + x) * 1 = x', () => {
			const node = mul(add(num('0'), variable('x')), num('1'));
			const result = simplifyArithmetic(node);
			expect(result).toEqual(variable('x'));
		});

		test('nested power: (x^1)^1 = x', () => {
			const node = power(power(variable('x'), num('1')), num('1'));
			const result = simplifyArithmetic(node);
			expect(result).toEqual(variable('x'));
		});
	});
});

// =============================================================================
// Power Rules Tests
// =============================================================================

describe('Power Rules', () => {
	describe('applyPowerRules', () => {
		describe('x^a * x^b = x^(a+b)', () => {
			test('x^2 * x^3 = x^5', () => {
				const node = mul(power(variable('x'), num('2')), power(variable('x'), num('3')));
				const result = applyPowerRules(node);
				expect(result).toEqual(power(variable('x'), num('5')));
			});

			test('x * x = x^2', () => {
				const node = mul(variable('x'), variable('x'));
				const result = applyPowerRules(node);
				expect(result).toEqual(power(variable('x'), num('2')));
			});

			test('x^2 * x = x^3', () => {
				const node = mul(power(variable('x'), num('2')), variable('x'));
				const result = applyPowerRules(node);
				expect(result).toEqual(power(variable('x'), num('3')));
			});

			test('x * x^2 = x^3', () => {
				const node = mul(variable('x'), power(variable('x'), num('2')));
				const result = applyPowerRules(node);
				expect(result).toEqual(power(variable('x'), num('3')));
			});

			test('different bases returns null', () => {
				const node = mul(power(variable('x'), num('2')), power(variable('y'), num('3')));
				const result = applyPowerRules(node);
				expect(result).toBeNull();
			});
		});

		describe('(x^a)^b = x^(ab)', () => {
			test('(x^2)^3 = x^6', () => {
				const node = power(power(variable('x'), num('2')), num('3'));
				const result = applyPowerRules(node);
				expect(result).toEqual(power(variable('x'), num('6')));
			});

			test('(x^3)^2 = x^6', () => {
				const node = power(power(variable('x'), num('3')), num('2'));
				const result = applyPowerRules(node);
				expect(result).toEqual(power(variable('x'), num('6')));
			});

			test('(x^2)^0 = 1', () => {
				const node = power(power(variable('x'), num('2')), num('0'));
				const result = applyPowerRules(node);
				expect(result).toEqual(num('1'));
			});

			test('(x^2)^1 = x^2', () => {
				const node = power(power(variable('x'), num('2')), num('1'));
				const result = applyPowerRules(node);
				expect(result).toEqual(power(variable('x'), num('2')));
			});
		});

		describe('(xy)^n = x^n * y^n', () => {
			test('(xy)^2 = x^2 * y^2', () => {
				const node = power(mul(variable('x'), variable('y')), num('2'));
				const result = applyPowerRules(node);
				expect(result?.type).toBe('multiplication');
				if (result?.type === 'multiplication') {
					expect(result.left).toEqual(power(variable('x'), num('2')));
					expect(result.right).toEqual(power(variable('y'), num('2')));
				}
			});
		});

		describe('(x/y)^n = x^n / y^n', () => {
			test('(x/y)^2 = x^2 / y^2', () => {
				const node = power(div(variable('x'), variable('y')), num('2'));
				const result = applyPowerRules(node);
				expect(result?.type).toBe('division');
				if (result?.type === 'division') {
					expect(result.numerator).toEqual(power(variable('x'), num('2')));
					expect(result.denominator).toEqual(power(variable('y'), num('2')));
				}
			});
		});
	});
});

// =============================================================================
// Radical Rules Tests
// =============================================================================

describe('Radical Rules', () => {
	describe('applyRadicalRules', () => {
		describe('sqrt simplifications', () => {
			test('sqrt(0) = 0', () => {
				const node = sqrt(num('0'));
				const result = applyRadicalRules(node);
				expect(result).toEqual(num('0'));
			});

			test('sqrt(1) = 1', () => {
				const node = sqrt(num('1'));
				const result = applyRadicalRules(node);
				expect(result).toEqual(num('1'));
			});

			test('sqrt(4) = 2', () => {
				const node = sqrt(num('4'));
				const result = applyRadicalRules(node);
				expect(result).toEqual(num('2'));
			});

			test('sqrt(9) = 3', () => {
				const node = sqrt(num('9'));
				const result = applyRadicalRules(node);
				expect(result).toEqual(num('3'));
			});

			test('sqrt(non-perfect-square) returns null', () => {
				const node = sqrt(num('2'));
				const result = applyRadicalRules(node);
				expect(result).toBeNull();
			});
		});

		describe('sqrt(a) * sqrt(b) = sqrt(ab)', () => {
			test('sqrt(2) * sqrt(3) = sqrt(6)', () => {
				const node = mul(sqrt(num('2')), sqrt(num('3')));
				const result = applyRadicalRules(node);
				expect(result).toEqual(sqrt(mul(num('2'), num('3'))));
			});
		});

		describe('sqrt(a/b) = sqrt(a) / sqrt(b)', () => {
			test('sqrt(x/y) = sqrt(x) / sqrt(y)', () => {
				const node = sqrt(div(variable('x'), variable('y')));
				const result = applyRadicalRules(node);
				expect(result?.type).toBe('division');
				if (result?.type === 'division') {
					expect(result.numerator).toEqual(sqrt(variable('x')));
					expect(result.denominator).toEqual(sqrt(variable('y')));
				}
			});
		});

		describe('sqrt(x^2) = |x|', () => {
			test('sqrt(x^2) = abs(x)', () => {
				const node = sqrt(power(variable('x'), num('2')));
				const result = applyRadicalRules(node);
				expect(result?.type).toBe('function');
				if (result?.type === 'function') {
					expect(result.name).toBe('abs');
					expect(result.args[0]).toEqual(variable('x'));
				}
			});
		});
	});
});

// =============================================================================
// Combined Simplification Tests
// =============================================================================

describe('Combined simplify', () => {
	test('applies all rules', () => {
		// (x * 1 + 0)^1 should simplify to x
		const node = power(add(mul(variable('x'), num('1')), num('0')), num('1'));
		const result = simplify(node);
		expect(result).toEqual(variable('x'));
	});

	test('fixed point: multiple iterations converge', () => {
		// 1 * (1 * x) should simplify to x
		const node = mul(num('1'), mul(num('1'), variable('x')));
		const result = simplify(node);
		expect(result).toEqual(variable('x'));
	});
});
