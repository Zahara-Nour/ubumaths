/**
 * Tests for cosmetic AST transformers and unified checkForm pipeline
 */

import { describe, it, expect } from 'vitest';
import {
	removeZeros,
	checkSpacesViolation,
	removeSpaces,
	reduceFractionsAST,
	simplifyNullProductsAST,
	removeNullTermsAST,
	removeFactorsOneAST,
	removeSignsAST,
	removeMultOperatorAST,
	sortTermsAndFactorsAST,
	stripUnnecessaryBracketsAST,
	checkForm
} from '../cosmetic-transforms';
import { parseLatex } from '../parser';
import { toLatex } from '../latex-generator';
import {
	number,
	variable,
	add,
	subtract,
	multiply,
	divide,
	opposite,
	positive,
	fraction,
	parentheses
} from '../factory';

// Helper: parse LaTeX, apply transformer, return LaTeX
function transformLatex(
	latex: string,
	transformer: (ast: import('../types').MathNode) => import('../types').MathNode
): string {
	const ast = parseLatex(latex);
	const result = transformer(ast);
	return toLatex(result);
}

// =============================================================================
// removeZeros (string → string)
// =============================================================================

describe('removeZeros', () => {
	it('removes leading zeros', () => {
		expect(removeZeros('01')).toBe('1');
		expect(removeZeros('007')).toBe('7');
		expect(removeZeros('00')).toBe('0');
	});

	it('preserves zero before decimal', () => {
		expect(removeZeros('0.5')).toBe('0.5');
	});

	it('removes trailing decimal zeros', () => {
		expect(removeZeros('1.0')).toBe('1');
		expect(removeZeros('1.20')).toBe('1.2');
		expect(removeZeros('1.200')).toBe('1.2');
	});

	it('preserves meaningful interior zeros', () => {
		expect(removeZeros('1.02')).toBe('1.02');
		expect(removeZeros('100')).toBe('100');
	});

	it('handles negative numbers', () => {
		expect(removeZeros('-01')).toBe('-1');
		expect(removeZeros('-1.0')).toBe('-1');
	});

	it('leaves clean numbers unchanged', () => {
		expect(removeZeros('42')).toBe('42');
		expect(removeZeros('3.14')).toBe('3.14');
	});
});

// =============================================================================
// checkSpacesViolation (string → boolean)
// =============================================================================

describe('checkSpacesViolation', () => {
	it('returns false for 3 digits or fewer', () => {
		expect(checkSpacesViolation('123')).toBe(false);
		expect(checkSpacesViolation('42')).toBe(false);
	});

	it('returns true for 4+ digits without spacing', () => {
		expect(checkSpacesViolation('1234')).toBe(true);
		expect(checkSpacesViolation('12345')).toBe(true);
	});

	it('returns false for correctly spaced numbers', () => {
		expect(checkSpacesViolation('1 234')).toBe(false);
		expect(checkSpacesViolation('12 345')).toBe(false);
		expect(checkSpacesViolation('1\\,234')).toBe(false);
	});

	it('returns true for 4+ decimal digits without spacing', () => {
		expect(checkSpacesViolation('0.1234')).toBe(true);
	});

	it('returns false for correctly spaced decimals', () => {
		expect(checkSpacesViolation('0.123 4')).toBe(false);
	});
});

// =============================================================================
// removeSpaces (string → string)
// =============================================================================

describe('removeSpaces', () => {
	it('removes LaTeX thin spaces', () => {
		expect(removeSpaces('1\\,234')).toBe('1234');
	});

	it('removes grouping spaces between digits', () => {
		expect(removeSpaces('1 234')).toBe('1234');
		expect(removeSpaces('12 345 678')).toBe('12345678');
	});
});

// =============================================================================
// reduceFractionsAST
// =============================================================================

describe('reduceFractionsAST', () => {
	it('reduces 4/6 to 2/3', () => {
		const result = transformLatex('\\frac{4}{6}', reduceFractionsAST);
		// toLatex uses \dfrac for fraction displayStyle
		expect(result).toBe('\\dfrac{2}{3}');
	});

	it('reduces 6/3 to 2', () => {
		const result = transformLatex('\\frac{6}{3}', reduceFractionsAST);
		expect(result).toBe('2');
	});

	it('leaves already reduced fractions alone', () => {
		const result = transformLatex('\\frac{3}{7}', reduceFractionsAST);
		expect(result).toBe('\\dfrac{3}{7}');
	});

	it('handles negative fractions', () => {
		const result = transformLatex('\\frac{-4}{6}', reduceFractionsAST);
		expect(result).toBe('-\\dfrac{2}{3}');
	});

	it('reduces monomial fraction 2x/4 to x/2', () => {
		const ast = fraction(multiply(number('2'), variable('x'), 'implicit'), number('4'));
		const result = toLatex(reduceFractionsAST(ast));
		expect(result).toBe('\\dfrac{x}{2}');
	});

	it('reduces monomial fraction 4x/6 to 2x/3', () => {
		const ast = fraction(multiply(number('4'), variable('x'), 'implicit'), number('6'));
		const result = toLatex(reduceFractionsAST(ast));
		expect(result).toBe('\\dfrac{2 x}{3}');
	});
});

// =============================================================================
// simplifyNullProductsAST
// =============================================================================

describe('simplifyNullProductsAST', () => {
	it('simplifies 0 * x to 0', () => {
		const result = transformLatex('0\\times x', simplifyNullProductsAST);
		expect(result).toBe('0');
	});

	it('simplifies x * 0 to 0', () => {
		const result = transformLatex('x\\times 0', simplifyNullProductsAST);
		expect(result).toBe('0');
	});

	it('does not touch 0 + x', () => {
		const result = transformLatex('0+x', simplifyNullProductsAST);
		expect(result).toBe('0 + x');
	});
});

// =============================================================================
// removeNullTermsAST
// =============================================================================

describe('removeNullTermsAST', () => {
	it('removes x + 0 → x', () => {
		const result = transformLatex('x+0', removeNullTermsAST);
		expect(result).toBe('x');
	});

	it('removes 0 + x → x', () => {
		const result = transformLatex('0+x', removeNullTermsAST);
		expect(result).toBe('x');
	});

	it('does not touch 0 * x', () => {
		const result = transformLatex('0\\times x', removeNullTermsAST);
		expect(result).toBe('0 \\times x');
	});

	it('handles 0 - x', () => {
		const result = transformLatex('0-x', removeNullTermsAST);
		expect(result).toBe('-x');
	});
});

// =============================================================================
// removeFactorsOneAST
// =============================================================================

describe('removeFactorsOneAST', () => {
	it('removes 1 × x → x', () => {
		const result = transformLatex('1\\times x', removeFactorsOneAST);
		expect(result).toBe('x');
	});

	it('removes x × 1 → x', () => {
		const result = transformLatex('x\\times 1', removeFactorsOneAST);
		expect(result).toBe('x');
	});

	it('simplifies 1 × 1 → 1', () => {
		const result = transformLatex('1\\times 1', removeFactorsOneAST);
		expect(result).toBe('1');
	});

	it('does not touch -1 × x', () => {
		// -1 is not isOneNode, so it stays
		const ast = multiply(opposite(number('1')), variable('x'), 'cross');
		const result = toLatex(removeFactorsOneAST(ast));
		expect(result).toContain('x');
	});
});

// =============================================================================
// removeSignsAST
// =============================================================================

describe('removeSignsAST', () => {
	// --- Double negative ---

	it('removes double negative: -(-x) → x', () => {
		const ast = opposite(opposite(variable('x')));
		const result = toLatex(removeSignsAST(ast));
		expect(result).toBe('x');
	});

	it('removes opposite wrapping delimiter wrapping opposite: -((-x)) → x', () => {
		const ast = opposite(parentheses(opposite(variable('x'))));
		const result = toLatex(removeSignsAST(ast));
		expect(result).toBe('x');
	});

	// --- Positive sign ---

	it('removes positive sign: +x → x', () => {
		const ast = positive(variable('x'));
		const result = toLatex(removeSignsAST(ast));
		expect(result).toBe('x');
	});

	// --- Addition ---

	it('converts x+(-y) to x-y', () => {
		const ast = add(variable('x'), parentheses(opposite(variable('y'))));
		const result = toLatex(removeSignsAST(ast));
		expect(result).toBe('x - y');
	});

	it('does NOT transform (-a)+b (would reorder terms)', () => {
		const ast = add(parentheses(opposite(variable('a'))), variable('b'));
		const result = removeSignsAST(ast);
		// Should remain an addition with left side unchanged
		expect(result.type).toBe('addition');
	});

	it('converts (-a)+(-b) → (-a)-b (only right negative stripped)', () => {
		const ast = add(parentheses(opposite(variable('a'))), parentheses(opposite(variable('b'))));
		const result = removeSignsAST(ast);
		// Right negative removed → subtraction, left stays as (-a)
		expect(result.type).toBe('subtraction');
		const latex = toLatex(result);
		expect(latex).not.toContain('+');
	});

	// --- Subtraction ---

	it('converts x-(-y) to x+y', () => {
		const ast = subtract(variable('x'), parentheses(opposite(variable('y'))));
		const result = toLatex(removeSignsAST(ast));
		expect(result).toBe('x + y');
	});

	// --- Multiplication ---

	it('converts (-a)*b → -a*b (no parentheses)', () => {
		const ast = multiply(parentheses(opposite(variable('a'))), variable('b'), 'dot');
		const result = removeSignsAST(ast);
		const latex = toLatex(result);
		expect(latex).not.toContain('\\left(');
		expect(latex).not.toContain('\\right)');
	});

	it('converts a*(-b) → -a*b (no parentheses)', () => {
		const ast = multiply(variable('a'), parentheses(opposite(variable('b'))), 'dot');
		const result = removeSignsAST(ast);
		const latex = toLatex(result);
		expect(latex).not.toContain('\\left(');
		expect(latex).not.toContain('\\right)');
	});

	it('converts (-a)*(-b) → a*b (no parentheses)', () => {
		const ast = multiply(
			parentheses(opposite(variable('a'))),
			parentheses(opposite(variable('b'))),
			'dot'
		);
		const result = removeSignsAST(ast);
		const latex = toLatex(result);
		expect(latex).not.toContain('\\left(');
		expect(latex).not.toContain('\\right)');
		expect(latex).not.toContain('-');
	});

	// --- Division ---

	it('converts (-a)/b → -a/b (no parentheses)', () => {
		const ast = divide(parentheses(opposite(variable('a'))), variable('b'), 'fraction');
		const result = removeSignsAST(ast);
		const latex = toLatex(result);
		expect(latex).not.toContain('\\left(');
		expect(latex).not.toContain('\\right)');
	});

	it('converts a/(-b) → -a/b (no parentheses)', () => {
		const ast = divide(variable('a'), parentheses(opposite(variable('b'))), 'fraction');
		const result = removeSignsAST(ast);
		const latex = toLatex(result);
		expect(latex).not.toContain('\\left(');
		expect(latex).not.toContain('\\right)');
	});

	it('converts (-a)/(-b) → a/b (no parentheses)', () => {
		const ast = divide(
			parentheses(opposite(variable('a'))),
			parentheses(opposite(variable('b'))),
			'fraction'
		);
		const result = removeSignsAST(ast);
		const latex = toLatex(result);
		expect(latex).not.toContain('\\left(');
		expect(latex).not.toContain('\\right)');
		expect(latex).not.toContain('-');
	});
});

// =============================================================================
// stripUnnecessaryBracketsAST (re-export)
// =============================================================================

describe('stripUnnecessaryBracketsAST', () => {
	it('strips (x) → x', () => {
		const result = transformLatex('\\left(x\\right)', stripUnnecessaryBracketsAST);
		expect(result).toBe('x');
	});

	// --- Higher precedence in lower precedence parent: STRIP ---

	it('strips (a*b)+c → a*b+c', () => {
		const result = transformLatex('\\left(a\\times b\\right)+c', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips a+(b*c) → a+b*c', () => {
		const result = transformLatex('a+\\left(b\\times c\\right)', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips (x^2)+1 → x^2+1', () => {
		const result = transformLatex('\\left(x^{2}\\right)+1', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips (x^2)*y → x^2*y', () => {
		const result = transformLatex('\\left(x^{2}\\right)\\times y', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips (a*b)-c → a*b-c', () => {
		const result = transformLatex('\\left(a\\times b\\right)-c', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips a-(b*c) → a-b*c', () => {
		const result = transformLatex('a-\\left(b\\times c\\right)', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips both in (a*b)+(c*d)', () => {
		const result = transformLatex(
			'\\left(a\\times b\\right)+\\left(c\\times d\\right)',
			stripUnnecessaryBracketsAST
		);
		expect(result).not.toContain('\\left(');
	});

	it('strips the user case: (2*100)+(4*10)+2', () => {
		const result = transformLatex(
			'\\left(2\\times 100\\right)+\\left(4\\times 10\\right)+2',
			stripUnnecessaryBracketsAST
		);
		expect(result).not.toContain('\\left(');
	});

	// --- Same precedence: commutative+associative → STRIP ---

	it('strips (a+b)+c → a+b+c', () => {
		const result = transformLatex('\\left(a+b\\right)+c', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips a+(b+c) → a+b+c', () => {
		const result = transformLatex('a+\\left(b+c\\right)', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips (a*b)*c → a*b*c', () => {
		const result = transformLatex(
			'\\left(a\\times b\\right)\\times c',
			stripUnnecessaryBracketsAST
		);
		expect(result).not.toContain('\\left(');
	});

	it('strips a*(b*c) → a*b*c', () => {
		const result = transformLatex(
			'a\\times \\left(b\\times c\\right)',
			stripUnnecessaryBracketsAST
		);
		expect(result).not.toContain('\\left(');
	});

	it('strips (a-b)+c → a-b+c (left of addition, same prec)', () => {
		const result = transformLatex('\\left(a-b\\right)+c', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	it('strips a+(b-c) → a+b-c (right of addition, same prec)', () => {
		const result = transformLatex('a+\\left(b-c\\right)', stripUnnecessaryBracketsAST);
		expect(result).not.toContain('\\left(');
	});

	// --- Lower precedence in higher precedence parent: PRESERVE ---

	it('preserves (a+b)*c', () => {
		const result = transformLatex('\\left(a+b\\right)\\times c', stripUnnecessaryBracketsAST);
		expect(result).toContain('\\left(');
	});

	it('preserves c*(a+b)', () => {
		const result = transformLatex('c\\times \\left(a+b\\right)', stripUnnecessaryBracketsAST);
		expect(result).toContain('\\left(');
	});

	it('preserves (a+b)^2', () => {
		const result = transformLatex('\\left(a+b\\right)^{2}', stripUnnecessaryBracketsAST);
		expect(result).toContain('\\left(');
	});

	it('preserves (a*b)^2', () => {
		const result = transformLatex('\\left(a\\times b\\right)^{2}', stripUnnecessaryBracketsAST);
		expect(result).toContain('\\left(');
	});

	// --- Same precedence non-commutative: PRESERVE right operand ---

	it('preserves a-(b+c)', () => {
		const result = transformLatex('a-\\left(b+c\\right)', stripUnnecessaryBracketsAST);
		expect(result).toContain('\\left(');
	});

	it('preserves a-(b-c)', () => {
		const result = transformLatex('a-\\left(b-c\\right)', stripUnnecessaryBracketsAST);
		expect(result).toContain('\\left(');
	});

	// --- Superscript: right-associative, same prec → PRESERVE ---

	it('preserves (x^2)^3 (right-associative)', () => {
		const result = transformLatex('\\left(x^{2}\\right)^{3}', stripUnnecessaryBracketsAST);
		expect(result).toContain('\\left(');
	});
});

// =============================================================================
// removeMultOperatorAST
// =============================================================================

describe('removeMultOperatorAST', () => {
	it('converts 2 × x to 2x (implicit)', () => {
		const result = transformLatex('2\\times x', removeMultOperatorAST);
		// Should use implicit multiplication
		expect(result).not.toContain('\\times');
	});

	it('keeps 2 × 3 explicit', () => {
		const result = transformLatex('2\\times 3', removeMultOperatorAST);
		expect(result).toContain('\\times');
	});
});

// =============================================================================
// sortTermsAndFactorsAST
// =============================================================================

describe('sortTermsAndFactorsAST', () => {
	it('sorts b + a → a + b', () => {
		const result = transformLatex('b+a', sortTermsAndFactorsAST);
		expect(result).toBe('a + b');
	});

	it('sorts y * x → x * y', () => {
		// Use implicit multiplication to avoid number ambiguity
		const ast = multiply(variable('y'), variable('x'), 'implicit');
		const result = toLatex(sortTermsAndFactorsAST(ast));
		// toLatex may use a space for implicit multiplication
		expect(result.replace(/\s/g, '')).toBe('xy');
	});
});

// =============================================================================
// checkForm (unified pipeline)
// =============================================================================

describe('checkForm', () => {
	it('returns correct for identical expressions', () => {
		const result = checkForm('743', '743', {});
		expect(result.valid).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('rejects 740+3 vs 743 (no cosmetic transform simplifies addition)', () => {
		const result = checkForm('740+3', '743', {});
		expect(result.valid).toBe(false);
		expect(result.status).toBe('bad_form');
	});

	it('handles 0+5 vs 5 with nullTerms strict → bad_form', () => {
		const result = checkForm('0+5', '5', { nullTerms: 'strict' });
		expect(result.valid).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.violations.some((v) => v.id === 'nullTerms')).toBe(true);
	});

	it('handles 0+5 vs 5 with nullTerms warn → unoptimal_form', () => {
		const result = checkForm('0+5', '5', { nullTerms: 'warn' });
		expect(result.valid).toBe(true);
		expect(result.status).toBe('unoptimal_form');
		expect(result.violations.some((v) => v.id === 'nullTerms')).toBe(true);
	});

	it('handles 0+5 vs 5 with nullTerms off → correct', () => {
		const result = checkForm('0+5', '5', { nullTerms: 'off' });
		expect(result.valid).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('handles 1*x vs x with factorOne strict → bad_form', () => {
		const result = checkForm('1\\times x', 'x', { factorOne: 'strict' });
		expect(result.valid).toBe(false);
		expect(result.status).toBe('bad_form');
	});

	it('handles 1*x vs x with factorOne warn → unoptimal_form', () => {
		const result = checkForm('1\\times x', 'x', { factorOne: 'warn' });
		expect(result.valid).toBe(true);
		expect(result.status).toBe('unoptimal_form');
		expect(result.violations.some((v) => v.id === 'factorOne')).toBe(true);
	});

	it('handles 4/6 vs 2/3 with reducedFractions warn → unoptimal_form', () => {
		const result = checkForm('\\frac{4}{6}', '\\frac{2}{3}', { reducedFractions: 'warn' });
		expect(result.valid).toBe(true);
		expect(result.status).toBe('unoptimal_form');
		expect(result.violations.some((v) => v.id === 'reducedFractions')).toBe(true);
	});

	it('sorts both sides: b+a vs a+b → correct', () => {
		const result = checkForm('b+a', 'a+b', {});
		expect(result.valid).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('handles simple number equality', () => {
		const result = checkForm('5', '5', {});
		expect(result.valid).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('handles signs: x+(-y) vs x-y → correct (signs simplified)', () => {
		const result = checkForm('x+\\left(-y\\right)', 'x-y', {});
		expect(result.valid).toBe(true);
	});

	it('accepts answer without brackets when expected has product-in-sum brackets', () => {
		const result = checkForm(
			'2\\times 100+4\\times 10+2',
			'\\left(2\\times 100\\right)+\\left(4\\times 10\\right)+2',
			{ brackets: 'off' }
		);
		expect(result.valid).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('accepts answer with brackets when expected has no brackets (product in sum)', () => {
		const result = checkForm(
			'\\left(2\\times 100\\right)+\\left(4\\times 10\\right)+2',
			'2\\times 100+4\\times 10+2',
			{ brackets: 'off' }
		);
		expect(result.valid).toBe(true);
		expect(result.status).toBe('correct');
	});
});
