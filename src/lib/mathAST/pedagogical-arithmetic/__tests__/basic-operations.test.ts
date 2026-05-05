/**
 * Tests for `pedagogical-rules/basic-operations.ts` (Phase 3).
 *
 * Each rule is exercised in isolation via `applyRule()` against a hand-built
 * `MathNode`. Tests cover :
 * - All four atomic binary operations (add, sub, mul, div) with simple and
 *   negative operands, plus the b≠0 guard on division.
 * - Grouping rule fires for sums with ≥2 numeric multiplications, and is
 *   correctly silent when only one multiplication exists.
 * - Trivial simplifications (`x + 0`, `x × 1`, `x × 0`, `x / 1`, `x − 0`),
 *   including commutative orders for `+` and `×`.
 * - `applicableLevels` per rule matches the documented matrix.
 */

import { describe, expect, it } from 'vitest';
import { add, divide, multiply, number, opposite, subtract, variable } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { toLatex } from '../../latex-generator';
import {
	BASIC_OPERATION_RULES,
	evaluateBinaryAdd,
	evaluateBinaryDiv,
	evaluateBinaryMul,
	evaluateBinarySub,
	groupMultiplicationsInAddition,
	simplifyAddZero,
	simplifyDivOne,
	simplifyMulOne,
	simplifyMulZero,
	simplifySubZero
} from '../pedagogical-rules/basic-operations';

const x = variable('x');

describe('basic-operations rules', () => {
	describe('evaluateBinaryAdd', () => {
		it('2 + 3 → 5', () => {
			const result = applyRule(evaluateBinaryAdd.rule, add(number('2'), number('3')));
			expect(result && toLatex(result)).toBe('5');
		});

		it('does not fire on x + 3 (left is variable)', () => {
			const result = applyRule(evaluateBinaryAdd.rule, add(x, number('3')));
			expect(result).toBeNull();
		});

		it('description college returns "Addition"', () => {
			expect(evaluateBinaryAdd.descriptions.college?.({})).toBe('Addition');
		});

		it('description primaire uses bindings', () => {
			const desc = evaluateBinaryAdd.descriptions.primaire?.({
				a: number('2'),
				b: number('3')
			});
			expect(desc).toBe('On additionne 2 et 3');
		});

		it('description with missing binding falls back to "?"', () => {
			const desc = evaluateBinaryAdd.descriptions.primaire?.({});
			expect(desc).toBe('On additionne ? et ?');
		});

		it('applies to all 4 levels', () => {
			expect(evaluateBinaryAdd.applicableLevels).toEqual([
				'primaire',
				'college',
				'lycee',
				'superieur'
			]);
		});
	});

	describe('evaluateBinarySub', () => {
		it('5 - 2 → 3', () => {
			const result = applyRule(evaluateBinarySub.rule, subtract(number('5'), number('2')));
			expect(result && toLatex(result)).toBe('3');
		});

		it('2 - 5 → -3 (negative result)', () => {
			const result = applyRule(evaluateBinarySub.rule, subtract(number('2'), number('5')));
			expect(result && toLatex(result)).toBe('-3');
		});
	});

	describe('evaluateBinaryMul', () => {
		it('3 × 4 → 12', () => {
			const result = applyRule(evaluateBinaryMul.rule, multiply(number('3'), number('4'), 'cross'));
			expect(result && toLatex(result)).toBe('12');
		});

		it('does not fire on x × 4', () => {
			const result = applyRule(evaluateBinaryMul.rule, multiply(x, number('4'), 'cross'));
			expect(result).toBeNull();
		});
	});

	describe('evaluateBinaryDiv', () => {
		it('6 / 3 → 2', () => {
			const result = applyRule(
				evaluateBinaryDiv.rule,
				divide(number('6'), number('3'), 'fraction')
			);
			expect(result && toLatex(result)).toBe('2');
		});

		it('1 / 3 does NOT fire (non-integer result — left to reduceFraction)', () => {
			const result = applyRule(
				evaluateBinaryDiv.rule,
				divide(number('1'), number('3'), 'fraction')
			);
			expect(result).toBeNull();
		});

		it('3 / 6 does NOT fire (non-integer result — reduceFraction handles it)', () => {
			const result = applyRule(
				evaluateBinaryDiv.rule,
				divide(number('3'), number('6'), 'fraction')
			);
			expect(result).toBeNull();
		});

		it('-12 / 4 → -3 (negative integer result fires)', () => {
			const result = applyRule(
				evaluateBinaryDiv.rule,
				divide(opposite(number('12')), number('4'), 'fraction')
			);
			expect(result && toLatex(result)).toBe('-3');
		});

		it('division by zero is a silent no-op (returns null via condition)', () => {
			// evaluate(exact) returns 'unevaluable' on 1/0 ; the condition rejects
			// the binding (no integer result available), so applyRule returns null.
			const node = divide(number('5'), number('0'), 'fraction');
			const result = applyRule(evaluateBinaryDiv.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('groupMultiplicationsInAddition', () => {
		it('2 + 3*4 + 5*6 → 2 + 12 + 30 (in one step)', () => {
			const node = add(
				add(number('2'), multiply(number('3'), number('4'), 'cross')),
				multiply(number('5'), number('6'), 'cross')
			);
			const result = applyRule(groupMultiplicationsInAddition.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('12');
			expect(latex).toContain('30');
			// Original product LaTeX should not survive
			expect(latex).not.toMatch(/3\s*[\\×*]\s*4/);
		});

		it('does NOT fire on a sum with only one multiplication', () => {
			const node = add(number('2'), multiply(number('3'), number('4'), 'cross'));
			const result = applyRule(groupMultiplicationsInAddition.rule, node);
			expect(result).toBeNull();
		});

		it('does NOT fire on a pure sum (no multiplication)', () => {
			const node = add(number('2'), number('3'));
			const result = applyRule(groupMultiplicationsInAddition.rule, node);
			expect(result).toBeNull();
		});

		it('handles negative terms : 2 - 3*4 + 5*6', () => {
			const node = add(
				subtract(number('2'), multiply(number('3'), number('4'), 'cross')),
				multiply(number('5'), number('6'), 'cross')
			);
			const result = applyRule(groupMultiplicationsInAddition.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('12');
			expect(latex).toContain('30');
		});

		it('is NOT applicable in primaire', () => {
			expect(groupMultiplicationsInAddition.applicableLevels).not.toContain('primaire');
		});

		it('IS applicable in college / lycee / superieur', () => {
			expect(groupMultiplicationsInAddition.applicableLevels).toEqual([
				'college',
				'lycee',
				'superieur'
			]);
		});

		it('description college mentions multiplications and divisions', () => {
			expect(groupMultiplicationsInAddition.descriptions.college?.({})).toBe(
				"On effectue d'abord les multiplications et divisions"
			);
		});
	});

	describe('trivial simplifications', () => {
		it('x + 0 → x', () => {
			const result = applyRule(simplifyAddZero.rule, add(x, number('0')));
			expect(result && toLatex(result)).toBe('x');
		});

		it('0 + x → x (commutative)', () => {
			const result = applyRule(simplifyAddZero.rule, add(number('0'), x));
			expect(result && toLatex(result)).toBe('x');
		});

		it('x - 0 → x', () => {
			const result = applyRule(simplifySubZero.rule, subtract(x, number('0')));
			expect(result && toLatex(result)).toBe('x');
		});

		it('0 - x does NOT fire simplifySubZero (subtraction is asymmetric)', () => {
			const result = applyRule(simplifySubZero.rule, subtract(number('0'), x));
			expect(result).toBeNull();
		});

		it('x × 1 → x', () => {
			const result = applyRule(simplifyMulOne.rule, multiply(x, number('1'), 'cross'));
			expect(result && toLatex(result)).toBe('x');
		});

		it('1 × x → x (commutative)', () => {
			const result = applyRule(simplifyMulOne.rule, multiply(number('1'), x, 'cross'));
			expect(result && toLatex(result)).toBe('x');
		});

		it('x × 0 → 0', () => {
			const result = applyRule(simplifyMulZero.rule, multiply(x, number('0'), 'cross'));
			expect(result && toLatex(result)).toBe('0');
		});

		it('x / 1 → x', () => {
			const result = applyRule(simplifyDivOne.rule, divide(x, number('1'), 'fraction'));
			expect(result && toLatex(result)).toBe('x');
		});
	});

	describe('priority hierarchy', () => {
		it('grouping rule has the highest priority (200)', () => {
			expect(groupMultiplicationsInAddition.priority).toBe(200);
		});

		it('atomic rules have priority 100', () => {
			expect(evaluateBinaryAdd.priority).toBe(100);
			expect(evaluateBinarySub.priority).toBe(100);
			expect(evaluateBinaryMul.priority).toBe(100);
			expect(evaluateBinaryDiv.priority).toBe(100);
		});

		it('trivial rules have priority 50', () => {
			expect(simplifyAddZero.priority).toBe(50);
			expect(simplifyMulOne.priority).toBe(50);
			expect(simplifyMulZero.priority).toBe(50);
			expect(simplifyDivOne.priority).toBe(50);
		});
	});

	describe('BASIC_OPERATION_RULES export', () => {
		it('contains all 11 rules', () => {
			expect(BASIC_OPERATION_RULES).toHaveLength(11);
		});

		it('first item is groupParentheses (highest priority among basic ops)', () => {
			expect(BASIC_OPERATION_RULES[0].name).toBe('group-parentheses');
		});

		it('second item is groupMultiplicationsInAddition', () => {
			expect(BASIC_OPERATION_RULES[1].name).toBe('group-multiplications-in-addition');
		});
	});

	describe('opposite operands', () => {
		it('opposite(3) + 5 → 2 (the :number constraint accepts negatives)', () => {
			const result = applyRule(evaluateBinaryAdd.rule, add(opposite(number('3')), number('5')));
			// The pattern parser's `:number` constraint matches numerical values,
			// not just `number` AST nodes — so `opposite(3)` qualifies. This is
			// useful for the pedagogical pipeline because we don't need to
			// canonicalize negatives before applying atomic rules.
			expect(result && toLatex(result)).toBe('2');
		});
	});
});
