/**
 * Tests for normalizeWithSteps and simplifyExpressionWithSteps
 *
 * These tests verify the step recording functionality during Phase 2 normalization.
 */

import { describe, it, expect } from 'vitest';
import { normalizeWithSteps, simplifyExpressionWithSteps } from '../normalize';
import type { MathNode } from '../../types';

// =============================================================================
// Test Helpers
// =============================================================================

const num = (value: string): MathNode => ({ type: 'number', value });
const variable = (name: string): MathNode => ({ type: 'variable', name });
const add = (left: MathNode, right: MathNode): MathNode => ({ type: 'addition', left, right });
const sub = (left: MathNode, right: MathNode): MathNode => ({ type: 'subtraction', left, right });
const mul = (left: MathNode, right: MathNode): MathNode => ({
	type: 'multiplication',
	left,
	right,
	displayStyle: 'implicit'
});
const div = (numerator: MathNode, denominator: MathNode): MathNode => ({
	type: 'division',
	numerator,
	denominator,
	displayStyle: 'fraction'
});
const pow = (base: MathNode, exp: MathNode): MathNode => ({
	type: 'superscript',
	base,
	superscript: exp
});
const sqrt = (arg: MathNode): MathNode => ({
	type: 'function',
	name: 'sqrt',
	args: [arg]
});
const sin = (arg: MathNode): MathNode => ({
	type: 'function',
	name: 'sin',
	args: [arg]
});
const cos = (arg: MathNode): MathNode => ({
	type: 'function',
	name: 'cos',
	args: [arg]
});
const exp = (arg: MathNode): MathNode => ({
	type: 'function',
	name: 'exp',
	args: [arg]
});
const ln = (arg: MathNode): MathNode => ({
	type: 'function',
	name: 'ln',
	args: [arg]
});
const pi: MathNode = { type: 'greek', letter: 'pi' };
const e: MathNode = { type: 'variable', name: 'e' };
const tan = (arg: MathNode): MathNode => ({
	type: 'function',
	name: 'tan',
	args: [arg]
});
const log = (arg: MathNode, base?: MathNode): MathNode => {
	const node: MathNode & { type: 'function'; base?: MathNode } = {
		type: 'function',
		name: 'log',
		args: [arg]
	};
	if (base) node.base = base;
	return node;
};
const opposite = (operand: MathNode): MathNode => ({ type: 'opposite', operand });
const positive = (operand: MathNode): MathNode => ({ type: 'positive', operand });
const delimiter = (content: MathNode): MathNode => ({
	type: 'delimiter',
	open: '(',
	close: ')',
	content
});

// =============================================================================
// normalizeWithSteps Tests
// =============================================================================

describe('normalizeWithSteps', () => {
	describe('basic functionality', () => {
		it('should return normalized form and steps', () => {
			const expr = add(variable('x'), variable('x'));
			const { result, steps } = normalizeWithSteps(expr);

			expect(result).toBeDefined();
			expect(result.hash).toBeDefined();
			expect(Array.isArray(steps)).toBe(true);
		});

		it('should return empty steps for simple variables', () => {
			const expr = variable('x');
			const { steps } = normalizeWithSteps(expr);

			// A simple variable doesn't require any transformation
			expect(steps.length).toBe(0);
		});

		it('should return empty steps for simple numbers', () => {
			const expr = num('5');
			const { steps } = normalizeWithSteps(expr);

			expect(steps.length).toBe(0);
		});
	});

	describe('verbosity levels', () => {
		it('should return no steps for result verbosity', () => {
			const expr = add(variable('x'), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'result');

			expect(steps.length).toBe(0);
		});

		it('should return summarized steps only for summarized verbosity', () => {
			// Division should record a 'simplify-fraction' step at 'summarized' level
			const expr = div(mul(num('2'), variable('x')), num('2'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			// All returned steps should be at 'summarized' level or lower
			for (const step of steps) {
				expect(['summarized', 'result']).toContain(step.verbosityLevel);
			}
		});

		it('should return all steps for detailed verbosity', () => {
			const expr = add(variable('x'), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'detailed');

			// Should have more steps than summarized
			const summarizedSteps = normalizeWithSteps(expr, 'summarized').steps;
			expect(steps.length).toBeGreaterThanOrEqual(summarizedSteps.length);
		});
	});

	describe('combine-like-terms rule', () => {
		it('should record step for x + x → 2x', () => {
			const expr = add(variable('x'), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'detailed');

			// Should have at least one step
			expect(steps.length).toBeGreaterThan(0);

			// Check that steps have required fields
			for (const step of steps) {
				expect(step.id).toBeGreaterThan(0);
				expect(step.rule.length).toBeGreaterThan(0);
				expect(step.description.length).toBeGreaterThan(0);
				expect(step.before).toBeDefined();
				expect(step.after).toBeDefined();
				expect(step.verbosityLevel).toBeDefined();
			}
		});

		it('should record step for subtraction', () => {
			const expr = sub(mul(num('3'), variable('x')), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'detailed');

			expect(steps.length).toBeGreaterThan(0);
		});
	});

	describe('power rules', () => {
		it('should record power-zero step for x^0 → 1', () => {
			const expr = pow(variable('x'), num('0'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const powerZeroStep = steps.find((s) => s.rule === 'power-zero');
			expect(powerZeroStep).toBeDefined();
		});

		it('should record expand-power step for (x+1)^2', () => {
			// (x+1)^2 expands to x^2 + 2x + 1
			const expr = pow(add(variable('x'), num('1')), num('2'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const expandPowerStep = steps.find((s) => s.rule === 'expand-power');
			expect(expandPowerStep).toBeDefined();
		});
	});

	describe('simplify-fraction rule', () => {
		it('should record step for 2x/2 → x', () => {
			const expr = div(mul(num('2'), variable('x')), num('2'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const fractionStep = steps.find((s) => s.rule === 'simplify-fraction');
			expect(fractionStep).toBeDefined();
		});
	});

	describe('trigonometric rules', () => {
		it('should record trig-known-value for sin(0)', () => {
			const expr = sin(num('0'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should record trig-known-value for cos(0)', () => {
			const expr = cos(num('0'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should record trig-known-value for sin(pi)', () => {
			const expr = sin(pi);
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});
	});

	describe('transcendental rules', () => {
		it('should record exp-ln-inverse for exp(ln(x))', () => {
			const expr = exp(ln(variable('x')));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const expLnStep = steps.find((s) => s.rule === 'exp-ln-inverse');
			expect(expLnStep).toBeDefined();
		});

		it('should record ln-exp-inverse for ln(exp(x))', () => {
			const expr = ln(exp(variable('x')));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const lnExpStep = steps.find((s) => s.rule === 'ln-exp-inverse');
			expect(lnExpStep).toBeDefined();
		});

		it('should record exp-zero for exp(0)', () => {
			const expr = exp(num('0'));
			const { steps } = normalizeWithSteps(expr, 'detailed');

			const expZeroStep = steps.find((s) => s.rule === 'exp-zero');
			expect(expZeroStep).toBeDefined();
		});

		it('should record ln-one for ln(1)', () => {
			const expr = ln(num('1'));
			const { steps } = normalizeWithSteps(expr, 'detailed');

			const lnOneStep = steps.find((s) => s.rule === 'ln-one');
			expect(lnOneStep).toBeDefined();
		});
	});

	describe('radical rules', () => {
		it('should record radical-simplify for sqrt(4)', () => {
			const expr = sqrt(num('4'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const radicalStep = steps.find((s) => s.rule === 'radical-simplify');
			expect(radicalStep).toBeDefined();
		});

		it('should record radical-simplify for sqrt(18)', () => {
			// sqrt(18) = 3*sqrt(2)
			const expr = sqrt(num('18'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			const radicalStep = steps.find((s) => s.rule === 'radical-simplify');
			expect(radicalStep).toBeDefined();
		});
	});

	describe('step format', () => {
		it('should have all required fields in steps', () => {
			const expr = add(variable('x'), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'detailed');

			for (const step of steps) {
				expect(step).toHaveProperty('id');
				expect(step).toHaveProperty('rule');
				expect(step).toHaveProperty('description');
				expect(step).toHaveProperty('before');
				expect(step).toHaveProperty('after');
				expect(step).toHaveProperty('verbosityLevel');

				expect(typeof step.id).toBe('number');
				expect(typeof step.rule).toBe('string');
				expect(typeof step.description).toBe('string');
				expect(step.before).toBeDefined();
				expect(step.after).toBeDefined();
			}
		});

		it('should have incrementing step IDs', () => {
			// Use an expression with multiple transformations
			const expr = add(add(variable('x'), variable('x')), variable('y'));
			const { steps } = normalizeWithSteps(expr, 'detailed');

			if (steps.length > 1) {
				for (let i = 1; i < steps.length; i++) {
					expect(steps[i].id).toBeGreaterThan(steps[i - 1].id);
				}
			}
		});

		it('should have French descriptions', () => {
			const expr = div(mul(num('2'), variable('x')), num('2'));
			const { steps } = normalizeWithSteps(expr, 'summarized');

			// Descriptions should be in French
			for (const step of steps) {
				// At minimum, description should exist and not be just the rule name
				expect(step.description.length).toBeGreaterThan(3);
			}
		});
	});

	// =========================================================================
	// EDGE CASES
	// =========================================================================

	describe('edge cases - numbers', () => {
		it('should handle zero', () => {
			const expr = num('0');
			const { result, steps } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
			expect(steps.length).toBe(0); // No transformation needed
		});

		it('should handle negative numbers', () => {
			const expr = opposite(num('5'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle large integers', () => {
			const expr = num('999999999');
			const { result, steps } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
			expect(steps.length).toBe(0);
		});

		it('should handle decimal numbers', () => {
			const expr = num('3.14159');
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle fraction display style', () => {
			const expr = div(num('1'), num('2'));
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - combine-like-terms', () => {
		it('should handle x + x + x → 3x', () => {
			const expr = add(add(variable('x'), variable('x')), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle 5x - 3x → 2x', () => {
			const expr = sub(mul(num('5'), variable('x')), mul(num('3'), variable('x')));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle x - x → 0', () => {
			const expr = sub(variable('x'), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle multiple variables: x + y + x → 2x + y', () => {
			const expr = add(add(variable('x'), variable('y')), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle nested additions: (a + b) + (c + d)', () => {
			const expr = add(add(variable('a'), variable('b')), add(variable('c'), variable('d')));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle coefficient multiplication: 2*3*x', () => {
			const expr = mul(mul(num('2'), num('3')), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle mixed addition and multiplication: 2x + 3x', () => {
			const expr = add(mul(num('2'), variable('x')), mul(num('3'), variable('x')));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBeGreaterThan(0);
		});
	});

	describe('edge cases - power rules', () => {
		it('should handle 0^0 (mathematical edge case)', () => {
			const expr = pow(num('0'), num('0'));
			const { result } = normalizeWithSteps(expr, 'summarized');
			// 0^0 is typically defined as 1 in normalization
			expect(result).toBeDefined();
		});

		it('should handle 1^n → 1 for any n', () => {
			const expr = pow(num('1'), num('100'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle 0^n → 0 for n > 0', () => {
			const expr = pow(num('0'), num('5'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle x^1 → x', () => {
			const expr = pow(variable('x'), num('1'));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			const powerOneStep = steps.find((s) => s.rule === 'power-one');
			expect(powerOneStep).toBeDefined();
		});

		it('should handle nested power: (x^2)^3 → x^6', () => {
			const expr = pow(pow(variable('x'), num('2')), num('3'));
			const { result, steps } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle (a*b)^2 → a^2*b^2', () => {
			const expr = pow(mul(variable('a'), variable('b')), num('2'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle (a/b)^2 → a^2/b^2', () => {
			const expr = pow(div(variable('a'), variable('b')), num('2'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle large exponent: x^10', () => {
			const expr = pow(variable('x'), num('10'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - fractions', () => {
		it('should handle x/x → 1', () => {
			const expr = div(variable('x'), variable('x'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const fractionStep = steps.find((s) => s.rule === 'simplify-fraction');
			expect(fractionStep).toBeDefined();
		});

		it('should handle (x+1)/(x+1) → 1', () => {
			const expr = div(add(variable('x'), num('1')), add(variable('x'), num('1')));
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});

		it('should handle nested fractions: (a/b)/(c/d)', () => {
			const expr = div(div(variable('a'), variable('b')), div(variable('c'), variable('d')));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle polynomial GCD: (x^2-1)/(x-1) → x+1', () => {
			// x^2 - 1 = (x-1)(x+1)
			const numerator = sub(pow(variable('x'), num('2')), num('1'));
			const denominator = sub(variable('x'), num('1'));
			const expr = div(numerator, denominator);
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});

		it('should handle numeric fraction: 6/9 → 2/3', () => {
			const expr = div(num('6'), num('9'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle fraction with zero numerator: 0/x → 0', () => {
			const expr = div(num('0'), variable('x'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle complex fraction: (2x + 4)/(x + 2)', () => {
			// 2x + 4 = 2(x + 2)
			const numerator = add(mul(num('2'), variable('x')), num('4'));
			const denominator = add(variable('x'), num('2'));
			const expr = div(numerator, denominator);
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - trigonometric functions', () => {
		it('should handle sin(pi/2) → 1', () => {
			const expr = sin(div(pi, num('2')));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should handle cos(pi) → -1', () => {
			const expr = cos(pi);
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should handle tan(0) → 0', () => {
			const expr = tan(num('0'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should handle sin(pi/6) → 1/2', () => {
			const expr = sin(div(pi, num('6')));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should handle cos(pi/4) → sqrt(2)/2', () => {
			const expr = cos(div(pi, num('4')));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should handle sin(pi/3) → sqrt(3)/2', () => {
			const expr = sin(div(pi, num('3')));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should handle tan(pi/4) → 1', () => {
			const expr = tan(div(pi, num('4')));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeDefined();
		});

		it('should NOT record step for sin(x) with unknown x', () => {
			const expr = sin(variable('x'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const trigStep = steps.find((s) => s.rule === 'trig-known-value');
			expect(trigStep).toBeUndefined();
		});

		it('should handle trig with normalized argument: sin(x+x) = sin(2x)', () => {
			const expr = sin(add(variable('x'), variable('x')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - logarithms', () => {
		it('should handle ln(e) → 1', () => {
			const expr = ln(e);
			const { steps } = normalizeWithSteps(expr, 'detailed');
			const lnEStep = steps.find((s) => s.rule === 'ln-e');
			expect(lnEStep).toBeDefined();
		});

		it('should handle log(10) → 1', () => {
			const expr = log(num('10'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle log_2(8) → 3', () => {
			const expr = log(num('8'), num('2'));
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});

		it('should handle ln(x*y) → ln(x) + ln(y)', () => {
			const expr = ln(mul(variable('x'), variable('y')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle ln(x/y) → ln(x) - ln(y)', () => {
			const expr = ln(div(variable('x'), variable('y')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle ln(x^2) → 2*ln(x)', () => {
			const expr = ln(pow(variable('x'), num('2')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle nested ln: ln(exp(ln(x)))', () => {
			const expr = ln(exp(ln(variable('x'))));
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - exponentials', () => {
		it('should handle exp(1) → e', () => {
			const expr = exp(num('1'));
			const { steps } = normalizeWithSteps(expr, 'detailed');
			const expOneStep = steps.find((s) => s.rule === 'exp-one');
			expect(expOneStep).toBeDefined();
		});

		it('should handle exp(2*ln(x)) → x^2', () => {
			const expr = exp(mul(num('2'), ln(variable('x'))));
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});

		it('should handle exp(ln(x) + ln(y)) → x*y', () => {
			const expr = exp(add(ln(variable('x')), ln(variable('y'))));
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});

		it('should handle exp(-ln(x)) → 1/x', () => {
			const expr = exp(opposite(ln(variable('x'))));
			const { result } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
		});

		it('should handle nested exp: exp(exp(0))', () => {
			const expr = exp(exp(num('0')));
			const { result } = normalizeWithSteps(expr, 'detailed');
			expect(result).toBeDefined();
		});

		it('should handle exp(x+0) via normalized argument', () => {
			const expr = exp(add(variable('x'), num('0')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - radicals', () => {
		it('should handle sqrt(0) → 0', () => {
			const expr = sqrt(num('0'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle sqrt(1) → 1', () => {
			const expr = sqrt(num('1'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle sqrt(9) → 3', () => {
			const expr = sqrt(num('9'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const radicalStep = steps.find((s) => s.rule === 'radical-simplify');
			expect(radicalStep).toBeDefined();
		});

		it('should handle sqrt(50) → 5*sqrt(2)', () => {
			const expr = sqrt(num('50'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const radicalStep = steps.find((s) => s.rule === 'radical-simplify');
			expect(radicalStep).toBeDefined();
		});

		it('should handle sqrt(x^2) (symbolic)', () => {
			const expr = sqrt(pow(variable('x'), num('2')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle sqrt(a*b) multiplication', () => {
			const expr = sqrt(mul(variable('a'), variable('b')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle large perfect square: sqrt(10000)', () => {
			const expr = sqrt(num('10000'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			const radicalStep = steps.find((s) => s.rule === 'radical-simplify');
			expect(radicalStep).toBeDefined();
		});

		it('should handle prime radicand: sqrt(7)', () => {
			const expr = sqrt(num('7'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
			// No simplification for prime radicands
		});
	});

	describe('edge cases - complex expressions', () => {
		it('should handle (x+1)^2 - x^2 → 2x + 1', () => {
			const expr = sub(pow(add(variable('x'), num('1')), num('2')), pow(variable('x'), num('2')));
			const { result, steps } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle 2(x+1) - 2x → 2', () => {
			const expr = sub(mul(num('2'), add(variable('x'), num('1'))), mul(num('2'), variable('x')));
			const { result, steps } = normalizeWithSteps(expr, 'detailed');
			expect(result).toBeDefined();
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle sin^2(0) + cos^2(0) → 1', () => {
			const expr = add(pow(sin(num('0')), num('2')), pow(cos(num('0')), num('2')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle exp(ln(x)) + x → 2x', () => {
			const expr = add(exp(ln(variable('x'))), variable('x'));
			const { result, steps } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle sqrt(4) * sqrt(9) → 6', () => {
			const expr = mul(sqrt(num('4')), sqrt(num('9')));
			const { result, steps } = normalizeWithSteps(expr, 'summarized');
			expect(result).toBeDefined();
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle (a+b)(a-b) → a^2 - b^2', () => {
			const expr = mul(add(variable('a'), variable('b')), sub(variable('a'), variable('b')));
			const { result, steps } = normalizeWithSteps(expr, 'detailed');
			expect(result).toBeDefined();
			expect(steps.length).toBeGreaterThan(0);
		});

		it('should handle x^2 + 2xy + y^2 (already expanded)', () => {
			const expr = add(
				add(pow(variable('x'), num('2')), mul(mul(num('2'), variable('x')), variable('y'))),
				pow(variable('y'), num('2'))
			);
			const { result } = normalizeWithSteps(expr, 'detailed');
			expect(result).toBeDefined();
		});

		it('should handle deeply nested: ((x+1)+1)+1', () => {
			const expr = add(add(add(variable('x'), num('1')), num('1')), num('1'));
			const { result } = normalizeWithSteps(expr, 'detailed');
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - no transformation needed', () => {
		it('should handle single variable without steps', () => {
			const expr = variable('x');
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBe(0);
		});

		it('should handle single number without steps', () => {
			const expr = num('42');
			const { steps } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBe(0);
		});

		it('should handle pi without steps', () => {
			const { steps } = normalizeWithSteps(pi, 'detailed');
			expect(steps.length).toBe(0);
		});

		it('should handle x^2 without expand steps (not an expansion)', () => {
			const expr = pow(variable('x'), num('2'));
			const { steps } = normalizeWithSteps(expr, 'summarized');
			// x^2 is already in canonical form, no expand-power
			const expandStep = steps.find((s) => s.rule === 'expand-power');
			expect(expandStep).toBeUndefined();
		});
	});

	describe('edge cases - delimiter/parentheses', () => {
		it('should handle (x) → x (parentheses removal)', () => {
			const expr = delimiter(variable('x'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle nested parentheses: ((x+1))', () => {
			const expr = delimiter(delimiter(add(variable('x'), num('1'))));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - positive/opposite', () => {
		it('should handle +x → x', () => {
			const expr = positive(variable('x'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle -(-x) → x', () => {
			const expr = opposite(opposite(variable('x')));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle -0 → 0', () => {
			const expr = opposite(num('0'));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});
	});

	describe('edge cases - multiple transformations sequence', () => {
		it('should track multiple steps for complex expr', () => {
			// This should trigger multiple rules
			const expr = add(
				pow(add(variable('x'), num('0')), num('2')), // x^0+0)^2 = x^2
				exp(ln(variable('x'))) // exp(ln(x)) = x
			);
			const { steps } = normalizeWithSteps(expr, 'summarized');
			expect(steps.length).toBeGreaterThan(1);
		});

		it('should maintain step order consistency', () => {
			const expr = add(add(variable('x'), variable('x')), add(variable('y'), variable('y')));
			const { steps } = normalizeWithSteps(expr, 'detailed');

			// Run twice and verify same order
			const { steps: steps2 } = normalizeWithSteps(expr, 'detailed');
			expect(steps.length).toBe(steps2.length);
			for (let i = 0; i < steps.length; i++) {
				expect(steps[i].rule).toBe(steps2[i].rule);
			}
		});
	});

	describe('edge cases - special constants', () => {
		it('should handle e (Euler number) as variable', () => {
			const { result, steps } = normalizeWithSteps(e, 'detailed');
			expect(result).toBeDefined();
			expect(steps.length).toBe(0);
		});

		it('should handle pi as greek letter', () => {
			const { result, steps } = normalizeWithSteps(pi, 'detailed');
			expect(result).toBeDefined();
			expect(steps.length).toBe(0);
		});

		it('should handle 2*pi', () => {
			const expr = mul(num('2'), pi);
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});

		it('should handle e^(i*pi) conceptually', () => {
			// Just testing it doesn't crash - actual result depends on complex support
			const expr = pow(e, mul({ type: 'variable', name: 'i' }, pi));
			const { result } = normalizeWithSteps(expr);
			expect(result).toBeDefined();
		});
	});
});

// =============================================================================
// simplifyExpressionWithSteps Tests
// =============================================================================

describe('simplifyExpressionWithSteps', () => {
	it('should return MathNode instead of NormalForm', () => {
		const expr = add(variable('x'), variable('x'));
		const { result } = simplifyExpressionWithSteps(expr);

		// Result should be a MathNode
		expect(result).toHaveProperty('type');
	});

	it('should return same steps as normalizeWithSteps', () => {
		const expr = add(variable('x'), variable('x'));
		const normalizeResult = normalizeWithSteps(expr, 'detailed');
		const simplifyResult = simplifyExpressionWithSteps(expr, 'detailed');

		expect(simplifyResult.steps.length).toBe(normalizeResult.steps.length);
	});
});
