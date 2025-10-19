/**
 * Circular Dependency Detector Tests
 * ====================================
 *
 * Tests for detecting circular variable dependencies using DFS algorithm.
 */

import { describe, it, expect } from 'vitest';
import { detectCircularDependencies } from './circular-dependency';
import type { QuestionVariable } from '../types';

describe('detectCircularDependencies - No Dependencies', () => {
	it('should pass with no variables', () => {
		const variables: QuestionVariable[] = [];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
		expect(result.cycle).toBeUndefined();
	});

	it('should pass with single variable (no reference)', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass with independent variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{#:1-10}' },
			{ name: 'c', expression: '{#:1-10}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass with literal values', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '5' },
			{ name: 'b', expression: '10' },
			{ name: 'c', expression: '15' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});
});

describe('detectCircularDependencies - Valid Dependencies', () => {
	it('should pass with simple chain: a → b', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass with chain: a → b → c', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:b}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass with multiple chains', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{#:1-10}' },
			{ name: 'd', expression: '{@:c}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass with variable in eval', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{eval:{@:a} * 2}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass with variable in random bounds', () => {
		const variables: QuestionVariable[] = [
			{ name: 'min', expression: '5' },
			{ name: 'max', expression: '15' },
			{ name: 'random', expression: '{#:{@:min}-{@:max}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass with multiple variables in one expression', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{#:1-10}' },
			{ name: 'sum', expression: '{eval:{@:a} + {@:b}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass with deep chain: a → b → c → d → e', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:b}' },
			{ name: 'd', expression: '{@:c}' },
			{ name: 'e', expression: '{@:d}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});
});

describe('detectCircularDependencies - Direct Cycles', () => {
	it('should detect self-reference: a → a', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
		expect(result.cycle).toEqual(['a', 'a']);
	});

	it('should detect two-way cycle: a → b → a', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
		expect(result.cycle).toBeDefined();
		expect(result.cycle!.length).toBeGreaterThanOrEqual(3);
	});

	it('should detect three-way cycle: a → b → c → a', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:c}' },
			{ name: 'c', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
		expect(result.cycle).toBeDefined();
	});

	it('should detect four-way cycle: a → b → c → d → a', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:c}' },
			{ name: 'c', expression: '{@:d}' },
			{ name: 'd', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
		expect(result.cycle).toBeDefined();
	});
});

describe('detectCircularDependencies - Complex Cycles', () => {
	it('should detect cycle in eval expression', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{eval:{@:b} + 1}' },
			{ name: 'b', expression: '{eval:{@:a} * 2}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});

	it('should detect cycle in random bounds', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-{@:b}}' },
			{ name: 'b', expression: '{#:1-{@:a}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});

	it('should detect cycle with multiple references in one expression', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{eval:{@:b} + {@:c}}' },
			{ name: 'b', expression: '{@:c}' },
			{ name: 'c', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});

	it('should detect cycle in mixed environment', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:d}' },
			{ name: 'd', expression: '{@:c}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
		// Cycle should be between c and d
		expect(result.cycle).toBeDefined();
	});

	it('should detect cycle with long chain before it', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:b}' },
			{ name: 'd', expression: '{@:e}' },
			{ name: 'e', expression: '{@:d}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});
});

describe('detectCircularDependencies - Indirect Cycles', () => {
	it('should detect indirect cycle: a → b, b → c, c → a', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:{@:b}-10}' },
			{ name: 'b', expression: '{eval:{@:c} + 5}' },
			{ name: 'c', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});

	it('should detect cycle in diamond pattern', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:c}' },
			{ name: 'c', expression: '{@:d}' },
			{ name: 'd', expression: '{@:b}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});

	it('should detect cycle when variable references multiple variables that form cycle', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{eval:{@:c} + {@:d}}' },
			{ name: 'c', expression: '{@:d}' },
			{ name: 'd', expression: '{@:b}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});
});

describe('detectCircularDependencies - Real-World Examples', () => {
	it('should pass valid fraction addition variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'den', expression: '{#:2-9}' },
			{ name: 'num1', expression: '{#:1-{@:den}-1}' },
			{ name: 'num2', expression: '{#:1-{@:den}-1!{@:num1}}' },
			{ name: 'answer', expression: '{eval:({@:num1}+{@:num2})/{@:den}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass valid GCD simplification variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'gcd', expression: '{#:2-5}' },
			{ name: 'a', expression: '{#:2-9}' },
			{ name: 'b', expression: '{#:2-9!{@:a}}' },
			{ name: 'num', expression: '{eval:{@:a}*{@:gcd}}' },
			{ name: 'den', expression: '{eval:{@:b}*{@:gcd}}' },
			{ name: 'answer', expression: '{eval:{@:num}/{@:den}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass valid quadratic equation variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-5}' },
			{ name: 'b', expression: '{#:-10-10}' },
			{ name: 'c', expression: '{#:-10-10}' },
			{ name: 'discriminant', expression: '{eval:{@:b}^2 - 4*{@:a}*{@:c}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should pass valid percentage calculation variables', () => {
		const variables: QuestionVariable[] = [
			{ name: 'price', expression: '{#:50-200}' },
			{ name: 'discount', expression: '{#:10-50}' },
			{ name: 'reduction', expression: '{eval:{@:price} * {@:discount} / 100}' },
			{ name: 'final', expression: '{eval:{@:price} - {@:reduction}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});
});

describe('detectCircularDependencies - Edge Cases', () => {
	it('should handle variable reference in exclusion', () => {
		const variables: QuestionVariable[] = [
			{ name: 'exclude', expression: '{#:1-10}' },
			{ name: 'random', expression: '{#:1-20!{@:exclude}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should detect cycle in exclusion reference', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10!{@:b}}' },
			{ name: 'b', expression: '{#:1-10!{@:a}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});

	it('should handle variable with multiple references to same variable', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{eval:{@:a} + {@:a} + {@:a}}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should handle empty expression', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should handle expression with no variable references', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: 'Just a literal string with {@:} malformed' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should handle very long chain without cycle', () => {
		const variables: QuestionVariable[] = Array.from({ length: 50 }, (_, i) => ({
			name: `var${i}`,
			expression: i === 0 ? '{#:1-10}' : `{@:var${i - 1}}`
		}));

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(false);
	});

	it('should handle cycle at end of long chain', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:b}' },
			{ name: 'd', expression: '{@:c}' },
			{ name: 'e', expression: '{@:d}' },
			{ name: 'f', expression: '{@:c}' }
		];

		const result = detectCircularDependencies(variables);

		// Should pass - f depends on c but c doesn't depend on f
		expect(result.hasCircularDependency).toBe(false);
	});

	it('should detect cycle created by adding last variable', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:b}' },
			{ name: 'd', expression: '{@:c}' },
			{ name: 'e', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		// Should pass - all depend on a, but a doesn't depend on anything
		expect(result.hasCircularDependency).toBe(false);
	});

	it('should detect actual cycle in long chain', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{#:1-10}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:b}' },
			{ name: 'd', expression: '{@:c}' },
			{ name: 'e', expression: '{@:b}' }
		];

		const result = detectCircularDependencies(variables);

		// Should pass - e depends on b, but b doesn't depend on e
		expect(result.hasCircularDependency).toBe(false);
	});

	it('should detect cycle when last variable closes loop', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:e}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:b}' },
			{ name: 'd', expression: '{@:c}' },
			{ name: 'e', expression: '{@:d}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
	});
});

describe('detectCircularDependencies - Cycle Path Accuracy', () => {
	it('should return accurate cycle path for simple cycle', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
		expect(result.cycle).toBeDefined();

		// Cycle should show a → b → a or b → a → b
		const cycleStr = result.cycle!.join(' → ');
		expect(
			cycleStr === 'a → b → a' ||
			cycleStr === 'b → a → b'
		).toBe(true);
	});

	it('should return accurate cycle path for triangle', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:c}' },
			{ name: 'c', expression: '{@:a}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
		expect(result.cycle).toBeDefined();
		expect(result.cycle!.length).toBe(4); // a → b → c → a
	});

	it('should return first cycle found when multiple cycles exist', () => {
		const variables: QuestionVariable[] = [
			{ name: 'a', expression: '{@:b}' },
			{ name: 'b', expression: '{@:a}' },
			{ name: 'c', expression: '{@:d}' },
			{ name: 'd', expression: '{@:c}' }
		];

		const result = detectCircularDependencies(variables);

		expect(result.hasCircularDependency).toBe(true);
		expect(result.cycle).toBeDefined();
		// Should find one of the two cycles
	});
});
