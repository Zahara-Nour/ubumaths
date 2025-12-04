/**
 * Lexer Tests - Unit tests for the spreadsheet formula lexer
 *
 * @module spreadsheet/__tests__/lexer.test
 */

import { describe, it, expect } from 'vitest';
import { tokenize, describeToken } from '../parser/lexer';
import type { Token, TokenType } from '../parser/lexer';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to extract token types and values from a successful tokenize result
 */
function getTokens(input: string): Token[] {
	const result = tokenize(input);
	if (!result.success) {
		throw new Error(`Lexer failed: ${result.error} at position ${result.position}`);
	}
	return result.tokens;
}

/**
 * Helper to get token types only (excluding EOF)
 */
function getTokenTypes(input: string): TokenType[] {
	return getTokens(input)
		.filter((t) => t.type !== 'EOF')
		.map((t) => t.type);
}

/**
 * Helper to get token values only (excluding EOF)
 */
function getTokenValues(input: string): string[] {
	return getTokens(input)
		.filter((t) => t.type !== 'EOF')
		.map((t) => t.value);
}

// =============================================================================
// Number Tokenization
// =============================================================================

describe('lexer - numbers', () => {
	it('tokenizes integer numbers', () => {
		expect(getTokens('42')[0]).toMatchObject({ type: 'NUMBER', value: '42' });
		expect(getTokens('0')[0]).toMatchObject({ type: 'NUMBER', value: '0' });
		expect(getTokens('123456')[0]).toMatchObject({ type: 'NUMBER', value: '123456' });
	});

	it('tokenizes decimal numbers', () => {
		expect(getTokens('3.14')[0]).toMatchObject({ type: 'NUMBER', value: '3.14' });
		expect(getTokens('0.5')[0]).toMatchObject({ type: 'NUMBER', value: '0.5' });
		expect(getTokens('100.00')[0]).toMatchObject({ type: 'NUMBER', value: '100.00' });
	});

	it('tokenizes numbers with leading decimal point', () => {
		expect(getTokens('.5')[0]).toMatchObject({ type: 'NUMBER', value: '.5' });
		expect(getTokens('.123')[0]).toMatchObject({ type: 'NUMBER', value: '.123' });
	});

	it('tokenizes numbers with trailing decimal point', () => {
		expect(getTokens('5.')[0]).toMatchObject({ type: 'NUMBER', value: '5.' });
		expect(getTokens('100.')[0]).toMatchObject({ type: 'NUMBER', value: '100.' });
	});

	it('tokenizes multiple numbers separated by operators', () => {
		const tokens = getTokens('1+2');
		expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '1' });
		expect(tokens[1]).toMatchObject({ type: 'OPERATOR', value: '+' });
		expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '2' });
	});
});

// =============================================================================
// String Tokenization
// =============================================================================

describe('lexer - strings', () => {
	it('tokenizes double-quoted strings', () => {
		expect(getTokens('"hello"')[0]).toMatchObject({ type: 'STRING', value: 'hello' });
		expect(getTokens('"world"')[0]).toMatchObject({ type: 'STRING', value: 'world' });
	});

	it('tokenizes single-quoted strings', () => {
		expect(getTokens("'hello'")[0]).toMatchObject({ type: 'STRING', value: 'hello' });
		expect(getTokens("'world'")[0]).toMatchObject({ type: 'STRING', value: 'world' });
	});

	it('tokenizes empty strings', () => {
		expect(getTokens('""')[0]).toMatchObject({ type: 'STRING', value: '' });
		expect(getTokens("''")[0]).toMatchObject({ type: 'STRING', value: '' });
	});

	it('tokenizes strings with spaces', () => {
		expect(getTokens('"hello world"')[0]).toMatchObject({ type: 'STRING', value: 'hello world' });
	});

	it('tokenizes strings with escaped quotes (doubled)', () => {
		expect(getTokens('"say ""hi"""')[0]).toMatchObject({ type: 'STRING', value: 'say "hi"' });
		expect(getTokens("'it''s'")[0]).toMatchObject({ type: 'STRING', value: "it's" });
	});

	it('reports error for unterminated strings', () => {
		const result = tokenize('"unterminated');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('non terminee');
			expect(result.position).toBe(0);
		}
	});
});

// =============================================================================
// Boolean Tokenization
// =============================================================================

describe('lexer - booleans', () => {
	it('tokenizes TRUE and FALSE', () => {
		expect(getTokens('TRUE')[0]).toMatchObject({ type: 'BOOLEAN', value: 'TRUE' });
		expect(getTokens('FALSE')[0]).toMatchObject({ type: 'BOOLEAN', value: 'FALSE' });
	});

	it('tokenizes French booleans VRAI and FAUX', () => {
		expect(getTokens('VRAI')[0]).toMatchObject({ type: 'BOOLEAN', value: 'VRAI' });
		expect(getTokens('FAUX')[0]).toMatchObject({ type: 'BOOLEAN', value: 'FAUX' });
	});

	it('tokenizes booleans case-insensitively', () => {
		expect(getTokens('true')[0]).toMatchObject({ type: 'BOOLEAN', value: 'TRUE' });
		expect(getTokens('True')[0]).toMatchObject({ type: 'BOOLEAN', value: 'TRUE' });
		expect(getTokens('vrai')[0]).toMatchObject({ type: 'BOOLEAN', value: 'VRAI' });
	});
});

// =============================================================================
// Cell Reference Tokenization
// =============================================================================

describe('lexer - cell references', () => {
	it('tokenizes simple cell references', () => {
		expect(getTokens('A1')[0]).toMatchObject({ type: 'CELL_REF', value: 'A1' });
		expect(getTokens('B2')[0]).toMatchObject({ type: 'CELL_REF', value: 'B2' });
		expect(getTokens('Z20')[0]).toMatchObject({ type: 'CELL_REF', value: 'Z20' });
	});

	it('tokenizes two-letter column references', () => {
		expect(getTokens('AA1')[0]).toMatchObject({ type: 'CELL_REF', value: 'AA1' });
		expect(getTokens('AB10')[0]).toMatchObject({ type: 'CELL_REF', value: 'AB10' });
	});

	it('normalizes cell references to uppercase', () => {
		expect(getTokens('a1')[0]).toMatchObject({ type: 'CELL_REF', value: 'A1' });
		expect(getTokens('b2')[0]).toMatchObject({ type: 'CELL_REF', value: 'B2' });
		expect(getTokens('aa10')[0]).toMatchObject({ type: 'CELL_REF', value: 'AA10' });
	});

	it('tokenizes cell references in expressions', () => {
		const tokens = getTokens('A1+B2');
		expect(tokens[0]).toMatchObject({ type: 'CELL_REF', value: 'A1' });
		expect(tokens[1]).toMatchObject({ type: 'OPERATOR', value: '+' });
		expect(tokens[2]).toMatchObject({ type: 'CELL_REF', value: 'B2' });
	});
});

// =============================================================================
// Operator Tokenization
// =============================================================================

describe('lexer - operators', () => {
	it('tokenizes arithmetic operators', () => {
		expect(getTokens('+')[0]).toMatchObject({ type: 'OPERATOR', value: '+' });
		expect(getTokens('-')[0]).toMatchObject({ type: 'OPERATOR', value: '-' });
		expect(getTokens('*')[0]).toMatchObject({ type: 'OPERATOR', value: '*' });
		expect(getTokens('/')[0]).toMatchObject({ type: 'OPERATOR', value: '/' });
		expect(getTokens('^')[0]).toMatchObject({ type: 'OPERATOR', value: '^' });
	});

	it('tokenizes operators between numbers', () => {
		expect(getTokenTypes('1+2-3*4/5^6')).toEqual([
			'NUMBER',
			'OPERATOR',
			'NUMBER',
			'OPERATOR',
			'NUMBER',
			'OPERATOR',
			'NUMBER',
			'OPERATOR',
			'NUMBER',
			'OPERATOR',
			'NUMBER'
		]);
	});
});

// =============================================================================
// Comparison Tokenization
// =============================================================================

describe('lexer - comparisons', () => {
	it('tokenizes single-character comparisons', () => {
		// Note: a lone '=' at the start is treated as formula prefix, so test in context
		expect(getTokens('A1=B1')[1]).toMatchObject({ type: 'COMPARISON', value: '=' });
		expect(getTokens('<')[0]).toMatchObject({ type: 'COMPARISON', value: '<' });
		expect(getTokens('>')[0]).toMatchObject({ type: 'COMPARISON', value: '>' });
	});

	it('tokenizes two-character comparisons', () => {
		expect(getTokens('<>')[0]).toMatchObject({ type: 'COMPARISON', value: '<>' });
		expect(getTokens('<=')[0]).toMatchObject({ type: 'COMPARISON', value: '<=' });
		expect(getTokens('>=')[0]).toMatchObject({ type: 'COMPARISON', value: '>=' });
	});

	it('tokenizes comparisons in expressions', () => {
		const tokens = getTokens('A1>10');
		expect(tokens[0]).toMatchObject({ type: 'CELL_REF', value: 'A1' });
		expect(tokens[1]).toMatchObject({ type: 'COMPARISON', value: '>' });
		expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '10' });
	});

	it('distinguishes between < and <=', () => {
		const tokens1 = getTokens('A1<10');
		expect(tokens1[1]).toMatchObject({ type: 'COMPARISON', value: '<' });

		const tokens2 = getTokens('A1<=10');
		expect(tokens2[1]).toMatchObject({ type: 'COMPARISON', value: '<=' });
	});
});

// =============================================================================
// Function Name Tokenization
// =============================================================================

describe('lexer - function names', () => {
	it('tokenizes English function names', () => {
		expect(getTokens('SUM(')[0]).toMatchObject({ type: 'FUNCTION', value: 'SUM' });
		expect(getTokens('AVERAGE(')[0]).toMatchObject({ type: 'FUNCTION', value: 'AVERAGE' });
		expect(getTokens('IF(')[0]).toMatchObject({ type: 'FUNCTION', value: 'IF' });
	});

	it('tokenizes French function names', () => {
		expect(getTokens('SOMME(')[0]).toMatchObject({ type: 'FUNCTION', value: 'SOMME' });
		expect(getTokens('MOYENNE(')[0]).toMatchObject({ type: 'FUNCTION', value: 'MOYENNE' });
		expect(getTokens('SI(')[0]).toMatchObject({ type: 'FUNCTION', value: 'SI' });
	});

	it('normalizes function names to uppercase', () => {
		expect(getTokens('sum(')[0]).toMatchObject({ type: 'FUNCTION', value: 'SUM' });
		expect(getTokens('Sum(')[0]).toMatchObject({ type: 'FUNCTION', value: 'SUM' });
		expect(getTokens('somme(')[0]).toMatchObject({ type: 'FUNCTION', value: 'SOMME' });
	});

	it('recognizes function followed by ( with whitespace', () => {
		expect(getTokens('SUM (')[0]).toMatchObject({ type: 'FUNCTION', value: 'SUM' });
		expect(getTokens('SUM  (')[0]).toMatchObject({ type: 'FUNCTION', value: 'SUM' });
	});

	it('treats identifiers not followed by ( as IDENTIFIER', () => {
		// This would be an unknown identifier since UNKNOWN is not a cell ref
		expect(getTokens('UNKNOWN')[0]).toMatchObject({ type: 'IDENTIFIER', value: 'UNKNOWN' });
	});
});

// =============================================================================
// Punctuation Tokenization
// =============================================================================

describe('lexer - punctuation', () => {
	it('tokenizes parentheses', () => {
		expect(getTokens('(')[0]).toMatchObject({ type: 'LPAREN', value: '(' });
		expect(getTokens(')')[0]).toMatchObject({ type: 'RPAREN', value: ')' });
	});

	it('tokenizes comma', () => {
		expect(getTokens(',')[0]).toMatchObject({ type: 'COMMA', value: ',' });
	});

	it('tokenizes colon', () => {
		expect(getTokens(':')[0]).toMatchObject({ type: 'COLON', value: ':' });
	});

	it('tokenizes range with colon', () => {
		const tokens = getTokens('A1:B10');
		expect(tokens[0]).toMatchObject({ type: 'CELL_REF', value: 'A1' });
		expect(tokens[1]).toMatchObject({ type: 'COLON', value: ':' });
		expect(tokens[2]).toMatchObject({ type: 'CELL_REF', value: 'B10' });
	});
});

// =============================================================================
// Whitespace Handling
// =============================================================================

describe('lexer - whitespace', () => {
	it('ignores leading whitespace', () => {
		expect(getTokens('  42')[0]).toMatchObject({ type: 'NUMBER', value: '42' });
	});

	it('ignores trailing whitespace', () => {
		const tokens = getTokens('42  ');
		expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '42' });
		expect(tokens[1]).toMatchObject({ type: 'EOF' });
	});

	it('ignores whitespace between tokens', () => {
		const tokens = getTokens('1 + 2');
		expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '1' });
		expect(tokens[1]).toMatchObject({ type: 'OPERATOR', value: '+' });
		expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '2' });
	});

	it('handles tabs and newlines as whitespace', () => {
		const tokens = getTokens('1\t+\n2');
		expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '1' });
		expect(tokens[1]).toMatchObject({ type: 'OPERATOR', value: '+' });
		expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '2' });
	});
});

// =============================================================================
// Formula Prefix Handling
// =============================================================================

describe('lexer - formula prefix', () => {
	it('skips leading = for formulas', () => {
		const tokens = getTokens('=A1+B2');
		expect(tokens[0]).toMatchObject({ type: 'CELL_REF', value: 'A1' });
		expect(tokens[0].position).toBe(1);
	});

	it('works without = prefix', () => {
		const tokens = getTokens('A1+B2');
		expect(tokens[0]).toMatchObject({ type: 'CELL_REF', value: 'A1' });
		expect(tokens[0].position).toBe(0);
	});
});

// =============================================================================
// Position Tracking
// =============================================================================

describe('lexer - position tracking', () => {
	it('tracks token positions correctly', () => {
		const tokens = getTokens('A1+B2');
		expect(tokens[0].position).toBe(0); // A1
		expect(tokens[1].position).toBe(2); // +
		expect(tokens[2].position).toBe(3); // B2
	});

	it('tracks positions with whitespace', () => {
		const tokens = getTokens('A1 + B2');
		expect(tokens[0].position).toBe(0); // A1
		expect(tokens[1].position).toBe(3); // +
		expect(tokens[2].position).toBe(5); // B2
	});

	it('tracks positions with = prefix', () => {
		const tokens = getTokens('=A1+B2');
		expect(tokens[0].position).toBe(1); // A1
		expect(tokens[1].position).toBe(3); // +
		expect(tokens[2].position).toBe(4); // B2
	});
});

// =============================================================================
// Error Handling
// =============================================================================

describe('lexer - error handling', () => {
	it('reports errors with position', () => {
		const result = tokenize('A1 @ B2');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.position).toBe(3);
			expect(result.error).toContain('@');
		}
	});

	it('reports unknown character errors in French', () => {
		const result = tokenize('$');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('Caractere inattendu');
		}
	});

	it('reports unterminated string errors in French', () => {
		const result = tokenize('"unclosed');
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('non terminee');
		}
	});
});

// =============================================================================
// Complex Formulas
// =============================================================================

describe('lexer - complex formulas', () => {
	it('tokenizes function call with range argument', () => {
		const _tokens = getTokens('SUM(A1:A10)');
		expect(getTokenTypes('SUM(A1:A10)')).toEqual([
			'FUNCTION',
			'LPAREN',
			'CELL_REF',
			'COLON',
			'CELL_REF',
			'RPAREN'
		]);
	});

	it('tokenizes function call with multiple arguments', () => {
		expect(getTokenTypes('IF(A1>10,"oui","non")')).toEqual([
			'FUNCTION',
			'LPAREN',
			'CELL_REF',
			'COMPARISON',
			'NUMBER',
			'COMMA',
			'STRING',
			'COMMA',
			'STRING',
			'RPAREN'
		]);
	});

	it('tokenizes nested function calls', () => {
		expect(getTokenTypes('SUM(A1,AVERAGE(B1:B10))')).toEqual([
			'FUNCTION',
			'LPAREN',
			'CELL_REF',
			'COMMA',
			'FUNCTION',
			'LPAREN',
			'CELL_REF',
			'COLON',
			'CELL_REF',
			'RPAREN',
			'RPAREN'
		]);
	});

	it('tokenizes arithmetic expression', () => {
		expect(getTokenTypes('A1*2+3')).toEqual([
			'CELL_REF',
			'OPERATOR',
			'NUMBER',
			'OPERATOR',
			'NUMBER'
		]);
	});

	it('tokenizes unary minus', () => {
		expect(getTokenTypes('-A1')).toEqual(['OPERATOR', 'CELL_REF']);
		expect(getTokenTypes('--5')).toEqual(['OPERATOR', 'OPERATOR', 'NUMBER']);
	});

	it('tokenizes power expression', () => {
		expect(getTokenTypes('2^3')).toEqual(['NUMBER', 'OPERATOR', 'NUMBER']);
		expect(getTokenValues('2^3')).toEqual(['2', '^', '3']);
	});

	it('tokenizes comparison with boolean result', () => {
		expect(getTokenTypes('A1<>B1')).toEqual(['CELL_REF', 'COMPARISON', 'CELL_REF']);
		expect(getTokenValues('A1<>B1')).toEqual(['A1', '<>', 'B1']);
	});
});

// =============================================================================
// describeToken Helper
// =============================================================================

describe('describeToken', () => {
	it('describes number tokens', () => {
		expect(describeToken({ type: 'NUMBER', value: '42', position: 0 })).toBe('nombre 42');
	});

	it('describes string tokens', () => {
		expect(describeToken({ type: 'STRING', value: 'hello', position: 0 })).toBe('chaine "hello"');
	});

	it('describes boolean tokens', () => {
		expect(describeToken({ type: 'BOOLEAN', value: 'TRUE', position: 0 })).toBe('booleen TRUE');
	});

	it('describes cell reference tokens', () => {
		expect(describeToken({ type: 'CELL_REF', value: 'A1', position: 0 })).toBe('cellule A1');
	});

	it('describes function tokens', () => {
		expect(describeToken({ type: 'FUNCTION', value: 'SUM', position: 0 })).toBe('fonction SUM');
	});

	it('describes operator tokens', () => {
		expect(describeToken({ type: 'OPERATOR', value: '+', position: 0 })).toBe('operateur +');
	});

	it('describes comparison tokens', () => {
		expect(describeToken({ type: 'COMPARISON', value: '<=', position: 0 })).toBe('comparaison <=');
	});

	it('describes punctuation tokens', () => {
		expect(describeToken({ type: 'LPAREN', value: '(', position: 0 })).toBe('parenthese ouvrante');
		expect(describeToken({ type: 'RPAREN', value: ')', position: 0 })).toBe('parenthese fermante');
		expect(describeToken({ type: 'COMMA', value: ',', position: 0 })).toBe('virgule');
		expect(describeToken({ type: 'COLON', value: ':', position: 0 })).toBe('deux-points');
	});

	it('describes EOF token', () => {
		expect(describeToken({ type: 'EOF', value: '', position: 0 })).toBe('fin de formule');
	});
});
