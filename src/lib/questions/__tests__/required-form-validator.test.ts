/**
 * Tests for required-form-validator
 */

import { describe, it, expect } from 'vitest';
import {
	checkRequiredForm,
	getRequiredFormFeedback,
	REQUIRED_FORM_FEEDBACK
} from '../required-form-validator';

describe('required-form-validator', () => {
	// =========================================================================
	// Product Form
	// =========================================================================

	describe('product form', () => {
		it('accepts valid product: 2×3', () => {
			const violations = checkRequiredForm(['2 \\times 3'], 'product');
			expect(violations).toEqual([]);
		});

		it('accepts valid product with implicit multiplication: 2x', () => {
			const violations = checkRequiredForm(['2x'], 'product');
			expect(violations).toEqual([]);
		});

		it('accepts valid product: a×b×c', () => {
			const violations = checkRequiredForm(['a \\times b \\times c'], 'product');
			expect(violations).toEqual([]);
		});

		it('accepts product with dot notation: 2·3', () => {
			const violations = checkRequiredForm(['2 \\cdot 3'], 'product');
			expect(violations).toEqual([]);
		});

		it('rejects simple number: 6', () => {
			const violations = checkRequiredForm(['6'], 'product');
			expect(violations).toEqual([0]);
		});

		it('rejects sum: 2+3', () => {
			const violations = checkRequiredForm(['2 + 3'], 'product');
			expect(violations).toEqual([0]);
		});

		it('rejects trivial product: 1×7', () => {
			const violations = checkRequiredForm(['1 \\times 7'], 'product');
			expect(violations).toEqual([0]);
		});

		it('rejects trivial product: 7×1', () => {
			const violations = checkRequiredForm(['7 \\times 1'], 'product');
			expect(violations).toEqual([0]);
		});

		it('rejects product with -1: (-1)×7', () => {
			const violations = checkRequiredForm(['(-1) \\times 7'], 'product');
			expect(violations).toEqual([0]);
		});

		it('accepts product with parenthesized expression: (2)×(3)', () => {
			// Unnecessary parentheses are stripped before checking
			const violations = checkRequiredForm(['(2) \\times (3)'], 'product');
			expect(violations).toEqual([]);
		});

		it('rejects fraction: 1/2', () => {
			const violations = checkRequiredForm(['\\frac{1}{2}'], 'product');
			expect(violations).toEqual([0]);
		});
	});

	// =========================================================================
	// Sum Form
	// =========================================================================

	describe('sum form', () => {
		it('accepts valid sum: 2+3', () => {
			const violations = checkRequiredForm(['2 + 3'], 'sum');
			expect(violations).toEqual([]);
		});

		it('accepts sum with variables: x+y', () => {
			const violations = checkRequiredForm(['x + y'], 'sum');
			expect(violations).toEqual([]);
		});

		it('accepts sum with multiple terms: a+b+c', () => {
			const violations = checkRequiredForm(['a + b + c'], 'sum');
			expect(violations).toEqual([]);
		});

		it('rejects simple number: 5', () => {
			const violations = checkRequiredForm(['5'], 'sum');
			expect(violations).toEqual([0]);
		});

		it('rejects product: 2×3', () => {
			const violations = checkRequiredForm(['2 \\times 3'], 'sum');
			expect(violations).toEqual([0]);
		});

		it('rejects fraction: 1/2', () => {
			const violations = checkRequiredForm(['\\frac{1}{2}'], 'sum');
			expect(violations).toEqual([0]);
		});
	});

	// =========================================================================
	// Fraction Form
	// =========================================================================

	describe('fraction form', () => {
		it('accepts valid fraction: 1/2', () => {
			const violations = checkRequiredForm(['\\frac{1}{2}'], 'fraction');
			expect(violations).toEqual([]);
		});

		it('accepts fraction with variables: a/b', () => {
			const violations = checkRequiredForm(['\\frac{a}{b}'], 'fraction');
			expect(violations).toEqual([]);
		});

		it('accepts complex fraction: (x+1)/(x-1)', () => {
			const violations = checkRequiredForm(['\\frac{x+1}{x-1}'], 'fraction');
			expect(violations).toEqual([]);
		});

		it('rejects simple number: 2', () => {
			const violations = checkRequiredForm(['2'], 'fraction');
			expect(violations).toEqual([0]);
		});

		it('rejects product: 2×3', () => {
			const violations = checkRequiredForm(['2 \\times 3'], 'fraction');
			expect(violations).toEqual([0]);
		});

		it('rejects sum: 2+3', () => {
			const violations = checkRequiredForm(['2 + 3'], 'fraction');
			expect(violations).toEqual([0]);
		});
	});

	// =========================================================================
	// Power Form
	// =========================================================================

	describe('power form', () => {
		it('accepts valid power: x^2', () => {
			const violations = checkRequiredForm(['x^2'], 'power');
			expect(violations).toEqual([]);
		});

		it('accepts power with variable exponent: 2^n', () => {
			const violations = checkRequiredForm(['2^n'], 'power');
			expect(violations).toEqual([]);
		});

		it('accepts complex power: (x+1)^3', () => {
			const violations = checkRequiredForm(['(x+1)^3'], 'power');
			expect(violations).toEqual([]);
		});

		it('rejects simple number: 8', () => {
			const violations = checkRequiredForm(['8'], 'power');
			expect(violations).toEqual([0]);
		});

		it('rejects product: 2×4', () => {
			const violations = checkRequiredForm(['2 \\times 4'], 'power');
			expect(violations).toEqual([0]);
		});

		it('rejects sum: 2+6', () => {
			const violations = checkRequiredForm(['2 + 6'], 'power');
			expect(violations).toEqual([0]);
		});
	});

	// =========================================================================
	// Custom Pattern
	// =========================================================================

	describe('custom pattern', () => {
		it('accepts matching pattern: a * b', () => {
			// Pattern syntax: letters are wildcards by default
			const violations = checkRequiredForm(['2 \\times 3'], { pattern: 'a * b' });
			expect(violations).toEqual([]);
		});

		it('rejects non-matching pattern', () => {
			const violations = checkRequiredForm(['6'], { pattern: 'a * b' });
			expect(violations).toEqual([0]);
		});

		it('handles invalid pattern gracefully', () => {
			// Invalid pattern syntax should result in no match
			const violations = checkRequiredForm(['2 \\times 3'], { pattern: '[[invalid' });
			expect(violations).toEqual([0]);
		});

		it('accepts pattern with type constraints: a:integer * b:integer', () => {
			const violations = checkRequiredForm(['2 \\times 3'], { pattern: 'a:integer * b:integer' });
			expect(violations).toEqual([]);
		});

		it('rejects pattern when type constraint fails', () => {
			// x is not an integer
			const violations = checkRequiredForm(['x \\times 3'], { pattern: 'a:integer * b:integer' });
			expect(violations).toEqual([0]);
		});
	});

	// =========================================================================
	// Multiple Answers
	// =========================================================================

	describe('multiple answers', () => {
		it('returns all violation indices', () => {
			const violations = checkRequiredForm(['2 \\times 3', '6', '4 \\times 5', '10'], 'product');
			expect(violations).toEqual([1, 3]); // Indices 1 and 3 are not products
		});

		it('returns empty array when all match', () => {
			const violations = checkRequiredForm(
				['2 \\times 3', '4 \\times 5', 'a \\times b'],
				'product'
			);
			expect(violations).toEqual([]);
		});

		it('returns all indices when none match', () => {
			const violations = checkRequiredForm(['6', '7', '8'], 'product');
			expect(violations).toEqual([0, 1, 2]);
		});
	});

	// =========================================================================
	// Edge Cases
	// =========================================================================

	describe('edge cases', () => {
		it('handles empty array', () => {
			const violations = checkRequiredForm([], 'product');
			expect(violations).toEqual([]);
		});

		it('handles parse errors as violations', () => {
			const violations = checkRequiredForm(['\\invalid{latex}'], 'product');
			expect(violations).toEqual([0]);
		});

		it('strips unnecessary parentheses: (2×3)', () => {
			const violations = checkRequiredForm(['(2 \\times 3)'], 'product');
			expect(violations).toEqual([]);
		});

		it('handles negative products: (-2)×3', () => {
			const violations = checkRequiredForm(['(-2) \\times 3'], 'product');
			expect(violations).toEqual([]);
		});

		it('handles product with negative second factor: 2×(-3)', () => {
			const violations = checkRequiredForm(['2 \\times (-3)'], 'product');
			expect(violations).toEqual([]);
		});
	});

	// =========================================================================
	// Feedback Messages
	// =========================================================================

	describe('getRequiredFormFeedback', () => {
		it('returns product feedback', () => {
			expect(getRequiredFormFeedback('product', false)).toBe(REQUIRED_FORM_FEEDBACK.product);
		});

		it('returns sum feedback', () => {
			expect(getRequiredFormFeedback('sum', false)).toBe(REQUIRED_FORM_FEEDBACK.sum);
		});

		it('returns fraction feedback', () => {
			expect(getRequiredFormFeedback('fraction', false)).toBe(REQUIRED_FORM_FEEDBACK.fraction);
		});

		it('returns power feedback', () => {
			expect(getRequiredFormFeedback('power', false)).toBe(REQUIRED_FORM_FEEDBACK.power);
		});

		it('returns pattern feedback for custom pattern', () => {
			expect(getRequiredFormFeedback({ pattern: '_a * _b' }, false)).toBe(
				REQUIRED_FORM_FEEDBACK.pattern
			);
		});
	});
});
