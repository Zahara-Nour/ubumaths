/**
 * Custom Syntax Tokenizer - Tests
 *
 * Comprehensive tests for the custom syntax tokenizer including:
 * - Number tokenization (integers, decimals with dot and comma)
 * - Letter tokenization
 * - Symbol tokenization (\pi, \alpha, etc.)
 * - Function tokenization (sin, cos, etc.)
 * - Operator tokenization (single and multi-char)
 * - Delimiter tokenization
 * - Relation tokenization
 * - Color markers (@ and #)
 * - Position tracking
 * - Full expression tokenization
 * - Edge cases
 *
 * @module mathAST/parser/custom/__tests__/tokenizer.test
 */

import { describe, it, expect } from 'vitest';
import {
	CustomTokenizer,
	tokenize,
	isBinaryOperator,
	isRelationToken,
	isAssignmentToken,
	isLeftDelimiter,
	isRightDelimiter,
	tokenTypeToString,
	tokenToString,
	type CustomToken
} from '../tokenizer';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to get token types from an array of tokens
 */
function getTypes(tokens: CustomToken[]): string[] {
	return tokens.map((t) => t.type);
}

/**
 * Helper to get token values from an array of tokens
 */
function getValues(tokens: CustomToken[]): string[] {
	return tokens.map((t) => t.value);
}

// =============================================================================
// Number Tokenization
// =============================================================================

describe('Number tokenization', () => {
	describe('Integers', () => {
		it('should tokenize single digit', () => {
			const tokens = tokenize('5');
			expect(tokens).toHaveLength(2); // NUMBER + EOF
			expect(tokens[0]).toEqual({
				type: 'NUMBER',
				value: '5',
				position: 0,
				length: 1
			});
		});

		it('should tokenize multi-digit integer', () => {
			const tokens = tokenize('42');
			expect(tokens[0]).toEqual({
				type: 'NUMBER',
				value: '42',
				position: 0,
				length: 2
			});
		});

		it('should tokenize large integer', () => {
			const tokens = tokenize('123456789');
			expect(tokens[0].value).toBe('123456789');
		});

		it('should tokenize zero', () => {
			const tokens = tokenize('0');
			expect(tokens[0].value).toBe('0');
		});
	});

	describe('Decimals with dot', () => {
		it('should tokenize simple decimal', () => {
			const tokens = tokenize('3.14');
			expect(tokens[0]).toEqual({
				type: 'NUMBER',
				value: '3.14',
				position: 0,
				length: 4
			});
		});

		it('should tokenize decimal with leading zero', () => {
			const tokens = tokenize('0.5');
			expect(tokens[0].value).toBe('0.5');
		});

		it('should tokenize decimal with trailing zeros', () => {
			const tokens = tokenize('2.000');
			expect(tokens[0].value).toBe('2.000');
		});

		it('should tokenize integer with trailing decimal point', () => {
			const tokens = tokenize('42.');
			expect(tokens[0].value).toBe('42.');
		});
	});

	describe('Decimals with comma (French notation)', () => {
		it('should tokenize decimal with comma and normalize to dot', () => {
			const tokens = tokenize('3,14');
			expect(tokens[0]).toEqual({
				type: 'NUMBER',
				value: '3.14',
				position: 0,
				length: 4
			});
		});

		it('should tokenize comma decimal with leading zero', () => {
			const tokens = tokenize('0,5');
			expect(tokens[0].value).toBe('0.5');
		});

		it('should tokenize comma decimal with trailing zeros', () => {
			const tokens = tokenize('2,000');
			expect(tokens[0].value).toBe('2.000');
		});
	});

	describe('Comma as separator vs decimal', () => {
		it('should treat comma as COMMA token when not between digits (function args)', () => {
			const tokens = tokenize('sin(a,b)');
			// sin ( a , b )
			expect(tokens.map((t) => t.type).slice(0, -1)).toEqual([
				'FUNC',
				'LPAREN',
				'LETTER',
				'COMMA',
				'LETTER',
				'RPAREN'
			]);
		});

		it('should treat comma as decimal when between digit and digit', () => {
			const tokens = tokenize('1,5');
			expect(tokens[0].type).toBe('NUMBER');
			expect(tokens[0].value).toBe('1.5');
		});

		it('should treat comma after digit but not before digit as COMMA', () => {
			// "5,a" -> 5, then comma, then a
			const tokens = tokenize('5,a');
			expect(tokens[0]).toEqual({
				type: 'NUMBER',
				value: '5',
				position: 0,
				length: 1
			});
			expect(tokens[1].type).toBe('COMMA');
			expect(tokens[2].type).toBe('LETTER');
		});
	});

	describe('Scientific notation', () => {
		it('should tokenize simple scientific notation', () => {
			const tokens = tokenize('1e10');
			expect(tokens[0]).toEqual({
				type: 'NUMBER',
				value: '1e10',
				position: 0,
				length: 4
			});
		});

		it('should tokenize scientific notation with uppercase E', () => {
			const tokens = tokenize('1E10');
			expect(tokens[0].value).toBe('1E10');
		});

		it('should tokenize decimal with exponent', () => {
			const tokens = tokenize('3.14e10');
			expect(tokens[0].value).toBe('3.14e10');
		});

		it('should tokenize negative exponent', () => {
			const tokens = tokenize('1.5e-10');
			expect(tokens[0].value).toBe('1.5e-10');
		});

		it('should tokenize positive exponent with explicit sign', () => {
			const tokens = tokenize('1.5e+10');
			expect(tokens[0].value).toBe('1.5e+10');
		});

		it('should tokenize zero exponent', () => {
			const tokens = tokenize('1e0');
			expect(tokens[0].value).toBe('1e0');
		});

		it('should tokenize French comma decimal with exponent', () => {
			const tokens = tokenize('3,14e10');
			expect(tokens[0].value).toBe('3.14e10'); // comma normalized to dot
		});

		it('should tokenize French comma decimal with negative exponent', () => {
			const tokens = tokenize('1,5e-6');
			expect(tokens[0].value).toBe('1.5e-6');
		});

		it('should NOT include e without digits in number token', () => {
			// '1e' should be NUMBER("1") + LETTER("e")
			const tokens = tokenize('1e');
			expect(tokens[0]).toEqual({
				type: 'NUMBER',
				value: '1',
				position: 0,
				length: 1
			});
			expect(tokens[1]).toEqual({
				type: 'LETTER',
				value: 'e',
				position: 1,
				length: 1
			});
		});

		it('should NOT include e followed by letter in number token', () => {
			// '1ex' should be NUMBER("1") + LETTER("e") + LETTER("x")
			const tokens = tokenize('1ex');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].value).toBe('x');
		});

		it('should NOT include e- without digits in number token', () => {
			// '1e-' should be NUMBER("1") + LETTER("e") + MINUS("-")
			const tokens = tokenize('1e-');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].type).toBe('MINUS');
		});

		it('should NOT include e+ without digits in number token', () => {
			// '1e+' should be NUMBER("1") + LETTER("e") + PLUS("+")
			const tokens = tokenize('1e+');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].type).toBe('PLUS');
		});

		it('should correctly tokenize scientific notation followed by operator', () => {
			const tokens = tokenize('2e3+1');
			expect(tokens[0].value).toBe('2e3');
			expect(tokens[1].type).toBe('PLUS');
			expect(tokens[2].value).toBe('1');
		});

		it('should correctly tokenize scientific notation followed by letter', () => {
			const tokens = tokenize('1e10x');
			expect(tokens[0].value).toBe('1e10');
			expect(tokens[1].value).toBe('x');
		});

		it('should NOT treat variable e followed by number as scientific notation', () => {
			// 'xe10' should be LETTER("x") + LETTER("e") + NUMBER("10")
			const tokens = tokenize('xe10');
			expect(tokens[0]).toEqual({ type: 'LETTER', value: 'x', position: 0, length: 1 });
			expect(tokens[1]).toEqual({ type: 'LETTER', value: 'e', position: 1, length: 1 });
			expect(tokens[2]).toEqual({ type: 'NUMBER', value: '10', position: 2, length: 2 });
		});

		// Additional edge cases
		it('should tokenize zero mantissa with exponent', () => {
			const tokens = tokenize('0e10');
			expect(tokens[0].value).toBe('0e10');
		});

		it('should tokenize very large exponent', () => {
			const tokens = tokenize('1e999');
			expect(tokens[0].value).toBe('1e999');
		});

		it('should tokenize very small (negative) exponent', () => {
			const tokens = tokenize('1e-999');
			expect(tokens[0].value).toBe('1e-999');
		});

		it('should tokenize multi-digit exponent', () => {
			const tokens = tokenize('1.5e123');
			expect(tokens[0].value).toBe('1.5e123');
		});

		it('should tokenize exponent with leading zeros', () => {
			const tokens = tokenize('1e007');
			expect(tokens[0].value).toBe('1e007');
		});

		it('should tokenize trailing dot with exponent', () => {
			const tokens = tokenize('1.e10');
			expect(tokens[0].value).toBe('1.e10');
		});

		it('should tokenize zero decimal with exponent', () => {
			const tokens = tokenize('0.0e5');
			expect(tokens[0].value).toBe('0.0e5');
		});

		it('should correctly handle e-x pattern (not scientific)', () => {
			// '1e-x' should be NUMBER("1") + LETTER("e") + MINUS + LETTER("x")
			const tokens = tokenize('1e-x');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].type).toBe('MINUS');
			expect(tokens[3].value).toBe('x');
		});

		it('should correctly handle e+x pattern (not scientific)', () => {
			// '1e+x' should be NUMBER("1") + LETTER("e") + PLUS + LETTER("x")
			const tokens = tokenize('1e+x');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].type).toBe('PLUS');
			expect(tokens[3].value).toBe('x');
		});

		it('should tokenize scientific notation followed by subtraction', () => {
			const tokens = tokenize('1e10-5');
			expect(tokens[0].value).toBe('1e10');
			expect(tokens[1].type).toBe('MINUS');
			expect(tokens[2].value).toBe('5');
		});

		it('should tokenize scientific notation followed by multiplication', () => {
			const tokens = tokenize('1e10*2');
			expect(tokens[0].value).toBe('1e10');
			expect(tokens[1].type).toBe('STAR');
			expect(tokens[2].value).toBe('2');
		});

		it('should tokenize scientific notation followed by division', () => {
			const tokens = tokenize('1e10/2');
			expect(tokens[0].value).toBe('1e10');
			expect(tokens[1].type).toBe('SLASH');
			expect(tokens[2].value).toBe('2');
		});

		it('should tokenize scientific notation followed by caret', () => {
			const tokens = tokenize('1e10^2');
			expect(tokens[0].value).toBe('1e10');
			expect(tokens[1].type).toBe('CARET');
			expect(tokens[2].value).toBe('2');
		});

		it('should tokenize scientific notation followed by parenthesis', () => {
			const tokens = tokenize('1e10(x)');
			expect(tokens[0].value).toBe('1e10');
			expect(tokens[1].type).toBe('LPAREN');
		});

		it('should tokenize two consecutive scientific notation numbers', () => {
			const tokens = tokenize('1e10 2e5');
			expect(tokens[0].value).toBe('1e10');
			expect(tokens[1].value).toBe('2e5');
		});

		it('should NOT consume e when followed by equals', () => {
			const tokens = tokenize('1e=');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].type).toBe('EQUALS');
		});

		it('should NOT consume e when followed by less-than', () => {
			const tokens = tokenize('1e<');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].type).toBe('LESS');
		});

		it('should handle single digit mantissa and exponent', () => {
			const tokens = tokenize('5e2');
			expect(tokens[0].value).toBe('5e2');
		});

		it('should handle E after decimal point', () => {
			const tokens = tokenize('1.E5');
			expect(tokens[0].value).toBe('1.E5');
		});

		it('should NOT treat ee as scientific notation', () => {
			const tokens = tokenize('1ee2');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].value).toBe('e');
			expect(tokens[3].value).toBe('2');
		});

		it('should NOT treat eE as scientific notation', () => {
			const tokens = tokenize('1eE2');
			expect(tokens[0].value).toBe('1');
			expect(tokens[1].value).toBe('e');
			expect(tokens[2].value).toBe('E');
			expect(tokens[3].value).toBe('2');
		});

		it('should handle scientific notation at end of input', () => {
			const tokens = tokenize('3.14e2');
			expect(tokens[0].value).toBe('3.14e2');
			expect(tokens[1].type).toBe('EOF');
		});

		it('should correctly track position and length for scientific notation', () => {
			const tokens = tokenize('x+1.5e-10+y');
			const sciToken = tokens[2]; // After x, +
			expect(sciToken.value).toBe('1.5e-10');
			expect(sciToken.position).toBe(2);
			expect(sciToken.length).toBe(7);
		});

		// French comma-specific edge cases
		it('should tokenize French comma decimal with very large exponent', () => {
			const tokens = tokenize('3,14e100');
			expect(tokens[0].value).toBe('3.14e100');
		});

		it('should tokenize French comma decimal with negative exponent', () => {
			const tokens = tokenize('2,5e-3');
			expect(tokens[0].value).toBe('2.5e-3');
		});

		it('should tokenize French comma decimal with positive exponent sign', () => {
			const tokens = tokenize('1,23e+4');
			expect(tokens[0].value).toBe('1.23e+4');
		});

		it('should NOT treat comma after exponent as decimal', () => {
			// '1e10,2' should be NUMBER("1e10") + COMMA + NUMBER("2")
			const tokens = tokenize('1e10,2');
			expect(tokens[0].value).toBe('1e10');
			expect(tokens[1].type).toBe('COMMA');
			expect(tokens[2].value).toBe('2');
		});

		it('should handle French notation in function arguments', () => {
			// In function args, comma is separator, not decimal
			const tokens = tokenize('sin(1,5e2, 2,3e-1)');
			// sin ( 1.5e2 , 2.3e-1 ) - but the second comma after 1,5e2 is COMMA
			expect(tokens[0].type).toBe('FUNC');
			expect(tokens[2].value).toBe('1.5e2');
			expect(tokens[3].type).toBe('COMMA');
			expect(tokens[4].value).toBe('2.3e-1');
		});

		it('should handle zero French comma decimal with exponent', () => {
			const tokens = tokenize('0,0e5');
			expect(tokens[0].value).toBe('0.0e5');
		});

		it('should handle scientific notation with uppercase E and French comma', () => {
			const tokens = tokenize('1,5E10');
			expect(tokens[0].value).toBe('1.5E10');
		});
	});
});

// =============================================================================
// Letter Tokenization
// =============================================================================

describe('Letter tokenization', () => {
	it('should tokenize lowercase letters', () => {
		const tokens = tokenize('x');
		expect(tokens[0]).toEqual({
			type: 'LETTER',
			value: 'x',
			position: 0,
			length: 1
		});
	});

	it('should tokenize uppercase letters', () => {
		const tokens = tokenize('X');
		expect(tokens[0]).toEqual({
			type: 'LETTER',
			value: 'X',
			position: 0,
			length: 1
		});
	});

	it('should tokenize multiple letters as separate tokens (non-function)', () => {
		const tokens = tokenize('abc');
		expect(tokens).toHaveLength(4); // a, b, c, EOF
		expect(getValues(tokens.slice(0, 3))).toEqual(['a', 'b', 'c']);
		expect(getTypes(tokens.slice(0, 3))).toEqual(['LETTER', 'LETTER', 'LETTER']);
	});

	it('should tokenize all lowercase letters', () => {
		// Note: this will skip letters that form function names like s-i-n
		const input = 'abcdefghijklmnopqrstuvwxyz';
		const tokens = tokenize(input);
		// Some sequences will form functions, let's check the first few
		expect(tokens[0].type).toBe('LETTER');
		expect(tokens[0].value).toBe('a');
	});

	it('should tokenize all uppercase letters', () => {
		const input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const tokens = tokenize(input);
		// All should be letters (no uppercase functions)
		expect(tokens).toHaveLength(27); // 26 letters + EOF
		expect(getTypes(tokens.slice(0, 26))).toEqual(Array(26).fill('LETTER'));
	});
});

// =============================================================================
// Symbol Tokenization (after backslash)
// =============================================================================

describe('Symbol tokenization', () => {
	const validSymbols = ['pi', 'alpha', 'beta', 'gamma', 'theta', 'infty'];

	it.each(validSymbols)('should tokenize \\%s as SYMBOL', (symbol) => {
		const tokens = tokenize(`\\${symbol}`);
		expect(tokens[0]).toEqual({
			type: 'SYMBOL',
			value: symbol,
			position: 0,
			length: symbol.length + 1 // +1 for backslash
		});
	});

	it('should return BACKSLASH for unknown symbol', () => {
		const tokens = tokenize('\\unknown');
		// Should return backslash, then the letters
		expect(tokens[0].type).toBe('BACKSLASH');
		expect(tokens[0].value).toBe('\\');
		// Following letters should be tokenized separately
		expect(tokens[1].type).toBe('LETTER');
	});

	it('should return BACKSLASH for backslash at end of input', () => {
		const tokens = tokenize('x\\');
		expect(tokens[0].type).toBe('LETTER');
		expect(tokens[1].type).toBe('BACKSLASH');
	});

	it('should return BACKSLASH for backslash followed by non-letter', () => {
		const tokens = tokenize('\\+');
		expect(tokens[0].type).toBe('BACKSLASH');
		expect(tokens[1].type).toBe('PLUS');
	});

	it('should handle symbol followed by other content', () => {
		const tokens = tokenize('\\pi+x');
		expect(tokens[0]).toEqual({
			type: 'SYMBOL',
			value: 'pi',
			position: 0,
			length: 3
		});
		expect(tokens[1].type).toBe('PLUS');
		expect(tokens[2].type).toBe('LETTER');
	});
});

// =============================================================================
// Function Tokenization
// =============================================================================

describe('Function tokenization', () => {
	const functions = ['sin', 'cos', 'tan', 'ln', 'log', 'exp', 'sqrt'];

	it.each(functions)('should tokenize %s as FUNC', (func) => {
		const tokens = tokenize(func);
		expect(tokens[0]).toEqual({
			type: 'FUNC',
			value: func,
			position: 0,
			length: func.length
		});
	});

	it('should tokenize function with parentheses', () => {
		const tokens = tokenize('sin(x)');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['FUNC', 'LPAREN', 'LETTER', 'RPAREN']);
		expect(getValues(tokens.slice(0, -1))).toEqual(['sin', '(', 'x', ')']);
	});

	it('should tokenize function with multiple arguments', () => {
		const tokens = tokenize('log(a,b)');
		expect(getTypes(tokens.slice(0, -1))).toEqual([
			'FUNC',
			'LPAREN',
			'LETTER',
			'COMMA',
			'LETTER',
			'RPAREN'
		]);
	});

	it('should tokenize sqrt with argument', () => {
		const tokens = tokenize('sqrt(2)');
		expect(tokens[0].type).toBe('FUNC');
		expect(tokens[0].value).toBe('sqrt');
	});

	it('should not tokenize partial function names as FUNC', () => {
		// "si" is not a function, should be two letters
		const tokens = tokenize('si');
		expect(tokens[0].type).toBe('LETTER');
		expect(tokens[0].value).toBe('s');
		expect(tokens[1].type).toBe('LETTER');
		expect(tokens[1].value).toBe('i');
	});

	it('should tokenize consecutive functions', () => {
		const tokens = tokenize('sincos');
		expect(tokens[0].type).toBe('FUNC');
		expect(tokens[0].value).toBe('sin');
		expect(tokens[1].type).toBe('FUNC');
		expect(tokens[1].value).toBe('cos');
	});
});

// =============================================================================
// Operator Tokenization
// =============================================================================

describe('Operator tokenization', () => {
	describe('Single character operators', () => {
		it('should tokenize plus', () => {
			const tokens = tokenize('+');
			expect(tokens[0]).toEqual({
				type: 'PLUS',
				value: '+',
				position: 0,
				length: 1
			});
		});

		it('should tokenize minus', () => {
			const tokens = tokenize('-');
			expect(tokens[0].type).toBe('MINUS');
		});

		it('should tokenize star', () => {
			const tokens = tokenize('*');
			expect(tokens[0].type).toBe('STAR');
		});

		it('should tokenize slash', () => {
			const tokens = tokenize('/');
			expect(tokens[0].type).toBe('SLASH');
		});

		it('should tokenize caret (exponent)', () => {
			const tokens = tokenize('^');
			expect(tokens[0].type).toBe('CARET');
		});

		it('should tokenize underscore (subscript)', () => {
			const tokens = tokenize('_');
			expect(tokens[0].type).toBe('UNDERSCORE');
		});

		it('should tokenize colon', () => {
			const tokens = tokenize(':');
			expect(tokens[0].type).toBe('COLON');
		});
	});

	describe('Colon vs colon-slash disambiguation', () => {
		it('should tokenize :/ as single COLON_SLASH token', () => {
			const tokens = tokenize(':/');
			expect(tokens[0]).toEqual({
				type: 'COLON_SLASH',
				value: ':/',
				position: 0,
				length: 2
			});
		});

		it('should tokenize : followed by non-slash as separate tokens', () => {
			const tokens = tokenize(':x');
			expect(tokens[0].type).toBe('COLON');
			expect(tokens[1].type).toBe('LETTER');
		});

		it('should tokenize :/ in expression', () => {
			const tokens = tokenize('a:/b');
			expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'COLON_SLASH', 'LETTER']);
		});

		it('should handle colon at end of input', () => {
			const tokens = tokenize('a:');
			expect(tokens[0].type).toBe('LETTER');
			expect(tokens[1].type).toBe('COLON');
		});
	});

	describe('Assignment operators', () => {
		it('should tokenize := as ASSIGN token', () => {
			const tokens = tokenize(':=');
			expect(tokens[0]).toEqual({
				type: 'ASSIGN',
				value: ':=',
				position: 0,
				length: 2
			});
		});

		it('should tokenize <- as ARROW token', () => {
			const tokens = tokenize('<-');
			expect(tokens[0]).toEqual({
				type: 'ARROW',
				value: '<-',
				position: 0,
				length: 2
			});
		});

		it('should tokenize := in assignment expression', () => {
			const tokens = tokenize('x:=5');
			expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'ASSIGN', 'NUMBER']);
		});

		it('should tokenize <- in assignment expression', () => {
			const tokens = tokenize('x<-5');
			expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'ARROW', 'NUMBER']);
		});

		it('should prefer <- over < followed by MINUS', () => {
			// Adjacent <- is ARROW, not < then -
			const tokens = tokenize('x<-5');
			expect(tokens[0].type).toBe('LETTER');
			expect(tokens[1].type).toBe('ARROW');
			expect(tokens[2].type).toBe('NUMBER');
		});

		it('should tokenize < - with space as separate tokens', () => {
			// Space breaks the ARROW pattern, so we get LESS, MINUS
			const tokens = tokenize('x < -5');
			expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'LESS', 'MINUS', 'NUMBER']);
		});

		it('should prefer := over : followed by =', () => {
			const tokens = tokenize('x:=y');
			expect(tokens[1].type).toBe('ASSIGN');
		});
	});
});

// =============================================================================
// Relation Tokenization
// =============================================================================

describe('Relation tokenization', () => {
	describe('Single character relations', () => {
		it('should tokenize equals', () => {
			const tokens = tokenize('=');
			expect(tokens[0].type).toBe('EQUALS');
		});

		it('should tokenize less than', () => {
			const tokens = tokenize('<');
			expect(tokens[0].type).toBe('LESS');
		});

		it('should tokenize greater than', () => {
			const tokens = tokenize('>');
			expect(tokens[0].type).toBe('GREATER');
		});
	});

	describe('Multi-character relations', () => {
		it('should tokenize <= as LESS_EQUAL', () => {
			const tokens = tokenize('<=');
			expect(tokens[0]).toEqual({
				type: 'LESS_EQUAL',
				value: '<=',
				position: 0,
				length: 2
			});
		});

		it('should tokenize >= as GREATER_EQUAL', () => {
			const tokens = tokenize('>=');
			expect(tokens[0]).toEqual({
				type: 'GREATER_EQUAL',
				value: '>=',
				position: 0,
				length: 2
			});
		});

		it('should tokenize != as NOT_EQUAL', () => {
			const tokens = tokenize('!=');
			expect(tokens[0]).toEqual({
				type: 'NOT_EQUAL',
				value: '!=',
				position: 0,
				length: 2
			});
		});

		it('should tokenize <=> as IFF', () => {
			const tokens = tokenize('<=>');
			expect(tokens[0]).toEqual({
				type: 'IFF',
				value: '<=>',
				position: 0,
				length: 3
			});
		});

		it('should tokenize => as IMPLIES', () => {
			const tokens = tokenize('=>');
			expect(tokens[0]).toEqual({
				type: 'IMPLIES',
				value: '=>',
				position: 0,
				length: 2
			});
		});
	});

	describe('Relation disambiguation', () => {
		it('should prefer <=> over <=', () => {
			const tokens = tokenize('<=>');
			expect(tokens[0].type).toBe('IFF');
			expect(tokens).toHaveLength(2); // IFF + EOF
		});

		it('should tokenize <= followed by letter then > as LESS_EQUAL, LETTER, GREATER', () => {
			// Note: whitespace is stripped, so "<= >" becomes "<=>" which is IFF
			// To test LESS_EQUAL followed by GREATER, we need something between them
			const tokens = tokenize('<=x>');
			expect(tokens[0].type).toBe('LESS_EQUAL');
			expect(tokens[1].type).toBe('LETTER');
			expect(tokens[2].type).toBe('GREATER');
		});

		it('should tokenize < followed by = as LESS_EQUAL', () => {
			const tokens = tokenize('x<=y');
			expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'LESS_EQUAL', 'LETTER']);
		});
	});
});

// =============================================================================
// Delimiter Tokenization
// =============================================================================

describe('Delimiter tokenization', () => {
	it('should tokenize left brace', () => {
		const tokens = tokenize('{');
		expect(tokens[0].type).toBe('LBRACE');
	});

	it('should tokenize right brace', () => {
		const tokens = tokenize('}');
		expect(tokens[0].type).toBe('RBRACE');
	});

	it('should tokenize left parenthesis', () => {
		const tokens = tokenize('(');
		expect(tokens[0].type).toBe('LPAREN');
	});

	it('should tokenize right parenthesis', () => {
		const tokens = tokenize(')');
		expect(tokens[0].type).toBe('RPAREN');
	});

	it('should tokenize left bracket', () => {
		const tokens = tokenize('[');
		expect(tokens[0].type).toBe('LBRACKET');
	});

	it('should tokenize right bracket', () => {
		const tokens = tokenize(']');
		expect(tokens[0].type).toBe('RBRACKET');
	});

	it('should tokenize pipe', () => {
		const tokens = tokenize('|');
		expect(tokens[0].type).toBe('PIPE');
	});
});

// =============================================================================
// Color Markers
// =============================================================================

describe('Color markers', () => {
	it('should tokenize @ as AT', () => {
		const tokens = tokenize('@');
		expect(tokens[0]).toEqual({
			type: 'AT',
			value: '@',
			position: 0,
			length: 1
		});
	});

	it('should tokenize # as HASH', () => {
		const tokens = tokenize('#');
		expect(tokens[0]).toEqual({
			type: 'HASH',
			value: '#',
			position: 0,
			length: 1
		});
	});

	it('should tokenize color expression @red{x}', () => {
		const tokens = tokenize('@red{x}');
		expect(getTypes(tokens.slice(0, -1))).toEqual([
			'AT',
			'LETTER',
			'LETTER',
			'LETTER',
			'LBRACE',
			'LETTER',
			'RBRACE'
		]);
	});

	it('should tokenize hex color #FF0000', () => {
		const tokens = tokenize('#FF0000');
		expect(tokens[0].type).toBe('HASH');
		// Following characters will be letters and numbers
	});

	it('should tokenize composition expression f@g', () => {
		const tokens = tokenize('f@g');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'AT', 'LETTER']);
		expect(getValues(tokens.slice(0, -1))).toEqual(['f', '@', 'g']);
	});

	it('should tokenize f@g@h for triple composition', () => {
		const tokens = tokenize('f@g@h');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'AT', 'LETTER', 'AT', 'LETTER']);
	});
});

// =============================================================================
// Position Tracking
// =============================================================================

describe('Position tracking', () => {
	it('should track positions in simple expression (whitespace preserved)', () => {
		const tokens = tokenize('x + 2');
		// Positions reflect original input with whitespace preserved
		expect(tokens[0]).toEqual({ type: 'LETTER', value: 'x', position: 0, length: 1 });
		expect(tokens[1]).toEqual({ type: 'PLUS', value: '+', position: 2, length: 1 });
		expect(tokens[2]).toEqual({ type: 'NUMBER', value: '2', position: 4, length: 1 });
	});

	it('should track positions with functions', () => {
		const tokens = tokenize('sin(x)');
		expect(tokens[0]).toEqual({ type: 'FUNC', value: 'sin', position: 0, length: 3 });
		expect(tokens[1]).toEqual({ type: 'LPAREN', value: '(', position: 3, length: 1 });
		expect(tokens[2]).toEqual({ type: 'LETTER', value: 'x', position: 4, length: 1 });
		expect(tokens[3]).toEqual({ type: 'RPAREN', value: ')', position: 5, length: 1 });
	});

	it('should track positions with multi-digit numbers', () => {
		const tokens = tokenize('42+3.14');
		expect(tokens[0].position).toBe(0);
		expect(tokens[0].length).toBe(2);
		expect(tokens[2].position).toBe(3);
		expect(tokens[2].length).toBe(4);
	});

	it('should track positions with multi-char operators', () => {
		const tokens = tokenize('a<=b');
		expect(tokens[0]).toEqual({ type: 'LETTER', value: 'a', position: 0, length: 1 });
		expect(tokens[1]).toEqual({ type: 'LESS_EQUAL', value: '<=', position: 1, length: 2 });
		expect(tokens[2]).toEqual({ type: 'LETTER', value: 'b', position: 3, length: 1 });
	});

	it('should report correct position at EOF', () => {
		const tokens = tokenize('abc');
		const eof = tokens[tokens.length - 1];
		expect(eof.type).toBe('EOF');
		expect(eof.position).toBe(3);
	});

	it('should track positions with symbols', () => {
		const tokens = tokenize('\\pi+\\alpha');
		expect(tokens[0]).toEqual({ type: 'SYMBOL', value: 'pi', position: 0, length: 3 });
		expect(tokens[1]).toEqual({ type: 'PLUS', value: '+', position: 3, length: 1 });
		expect(tokens[2]).toEqual({ type: 'SYMBOL', value: 'alpha', position: 4, length: 6 });
	});
});

// =============================================================================
// Full Expression Tokenization
// =============================================================================

describe('Full expression tokenization', () => {
	it('should tokenize simple addition', () => {
		const tokens = tokenize('a + b');
		// Whitespace stripped: "a+b"
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'PLUS', 'LETTER']);
		expect(getValues(tokens.slice(0, -1))).toEqual(['a', '+', 'b']);
	});

	it('should tokenize 2+3/4', () => {
		const tokens = tokenize('2+3/4');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['NUMBER', 'PLUS', 'NUMBER', 'SLASH', 'NUMBER']);
		expect(getValues(tokens.slice(0, -1))).toEqual(['2', '+', '3', '/', '4']);
	});

	it('should tokenize sin(x)', () => {
		const tokens = tokenize('sin(x)');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['FUNC', 'LPAREN', 'LETTER', 'RPAREN']);
	});

	it('should tokenize @red{a+b}', () => {
		const tokens = tokenize('@red{a+b}');
		expect(getTypes(tokens.slice(0, -1))).toEqual([
			'AT',
			'LETTER',
			'LETTER',
			'LETTER',
			'LBRACE',
			'LETTER',
			'PLUS',
			'LETTER',
			'RBRACE'
		]);
	});

	it('should tokenize 5[m/s]', () => {
		const tokens = tokenize('5[m/s]');
		expect(getTypes(tokens.slice(0, -1))).toEqual([
			'NUMBER',
			'LBRACKET',
			'LETTER',
			'SLASH',
			'LETTER',
			'RBRACKET'
		]);
	});

	it('should tokenize exponentiation', () => {
		const tokens = tokenize('x^2');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'CARET', 'NUMBER']);
	});

	it('should tokenize subscript', () => {
		const tokens = tokenize('x_1');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'UNDERSCORE', 'NUMBER']);
	});

	it('should tokenize equation', () => {
		const tokens = tokenize('x = 5');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'EQUALS', 'NUMBER']);
	});

	it('should tokenize inequality', () => {
		const tokens = tokenize('x < 5');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'LESS', 'NUMBER']);
	});

	it('should tokenize absolute value', () => {
		const tokens = tokenize('|x|');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['PIPE', 'LETTER', 'PIPE']);
	});

	it('should tokenize complex expression with symbols', () => {
		const tokens = tokenize('\\pi*r^2');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['SYMBOL', 'STAR', 'LETTER', 'CARET', 'NUMBER']);
	});

	it('should tokenize expression with ratio', () => {
		const tokens = tokenize('a:b');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'COLON', 'LETTER']);
	});

	it('should tokenize expression with colon-slash', () => {
		const tokens = tokenize('a:/b');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'COLON_SLASH', 'LETTER']);
	});
});

// =============================================================================
// Tokenizer Class
// =============================================================================

describe('CustomTokenizer class', () => {
	describe('nextToken()', () => {
		it('should return tokens sequentially', () => {
			const tokenizer = new CustomTokenizer('a+b');
			expect(tokenizer.nextToken().value).toBe('a');
			expect(tokenizer.nextToken().value).toBe('+');
			expect(tokenizer.nextToken().value).toBe('b');
		});

		it('should return EOF at end', () => {
			const tokenizer = new CustomTokenizer('x');
			tokenizer.nextToken(); // x
			expect(tokenizer.nextToken().type).toBe('EOF');
		});

		it('should keep returning EOF after end', () => {
			const tokenizer = new CustomTokenizer('x');
			tokenizer.nextToken(); // x
			tokenizer.nextToken(); // EOF
			expect(tokenizer.nextToken().type).toBe('EOF');
			expect(tokenizer.nextToken().type).toBe('EOF');
		});
	});

	describe('peek()', () => {
		it('should return next token without advancing', () => {
			const tokenizer = new CustomTokenizer('a+b');
			expect(tokenizer.peek().value).toBe('a');
			expect(tokenizer.peek().value).toBe('a');
			expect(tokenizer.nextToken().value).toBe('a');
			expect(tokenizer.peek().value).toBe('+');
		});
	});

	describe('peekAt()', () => {
		it('should return token at offset', () => {
			const tokenizer = new CustomTokenizer('a+b');
			expect(tokenizer.peekAt(0).value).toBe('a');
			expect(tokenizer.peekAt(1).value).toBe('+');
			expect(tokenizer.peekAt(2).value).toBe('b');
		});

		it('should not advance position', () => {
			const tokenizer = new CustomTokenizer('a+b');
			tokenizer.peekAt(0);
			tokenizer.peekAt(1);
			tokenizer.peekAt(2);
			expect(tokenizer.nextToken().value).toBe('a');
		});
	});

	describe('reset()', () => {
		it('should reset to beginning', () => {
			const tokenizer = new CustomTokenizer('a+b');
			tokenizer.nextToken();
			tokenizer.nextToken();
			tokenizer.reset();
			expect(tokenizer.nextToken().value).toBe('a');
		});
	});

	describe('getPosition()', () => {
		it('should return current position', () => {
			const tokenizer = new CustomTokenizer('abc');
			expect(tokenizer.getPosition()).toBe(0);
		});
	});

	describe('getInput()', () => {
		it('should return the original input (whitespace preserved)', () => {
			const tokenizer = new CustomTokenizer('a + b');
			expect(tokenizer.getInput()).toBe('a + b');
		});
	});
});

// =============================================================================
// Utility Functions
// =============================================================================

describe('Utility functions', () => {
	describe('isBinaryOperator()', () => {
		it('should return true for binary operators', () => {
			const ops = tokenize('+-*/::/');
			expect(isBinaryOperator(ops[0])).toBe(true); // +
			expect(isBinaryOperator(ops[1])).toBe(true); // -
			expect(isBinaryOperator(ops[2])).toBe(true); // *
			expect(isBinaryOperator(ops[3])).toBe(true); // /
			expect(isBinaryOperator(ops[4])).toBe(true); // :
			// Note: :/ is parsed as single COLON_SLASH token, need separate test
		});

		it('should return true for COLON_SLASH', () => {
			const tokens = tokenize(':/');
			expect(isBinaryOperator(tokens[0])).toBe(true);
		});

		it('should return false for non-operators', () => {
			const tokens = tokenize('x5=');
			expect(isBinaryOperator(tokens[0])).toBe(false); // x
			expect(isBinaryOperator(tokens[1])).toBe(false); // 5
			expect(isBinaryOperator(tokens[2])).toBe(false); // =
		});
	});

	describe('isRelationToken()', () => {
		it('should return true for basic relations', () => {
			expect(isRelationToken(tokenize('=')[0])).toBe(true);
			expect(isRelationToken(tokenize('<')[0])).toBe(true);
			expect(isRelationToken(tokenize('>')[0])).toBe(true);
		});

		it('should return true for multi-char relations', () => {
			expect(isRelationToken(tokenize('<=')[0])).toBe(true);
			expect(isRelationToken(tokenize('>=')[0])).toBe(true);
			expect(isRelationToken(tokenize('!=')[0])).toBe(true);
			expect(isRelationToken(tokenize('<=>')[0])).toBe(true);
			expect(isRelationToken(tokenize('=>')[0])).toBe(true);
		});

		it('should return false for non-relations', () => {
			expect(isRelationToken(tokenize('x')[0])).toBe(false);
			expect(isRelationToken(tokenize('+')[0])).toBe(false);
		});

		it('should return false for assignment operators', () => {
			expect(isRelationToken(tokenize(':=')[0])).toBe(false);
			expect(isRelationToken(tokenize('<-')[0])).toBe(false);
		});
	});

	describe('isAssignmentToken()', () => {
		it('should return true for ASSIGN', () => {
			expect(isAssignmentToken(tokenize(':=')[0])).toBe(true);
		});

		it('should return true for ARROW', () => {
			expect(isAssignmentToken(tokenize('<-')[0])).toBe(true);
		});

		it('should return false for non-assignment operators', () => {
			expect(isAssignmentToken(tokenize('=')[0])).toBe(false);
			expect(isAssignmentToken(tokenize('+')[0])).toBe(false);
			expect(isAssignmentToken(tokenize('x')[0])).toBe(false);
			expect(isAssignmentToken(tokenize('<')[0])).toBe(false);
			expect(isAssignmentToken(tokenize(':')[0])).toBe(false);
		});
	});

	describe('isLeftDelimiter()', () => {
		it('should return true for left delimiters', () => {
			expect(isLeftDelimiter(tokenize('(')[0])).toBe(true);
			expect(isLeftDelimiter(tokenize('{')[0])).toBe(true);
			expect(isLeftDelimiter(tokenize('[')[0])).toBe(true);
			expect(isLeftDelimiter(tokenize('|')[0])).toBe(true);
		});

		it('should return false for non-delimiters', () => {
			expect(isLeftDelimiter(tokenize('x')[0])).toBe(false);
			expect(isLeftDelimiter(tokenize(')')[0])).toBe(false);
		});
	});

	describe('isRightDelimiter()', () => {
		it('should return true for right delimiters', () => {
			expect(isRightDelimiter(tokenize(')')[0])).toBe(true);
			expect(isRightDelimiter(tokenize('}')[0])).toBe(true);
			expect(isRightDelimiter(tokenize(']')[0])).toBe(true);
			expect(isRightDelimiter(tokenize('|')[0])).toBe(true);
		});
	});

	describe('tokenTypeToString()', () => {
		it('should return human-readable strings', () => {
			expect(tokenTypeToString('NUMBER')).toBe('number');
			expect(tokenTypeToString('LETTER')).toBe('letter');
			expect(tokenTypeToString('SYMBOL')).toBe('symbol');
			expect(tokenTypeToString('FUNC')).toBe('function');
			expect(tokenTypeToString('PLUS')).toBe("'+'");
			expect(tokenTypeToString('COLON_SLASH')).toBe("':/'");
			expect(tokenTypeToString('ASSIGN')).toBe("':='");
			expect(tokenTypeToString('ARROW')).toBe("'<-'");
			expect(tokenTypeToString('IFF')).toBe("'<=>'");
			expect(tokenTypeToString('EOF')).toBe('end of input');
		});
	});

	describe('tokenToString()', () => {
		it('should return token representation', () => {
			expect(tokenToString(tokenize('x')[0])).toBe('x');
			expect(tokenToString(tokenize('42')[0])).toBe('42');
			expect(tokenToString(tokenize('sin')[0])).toBe('sin');
		});

		it('should handle symbol tokens', () => {
			expect(tokenToString(tokenize('\\pi')[0])).toBe('\\pi');
			expect(tokenToString(tokenize('\\alpha')[0])).toBe('\\alpha');
		});

		it('should handle backslash token', () => {
			const tokens = tokenize('\\+');
			expect(tokenToString(tokens[0])).toBe('\\');
		});

		it('should handle EOF', () => {
			const tokens = tokenize('x');
			expect(tokenToString(tokens[tokens.length - 1])).toBe('EOF');
		});
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge cases', () => {
	it('should handle empty input', () => {
		const tokens = tokenize('');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].type).toBe('EOF');
	});

	it('should handle only whitespace', () => {
		const tokens = tokenize('   ');
		// Whitespace is stripped, so we just get EOF
		expect(tokens).toHaveLength(1);
		expect(tokens[0].type).toBe('EOF');
	});

	it('should handle multiple consecutive operators', () => {
		const tokens = tokenize('+-*/');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['PLUS', 'MINUS', 'STAR', 'SLASH']);
	});

	it('should handle number followed by letter', () => {
		const tokens = tokenize('2x');
		expect(tokens[0].type).toBe('NUMBER');
		expect(tokens[1].type).toBe('LETTER');
	});

	it('should handle letter followed by number', () => {
		const tokens = tokenize('x2');
		expect(tokens[0].type).toBe('LETTER');
		expect(tokens[1].type).toBe('NUMBER');
	});

	it('should handle deeply nested braces', () => {
		const tokens = tokenize('{{{x}}}');
		expect(getTypes(tokens.slice(0, -1))).toEqual([
			'LBRACE',
			'LBRACE',
			'LBRACE',
			'LETTER',
			'RBRACE',
			'RBRACE',
			'RBRACE'
		]);
	});

	it('should handle function followed immediately by brace', () => {
		const tokens = tokenize('sin{x}');
		expect(tokens[0].type).toBe('FUNC');
		expect(tokens[0].value).toBe('sin');
		expect(tokens[1].type).toBe('LBRACE');
	});

	it('should handle consecutive symbols', () => {
		const tokens = tokenize('\\alpha\\beta');
		expect(tokens[0].value).toBe('alpha');
		expect(tokens[1].value).toBe('beta');
	});

	it('should handle single character input', () => {
		expect(tokenize('a')[0].type).toBe('LETTER');
		expect(tokenize('5')[0].type).toBe('NUMBER');
		expect(tokenize('+')[0].type).toBe('PLUS');
	});

	it('should handle tabs and newlines (stripped)', () => {
		const tokens = tokenize('a\t+\nb');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'PLUS', 'LETTER']);
	});

	it('should handle mixed whitespace', () => {
		const tokens = tokenize('  a   +   b  ');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'PLUS', 'LETTER']);
	});

	it('should handle function name as part of larger word', () => {
		// "sinus" - "sin" is function, "us" would be letters
		const tokens = tokenize('sinus');
		expect(tokens[0].type).toBe('FUNC');
		expect(tokens[0].value).toBe('sin');
		expect(tokens[1].type).toBe('LETTER');
		expect(tokens[1].value).toBe('u');
		expect(tokens[2].type).toBe('LETTER');
		expect(tokens[2].value).toBe('s');
	});

	it('should handle exclamation mark alone', () => {
		const tokens = tokenize('!');
		// ! alone (not followed by =) is treated as unknown/LETTER
		expect(tokens[0].type).toBe('LETTER');
	});

	it('should handle ! followed by non-equals', () => {
		const tokens = tokenize('!x');
		expect(tokens[0].type).toBe('LETTER'); // ! as unknown
		expect(tokens[1].type).toBe('LETTER'); // x
	});

	it('should handle multiple decimal separators', () => {
		// "1.2.3" -> NUMBER "1.2" then ". 3" (dot is not consumed as decimal again)
		const tokens = tokenize('1.2.3');
		expect(tokens[0].type).toBe('NUMBER');
		expect(tokens[0].value).toBe('1.2');
		// The ".3" should become ".3" if dot starts decimal, but our tokenizer requires leading digit
		// So it should be: NUMBER "1.2", then something for ".3"
		// Actually, dot without leading digit in our impl goes to single char
		expect(tokens[1].type).toBe('LETTER'); // . becomes LETTER fallback
		expect(tokens[2].type).toBe('NUMBER');
	});
});

// =============================================================================
// Whitespace Handling
// =============================================================================

describe('Whitespace handling', () => {
	it('should preserve original input but skip whitespace during scanning', () => {
		const tokenizer = new CustomTokenizer('a b c');
		// Original input is preserved
		expect(tokenizer.getInput()).toBe('a b c');
		// But tokens are correctly extracted, skipping whitespace
		const tokens = tokenize('a b c');
		expect(getValues(tokens.slice(0, -1))).toEqual(['a', 'b', 'c']);
	});

	it('should handle tabs correctly', () => {
		const tokens = tokenize('a\tb\tc');
		expect(getValues(tokens.slice(0, -1))).toEqual(['a', 'b', 'c']);
	});

	it('should handle newlines correctly', () => {
		const tokens = tokenize('a\nb\nc');
		expect(getValues(tokens.slice(0, -1))).toEqual(['a', 'b', 'c']);
	});

	it('should handle carriage returns correctly', () => {
		const tokens = tokenize('a\r\nb\r\nc');
		expect(getValues(tokens.slice(0, -1))).toEqual(['a', 'b', 'c']);
	});

	it('should handle all whitespace types together', () => {
		const tokens = tokenize('  a \t b \n c \r\n d  ');
		expect(getValues(tokens.slice(0, -1))).toEqual(['a', 'b', 'c', 'd']);
	});

	it('should produce correct tokens with whitespace in input', () => {
		const tokens = tokenize('  x  +  2  ');
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'PLUS', 'NUMBER']);
		expect(getValues(tokens.slice(0, -1))).toEqual(['x', '+', '2']);
	});

	it('should distinguish "1,2" (decimal) from "1, 2" (comma separator)', () => {
		// Without space: comma is decimal separator (French format)
		const decimal = tokenize('1,2');
		expect(getTypes(decimal.slice(0, -1))).toEqual(['NUMBER']);
		expect(getValues(decimal.slice(0, -1))).toEqual(['1.2']);

		// With space: comma is separator (function arguments)
		const separated = tokenize('1, 2');
		expect(getTypes(separated.slice(0, -1))).toEqual(['NUMBER', 'COMMA', 'NUMBER']);
		expect(getValues(separated.slice(0, -1))).toEqual(['1', ',', '2']);
	});
});
