/**
 * Tests for the ASCIIMath tokenizer
 */

import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../tokenizer.js';
import type { Token, TokenType } from '../types.js';

/**
 * Helper function to tokenize input
 */
function tokenize(input: string): Token[] {
	const tokenizer = new Tokenizer(input);
	return tokenizer.tokenize();
}

/**
 * Helper function to check token types (ignoring whitespace and EOF)
 */
function expectTokenTypes(input: string, expectedTypes: TokenType[]): void {
	const tokens = tokenize(input);
	const actualTypes = tokens
		.filter((t) => t.type !== 'WHITESPACE' && t.type !== 'EOF')
		.map((t) => t.type);
	expect(actualTypes).toEqual(expectedTypes);
}

/**
 * Helper function to check token values (ignoring whitespace and EOF)
 */
function expectTokenValues(input: string, expectedValues: string[]): void {
	const tokens = tokenize(input);
	const actualValues = tokens
		.filter((t) => t.type !== 'WHITESPACE' && t.type !== 'EOF')
		.map((t) => t.value);
	expect(actualValues).toEqual(expectedValues);
}

describe('Tokenizer', () => {
	describe('Numbers', () => {
		it('tokenizes integers', () => {
			expectTokenTypes('123', ['NUMBER']);
			expectTokenValues('123', ['123']);
		});

		it('tokenizes decimals', () => {
			expectTokenTypes('3.14', ['NUMBER']);
			expectTokenValues('3.14', ['3.14']);
		});

		it('tokenizes zero', () => {
			expectTokenTypes('0', ['NUMBER']);
			expectTokenValues('0', ['0']);
		});

		it('tokenizes decimal starting with zero', () => {
			expectTokenTypes('0.5', ['NUMBER']);
			expectTokenValues('0.5', ['0.5']);
		});

		it('tokenizes negative numbers as OPERATOR + NUMBER', () => {
			expectTokenTypes('-5', ['OPERATOR', 'NUMBER']);
			expectTokenValues('-5', ['-', '5']);
		});

		it('tokenizes multiple numbers', () => {
			expectTokenTypes('1 2 3', ['NUMBER', 'NUMBER', 'NUMBER']);
		});
	});

	describe('Identifiers', () => {
		it('tokenizes single letters', () => {
			expectTokenTypes('x', ['IDENTIFIER']);
			expectTokenValues('x', ['x']);
		});

		it('tokenizes uppercase letters', () => {
			expectTokenTypes('X', ['IDENTIFIER']);
			expectTokenValues('X', ['X']);
		});

		it('tokenizes multi-letter identifiers', () => {
			expectTokenTypes('abc', ['IDENTIFIER']);
			expectTokenValues('abc', ['abc']);
		});

		it('tokenizes identifiers with numbers', () => {
			expectTokenTypes('x1', ['IDENTIFIER']);
			expectTokenValues('x1', ['x1']);
		});

		it('tokenizes multiple identifiers', () => {
			expectTokenTypes('x y z', ['IDENTIFIER', 'IDENTIFIER', 'IDENTIFIER']);
		});
	});

	describe('Greek letters', () => {
		it('recognizes alpha as GREEK', () => {
			expectTokenTypes('alpha', ['GREEK']);
			expectTokenValues('alpha', ['alpha']);
		});

		it('recognizes all lowercase greek', () => {
			expectTokenTypes('beta gamma delta', ['GREEK', 'GREEK', 'GREEK']);
		});

		it('recognizes pi as GREEK', () => {
			expectTokenTypes('pi', ['GREEK']);
		});

		it('recognizes theta as GREEK', () => {
			expectTokenTypes('theta', ['GREEK']);
		});

		it('recognizes omega as GREEK', () => {
			expectTokenTypes('omega', ['GREEK']);
		});

		it('recognizes uppercase greek', () => {
			expectTokenTypes('Gamma Delta Theta', ['GREEK', 'GREEK', 'GREEK']);
		});

		it('recognizes variant forms', () => {
			expectTokenTypes('varepsilon vartheta varphi', ['GREEK', 'GREEK', 'GREEK']);
		});
	});

	describe('Functions', () => {
		it('recognizes sqrt as FUNCTION', () => {
			expectTokenTypes('sqrt', ['FUNCTION']);
			expectTokenValues('sqrt', ['sqrt']);
		});

		it('recognizes sin, cos, tan', () => {
			expectTokenTypes('sin cos tan', ['FUNCTION', 'FUNCTION', 'FUNCTION']);
		});

		it('recognizes log, ln, exp', () => {
			expectTokenTypes('log ln exp', ['FUNCTION', 'FUNCTION', 'FUNCTION']);
		});

		it('recognizes abs', () => {
			expectTokenTypes('abs', ['FUNCTION']);
		});

		it('recognizes root', () => {
			expectTokenTypes('root', ['FUNCTION']);
		});
	});

	describe('Symbols', () => {
		it('recognizes oo as SYMBOL', () => {
			expectTokenTypes('oo', ['SYMBOL']);
			expectTokenValues('oo', ['oo']);
		});

		it('recognizes +- as single SYMBOL', () => {
			expectTokenTypes('+-', ['SYMBOL']);
			expectTokenValues('+-', ['+-']);
		});

		it('recognizes -+ as single SYMBOL', () => {
			expectTokenTypes('-+', ['SYMBOL']);
			expectTokenValues('-+', ['-+']);
		});

		it('recognizes <= as single SYMBOL', () => {
			expectTokenTypes('<=', ['SYMBOL']);
			expectTokenValues('<=', ['<=']);
		});

		it('recognizes >= as single SYMBOL', () => {
			expectTokenTypes('>=', ['SYMBOL']);
			expectTokenValues('>=', ['>=']);
		});

		it('recognizes != as single SYMBOL', () => {
			expectTokenTypes('!=', ['SYMBOL']);
			expectTokenValues('!=', ['!=']);
		});

		it('recognizes << and >> as SYMBOLS', () => {
			expectTokenTypes('<< >>', ['SYMBOL', 'SYMBOL']);
		});

		it('recognizes arrows', () => {
			expectTokenTypes('-> => <-> <=>', ['SYMBOL', 'SYMBOL', 'SYMBOL', 'SYMBOL']);
			expectTokenValues('-> => <-> <=>', ['->', '=>', '<->', '<=>']);
		});

		it('recognizes times and cdot', () => {
			expectTokenTypes('times cdot', ['SYMBOL', 'SYMBOL']);
		});

		it('recognizes * as SYMBOL (mapped to times)', () => {
			expectTokenTypes('*', ['SYMBOL']);
			expectTokenValues('*', ['*']);
		});

		it('recognizes div', () => {
			expectTokenTypes('div', ['SYMBOL']);
		});

		it('recognizes prop', () => {
			expectTokenTypes('prop', ['SYMBOL']);
		});

		it('recognizes ~~ (approx)', () => {
			expectTokenTypes('~~', ['SYMBOL']);
			expectTokenValues('~~', ['~~']);
		});

		it('recognizes -= (equiv)', () => {
			expectTokenTypes('-=', ['SYMBOL']);
			expectTokenValues('-=', ['-=']);
		});

		it('recognizes ~ (sim)', () => {
			expectTokenTypes('~', ['SYMBOL']);
			expectTokenValues('~', ['~']);
		});
	});

	describe('Operators', () => {
		it('tokenizes + - * / ^ _', () => {
			expectTokenTypes('+ - / ^ _', ['OPERATOR', 'OPERATOR', 'OPERATOR', 'OPERATOR', 'OPERATOR']);
			expectTokenValues('+ - / ^ _', ['+', '-', '/', '^', '_']);
		});

		it('tokenizes = < >', () => {
			expectTokenTypes('= < >', ['OPERATOR', 'OPERATOR', 'OPERATOR']);
		});

		it('tokenizes colon as OPERATOR', () => {
			expectTokenTypes(':', ['OPERATOR']);
			expectTokenValues(':', [':']);
		});

		it('tokenizes colon in expression', () => {
			expectTokenTypes('a:b', ['IDENTIFIER', 'OPERATOR', 'IDENTIFIER']);
			expectTokenValues('a:b', ['a', ':', 'b']);
		});

		it('distinguishes * as SYMBOL when standalone', () => {
			// * is in SYMBOLS, so it should be SYMBOL not OPERATOR
			expectTokenTypes('*', ['SYMBOL']);
		});

		it('* is tokenized as SYMBOL', () => {
			expectTokenTypes('*', ['SYMBOL']);
			expectTokenValues('*', ['*']);
		});
	});

	describe('Delimiters', () => {
		it('tokenizes parentheses', () => {
			expectTokenTypes('()', ['LPAREN', 'RPAREN']);
		});

		it('tokenizes brackets', () => {
			expectTokenTypes('[]', ['LBRACKET', 'RBRACKET']);
		});

		it('tokenizes braces', () => {
			expectTokenTypes('{}', ['LBRACE', 'RBRACE']);
		});

		it('tokenizes pipes', () => {
			expectTokenTypes('||', ['PIPE', 'PIPE']);
		});

		it('tokenizes single pipe', () => {
			expectTokenTypes('|', ['PIPE']);
			expectTokenValues('|', ['|']);
		});

		it('tokenizes nested delimiters', () => {
			expectTokenTypes('({[]})', ['LPAREN', 'LBRACE', 'LBRACKET', 'RBRACKET', 'RBRACE', 'RPAREN']);
		});
	});

	describe('Templates', () => {
		it('tokenizes simple {{a}}', () => {
			expectTokenTypes('{{a}}', ['TEMPLATE']);
			expectTokenValues('{{a}}', ['{{a}}']);
		});

		it('tokenizes {{eval:a+b}}', () => {
			expectTokenTypes('{{eval:a+b}}', ['TEMPLATE']);
			expectTokenValues('{{eval:a+b}}', ['{{eval:a+b}}']);
		});

		it('tokenizes {{1..10}}', () => {
			expectTokenTypes('{{1..10}}', ['TEMPLATE']);
			expectTokenValues('{{1..10}}', ['{{1..10}}']);
		});

		it('preserves nested braces in templates', () => {
			expectTokenTypes('{{x{y}z}}', ['TEMPLATE']);
			expectTokenValues('{{x{y}z}}', ['{{x{y}z}}']);
		});

		it('handles multiple templates in expression', () => {
			expectTokenTypes('{{a}}+{{b}}', ['TEMPLATE', 'OPERATOR', 'TEMPLATE']);
		});

		it('preserves template content exactly', () => {
			const tokens = tokenize('{{eval:2+3}}');
			expect(tokens[0].value).toBe('{{eval:2+3}}');
		});

		it('handles complex template content', () => {
			expectTokenValues('{{range:1..100}}', ['{{range:1..100}}']);
		});
	});

	describe('Whitespace', () => {
		it('tokenizes spaces', () => {
			const tokens = tokenize(' ');
			expect(tokens[0].type).toBe('WHITESPACE');
		});

		it('groups consecutive whitespace', () => {
			const tokens = tokenize('   ');
			const whitespaceTokens = tokens.filter((t) => t.type === 'WHITESPACE');
			expect(whitespaceTokens).toHaveLength(1);
			expect(whitespaceTokens[0].value).toBe('   ');
		});

		it('preserves whitespace between tokens', () => {
			const tokens = tokenize('a  b');
			expect(tokens).toHaveLength(4); // IDENTIFIER, WHITESPACE, IDENTIFIER, EOF
			expect(tokens[1].type).toBe('WHITESPACE');
			expect(tokens[1].value).toBe('  ');
		});

		it('handles tabs and newlines', () => {
			const tokens = tokenize('\t\n');
			expect(tokens[0].type).toBe('WHITESPACE');
			expect(tokens[0].value).toBe('\t\n');
		});
	});

	describe('Complex expressions', () => {
		it('tokenizes a/b', () => {
			expectTokenTypes('a/b', ['IDENTIFIER', 'OPERATOR', 'IDENTIFIER']);
		});

		it('tokenizes {3+x}/{2-y}', () => {
			expectTokenTypes('{3+x}/{2-y}', [
				'LBRACE',
				'NUMBER',
				'OPERATOR',
				'IDENTIFIER',
				'RBRACE',
				'OPERATOR',
				'LBRACE',
				'NUMBER',
				'OPERATOR',
				'IDENTIFIER',
				'RBRACE'
			]);
		});

		it('tokenizes sqrt({{a}})', () => {
			expectTokenTypes('sqrt({{a}})', ['FUNCTION', 'LPAREN', 'TEMPLATE', 'RPAREN']);
		});

		it('tokenizes x^2 + y^2', () => {
			expectTokenTypes('x^2+y^2', [
				'IDENTIFIER',
				'OPERATOR',
				'NUMBER',
				'OPERATOR',
				'IDENTIFIER',
				'OPERATOR',
				'NUMBER'
			]);
		});

		it('tokenizes sin(alpha)', () => {
			expectTokenTypes('sin(alpha)', ['FUNCTION', 'LPAREN', 'GREEK', 'RPAREN']);
		});

		it('tokenizes x_i^2', () => {
			expectTokenTypes('x_i^2', ['IDENTIFIER', 'OPERATOR', 'IDENTIFIER', 'OPERATOR', 'NUMBER']);
		});

		it('tokenizes sqrt(x^2+y^2)', () => {
			expectTokenTypes('sqrt(x^2+y^2)', [
				'FUNCTION',
				'LPAREN',
				'IDENTIFIER',
				'OPERATOR',
				'NUMBER',
				'OPERATOR',
				'IDENTIFIER',
				'OPERATOR',
				'NUMBER',
				'RPAREN'
			]);
		});

		it('tokenizes x <= y < z', () => {
			expectTokenTypes('x<=y<z', ['IDENTIFIER', 'SYMBOL', 'IDENTIFIER', 'OPERATOR', 'IDENTIFIER']);
		});

		it('tokenizes root(3)(x)', () => {
			expectTokenTypes('root(3)(x)', [
				'FUNCTION',
				'LPAREN',
				'NUMBER',
				'RPAREN',
				'LPAREN',
				'IDENTIFIER',
				'RPAREN'
			]);
		});
	});

	describe('Edge cases', () => {
		it('handles empty string', () => {
			const tokens = tokenize('');
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe('EOF');
		});

		it('handles EOF token', () => {
			const tokens = tokenize('x');
			expect(tokens[tokens.length - 1].type).toBe('EOF');
		});

		it('handles unknown characters gracefully', () => {
			// Unknown characters are skipped
			const tokens = tokenize('a@b');
			const nonEOF = tokens.filter((t) => t.type !== 'EOF');
			expect(nonEOF).toHaveLength(2);
			expect(nonEOF[0].value).toBe('a');
			expect(nonEOF[1].value).toBe('b');
		});

		it('handles only whitespace', () => {
			const tokens = tokenize('   ');
			expect(tokens).toHaveLength(2); // WHITESPACE, EOF
		});
	});

	describe('Token positions', () => {
		it('sets correct positions for single token', () => {
			const tokens = tokenize('123');
			expect(tokens[0].start).toBe(0);
			expect(tokens[0].end).toBe(3);
		});

		it('sets correct positions for multiple tokens', () => {
			const tokens = tokenize('a+b');
			const nonEOF = tokens.filter((t) => t.type !== 'EOF');
			expect(nonEOF[0].start).toBe(0);
			expect(nonEOF[0].end).toBe(1);
			expect(nonEOF[1].start).toBe(1);
			expect(nonEOF[1].end).toBe(2);
			expect(nonEOF[2].start).toBe(2);
			expect(nonEOF[2].end).toBe(3);
		});

		it('sets correct positions with whitespace', () => {
			const tokens = tokenize('a b');
			expect(tokens[0].start).toBe(0);
			expect(tokens[0].end).toBe(1);
			expect(tokens[1].start).toBe(1);
			expect(tokens[1].end).toBe(2);
			expect(tokens[2].start).toBe(2);
			expect(tokens[2].end).toBe(3);
		});

		it('sets correct positions for templates', () => {
			const tokens = tokenize('{{abc}}');
			expect(tokens[0].start).toBe(0);
			expect(tokens[0].end).toBe(7);
		});
	});

	describe('Symbol precedence', () => {
		it('matches longer symbols first', () => {
			// Test that <= is matched as one token, not < and =
			expectTokenTypes('<=', ['SYMBOL']);
			expectTokenValues('<=', ['<=']);
		});

		it('matches <=> as one token', () => {
			expectTokenTypes('<=>', ['SYMBOL']);
			expectTokenValues('<=>', ['<=>']);
		});

		it('matches ~~ as one token', () => {
			expectTokenTypes('~~', ['SYMBOL']);
			expectTokenValues('~~', ['~~']);
		});

		it('matches -= as one token', () => {
			expectTokenTypes('-=', ['SYMBOL']);
			expectTokenValues('-=', ['-=']);
		});
	});
});
