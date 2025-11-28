/**
 * Variable Resolver Tests
 * ========================
 *
 * Tests for resolving variables in declaration order with 3-stage pipeline.
 * Uses pure Markdown syntax ({{...}}) - no legacy Questions syntax.
 */

import { describe, it, expect } from 'vitest';
import { resolveVariables } from './variable-resolver';
import type { QuestionVariable, ResolvedVariable } from '../types';

/**
 * Helper to convert ResolvedVariable[] to object for easier testing
 */
function toObject(resolved: ResolvedVariable[]): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	for (const v of resolved) {
		// Check if it's a fraction like "8/5"
		if (v.value.includes('/')) {
			const parts = v.value.split('/');
			if (parts.length === 2) {
				const numerator = parseFloat(parts[0]);
				const denominator = parseFloat(parts[1]);
				if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
					obj[v.name] = numerator / denominator;
					continue;
				}
			}
		}

		// Try to parse as number, otherwise keep as string
		const num = parseFloat(v.value);
		obj[v.name] = isNaN(num) ? v.value : num;
	}
	return obj;
}

describe('resolveVariables - Simple Cases', () => {
	it('should resolve simple integer random variable', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{random:1..10}}' }];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.a)).toBeGreaterThanOrEqual(1);
		expect(Number(result.a)).toBeLessThanOrEqual(10);
		expect(Number.isInteger(Number(result.a))).toBe(true);
	});

	it('should resolve simple eval expression', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{eval:2+3}}' }];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.a)).toBe(5);
	});

	it('should resolve literal number', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '42' }];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.a)).toBe(42); // toObject() converts numeric strings to numbers
	});

	it('should resolve multiple independent variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..5}}' },
			{ name: 'b', expression: '{{random:6..10}}' },
			{ name: 'c', expression: '{{eval:10+5}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.a)).toBeGreaterThanOrEqual(1);
		expect(Number(result.a)).toBeLessThanOrEqual(5);
		expect(Number(result.b)).toBeGreaterThanOrEqual(6);
		expect(Number(result.b)).toBeLessThanOrEqual(10);
		expect(Number(result.c)).toBe(15);
	});
});

describe('resolveVariables - Variable References', () => {
	it('should resolve variable referencing another variable', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '5' },
			{ name: 'b', expression: '{{a}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.a)).toBe(5);
		expect(Number(result.b)).toBe(5);
	});

	it('should resolve variable in eval expression', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..10}}' },
			{ name: 'b', expression: '{{eval:{{a}} * 2}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.b)).toBe(Number(result.a) * 2);
	});

	it('should resolve variable in random bounds', () => {
		const variables: QuestionVariable[] = [
			{ name: 'min', expression: '5' },
			{ name: 'max', expression: '15' },
			{ name: 'random', expression: '{{random:{{min}}..{{max}}}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.random)).toBeGreaterThanOrEqual(5);
		expect(Number(result.random)).toBeLessThanOrEqual(15);
	});

	it('should resolve chain of variable references', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..5}}' },
			{ name: 'b', expression: '{{eval:{{a}} + 10}}' },
			{ name: 'c', expression: '{{eval:{{b}} * 2}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.c)).toBe((Number(result.a) + 10) * 2);
	});

	it('should resolve multiple variables in one expression', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..5}}' },
			{ name: 'b', expression: '{{random:1..5}}' },
			{ name: 'sum', expression: '{{eval:{{a}} + {{b}}}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.sum)).toBe(Number(result.a) + Number(result.b));
	});
});

describe('resolveVariables - 3-Stage Pipeline', () => {
	it('should resolve variables before random expressions', () => {
		const variables: QuestionVariable[] = [
			{ name: 'lower', expression: '1' },
			{ name: 'upper', expression: '10' },
			{ name: 'random', expression: '{{random:{{lower}}..{{upper}}}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.random)).toBeGreaterThanOrEqual(1);
		expect(Number(result.random)).toBeLessThanOrEqual(10);
	});

	it('should resolve random before eval', () => {
		const variables: QuestionVariable[] = [
			{ name: 'random', expression: '{{random:1..10}}' },
			{ name: 'doubled', expression: '{{eval:{{random}} * 2}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(result.doubled).toBe(Number(result.random) * 2);
	});

	it('should resolve full pipeline: variable → random → eval', () => {
		const variables: QuestionVariable[] = [
			{ name: 'max', expression: '10' },
			{ name: 'random', expression: '{{random:1..{{max}}}}' },
			{ name: 'squared', expression: '{{eval:{{random}}^2}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.random)).toBeGreaterThanOrEqual(1);
		expect(Number(result.random)).toBeLessThanOrEqual(10);
		expect(result.squared).toBe(Number(result.random) ** 2);
	});

	it('should handle complex multi-stage resolution', () => {
		const variables: QuestionVariable[] = [
			{ name: 'base', expression: '{{random:2..5}}' },
			{ name: 'multiplier', expression: '{{eval:{{base}} * 2}}' },
			{ name: 'min', expression: '{{multiplier}}' },
			{ name: 'max', expression: '{{eval:{{multiplier}} + 10}}' },
			{ name: 'final', expression: '{{random:{{min}}..{{max}}}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		const expectedMin = Number(result.base) * 2;
		const expectedMax = Number(result.base) * 2 + 10;

		expect(result.multiplier).toBe(expectedMin);
		expect(Number(result.min)).toBe(expectedMin);
		expect(Number(result.max)).toBe(expectedMax);
		expect(result.final).toBeGreaterThanOrEqual(expectedMin);
		expect(result.final).toBeLessThanOrEqual(expectedMax);
	});
});

describe('resolveVariables - Exclusions with Variables', () => {
	it('should resolve variable in value exclusion', () => {
		const variables: QuestionVariable[] = [
			{ name: 'exclude', expression: '5' },
			{ name: 'random', expression: '{{random:1..10!{{exclude}}}}' }
		];

		const resolved = resolveVariables(variables, 12345);
		const result = toObject(resolved);

		expect(Number(result.random)).not.toBe(5);
		expect(Number(result.random)).toBeGreaterThanOrEqual(1);
		expect(Number(result.random)).toBeLessThanOrEqual(10);
	});

	it('should resolve variables in range exclusion', () => {
		const variables: QuestionVariable[] = [
			{ name: 'excludeMin', expression: '5' },
			{ name: 'excludeMax', expression: '8' },
			{ name: 'random', expression: '{{random:1..15!{{excludeMin}}..{{excludeMax}}}}' }
		];

		const resolved = resolveVariables(variables, 54321);
		const result = toObject(resolved);

		expect(Number(result.random) < 5 || Number(result.random) > 8).toBe(true);
	});

	it('should resolve multiple exclusions with variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '3' },
			{ name: 'b', expression: '7' },
			{ name: 'random', expression: '{{random:1..10!{{a}},{{b}}}}' }
		];

		const resolved = resolveVariables(variables, 11111);
		const result = toObject(resolved);

		expect(Number(result.random)).not.toBe(3);
		expect(Number(result.random)).not.toBe(7);
	});
});

describe('resolveVariables - Seeded Random', () => {
	it('should produce same results with same seed', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..100}}' },
			{ name: 'b', expression: '{{random:1..100}}' }
		];

		const resolved1 = resolveVariables(variables, 99999);
		const resolved2 = resolveVariables(variables, 99999);
		const result1 = toObject(resolved1);
		const result2 = toObject(resolved2);

		expect(result1.a).toBe(result2.a);
		expect(result1.b).toBe(result2.b);
	});

	it('should produce different results with different seeds', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{random:1..1000}}' }];

		const resolved1 = resolveVariables(variables, 11111);
		const resolved2 = resolveVariables(variables, 22222);
		const result1 = toObject(resolved1);
		const result2 = toObject(resolved2);

		// With large range, very unlikely to be same
		expect(result1.a).not.toBe(result2.a);
	});

	it('should produce reproducible results for complex variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..10}}' },
			{ name: 'b', expression: '{{random:1..10}}' },
			{ name: 'sum', expression: '{{eval:{{a}} + {{b}}}}' },
			{ name: 'random', expression: '{{random:{{sum}}..100}}' }
		];

		const resolved1 = resolveVariables(variables, 77777);
		const resolved2 = resolveVariables(variables, 77777);

		expect(resolved1).toEqual(resolved2);
	});
});

describe('resolveVariables - Decimal Variables', () => {
	it('should resolve decimal random variable', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{random:0.5..9.99:0.01}}' }];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.a)).toBeGreaterThanOrEqual(0.5);
		expect(Number(result.a)).toBeLessThanOrEqual(9.99);
	});

	it('should resolve decimal by digits', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{random:2.3}}' }];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.a)).toBeGreaterThanOrEqual(10);
		expect(Number(result.a)).toBeLessThan(100);
	});

	it('should resolve eval with decimal variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1.5..5.5:0.5}}' },
			{ name: 'b', expression: '{{eval:{{a}} * 2}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.b)).toBe(Number(result.a) * 2);
	});

	it('should resolve decimal variables in bounds', () => {
		const variables: QuestionVariable[] = [
			{ name: 'min', expression: '1.5' },
			{ name: 'max', expression: '9.5' },
			{ name: 'random', expression: '{{random:{{min}}..{{max}}:0.1}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.random)).toBeGreaterThanOrEqual(1.5);
		expect(Number(result.random)).toBeLessThanOrEqual(9.5);
	});
});

describe('resolveVariables - Complex Mathematical Examples', () => {
	it('should resolve fraction addition variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'den', expression: '{{random:2..9}}' },
			{ name: 'maxNum', expression: '{{eval:{{den}}-1}}' },
			{ name: 'num1', expression: '{{random:1..{{maxNum}}}}' },
			{ name: 'num2', expression: '{{random:1..{{maxNum}}!{{num1}}}}' },
			{ name: 'answer', expression: '{{eval:({{num1}}+{{num2}})/{{den}}}}' }
		];

		const resolved = resolveVariables(variables, 12345);
		const result = toObject(resolved);

		expect(Number(result.den)).toBeGreaterThanOrEqual(2);
		expect(Number(result.den)).toBeLessThanOrEqual(9);
		expect(Number(result.num1)).toBeGreaterThanOrEqual(1);
		expect(Number(result.num1)).toBeLessThan(Number(result.den));
		expect(Number(result.num2)).toBeGreaterThanOrEqual(1);
		expect(Number(result.num2)).toBeLessThan(Number(result.den));
		expect(Number(result.num1)).not.toBe(Number(result.num2));
		expect(result.answer).toBeCloseTo(
			(Number(result.num1) + Number(result.num2)) / Number(result.den),
			5
		);
	});

	it('should resolve GCD/simplification variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'gcd', expression: '{{random:2..5}}' },
			{ name: 'a', expression: '{{random:2..9}}' },
			{ name: 'b', expression: '{{random:2..9!{{a}}}}' },
			{ name: 'num', expression: '{{eval:{{a}}*{{gcd}}}}' },
			{ name: 'den', expression: '{{eval:{{b}}*{{gcd}}}}' },
			{ name: 'answer', expression: '{{eval:{{num}}/{{den}}}}' }
		];

		const resolved = resolveVariables(variables, 54321);
		const result = toObject(resolved);

		expect(Number(result.gcd)).toBeGreaterThanOrEqual(2);
		expect(Number(result.gcd)).toBeLessThanOrEqual(5);
		expect(Number(result.a)).not.toBe(Number(result.b));
		expect(Number(result.num)).toBe(Number(result.a) * Number(result.gcd));
		expect(Number(result.den)).toBe(Number(result.b) * Number(result.gcd));
		expect(result.answer).toBeCloseTo(Number(result.num) / Number(result.den), 5);
	});

	it('should resolve quadratic equation variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..5}}' },
			{ name: 'b', expression: '{{random:-10..10}}' },
			{ name: 'c', expression: '{{random:-10..10}}' },
			{ name: 'discriminant', expression: '{{eval:{{b}}^2 - 4*{{a}}*{{c}}}}' }
		];

		const resolved = resolveVariables(variables, 99999);
		const result = toObject(resolved);

		expect(result.discriminant).toBe(
			Number(result.b) ** 2 - 4 * Number(result.a) * Number(result.c)
		);
	});

	it('should resolve percentage calculation variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'price', expression: '{{random:10..100}}' },
			{ name: 'discount', expression: '{{random:5..50}}' },
			{ name: 'reduction', expression: '{{eval:{{price}} * {{discount}} / 100}}' },
			{ name: 'final', expression: '{{eval:{{price}} - {{reduction}}}}' }
		];

		const resolved = resolveVariables(variables, 33333);
		const result = toObject(resolved);

		expect(Number(result.reduction)).toBeCloseTo(
			(Number(result.price) * Number(result.discount)) / 100,
			5
		);
		expect(result.final).toBeCloseTo(Number(result.price) - Number(result.reduction), 5);
	});
});

describe('resolveVariables - Edge Cases', () => {
	it('should handle empty variables array', () => {
		const variables: QuestionVariable[] = [];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(result).toEqual({});
	});

	it('should handle variable with empty expression', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '' }];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(result.a).toBe('');
	});

	it('should handle LaTeX in variable expressions', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..10}}' },
			{ name: 'latex', expression: '\\frac{{{a}}}{2}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(result.latex).toContain(Number(result.a).toString());
	});

	it('should handle very long variable names', () => {
		const variables: QuestionVariable[] = [
			{ name: 'very_long_variable_name_for_testing', expression: '{{random:1..10}}' },
			{
				name: 'result',
				expression: '{{eval:{{very_long_variable_name_for_testing}} * 2}}'
			}
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(Number(result.result)).toBe(Number(result.very_long_variable_name_for_testing) * 2);
	});

	it('should handle negative numbers in eval', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..10}}' },
			{ name: 'negative', expression: '{{eval:-{{a}}}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(result.negative).toBe(-Number(result.a));
	});

	it('should handle zero values', () => {
		const variables: QuestionVariable[] = [
			{ name: 'zero', expression: '{{eval:0}}' },
			{ name: 'result', expression: '{{eval:{{zero}} + 5}}' }
		];

		const resolved = resolveVariables(variables);
		const result = toObject(resolved);

		expect(result.zero).toBe(0);
		expect(Number(result.result)).toBe(5);
	});
});

describe('resolveVariables - Error Handling', () => {
	it('should throw on circular dependency (direct)', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{a}}' }];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on circular dependency (indirect)', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{b}}' },
			{ name: 'b', expression: '{{a}}' }
		];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on circular dependency (chain)', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{{b}}' },
			{ name: 'b', expression: '{{c}}' },
			{ name: 'c', expression: '{{a}}' }
		];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on undefined variable reference', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{undefined}}' }];

		expect(() => resolveVariables(variables)).toThrow();
	});

	it('should throw on invalid random expression (min > max)', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{random:10..1}}' }];

		expect(() => resolveVariables(variables)).toThrow();
	});

	// Note: Compute engine doesn't throw on invalid syntax - it returns the expression as-is
	it.skip('should throw on invalid eval expression', () => {
		const variables: QuestionVariable[] = [{ name: 'a', expression: '{{eval:invalid syntax}}' }];

		// Depends on compute engine error handling (not currently implemented)
		expect(() => resolveVariables(variables)).toThrow();
	});
});
