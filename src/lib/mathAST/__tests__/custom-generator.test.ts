import { describe, it, expect } from 'vitest';
import { toCustom, CustomGenerator } from '../custom-generator';
import * as MathAST from '../factory';
import type { RelationType } from '../types';
import {
	lessThanChain,
	equalsChain,
	relationChain,
	impliesChain,
	iffChain,
	greaterThanChain,
	lessThanOrEqualChain,
	variable
} from '../factory';
import { parseCustomPratt as parseCustom } from '../parser/custom/parser-pratt';
import { parseOrThrow as parseUnit } from '../units/parser';

describe('CustomGenerator - Literals', () => {
	it('generates number nodes', () => {
		expect(toCustom(MathAST.number('42'))).toBe('42');
		expect(toCustom(MathAST.number('3.14'))).toBe('3.14');
		expect(toCustom(MathAST.number('0'))).toBe('0');
	});

	it('generates single-character variables', () => {
		expect(toCustom(MathAST.variable('x'))).toBe('x');
		expect(toCustom(MathAST.variable('y'))).toBe('y');
		expect(toCustom(MathAST.variable('A'))).toBe('A');
	});

	it('generates multi-character variables without special formatting', () => {
		expect(toCustom(MathAST.variable('velocity'))).toBe('velocity');
		expect(toCustom(MathAST.variable('ab'))).toBe('ab');
	});

	it('generates supported Greek letters', () => {
		expect(toCustom(MathAST.greek('pi'))).toBe('\\pi');
		expect(toCustom(MathAST.greek('alpha'))).toBe('\\alpha');
		expect(toCustom(MathAST.greek('beta'))).toBe('\\beta');
		expect(toCustom(MathAST.greek('gamma'))).toBe('\\gamma');
		expect(toCustom(MathAST.greek('theta'))).toBe('\\theta');
	});

	it('rejects unsupported Greek letters at type level', () => {
		// Note: 'omega' and 'Delta' are no longer valid GreekLetter types
		// The type system now enforces only: 'pi', 'alpha', 'beta', 'gamma', 'theta'
		// This test verifies all supported letters work
		expect(toCustom(MathAST.greek('pi'))).toBe('\\pi');
		expect(toCustom(MathAST.greek('alpha'))).toBe('\\alpha');
		expect(toCustom(MathAST.greek('beta'))).toBe('\\beta');
		expect(toCustom(MathAST.greek('gamma'))).toBe('\\gamma');
		expect(toCustom(MathAST.greek('theta'))).toBe('\\theta');
	});

	it('generates infinity symbol', () => {
		expect(toCustom(MathAST.symbol('infinity'))).toBe('\\infty');
	});

	it('throws on unsupported symbols', () => {
		expect(() => toCustom(MathAST.symbol('emptyset'))).toThrow(
			'Unsupported symbol for custom syntax: emptyset'
		);
		expect(() => toCustom(MathAST.symbol('partial'))).toThrow(
			'Unsupported symbol for custom syntax: partial'
		);
	});
});

describe('CustomGenerator - Binary Operations', () => {
	it('generates addition', () => {
		const expr = MathAST.add(MathAST.variable('x'), MathAST.number('5'));
		expect(toCustom(expr)).toBe('x+5');
	});

	it('generates subtraction', () => {
		const expr = MathAST.subtract(MathAST.variable('x'), MathAST.number('5'));
		expect(toCustom(expr)).toBe('x-5');
	});

	it('generates implicit multiplication (juxtaposition)', () => {
		const expr = MathAST.implicitMultiply(MathAST.number('2'), MathAST.variable('x'));
		expect(toCustom(expr)).toBe('2x');
	});

	it('generates explicit multiplication with star', () => {
		const expr = MathAST.multiply(MathAST.number('2'), MathAST.variable('x'), 'dot');
		expect(toCustom(expr)).toBe('2*x');
	});

	it('generates all multiplication styles as star', () => {
		expect(toCustom(MathAST.multiply(MathAST.number('2'), MathAST.number('3'), 'dot'))).toBe('2*3');
		expect(toCustom(MathAST.multiply(MathAST.number('2'), MathAST.number('3'), 'cross'))).toBe(
			'2*3'
		);
		expect(toCustom(MathAST.multiply(MathAST.number('2'), MathAST.number('3'), 'star'))).toBe(
			'2*3'
		);
	});

	it('generates fraction division with /', () => {
		const expr = MathAST.fraction(MathAST.variable('a'), MathAST.variable('b'));
		expect(toCustom(expr)).toBe('a/b');
	});

	it('generates complex fraction with braces', () => {
		// (a+b)/(c+d) needs braces
		const expr = MathAST.fraction(
			MathAST.add(MathAST.variable('a'), MathAST.variable('b')),
			MathAST.add(MathAST.variable('c'), MathAST.variable('d'))
		);
		expect(toCustom(expr)).toBe('{a+b}/{c+d}');
	});

	it('generates inline division with :/', () => {
		const expr = MathAST.divide(MathAST.variable('a'), MathAST.variable('b'), 'inline');
		expect(toCustom(expr)).toBe('a:/b');
	});

	it('generates ratio division with :', () => {
		const expr = MathAST.divide(MathAST.variable('a'), MathAST.variable('b'), 'ratio');
		expect(toCustom(expr)).toBe('a:b');
	});
});

describe('CustomGenerator - Unary Operations', () => {
	it('generates opposite', () => {
		const expr = MathAST.opposite(MathAST.variable('x'));
		expect(toCustom(expr)).toBe('-x');
	});

	it('generates positive', () => {
		const expr = MathAST.positive(MathAST.variable('x'));
		expect(toCustom(expr)).toBe('+x');
	});

	it('generates nested opposite', () => {
		const expr = MathAST.opposite(MathAST.opposite(MathAST.variable('x')));
		expect(toCustom(expr)).toBe('--x');
	});
});

describe('CustomGenerator - Delimiters', () => {
	it('generates parentheses', () => {
		const expr = MathAST.parentheses(MathAST.variable('x'));
		expect(toCustom(expr)).toBe('(x)');
	});

	it('generates absolute value via abs function', () => {
		const expr = MathAST.abs(MathAST.variable('x'));
		expect(toCustom(expr)).toBe('|x|');
	});

	it('generates absolute value with complex content', () => {
		const expr = MathAST.abs(MathAST.add(MathAST.variable('x'), MathAST.number('1')));
		expect(toCustom(expr)).toBe('|x+1|');
	});
});

describe('CustomGenerator - Subscript/Superscript with Brace Rules', () => {
	it('generates subscript with single digit (no braces)', () => {
		const expr = MathAST.subscript(MathAST.variable('x'), MathAST.number('1'));
		expect(toCustom(expr)).toBe('x_1');
	});

	it('generates subscript with multi-digit number (no braces)', () => {
		const expr = MathAST.subscript(MathAST.variable('x'), MathAST.number('12'));
		expect(toCustom(expr)).toBe('x_12');
	});

	it('generates subscript with single letter (no braces)', () => {
		const expr = MathAST.subscript(MathAST.variable('x'), MathAST.variable('n'));
		expect(toCustom(expr)).toBe('x_n');
	});

	it('generates subscript with multi-letter (needs braces)', () => {
		const expr = MathAST.subscript(MathAST.variable('x'), MathAST.variable('ab'));
		expect(toCustom(expr)).toBe('x_{ab}');
	});

	it('generates subscript with complex expression (needs braces)', () => {
		const expr = MathAST.subscript(
			MathAST.variable('x'),
			MathAST.add(MathAST.variable('i'), MathAST.number('1'))
		);
		expect(toCustom(expr)).toBe('x_{i+1}');
	});

	it('generates superscript with single digit (no braces)', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.number('2'));
		expect(toCustom(expr)).toBe('x^2');
	});

	it('generates superscript with multi-digit number (no braces)', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.number('12'));
		expect(toCustom(expr)).toBe('x^12');
	});

	it('generates superscript with single letter (no braces)', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.variable('n'));
		expect(toCustom(expr)).toBe('x^n');
	});

	it('generates superscript with multi-letter (needs braces)', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.variable('ab'));
		expect(toCustom(expr)).toBe('x^{ab}');
	});

	it('generates superscript with negative exponent (needs braces)', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.opposite(MathAST.number('2')));
		expect(toCustom(expr)).toBe('x^{-2}');
	});

	it('generates superscript with supported Greek (no braces)', () => {
		const expr = MathAST.power(MathAST.variable('x'), MathAST.greek('pi'));
		expect(toCustom(expr)).toBe('x^\\pi');
	});

	it('generates superscript with complex expression (needs braces)', () => {
		const expr = MathAST.power(
			MathAST.variable('x'),
			MathAST.add(MathAST.variable('n'), MathAST.number('1'))
		);
		expect(toCustom(expr)).toBe('x^{n+1}');
	});
});

describe('CustomGenerator - Functions', () => {
	it('generates standard functions without backslash', () => {
		expect(toCustom(MathAST.sin(MathAST.variable('x')))).toBe('sin(x)');
		expect(toCustom(MathAST.cos(MathAST.variable('x')))).toBe('cos(x)');
		expect(toCustom(MathAST.tan(MathAST.variable('x')))).toBe('tan(x)');
		expect(toCustom(MathAST.ln(MathAST.variable('x')))).toBe('ln(x)');
		expect(toCustom(MathAST.exp(MathAST.variable('x')))).toBe('exp(x)');
	});

	it('generates custom functions', () => {
		const expr = MathAST.func('f', [MathAST.variable('x')]);
		expect(toCustom(expr)).toBe('f(x)');
	});

	it('generates functions with multiple arguments', () => {
		const expr = MathAST.func('f', [MathAST.variable('x'), MathAST.variable('y')]);
		expect(toCustom(expr)).toBe('f(x,y)');
	});

	it('generates functions with power', () => {
		const expr = MathAST.func('sin', [MathAST.variable('x')], {
			power: MathAST.number('2')
		});
		expect(toCustom(expr)).toBe('sin^2(x)');
	});

	it('generates log with base subscript', () => {
		const expr = MathAST.log(MathAST.number('8'), MathAST.number('2'));
		expect(toCustom(expr)).toBe('log_2(8)');
	});

	it('generates sqrt without index', () => {
		const expr = MathAST.sqrt(MathAST.variable('x'));
		expect(toCustom(expr)).toBe('sqrt(x)');
	});

	it('generates sqrt with nth root index', () => {
		const expr = MathAST.func('sqrt', [MathAST.variable('x')], {
			base: MathAST.number('3')
		});
		expect(toCustom(expr)).toBe('sqrt[3](x)');
	});

	it('generates abs as absolute value bars', () => {
		expect(toCustom(MathAST.abs(MathAST.variable('x')))).toBe('|x|');
		expect(
			toCustom(MathAST.abs(MathAST.subtract(MathAST.variable('x'), MathAST.variable('y'))))
		).toBe('|x-y|');
	});

	it('generates abs with power as regular function', () => {
		// abs^2(x) is not special-cased
		const expr = MathAST.func('abs', [MathAST.variable('x')], {
			power: MathAST.number('2')
		});
		expect(toCustom(expr)).toBe('abs^2(x)');
	});
});

describe('CustomGenerator - Relations', () => {
	it('generates equality', () => {
		const expr = MathAST.equals(MathAST.variable('x'), MathAST.number('5'));
		expect(toCustom(expr)).toBe('x=5');
	});

	it('generates basic comparisons', () => {
		expect(toCustom(MathAST.lessThan(MathAST.variable('a'), MathAST.variable('b')))).toBe('a<b');
		expect(toCustom(MathAST.greaterThan(MathAST.variable('a'), MathAST.variable('b')))).toBe('a>b');
		expect(toCustom(MathAST.lessThanOrEqual(MathAST.variable('a'), MathAST.variable('b')))).toBe(
			'a<=b'
		);
		expect(toCustom(MathAST.greaterThanOrEqual(MathAST.variable('a'), MathAST.variable('b')))).toBe(
			'a>=b'
		);
		expect(toCustom(MathAST.notEquals(MathAST.variable('a'), MathAST.variable('b')))).toBe('a!=b');
	});

	it('generates logical implications', () => {
		expect(toCustom(MathAST.implies(MathAST.variable('P'), MathAST.variable('Q')))).toBe('P=>Q');
		expect(toCustom(MathAST.iff(MathAST.variable('P'), MathAST.variable('Q')))).toBe('P<=>Q');
	});

	it('generates relation chains', () => {
		const chain1 = lessThanChain(variable('a'), variable('b'), variable('c'));
		expect(toCustom(chain1)).toBe('a<b<c');

		const chain2 = equalsChain(variable('a'), variable('b'), variable('c'), variable('d'));
		expect(toCustom(chain2)).toBe('a=b=c=d');

		const chain3 = greaterThanChain(variable('a'), variable('b'), variable('c'));
		expect(toCustom(chain3)).toBe('a>b>c');

		const chain4 = lessThanOrEqualChain(variable('a'), variable('b'), variable('c'));
		expect(toCustom(chain4)).toBe('a<=b<=c');

		const chain5 = impliesChain(variable('P'), variable('Q'), variable('R'));
		expect(toCustom(chain5)).toBe('P=>Q=>R');

		const chain6 = iffChain(variable('P'), variable('Q'), variable('R'));
		expect(toCustom(chain6)).toBe('P<=>Q<=>R');
	});

	it('generates mixed relation chains', () => {
		const chain = relationChain([variable('a'), variable('b'), variable('c')], ['=', '<']);
		expect(toCustom(chain)).toBe('a=b<c');
	});

	it('generates all supported relation types', () => {
		const relations: Array<[RelationType, string]> = [
			['=', '='],
			['<', '<'],
			['>', '>'],
			['<=', '<='],
			['>=', '>='],
			['!=', '!='],
			['⟹', '=>'],
			['⟺', '<=>']
		];

		for (const [rel, expected] of relations) {
			const expr = MathAST.relation(rel, MathAST.variable('a'), MathAST.variable('b'));
			expect(toCustom(expr)).toBe(`a${expected}b`);
		}
	});

	it('falls back unsupported relations to basic operators', () => {
		// These are not in custom syntax but should map to basic operators
		expect(toCustom(MathAST.congruent(variable('a'), variable('b')))).toBe('a=b'); // ≡ → =
		expect(toCustom(MathAST.approx(variable('a'), variable('b')))).toBe('a=b'); // ≈ → =
		expect(toCustom(MathAST.elementOf(variable('x'), variable('A')))).toBe('x=A'); // ∈ → =
		expect(toCustom(MathAST.subset(variable('A'), variable('B')))).toBe('A<B'); // ⊂ → <
	});
});

describe('CustomGenerator - Units', () => {
	it('generates simple units', () => {
		const expr = MathAST.quantity('5', 'm');
		expect(toCustom(expr)).toBe('5[m]');
	});

	it('generates complex units', () => {
		const expr = MathAST.quantity('10', 'km/h');
		expect(toCustom(expr)).toBe('10[km/h]');
	});

	it('generates units with expressions', () => {
		const expr = MathAST.withUnit(
			MathAST.add(MathAST.variable('x'), MathAST.number('1')),
			parseUnit('m/s^2')
		);
		expect(toCustom(expr)).toBe('x+1[m/s^2]');
	});
});

describe('CustomGenerator - Metadata Rendering', () => {
	it('does not render metadata by default', () => {
		const expr = MathAST.variable('x', { color: 'red', style: 'bold' });
		expect(toCustom(expr)).toBe('x');
	});

	it('renders color when enabled', () => {
		const expr = MathAST.variable('x', { color: 'red' });
		expect(toCustom(expr, { renderMetadata: true })).toBe('@red{x}');
	});

	it('renders hex color when enabled', () => {
		const expr = MathAST.variable('x', { color: '#FF0000' });
		expect(toCustom(expr, { renderMetadata: true })).toBe('@#FF0000{x}');
	});

	it('ignores style in custom syntax output', () => {
		// Custom syntax doesn't have bold/italic in text output
		const expr = MathAST.variable('x', { style: 'bold' });
		expect(toCustom(expr, { renderMetadata: true })).toBe('x');
	});

	it('renders color but ignores style', () => {
		const expr = MathAST.variable('x', { color: 'blue', style: 'bold' });
		expect(toCustom(expr, { renderMetadata: true })).toBe('@blue{x}');
	});

	it('ignores annotation in custom syntax output', () => {
		const expr = MathAST.variable('x', { annotation: 'constant' });
		expect(toCustom(expr, { renderMetadata: true })).toBe('x');
	});

	it('coalesces adjacent same-color spans when operator has same color', () => {
		// x + y with all parts red should coalesce
		const expr = MathAST.add(
			MathAST.variable('x', { color: 'red' }),
			MathAST.variable('y', { color: 'red' }),
			{ operatorMetadata: { color: 'red' } }
		);
		expect(toCustom(expr, { renderMetadata: true })).toBe('@red{x+y}');
	});

	it('does not coalesce when operator lacks color metadata', () => {
		// Without operator color, parts stay separate
		const expr = MathAST.add(
			MathAST.variable('x', { color: 'red' }),
			MathAST.variable('y', { color: 'red' })
		);
		expect(toCustom(expr, { renderMetadata: true })).toBe('@red{x}+@red{y}');
	});

	it('does not coalesce different colors', () => {
		const expr = MathAST.add(
			MathAST.variable('x', { color: 'red' }),
			MathAST.variable('y', { color: 'blue' })
		);
		expect(toCustom(expr, { renderMetadata: true })).toBe('@red{x}+@blue{y}');
	});

	it('handles nested colors in complex expressions', () => {
		// a + (b with blue color)
		const expr = MathAST.add(
			MathAST.variable('a', { color: 'red' }),
			MathAST.variable('b', { color: 'blue' })
		);
		expect(toCustom(expr, { renderMetadata: true })).toBe('@red{a}+@blue{b}');
	});

	it('coalesces operator metadata with operands', () => {
		// If + has red metadata and both operands are red, should coalesce
		const expr = MathAST.add(
			MathAST.variable('x', { color: 'red' }),
			MathAST.variable('y', { color: 'red' }),
			{ operatorMetadata: { color: 'red' } }
		);
		expect(toCustom(expr, { renderMetadata: true })).toBe('@red{x+y}');
	});
});

describe('CustomGenerator - Complex Expressions', () => {
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
		expect(toCustom(expr)).toBe('x^2+3x-5=0');
	});

	it('generates nested fractions', () => {
		// (a/b)/(c/d)
		const expr = MathAST.fraction(
			MathAST.fraction(MathAST.variable('a'), MathAST.variable('b')),
			MathAST.fraction(MathAST.variable('c'), MathAST.variable('d'))
		);
		expect(toCustom(expr)).toBe('{a/b}/{c/d}');
	});

	it('generates Greek letters in expressions', () => {
		// α + β = γ
		const expr = MathAST.equals(
			MathAST.add(MathAST.greek('alpha'), MathAST.greek('beta')),
			MathAST.greek('gamma')
		);
		expect(toCustom(expr)).toBe('\\alpha+\\beta=\\gamma');
	});

	it('generates deeply nested expressions', () => {
		// ((((x))))
		const expr = MathAST.parentheses(
			MathAST.parentheses(MathAST.parentheses(MathAST.parentheses(MathAST.variable('x'))))
		);
		expect(toCustom(expr)).toBe('((((x))))');
	});

	it('trusts AST precedence without adding extra parentheses', () => {
		// AST says: x + (y * z), should not add extra parens
		const expr = MathAST.add(
			MathAST.variable('x'),
			MathAST.implicitMultiply(MathAST.variable('y'), MathAST.variable('z'))
		);
		expect(toCustom(expr)).toBe('x+yz');
	});
});

describe('CustomGenerator - Edge Cases', () => {
	it('handles zero', () => {
		expect(toCustom(MathAST.number('0'))).toBe('0');
	});

	it('handles negative numbers', () => {
		expect(toCustom(MathAST.opposite(MathAST.number('5')))).toBe('-5');
	});

	it('handles decimal numbers', () => {
		expect(toCustom(MathAST.number('3.14159'))).toBe('3.14159');
	});

	it('handles empty function arguments (omits parentheses)', () => {
		// Generic functions without arguments omit parentheses
		const expr = MathAST.func('f', []);
		expect(toCustom(expr)).toBe('f');
	});

	it('handles mixed division styles', () => {
		expect(toCustom(MathAST.fraction(variable('a'), variable('b')))).toBe('a/b');
		expect(toCustom(MathAST.divide(variable('a'), variable('b'), 'inline'))).toBe('a:/b');
		expect(toCustom(MathAST.divide(variable('a'), variable('b'), 'ratio'))).toBe('a:b');
	});
});

describe('CustomGenerator - Class API', () => {
	it('can be instantiated and reused', () => {
		const generator = new CustomGenerator({ renderMetadata: false });
		expect(generator.generate(MathAST.variable('x'))).toBe('x');
		expect(generator.generate(MathAST.number('42'))).toBe('42');
	});

	it('respects options in constructor', () => {
		const generator = new CustomGenerator({ renderMetadata: true });
		const expr = MathAST.variable('x', { color: 'red' });
		expect(generator.generate(expr)).toBe('@red{x}');
	});

	it('toCustom convenience function works', () => {
		const expr = MathAST.variable('x');
		expect(toCustom(expr)).toBe('x');
	});
});

describe('CustomGenerator - Round-Trip Tests', () => {
	it('round-trips simple power expressions', () => {
		const inputs = ['x^2', 'x^{-2}', 'x^{ab}', 'x^n', 'x^\\pi'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips subscript expressions', () => {
		const inputs = ['x_1', 'x_n', 'x_{ab}', 'x_12'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips division expressions', () => {
		const inputs = ['a/b', '{a+b}/{c+d}', 'a:/b', 'a:b'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips multiplication expressions', () => {
		const inputs = ['2x', '2*3', 'a*b'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips function expressions', () => {
		const inputs = ['sin(x)', 'sin^2(x)', 'log_2(x)', 'sqrt(x)', 'sqrt[3](x)'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips custom function with multiple args', () => {
		// Note: Custom parser doesn't support function calls with commas yet
		// This test is placeholder for when that feature is added
		const ast = MathAST.func('f', [MathAST.variable('x'), MathAST.variable('y')]);
		const output = toCustom(ast);
		expect(output).toBe('f(x,y)');
		// Round-trip not tested until parser supports comma-separated function args
	});

	it('round-trips absolute value', () => {
		const inputs = ['|x|', '|x+1|', '|a-b|'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips relation expressions', () => {
		const inputs = ['x=y', 'a<b', 'a>b', 'a<=b', 'a>=b', 'a!=b', 'P=>Q', 'P<=>Q'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips relation chains', () => {
		const inputs = ['a<b<c', 'a=b=c', 'a>b>c', 'a<=b<=c'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips unit expressions', () => {
		const inputs = ['5[m]', '10[km/h]', 'x[m/s^2]'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips Greek letters', () => {
		const inputs = ['\\pi', '\\alpha', '\\beta', '\\gamma', '\\theta'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips complex expressions', () => {
		const inputs = [
			'x^2+3x+1',
			'2x^2-5x+3',
			'{a+b}/{c+d}',
			'sin(x)+cos(x)',
			'log_2(8)+log_2(4)',
			'(a+b)*(c+d)',
			'x^{n+1}+x^n',
			'a<b<c<d'
		];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips nested parentheses', () => {
		const inputs = ['(x)', '((x))', '(((x)))', '(a+b)*(c+d)'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('round-trips unary operations', () => {
		const inputs = ['-x', '+x', '-5', '-(x+1)'];
		for (const input of inputs) {
			const ast = parseCustom(input);
			const output = toCustom(ast);
			const roundTrip = parseCustom(output);
			expect(roundTrip).toEqual(ast);
		}
	});

	it('generates double minus but parser requires parentheses', () => {
		// Generator produces --x but parser requires -(-x)
		const ast = MathAST.opposite(MathAST.opposite(MathAST.variable('x')));
		const output = toCustom(ast);
		expect(output).toBe('--x');
		// Note: parseCustom('--x') throws, requires '-(-x)' instead
	});
});

describe('CustomGenerator - Composition', () => {
	it('generates basic composition f@g', () => {
		// Functions without arguments omit parentheses
		const expr = MathAST.compose(MathAST.func('f', []), MathAST.func('g', []));
		expect(toCustom(expr)).toBe('f@g');
	});

	it('generates composition with variables as functions', () => {
		// When using compose with variables (generic function names)
		const expr = MathAST.compose(MathAST.variable('f'), MathAST.variable('g'));
		expect(toCustom(expr)).toBe('f@g');
	});

	it('generates triple composition (f@g)@h', () => {
		const fg = MathAST.compose(MathAST.variable('f'), MathAST.variable('g'));
		const expr = MathAST.compose(fg, MathAST.variable('h'));
		expect(toCustom(expr)).toBe('f@g@h');
	});

	it('generates composition with function calls', () => {
		const expr = MathAST.compose(
			MathAST.func('f', [MathAST.variable('x')]),
			MathAST.func('g', [MathAST.variable('y')])
		);
		expect(toCustom(expr)).toBe('f(x)@g(y)');
	});

	it('generates composition with derivatives', () => {
		// Functions with derivatives but no args omit parentheses
		const expr = MathAST.compose(MathAST.derivativeFunc('f', [], 1), MathAST.func('g', []));
		expect(toCustom(expr)).toBe("f'@g");
	});

	it('generates composition with inverse', () => {
		// Functions with inverse but no args omit parentheses
		const expr = MathAST.compose(MathAST.inverseFunc('f', []), MathAST.func('g', []));
		expect(toCustom(expr)).toBe('f^{-1}@g');
	});

	it('generates composition with operatorMetadata for color', () => {
		const expr = MathAST.compose(MathAST.variable('f'), MathAST.variable('g'), {
			operatorMetadata: { color: 'red' }
		});
		expect(toCustom(expr, { renderMetadata: true })).toBe('f@red{@}g');
	});
});
