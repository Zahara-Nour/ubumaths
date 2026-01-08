/**
 * Tests for LaTeX generation of ComplexNode
 *
 * Tests that ComplexNode is correctly converted to LaTeX with
 * proper handling of special cases (0, 1, etc.)
 */
import { describe, it, expect } from 'vitest';
import { toLatex } from '../latex-generator';
import { complex, number, variable, MathAST } from '../factory';
import { parsePratt } from '../parser/latex/parser-pratt';

describe('ComplexNode LaTeX generation', () => {
	describe('special cases', () => {
		it('generates \\imaginaryI for pure imaginary unit (0 + 1i)', () => {
			const node = complex(number('0'), number('1'));
			expect(toLatex(node)).toBe('\\imaginaryI');
		});

		it('generates 0 for zero complex (0 + 0i)', () => {
			const node = complex(number('0'), number('0'));
			expect(toLatex(node)).toBe('0');
		});

		it('generates just real part when imaginary is 0', () => {
			const node = complex(number('3'), number('0'));
			expect(toLatex(node)).toBe('3');
		});

		it('generates bi\\imaginaryI for pure imaginary (0 + bi)', () => {
			const node = complex(number('0'), number('4'));
			expect(toLatex(node)).toBe('4\\imaginaryI');
		});

		it('generates a + \\imaginaryI when imaginary is 1', () => {
			const node = complex(number('3'), number('1'));
			expect(toLatex(node)).toBe('3 + \\imaginaryI');
		});
	});

	describe('general cases', () => {
		it('generates a + b\\imaginaryI for complex number', () => {
			const node = complex(number('3'), number('4'));
			expect(toLatex(node)).toBe('3 + 4\\imaginaryI');
		});

		it('handles symbolic real part', () => {
			const node = complex(variable('x'), number('1'));
			expect(toLatex(node)).toBe('x + \\imaginaryI');
		});

		it('handles symbolic imaginary part', () => {
			const node = complex(number('0'), variable('y'));
			expect(toLatex(node)).toBe('y\\imaginaryI');
		});

		it('handles both symbolic parts', () => {
			const node = complex(variable('a'), variable('b'));
			expect(toLatex(node)).toBe('a + b\\imaginaryI');
		});

		it('handles nested expressions in real part', () => {
			const node = complex(MathAST.sqrt(number('2')), number('1'));
			expect(toLatex(node)).toBe('\\sqrt{2} + \\imaginaryI');
		});

		it('handles nested expressions in imaginary part', () => {
			const node = complex(number('0'), MathAST.sqrt(number('3')));
			expect(toLatex(node)).toBe('\\sqrt{3}\\imaginaryI');
		});
	});

	describe('round-trip parsing', () => {
		it('parsing and generating \\imaginaryI gives back \\imaginaryI', () => {
			// Parse \imaginaryI, then generate LaTeX
			const ast = parsePratt('\\imaginaryI');
			expect(toLatex(ast)).toBe('\\imaginaryI');
		});

		it('parsing and generating 3 + 4\\imaginaryI works correctly', () => {
			// Note: 3 + 4\imaginaryI parses as add(3, multiply(4, complex(0,1)))
			// The multiplication is implicit, so there's a space between 4 and \imaginaryI
			const ast = parsePratt('3 + 4\\imaginaryI');
			const latex = toLatex(ast);
			// The structure is: add(3, implicitMult(4, complex(0, 1)))
			// which generates: 3 + 4 \imaginaryI (with space for implicit mult)
			expect(latex).toBe('3 + 4 \\imaginaryI');
		});
	});
});
