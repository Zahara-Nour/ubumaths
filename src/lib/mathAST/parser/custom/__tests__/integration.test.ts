/**
 * Integration tests for custom syntax parser
 *
 * Verifies:
 * 1. Parser parity: Pratt and RD produce identical AST for all inputs
 * 2. Round-trip: custom → AST → LaTeX produces valid LaTeX
 * 3. Error handling parity: both parsers error on the same invalid inputs
 */

import { describe, it, expect } from 'vitest';
import { parseCustomPratt, parseCustomRD, parseCustom, parseCustomSafe } from '../index';
import { toLatex } from '../../../latex-generator';
import { parseLatex } from '../../index';

describe('Custom Parser Integration', () => {
	describe('Parser Parity (Pratt vs RD)', () => {
		const PARITY_CASES = [
			// Literals
			'42',
			'3.14',
			'3,14',
			'x',
			'y',
			'\\pi',
			'\\alpha',
			'\\infty',

			// Division at PRIMARY level (CRITICAL)
			'2+3/4+5',
			'2*3/4',
			'a/b',
			'a/b/c',
			'{2+3}/{4+5}',
			'(2+3)/(4+5)',

			// Division at multiplicative level
			'2:/3',
			'a:b',
			'2*3:/4',
			'a:/b:/c',

			// Multiplication
			'2*3',
			'2x',
			'xy',
			'2\\pi',
			'x(y+1)',
			'(a)(b)',

			// Subscripts and superscripts
			'x^2',
			'x^12',
			'x^{-2}',
			'x_1',
			'x_12',
			'x_{ab}',
			'x_1^2',

			// Functions
			'sin(x)',
			'cos(x)',
			'tan(x)',
			'ln(x)',
			'log(x)',
			'exp(x)',
			'sqrt(x)',
			'sin^2(x)',
			'log_2(8)',
			'sqrt(x+1)',

			// Absolute value
			'|x|',
			'|x+1|',
			'2|x|',

			// Colors
			'@red{x}',
			'@blue{a+b}',
			'@#FF0000{x}',
			'@red{a+@blue{b}}',

			// Units
			'5[m]',
			'10[km/h]',
			'9.8[m/s^2]',
			'{2+3}[kg]',

			// Parentheses vs braces
			'(a+b)',
			'{a+b}',
			'(a+b)*c',
			'{a+b}*c',

			// Relations
			'a=b',
			'x<y',
			'a<=b',
			'x>=y',
			'a!=b',
			'p=>q',
			'a<=>b',

			// Complex expressions
			'2x^2+3x+1',
			'sin(x)^2+cos(x)^2',
			'a/b+c/d',
			'-x^2',
			'(-x)^2',
			'2+3/4*5:/6',
			'@red{x^2}+@blue{y^2}'
		];

		PARITY_CASES.forEach((input) => {
			it(`should produce identical AST for: ${input}`, () => {
				const prattAST = parseCustomPratt(input);
				const rdAST = parseCustomRD(input);
				expect(JSON.stringify(rdAST)).toBe(JSON.stringify(prattAST));
			});
		});
	});

	describe('Round-trip: Custom → AST → LaTeX', () => {
		const ROUNDTRIP_CASES = [
			{ custom: '2x', desc: 'implicit multiplication' },
			{ custom: 'a/b', desc: 'fraction' },
			{ custom: 'a:/b', desc: 'inline division' },
			{ custom: 'a:b', desc: 'ratio' },
			{ custom: 'sin(x)', desc: 'function' },
			{ custom: 'sin^2(x)', desc: 'function with power' },
			{ custom: '|x|', desc: 'absolute value' },
			{ custom: 'x^2', desc: 'superscript' },
			{ custom: 'x_1', desc: 'subscript' },
			{ custom: '\\pi', desc: 'greek letter' },
			{ custom: '5[m]', desc: 'unit' }
		];

		ROUNDTRIP_CASES.forEach(({ custom, desc }) => {
			it(`should produce valid LaTeX for ${desc}: ${custom}`, () => {
				const ast = parseCustom(custom);
				const latex = toLatex(ast);
				// Verify LaTeX is valid by parsing it
				expect(() => parseLatex(latex)).not.toThrow();
			});
		});
	});

	describe('Default exports', () => {
		it('parseCustom should produce same AST as parseCustomPratt', () => {
			const input = '2+3';
			const result1 = parseCustom(input);
			const result2 = parseCustomPratt(input);
			expect(result1).toEqual(result2);
		});

		it('parseCustomSafe should work', () => {
			const result = parseCustomSafe('2+3');
			expect(result.ast).not.toBeNull();
			expect(result.errors).toHaveLength(0);
		});

		it('parseCustom should include default generic functions', () => {
			// f'(x) should parse as a derivative function by default
			const result = parseCustom("f'(x)");
			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(result.name).toBe('f');
				expect(result.derivativeOrder).toBe(1);
			}
		});

		it('parseCustom with genericFunctions=null should disable generic functions', () => {
			// f without genericFunctions should be a variable
			const result = parseCustom('f', { genericFunctions: null });
			expect(result.type).toBe('variable');
		});
	});

	describe('Error handling parity', () => {
		const ERROR_CASES = [
			{ input: 'x^ab', desc: 'multi-letter exponent without braces' },
			{ input: 'x^-2', desc: 'negative exponent without braces' },
			{ input: 'sin x', desc: 'function without parentheses' },
			{ input: '()', desc: 'empty parentheses' }
		];

		ERROR_CASES.forEach(({ input, desc }) => {
			it(`both parsers should error on ${desc}: ${input}`, () => {
				expect(() => parseCustomPratt(input)).toThrow();
				expect(() => parseCustomRD(input)).toThrow();
			});
		});
	});
});
