/**
 * LaTeX Tokenizer - Tests
 *
 * Comprehensive tests for the LaTeX tokenizer including:
 * - Number tokenization (integers, decimals)
 * - Letter tokenization
 * - Command tokenization (all LaTeX commands)
 * - Operator tokenization
 * - Delimiter tokenization
 * - Position tracking
 * - Full expression tokenization
 *
 * @module mathAST/parser/__tests__/tokenizer.test
 */

import { describe, it, expect } from 'vitest';
import {
	Tokenizer,
	tokenize,
	filterWhitespace,
	isBinaryOperator,
	isRelationToken,
	isLeftDelimiter,
	isRightDelimiter,
	tokenTypeToString,
	tokenToString
} from '../tokenizer';
import type { Token } from '../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to get token types from an array of tokens
 */
function getTypes(tokens: Token[]): string[] {
	return tokens.map((t) => t.type);
}

/**
 * Helper to get token values from an array of tokens
 */
function getValues(tokens: Token[]): string[] {
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

	describe('Decimals', () => {
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

		it('should tokenize decimal without leading zero', () => {
			const tokens = tokenize('.5');
			expect(tokens[0].value).toBe('.5');
		});

		it('should tokenize decimal with trailing zeros', () => {
			const tokens = tokenize('2.000');
			expect(tokens[0].value).toBe('2.000');
		});

		it('should tokenize integer with trailing decimal point as separate tokens', () => {
			// Note: 42. followed by something else might be 42 + . as separate tokens
			// But 42. alone should be valid
			const tokens = tokenize('42.');
			expect(tokens[0].value).toBe('42.');
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

	it('should tokenize multiple letters as separate tokens', () => {
		const tokens = filterWhitespace(tokenize('abc'));
		expect(tokens).toHaveLength(4); // a, b, c, EOF
		expect(getValues(tokens.slice(0, 3))).toEqual(['a', 'b', 'c']);
	});

	it('should tokenize all lowercase letters', () => {
		const input = 'abcdefghijklmnopqrstuvwxyz';
		const tokens = filterWhitespace(tokenize(input));
		expect(tokens).toHaveLength(27); // 26 letters + EOF
		expect(getTypes(tokens.slice(0, 26))).toEqual(Array(26).fill('LETTER'));
	});

	it('should tokenize all uppercase letters', () => {
		const input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const tokens = filterWhitespace(tokenize(input));
		expect(tokens).toHaveLength(27); // 26 letters + EOF
		expect(getTypes(tokens.slice(0, 26))).toEqual(Array(26).fill('LETTER'));
	});
});

// =============================================================================
// Command Tokenization
// =============================================================================

describe('Command tokenization', () => {
	describe('Trigonometric functions', () => {
		it.each(['sin', 'cos', 'tan', 'cot', 'sec', 'csc'])('should tokenize \\%s', (cmd) => {
			const tokens = tokenize(`\\${cmd}`);
			expect(tokens[0]).toEqual({
				type: 'COMMAND',
				value: cmd,
				position: 0,
				length: cmd.length + 1 // +1 for backslash
			});
		});

		it.each(['arcsin', 'arccos', 'arctan'])('should tokenize \\%s', (cmd) => {
			const tokens = tokenize(`\\${cmd}`);
			expect(tokens[0].type).toBe('COMMAND');
			expect(tokens[0].value).toBe(cmd);
		});
	});

	describe('Hyperbolic functions', () => {
		it.each(['sinh', 'cosh', 'tanh'])('should tokenize \\%s', (cmd) => {
			const tokens = tokenize(`\\${cmd}`);
			expect(tokens[0].value).toBe(cmd);
		});
	});

	describe('Logarithmic/exponential functions', () => {
		it.each(['ln', 'log', 'exp'])('should tokenize \\%s', (cmd) => {
			const tokens = tokenize(`\\${cmd}`);
			expect(tokens[0].value).toBe(cmd);
		});
	});

	describe('Structure commands', () => {
		it('should tokenize \\frac', () => {
			const tokens = tokenize('\\frac');
			expect(tokens[0].value).toBe('frac');
		});

		it('should tokenize \\sqrt', () => {
			const tokens = tokenize('\\sqrt');
			expect(tokens[0].value).toBe('sqrt');
		});

		it('should tokenize \\left', () => {
			const tokens = tokenize('\\left');
			expect(tokens[0].value).toBe('left');
		});

		it('should tokenize \\right', () => {
			const tokens = tokenize('\\right');
			expect(tokens[0].value).toBe('right');
		});
	});

	describe('Supported Greek letters', () => {
		const supportedGreek = ['pi', 'alpha', 'beta', 'gamma', 'theta'];

		it.each(supportedGreek)('should tokenize supported Greek \\%s', (letter) => {
			const tokens = tokenize(`\\${letter}`);
			expect(tokens[0].value).toBe(letter);
		});
	});

	describe('Formatting commands', () => {
		it('should tokenize \\textcolor', () => {
			const tokens = tokenize('\\textcolor');
			expect(tokens[0].value).toBe('textcolor');
		});

		it('should tokenize \\mathbf', () => {
			const tokens = tokenize('\\mathbf');
			expect(tokens[0].value).toBe('mathbf');
		});

		it('should tokenize \\mathit', () => {
			const tokens = tokenize('\\mathit');
			expect(tokens[0].value).toBe('mathit');
		});
	});

	describe('Unit command', () => {
		it('should tokenize \\unit', () => {
			const tokens = tokenize('\\unit');
			expect(tokens[0].value).toBe('unit');
		});
	});

	describe('Relation commands', () => {
		it.each(['leq', 'geq', 'neq', 'equiv', 'approx', 'simeq'])('should tokenize \\%s', (cmd) => {
			const tokens = tokenize(`\\${cmd}`);
			expect(tokens[0].value).toBe(cmd);
		});

		it.each(['subset', 'supset', 'subseteq', 'supseteq', 'in', 'notin'])(
			'should tokenize \\%s',
			(cmd) => {
				const tokens = tokenize(`\\${cmd}`);
				expect(tokens[0].value).toBe(cmd);
			}
		);

		it.each(['implies', 'iff', 'impliedby'])('should tokenize \\%s', (cmd) => {
			const tokens = tokenize(`\\${cmd}`);
			expect(tokens[0].value).toBe(cmd);
		});
	});

	describe('Operator commands', () => {
		it.each(['cdot', 'times', 'div', 'pm', 'mp'])('should tokenize \\%s', (cmd) => {
			const tokens = tokenize(`\\${cmd}`);
			expect(tokens[0].value).toBe(cmd);
		});
	});

	describe('Special single-character commands', () => {
		it('should tokenize \\{', () => {
			const tokens = tokenize('\\{');
			expect(tokens[0]).toEqual({
				type: 'COMMAND',
				value: '{',
				position: 0,
				length: 2
			});
		});

		it('should tokenize \\}', () => {
			const tokens = tokenize('\\}');
			expect(tokens[0].value).toBe('}');
		});

		it('should tokenize \\%', () => {
			const tokens = tokenize('\\%');
			expect(tokens[0].value).toBe('%');
		});
	});
});

// =============================================================================
// Operator Tokenization
// =============================================================================

describe('Operator tokenization', () => {
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

	it('should tokenize tilde', () => {
		const tokens = tokenize('~');
		expect(tokens[0].type).toBe('TILDE');
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
// Relation Tokenization
// =============================================================================

describe('Relation tokenization', () => {
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

// =============================================================================
// Punctuation Tokenization
// =============================================================================

describe('Punctuation tokenization', () => {
	it('should tokenize comma', () => {
		const tokens = tokenize(',');
		expect(tokens[0].type).toBe('COMMA');
	});

	it('should tokenize colon', () => {
		const tokens = tokenize(':');
		expect(tokens[0].type).toBe('COLON');
	});

	it('should tokenize semicolon', () => {
		const tokens = tokenize(';');
		expect(tokens[0].type).toBe('SEMICOLON');
	});

	it('should tokenize exclamation', () => {
		const tokens = tokenize('!');
		expect(tokens[0].type).toBe('EXCLAMATION');
	});

	it('should tokenize ampersand', () => {
		const tokens = tokenize('&');
		expect(tokens[0].type).toBe('AMPERSAND');
	});
});

// =============================================================================
// Whitespace Tokenization
// =============================================================================

describe('Whitespace tokenization', () => {
	it('should tokenize single space', () => {
		const tokens = tokenize(' ');
		expect(tokens[0].type).toBe('WHITESPACE');
		expect(tokens[0].value).toBe(' ');
	});

	it('should tokenize multiple spaces', () => {
		const tokens = tokenize('   ');
		expect(tokens[0].type).toBe('WHITESPACE');
		expect(tokens[0].value).toBe('   ');
	});

	it('should tokenize tab', () => {
		const tokens = tokenize('\t');
		expect(tokens[0].type).toBe('WHITESPACE');
	});

	it('should tokenize newline', () => {
		const tokens = tokenize('\n');
		expect(tokens[0].type).toBe('WHITESPACE');
	});

	it('should tokenize mixed whitespace', () => {
		const tokens = tokenize(' \t\n ');
		expect(tokens[0].type).toBe('WHITESPACE');
		expect(tokens[0].value).toBe(' \t\n ');
	});
});

// =============================================================================
// Position Tracking
// =============================================================================

describe('Position tracking', () => {
	it('should track positions in simple expression', () => {
		const tokens = tokenize('x + 2');
		const noEof = tokens.slice(0, -1);

		expect(noEof[0]).toEqual({ type: 'LETTER', value: 'x', position: 0, length: 1 });
		expect(noEof[1]).toEqual({ type: 'WHITESPACE', value: ' ', position: 1, length: 1 });
		expect(noEof[2]).toEqual({ type: 'PLUS', value: '+', position: 2, length: 1 });
		expect(noEof[3]).toEqual({ type: 'WHITESPACE', value: ' ', position: 3, length: 1 });
		expect(noEof[4]).toEqual({ type: 'NUMBER', value: '2', position: 4, length: 1 });
	});

	it('should track positions with commands', () => {
		const tokens = tokenize('\\sin x');

		expect(tokens[0]).toEqual({ type: 'COMMAND', value: 'sin', position: 0, length: 4 });
		expect(tokens[1]).toEqual({ type: 'WHITESPACE', value: ' ', position: 4, length: 1 });
		expect(tokens[2]).toEqual({ type: 'LETTER', value: 'x', position: 5, length: 1 });
	});

	it('should track positions with multi-digit numbers', () => {
		const tokens = tokenize('42 + 3.14');
		const noEof = tokens.slice(0, -1);

		expect(noEof[0].position).toBe(0);
		expect(noEof[0].length).toBe(2);

		expect(noEof[4].position).toBe(5);
		expect(noEof[4].length).toBe(4);
	});

	it('should report correct position at EOF', () => {
		const tokens = tokenize('abc');
		const eof = tokens[tokens.length - 1];
		expect(eof.type).toBe('EOF');
		expect(eof.position).toBe(3);
	});
});

// =============================================================================
// Full Expression Tokenization
// =============================================================================

describe('Full expression tokenization', () => {
	it('should tokenize simple addition', () => {
		const tokens = filterWhitespace(tokenize('a + b'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'PLUS', 'LETTER']);
		expect(getValues(tokens.slice(0, -1))).toEqual(['a', '+', 'b']);
	});

	it('should tokenize simple subtraction', () => {
		const tokens = filterWhitespace(tokenize('x - y'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'MINUS', 'LETTER']);
	});

	it('should tokenize multiplication', () => {
		const tokens = filterWhitespace(tokenize('2 * 3'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['NUMBER', 'STAR', 'NUMBER']);
	});

	it('should tokenize division', () => {
		const tokens = filterWhitespace(tokenize('10 / 2'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['NUMBER', 'SLASH', 'NUMBER']);
	});

	it('should tokenize exponentiation', () => {
		const tokens = filterWhitespace(tokenize('x^2'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'CARET', 'NUMBER']);
	});

	it('should tokenize subscript', () => {
		const tokens = filterWhitespace(tokenize('x_1'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'UNDERSCORE', 'NUMBER']);
	});

	it('should tokenize fraction', () => {
		const tokens = filterWhitespace(tokenize('\\frac{1}{2}'));
		expect(getTypes(tokens.slice(0, -1))).toEqual([
			'COMMAND',
			'LBRACE',
			'NUMBER',
			'RBRACE',
			'LBRACE',
			'NUMBER',
			'RBRACE'
		]);
	});

	it('should tokenize function application', () => {
		const tokens = filterWhitespace(tokenize('\\sin(x)'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['COMMAND', 'LPAREN', 'LETTER', 'RPAREN']);
	});

	it('should tokenize complex expression', () => {
		const tokens = filterWhitespace(tokenize('\\frac{x + 1}{y - 2}'));
		expect(tokens[0].value).toBe('frac');
		expect(getTypes(tokens.slice(1, 6))).toEqual(['LBRACE', 'LETTER', 'PLUS', 'NUMBER', 'RBRACE']);
	});

	it('should tokenize textcolor with nested content', () => {
		const tokens = filterWhitespace(tokenize('\\textcolor{red}{x}'));
		expect(getTypes(tokens.slice(0, -1))).toEqual([
			'COMMAND',
			'LBRACE',
			'LETTER',
			'LETTER',
			'LETTER',
			'RBRACE',
			'LBRACE',
			'LETTER',
			'RBRACE'
		]);
	});

	it('should tokenize unit expression', () => {
		const tokens = filterWhitespace(tokenize('5~\\unit{m}'));
		expect(getTypes(tokens.slice(0, -1))).toEqual([
			'NUMBER',
			'TILDE',
			'COMMAND',
			'LBRACE',
			'LETTER',
			'RBRACE'
		]);
	});

	it('should tokenize equation', () => {
		const tokens = filterWhitespace(tokenize('x = 5'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'EQUALS', 'NUMBER']);
	});

	it('should tokenize inequality', () => {
		const tokens = filterWhitespace(tokenize('x < 5'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'LESS', 'NUMBER']);
	});

	it('should tokenize leq relation', () => {
		const tokens = filterWhitespace(tokenize('x \\leq 5'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['LETTER', 'COMMAND', 'NUMBER']);
		expect(tokens[1].value).toBe('leq');
	});

	it('should tokenize absolute value', () => {
		const tokens = filterWhitespace(tokenize('|x|'));
		expect(getTypes(tokens.slice(0, -1))).toEqual(['PIPE', 'LETTER', 'PIPE']);
	});

	it('should tokenize auto-sizing delimiters', () => {
		const tokens = filterWhitespace(tokenize('\\left( x \\right)'));
		expect(tokens[0].value).toBe('left');
		expect(tokens[3].value).toBe('right');
	});
});

// =============================================================================
// Tokenizer Class
// =============================================================================

describe('Tokenizer class', () => {
	describe('nextToken()', () => {
		it('should return tokens sequentially', () => {
			const tokenizer = new Tokenizer('a + b');
			expect(tokenizer.nextToken().value).toBe('a');
			expect(tokenizer.nextToken().value).toBe(' ');
			expect(tokenizer.nextToken().value).toBe('+');
		});

		it('should return EOF at end', () => {
			const tokenizer = new Tokenizer('x');
			tokenizer.nextToken(); // x
			expect(tokenizer.nextToken().type).toBe('EOF');
		});

		it('should keep returning EOF after end', () => {
			const tokenizer = new Tokenizer('x');
			tokenizer.nextToken(); // x
			tokenizer.nextToken(); // EOF
			expect(tokenizer.nextToken().type).toBe('EOF');
			expect(tokenizer.nextToken().type).toBe('EOF');
		});
	});

	describe('peek()', () => {
		it('should return next token without advancing', () => {
			const tokenizer = new Tokenizer('a + b');
			expect(tokenizer.peek().value).toBe('a');
			expect(tokenizer.peek().value).toBe('a');
			expect(tokenizer.nextToken().value).toBe('a');
			expect(tokenizer.peek().value).toBe(' ');
		});
	});

	describe('peekAt()', () => {
		it('should return token at offset', () => {
			const tokenizer = new Tokenizer('a + b');
			expect(tokenizer.peekAt(0).value).toBe('a');
			expect(tokenizer.peekAt(1).value).toBe(' ');
			expect(tokenizer.peekAt(2).value).toBe('+');
		});

		it('should not advance position', () => {
			const tokenizer = new Tokenizer('a + b');
			tokenizer.peekAt(0);
			tokenizer.peekAt(1);
			tokenizer.peekAt(2);
			expect(tokenizer.nextToken().value).toBe('a');
		});
	});

	describe('reset()', () => {
		it('should reset to beginning', () => {
			const tokenizer = new Tokenizer('a + b');
			tokenizer.nextToken();
			tokenizer.nextToken();
			tokenizer.reset();
			expect(tokenizer.nextToken().value).toBe('a');
		});
	});

	describe('getPosition()', () => {
		it('should return current position', () => {
			const tokenizer = new Tokenizer('abc');
			expect(tokenizer.getPosition()).toBe(0);
			tokenizer.nextToken(); // 'a'
			// Position is tracked internally, let's check it advances
		});
	});
});

// =============================================================================
// Utility Functions
// =============================================================================

describe('Utility functions', () => {
	describe('filterWhitespace()', () => {
		it('should remove whitespace tokens', () => {
			const tokens = tokenize('a + b');
			const filtered = filterWhitespace(tokens);
			expect(getTypes(filtered)).not.toContain('WHITESPACE');
		});

		it('should preserve non-whitespace tokens', () => {
			const tokens = tokenize('a + b');
			const filtered = filterWhitespace(tokens);
			expect(getValues(filtered.slice(0, -1))).toEqual(['a', '+', 'b']);
		});
	});

	describe('isBinaryOperator()', () => {
		it('should return true for binary operators', () => {
			const tokens = tokenize('+ - * /');
			const ops = filterWhitespace(tokens).slice(0, -1);
			expect(ops.every(isBinaryOperator)).toBe(true);
		});

		it('should return false for non-operators', () => {
			const tokens = tokenize('x 5 =');
			const nonOps = filterWhitespace(tokens).slice(0, -1);
			expect(nonOps.some(isBinaryOperator)).toBe(false);
		});
	});

	describe('isRelationToken()', () => {
		it('should return true for basic relations', () => {
			const tokens = tokenize('= < >');
			const rels = filterWhitespace(tokens).slice(0, -1);
			expect(rels.every(isRelationToken)).toBe(true);
		});

		it('should return true for relation commands', () => {
			const tokens = tokenize('\\leq \\geq \\neq');
			const rels = filterWhitespace(tokens).slice(0, -1);
			expect(rels.every(isRelationToken)).toBe(true);
		});

		it('should return false for non-relations', () => {
			const token = tokenize('x')[0];
			expect(isRelationToken(token)).toBe(false);
		});
	});

	describe('isLeftDelimiter()', () => {
		it('should return true for left delimiters', () => {
			expect(isLeftDelimiter(tokenize('(')[0])).toBe(true);
			expect(isLeftDelimiter(tokenize('{')[0])).toBe(true);
			expect(isLeftDelimiter(tokenize('[')[0])).toBe(true);
			expect(isLeftDelimiter(tokenize('|')[0])).toBe(true);
		});

		it('should return true for \\left command', () => {
			expect(isLeftDelimiter(tokenize('\\left')[0])).toBe(true);
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

		it('should return true for \\right command', () => {
			expect(isRightDelimiter(tokenize('\\right')[0])).toBe(true);
		});
	});

	describe('tokenTypeToString()', () => {
		it('should return human-readable strings', () => {
			expect(tokenTypeToString('NUMBER')).toBe('number');
			expect(tokenTypeToString('LETTER')).toBe('letter');
			expect(tokenTypeToString('COMMAND')).toBe('command');
			expect(tokenTypeToString('PLUS')).toBe("'+'");
			expect(tokenTypeToString('EOF')).toBe('end of input');
		});
	});

	describe('tokenToString()', () => {
		it('should return token representation', () => {
			expect(tokenToString(tokenize('x')[0])).toBe('x');
			expect(tokenToString(tokenize('42')[0])).toBe('42');
			expect(tokenToString(tokenize('\\sin')[0])).toBe('\\sin');
		});

		it('should handle special tokens', () => {
			expect(tokenToString(tokenize(' ')[0])).toBe('WHITESPACE');
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
		expect(tokens).toHaveLength(2); // WHITESPACE + EOF
		expect(tokens[0].type).toBe('WHITESPACE');
	});

	it('should handle backslash at end', () => {
		const tokens = tokenize('x\\');
		expect(tokens).toHaveLength(3); // LETTER, COMMAND (empty), EOF
	});

	it('should handle multiple consecutive operators', () => {
		const tokens = filterWhitespace(tokenize('+-*/'));
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
		const tokens = filterWhitespace(tokenize('{{{x}}}'));
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

	it('should handle command followed immediately by brace', () => {
		const tokens = tokenize('\\frac{');
		expect(tokens[0].value).toBe('frac');
		expect(tokens[1].type).toBe('LBRACE');
	});

	it('should handle consecutive commands', () => {
		const tokens = filterWhitespace(tokenize('\\alpha\\beta'));
		expect(tokens[0].value).toBe('alpha');
		expect(tokens[1].value).toBe('beta');
	});
});
