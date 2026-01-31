/**
 * Tests for Exact Limit Evaluation
 *
 * Tests the exact arithmetic evaluation module that bridges normalizeExtended
 * with the limits module. Focuses on:
 * - Approach factor detection and substitution
 * - Exact vs numeric result comparison
 * - Indeterminate form detection
 */

import { describe, it, expect } from 'vitest';
import {
	evaluateLimitExact,
	tryEvaluateLimitExact,
	substituteApproachFactors,
	isZeroResult,
	isInfinityResult,
	isIndeterminateResult,
	getZeroSign,
	getInfinitySign,
	resultToNode,
	resultToNumber,
	resultToFiniteNode
} from '../exact-evaluation';
import { parseLatex } from '../../parser';
import { number, positiveInfinity } from '../../factory';
import { isNumber, isSignedZero, isInfinity as isInfinityNode } from '../../guards';

// =============================================================================
// Helper Functions
// =============================================================================

function expr(latex: string) {
	return parseLatex(latex);
}

// =============================================================================
// Approach Factor Substitution Tests
// =============================================================================

describe('substituteApproachFactors', () => {
	describe('(x - a) pattern', () => {
		it('replaces (x-2) with 0⁺ when approaching 2 from right', () => {
			const expression = expr('x-2');
			const result = substituteApproachFactors(expression, 'x', number('2'), 'right');

			expect(isSignedZero(result)).toBe(true);
			if (isSignedZero(result)) {
				expect(result.sign).toBe('positive');
			}
		});

		it('replaces (x-2) with 0⁻ when approaching 2 from left', () => {
			const expression = expr('x-2');
			const result = substituteApproachFactors(expression, 'x', number('2'), 'left');

			expect(isSignedZero(result)).toBe(true);
			if (isSignedZero(result)) {
				expect(result.sign).toBe('negative');
			}
		});

		it('does not replace (x-2) when direction is both', () => {
			const expression = expr('x-2');
			const result = substituteApproachFactors(expression, 'x', number('2'), 'both');

			// Should remain unchanged
			expect(isSignedZero(result)).toBe(false);
		});
	});

	describe('(a - x) pattern', () => {
		it('replaces (2-x) with 0⁻ when approaching 2 from right', () => {
			const expression = expr('2-x');
			const result = substituteApproachFactors(expression, 'x', number('2'), 'right');

			expect(isSignedZero(result)).toBe(true);
			if (isSignedZero(result)) {
				expect(result.sign).toBe('negative');
			}
		});

		it('replaces (2-x) with 0⁺ when approaching 2 from left', () => {
			const expression = expr('2-x');
			const result = substituteApproachFactors(expression, 'x', number('2'), 'left');

			expect(isSignedZero(result)).toBe(true);
			if (isSignedZero(result)) {
				expect(result.sign).toBe('positive');
			}
		});
	});

	describe('nested expressions', () => {
		it('replaces (x-2) in 1/(x-2) when approaching 2 from right', () => {
			const expression = expr('\\frac{1}{x-2}');
			const result = substituteApproachFactors(expression, 'x', number('2'), 'right');

			// The denominator should be replaced with 0⁺
			expect(result.type).toBe('division');
			if (result.type === 'division') {
				expect(isSignedZero(result.denominator)).toBe(true);
			}
		});
	});

	describe('non-matching patterns', () => {
		it('does not replace (x-3) when approaching 2', () => {
			const expression = expr('x-3');
			const result = substituteApproachFactors(expression, 'x', number('2'), 'right');

			// Should remain unchanged
			expect(isSignedZero(result)).toBe(false);
		});

		it('does not replace for infinity approach', () => {
			const expression = expr('x-2');
			const result = substituteApproachFactors(expression, 'x', positiveInfinity(), 'right');

			// Should remain unchanged
			expect(isSignedZero(result)).toBe(false);
		});
	});
});

// =============================================================================
// Evaluation Tests
// =============================================================================

describe('evaluateLimitExact', () => {
	describe('finite limits', () => {
		it('evaluates x+2 at x=3 to get 5', () => {
			const expression = expr('x+2');
			const result = evaluateLimitExact(expression, 'x', number('3'), 'both');

			expect(result.type).toBe('normal');
			const numValue = resultToNumber(result);
			expect(numValue).toBe(5);
		});

		it('evaluates 2*x at x=4 to get 8', () => {
			// Using multiplication instead of power (powers not yet supported)
			const expression = expr('2x');
			const result = evaluateLimitExact(expression, 'x', number('4'), 'both');

			expect(result.type).toBe('normal');
			const numValue = resultToNumber(result);
			expect(numValue).toBe(8);
		});

		it('returns null for x^2 (powers not yet supported)', () => {
			// Powers of normal forms are not yet implemented
			const expression = expr('x^2');
			const result = tryEvaluateLimitExact(expression, 'x', number('4'), 'both');

			// Should return null because power is not supported
			expect(result).toBeNull();
		});

		it('returns null for (x^2-4)/(x-2) (powers not yet supported)', () => {
			// Powers in numerator cause evaluation to fail
			const expression = expr('\\frac{x^2-4}{x-2}');
			const result = tryEvaluateLimitExact(expression, 'x', number('2'), 'both');

			// Should return null because power is not supported
			expect(result).toBeNull();
		});
	});

	describe('infinite limits', () => {
		it('evaluates 1/(x-2) at x→2⁺ to get +∞', () => {
			const expression = expr('\\frac{1}{x-2}');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

			expect(isInfinityResult(result)).toBe(true);
			expect(getInfinitySign(result)).toBe('positive');
		});

		it('evaluates 1/(x-2) at x→2⁻ to get -∞', () => {
			const expression = expr('\\frac{1}{x-2}');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'left');

			expect(isInfinityResult(result)).toBe(true);
			expect(getInfinitySign(result)).toBe('negative');
		});

		it('evaluates 1/(2-x) at x→2⁺ to get -∞', () => {
			const expression = expr('\\frac{1}{2-x}');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

			expect(isInfinityResult(result)).toBe(true);
			expect(getInfinitySign(result)).toBe('negative');
		});

		it('evaluates 1/(2-x) at x→2⁻ to get +∞', () => {
			const expression = expr('\\frac{1}{2-x}');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'left');

			expect(isInfinityResult(result)).toBe(true);
			expect(getInfinitySign(result)).toBe('positive');
		});
	});

	describe('zero limits with sign', () => {
		it('evaluates (x-2) at x→2⁺ to get 0⁺', () => {
			const expression = expr('x-2');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

			expect(result.type).toBe('signed-zero');
			expect(getZeroSign(result)).toBe('positive');
		});

		it('evaluates (x-2) at x→2⁻ to get 0⁻', () => {
			const expression = expr('x-2');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'left');

			expect(result.type).toBe('signed-zero');
			expect(getZeroSign(result)).toBe('negative');
		});
	});
});

// =============================================================================
// tryEvaluateLimitExact Tests
// =============================================================================

describe('tryEvaluateLimitExact', () => {
	it('returns null for expressions with unsupported operations (powers)', () => {
		// x^2 uses power which is not yet supported in normalizeExtended
		const expression = expr('x^2');
		const result = tryEvaluateLimitExact(expression, 'x', number('3'), 'both');

		// Should return null because power is not supported
		expect(result).toBeNull();
	});

	it('returns result for simple algebraic expressions', () => {
		// Simple expression without powers
		const expression = expr('2x+1');
		const result = tryEvaluateLimitExact(expression, 'x', number('3'), 'both');

		expect(result).not.toBeNull();
		if (result) {
			expect(result.type).toBe('normal');
			expect(resultToNumber(result)).toBe(7);
		}
	});

	it('returns result for division expressions', () => {
		const expression = expr('\\frac{x+2}{2}');
		const result = tryEvaluateLimitExact(expression, 'x', number('4'), 'both');

		expect(result).not.toBeNull();
		if (result) {
			expect(result.type).toBe('normal');
			// Note: resultToNumber might return null for fractions
			// that don't simplify to a simple number
			const node = resultToNode(result);
			expect(node).not.toBeNull();
		}
	});
});

// =============================================================================
// Result Conversion Tests
// =============================================================================

describe('resultToNode', () => {
	it('converts normal result to MathNode', () => {
		const expression = expr('2+3');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'both');

		const node = resultToNode(result);
		expect(node).not.toBeNull();
		if (node && isNumber(node)) {
			expect(parseFloat(node.value)).toBe(5);
		}
	});

	it('converts infinity result to InfinityNode', () => {
		const expression = expr('\\frac{1}{x-2}');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		const node = resultToNode(result);
		expect(node).not.toBeNull();
		expect(isInfinityNode(node!)).toBe(true);
	});

	it('returns null for indeterminate result', () => {
		const expression = expr('\\frac{x}{x}');
		// At x=0, this is 0/0
		const result = evaluateLimitExact(expression, 'x', number('0'), 'both');

		if (isIndeterminateResult(result)) {
			const node = resultToNode(result);
			expect(node).toBeNull();
		}
	});
});

describe('resultToFiniteNode', () => {
	it('converts signed zero to number 0', () => {
		const expression = expr('x-2');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		expect(result.type).toBe('signed-zero');

		const node = resultToFiniteNode(result);
		expect(node).not.toBeNull();
		if (node && isNumber(node)) {
			expect(node.value).toBe('0');
		}
	});

	it('returns null for infinity', () => {
		const expression = expr('\\frac{1}{x-2}');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		expect(isInfinityResult(result)).toBe(true);

		const node = resultToFiniteNode(result);
		expect(node).toBeNull();
	});
});

// =============================================================================
// Result Predicates Tests
// =============================================================================

describe('result predicates', () => {
	describe('isZeroResult', () => {
		it('returns true for signed zero', () => {
			const expression = expr('x-2');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

			expect(isZeroResult(result)).toBe(true);
		});

		it('returns true for normal zero', () => {
			const expression = expr('x-x');
			const result = evaluateLimitExact(expression, 'x', number('5'), 'both');

			expect(isZeroResult(result)).toBe(true);
		});

		it('returns false for non-zero', () => {
			const expression = expr('x+1');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'both');

			expect(isZeroResult(result)).toBe(false);
		});
	});

	describe('isInfinityResult', () => {
		it('returns true for positive infinity', () => {
			const expression = expr('\\frac{1}{x-2}');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

			expect(isInfinityResult(result)).toBe(true);
		});

		it('returns true for negative infinity', () => {
			const expression = expr('\\frac{1}{x-2}');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'left');

			expect(isInfinityResult(result)).toBe(true);
		});

		it('returns false for finite value', () => {
			const expression = expr('x+1');
			const result = evaluateLimitExact(expression, 'x', number('2'), 'both');

			expect(isInfinityResult(result)).toBe(false);
		});
	});
});

// =============================================================================
// Additional Edge Cases
// =============================================================================

describe('Edge Cases: Negative Numbers', () => {
	it('evaluates x+2 at x=-3 to get -1', () => {
		const expression = expr('x+2');
		const result = evaluateLimitExact(expression, 'x', number('-3'), 'both');

		expect(result.type).toBe('normal');
		expect(resultToNumber(result)).toBe(-1);
	});

	it('evaluates -x at x=5 to get -5', () => {
		const expression = expr('-x');
		const result = evaluateLimitExact(expression, 'x', number('5'), 'both');

		expect(result.type).toBe('normal');
		expect(resultToNumber(result)).toBe(-5);
	});

	it('evaluates 1/(x+3) at x→-3⁺ to get +∞', () => {
		const expression = expr('\\frac{1}{x+3}');
		const result = evaluateLimitExact(expression, 'x', number('-3'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});

	it('evaluates 1/(x+3) at x→-3⁻ to get -∞', () => {
		const expression = expr('\\frac{1}{x+3}');
		const result = evaluateLimitExact(expression, 'x', number('-3'), 'left');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('negative');
	});

	it('evaluates -1/(x-2) at x→2⁺ to get -∞', () => {
		const expression = expr('\\frac{-1}{x-2}');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('negative');
	});

	it('evaluates -1/(x-2) at x→2⁻ to get +∞', () => {
		const expression = expr('\\frac{-1}{x-2}');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'left');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});
});

describe('Edge Cases: Zero Approach', () => {
	it('evaluates 1/x at x→0⁺ to get +∞', () => {
		const expression = expr('\\frac{1}{x}');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});

	it('evaluates 1/x at x→0⁻ to get -∞', () => {
		const expression = expr('\\frac{1}{x}');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'left');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('negative');
	});

	it('evaluates -1/x at x→0⁺ to get -∞', () => {
		const expression = expr('\\frac{-1}{x}');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('negative');
	});

	it('evaluates x at x→0⁺ to get 0⁺', () => {
		const expression = expr('x');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'right');

		expect(result.type).toBe('signed-zero');
		expect(getZeroSign(result)).toBe('positive');
	});

	it('evaluates x at x→0⁻ to get 0⁻', () => {
		const expression = expr('x');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'left');

		expect(result.type).toBe('signed-zero');
		expect(getZeroSign(result)).toBe('negative');
	});

	it('evaluates -x at x→0⁺ to get 0⁻', () => {
		const expression = expr('-x');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'right');

		expect(result.type).toBe('signed-zero');
		expect(getZeroSign(result)).toBe('negative');
	});
});

describe('Edge Cases: Nested Fractions', () => {
	it('evaluates 1/(1/(x-2)) at x→2⁺ to get 0⁺', () => {
		const expression = expr('\\frac{1}{\\frac{1}{x-2}}');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		// 1/(1/(x-2)) = x-2 → 0⁺
		expect(result.type).toBe('signed-zero');
		expect(getZeroSign(result)).toBe('positive');
	});

	it('evaluates (x-1)/(x-2) at x→3 to get 2', () => {
		const expression = expr('\\frac{x-1}{x-2}');
		const result = evaluateLimitExact(expression, 'x', number('3'), 'both');

		expect(result.type).toBe('normal');
		expect(resultToNumber(result)).toBe(2);
	});

	it('evaluates 2/(x-3) at x→3⁺ to get +∞', () => {
		const expression = expr('\\frac{2}{x-3}');
		const result = evaluateLimitExact(expression, 'x', number('3'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});

	it('evaluates -2/(x-3) at x→3⁺ to get -∞', () => {
		const expression = expr('\\frac{-2}{x-3}');
		const result = evaluateLimitExact(expression, 'x', number('3'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('negative');
	});
});

describe('Edge Cases: Multiple Approach Factors', () => {
	it('evaluates (x-2)+(x-2) at x→2⁺ to get 0', () => {
		// (x-2) + (x-2) = 2(x-2) → 0
		const expression = expr('(x-2)+(x-2)');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		// Should evaluate to signed zero
		expect(result.type).toBe('signed-zero');
		expect(getZeroSign(result)).toBe('positive');
	});

	it('evaluates 1/((x-2)(3-x)) at x→2⁺', () => {
		// (x-2) → 0⁺, (3-x) → 1, so 1/(0⁺ · 1) → +∞
		const expression = expr('\\frac{1}{(x-2)(3-x)}');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});
});

describe('Edge Cases: Constants and Special Values', () => {
	it('evaluates constant 5 at any approach point', () => {
		const expression = expr('5');
		const result = evaluateLimitExact(expression, 'x', number('7'), 'both');

		expect(result.type).toBe('normal');
		expect(resultToNumber(result)).toBe(5);
	});

	it('evaluates 2+3 at any approach point to get 5', () => {
		const expression = expr('2+3');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'both');

		expect(result.type).toBe('normal');
		expect(resultToNumber(result)).toBe(5);
	});

	it('evaluates x/x at x=5 to get 1', () => {
		const expression = expr('\\frac{x}{x}');
		const result = evaluateLimitExact(expression, 'x', number('5'), 'both');

		expect(result.type).toBe('normal');
		expect(resultToNumber(result)).toBe(1);
	});
});

describe('Edge Cases: Large Numbers', () => {
	it('evaluates x+1000000 at x=0 to get 1000000', () => {
		const expression = expr('x+1000000');
		const result = evaluateLimitExact(expression, 'x', number('0'), 'both');

		expect(result.type).toBe('normal');
		expect(resultToNumber(result)).toBe(1000000);
	});

	it('evaluates 1/(x-1000) at x→1000⁺ to get +∞', () => {
		const expression = expr('\\frac{1}{x-1000}');
		const result = evaluateLimitExact(expression, 'x', number('1000'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});
});

describe('Edge Cases: Fractions with Same Numerator/Denominator Pattern', () => {
	// Note: (x-a)/(x-a) at x=a is the canonical 0/0 indeterminate form.
	// The exact evaluation correctly identifies this as indeterminate.
	// Symbolic simplification to cancel (x-a) requires factorization,
	// which is handled by the algebraic simplification module, not exact evaluation.
	it('correctly identifies (x-a)/(x-a) at x→a as indeterminate (0/0)', () => {
		const expression = expr('\\frac{x-5}{x-5}');
		const result = tryEvaluateLimitExact(expression, 'x', number('5'), 'both');

		// This is correctly identified as 0/0 indeterminate form
		expect(result).not.toBeNull();
		if (result) {
			expect(result.type).toBe('indeterminate');
		}
	});

	it('correctly identifies 2(x-3)/(x-3) at x→3 as indeterminate (0/0)', () => {
		const expression = expr('\\frac{2(x-3)}{x-3}');
		const result = tryEvaluateLimitExact(expression, 'x', number('3'), 'both');

		// This is correctly identified as 0/0 indeterminate form
		// (algebraic simplification handles cancellation separately)
		expect(result).not.toBeNull();
		if (result) {
			expect(result.type).toBe('indeterminate');
		}
	});

	it('evaluates x/x at x=5 to get 1 (not 0/0)', () => {
		// x/x simplifies to 1 for x ≠ 0
		const expression = expr('\\frac{x}{x}');
		const result = tryEvaluateLimitExact(expression, 'x', number('5'), 'both');

		expect(result).not.toBeNull();
		if (result) {
			expect(result.type).toBe('normal');
			expect(resultToNumber(result)).toBe(1);
		}
	});
});

describe('Edge Cases: resultToNumber function', () => {
	it('returns Infinity for positive infinity result', () => {
		const expression = expr('\\frac{1}{x-2}');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		expect(resultToNumber(result)).toBe(Infinity);
	});

	it('returns -Infinity for negative infinity result', () => {
		const expression = expr('\\frac{1}{x-2}');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'left');

		expect(resultToNumber(result)).toBe(-Infinity);
	});

	it('returns 0 for signed zero result', () => {
		const expression = expr('x-2');
		const result = evaluateLimitExact(expression, 'x', number('2'), 'right');

		expect(resultToNumber(result)).toBe(0);
	});

	it('returns finite number for normal result', () => {
		const expression = expr('x+1');
		const result = evaluateLimitExact(expression, 'x', number('5'), 'both');

		expect(resultToNumber(result)).toBe(6);
	});
});

describe('Edge Cases: Different Variable Names', () => {
	it('evaluates t-3 at t→3⁺ to get 0⁺', () => {
		const expression = parseLatex('t-3');
		const result = evaluateLimitExact(expression, 't', number('3'), 'right');

		expect(result.type).toBe('signed-zero');
		expect(getZeroSign(result)).toBe('positive');
	});

	it('evaluates 1/(y+1) at y→-1⁺ to get +∞', () => {
		const expression = parseLatex('\\frac{1}{y+1}');
		const result = evaluateLimitExact(expression, 'y', number('-1'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});

	it('evaluates 1/(y-5) at y→5⁺ to get +∞', () => {
		const expression = parseLatex('\\frac{1}{y-5}');
		const result = evaluateLimitExact(expression, 'y', number('5'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});
});

describe('Edge Cases: Decimal Approach Values', () => {
	it('evaluates x at x→0.5 to get 0.5', () => {
		const expression = expr('x');
		const result = evaluateLimitExact(expression, 'x', number('0.5'), 'both');

		expect(result.type).toBe('normal');
		const numValue = resultToNumber(result);
		expect(numValue).toBeCloseTo(0.5, 10);
	});

	it('evaluates 1/(x-0.5) at x→0.5⁺ to get +∞', () => {
		const expression = expr('\\frac{1}{x-0.5}');
		const result = evaluateLimitExact(expression, 'x', number('0.5'), 'right');

		expect(isInfinityResult(result)).toBe(true);
		expect(getInfinitySign(result)).toBe('positive');
	});
});
