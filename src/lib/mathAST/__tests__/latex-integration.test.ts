/**
 * Integration tests demonstrating real-world LaTeX generation scenarios
 */

import { describe, it, expect } from 'vitest';
import { MathAST, toLatex } from '../index';

describe('LaTeX Generator - Integration Tests', () => {
	it('generates quadratic formula', () => {
		// x = (-b ± √(b² - 4ac)) / 2a
		// Note: sqrt is rendered as a function sqrt\left(...\right) not \sqrt{...}
		const expr = MathAST.equals(
			MathAST.variable('x'),
			MathAST.fraction(
				MathAST.add(
					MathAST.opposite(MathAST.variable('b')),
					MathAST.delimiter(
						'parentheses',
						MathAST.sqrt(
							MathAST.subtract(
								MathAST.power(MathAST.variable('b'), MathAST.number('2')),
								MathAST.implicitMultiply(
									MathAST.implicitMultiply(MathAST.number('4'), MathAST.variable('a')),
									MathAST.variable('c')
								)
							)
						),
						'grouping'
					)
				),
				MathAST.implicitMultiply(MathAST.number('2'), MathAST.variable('a'))
			)
		);

		const latex = toLatex(expr);
		expect(latex).toContain('\\frac{');
		expect(latex).toContain('sqrt'); // Custom function, not \sqrt{}
		expect(latex).toContain('\\left(');
		expect(latex).toContain('\\right)');
		expect(latex).toBe('x = \\frac{-b + \\left( sqrt\\left( b^2 - 4 a c \\right) \\right)}{2 a}');
	});

	it('generates trigonometric identity', () => {
		// sin²(x) + cos²(x) = 1
		const expr = MathAST.equals(
			MathAST.add(
				MathAST.power(MathAST.sin(MathAST.variable('x')), MathAST.number('2')),
				MathAST.power(MathAST.cos(MathAST.variable('x')), MathAST.number('2'))
			),
			MathAST.number('1')
		);

		expect(toLatex(expr)).toBe('\\sin\\left( x \\right)^2 + \\cos\\left( x \\right)^2 = 1');
	});

	it('generates derivative notation', () => {
		// df/dx
		const expr = MathAST.fraction(MathAST.variable('df'), MathAST.variable('dx'));

		expect(toLatex(expr)).toBe('\\frac{\\mathit{df}}{\\mathit{dx}}');
	});

	it('generates summation notation', () => {
		// Σ_{i=1}^{n} i²
		const sigma = MathAST.symbol('cdot'); // Using cdot as placeholder for sum
		const expr = MathAST.power(
			MathAST.subscript(sigma, MathAST.equals(MathAST.variable('i'), MathAST.number('1'))),
			MathAST.variable('n')
		);

		const latex = toLatex(expr);
		expect(latex).toContain('\\cdot');
		expect(latex).toContain('_');
		expect(latex).toContain('^');
	});

	it('generates set notation', () => {
		// x ∈ ℝ
		const expr = MathAST.elementOf(
			MathAST.variable('x'),
			MathAST.symbol('Re') // Using Re as placeholder for reals
		);

		expect(toLatex(expr)).toBe('x \\in \\Re');
	});

	it('generates logarithm with base', () => {
		// log₂(8) = 3
		const expr = MathAST.equals(
			MathAST.log(MathAST.number('8'), MathAST.number('2')),
			MathAST.number('3')
		);

		expect(toLatex(expr)).toBe('\\log_2\\left( 8 \\right) = 3');
	});

	it('generates absolute value inequality', () => {
		// |x - 3| < 5
		const expr = MathAST.lessThan(
			MathAST.delimiter(
				'absolute',
				MathAST.subtract(MathAST.variable('x'), MathAST.number('3')),
				'absolute'
			),
			MathAST.number('5')
		);

		expect(toLatex(expr)).toBe('\\left| x - 3 \\right| < 5');
	});

	it('generates complex fraction', () => {
		// (1/2) / (3/4)
		const expr = MathAST.fraction(
			MathAST.parentheses(MathAST.fraction(MathAST.number('1'), MathAST.number('2'))),
			MathAST.parentheses(MathAST.fraction(MathAST.number('3'), MathAST.number('4')))
		);

		expect(toLatex(expr)).toBe(
			'\\frac{\\left( \\frac{1}{2} \\right)}{\\left( \\frac{3}{4} \\right)}'
		);
	});

	it('generates polynomial with Greek letters', () => {
		// αx² + βx + γ = 0
		const expr = MathAST.equals(
			MathAST.add(
				MathAST.add(
					MathAST.implicitMultiply(
						MathAST.greek('alpha'),
						MathAST.power(MathAST.variable('x'), MathAST.number('2'))
					),
					MathAST.implicitMultiply(MathAST.greek('beta'), MathAST.variable('x'))
				),
				MathAST.greek('gamma')
			),
			MathAST.number('0')
		);

		expect(toLatex(expr)).toBe('\\alpha x^2 + \\beta x + \\gamma = 0');
	});

	it('generates matrix determinant notation', () => {
		// det(A)
		const expr = MathAST.func('det', [MathAST.variable('A')]);

		expect(toLatex(expr)).toBe('\\det\\left( A \\right)');
	});

	it('generates floor and ceiling functions', () => {
		// ⌊x⌋ + ⌈y⌉
		const expr = MathAST.add(
			MathAST.delimiter('floor', MathAST.variable('x'), 'floor'),
			MathAST.delimiter('ceiling', MathAST.variable('y'), 'ceiling')
		);

		expect(toLatex(expr)).toBe('\\left\\lfloor x \\right\\rfloor + \\left\\lceil y \\right\\rceil');
	});

	it('generates implication chain', () => {
		// P ⟹ Q ⟹ R
		const expr = MathAST.implies(
			MathAST.variable('P'),
			MathAST.implies(MathAST.variable('Q'), MathAST.variable('R'))
		);

		expect(toLatex(expr)).toBe('P \\implies Q \\implies R');
	});

	it('generates subset relation', () => {
		// A ⊂ B ⊆ C
		const expr = MathAST.subset(
			MathAST.variable('A'),
			MathAST.subsetOrEqual(MathAST.variable('B'), MathAST.variable('C'))
		);

		expect(toLatex(expr)).toBe('A \\subset B \\subseteq C');
	});

	it('preserves number precision', () => {
		// 3.14159 * r²
		const expr = MathAST.implicitMultiply(
			MathAST.number('3.14159'),
			MathAST.power(MathAST.variable('r'), MathAST.number('2'))
		);

		expect(toLatex(expr)).toBe('3.14159 r^2');
	});

	it('generates exponential function', () => {
		// e^(ix)
		const expr = MathAST.power(
			MathAST.variable('e'),
			MathAST.parentheses(MathAST.implicitMultiply(MathAST.variable('i'), MathAST.variable('x')))
		);

		expect(toLatex(expr)).toBe('e^{\\left( i x \\right)}');
	});
});
