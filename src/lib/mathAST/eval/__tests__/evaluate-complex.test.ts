/**
 * Tests for evaluating complex number expressions
 *
 * Tests that ComplexNode evaluates correctly and complex functions work.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { complex, number, func } from '../../factory';
import { parsePratt } from '../../parser/latex/parser-pratt';

describe('Complex number evaluation', () => {
	describe('basic ComplexNode evaluation', () => {
		it('evaluates complex(0, 1) to imaginary unit', () => {
			const node = complex(number('0'), number('1'));
			const result = evaluate(node);
			// Should return a complex value
			expect(result.node.type).toBe('complex');
			if (result.node.type === 'complex') {
				expect(result.node.real.type).toBe('number');
				expect(result.node.imaginary.type).toBe('number');
				if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
					expect(result.node.real.value).toBe('0');
					expect(result.node.imaginary.value).toBe('1');
				}
			}
		});

		it('evaluates complex(3, 4) to 3 + 4i', () => {
			const node = complex(number('3'), number('4'));
			const result = evaluate(node);
			expect(result.node.type).toBe('complex');
			if (result.node.type === 'complex') {
				expect(result.node.real.type).toBe('number');
				expect(result.node.imaginary.type).toBe('number');
				if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
					expect(result.node.real.value).toBe('3');
					expect(result.node.imaginary.value).toBe('4');
				}
			}
		});

		it('evaluates complex(5, 0) to just 5 (real)', () => {
			const node = complex(number('5'), number('0'));
			const result = evaluate(node);
			// Should simplify to just a number since imaginary is 0
			expect(result.node.type).toBe('number');
			if (result.node.type === 'number') {
				expect(result.node.value).toBe('5');
			}
		});
	});

	describe('parsing and evaluating imaginary unit', () => {
		it('evaluates \\imaginaryI to i', () => {
			const ast = parsePratt('\\imaginaryI');
			const result = evaluate(ast);
			expect(result.node.type).toBe('complex');
			if (result.node.type === 'complex') {
				expect(result.node.real.type).toBe('number');
				expect(result.node.imaginary.type).toBe('number');
				if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
					expect(result.node.real.value).toBe('0');
					expect(result.node.imaginary.value).toBe('1');
				}
			}
		});
	});

	describe('complex arithmetic edge cases', () => {
		it('evaluates negative imaginary correctly', () => {
			const node = complex(number('0'), number('-3'));
			const result = evaluate(node);
			expect(result.node.type).toBe('complex');
			if (result.node.type === 'complex' && result.node.imaginary.type === 'number') {
				expect(result.node.imaginary.value).toBe('-3');
			}
		});

		it('evaluates negative real correctly', () => {
			const node = complex(number('-2'), number('1'));
			const result = evaluate(node);
			expect(result.node.type).toBe('complex');
			if (result.node.type === 'complex' && result.node.real.type === 'number') {
				expect(result.node.real.value).toBe('-2');
			}
		});
	});

	describe('complex arithmetic operations', () => {
		describe('addition', () => {
			it('evaluates (3+4i) + (1+2i) = 4+6i', () => {
				const ast = parsePratt('(3 + 4\\imaginaryI) + (1 + 2\\imaginaryI)');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('4');
						expect(result.node.imaginary.value).toBe('6');
					}
				}
			});

			it('evaluates 5 + i = 5+i', () => {
				const ast = parsePratt('5 + \\imaginaryI');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('5');
						expect(result.node.imaginary.value).toBe('1');
					}
				}
			});

			it('evaluates i + i = 2i', () => {
				const ast = parsePratt('\\imaginaryI + \\imaginaryI');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('0');
						expect(result.node.imaginary.value).toBe('2');
					}
				}
			});
		});

		describe('subtraction', () => {
			it('evaluates (3+4i) - (1+2i) = 2+2i', () => {
				const ast = parsePratt('(3 + 4\\imaginaryI) - (1 + 2\\imaginaryI)');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('2');
						expect(result.node.imaginary.value).toBe('2');
					}
				}
			});

			it('evaluates 3 - i', () => {
				const ast = parsePratt('3 - \\imaginaryI');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('3');
						expect(result.node.imaginary.value).toBe('-1');
					}
				}
			});
		});

		describe('multiplication', () => {
			it('evaluates (3+4i) * (1+2i) = -5+10i', () => {
				// (3+4i)(1+2i) = 3*1 - 4*2 + i*(3*2 + 4*1) = 3-8 + 10i = -5+10i
				const ast = parsePratt('(3 + 4\\imaginaryI) \\times (1 + 2\\imaginaryI)');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('-5');
						expect(result.node.imaginary.value).toBe('10');
					}
				}
			});

			it('evaluates i * i = -1', () => {
				const ast = parsePratt('\\imaginaryI \\times \\imaginaryI');
				const result = evaluate(ast);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('-1');
				}
			});

			it('evaluates 3 * i = 3i', () => {
				const ast = parsePratt('3 \\times \\imaginaryI');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('0');
						expect(result.node.imaginary.value).toBe('3');
					}
				}
			});

			it('evaluates (1+i) * (1-i) = 2', () => {
				// (1+i)(1-i) = 1 - i^2 = 1 - (-1) = 2
				const ast = parsePratt('(1 + \\imaginaryI) \\times (1 - \\imaginaryI)');
				const result = evaluate(ast);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('2');
				}
			});
		});

		describe('division', () => {
			it('evaluates (3+4i) / (1+2i)', () => {
				// (3+4i)/(1+2i) = (3+4i)(1-2i)/((1+2i)(1-2i))
				// = (3+8 + i(4-6)) / 5 = (11 - 2i) / 5 = 2.2 - 0.4i
				const ast = parsePratt('\\frac{3 + 4\\imaginaryI}{1 + 2\\imaginaryI}');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(parseFloat(result.node.real.value)).toBeCloseTo(2.2);
						expect(parseFloat(result.node.imaginary.value)).toBeCloseTo(-0.4);
					}
				}
			});

			it('evaluates 1/i = -i', () => {
				// 1/i = 1*(-i)/(i*(-i)) = -i/1 = -i
				const ast = parsePratt('\\frac{1}{\\imaginaryI}');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(parseFloat(result.node.real.value)).toBeCloseTo(0);
						expect(parseFloat(result.node.imaginary.value)).toBeCloseTo(-1);
					}
				}
			});

			it('evaluates (2+4i) / 2 = 1+2i', () => {
				const ast = parsePratt('\\frac{2 + 4\\imaginaryI}{2}');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('1');
						expect(result.node.imaginary.value).toBe('2');
					}
				}
			});
		});

		describe('negation', () => {
			it('evaluates -(3+4i) = -3-4i', () => {
				const ast = parsePratt('-(3 + 4\\imaginaryI)');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('-3');
						expect(result.node.imaginary.value).toBe('-4');
					}
				}
			});

			it('evaluates -i', () => {
				const ast = parsePratt('-\\imaginaryI');
				const result = evaluate(ast);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number' && result.node.imaginary.type === 'number') {
						expect(result.node.real.value).toBe('0');
						expect(result.node.imaginary.value).toBe('-1');
					}
				}
			});
		});
	});

	describe('complex functions', () => {
		describe('conj (conjugate)', () => {
			it('computes conjugate of 3 + 4i', () => {
				// conj(3 + 4i) = 3 - 4i
				const node = func('conj', [complex(number('3'), number('4'))]);
				const result = evaluate(node);
				expect(result.node.type).toBe('complex');
				if (result.node.type === 'complex') {
					if (result.node.real.type === 'number') {
						expect(result.node.real.value).toBe('3');
					}
					if (result.node.imaginary.type === 'number') {
						expect(result.node.imaginary.value).toBe('-4');
					}
				}
			});

			it('conjugate of real number is itself', () => {
				const node = func('conj', [number('5')]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('5');
				}
			});
		});

		describe('Re (real part)', () => {
			it('computes real part of 3 + 4i', () => {
				const node = func('Re', [complex(number('3'), number('4'))]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('3');
				}
			});

			it('real part of real number is itself', () => {
				const node = func('Re', [number('7')]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('7');
				}
			});
		});

		describe('Im (imaginary part)', () => {
			it('computes imaginary part of 3 + 4i', () => {
				const node = func('Im', [complex(number('3'), number('4'))]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('4');
				}
			});

			it('imaginary part of real number is 0', () => {
				const node = func('Im', [number('7')]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('0');
				}
			});
		});

		describe('cabs (complex absolute value)', () => {
			it('computes modulus of 3 + 4i = 5', () => {
				const node = func('cabs', [complex(number('3'), number('4'))]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('5');
				}
			});

			it('computes modulus of i = 1', () => {
				const node = func('cabs', [complex(number('0'), number('1'))]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('1');
				}
			});
		});

		describe('arg (argument/phase)', () => {
			it('computes arg of i = pi/2', () => {
				const node = func('arg', [complex(number('0'), number('1'))]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(parseFloat(result.node.value)).toBeCloseTo(Math.PI / 2);
				}
			});

			it('computes arg of 1 = 0', () => {
				const node = func('arg', [number('1')]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(result.node.value).toBe('0');
				}
			});

			it('computes arg of -1 = pi', () => {
				const node = func('arg', [number('-1')]);
				const result = evaluate(node);
				expect(result.node.type).toBe('number');
				if (result.node.type === 'number') {
					expect(parseFloat(result.node.value)).toBeCloseTo(Math.PI);
				}
			});
		});
	});
});
