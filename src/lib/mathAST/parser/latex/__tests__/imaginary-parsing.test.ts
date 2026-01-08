/**
 * Tests for parsing the imaginary unit \imaginaryI in LaTeX
 *
 * MathLive uses \imaginaryI to represent the imaginary unit i.
 * We parse it as ComplexNode(0, 1) - the pure imaginary unit.
 */
import { describe, it, expect } from 'vitest';
import { parsePrattSafe } from '../parser-pratt';
import { isComplex, isNumber, isAddition, isMultiplication } from '../../../guards';

// Helper to parse LaTeX and check success
function parseLatex(input: string) {
	const result = parsePrattSafe(input);
	return {
		success: result.ast !== null && result.errors.length === 0,
		ast: result.ast,
		errors: result.errors
	};
}

describe('Imaginary unit parsing (\\imaginaryI)', () => {
	describe('basic parsing', () => {
		it('parses \\imaginaryI as complex(0, 1)', () => {
			const result = parseLatex('\\imaginaryI');
			expect(result.success).toBe(true);
			if (!result.success || !result.ast) return;

			expect(isComplex(result.ast)).toBe(true);
			if (!isComplex(result.ast)) return;

			// Real part = 0
			expect(isNumber(result.ast.real)).toBe(true);
			if (isNumber(result.ast.real)) {
				expect(result.ast.real.value).toBe('0');
			}

			// Imaginary part = 1
			expect(isNumber(result.ast.imaginary)).toBe(true);
			if (isNumber(result.ast.imaginary)) {
				expect(result.ast.imaginary.value).toBe('1');
			}
		});
	});

	describe('expressions with imaginary unit', () => {
		it('parses 3 + \\imaginaryI as 3 + i', () => {
			const result = parseLatex('3 + \\imaginaryI');
			expect(result.success).toBe(true);
			if (!result.success || !result.ast) return;

			// Should be addition: 3 + complex(0, 1)
			expect(isAddition(result.ast)).toBe(true);
			if (!isAddition(result.ast)) return;

			expect(isNumber(result.ast.left)).toBe(true);
			expect(isComplex(result.ast.right)).toBe(true);
		});

		it('parses 4\\imaginaryI as 4 * i (implicit multiplication)', () => {
			const result = parseLatex('4\\imaginaryI');
			expect(result.success).toBe(true);
			if (!result.success || !result.ast) return;

			// Should be multiplication: 4 * complex(0, 1)
			expect(isMultiplication(result.ast)).toBe(true);
			if (!isMultiplication(result.ast)) return;

			expect(isNumber(result.ast.left)).toBe(true);
			expect(isComplex(result.ast.right)).toBe(true);
		});

		it('parses 3 + 4\\imaginaryI as 3 + (4 * i)', () => {
			const result = parseLatex('3 + 4\\imaginaryI');
			expect(result.success).toBe(true);
			if (!result.success || !result.ast) return;

			// Should be addition: 3 + (4 * complex(0, 1))
			expect(isAddition(result.ast)).toBe(true);
			if (!isAddition(result.ast)) return;

			expect(isNumber(result.ast.left)).toBe(true);
			expect(isMultiplication(result.ast.right)).toBe(true);
		});

		it('parses -\\imaginaryI as -(i)', () => {
			const result = parseLatex('-\\imaginaryI');
			expect(result.success).toBe(true);
			if (!result.success || !result.ast) return;

			// Should be opposite(complex(0, 1))
			expect(result.ast.type).toBe('opposite');
			if (result.ast.type !== 'opposite') return;

			expect(isComplex(result.ast.operand)).toBe(true);
		});

		it('parses \\imaginaryI^2 as i^2', () => {
			const result = parseLatex('\\imaginaryI^2');
			expect(result.success).toBe(true);
			if (!result.success || !result.ast) return;

			// Should be superscript(complex(0, 1), 2)
			expect(result.ast.type).toBe('superscript');
			if (result.ast.type !== 'superscript') return;

			expect(isComplex(result.ast.base)).toBe(true);
			expect(isNumber(result.ast.superscript)).toBe(true);
		});
	});

	describe('complex expressions', () => {
		it('parses (a + b\\imaginaryI)(c + d\\imaginaryI)', () => {
			const result = parseLatex('(a + b\\imaginaryI)(c + d\\imaginaryI)');
			expect(result.success).toBe(true);
		});

		it('parses \\frac{1}{\\imaginaryI}', () => {
			const result = parseLatex('\\frac{1}{\\imaginaryI}');
			expect(result.success).toBe(true);
		});

		it('parses e^{\\imaginaryI\\pi}', () => {
			const result = parseLatex('e^{\\imaginaryI\\pi}');
			expect(result.success).toBe(true);
		});
	});
});
