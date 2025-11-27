/**
 * Validation Rule Evaluator - Unit Tests
 * =======================================
 *
 * Comprehensive tests for:
 * 1. Individual rule evaluators (divisor, multiple, range, etc.)
 * 2. Combined rule evaluation
 * 3. Expression resolution with variables
 * 4. Number theory helpers
 * 5. Edge cases and error handling
 */

import { describe, it, expect } from 'vitest';
import {
	evaluateRule,
	evaluateRules,
	createEvaluationContext,
	numberTheory,
	type EvaluationContext
} from '../validation-rule-evaluator';
import type {
	ValidationRule,
	DivisorRule,
	MultipleRule,
	RangeRule,
	EquationRootRule,
	EquivalenceRule,
	PredicateRule,
	CustomExpressionRule
} from '../types';

// ============================================================================
// DIVISOR RULE TESTS
// ============================================================================

describe('DivisorRule evaluation', () => {
	it('returns valid when answer divides dividend evenly', () => {
		const rule: DivisorRule = { type: 'divisor', dividend: '12' };
		const context: EvaluationContext = { variables: {}, answer: '3' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('returns invalid when answer does not divide dividend', () => {
		const rule: DivisorRule = { type: 'divisor', dividend: '12' };
		const context: EvaluationContext = { variables: {}, answer: '5' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('does not divide');
	});

	it('resolves variable references in dividend', () => {
		const rule: DivisorRule = { type: 'divisor', dividend: '{{n}}' };
		const context: EvaluationContext = { variables: { n: 20 }, answer: '4' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('returns invalid for zero divisor', () => {
		const rule: DivisorRule = { type: 'divisor', dividend: '12' };
		const context: EvaluationContext = { variables: {}, answer: '0' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('Zero cannot be a divisor');
	});

	it('returns invalid for non-integer divisor', () => {
		const rule: DivisorRule = { type: 'divisor', dividend: '12' };
		const context: EvaluationContext = { variables: {}, answer: '2.5' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('integer');
	});

	it('returns invalid for non-numeric answer', () => {
		const rule: DivisorRule = { type: 'divisor', dividend: '12' };
		const context: EvaluationContext = { variables: {}, answer: 'abc' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('Invalid numeric answer');
	});

	it('uses numericAnswer when provided', () => {
		const rule: DivisorRule = { type: 'divisor', dividend: '12' };
		const context: EvaluationContext = {
			variables: {},
			answer: '3 units',
			numericAnswer: 3
		};

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});
});

// ============================================================================
// MULTIPLE RULE TESTS
// ============================================================================

describe('MultipleRule evaluation', () => {
	it('returns valid when answer is multiple of base', () => {
		const rule: MultipleRule = { type: 'multiple', base: '5' };
		const context: EvaluationContext = { variables: {}, answer: '15' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('returns invalid when answer is not multiple of base', () => {
		const rule: MultipleRule = { type: 'multiple', base: '5' };
		const context: EvaluationContext = { variables: {}, answer: '17' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('not a multiple');
	});

	it('resolves variable references in base', () => {
		const rule: MultipleRule = { type: 'multiple', base: '{{b}}' };
		const context: EvaluationContext = { variables: { b: 7 }, answer: '21' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('returns invalid when base is zero', () => {
		const rule: MultipleRule = { type: 'multiple', base: '0' };
		const context: EvaluationContext = { variables: {}, answer: '10' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('Base cannot be zero');
	});

	it('handles zero as valid multiple', () => {
		const rule: MultipleRule = { type: 'multiple', base: '5' };
		const context: EvaluationContext = { variables: {}, answer: '0' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true); // 0 is multiple of any non-zero number
	});

	it('handles negative multiples', () => {
		const rule: MultipleRule = { type: 'multiple', base: '5' };
		const context: EvaluationContext = { variables: {}, answer: '-15' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});
});

// ============================================================================
// RANGE RULE TESTS
// ============================================================================

describe('RangeRule evaluation', () => {
	it('returns valid when answer is within inclusive range', () => {
		const rule: RangeRule = { type: 'range', min: '1', max: '10', inclusive: true };
		const context: EvaluationContext = { variables: {}, answer: '5' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('returns valid for boundary values with inclusive range', () => {
		const rule: RangeRule = { type: 'range', min: '1', max: '10', inclusive: true };

		expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(true);
		expect(evaluateRule(rule, { variables: {}, answer: '10' }).valid).toBe(true);
	});

	it('returns invalid for boundary values with exclusive range', () => {
		const rule: RangeRule = { type: 'range', min: '1', max: '10', inclusive: false };

		expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(false);
		expect(evaluateRule(rule, { variables: {}, answer: '10' }).valid).toBe(false);
	});

	it('returns invalid when answer is outside range', () => {
		const rule: RangeRule = { type: 'range', min: '1', max: '10' };
		const context: EvaluationContext = { variables: {}, answer: '15' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('not in range');
	});

	it('resolves variable references in min and max', () => {
		const rule: RangeRule = { type: 'range', min: '{{minVal}}', max: '{{maxVal}}' };
		const context: EvaluationContext = {
			variables: { minVal: 5, maxVal: 20 },
			answer: '15'
		};

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('defaults to inclusive when not specified', () => {
		const rule: RangeRule = { type: 'range', min: '1', max: '10' };

		expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(true);
		expect(evaluateRule(rule, { variables: {}, answer: '10' }).valid).toBe(true);
	});

	it('handles decimal values in range', () => {
		const rule: RangeRule = { type: 'range', min: '0.5', max: '2.5' };
		const context: EvaluationContext = { variables: {}, answer: '1.7' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});
});

// ============================================================================
// EQUATION ROOT RULE TESTS
// ============================================================================

describe('EquationRootRule evaluation', () => {
	it('validates root of simple linear equation', () => {
		const rule: EquationRootRule = { type: 'equation_root', equation: 'x + 3 = 10' };
		const context: EvaluationContext = { variables: {}, answer: '7' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('validates root of quadratic equation', () => {
		const rule: EquationRootRule = { type: 'equation_root', equation: 'x^2 - 4 = 0' };

		expect(evaluateRule(rule, { variables: {}, answer: '2' }).valid).toBe(true);
		expect(evaluateRule(rule, { variables: {}, answer: '-2' }).valid).toBe(true);
	});

	it('returns invalid for non-root', () => {
		const rule: EquationRootRule = { type: 'equation_root', equation: 'x + 3 = 10' };
		const context: EvaluationContext = { variables: {}, answer: '5' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('not a root');
	});

	it('resolves variables in equation', () => {
		const rule: EquationRootRule = {
			type: 'equation_root',
			equation: 'x + {{a}} = {{b}}'
		};
		const context: EvaluationContext = { variables: { a: 5, b: 12 }, answer: '7' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('uses custom variable name', () => {
		const rule: EquationRootRule = {
			type: 'equation_root',
			equation: 'y * 2 = 10',
			variable: 'y'
		};
		const context: EvaluationContext = { variables: {}, answer: '5' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('defaults to variable x when not specified', () => {
		const rule: EquationRootRule = { type: 'equation_root', equation: 'x * 3 = 12' };
		const context: EvaluationContext = { variables: {}, answer: '4' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});
});

// ============================================================================
// EQUIVALENCE RULE TESTS
// ============================================================================

describe('EquivalenceRule evaluation', () => {
	it('validates equivalent numeric expressions', () => {
		const rule: EquivalenceRule = { type: 'equivalent', expression: '10 / 2' };
		const context: EvaluationContext = { variables: {}, answer: '5' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('resolves variables in expression', () => {
		const rule: EquivalenceRule = { type: 'equivalent', expression: '{{a}} * {{b}}' };
		const context: EvaluationContext = { variables: { a: 3, b: 4 }, answer: '12' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('returns invalid for non-equivalent values', () => {
		const rule: EquivalenceRule = { type: 'equivalent', expression: '10' };
		const context: EvaluationContext = { variables: {}, answer: '11' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false);
	});

	it('handles fractions', () => {
		const rule: EquivalenceRule = { type: 'equivalent', expression: '1/2' };
		const context: EvaluationContext = { variables: {}, answer: '0.5' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});
});

// ============================================================================
// PREDICATE RULE TESTS
// ============================================================================

describe('PredicateRule evaluation', () => {
	describe('isPrime predicate', () => {
		it('returns valid for prime numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isPrime' };

			expect(evaluateRule(rule, { variables: {}, answer: '2' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '3' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '7' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '97' }).valid).toBe(true);
		});

		it('returns invalid for non-prime numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isPrime' };

			expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '4' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '9' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '100' }).valid).toBe(false);
		});

		it('returns invalid for 0 and negative numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isPrime' };

			expect(evaluateRule(rule, { variables: {}, answer: '0' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '-7' }).valid).toBe(false);
		});
	});

	describe('isComposite predicate', () => {
		it('returns valid for composite numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isComposite' };

			expect(evaluateRule(rule, { variables: {}, answer: '4' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '6' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '100' }).valid).toBe(true);
		});

		it('returns invalid for prime numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isComposite' };

			expect(evaluateRule(rule, { variables: {}, answer: '2' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '7' }).valid).toBe(false);
		});

		it('returns invalid for 0 and 1', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isComposite' };

			expect(evaluateRule(rule, { variables: {}, answer: '0' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(false);
		});
	});

	describe('isEven predicate', () => {
		it('returns valid for even numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isEven' };

			expect(evaluateRule(rule, { variables: {}, answer: '0' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '2' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '-4' }).valid).toBe(true);
		});

		it('returns invalid for odd numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isEven' };

			expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '3' }).valid).toBe(false);
		});
	});

	describe('isOdd predicate', () => {
		it('returns valid for odd numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isOdd' };

			expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '3' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '-5' }).valid).toBe(true);
		});

		it('returns invalid for even numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isOdd' };

			expect(evaluateRule(rule, { variables: {}, answer: '0' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '2' }).valid).toBe(false);
		});
	});

	describe('isPositive predicate', () => {
		it('returns valid for positive numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isPositive' };

			expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '0.5' }).valid).toBe(true);
		});

		it('returns invalid for zero and negative numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isPositive' };

			expect(evaluateRule(rule, { variables: {}, answer: '0' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '-1' }).valid).toBe(false);
		});
	});

	describe('isNegative predicate', () => {
		it('returns valid for negative numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isNegative' };

			expect(evaluateRule(rule, { variables: {}, answer: '-1' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '-0.5' }).valid).toBe(true);
		});

		it('returns invalid for zero and positive numbers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isNegative' };

			expect(evaluateRule(rule, { variables: {}, answer: '0' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '1' }).valid).toBe(false);
		});
	});

	describe('isInteger predicate', () => {
		it('returns valid for integers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isInteger' };

			expect(evaluateRule(rule, { variables: {}, answer: '5' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '-3' }).valid).toBe(true);
			expect(evaluateRule(rule, { variables: {}, answer: '0' }).valid).toBe(true);
		});

		it('returns invalid for non-integers', () => {
			const rule: PredicateRule = { type: 'predicate', predicate: 'isInteger' };

			expect(evaluateRule(rule, { variables: {}, answer: '3.14' }).valid).toBe(false);
			expect(evaluateRule(rule, { variables: {}, answer: '0.5' }).valid).toBe(false);
		});
	});
});

// ============================================================================
// CUSTOM EXPRESSION RULE TESTS
// ============================================================================

describe('CustomExpressionRule evaluation', () => {
	it('evaluates gcd comparison', () => {
		const rule: CustomExpressionRule = {
			type: 'custom',
			expression: 'gcd(answer, {{n}}) > 1',
			description: 'Answer shares a factor with n'
		};
		const context: EvaluationContext = { variables: { n: 12 }, answer: '6' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true); // gcd(6, 12) = 6 > 1
	});

	it('evaluates modulo comparison', () => {
		const rule: CustomExpressionRule = {
			type: 'custom',
			expression: 'answer % {{n}} == 0'
		};
		const context: EvaluationContext = { variables: { n: 5 }, answer: '15' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('evaluates inequality comparison', () => {
		const rule: CustomExpressionRule = {
			type: 'custom',
			expression: 'answer < {{max}}'
		};
		const context: EvaluationContext = { variables: { max: 100 }, answer: '50' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('returns invalid when condition fails', () => {
		const rule: CustomExpressionRule = {
			type: 'custom',
			expression: 'gcd(answer, {{n}}) == 1',
			description: 'Answer coprime with n'
		};
		const context: EvaluationContext = { variables: { n: 12 }, answer: '6' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(false); // gcd(6, 12) = 6, not 1
	});
});

// ============================================================================
// COMBINED RULES TESTS
// ============================================================================

describe('evaluateRules (multiple rules)', () => {
	it('returns valid when all rules pass', () => {
		const rules: ValidationRule[] = [
			{ type: 'range', min: '1', max: '100' },
			{ type: 'predicate', predicate: 'isPositive' },
			{ type: 'predicate', predicate: 'isInteger' }
		];
		const context: EvaluationContext = { variables: {}, answer: '50' };

		const result = evaluateRules(rules, context);
		expect(result.valid).toBe(true);
	});

	it('returns invalid when any rule fails', () => {
		const rules: ValidationRule[] = [
			{ type: 'range', min: '1', max: '100' },
			{ type: 'predicate', predicate: 'isPrime' }
		];
		const context: EvaluationContext = { variables: {}, answer: '50' }; // Not prime

		const result = evaluateRules(rules, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('not prime');
	});

	it('returns valid for empty rules array', () => {
		const result = evaluateRules([], { variables: {}, answer: '42' });
		expect(result.valid).toBe(true);
	});

	it('combines all failure reasons', () => {
		const rules: ValidationRule[] = [
			{ type: 'range', min: '100', max: '200' },
			{ type: 'predicate', predicate: 'isNegative' }
		];
		const context: EvaluationContext = { variables: {}, answer: '50' };

		const result = evaluateRules(rules, context);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('not in range');
		expect(result.reason).toContain('not negative');
	});
});

// ============================================================================
// CREATE EVALUATION CONTEXT TESTS
// ============================================================================

describe('createEvaluationContext', () => {
	it('creates context from resolved variables', () => {
		const resolved = [
			{ name: 'a', value: '5' },
			{ name: 'b', value: '10' }
		];
		const context = createEvaluationContext(resolved, '15');

		expect(context.variables.a).toBe(5);
		expect(context.variables.b).toBe(10);
		expect(context.answer).toBe('15');
		expect(context.numericAnswer).toBe(15);
	});

	it('keeps string values that are not numbers', () => {
		const resolved = [{ name: 'color', value: 'red' }];
		const context = createEvaluationContext(resolved, 'blue');

		expect(context.variables.color).toBe('red');
		expect(context.answer).toBe('blue');
		expect(context.numericAnswer).toBeUndefined();
	});

	it('handles numeric string answer', () => {
		const context = createEvaluationContext([], '3.14');
		expect(context.numericAnswer).toBeCloseTo(3.14);
	});
});

// ============================================================================
// NUMBER THEORY HELPERS TESTS
// ============================================================================

describe('numberTheory helpers', () => {
	describe('isPrime', () => {
		it('correctly identifies primes', () => {
			expect(numberTheory.isPrime(2)).toBe(true);
			expect(numberTheory.isPrime(3)).toBe(true);
			expect(numberTheory.isPrime(5)).toBe(true);
			expect(numberTheory.isPrime(7)).toBe(true);
			expect(numberTheory.isPrime(11)).toBe(true);
			expect(numberTheory.isPrime(13)).toBe(true);
			expect(numberTheory.isPrime(97)).toBe(true);
		});

		it('correctly rejects non-primes', () => {
			expect(numberTheory.isPrime(0)).toBe(false);
			expect(numberTheory.isPrime(1)).toBe(false);
			expect(numberTheory.isPrime(4)).toBe(false);
			expect(numberTheory.isPrime(6)).toBe(false);
			expect(numberTheory.isPrime(8)).toBe(false);
			expect(numberTheory.isPrime(9)).toBe(false);
			expect(numberTheory.isPrime(100)).toBe(false);
		});

		it('rejects non-integers', () => {
			expect(numberTheory.isPrime(2.5)).toBe(false);
			expect(numberTheory.isPrime(7.1)).toBe(false);
		});
	});

	describe('gcd', () => {
		it('calculates greatest common divisor', () => {
			expect(numberTheory.gcd(12, 8)).toBe(4);
			expect(numberTheory.gcd(15, 25)).toBe(5);
			expect(numberTheory.gcd(17, 13)).toBe(1);
			expect(numberTheory.gcd(100, 80)).toBe(20);
		});

		it('handles zero', () => {
			expect(numberTheory.gcd(5, 0)).toBe(5);
			expect(numberTheory.gcd(0, 5)).toBe(5);
		});
	});

	describe('lcm', () => {
		it('calculates least common multiple', () => {
			expect(numberTheory.lcm(4, 6)).toBe(12);
			expect(numberTheory.lcm(3, 5)).toBe(15);
			expect(numberTheory.lcm(7, 7)).toBe(7);
		});

		it('handles zero', () => {
			expect(numberTheory.lcm(0, 5)).toBe(0);
			expect(numberTheory.lcm(5, 0)).toBe(0);
		});
	});

	describe('isEven and isOdd', () => {
		it('correctly identifies even numbers', () => {
			expect(numberTheory.isEven(0)).toBe(true);
			expect(numberTheory.isEven(2)).toBe(true);
			expect(numberTheory.isEven(-4)).toBe(true);
			expect(numberTheory.isEven(100)).toBe(true);
		});

		it('correctly identifies odd numbers', () => {
			expect(numberTheory.isOdd(1)).toBe(true);
			expect(numberTheory.isOdd(-3)).toBe(true);
			expect(numberTheory.isOdd(99)).toBe(true);
		});

		it('rejects non-integers', () => {
			expect(numberTheory.isEven(2.5)).toBe(false);
			expect(numberTheory.isOdd(3.5)).toBe(false);
		});
	});
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('Edge cases and error handling', () => {
	it('handles expression with multiple variable references', () => {
		const rule: EquivalenceRule = {
			type: 'equivalent',
			expression: '{{a}} + {{b}} + {{c}}'
		};
		const context: EvaluationContext = {
			variables: { a: 1, b: 2, c: 3 },
			answer: '6'
		};

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('handles expressions with mathematical operations', () => {
		const rule: EquivalenceRule = {
			type: 'equivalent',
			expression: '{{a}} * {{a}}'
		};
		const context: EvaluationContext = { variables: { a: 5 }, answer: '25' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});

	it('provides debug info in result', () => {
		const rule: DivisorRule = { type: 'divisor', dividend: '{{n}}' };
		const context: EvaluationContext = { variables: { n: 12 }, answer: '3' };

		const result = evaluateRule(rule, context);
		expect(result.debug).toBeDefined();
		expect(result.debug?.dividend).toBe(12);
		expect(result.debug?.answer).toBe(3);
	});

	it('handles whitespace in answer', () => {
		const rule: PredicateRule = { type: 'predicate', predicate: 'isPrime' };
		const context: EvaluationContext = { variables: {}, answer: ' 7 ' };

		const result = evaluateRule(rule, context);
		expect(result.valid).toBe(true);
	});
});
