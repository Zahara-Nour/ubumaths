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
	checkSigns,
	checkReducedFractions
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

		it('should accept multiplication with negative numbers', () => {
			expect(checkProducts(['2\\times(-3)'])).toHaveLength(0);
			expect(checkProducts(['(-2)\\times3'])).toHaveLength(0);
			expect(checkProducts(['(-2)\\times(-3)'])).toHaveLength(0);
		});

		it('should accept multiplication with decimal numbers', () => {
			expect(checkProducts(['2.5\\times3'])).toHaveLength(0);
			expect(checkProducts(['1.5\\times2.5'])).toHaveLength(0);
		});
	});

	describe('Mathematical Constants (π, e, i)', () => {
		it('should detect explicit multiplication before pi (\\pi)', () => {
			expect(checkProducts(['2\\times\\pi'])).toEqual([0]);
			expect(checkProducts(['r^2\\times\\pi'])).toEqual([0]);
		});

		it('should accept implicit multiplication with pi', () => {
			expect(checkProducts(['2\\pi'])).toHaveLength(0);
			expect(checkProducts(['\\pi r^2'])).toHaveLength(0);
		});

		it('should detect explicit multiplication before Euler number (e)', () => {
			// Note: e as Euler's number uses \exponentialE in MathLive
			expect(checkProducts(['2\\times e'])).toEqual([0]);
			expect(checkProducts(['x\\cdot e'])).toEqual([0]);
		});

		it('should accept implicit multiplication with e', () => {
			expect(checkProducts(['2e'])).toHaveLength(0);
			expect(checkProducts(['e^x'])).toHaveLength(0);
		});

		it('should detect explicit multiplication before imaginary unit (i)', () => {
			// Note: i as imaginary uses \imaginaryI in MathLive
			expect(checkProducts(['2\\times i'])).toEqual([0]);
			expect(checkProducts(['3\\cdot i'])).toEqual([0]);
		});

		it('should accept implicit multiplication with i', () => {
			expect(checkProducts(['2i'])).toHaveLength(0);
			expect(checkProducts(['3+2i'])).toHaveLength(0);
		});
	});

	describe('Functions', () => {
		it('should detect explicit multiplication before functions', () => {
			expect(checkProducts(['2\\times\\sin(x)'])).toEqual([0]);
			expect(checkProducts(['3\\cdot\\cos(\\theta)'])).toEqual([0]);
			expect(checkProducts(['x\\times\\ln(y)'])).toEqual([0]);
		});

		it('should accept implicit multiplication before functions', () => {
			expect(checkProducts(['2\\sin(x)'])).toHaveLength(0);
			expect(checkProducts(['3\\cos(\\theta)'])).toHaveLength(0);
		});

		it('should detect explicit multiplication before sqrt', () => {
			expect(checkProducts(['2\\times\\sqrt{x}'])).toEqual([0]);
		});

		it('should accept implicit multiplication before sqrt', () => {
			expect(checkProducts(['2\\sqrt{x}'])).toHaveLength(0);
		});
	});

	describe('Fractions', () => {
		it('should detect explicit multiplication before fractions', () => {
			expect(checkProducts(['2\\times\\frac{1}{2}'])).toEqual([0]);
			expect(checkProducts(['x\\cdot\\frac{a}{b}'])).toEqual([0]);
		});

		it('should accept implicit multiplication before fractions', () => {
			expect(checkProducts(['2\\frac{1}{2}'])).toHaveLength(0);
		});

		it('should detect explicit multiplication inside fractions', () => {
			// If numerator or denominator has explicit mult before variable
			expect(checkProducts(['\\frac{2\\times x}{3}'])).toEqual([0]);
			expect(checkProducts(['\\frac{a}{2\\times b}'])).toEqual([0]);
		});

		it('should accept implicit multiplication inside fractions', () => {
			expect(checkProducts(['\\frac{2x}{3}'])).toHaveLength(0);
			expect(checkProducts(['\\frac{a}{2b}'])).toHaveLength(0);
		});
	});

	describe('Exponents and Powers', () => {
		it('should detect explicit multiplication before powers', () => {
			expect(checkProducts(['2\\times x^2'])).toEqual([0]);
			expect(checkProducts(['3\\cdot a^n'])).toEqual([0]);
		});

		it('should accept implicit multiplication before powers', () => {
			expect(checkProducts(['2x^2'])).toHaveLength(0);
			expect(checkProducts(['3a^n'])).toHaveLength(0);
		});

		it('should detect explicit multiplication in exponent', () => {
			expect(checkProducts(['x^{2\\times n}'])).toEqual([0]);
		});

		it('should accept implicit multiplication in exponent', () => {
			expect(checkProducts(['x^{2n}'])).toHaveLength(0);
		});
	});

	describe('Complex Expressions', () => {
		it('should detect violation in complex polynomial', () => {
			expect(checkProducts(['2\\times x^2 + 3x + 1'])).toEqual([0]);
		});

		it('should accept correct implicit multiplication in polynomial', () => {
			expect(checkProducts(['2x^2 + 3x + 1'])).toHaveLength(0);
		});

		it('should detect violation in nested expressions', () => {
			expect(checkProducts(['(2\\times x)(y+1)'])).toEqual([0]);
		});

		it('should accept nested implicit multiplications', () => {
			expect(checkProducts(['(2x)(y+1)'])).toHaveLength(0);
		});

		it('should handle mixed correct and incorrect in same expression', () => {
			// 2×3 is OK, but ×x is not
			expect(checkProducts(['2\\times 3\\times x'])).toEqual([0]);
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

		it('should handle subscripted variables', () => {
			expect(checkProducts(['2\\times x_1'])).toEqual([0]);
			expect(checkProducts(['a\\cdot b_n'])).toEqual([0]);
		});

		it('should accept implicit multiplication with subscripted variables', () => {
			expect(checkProducts(['2x_1'])).toHaveLength(0);
			expect(checkProducts(['ab_n'])).toHaveLength(0);
		});

		it('should handle expressions with only numbers (no violation)', () => {
			expect(checkProducts(['2\\times3\\times4'])).toHaveLength(0);
			expect(checkProducts(['1\\cdot2\\cdot3\\cdot4'])).toHaveLength(0);
		});

		it('should handle single variable (no multiplication)', () => {
			expect(checkProducts(['x'])).toHaveLength(0);
			expect(checkProducts(['\\alpha'])).toHaveLength(0);
		});

		it('should handle single number (no multiplication)', () => {
			expect(checkProducts(['42'])).toHaveLength(0);
			expect(checkProducts(['-3.14'])).toHaveLength(0);
		});

		it('should handle expressions without any multiplication', () => {
			expect(checkProducts(['x+y'])).toHaveLength(0);
			expect(checkProducts(['a-b'])).toHaveLength(0);
			expect(checkProducts(['\\frac{x}{y}'])).toHaveLength(0);
		});

		it('should handle matrices (if applicable)', () => {
			// Matrix multiplication might use \\times legitimately
			// but 2×A where A is matrix should still be flagged
			expect(checkProducts(['2\\times A'])).toEqual([0]);
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

		it('should accept first negative brackets when allowFirstNegative is true', () => {
			// With allowFirstNegative: true, we ACCEPT brackets around first negative
			const result = checkBrackets(['(-5)+3'], { allowFirstNegative: true });
			expect(result).toHaveLength(0);
		});

		it('should flag first negative brackets when allowFirstNegative is false', () => {
			// With allowFirstNegative: false, brackets are unnecessary (write -5+3)
			const result = checkBrackets(['(-5)+3'], { allowFirstNegative: false });
			expect(result).toEqual([0]);
		});

		it('should accept negative in brackets in middle of expression (a+(-b) pattern)', () => {
			// Brackets around negatives in middle are ALWAYS required
			// (can't write 5+-3, must write 5+(-3))
			const result1 = checkBrackets(['5+(-3)'], { allowFirstNegative: true });
			const result2 = checkBrackets(['5+(-3)'], { allowFirstNegative: false });
			expect(result1).toHaveLength(0);
			expect(result2).toHaveLength(0);
		});

		it('should accept multiple negatives in brackets in expression', () => {
			// a+(-b)+(-c) - all brackets are required
			expect(checkBrackets(['a+(-b)+(-c)'])).toHaveLength(0);
			expect(checkBrackets(['1+(-2)+(-3)+(-4)'])).toHaveLength(0);
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

	describe('Global Brackets (Violations)', () => {
		it('should detect global brackets around expressions', () => {
			expect(checkBrackets(['(x+1)'])).toEqual([0]);
			expect(checkBrackets(['(2x-3)'])).toEqual([0]);
			expect(checkBrackets(['(a+b+c)'])).toEqual([0]);
		});
	});

	describe('Necessary Brackets (Acceptable)', () => {
		it('should accept brackets used for grouping in multiplication context', () => {
			expect(checkBrackets(['2(x+1)'])).toHaveLength(0);
			expect(checkBrackets(['(x+1)(x-1)'])).toHaveLength(0);
			expect(checkBrackets(['(a+b)^2'])).toHaveLength(0);
		});
	});

	describe('Brackets in Fractions and Exponents (Violations)', () => {
		it('should detect brackets in fraction numerator', () => {
			expect(checkBrackets(['\\frac{(x+1)}{2}'])).toEqual([0]);
		});

		it('should detect brackets in fraction denominator', () => {
			expect(checkBrackets(['\\frac{2}{(x+1)}'])).toEqual([0]);
		});

		it('should detect brackets in exponent', () => {
			expect(checkBrackets(['x^{(n+1)}'])).toEqual([0]);
		});

		it('should accept expressions without unnecessary brackets in fractions', () => {
			expect(checkBrackets(['\\frac{x+1}{2}'])).toHaveLength(0);
			expect(checkBrackets(['\\frac{2}{x+1}'])).toHaveLength(0);
		});

		it('should accept expressions without unnecessary brackets in exponents', () => {
			expect(checkBrackets(['x^{n+1}'])).toHaveLength(0);
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
		it('should detect single elements in \\left( \\right)', () => {
			expect(checkBrackets(['\\left(5\\right)'])).toEqual([0]);
			expect(checkBrackets(['\\left(x\\right)'])).toEqual([0]);
		});

		it('should detect global brackets with \\left( \\right)', () => {
			expect(checkBrackets(['\\left(x+1\\right)'])).toEqual([0]);
		});

		it('should accept \\left( \\right) when used for grouping', () => {
			expect(checkBrackets(['2\\left(x+1\\right)'])).toHaveLength(0);
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
			// (x+1) alone = global brackets, (5) = single element, (a+b) alone = global brackets, (x) = single element
			const result = checkBrackets(['(x+1)', '(5)', '(a+b)', '(x)']);
			expect(result).toEqual([0, 1, 2, 3]);
		});

		it('should return empty array when all answers are correct', () => {
			// All brackets here are used for grouping (not global)
			const result = checkBrackets(['2(x+1)', '2(a-b)', '(a+b)(c+d)']);
			expect(result).toHaveLength(0);
		});

		it('should detect global brackets among mixed answers', () => {
			// (x+1) alone is violation, others are OK
			const result = checkBrackets(['(x+1)', '2(a-b)', '(a+b)(c+d)']);
			expect(result).toEqual([0]);
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
	describe('Basic Detection - Addition', () => {
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

	describe('Basic Detection - Subtraction', () => {
		it('should detect x-0 (subtracting zero)', () => {
			expect(checkNullTerms(['x-0'])).toEqual([0]);
		});

		it('should detect a-0+b (subtracting zero in middle)', () => {
			expect(checkNullTerms(['a-0+b'])).toEqual([0]);
		});

		it('should accept x-1 (subtracting non-zero)', () => {
			expect(checkNullTerms(['x-1'])).toHaveLength(0);
		});

		it('should detect 0-x (zero as first term is still a null term)', () => {
			// 0-x is equivalent to -x, so the 0 is unnecessary
			expect(checkNullTerms(['0-x'])).toEqual([0]);
		});
	});

	describe('Nested Expressions', () => {
		it('should detect null term in nested expression', () => {
			expect(checkNullTerms(['(x+0)+y'])).toEqual([0]);
			expect(checkNullTerms(['x+(0+y)'])).toEqual([0]);
		});

		it('should detect subtraction of zero in nested expression', () => {
			expect(checkNullTerms(['(x-0)+y'])).toEqual([0]);
		});

		it('should detect null term inside multiplication', () => {
			expect(checkNullTerms(['4*(x+0)'])).toEqual([0]);
			expect(checkNullTerms(['(x+0)*4'])).toEqual([0]);
			expect(checkNullTerms(['a*(b+0)*c'])).toEqual([0]);
		});

		it('should detect null term inside fractions', () => {
			expect(checkNullTerms(['\\frac{x+0}{2}'])).toEqual([0]);
			expect(checkNullTerms(['\\frac{2}{x+0}'])).toEqual([0]);
		});

		it('should detect null term inside exponents', () => {
			expect(checkNullTerms(['(a+0)^2'])).toEqual([0]);
		});

		it('should detect null term inside sqrt', () => {
			expect(checkNullTerms(['\\sqrt{x+0}'])).toEqual([0]);
		});

		it('should not detect violation without null term in nested expressions', () => {
			expect(checkNullTerms(['4*(x+1)'])).toHaveLength(0);
			expect(checkNullTerms(['\\frac{x+1}{2}'])).toHaveLength(0);
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

		it('should handle null/undefined in array gracefully', () => {
			expect(checkNullTerms([null as unknown as string])).toHaveLength(0);
			expect(checkNullTerms([undefined as unknown as string])).toHaveLength(0);
		});

		it('should handle empty array', () => {
			expect(checkNullTerms([])).toHaveLength(0);
		});
	});

	describe('Negative Zero Cases', () => {
		it('should detect x+(-0) as null term', () => {
			expect(checkNullTerms(['x+(-0)'])).toEqual([0]);
		});

		it('should detect (-0)+x as null term', () => {
			expect(checkNullTerms(['(-0)+x'])).toEqual([0]);
		});

		it('should detect x-(-0) as null term', () => {
			expect(checkNullTerms(['x-(-0)'])).toEqual([0]);
		});
	});

	describe('Decimal Zero Cases', () => {
		it('should detect x+0.0 as null term', () => {
			expect(checkNullTerms(['x+0.0'])).toEqual([0]);
		});

		it('should detect x+0.00 as null term', () => {
			expect(checkNullTerms(['x+0.00'])).toEqual([0]);
		});

		it('should detect 0.0+x as null term', () => {
			expect(checkNullTerms(['0.0+x'])).toEqual([0]);
		});

		it('should detect x-0.0 as null term', () => {
			expect(checkNullTerms(['x-0.0'])).toEqual([0]);
		});
	});

	describe('Multiple Zeros', () => {
		it('should detect 0+0 as null term', () => {
			expect(checkNullTerms(['0+0'])).toEqual([0]);
		});

		it('should detect x+0+0 (multiple null terms)', () => {
			expect(checkNullTerms(['x+0+0'])).toEqual([0]);
		});

		it('should detect 0+0+x (zeros at start)', () => {
			expect(checkNullTerms(['0+0+x'])).toEqual([0]);
		});
	});

	describe('Deeply Nested Expressions', () => {
		it('should detect null term in double parentheses', () => {
			expect(checkNullTerms(['((x+0))'])).toEqual([0]);
		});

		it('should detect null term in nested fractions', () => {
			expect(checkNullTerms(['\\frac{\\frac{x+0}{2}}{3}'])).toEqual([0]);
			expect(checkNullTerms(['\\frac{1}{\\frac{x+0}{2}}'])).toEqual([0]);
		});

		it('should detect null term deeply nested in multiplication', () => {
			expect(checkNullTerms(['a*b*(c*(d+0))'])).toEqual([0]);
		});

		it('should detect null term in exponent base and exponent', () => {
			expect(checkNullTerms(['(x+0)^{y+0}'])).toEqual([0]);
			expect(checkNullTerms(['x^{y+0}'])).toEqual([0]);
		});
	});

	describe('Greek Letters and Subscripts', () => {
		it('should detect null term with greek letters', () => {
			expect(checkNullTerms(['\\alpha+0'])).toEqual([0]);
			expect(checkNullTerms(['0+\\beta'])).toEqual([0]);
			expect(checkNullTerms(['\\gamma-0'])).toEqual([0]);
		});

		it('should detect null term with subscripted variables', () => {
			expect(checkNullTerms(['x_1+0'])).toEqual([0]);
			expect(checkNullTerms(['x_{12}+0'])).toEqual([0]);
			expect(checkNullTerms(['a_n-0'])).toEqual([0]);
		});

		it('should accept greek letters without null terms', () => {
			expect(checkNullTerms(['\\alpha+\\beta'])).toHaveLength(0);
			expect(checkNullTerms(['x_1+x_2'])).toHaveLength(0);
		});
	});

	describe('Functions with Null Terms', () => {
		it('should detect null term inside sin', () => {
			expect(checkNullTerms(['\\sin(x+0)'])).toEqual([0]);
		});

		it('should detect null term inside cos', () => {
			expect(checkNullTerms(['\\cos(x+0)'])).toEqual([0]);
		});

		it('should detect null term inside log', () => {
			expect(checkNullTerms(['\\log(x+0)'])).toEqual([0]);
			expect(checkNullTerms(['\\ln(x+0)'])).toEqual([0]);
		});

		it('should detect null term inside exp', () => {
			expect(checkNullTerms(['\\exp(x+0)'])).toEqual([0]);
			expect(checkNullTerms(['e^{x+0}'])).toEqual([0]);
		});

		it('should accept functions without null terms', () => {
			expect(checkNullTerms(['\\sin(x+1)'])).toHaveLength(0);
			expect(checkNullTerms(['\\log(x)'])).toHaveLength(0);
		});
	});

	describe('Absolute Value and Other Delimiters', () => {
		it('should detect null term inside absolute value', () => {
			expect(checkNullTerms(['|x+0|'])).toEqual([0]);
			expect(checkNullTerms(['\\left|x+0\\right|'])).toEqual([0]);
		});

		it('should accept delimiters without null terms', () => {
			expect(checkNullTerms(['|x+1|'])).toHaveLength(0);
		});
	});

	describe('Complex Expressions', () => {
		it('should detect null term in polynomial', () => {
			expect(checkNullTerms(['x^2+2x+0'])).toEqual([0]);
			expect(checkNullTerms(['0+x^2+2x'])).toEqual([0]);
		});

		it('should detect null term in mixed operations', () => {
			expect(checkNullTerms(['x*y+0'])).toEqual([0]);
			expect(checkNullTerms(['\\frac{x}{y}+0'])).toEqual([0]);
			expect(checkNullTerms(['x^2+0'])).toEqual([0]);
		});

		it('should detect null term in expression with multiple operations', () => {
			expect(checkNullTerms(['2x+3y-0+z'])).toEqual([0]);
			expect(checkNullTerms(['a*b+c*d+0'])).toEqual([0]);
		});

		it('should accept complex expressions without null terms', () => {
			expect(checkNullTerms(['x^2+2x+1'])).toHaveLength(0);
			expect(checkNullTerms(['a*b+c*d'])).toHaveLength(0);
			expect(checkNullTerms(['\\frac{x+1}{y+2}'])).toHaveLength(0);
		});
	});

	describe('LaTeX Variations', () => {
		it('should handle \\left( and \\right) delimiters', () => {
			expect(checkNullTerms(['\\left(x+0\\right)'])).toEqual([0]);
			expect(checkNullTerms(['\\left(x+0\\right)+y'])).toEqual([0]);
		});

		it('should handle spaces in LaTeX', () => {
			expect(checkNullTerms(['x + 0'])).toEqual([0]);
			expect(checkNullTerms(['x  +  0'])).toEqual([0]);
			expect(checkNullTerms(['0 - x'])).toEqual([0]);
		});

		it('should handle cdot multiplication with null term', () => {
			expect(checkNullTerms(['a\\cdot(b+0)'])).toEqual([0]);
		});

		it('should handle times multiplication with null term', () => {
			expect(checkNullTerms(['a\\times(b+0)'])).toEqual([0]);
		});
	});

	describe('Should NOT Detect (Valid Expressions)', () => {
		it('should not flag zero in multiplication (different constraint)', () => {
			// 0*x is a factor zero issue, not a null term issue
			expect(checkNullTerms(['0*x'])).toHaveLength(0);
			expect(checkNullTerms(['x*0'])).toHaveLength(0);
		});

		it('should not flag zero in division', () => {
			expect(checkNullTerms(['0/x'])).toHaveLength(0);
			expect(checkNullTerms(['\\frac{0}{x}'])).toHaveLength(0);
		});

		it('should not flag zero as exponent', () => {
			expect(checkNullTerms(['x^0'])).toHaveLength(0);
		});

		it('should not flag standalone zero', () => {
			expect(checkNullTerms(['0'])).toHaveLength(0);
			expect(checkNullTerms(['-0'])).toHaveLength(0);
		});

		it('should not flag numbers containing digit 0', () => {
			expect(checkNullTerms(['x+10'])).toHaveLength(0);
			expect(checkNullTerms(['x+100'])).toHaveLength(0);
			expect(checkNullTerms(['x+0.5'])).toHaveLength(0);
			expect(checkNullTerms(['x+1.05'])).toHaveLength(0);
		});

		it('should not flag valid polynomial coefficients', () => {
			expect(checkNullTerms(['x^2+0x+1'])).toHaveLength(0); // 0x is multiplication, not addition
		});
	});

	describe('Malformed LaTeX', () => {
		it('should handle unclosed parentheses gracefully', () => {
			// Should not crash, just skip invalid LaTeX
			expect(() => checkNullTerms(['(x+0'])).not.toThrow();
			expect(() => checkNullTerms(['x+0)'])).not.toThrow();
		});

		it('should handle incomplete fractions gracefully', () => {
			expect(() => checkNullTerms(['\\frac{x+0}'])).not.toThrow();
			expect(() => checkNullTerms(['\\frac{}{x+0}'])).not.toThrow();
		});

		it('should handle random text gracefully', () => {
			expect(() => checkNullTerms(['hello world'])).not.toThrow();
			expect(checkNullTerms(['hello world'])).toHaveLength(0);
		});
	});
});

// ============================================================================
// FACTOR ONE VALIDATOR TESTS (Compute Engine based)
// ============================================================================

describe('checkFactorOne', () => {
	describe('Basic Detection - Explicit Multiplication', () => {
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

	describe('Implicit Multiplication (1x notation)', () => {
		it('should detect 1x (implicit factor one)', () => {
			expect(checkFactorOne(['1x'])).toEqual([0]);
		});

		it('should detect 1a (implicit factor one with letter)', () => {
			expect(checkFactorOne(['1a'])).toEqual([0]);
		});

		it('should accept 2x (not factor one)', () => {
			expect(checkFactorOne(['2x'])).toHaveLength(0);
		});

		it('should accept 10x (not factor one, coefficient is 10)', () => {
			expect(checkFactorOne(['10x'])).toHaveLength(0);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkFactorOne(['2x', '1\\times y', '3z', 'w\\times 1']);
			expect(result).toEqual([1, 3]);
		});

		it('should detect implicit 1x in multiple answers', () => {
			const result = checkFactorOne(['2x', '1x', '3y']);
			expect(result).toEqual([1]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkFactorOne([''])).toHaveLength(0);
		});

		it('should handle whitespace', () => {
			expect(checkFactorOne(['  '])).toHaveLength(0);
		});

		it('should handle null/undefined gracefully', () => {
			expect(checkFactorOne([null as unknown as string])).toHaveLength(0);
			expect(checkFactorOne([undefined as unknown as string])).toHaveLength(0);
		});

		it('should handle empty array', () => {
			expect(checkFactorOne([])).toHaveLength(0);
		});
	});

	describe('Parenthesized One', () => {
		it('should detect (1)*x as factor one', () => {
			expect(checkFactorOne(['(1)\\times x'])).toEqual([0]);
		});

		it('should detect x*(1) as factor one', () => {
			expect(checkFactorOne(['x\\times(1)'])).toEqual([0]);
		});

		it('should detect ((1))*x as factor one', () => {
			expect(checkFactorOne(['((1))\\times x'])).toEqual([0]);
		});
	});

	describe('Positive One (+1)', () => {
		it('should detect (+1)*x as factor one', () => {
			expect(checkFactorOne(['(+1)\\times x'])).toEqual([0]);
		});

		it('should detect x*(+1) as factor one', () => {
			expect(checkFactorOne(['x\\times(+1)'])).toEqual([0]);
		});
	});

	describe('Decimal One', () => {
		it('should detect 1.0*x as factor one', () => {
			expect(checkFactorOne(['1.0\\times x'])).toEqual([0]);
		});

		it('should detect 1.00*x as factor one', () => {
			expect(checkFactorOne(['1.00\\times x'])).toEqual([0]);
		});

		it('should detect x*1.0 as factor one', () => {
			expect(checkFactorOne(['x\\times 1.0'])).toEqual([0]);
		});
	});

	describe('Nested Expressions', () => {
		it('should detect factor one inside multiplication chain', () => {
			expect(checkFactorOne(['2\\times 1\\times x'])).toEqual([0]);
			expect(checkFactorOne(['a\\times 1\\times b'])).toEqual([0]);
		});

		it('should detect factor one in nested parentheses', () => {
			expect(checkFactorOne(['2\\times(1\\times x)'])).toEqual([0]);
			expect(checkFactorOne(['(1\\times x)\\times y'])).toEqual([0]);
		});

		it('should detect factor one inside fractions', () => {
			expect(checkFactorOne(['\\frac{1\\times x}{2}'])).toEqual([0]);
			expect(checkFactorOne(['\\frac{x}{1\\times y}'])).toEqual([0]);
		});

		it('should detect factor one in exponent base', () => {
			expect(checkFactorOne(['(1\\times x)^2'])).toEqual([0]);
		});
	});

	describe('Greek Letters and Subscripts', () => {
		it('should detect factor one with greek letters', () => {
			expect(checkFactorOne(['1\\times\\alpha'])).toEqual([0]);
			expect(checkFactorOne(['\\beta\\times 1'])).toEqual([0]);
			expect(checkFactorOne(['1\\alpha'])).toEqual([0]);
		});

		it('should detect factor one with subscripted variables', () => {
			expect(checkFactorOne(['1\\times x_1'])).toEqual([0]);
			expect(checkFactorOne(['1x_1'])).toEqual([0]);
			expect(checkFactorOne(['x_{12}\\times 1'])).toEqual([0]);
		});
	});

	describe('Functions', () => {
		it('should detect factor one before functions', () => {
			expect(checkFactorOne(['1\\times\\sin(x)'])).toEqual([0]);
			expect(checkFactorOne(['1\\sin(x)'])).toEqual([0]);
		});

		it('should detect factor one inside function arguments', () => {
			expect(checkFactorOne(['\\sin(1\\times x)'])).toEqual([0]);
		});

		it('should accept functions without factor one', () => {
			expect(checkFactorOne(['2\\sin(x)'])).toHaveLength(0);
			expect(checkFactorOne(['\\sin(2x)'])).toHaveLength(0);
		});
	});

	describe('Complex Expressions', () => {
		it('should detect factor one in polynomial terms', () => {
			expect(checkFactorOne(['1\\times x^2+2x'])).toEqual([0]);
			expect(checkFactorOne(['x^2+1\\times x'])).toEqual([0]);
		});

		it('should detect factor one in mixed operations', () => {
			expect(checkFactorOne(['(1\\times x)+y'])).toEqual([0]);
			expect(checkFactorOne(['a-(1\\times b)'])).toEqual([0]);
		});

		it('should accept complex expressions without factor one', () => {
			expect(checkFactorOne(['2x^2+3x+4'])).toHaveLength(0);
			expect(checkFactorOne(['a\\times b+c\\times d'])).toHaveLength(0);
		});
	});

	describe('LaTeX Variations', () => {
		it('should handle spaces in LaTeX', () => {
			expect(checkFactorOne(['1 \\times x'])).toEqual([0]);
			expect(checkFactorOne(['x \\times 1'])).toEqual([0]);
		});

		it('should handle \\left( and \\right) delimiters', () => {
			expect(checkFactorOne(['\\left(1\\right)\\times x'])).toEqual([0]);
		});

		it('should handle cdot and times equally', () => {
			expect(checkFactorOne(['1\\cdot x'])).toEqual([0]);
			expect(checkFactorOne(['1\\times x'])).toEqual([0]);
		});
	});

	describe('Should NOT Detect (Valid Expressions)', () => {
		it('should not flag 1+x (addition, not multiplication)', () => {
			expect(checkFactorOne(['1+x'])).toHaveLength(0);
			expect(checkFactorOne(['x+1'])).toHaveLength(0);
		});

		it('should not flag 1/x or x/1 (division)', () => {
			expect(checkFactorOne(['\\frac{1}{x}'])).toHaveLength(0);
			expect(checkFactorOne(['\\frac{x}{1}'])).toHaveLength(0);
		});

		it('should not flag x^1 (exponent)', () => {
			expect(checkFactorOne(['x^1'])).toHaveLength(0);
			expect(checkFactorOne(['x^{1}'])).toHaveLength(0);
		});

		it('should not flag numbers containing digit 1', () => {
			expect(checkFactorOne(['11x'])).toHaveLength(0);
			expect(checkFactorOne(['21x'])).toHaveLength(0);
			expect(checkFactorOne(['x\\times 11'])).toHaveLength(0);
			expect(checkFactorOne(['x\\times 21'])).toHaveLength(0);
			expect(checkFactorOne(['1.5x'])).toHaveLength(0);
		});

		it('should not flag standalone one', () => {
			expect(checkFactorOne(['1'])).toHaveLength(0);
			expect(checkFactorOne(['+1'])).toHaveLength(0);
			expect(checkFactorOne(['(1)'])).toHaveLength(0);
		});

		it('should not flag -1*x (negative one is different from factor one)', () => {
			// -1*x simplifies to -x, which is a different constraint (signs)
			expect(checkFactorOne(['-1\\times x'])).toHaveLength(0);
			expect(checkFactorOne(['(-1)x'])).toHaveLength(0);
		});
	});

	describe('Malformed LaTeX', () => {
		it('should handle unclosed parentheses gracefully', () => {
			expect(() => checkFactorOne(['(1*x'])).not.toThrow();
			expect(() => checkFactorOne(['1*x)'])).not.toThrow();
		});

		it('should handle random text gracefully', () => {
			expect(() => checkFactorOne(['hello world'])).not.toThrow();
			expect(checkFactorOne(['hello world'])).toHaveLength(0);
		});
	});
});

// ============================================================================
// FACTOR ZERO VALIDATOR TESTS (mathAST based)
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

		it('should handle whitespace', () => {
			expect(checkFactorZero(['  '])).toHaveLength(0);
		});

		it('should handle null/undefined gracefully', () => {
			expect(checkFactorZero([null as unknown as string])).toHaveLength(0);
			expect(checkFactorZero([undefined as unknown as string])).toHaveLength(0);
		});

		it('should handle empty array', () => {
			expect(checkFactorZero([])).toHaveLength(0);
		});
	});

	describe('Parenthesized Zero', () => {
		it('should detect (0)*x as factor zero', () => {
			expect(checkFactorZero(['(0)\\times x'])).toEqual([0]);
		});

		it('should detect x*(0) as factor zero', () => {
			expect(checkFactorZero(['x\\times(0)'])).toEqual([0]);
		});

		it('should detect ((0))*x as factor zero', () => {
			expect(checkFactorZero(['((0))\\times x'])).toEqual([0]);
		});
	});

	describe('Negative Zero', () => {
		it('should detect (-0)*x as factor zero', () => {
			expect(checkFactorZero(['(-0)\\times x'])).toEqual([0]);
		});

		it('should detect x*(-0) as factor zero', () => {
			expect(checkFactorZero(['x\\times(-0)'])).toEqual([0]);
		});
	});

	describe('Decimal Zero', () => {
		it('should detect 0.0*x as factor zero', () => {
			expect(checkFactorZero(['0.0\\times x'])).toEqual([0]);
		});

		it('should detect 0.00*x as factor zero', () => {
			expect(checkFactorZero(['0.00\\times x'])).toEqual([0]);
		});

		it('should detect x*0.0 as factor zero', () => {
			expect(checkFactorZero(['x\\times 0.0'])).toEqual([0]);
		});
	});

	describe('Implicit Multiplication (0x notation)', () => {
		it('should detect 0x as implicit factor zero', () => {
			expect(checkFactorZero(['0x'])).toEqual([0]);
		});

		it('should detect 0a as implicit factor zero', () => {
			expect(checkFactorZero(['0a'])).toEqual([0]);
		});
	});

	describe('Nested Expressions', () => {
		it('should detect factor zero inside multiplication chain', () => {
			expect(checkFactorZero(['2\\times 0\\times x'])).toEqual([0]);
			expect(checkFactorZero(['a\\times 0\\times b'])).toEqual([0]);
		});

		it('should detect factor zero in nested parentheses', () => {
			expect(checkFactorZero(['2\\times(0\\times x)'])).toEqual([0]);
			expect(checkFactorZero(['(0\\times x)\\times y'])).toEqual([0]);
		});

		it('should detect factor zero inside fractions', () => {
			expect(checkFactorZero(['\\frac{0\\times x}{2}'])).toEqual([0]);
			expect(checkFactorZero(['\\frac{x}{0\\times y}'])).toEqual([0]);
		});

		it('should detect factor zero in exponent base', () => {
			expect(checkFactorZero(['(0\\times x)^2'])).toEqual([0]);
		});
	});

	describe('Greek Letters and Subscripts', () => {
		it('should detect factor zero with greek letters', () => {
			expect(checkFactorZero(['0\\times\\alpha'])).toEqual([0]);
			expect(checkFactorZero(['\\beta\\times 0'])).toEqual([0]);
			expect(checkFactorZero(['0\\alpha'])).toEqual([0]);
		});

		it('should detect factor zero with subscripted variables', () => {
			expect(checkFactorZero(['0\\times x_1'])).toEqual([0]);
			expect(checkFactorZero(['0x_1'])).toEqual([0]);
			expect(checkFactorZero(['x_{12}\\times 0'])).toEqual([0]);
		});
	});

	describe('Functions', () => {
		it('should detect factor zero before functions', () => {
			expect(checkFactorZero(['0\\times\\sin(x)'])).toEqual([0]);
			expect(checkFactorZero(['0\\sin(x)'])).toEqual([0]);
		});

		it('should detect factor zero inside function arguments', () => {
			expect(checkFactorZero(['\\sin(0\\times x)'])).toEqual([0]);
		});

		it('should accept functions without factor zero', () => {
			expect(checkFactorZero(['2\\sin(x)'])).toHaveLength(0);
			expect(checkFactorZero(['\\sin(2x)'])).toHaveLength(0);
		});
	});

	describe('Complex Expressions', () => {
		it('should detect factor zero in polynomial terms', () => {
			expect(checkFactorZero(['0\\times x^2+2x'])).toEqual([0]);
			expect(checkFactorZero(['x^2+0\\times x'])).toEqual([0]);
		});

		it('should detect factor zero in mixed operations', () => {
			expect(checkFactorZero(['(0\\times x)+y'])).toEqual([0]);
			expect(checkFactorZero(['a-(0\\times b)'])).toEqual([0]);
		});

		it('should accept complex expressions without factor zero', () => {
			expect(checkFactorZero(['2x^2+3x+4'])).toHaveLength(0);
			expect(checkFactorZero(['a\\times b+c\\times d'])).toHaveLength(0);
		});
	});

	describe('LaTeX Variations', () => {
		it('should handle spaces in LaTeX', () => {
			expect(checkFactorZero(['0 \\times x'])).toEqual([0]);
			expect(checkFactorZero(['x \\times 0'])).toEqual([0]);
		});

		it('should handle \\left( and \\right) delimiters', () => {
			expect(checkFactorZero(['\\left(0\\right)\\times x'])).toEqual([0]);
		});

		it('should handle cdot and times equally', () => {
			expect(checkFactorZero(['0\\cdot x'])).toEqual([0]);
			expect(checkFactorZero(['0\\times x'])).toEqual([0]);
		});
	});

	describe('Should NOT Detect (Valid Expressions)', () => {
		it('should not flag 0+x (addition, not multiplication)', () => {
			expect(checkFactorZero(['0+x'])).toHaveLength(0);
			expect(checkFactorZero(['x+0'])).toHaveLength(0);
		});

		it('should not flag 0/x (division)', () => {
			expect(checkFactorZero(['\\frac{0}{x}'])).toHaveLength(0);
		});

		it('should not flag x^0 (exponent)', () => {
			expect(checkFactorZero(['x^0'])).toHaveLength(0);
			expect(checkFactorZero(['x^{0}'])).toHaveLength(0);
		});

		it('should not flag numbers containing digit 0', () => {
			expect(checkFactorZero(['10x'])).toHaveLength(0);
			expect(checkFactorZero(['20x'])).toHaveLength(0);
			expect(checkFactorZero(['x\\times 10'])).toHaveLength(0);
			expect(checkFactorZero(['x\\times 20'])).toHaveLength(0);
			expect(checkFactorZero(['0.5x'])).toHaveLength(0);
		});

		it('should not flag standalone zero', () => {
			expect(checkFactorZero(['0'])).toHaveLength(0);
			expect(checkFactorZero(['-0'])).toHaveLength(0);
			expect(checkFactorZero(['(0)'])).toHaveLength(0);
		});
	});

	describe('Malformed LaTeX', () => {
		it('should handle unclosed parentheses gracefully', () => {
			expect(() => checkFactorZero(['(0*x'])).not.toThrow();
			expect(() => checkFactorZero(['0*x)'])).not.toThrow();
		});

		it('should handle random text gracefully', () => {
			expect(() => checkFactorZero(['hello world'])).not.toThrow();
			expect(checkFactorZero(['hello world'])).toHaveLength(0);
		});
	});
});

// ============================================================================
// SIGNS VALIDATOR TESTS
// ============================================================================

describe('checkSigns', () => {
	describe('Double Signs (regex-based)', () => {
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

	describe('Leading Plus Before Variable (regex-based)', () => {
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

	describe('Sign Parity in Multiplication (CE-based)', () => {
		it('should detect (-2)*(-3) - two negatives can be simplified', () => {
			expect(checkSigns(['(-2)\\times(-3)'])).toEqual([0]);
		});

		it('should detect (-a)*(-b) - variable negatives', () => {
			expect(checkSigns(['(-a)\\times(-b)'])).toEqual([0]);
		});

		it('should detect 5*(-2)*(-3) - two negatives in chain', () => {
			expect(checkSigns(['5\\times(-2)\\times(-3)'])).toEqual([0]);
		});

		it('should detect (-x)(-y) - implicit multiplication', () => {
			expect(checkSigns(['(-x)(-y)'])).toEqual([0]);
		});

		it('should detect (-2)*3 - negative factor should be extracted', () => {
			// (-2)*3 should be written as -(2*3) or -2×3 with sign outside
			expect(checkSigns(['(-2)\\times 3'])).toEqual([0]);
		});

		it('should detect 5*(-2) - negative factor should be extracted', () => {
			// 5*(-2) should be written as -(5*2)
			expect(checkSigns(['5\\times(-2)'])).toEqual([0]);
		});

		it('should detect -2*3 - negative factor in product', () => {
			// -2*3 is parsed as (-2)*3, sign should be outside: -(2*3)
			expect(checkSigns(['-2\\times 3'])).toEqual([0]);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkSigns(['x+y', 'x++z', 'a-b', '+c']);
			expect(result).toEqual([1, 3]);
		});

		it('should detect sign parity violations in multiple answers', () => {
			const result = checkSigns(['2x', '(-a)(-b)', '3y']);
			expect(result).toEqual([1]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkSigns([''])).toHaveLength(0);
		});

		it('should handle whitespace', () => {
			expect(checkSigns(['  '])).toHaveLength(0);
		});

		it('should detect leading plus on numbers', () => {
			// +5 is redundant (equals 5), so it's a violation
			expect(checkSigns(['+5'])).toEqual([0]);
		});
	});
});

// ============================================================================
// REDUCED FRACTIONS VALIDATOR TESTS
// ============================================================================

describe('checkReducedFractions', () => {
	describe('Non-reduced Fractions - Should Flag', () => {
		it('should detect simple non-reduced fraction 2/4', () => {
			expect(checkReducedFractions(['\\frac{2}{4}'])).toEqual([0]);
		});

		it('should detect 6/9 as non-reduced', () => {
			expect(checkReducedFractions(['\\frac{6}{9}'])).toEqual([0]);
		});

		it('should detect 10/5 as non-reduced (simplifies to integer)', () => {
			expect(checkReducedFractions(['\\frac{10}{5}'])).toEqual([0]);
		});

		it('should detect negative non-reduced fraction -4/6', () => {
			expect(checkReducedFractions(['\\frac{-4}{6}'])).toEqual([0]);
		});

		it('should detect fraction with negative denominator 4/-6', () => {
			expect(checkReducedFractions(['\\frac{4}{-6}'])).toEqual([0]);
		});

		it('should detect 4/8 as non-reduced', () => {
			expect(checkReducedFractions(['\\frac{4}{8}'])).toEqual([0]);
		});

		it('should detect 12/18 as non-reduced', () => {
			expect(checkReducedFractions(['\\frac{12}{18}'])).toEqual([0]);
		});
	});

	describe('Reduced Fractions - Should Accept', () => {
		it('should accept already reduced fraction 1/2', () => {
			expect(checkReducedFractions(['\\frac{1}{2}'])).toHaveLength(0);
		});

		it('should accept already reduced fraction 3/7', () => {
			expect(checkReducedFractions(['\\frac{3}{7}'])).toHaveLength(0);
		});

		it('should accept 2/3 as reduced', () => {
			expect(checkReducedFractions(['\\frac{2}{3}'])).toHaveLength(0);
		});

		it('should accept 5/7 as reduced', () => {
			expect(checkReducedFractions(['\\frac{5}{7}'])).toHaveLength(0);
		});

		it('should accept negative reduced fraction -2/3', () => {
			expect(checkReducedFractions(['\\frac{-2}{3}'])).toHaveLength(0);
		});

		it('should flag 1/1 as reducible (equals 1)', () => {
			// 1/1 can be simplified to 1, so it's not in reduced form
			expect(checkReducedFractions(['\\frac{1}{1}'])).toEqual([0]);
		});
	});

	describe('Non-Fraction Inputs - Should Accept', () => {
		it('should accept integer (not a fraction)', () => {
			expect(checkReducedFractions(['2'])).toHaveLength(0);
		});

		it('should accept variable (not a fraction)', () => {
			expect(checkReducedFractions(['x'])).toHaveLength(0);
		});

		it('should accept decimal', () => {
			expect(checkReducedFractions(['0.5'])).toHaveLength(0);
		});

		it('should accept expression without fractions', () => {
			expect(checkReducedFractions(['x + 2'])).toHaveLength(0);
		});
	});

	describe('Fractions with Variables', () => {
		it('should detect non-reduced coefficient 2x/4', () => {
			expect(checkReducedFractions(['\\frac{2x}{4}'])).toEqual([0]);
		});

		it('should accept fraction with irreducible variable x/2', () => {
			expect(checkReducedFractions(['\\frac{x}{2}'])).toHaveLength(0);
		});

		it('should accept x/y (variables with no common factor)', () => {
			expect(checkReducedFractions(['\\frac{x}{y}'])).toHaveLength(0);
		});
	});

	describe('Multiple Answers', () => {
		it('should check all answers and return violating indices', () => {
			const result = checkReducedFractions([
				'\\frac{1}{2}', // reduced - OK
				'\\frac{2}{4}', // NOT reduced - violation
				'\\frac{3}{5}', // reduced - OK
				'\\frac{6}{9}' // NOT reduced - violation
			]);
			expect(result).toEqual([1, 3]);
		});

		it('should return empty array when all fractions are reduced', () => {
			const result = checkReducedFractions(['\\frac{1}{2}', '\\frac{2}{3}', '\\frac{3}{7}']);
			expect(result).toHaveLength(0);
		});

		it('should flag all indices when no fractions are reduced', () => {
			const result = checkReducedFractions(['\\frac{2}{4}', '\\frac{4}{6}']);
			expect(result).toEqual([0, 1]);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkReducedFractions([''])).toHaveLength(0);
		});

		it('should handle whitespace', () => {
			expect(checkReducedFractions(['  '])).toHaveLength(0);
		});

		it('should handle expressions containing fractions', () => {
			// x + 2/4 contains a non-reduced fraction
			expect(checkReducedFractions(['x + \\frac{2}{4}'])).toEqual([0]);
		});

		it('should accept expressions with reduced fractions', () => {
			expect(checkReducedFractions(['x + \\frac{1}{2}'])).toHaveLength(0);
		});
	});
});
