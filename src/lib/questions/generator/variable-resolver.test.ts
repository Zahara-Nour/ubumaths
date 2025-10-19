/**
 * Variable Resolver Tests
 * ========================
 *
 * Tests for resolving variables in declaration order with 3-stage pipeline.
 */

import { describe, it, expect } from 'vitest';
import { resolveVariables } from './variable-resolver';
import type { QuestionVariable } from '../types';

describe('resolveVariables - Simple Cases', () => {
	it('should resolve simple integer random variable', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{#:1-10}' }];

		const result = resolveVariables(variables);

		expect(result.a).toBeGreaterThanOrEqual(1);
		expect(result.a).toBeLessThanOrEqual(10);
		expect(Number.isInteger(result.a)).toBe(true);
	});

	it('should resolve simple eval expression', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{eval:2+3}' }];

		const result = resolveVariables(variables);

		expect(result.a).toBe(5);
	});

	it('should resolve literal number', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '42' }];

		const result = resolveVariables(variables);

		expect(result.a).toBe('42'); // Literals stay as strings
	});

	it('should resolve multiple independent variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-5}' },
			{ name: 'b', expression: '{#:6-10}' },
			{ name: 'c', expression: '{eval:10+5}' }
		];

		const result = resolveVariables(variables);

		expect(result.a).toBeGreaterThanOrEqual(1);
		expect(result.a).toBeLessThanOrEqual(5);
		expect(result.b).toBeGreaterThanOrEqual(6);
		expect(result.b).toBeLessThanOrEqual(10);
		expect(result.c).toBe(15);
	});
});

describe('resolveVariables - Variable References', () => {
	it('should resolve variable referencing another variable', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '5' },
			{ name: 'b', expression: '{@:a}' }
		];

		const result = resolveVariables(variables);

		expect(result.a).toBe('5');
		expect(result.b).toBe('5');
	});

	it('should resolve variable in eval expression', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{eval:{@:a} * 2}' }
		];

		const result = resolveVariables(variables);

		expect(result.b).toBe(result.a * 2);
	});

	it('should resolve variable in random bounds', () => {
		const variables: QuestionVariable[] = [
			{ name: 'min', expression: '5' },
			{ name: 'max', expression: '15' },
			{ name: 'random', expression: '{#:{@:min}-{@:max}}' }
		];

		const result = resolveVariables(variables);

		expect(result.random).toBeGreaterThanOrEqual(5);
		expect(result.random).toBeLessThanOrEqual(15);
	});

	it('should resolve chain of variable references', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-5}' },
			{ name: 'b', expression: '{eval:{@:a} + 10}' },
			{ name: 'c', expression: '{eval:{@:b} * 2}' }
		];

		const result = resolveVariables(variables);

		expect(result.c).toBe((result.a + 10) * 2);
	});

	it('should resolve multiple variables in one expression', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-5}' },
			{ name: 'b', expression: '{#:1-5}' },
			{ name: 'sum', expression: '{eval:{@:a} + {@:b}}' }
		];

		const result = resolveVariables(variables);

		expect(result.sum).toBe(result.a + result.b);
	});
});

describe('resolveVariables - 3-Stage Pipeline', () => {
	it('should resolve variables before random expressions', () => {
		const variables: QuestionVariable[] = [
			{ name: 'lower', expression: '1' },
			{ name: 'upper', expression: '10' },
			{ name: 'random', expression: '{#:{@:lower}-{@:upper}}' }
		];

		const result = resolveVariables(variables);

		expect(result.random).toBeGreaterThanOrEqual(1);
		expect(result.random).toBeLessThanOrEqual(10);
	});

	it('should resolve random before eval', () => {
		const variables: QuestionVariable[] = [
			{ name: 'random', expression: '{#:1-10}' },
			{ name: 'doubled', expression: '{eval:{@:random} * 2}' }
		];

		const result = resolveVariables(variables);

		expect(result.doubled).toBe(result.random * 2);
	});

	it('should resolve full pipeline: variable → random → eval', () => {
		const variables: QuestionVariable[] = [
			{ name: 'max', expression: '10' },
			{ name: 'random', expression: '{#:1-{@:max}}' },
			{ name: 'squared', expression: '{eval:{@:random}^2}' }
		];

		const result = resolveVariables(variables);

		expect(result.random).toBeGreaterThanOrEqual(1);
		expect(result.random).toBeLessThanOrEqual(10);
		expect(result.squared).toBe(result.random ** 2);
	});

	it('should handle complex multi-stage resolution', () => {
		const variables: QuestionVariable[] = [
			{ name: 'base', expression: '{#:2-5}' },
			{ name: 'multiplier', expression: '{eval:{@:base} * 2}' },
			{ name: 'min', expression: '{@:multiplier}' },
			{ name: 'max', expression: '{eval:{@:multiplier} + 10}' },
			{ name: 'final', expression: '{#:{@:min}-{@:max}}' }
		];

		const result = resolveVariables(variables);

		const expectedMin = result.base * 2;
		const expectedMax = result.base * 2 + 10;

		expect(result.multiplier).toBe(expectedMin);
		expect(result.min).toBe(expectedMin);
		expect(result.max).toBe(expectedMax);
		expect(result.final).toBeGreaterThanOrEqual(expectedMin);
		expect(result.final).toBeLessThanOrEqual(expectedMax);
	});
});

describe('resolveVariables - Exclusions with Variables', () => {
	it('should resolve variable in value exclusion', () => {
		const variables: QuestionVariable[] = [
			{ name: 'exclude', expression: '5' },
			{ name: 'random', expression: '{#:1-10!{@:exclude}}' }
		];

		const result = resolveVariables(variables, 12345);

		expect(result.random).not.toBe(5);
		expect(result.random).toBeGreaterThanOrEqual(1);
		expect(result.random).toBeLessThanOrEqual(10);
	});

	it('should resolve variables in range exclusion', () => {
		const variables: QuestionVariable[] = [
			{ name: 'excludeMin', expression: '5' },
			{ name: 'excludeMax', expression: '8' },
			{ name: 'random', expression: '{#:1-15!{@:excludeMin}-{@:excludeMax}}' }
		];

		const result = resolveVariables(variables, 54321);

		expect(result.random < 5 || result.random > 8).toBe(true);
	});

	it('should resolve multiple exclusions with variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '3' },
			{ name: 'b', expression: '7' },
			{ name: 'random', expression: '{#:1-10!{@:a},{@:b}}' }
		];

		const result = resolveVariables(variables, 11111);

		expect(result.random).not.toBe(3);
		expect(result.random).not.toBe(7);
	});
});

describe('resolveVariables - Seeded Random', () => {
	it('should produce same results with same seed', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-100}' },
			{ name: 'b', expression: '{#:1-100}' }
		];

		const result1 = resolveVariables(variables, 99999);
		const result2 = resolveVariables(variables, 99999);

		expect(result1.a).toBe(result2.a);
		expect(result1.b).toBe(result2.b);
	});

	it('should produce different results with different seeds', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{#:1-1000}' }];

		const result1 = resolveVariables(variables, 11111);
		const result2 = resolveVariables(variables, 22222);

		// With large range, very unlikely to be same
		expect(result1.a).not.toBe(result2.a);
	});

	it('should produce reproducible results for complex variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{#:1-10}' },
			{ name: 'sum', expression: '{eval:{@:a} + {@:b}}' },
			{ name: 'random', expression: '{#:{@:sum}-100}' }
		];

		const result1 = resolveVariables(variables, 77777);
		const result2 = resolveVariables(variables, 77777);

		expect(result1).toEqual(result2);
	});
});

describe('resolveVariables - Decimal Variables', () => {
	it('should resolve decimal random variable', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{#:0.5-9.99:0.01}' }];

		const result = resolveVariables(variables);

		expect(result.a).toBeGreaterThanOrEqual(0.5);
		expect(result.a).toBeLessThanOrEqual(9.99);
	});

	it('should resolve decimal by digits', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{#:2.3}' }];

		const result = resolveVariables(variables);

		expect(result.a).toBeGreaterThanOrEqual(10);
		expect(result.a).toBeLessThan(100);
	});

	it('should resolve eval with decimal variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1.5-5.5:0.5}' },
			{ name: 'b', expression: '{eval:{@:a} * 2}' }
		];

		const result = resolveVariables(variables);

		expect(result.b).toBe(result.a * 2);
	});

	it('should resolve decimal variables in bounds', () => {
		const variables: QuestionVariable[] = [
			{ name: 'min', expression: '1.5' },
			{ name: 'max', expression: '9.5' },
			{ name: 'random', expression: '{#:{@:min}-{@:max}:0.1}' }
		];

		const result = resolveVariables(variables);

		expect(result.random).toBeGreaterThanOrEqual(1.5);
		expect(result.random).toBeLessThanOrEqual(9.5);
	});
});

describe('resolveVariables - Complex Mathematical Examples', () => {
	it('should resolve fraction addition variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'den', expression: '{#:2-9}' },
			{ name: 'num1', expression: '{#:1-{@:den}-1}' },
			{ name: 'num2', expression: '{#:1-{@:den}-1!{@:num1}}' },
			{ name: 'answer', expression: '{eval:({@:num1}+{@:num2})/{@:den}}' }
		];

		const result = resolveVariables(variables, 12345);

		expect(result.den).toBeGreaterThanOrEqual(2);
		expect(result.den).toBeLessThanOrEqual(9);
		expect(result.num1).toBeGreaterThanOrEqual(1);
		expect(result.num1).toBeLessThan(result.den);
		expect(result.num2).toBeGreaterThanOrEqual(1);
		expect(result.num2).toBeLessThan(result.den);
		expect(result.num1).not.toBe(result.num2);
		expect(result.answer).toBeCloseTo((result.num1 + result.num2) / result.den, 5);
	});

	it('should resolve GCD/simplification variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'gcd', expression: '{#:2-5}' },
			{ name: 'a', expression: '{#:2-9}' },
			{ name: 'b', expression: '{#:2-9!{@:a}}' },
			{ name: 'num', expression: '{eval:{@:a}*{@:gcd}}' },
			{ name: 'den', expression: '{eval:{@:b}*{@:gcd}}' },
			{ name: 'answer', expression: '{eval:{@:num}/{@:den}}' }
		];

		const result = resolveVariables(variables, 54321);

		expect(result.gcd).toBeGreaterThanOrEqual(2);
		expect(result.gcd).toBeLessThanOrEqual(5);
		expect(result.a).not.toBe(result.b);
		expect(result.num).toBe(result.a * result.gcd);
		expect(result.den).toBe(result.b * result.gcd);
		expect(result.answer).toBeCloseTo(result.num / result.den, 5);
	});

	it('should resolve quadratic equation variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-5}' },
			{ name: 'b', expression: '{#:-10-10}' },
			{ name: 'c', expression: '{#:-10-10}' },
			{ name: 'discriminant', expression: '{eval:{@:b}^2 - 4*{@:a}*{@:c}}' }
		];

		const result = resolveVariables(variables, 99999);

		expect(result.discriminant).toBe(result.b ** 2 - 4 * result.a * result.c);
	});

	it('should resolve percentage calculation variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'price', expression: '{#:10-100}' },
			{ name: 'discount', expression: '{#:5-50}' },
			{ name: 'reduction', expression: '{eval:{@:price} * {@:discount} / 100}' },
			{ name: 'final', expression: '{eval:{@:price} - {@:reduction}}' }
		];

		const result = resolveVariables(variables, 33333);

		expect(result.reduction).toBeCloseTo((result.price * result.discount) / 100, 5);
		expect(result.final).toBeCloseTo(result.price - result.reduction, 5);
	});
});

describe('resolveVariables - Edge Cases', () => {
	it('should handle empty variables array', () => {
		const variables: QuestionVariable[] = [];

		const result = resolveVariables(variables);

		expect(result).toEqual({});
	});

	it('should handle variable with empty expression', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '' }];

		const result = resolveVariables(variables);

		expect(result.a).toBe('');
	});

	it('should handle LaTeX in variable expressions', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'latex', expression: '\\frac{{@:a}}{2}' }
		];

		const result = resolveVariables(variables);

		expect(result.latex).toContain(result.a.toString());
	});

	it('should handle very long variable names', () => {
		const variables: QuestionVariable[] = [
			{ name: 'very_long_variable_name_for_testing', expression: '{#:1-10}' },
			{
				name: 'result',
				expression: '{eval:{@:very_long_variable_name_for_testing} * 2}'
			}
		];

		const result = resolveVariables(variables);

		expect(result.result).toBe(result.very_long_variable_name_for_testing * 2);
	});

	it('should handle negative numbers in eval', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'negative', expression: '{eval:-{@:a}}' }
		];

		const result = resolveVariables(variables);

		expect(result.negative).toBe(-result.a);
	});

	it('should handle zero values', () => {
		const variables: QuestionVariable[] = [
			{ name: 'zero', expression: '{eval:0}' },
			{ name: 'result', expression: '{eval:{@:zero} + 5}' }
		];

		const result = resolveVariables(variables);

		expect(result.zero).toBe(0);
		expect(result.result).toBe(5);
	});
});

describe('resolveVariables - Error Handling', () => {
	it('should throw on circular dependency (direct)', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{@:a}' }];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on circular dependency (indirect)', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:a}' }
		];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on circular dependency (chain)', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:c}' },
			{ name: 'c', expression: '{@:a}' }
		];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on undefined variable reference', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{@:undefined}' }];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on invalid random expression (min > max)', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{#:10-1}' }];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on invalid eval expression', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{eval:invalid syntax}' }];

		// Depends on compute engine error handling
		expect(() => resolveVariables(variables)).toThrow();
	});
});
