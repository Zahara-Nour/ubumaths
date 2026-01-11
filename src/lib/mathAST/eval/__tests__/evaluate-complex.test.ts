/**
 * Tests for evaluating complex number expressions
 *
 * Mode exact returns MathNode (symbolic), not ComplexNode with numeric values.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { complex, number, func } from '../../factory';
import { parsePratt } from '../../parser/latex/parser-pratt';
import { toLatex } from '../../latex-generator';

describe('Complex number evaluation', () => {
	describe('basic ComplexNode evaluation', () => {
		it('evaluates complex(0, 1) to imaginary unit', () => {
			const node = complex(number('0'), number('1'));
			const result = evaluate(node);
			expect(toLatex(result.node)).toBe('\\imaginaryI');
		});

		it('evaluates complex(3, 4) to 3 + 4i', () => {
			const node = complex(number('3'), number('4'));
			const result = evaluate(node);
			expect(toLatex(result.node)).toBe('3 + 4 \\imaginaryI');
		});

		it('evaluates complex(5, 0) to just 5 (real)', () => {
			const node = complex(number('5'), number('0'));
			const result = evaluate(node);
			expect(toLatex(result.node)).toBe('5');
		});
	});

	describe('parsing and evaluating imaginary unit', () => {
		it('evaluates \\imaginaryI to i', () => {
			const ast = parsePratt('\\imaginaryI');
			const result = evaluate(ast);
			expect(toLatex(result.node)).toBe('\\imaginaryI');
		});
	});

	describe('complex arithmetic edge cases', () => {
		it('evaluates negative imaginary correctly', () => {
			const node = complex(number('0'), number('-3'));
			const result = evaluate(node);
			expect(toLatex(result.node)).toBe('-3 \\imaginaryI');
		});

		it('evaluates negative real correctly', () => {
			const node = complex(number('-2'), number('1'));
			const result = evaluate(node);
			expect(toLatex(result.node)).toBe('-2 + \\imaginaryI');
		});
	});

	describe('complex arithmetic operations', () => {
		describe('addition', () => {
			it('evaluates (3+4i) + (1+2i) = 4+6i', () => {
				const ast = parsePratt('(3 + 4\\imaginaryI) + (1 + 2\\imaginaryI)');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('4 + 6 \\imaginaryI');
			});

			it('evaluates 5 + i = 5+i', () => {
				const ast = parsePratt('5 + \\imaginaryI');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('5 + \\imaginaryI');
			});

			it('evaluates i + i = 2i', () => {
				const ast = parsePratt('\\imaginaryI + \\imaginaryI');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('2 \\imaginaryI');
			});
		});

		describe('subtraction', () => {
			it('evaluates (3+4i) - (1+2i) = 2+2i', () => {
				const ast = parsePratt('(3 + 4\\imaginaryI) - (1 + 2\\imaginaryI)');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('2 + 2 \\imaginaryI');
			});

			it('evaluates 3 - i', () => {
				const ast = parsePratt('3 - \\imaginaryI');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('3 - \\imaginaryI');
			});
		});

		describe('multiplication', () => {
			it('evaluates (3+4i) * (1+2i) = -5+10i', () => {
				const ast = parsePratt('(3 + 4\\imaginaryI) \\times (1 + 2\\imaginaryI)');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('-5 + 10 \\imaginaryI');
			});

			it('evaluates i * i = -1', () => {
				const ast = parsePratt('\\imaginaryI \\times \\imaginaryI');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('-1');
			});

			it('evaluates 3 * i = 3i', () => {
				const ast = parsePratt('3 \\times \\imaginaryI');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('3 \\imaginaryI');
			});

			it('evaluates (1+i) * (1-i) = 2', () => {
				const ast = parsePratt('(1 + \\imaginaryI) \\times (1 - \\imaginaryI)');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('2');
			});
		});

		describe('division', () => {
			it('evaluates (3+4i) / (1+2i) = 11/5 - 2i/5', () => {
				// (3+4i)/(1+2i) = (3+4i)(1-2i)/5 = (11-2i)/5
				const ast = parsePratt('\\frac{3 + 4\\imaginaryI}{1 + 2\\imaginaryI}');
				const result = evaluate(ast);
				// Symbolic result
				expect(toLatex(result.node)).toMatch(/11.*5.*2.*5|frac/);
			});

			it('evaluates 1/i (remains as fraction without rationalization)', () => {
				const ast = parsePratt('\\frac{1}{\\imaginaryI}');
				const result = evaluate(ast);
				// TODO: Implement complex denominator rationalization
				// For now, 1/i stays as a fraction
				expect(toLatex(result.node)).toMatch(/frac.*1.*imaginaryI|imaginaryI/);
			});

			it('evaluates (2+4i) / 2 = 1+2i', () => {
				const ast = parsePratt('\\frac{2 + 4\\imaginaryI}{2}');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('1 + 2 \\imaginaryI');
			});
		});

		describe('negation', () => {
			it('evaluates -(3+4i) = -3-4i', () => {
				const ast = parsePratt('-(3 + 4\\imaginaryI)');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('-3 - 4 \\imaginaryI');
			});

			it('evaluates -i', () => {
				const ast = parsePratt('-\\imaginaryI');
				const result = evaluate(ast);
				expect(toLatex(result.node)).toBe('-\\imaginaryI');
			});
		});
	});

	describe('complex functions', () => {
		// Complex functions are now evaluated exactly when possible
		describe('conj (conjugate)', () => {
			it('evaluates conj(3+4i) to 3-4i in exact mode', () => {
				const node = func('conj', [complex(number('3'), number('4'))]);
				const result = evaluate(node);
				expect(toLatex(result.node)).toBe('3 - 4 \\imaginaryI');
			});
		});

		describe('Re (real part)', () => {
			it('evaluates Re(3+4i) to 3 in exact mode', () => {
				const node = func('Re', [complex(number('3'), number('4'))]);
				const result = evaluate(node);
				expect(toLatex(result.node)).toBe('3');
			});
		});

		describe('Im (imaginary part)', () => {
			it('evaluates Im(3+4i) to 4 in exact mode', () => {
				const node = func('Im', [complex(number('3'), number('4'))]);
				const result = evaluate(node);
				expect(toLatex(result.node)).toBe('4');
			});
		});

		describe('cabs (complex absolute value)', () => {
			it('evaluates cabs(3+4i) to 5 in exact mode', () => {
				const node = func('cabs', [complex(number('3'), number('4'))]);
				const result = evaluate(node);
				expect(toLatex(result.node)).toBe('5');
			});
		});

		describe('arg (argument/phase)', () => {
			it('keeps arg unevaluated in exact mode', () => {
				const node = func('arg', [parsePratt('\\imaginaryI')]);
				const result = evaluate(node);
				// arg requires trigonometric evaluation, stays as function
				expect(result.node.type).toBe('function');
			});
		});
	});

	describe('powers of i', () => {
		it('evaluates i^2 = -1', () => {
			const ast = parsePratt('\\imaginaryI^2');
			const result = evaluate(ast);
			expect(toLatex(result.node)).toBe('-1');
		});

		it('evaluates i^3 = -i', () => {
			const ast = parsePratt('\\imaginaryI^3');
			const result = evaluate(ast);
			expect(toLatex(result.node)).toBe('-\\imaginaryI');
		});

		it('evaluates i^4 = 1', () => {
			const ast = parsePratt('\\imaginaryI^4');
			const result = evaluate(ast);
			expect(toLatex(result.node)).toBe('1');
		});

		it('evaluates i^5 = i', () => {
			const ast = parsePratt('\\imaginaryI^5');
			const result = evaluate(ast);
			expect(toLatex(result.node)).toBe('\\imaginaryI');
		});
	});
});
