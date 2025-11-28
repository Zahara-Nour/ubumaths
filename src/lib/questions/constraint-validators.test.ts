/**
 * Constraint Validators Tests
 * ============================
 *
 * Comprehensive tests for constraint validation functions that check
 * if mathematically correct answers are written in proper form.
 */

import { describe, it, expect } from 'vitest';
import {
	checkSpaces,
	checkProducts,
	checkBrackets,
	checkZeros,
	checkForm,
	checkNullTerms,
	checkFactorOne,
	checkFactorZero,
	checkSigns
} from './constraint-validators';

// ============================================================================
// SPACING VALIDATOR TESTS
// ============================================================================

describe('checkSpaces', () => {
	describe('French Format - Integer Part', () => {
		it('should allow 4 digits without spacing (French convention)', () => {
			const result = checkSpaces(['1234']);
			expect(result).toHaveLength(0);
		});

		it('should allow 3 digits or fewer without spacing', () => {
			expect(checkSpaces(['1'])).toHaveLength(0);
			expect(checkSpaces(['12'])).toHaveLength(0);
			expect(checkSpaces(['123'])).toHaveLength(0);
		});

		it('should require spacing for 5+ digits', () => {
			const result = checkSpaces(['12345']);
			expect(result).toEqual([0]);
		});

		it('should allow correct spacing with regular space', () => {
			expect(checkSpaces(['1 234'])).toHaveLength(0);
			expect(checkSpaces(['12 345'])).toHaveLength(0);
			expect(checkSpaces(['123 456'])).toHaveLength(0);
			expect(checkSpaces(['1 234 567'])).toHaveLength(0);
		});

		it('should allow correct spacing with LaTeX thin space (\\,)', () => {
			expect(checkSpaces(['1\\,234'])).toHaveLength(0);
			expect(checkSpaces(['12\\,345'])).toHaveLength(0);
			expect(checkSpaces(['1\\,234\\,567'])).toHaveLength(0);
		});

		it('should detect incorrect space positions in integer part', () => {
			// Wrong spacing positions (should be groups of 3 from right)
			const result = checkSpaces(['12 34']);
			expect(result).toEqual([0]);
		});

		it('should allow large numbers with proper spacing', () => {
			expect(checkSpaces(['1 234 567 890'])).toHaveLength(0);
			expect(checkSpaces(['12 345 678 901 234'])).toHaveLength(0);
		});
	});

	describe('French Format - Decimal Part', () => {
		it('should allow 4 decimal digits without spacing', () => {
			expect(checkSpaces(['0.1234'])).toHaveLength(0);
			expect(checkSpaces(['0{,}1234'])).toHaveLength(0); // French LaTeX comma
		});

		it('should require spacing for 5+ decimal digits', () => {
			const result = checkSpaces(['0.12345']);
			expect(result).toEqual([0]);
		});

		it('should allow correct decimal spacing (groups of 3 from left)', () => {
			expect(checkSpaces(['0.123 456'])).toHaveLength(0);
			expect(checkSpaces(['0{,}123 456'])).toHaveLength(0);
			expect(checkSpaces(['0.123 456 789'])).toHaveLength(0);
		});

		it('should detect incorrect decimal spacing', () => {
			const result = checkSpaces(['0.1234 56']);
			expect(result).toEqual([0]);
		});

		it('should handle both integer and decimal parts', () => {
			expect(checkSpaces(['1 234.567'])).toHaveLength(0);
			expect(checkSpaces(['1 234.567 890'])).toHaveLength(0);
		});
	});

	describe('French Decimal Separator', () => {
		it('should recognize {,} as French decimal comma', () => {
			expect(checkSpaces(['3{,}14159'])).toEqual([0]); // 5 decimal digits
			expect(checkSpaces(['3{,}141'])).toHaveLength(0); // 3 decimal digits
		});

		it('should recognize , as decimal separator in digit,digit pattern', () => {
			expect(checkSpaces(['3,14159'])).toEqual([0]); // 5 decimal digits
			expect(checkSpaces(['3,141'])).toHaveLength(0); // 3 decimal digits
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkSpaces(['1 234', '12345', '123', '123456']);
			expect(result).toEqual([1, 3]); // Indices 1 and 3 violate
		});

		it('should return empty array when all answers are correct', () => {
			const result = checkSpaces(['1 234', '123', '12 345']);
			expect(result).toHaveLength(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkSpaces([''])).toHaveLength(0);
			expect(checkSpaces(['', '12345', ''])).toEqual([1]);
		});

		it('should handle negative numbers', () => {
			expect(checkSpaces(['-1 234'])).toHaveLength(0);
			expect(checkSpaces(['-12345'])).toEqual([0]);
		});

		it('should handle zero', () => {
			expect(checkSpaces(['0'])).toHaveLength(0);
			expect(checkSpaces(['0.123'])).toHaveLength(0);
		});

		it('should handle multiple spaces (normalize them)', () => {
			expect(checkSpaces(['1  234'])).toHaveLength(0); // Multiple spaces should be normalized
		});
	});
});

// ============================================================================
// PRODUCTS VALIDATOR TESTS
// ============================================================================

describe('checkProducts', () => {
	describe('Multiplication Before Variables', () => {
		it('should detect \\times before variables', () => {
			expect(checkProducts(['2\\times x'])).toEqual([0]);
			expect(checkProducts(['a\\times b'])).toEqual([0]);
			expect(checkProducts(['3\\times y'])).toEqual([0]);
		});

		it('should detect \\cdot before variables', () => {
			expect(checkProducts(['2\\cdot x'])).toEqual([0]);
			expect(checkProducts(['a\\cdot b'])).toEqual([0]);
		});

		it('should detect \\ast before variables', () => {
			expect(checkProducts(['2\\ast x'])).toEqual([0]);
		});

		it('should detect * before variables', () => {
			expect(checkProducts(['2*x'])).toEqual([0]);
			expect(checkProducts(['a*b'])).toEqual([0]);
		});

		it('should accept implicit multiplication', () => {
			expect(checkProducts(['2x'])).toHaveLength(0);
			expect(checkProducts(['3y'])).toHaveLength(0);
			expect(checkProducts(['10a'])).toHaveLength(0);
		});

		it('should accept variable juxtaposition', () => {
			expect(checkProducts(['ab'])).toHaveLength(0);
			expect(checkProducts(['xyz'])).toHaveLength(0);
		});
	});

	describe('Multiplication Before Parentheses', () => {
		it('should detect multiplication symbols before opening parenthesis', () => {
			expect(checkProducts(['2\\times(x+1)'])).toEqual([0]);
			expect(checkProducts(['3\\cdot(a-b)'])).toEqual([0]);
		});

		it('should detect multiplication before brackets', () => {
			expect(checkProducts(['2\\times[x+1]'])).toEqual([0]);
		});

		it('should detect multiplication before \\left(', () => {
			expect(checkProducts(['2\\times\\left(x+1\\right)'])).toEqual([0]);
			expect(checkProducts(['3\\cdot\\left[a\\right]'])).toEqual([0]);
		});

		it('should accept implicit multiplication before parentheses', () => {
			expect(checkProducts(['2(x+1)'])).toHaveLength(0);
			expect(checkProducts(['(a+b)(c+d)'])).toHaveLength(0);
		});
	});

	describe('Greek Letters', () => {
		it('should detect multiplication before Greek letters', () => {
			expect(checkProducts(['2\\times\\alpha'])).toEqual([0]);
			expect(checkProducts(['3\\cdot\\beta'])).toEqual([0]);
			expect(checkProducts(['x\\times\\theta'])).toEqual([0]);
		});

		it('should accept implicit multiplication with Greek letters', () => {
			expect(checkProducts(['2\\alpha'])).toHaveLength(0);
			expect(checkProducts(['3\\beta'])).toHaveLength(0);
		});

		it('should handle various Greek letters', () => {
			const greekLetters = [
				'alpha',
				'beta',
				'gamma',
				'delta',
				'epsilon',
				'theta',
				'lambda',
				'mu',
				'pi',
				'sigma',
				'omega'
			];

			for (const letter of greekLetters) {
				expect(checkProducts([`2\\times\\${letter}`])).toEqual([0]);
				expect(checkProducts([`2\\${letter}`])).toHaveLength(0);
			}
		});
	});

	describe('Number × Number (Acceptable)', () => {
		it('should accept explicit multiplication between numbers', () => {
			expect(checkProducts(['2\\times3'])).toHaveLength(0);
			expect(checkProducts(['10\\cdot5'])).toHaveLength(0);
			expect(checkProducts(['3*4'])).toHaveLength(0);
		});

		it('should accept multiplication in numeric expressions', () => {
			expect(checkProducts(['12\\times34'])).toHaveLength(0);
		});
	});

	describe('Multiple Violations', () => {
		it('should detect first violation in expression with multiple', () => {
			const result = checkProducts(['2\\times x + 3\\times y']);
			expect(result).toEqual([0]); // First violation detected
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkProducts(['2x', '3\\times y', '4z', 'a\\cdot b']);
			expect(result).toEqual([1, 3]);
		});

		it('should return empty array when all answers are correct', () => {
			const result = checkProducts(['2x', '3y', 'ab']);
			expect(result).toHaveLength(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkProducts([''])).toHaveLength(0);
		});

		it('should handle whitespace around operators', () => {
			expect(checkProducts(['2 \\times x'])).toEqual([0]);
			expect(checkProducts(['2\\times x'])).toEqual([0]);
		});

		it('should handle uppercase Greek letters', () => {
			expect(checkProducts(['2\\times\\Delta'])).toEqual([0]);
			expect(checkProducts(['3\\times\\Sigma'])).toEqual([0]);
		});
	});
});

// ============================================================================
// BRACKETS VALIDATOR TESTS
// ============================================================================

describe('checkBrackets', () => {
	describe('Single Number in Brackets', () => {
		it('should detect single positive number in brackets', () => {
			expect(checkBrackets(['(5)'])).toEqual([0]);
			expect(checkBrackets(['(123)'])).toEqual([0]);
		});

		it('should detect single negative number in brackets by default', () => {
			expect(checkBrackets(['(-5)'])).toEqual([0]);
			expect(checkBrackets(['(-123)'])).toEqual([0]);
		});

		it('should allow negative number at start when allowFirstNegative is true', () => {
			const result = checkBrackets(['(-5)+3'], { allowFirstNegative: true });
			expect(result).toHaveLength(0);
		});

		it('should detect negative number at start when allowFirstNegative is false', () => {
			const result = checkBrackets(['(-5)+3'], { allowFirstNegative: false });
			expect(result).toEqual([0]);
		});

		it('should detect negative number not at start regardless of option', () => {
			const result1 = checkBrackets(['5+(-3)'], { allowFirstNegative: true });
			const result2 = checkBrackets(['5+(-3)'], { allowFirstNegative: false });
			expect(result1).toEqual([0]);
			expect(result2).toEqual([0]);
		});

		it('should detect single decimal number in brackets', () => {
			expect(checkBrackets(['(3.14)'])).toEqual([0]);
			expect(checkBrackets(['(-2.5)'])).toEqual([0]);
		});
	});

	describe('Single Variable in Brackets', () => {
		it('should detect single letter variable in brackets', () => {
			expect(checkBrackets(['(x)'])).toEqual([0]);
			expect(checkBrackets(['(a)'])).toEqual([0]);
			expect(checkBrackets(['(X)'])).toEqual([0]);
		});

		it('should detect Greek letter variable in brackets', () => {
			expect(checkBrackets(['(\\alpha)'])).toEqual([0]);
			expect(checkBrackets(['(\\beta)'])).toEqual([0]);
			expect(checkBrackets(['(\\theta)'])).toEqual([0]);
		});
	});

	describe('Necessary Brackets (Acceptable)', () => {
		it('should accept brackets around expressions', () => {
			expect(checkBrackets(['(x+1)'])).toHaveLength(0);
			expect(checkBrackets(['(2x-3)'])).toHaveLength(0);
			expect(checkBrackets(['(a+b+c)'])).toHaveLength(0);
		});

		it('should accept nested necessary brackets', () => {
			expect(checkBrackets(['2(x+1)'])).toHaveLength(0);
			expect(checkBrackets(['(x+1)(x-1)'])).toHaveLength(0);
		});

		it('should accept brackets in fractions', () => {
			expect(checkBrackets(['\\frac{(x+1)}{2}'])).toHaveLength(0);
		});
	});

	describe('Double Brackets', () => {
		it('should detect double brackets around expressions', () => {
			expect(checkBrackets(['((x+1))'])).toEqual([0]);
			expect(checkBrackets(['((a))'])).toEqual([0]);
		});

		it('should detect double brackets with whitespace', () => {
			expect(checkBrackets(['( (x+1) )'])).toEqual([0]);
		});
	});

	describe('LaTeX Delimiters', () => {
		it('should normalize \\left( and \\right)', () => {
			expect(checkBrackets(['\\left(5\\right)'])).toEqual([0]);
			expect(checkBrackets(['\\left(x\\right)'])).toEqual([0]);
			expect(checkBrackets(['\\left(x+1\\right)'])).toHaveLength(0);
		});

		it('should normalize \\left[ and \\right] (but only checks parentheses)', () => {
			// Implementation only checks parentheses, not square brackets
			// Square brackets are normalized but not checked for violations
			expect(checkBrackets(['\\left[5\\right]'])).toHaveLength(0);
			expect(checkBrackets(['\\left[x+1\\right]'])).toHaveLength(0);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkBrackets(['(x+1)', '(5)', '(a+b)', '(x)']);
			expect(result).toEqual([1, 3]);
		});

		it('should return empty array when all answers are correct', () => {
			const result = checkBrackets(['(x+1)', '2(a-b)', '(a+b)(c+d)']);
			expect(result).toHaveLength(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkBrackets([''])).toHaveLength(0);
		});

		it('should handle brackets around zero', () => {
			expect(checkBrackets(['(0)'])).toEqual([0]);
		});

		it('should handle square brackets (not checked for violations)', () => {
			// Implementation only checks parentheses (), not square brackets []
			expect(checkBrackets(['[5]'])).toHaveLength(0);
			expect(checkBrackets(['[x+1]'])).toHaveLength(0);
		});

		it('should not flag curly braces (LaTeX grouping)', () => {
			// Curly braces are used for LaTeX grouping, not mathematical brackets
			expect(checkBrackets(['\\frac{5}{2}'])).toHaveLength(0);
		});
	});
});

// ============================================================================
// ZEROS VALIDATOR TESTS
// ============================================================================

describe('checkZeros', () => {
	describe('Leading Zeros', () => {
		it('should detect leading zeros', () => {
			expect(checkZeros(['01'])).toEqual([0]);
			expect(checkZeros(['007'])).toEqual([0]);
			expect(checkZeros(['0123'])).toEqual([0]);
		});

		it('should accept zero by itself', () => {
			expect(checkZeros(['0'])).toHaveLength(0);
		});

		it('should accept zero before decimal', () => {
			expect(checkZeros(['0.5'])).toHaveLength(0);
			expect(checkZeros(['0.123'])).toHaveLength(0);
		});

		it('should detect leading zeros in negative numbers', () => {
			expect(checkZeros(['-01'])).toEqual([0]);
			expect(checkZeros(['-007'])).toEqual([0]);
		});

		it('should accept numbers without leading zeros', () => {
			expect(checkZeros(['1'])).toHaveLength(0);
			expect(checkZeros(['123'])).toHaveLength(0);
		});
	});

	describe('Trailing Decimal Zeros', () => {
		it('should detect trailing zeros after decimal point', () => {
			expect(checkZeros(['1.0'])).toEqual([0]);
			expect(checkZeros(['1.20'])).toEqual([0]);
			expect(checkZeros(['3.140'])).toEqual([0]);
		});

		it('should accept meaningful zeros in decimal part', () => {
			expect(checkZeros(['1.02'])).toHaveLength(0);
			expect(checkZeros(['1.203'])).toHaveLength(0);
			expect(checkZeros(['10.05'])).toHaveLength(0);
		});

		it('should accept integer zeros (not decimals)', () => {
			expect(checkZeros(['10'])).toHaveLength(0);
			expect(checkZeros(['100'])).toHaveLength(0);
			expect(checkZeros(['1000'])).toHaveLength(0);
		});
	});

	describe('French Decimal Comma', () => {
		it('should handle French comma as decimal separator', () => {
			expect(checkZeros(['1,0'])).toEqual([0]); // Trailing zero
			expect(checkZeros(['1,20'])).toEqual([0]); // Trailing zero
			expect(checkZeros(['1,5'])).toHaveLength(0); // No trailing zero
		});

		it('should accept meaningful zeros with comma', () => {
			expect(checkZeros(['1,02'])).toHaveLength(0);
			expect(checkZeros(['1,203'])).toHaveLength(0);
		});
	});

	describe('Expressions with Multiple Numbers', () => {
		it('should detect violations in any number within expression', () => {
			expect(checkZeros(['1.0 + 2'])).toEqual([0]);
			expect(checkZeros(['1 + 01'])).toEqual([0]);
			expect(checkZeros(['1.20 + 3.40'])).toEqual([0]); // First violation
		});

		it('should accept expressions with valid numbers', () => {
			expect(checkZeros(['1.5 + 2.3'])).toHaveLength(0);
			expect(checkZeros(['10 + 20'])).toHaveLength(0);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkZeros(['1.5', '01', '2.0', '123']);
			expect(result).toEqual([1, 2]);
		});

		it('should return empty array when all answers are correct', () => {
			const result = checkZeros(['1.5', '123', '0', '0.5']);
			expect(result).toHaveLength(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkZeros([''])).toHaveLength(0);
		});

		it('should handle negative numbers', () => {
			expect(checkZeros(['-1.0'])).toEqual([0]);
			expect(checkZeros(['-01'])).toEqual([0]);
			expect(checkZeros(['-1.5'])).toHaveLength(0);
		});

		it('should handle zero decimal', () => {
			expect(checkZeros(['0.0'])).toEqual([0]); // Trailing zero
		});

		it('should accept scientific notation-like numbers', () => {
			expect(checkZeros(['1e10'])).toHaveLength(0);
		});
	});
});

// ============================================================================
// FORM VALIDATOR TESTS
// ============================================================================

describe('checkForm', () => {
	describe('Strict Form Mode', () => {
		it('should detect form mismatch when strictForm is true', () => {
			const result = checkForm(['x+1'], ['1+x'], { strictForm: true });
			expect(result).toEqual([0]);
		});

		it('should accept exact match when strictForm is true', () => {
			const result = checkForm(['x+1'], ['x+1'], { strictForm: true });
			expect(result).toHaveLength(0);
		});

		it('should normalize whitespace', () => {
			const result = checkForm(['x + 1'], ['x+1'], { strictForm: true });
			expect(result).toHaveLength(0);
		});

		it('should normalize multiple spaces', () => {
			const result = checkForm(['x  +  1'], ['x+1'], { strictForm: true });
			expect(result).toHaveLength(0);
		});

		it('should detect different operator order', () => {
			const result = checkForm(['a*b+c'], ['a+b*c'], { strictForm: true });
			expect(result).toEqual([0]);
		});
	});

	describe('Non-Strict Mode (Default)', () => {
		it('should return empty array when strictForm is false', () => {
			const result = checkForm(['x+1'], ['1+x'], { strictForm: false });
			expect(result).toHaveLength(0);
		});

		it('should return empty array by default (no option)', () => {
			const result = checkForm(['x+1'], ['1+x']);
			expect(result).toHaveLength(0);
		});

		it('should not check form when strictForm is not enabled', () => {
			const result = checkForm(['completely different'], ['something else']);
			expect(result).toHaveLength(0);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers in strict mode', () => {
			const userAnswers = ['x+1', '2x', 'a+b'];
			const expected = ['x+1', 'x2', 'a+b'];
			const result = checkForm(userAnswers, expected, { strictForm: true });
			expect(result).toEqual([1]); // Index 1 doesn't match
		});

		it('should return empty array for all correct in strict mode', () => {
			const userAnswers = ['x+1', '2x', 'a+b'];
			const expected = ['x+1', '2x', 'a+b'];
			const result = checkForm(userAnswers, expected, { strictForm: true });
			expect(result).toHaveLength(0);
		});

		it('should handle mismatched array lengths', () => {
			const result = checkForm(['x+1'], ['x+1', '2x'], { strictForm: true });
			expect(result).toEqual([1]); // Missing user answer at index 1
		});
	});

	describe('Normalization', () => {
		it('should normalize spaces around operators', () => {
			expect(checkForm(['x + 1'], ['x+1'], { strictForm: true })).toHaveLength(0);
			expect(checkForm(['x +1'], ['x+ 1'], { strictForm: true })).toHaveLength(0);
		});

		it('should normalize leading/trailing spaces', () => {
			expect(checkForm([' x+1 '], ['x+1'], { strictForm: true })).toHaveLength(0);
		});

		it('should normalize various operators', () => {
			expect(checkForm(['x - 1'], ['x-1'], { strictForm: true })).toHaveLength(0);
			expect(checkForm(['x * 2'], ['x*2'], { strictForm: true })).toHaveLength(0);
			expect(checkForm(['x / 2'], ['x/2'], { strictForm: true })).toHaveLength(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			const result = checkForm([''], [''], { strictForm: true });
			expect(result).toHaveLength(0);
		});

		it('should detect empty vs non-empty', () => {
			const result = checkForm([''], ['x+1'], { strictForm: true });
			expect(result).toEqual([0]);
		});

		it('should handle undefined values in arrays', () => {
			const userAnswers: string[] = ['x+1', undefined as unknown as string];
			const expected: string[] = ['x+1', '2x'];
			const result = checkForm(userAnswers, expected, { strictForm: true });
			expect(result).toContain(1);
		});

		it('should handle complex LaTeX expressions', () => {
			const result = checkForm(['\\frac{1}{2}'], ['\\frac{1}{2}'], { strictForm: true });
			expect(result).toHaveLength(0);
		});
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration - Multiple Constraints', () => {
	it('should detect multiple different constraint violations', () => {
		// Test that different validators can be used together
		const badSpacing = checkSpaces(['12345']);
		const badProducts = checkProducts(['2\\times x']);
		const badBrackets = checkBrackets(['(5)']);
		const badZeros = checkZeros(['01']);

		expect(badSpacing).toEqual([0]);
		expect(badProducts).toEqual([0]);
		expect(badBrackets).toEqual([0]);
		expect(badZeros).toEqual([0]);
	});

	it('should handle answers that violate multiple constraints', () => {
		const answer = ['01'];

		// Leading zero violation
		expect(checkZeros(answer)).toEqual([0]);

		// But no spacing violation (only 2 digits)
		expect(checkSpaces(answer)).toHaveLength(0);
	});

	it('should handle complex real-world answer', () => {
		const answer = ['2\\times(x+1)'];

		// Should detect explicit multiplication
		expect(checkProducts(answer)).toEqual([0]);

		// But brackets are necessary here
		expect(checkBrackets(answer)).toHaveLength(0);
	});
});

// ============================================================================
// NULL TERMS VALIDATOR TESTS (Compute Engine based)
// ============================================================================

describe('checkNullTerms', () => {
	describe('Basic Detection', () => {
		it('should detect x+0 (null term at end)', () => {
			expect(checkNullTerms(['x+0'])).toEqual([0]);
		});

		it('should detect 0+x (null term at start)', () => {
			expect(checkNullTerms(['0+x'])).toEqual([0]);
		});

		it('should detect null term in middle', () => {
			expect(checkNullTerms(['a+0+b'])).toEqual([0]);
		});

		it('should accept expressions without null terms', () => {
			expect(checkNullTerms(['x+1'])).toHaveLength(0);
			expect(checkNullTerms(['a+b'])).toHaveLength(0);
			expect(checkNullTerms(['2+3'])).toHaveLength(0);
		});

		it('should accept just zero (not a null term)', () => {
			expect(checkNullTerms(['0'])).toHaveLength(0);
		});
	});

	describe('Nested Expressions', () => {
		it('should detect null term in nested expression', () => {
			expect(checkNullTerms(['(x+0)+y'])).toEqual([0]);
			expect(checkNullTerms(['x+(0+y)'])).toEqual([0]);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkNullTerms(['x+1', 'y+0', 'z+2', '0+w']);
			expect(result).toEqual([1, 3]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkNullTerms([''])).toHaveLength(0);
		});

		it('should handle whitespace', () => {
			expect(checkNullTerms(['  '])).toHaveLength(0);
		});
	});
});

// ============================================================================
// FACTOR ONE VALIDATOR TESTS (Compute Engine based)
// ============================================================================

describe('checkFactorOne', () => {
	describe('Basic Detection', () => {
		it('should detect 1*x (factor one at start)', () => {
			expect(checkFactorOne(['1\\times x'])).toEqual([0]);
		});

		it('should detect x*1 (factor one at end)', () => {
			expect(checkFactorOne(['x\\times 1'])).toEqual([0]);
		});

		it('should detect 1\\cdot x', () => {
			expect(checkFactorOne(['1\\cdot x'])).toEqual([0]);
		});

		it('should accept expressions without factor one', () => {
			expect(checkFactorOne(['2x'])).toHaveLength(0);
			expect(checkFactorOne(['x\\times 2'])).toHaveLength(0);
			expect(checkFactorOne(['ab'])).toHaveLength(0);
		});

		it('should accept just one (not a factor one)', () => {
			expect(checkFactorOne(['1'])).toHaveLength(0);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkFactorOne(['2x', '1\\times y', '3z', 'w\\times 1']);
			expect(result).toEqual([1, 3]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkFactorOne([''])).toHaveLength(0);
		});
	});
});

// ============================================================================
// FACTOR ZERO VALIDATOR TESTS (Compute Engine based)
// ============================================================================

describe('checkFactorZero', () => {
	describe('Basic Detection', () => {
		it('should detect 0*x (factor zero at start)', () => {
			expect(checkFactorZero(['0\\times x'])).toEqual([0]);
		});

		it('should detect x*0 (factor zero at end)', () => {
			expect(checkFactorZero(['x\\times 0'])).toEqual([0]);
		});

		it('should detect 0\\cdot x', () => {
			expect(checkFactorZero(['0\\cdot x'])).toEqual([0]);
		});

		it('should accept expressions without factor zero', () => {
			expect(checkFactorZero(['2x'])).toHaveLength(0);
			expect(checkFactorZero(['x\\times 2'])).toHaveLength(0);
			expect(checkFactorZero(['ab'])).toHaveLength(0);
		});

		it('should accept just zero (not a factor zero)', () => {
			expect(checkFactorZero(['0'])).toHaveLength(0);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkFactorZero(['2x', '0\\times y', '3z', 'w\\times 0']);
			expect(result).toEqual([1, 3]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkFactorZero([''])).toHaveLength(0);
		});
	});
});

// ============================================================================
// SIGNS VALIDATOR TESTS
// ============================================================================

describe('checkSigns', () => {
	describe('Double Signs', () => {
		it('should detect double plus (++)', () => {
			expect(checkSigns(['x++y'])).toEqual([0]);
		});

		it('should detect double minus (--)', () => {
			expect(checkSigns(['x--y'])).toEqual([0]);
		});

		it('should detect plus-minus (+-)', () => {
			expect(checkSigns(['x+-y'])).toEqual([0]);
		});

		it('should detect minus-plus (-+)', () => {
			expect(checkSigns(['x-+y'])).toEqual([0]);
		});
	});

	describe('Leading Plus Before Variable', () => {
		it('should detect +x at start', () => {
			expect(checkSigns(['+x'])).toEqual([0]);
		});

		it('should detect +a at start', () => {
			expect(checkSigns(['+a'])).toEqual([0]);
		});

		it('should accept -x (valid negative)', () => {
			expect(checkSigns(['-x'])).toHaveLength(0);
		});

		it('should accept normal addition', () => {
			expect(checkSigns(['x+3'])).toHaveLength(0);
			expect(checkSigns(['a+b'])).toHaveLength(0);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkSigns(['x+y', 'x++z', 'a-b', '+c']);
			expect(result).toEqual([1, 3]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkSigns([''])).toHaveLength(0);
		});

		it('should handle whitespace', () => {
			expect(checkSigns(['  '])).toHaveLength(0);
		});

		it('should accept leading plus on numbers (debatable)', () => {
			// +5 could be acceptable notation for positive 5
			// Our regex only catches +letter, not +digit
			expect(checkSigns(['+5'])).toHaveLength(0);
		});
	});
});
