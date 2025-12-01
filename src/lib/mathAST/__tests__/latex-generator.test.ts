import { describe, it, expect } from 'vitest';
import { toLatex, LatexGenerator } from '../latex-generator';
import { MathAST } from '../index';
import type { RelationType } from '../types';
import {
	variable,
	number,
	add,
	parentheses,
	lessThanChain,
	equalsChain,
	relationChain,
	impliesChain,
	iffChain,
	greaterThanChain,
	lessThanOrEqualChain
} from '../factory';

describe('LatexGenerator - Literals', () => {
	it('generates number nodes', () => {
		expect(toLatex(MathAST.number('42'))).toBe('42');
		expect(toLatex(MathAST.number('3.14'))).toBe('3.14');
		expect(toLatex(MathAST.number('0'))).toBe('0');
	});

	it('generates single-character variables', () => {
		expect(toLatex(MathAST.variable('x'))).toBe('x');
		expect(toLatex(MathAST.variable('y'))).toBe('y');
		expect(toLatex(MathAST.variable('A'))).toBe('A');
	});

	it('generates multi-character variables with mathit', () => {
		expect(toLatex(MathAST.variable('velocity'))).toBe('\\mathit{velocity}');
		expect(toLatex(MathAST.variable('ab'))).toBe('\\mathit{ab}');
	});

	it('generates lowercase Greek letters', () => {
		expect(toLatex(MathAST.greek('alpha'))).toBe('\\alpha');
		expect(toLatex(MathAST.greek('beta'))).toBe('\\beta');
		expect(toLatex(MathAST.greek('omega'))).toBe('\\omega');
		expect(toLatex(MathAST.greek('theta'))).toBe('\\theta');
	});

	it('generates uppercase Greek letters with LaTeX commands', () => {
		expect(toLatex(MathAST.greek('Gamma'))).toBe('\\Gamma');
		expect(toLatex(MathAST.greek('Delta'))).toBe('\\Delta');
		expect(toLatex(MathAST.greek('Omega'))).toBe('\\Omega');
		expect(toLatex(MathAST.greek('Sigma'))).toBe('\\Sigma');
	});

	it('generates uppercase Greek letters that are roman letters', () => {
		expect(toLatex(MathAST.greek('Alpha'))).toBe('A');
		expect(toLatex(MathAST.greek('Beta'))).toBe('B');
		expect(toLatex(MathAST.greek('Epsilon'))).toBe('E');
		expect(toLatex(MathAST.greek('Omicron'))).toBe('O');
	});

	it('generates mathematical symbols', () => {
		expect(toLatex(MathAST.symbol('infinity'))).toBe('\\infty');
		expect(toLatex(MathAST.symbol('emptyset'))).toBe('\\emptyset');
		expect(toLatex(MathAST.symbol('partial'))).toBe('\\partial');
		expect(toLatex(MathAST.symbol('nabla'))).toBe('\\nabla');
		expect(toLatex(MathAST.symbol('degree'))).toBe('^\\circ');
		expect(toLatex(MathAST.symbol('prime'))).toBe("'");
		expect(toLatex(MathAST.symbol('dprime'))).toBe("''");
	});

	it('generates set symbols', () => {
		expect(toLatex(MathAST.symbol('in'))).toBe('\\in');
		expect(toLatex(MathAST.symbol('notin'))).toBe('\\notin');
		expect(toLatex(MathAST.symbol('subset'))).toBe('\\subset');
		expect(toLatex(MathAST.symbol('subseteq'))).toBe('\\subseteq');
		expect(toLatex(MathAST.symbol('union'))).toBe('\\cup');
		expect(toLatex(MathAST.symbol('intersection'))).toBe('\\cap');
	});

	it('generates operator symbols', () => {
		expect(toLatex(MathAST.symbol('cdot'))).toBe('\\cdot');
		expect(toLatex(MathAST.symbol('times'))).toBe('\\times');
		expect(toLatex(MathAST.symbol('div'))).toBe('\\div');
		expect(toLatex(MathAST.symbol('pm'))).toBe('\\pm');
		expect(toLatex(MathAST.symbol('oplus'))).toBe('\\oplus');
	});
});

describe('LatexGenerator - Binary Operations', () => {
	it('generates addition', () => {
		const expr = MathAST.add(MathAST.variable('x'), MathAST.number('5'));
		expect(toLatex(expr)).toBe('x + 5');
	});

	it('generates subtraction', () => {
		const expr = MathAST.subtract(MathAST.variable('x'), MathAST.number('5'));
		expect(toLatex(expr)).toBe('x - 5');
	});

	it('generates implicit multiplication', () => {
		const expr = MathAST.implicitMultiply(MathAST.number('2'), MathAST.variable('x'));
		expect(toLatex(expr)).toBe('2 x');
	});

	it('generates dot multiplication', () => {
		const expr = MathAST.multiply(MathAST.number('2'), MathAST.variable('x'), 'dot');
		expect(toLatex(expr)).toBe('2 \\cdot x');
	});

	it('generates cross multiplication', () => {
		const expr = MathAST.multiply(MathAST.variable('a'), MathAST.variable('b'), 'cross');
		expect(toLatex(expr)).toBe('a \\times b');
	});

	it('generates star multiplication', () => {
		const expr = MathAST.multiply(MathAST.number('3'), MathAST.number('4'), 'star');
		expect(toLatex(expr)).toBe('3 * 4');
	});

	it('generates fraction division', () => {
		const expr = MathAST.fraction(MathAST.variable('a'), MathAST.variable('b'));
		expect(toLatex(expr)).toBe('\\frac{a}{b}');
	});

	it('generates inline division', () => {
		const expr = MathAST.divide(MathAST.variable('a'), MathAST.variable('b'), 'inline');
		expect(toLatex(expr)).toBe('a / b');
	});

	it('generates ratio division', () => {
		const expr = MathAST.divide(MathAST.variable('a'), MathAST.variable('b'), 'ratio');
		expect(toLatex(expr)).toBe('a : b');
	});
});

describe('LatexGenerator - Unary Operations', () => {
	it('generates opposite', () => {
		const expr = MathAST.opposite(MathAST.variable('x'));
		expect(toLatex(expr)).toBe('-x');
	});

	it('generates positive', () => {
		const expr = MathAST.positive(MathAST.variable('x'));
		expect(toLatex(expr)).toBe('+x');
	});

	it('generates nested opposite', () => {
		const expr = MathAST.opposite(MathAST.opposite(MathAST.variable('x')));
		expect(toLatex(expr)).toBe('--x');
	});
});

describe('LatexGenerator - Delimiters', () => {
	it('generates parentheses', () => {
		const expr = MathAST.parentheses(MathAST.variable('x'));
		expect(toLatex(expr)).toBe('\\left( x \\right)');
	});

	it('generates absolute value', () => {
		const expr = MathAST.delimiter('absolute', MathAST.variable('x'), 'absolute');
		expect(toLatex(expr)).toBe('\\left| x \\right|');
	});
});

describe('LatexGenerator - Subscript/Superscript', () => {
	it('generates subscript with single character', () => {
		const expr = MathAST.subscript(MathAST.variable('x'), MathAST.number('1'));
		expect(toLatex(expr)).toBe('x_1');
	});

	it('generates subscript with multiple characters', () => {
		const expr = MathAST.subscript(MathAST.variable('x'), MathAST.number('10'));
		expect(toLatex(expr)).toBe('x_{10}');
	});

	it('generates superscript with single character', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.number('2'));
		expect(toLatex(expr)).toBe('x^2');
	});

	it('generates superscript with multiple characters', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.number('10'));
		expect(toLatex(expr)).toBe('x^{10}');
	});

	it('generates subscript with expression', () => {
		const expr = MathAST.subscript(
			MathAST.variable('x'),
			MathAST.add(MathAST.variable('i'), MathAST.number('1'))
		);
		expect(toLatex(expr)).toBe('x_{i + 1}');
	});

	it('generates superscript with Greek letter', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.greek('alpha'));
		expect(toLatex(expr)).toBe('x^\\alpha');
	});
});

describe('LatexGenerator - Functions', () => {
	it('generates known functions with backslash', () => {
		expect(toLatex(MathAST.sin(MathAST.variable('x')))).toBe('\\sin\\left( x \\right)');
		expect(toLatex(MathAST.cos(MathAST.variable('x')))).toBe('\\cos\\left( x \\right)');
		expect(toLatex(MathAST.tan(MathAST.variable('x')))).toBe('\\tan\\left( x \\right)');
		expect(toLatex(MathAST.ln(MathAST.variable('x')))).toBe('\\ln\\left( x \\right)');
	});

	it('generates custom functions without backslash', () => {
		const expr = MathAST.func('f', [MathAST.variable('x')]);
		expect(toLatex(expr)).toBe('f\\left( x \\right)');
	});

	it('generates functions with multiple arguments', () => {
		const expr = MathAST.func('f', [MathAST.variable('x'), MathAST.variable('y')]);
		expect(toLatex(expr)).toBe('f\\left( x, y \\right)');
	});

	it('generates functions with power', () => {
		const expr = MathAST.func('sin', [MathAST.variable('x')], {
			power: MathAST.number('2')
		});
		expect(toLatex(expr)).toBe('\\sin^2\\left( x \\right)');
	});

	it('generates functions with base subscript', () => {
		const expr = MathAST.log(MathAST.number('8'), MathAST.number('2'));
		expect(toLatex(expr)).toBe('\\log_2\\left( 8 \\right)');
	});

	it('generates functions with both power and base', () => {
		const expr = MathAST.func('log', [MathAST.variable('x')], {
			power: MathAST.number('2'),
			base: MathAST.number('10')
		});
		expect(toLatex(expr)).toBe('\\log^2_{10}\\left( x \\right)');
	});

	it('generates function with multi-character power', () => {
		const expr = MathAST.func('sin', [MathAST.variable('x')], {
			power: MathAST.number('10')
		});
		expect(toLatex(expr)).toBe('\\sin^{10}\\left( x \\right)');
	});
});

describe('LatexGenerator - Relations', () => {
	it('generates equality', () => {
		const expr = MathAST.equals(MathAST.variable('x'), MathAST.number('5'));
		expect(toLatex(expr)).toBe('x = 5');
	});

	it('generates comparisons', () => {
		expect(toLatex(MathAST.lessThan(MathAST.variable('x'), MathAST.number('5')))).toBe('x < 5');
		expect(toLatex(MathAST.greaterThan(MathAST.variable('x'), MathAST.number('5')))).toBe('x > 5');
		expect(toLatex(MathAST.lessThanOrEqual(MathAST.variable('x'), MathAST.number('5')))).toBe(
			'x \\leq 5'
		);
		expect(toLatex(MathAST.greaterThanOrEqual(MathAST.variable('x'), MathAST.number('5')))).toBe(
			'x \\geq 5'
		);
		expect(toLatex(MathAST.notEquals(MathAST.variable('x'), MathAST.number('5')))).toBe(
			'x \\neq 5'
		);
	});

	it('generates congruence relations', () => {
		expect(toLatex(MathAST.congruent(MathAST.variable('a'), MathAST.variable('b')))).toBe(
			'a \\equiv b'
		);
		expect(toLatex(MathAST.approx(MathAST.variable('a'), MathAST.variable('b')))).toBe(
			'a \\approx b'
		);
	});

	it('generates set relations', () => {
		expect(toLatex(MathAST.elementOf(MathAST.variable('x'), MathAST.variable('A')))).toBe(
			'x \\in A'
		);
		expect(toLatex(MathAST.notElementOf(MathAST.variable('x'), MathAST.variable('A')))).toBe(
			'x \\notin A'
		);
		expect(toLatex(MathAST.subset(MathAST.variable('A'), MathAST.variable('B')))).toBe(
			'A \\subset B'
		);
		expect(toLatex(MathAST.subsetOrEqual(MathAST.variable('A'), MathAST.variable('B')))).toBe(
			'A \\subseteq B'
		);
	});

	it('generates logical implications', () => {
		expect(toLatex(MathAST.implies(MathAST.variable('P'), MathAST.variable('Q')))).toBe(
			'P \\implies Q'
		);
		expect(toLatex(MathAST.iff(MathAST.variable('P'), MathAST.variable('Q')))).toBe('P \\iff Q');
	});

	it('generates all relation types', () => {
		const relations: Array<[string, string]> = [
			['=', '='],
			['<', '<'],
			['>', '>'],
			['<=', '\\leq'],
			['>=', '\\geq'],
			['!=', '\\neq'],
			['≡', '\\equiv'],
			['≢', '\\not\\equiv'],
			['≈', '\\approx'],
			['≃', '\\simeq'],
			['∼', '\\sim'],
			['≺', '\\prec'],
			['≻', '\\succ'],
			['⊂', '\\subset'],
			['⊃', '\\supset'],
			['⊆', '\\subseteq'],
			['⊇', '\\supseteq'],
			['∈', '\\in'],
			['∉', '\\notin'],
			['⟹', '\\implies'],
			['⟺', '\\iff'],
			['⟸', '\\impliedby']
		];

		for (const [rel, latex] of relations) {
			const expr = MathAST.relation(
				rel as RelationType,
				MathAST.variable('a'),
				MathAST.variable('b')
			);
			expect(toLatex(expr)).toBe(`a ${latex} b`);
		}
	});
});

describe('LatexGenerator - Complex Expressions', () => {
	it('generates quadratic equation', () => {
		// x^2 + 3x - 5 = 0
		const expr = MathAST.equals(
			MathAST.subtract(
				MathAST.add(
					MathAST.power(MathAST.variable('x'), MathAST.number('2')),
					MathAST.implicitMultiply(MathAST.number('3'), MathAST.variable('x'))
				),
				MathAST.number('5')
			),
			MathAST.number('0')
		);
		expect(toLatex(expr)).toBe('x^2 + 3 x - 5 = 0');
	});

	it('generates Pythagorean identity', () => {
		// sin^2(x) + cos^2(x) = 1
		const expr = MathAST.equals(
			MathAST.add(
				MathAST.power(MathAST.sin(MathAST.variable('x')), MathAST.number('2')),
				MathAST.power(MathAST.cos(MathAST.variable('x')), MathAST.number('2'))
			),
			MathAST.number('1')
		);
		expect(toLatex(expr)).toBe('\\sin\\left( x \\right)^2 + \\cos\\left( x \\right)^2 = 1');
	});

	it('generates nested fractions', () => {
		// (a/b)/(c/d)
		const expr = MathAST.fraction(
			MathAST.fraction(MathAST.variable('a'), MathAST.variable('b')),
			MathAST.fraction(MathAST.variable('c'), MathAST.variable('d'))
		);
		expect(toLatex(expr)).toBe('\\frac{\\frac{a}{b}}{\\frac{c}{d}}');
	});

	it('generates complex subscripts', () => {
		// x_{i+1}
		const expr = MathAST.subscript(
			MathAST.variable('x'),
			MathAST.add(MathAST.variable('i'), MathAST.number('1'))
		);
		expect(toLatex(expr)).toBe('x_{i + 1}');
	});

	it('generates Greek letters in expressions', () => {
		// α + β = γ
		const expr = MathAST.equals(
			MathAST.add(MathAST.greek('alpha'), MathAST.greek('beta')),
			MathAST.greek('gamma')
		);
		expect(toLatex(expr)).toBe('\\alpha + \\beta = \\gamma');
	});

	it('generates absolute value', () => {
		// |x - y|
		const expr = MathAST.delimiter(
			'absolute',
			MathAST.subtract(MathAST.variable('x'), MathAST.variable('y')),
			'absolute'
		);
		expect(toLatex(expr)).toBe('\\left| x - y \\right|');
	});

	it('generates summation with limits', () => {
		// sum from i=1 to n (represented as delimiter with subscript/superscript on function)
		const sumSymbol = MathAST.superscript(
			MathAST.subscript(MathAST.symbol('cdot'), MathAST.variable('i')),
			MathAST.variable('n')
		);
		expect(toLatex(sumSymbol)).toBe('\\cdot_i^n');
	});
});

describe('LatexGenerator - Metadata Rendering', () => {
	it('does not render metadata by default', () => {
		const expr = MathAST.variable('x', { color: 'red', style: 'bold' });
		expect(toLatex(expr)).toBe('x');
	});

	it('renders color when enabled', () => {
		const expr = MathAST.variable('x', { color: 'red' });
		expect(toLatex(expr, { renderMetadata: true })).toBe('\\textcolor{red}{x}');
	});

	it('renders bold style when enabled', () => {
		const expr = MathAST.variable('x', { style: 'bold' });
		expect(toLatex(expr, { renderMetadata: true })).toBe('\\mathbf{x}');
	});

	it('renders italic style when enabled', () => {
		const expr = MathAST.variable('x', { style: 'italic' });
		expect(toLatex(expr, { renderMetadata: true })).toBe('\\mathit{x}');
	});

	it('renders normal style as-is when enabled', () => {
		const expr = MathAST.variable('x', { style: 'normal' });
		expect(toLatex(expr, { renderMetadata: true })).toBe('x');
	});

	it('renders both color and style when enabled', () => {
		const expr = MathAST.variable('x', { color: 'blue', style: 'bold' });
		expect(toLatex(expr, { renderMetadata: true })).toBe('\\textcolor{blue}{\\mathbf{x}}');
	});

	it('ignores annotation in LaTeX output', () => {
		const expr = MathAST.variable('x', { annotation: 'constant' });
		expect(toLatex(expr, { renderMetadata: true })).toBe('x');
	});

	it('renders metadata on complex expressions', () => {
		const expr = MathAST.add(
			MathAST.variable('x', { color: 'red' }),
			MathAST.number('5', { style: 'bold' })
		);
		expect(toLatex(expr, { renderMetadata: true })).toBe('\\textcolor{red}{x} + \\mathbf{5}');
	});
});

describe('LatexGenerator - Edge Cases', () => {
	it('handles zero', () => {
		expect(toLatex(MathAST.number('0'))).toBe('0');
	});

	it('handles negative numbers', () => {
		expect(toLatex(MathAST.opposite(MathAST.number('5')))).toBe('-5');
	});

	it('handles decimal numbers', () => {
		expect(toLatex(MathAST.number('3.14159'))).toBe('3.14159');
	});

	it('handles empty function arguments', () => {
		const expr = MathAST.func('f', []);
		expect(toLatex(expr)).toBe('f\\left(  \\right)');
	});

	it('handles deeply nested expressions', () => {
		// ((((x))))
		const expr = MathAST.parentheses(
			MathAST.parentheses(MathAST.parentheses(MathAST.parentheses(MathAST.variable('x'))))
		);
		expect(toLatex(expr)).toBe(
			'\\left( \\left( \\left( \\left( x \\right) \\right) \\right) \\right)'
		);
	});

	it('trusts AST precedence without adding extra parentheses', () => {
		// AST says: x + (y * z), should not add extra parens
		const expr = MathAST.add(
			MathAST.variable('x'),
			MathAST.implicitMultiply(MathAST.variable('y'), MathAST.variable('z'))
		);
		expect(toLatex(expr)).toBe('x + y z');
	});
});

describe('LatexGenerator - Class API', () => {
	it('can be instantiated and reused', () => {
		const generator = new LatexGenerator({ renderMetadata: false });
		expect(generator.generate(MathAST.variable('x'))).toBe('x');
		expect(generator.generate(MathAST.number('42'))).toBe('42');
	});

	it('respects options in constructor', () => {
		const generator = new LatexGenerator({ renderMetadata: true });
		const expr = MathAST.variable('x', { color: 'red' });
		expect(generator.generate(expr)).toBe('\\textcolor{red}{x}');
	});

	it('toLatex convenience function works', () => {
		const expr = MathAST.variable('x');
		expect(toLatex(expr)).toBe('x');
	});
});

describe('LatexGenerator - Relation Chains', () => {
	it('should generate a < b < c', () => {
		const chain = lessThanChain(variable('a'), variable('b'), variable('c'));
		expect(toLatex(chain)).toBe('a < b < c');
	});

	it('should generate a = b = c = d', () => {
		const chain = equalsChain(variable('a'), variable('b'), variable('c'), variable('d'));
		expect(toLatex(chain)).toBe('a = b = c = d');
	});

	it('should generate a <= b < c (mixed)', () => {
		const chain = relationChain([variable('a'), variable('b'), variable('c')], ['<=', '<']);
		expect(toLatex(chain)).toBe('a \\leq b < c');
	});

	it('should generate P => Q => R', () => {
		const chain = impliesChain(variable('P'), variable('Q'), variable('R'));
		expect(toLatex(chain)).toBe('P \\implies Q \\implies R');
	});

	it('should generate P <=> Q <=> R', () => {
		const chain = iffChain(variable('P'), variable('Q'), variable('R'));
		expect(toLatex(chain)).toBe('P \\iff Q \\iff R');
	});

	it('should handle complex operands in chains', () => {
		// (x + 1) < (x + 2) < (x + 3)
		const chain = lessThanChain(
			parentheses(add(variable('x'), number('1'))),
			parentheses(add(variable('x'), number('2'))),
			parentheses(add(variable('x'), number('3')))
		);
		expect(toLatex(chain)).toBe(
			'\\left( x + 1 \\right) < \\left( x + 2 \\right) < \\left( x + 3 \\right)'
		);
	});

	it('should generate a > b > c', () => {
		const chain = greaterThanChain(variable('a'), variable('b'), variable('c'));
		expect(toLatex(chain)).toBe('a > b > c');
	});

	it('should generate a <= b <= c', () => {
		const chain = lessThanOrEqualChain(variable('a'), variable('b'), variable('c'));
		expect(toLatex(chain)).toBe('a \\leq b \\leq c');
	});

	it('should handle binary relation (not a chain)', () => {
		const binary = MathAST.equals(variable('a'), variable('b'));
		expect(toLatex(binary)).toBe('a = b');
	});

	it('should generate long equality chain', () => {
		const chain = equalsChain(
			variable('a'),
			variable('b'),
			variable('c'),
			variable('d'),
			variable('e')
		);
		expect(toLatex(chain)).toBe('a = b = c = d = e');
	});

	it('should handle numbers in chains', () => {
		const chain = lessThanChain(number('1'), number('2'), number('3'));
		expect(toLatex(chain)).toBe('1 < 2 < 3');
	});

	it('should generate mixed comparison and equality chain', () => {
		// a = b < c
		const chain = relationChain([variable('a'), variable('b'), variable('c')], ['=', '<']);
		expect(toLatex(chain)).toBe('a = b < c');
	});
});
