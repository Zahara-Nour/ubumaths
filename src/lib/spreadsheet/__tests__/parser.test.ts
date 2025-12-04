/**
 * Parser Tests - Unit tests for the spreadsheet formula parser
 *
 * @module spreadsheet/__tests__/parser.test
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser/parser';
import type { ASTNode } from '../parser/ast';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to parse and assert success, returning the AST
 */
function parseSuccess(formula: string): ASTNode {
	const result = parse(formula);
	if (!result.success) {
		throw new Error(`Parse failed: ${result.error.message} at position ${result.error.position}`);
	}
	return result.ast;
}

/**
 * Helper to parse and assert failure, returning the error
 */
function parseFailure(formula: string): { message: string; position: number; token?: string } {
	const result = parse(formula);
	if (result.success) {
		throw new Error(`Expected parse to fail, but got: ${JSON.stringify(result.ast)}`);
	}
	return result.error;
}

// =============================================================================
// Number Parsing
// =============================================================================

describe('parser - numbers', () => {
	it('parses integer numbers', () => {
		expect(parseSuccess('42')).toEqual({ type: 'number', value: 42 });
		expect(parseSuccess('0')).toEqual({ type: 'number', value: 0 });
		expect(parseSuccess('123456')).toEqual({ type: 'number', value: 123456 });
	});

	it('parses decimal numbers', () => {
		expect(parseSuccess('3.14')).toEqual({ type: 'number', value: 3.14 });
		expect(parseSuccess('0.5')).toEqual({ type: 'number', value: 0.5 });
		expect(parseSuccess('.5')).toEqual({ type: 'number', value: 0.5 });
		expect(parseSuccess('5.')).toEqual({ type: 'number', value: 5 });
	});

	it('parses negative numbers (unary minus)', () => {
		const ast = parseSuccess('-42');
		expect(ast).toEqual({
			type: 'unaryOp',
			operator: '-',
			operand: { type: 'number', value: 42 }
		});
	});

	it('parses positive numbers (unary plus)', () => {
		const ast = parseSuccess('+42');
		expect(ast).toEqual({
			type: 'unaryOp',
			operator: '+',
			operand: { type: 'number', value: 42 }
		});
	});

	it('parses numbers with = prefix', () => {
		expect(parseSuccess('=42')).toEqual({ type: 'number', value: 42 });
	});
});

// =============================================================================
// String Parsing
// =============================================================================

describe('parser - strings', () => {
	it('parses double-quoted strings', () => {
		expect(parseSuccess('"hello"')).toEqual({ type: 'string', value: 'hello' });
		expect(parseSuccess('"world"')).toEqual({ type: 'string', value: 'world' });
	});

	it('parses single-quoted strings', () => {
		expect(parseSuccess("'hello'")).toEqual({ type: 'string', value: 'hello' });
	});

	it('parses empty strings', () => {
		expect(parseSuccess('""')).toEqual({ type: 'string', value: '' });
	});

	it('parses strings with spaces', () => {
		expect(parseSuccess('"hello world"')).toEqual({ type: 'string', value: 'hello world' });
	});
});

// =============================================================================
// Boolean Parsing
// =============================================================================

describe('parser - booleans', () => {
	it('parses TRUE and FALSE', () => {
		expect(parseSuccess('TRUE')).toEqual({ type: 'boolean', value: true });
		expect(parseSuccess('FALSE')).toEqual({ type: 'boolean', value: false });
	});

	it('parses French booleans VRAI and FAUX', () => {
		expect(parseSuccess('VRAI')).toEqual({ type: 'boolean', value: true });
		expect(parseSuccess('FAUX')).toEqual({ type: 'boolean', value: false });
	});

	it('parses booleans case-insensitively', () => {
		expect(parseSuccess('true')).toEqual({ type: 'boolean', value: true });
		expect(parseSuccess('True')).toEqual({ type: 'boolean', value: true });
		expect(parseSuccess('vrai')).toEqual({ type: 'boolean', value: true });
	});
});

// =============================================================================
// Cell Reference Parsing
// =============================================================================

describe('parser - cell references', () => {
	it('parses simple cell references', () => {
		expect(parseSuccess('A1')).toEqual({ type: 'cellRef', ref: 'A1', col: 0, row: 0 });
		expect(parseSuccess('B2')).toEqual({ type: 'cellRef', ref: 'B2', col: 1, row: 1 });
		// Note: MAX_COLS = 20 (A-T), MAX_ROWS = 20 (1-20), so T20 is the max valid cell
		expect(parseSuccess('T20')).toEqual({ type: 'cellRef', ref: 'T20', col: 19, row: 19 });
	});

	it('parses cell references at grid boundaries', () => {
		expect(parseSuccess('A20')).toEqual({ type: 'cellRef', ref: 'A20', col: 0, row: 19 });
		expect(parseSuccess('T1')).toEqual({ type: 'cellRef', ref: 'T1', col: 19, row: 0 });
	});

	it('normalizes cell references to uppercase', () => {
		expect(parseSuccess('a1')).toEqual({ type: 'cellRef', ref: 'A1', col: 0, row: 0 });
		expect(parseSuccess('b2')).toEqual({ type: 'cellRef', ref: 'B2', col: 1, row: 1 });
	});
});

// =============================================================================
// Range Reference Parsing
// =============================================================================

describe('parser - range references', () => {
	it('parses simple ranges', () => {
		const ast = parseSuccess('A1:B10');
		expect(ast).toEqual({
			type: 'rangeRef',
			start: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			end: { type: 'cellRef', ref: 'B10', col: 1, row: 9 }
		});
	});

	it('parses single-column ranges', () => {
		const ast = parseSuccess('A1:A10');
		expect(ast).toEqual({
			type: 'rangeRef',
			start: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			end: { type: 'cellRef', ref: 'A10', col: 0, row: 9 }
		});
	});

	it('parses single-row ranges', () => {
		// Note: MAX_COLS = 20 (A-T), so A1:T1 is the max valid row range
		const ast = parseSuccess('A1:T1');
		expect(ast).toEqual({
			type: 'rangeRef',
			start: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			end: { type: 'cellRef', ref: 'T1', col: 19, row: 0 }
		});
	});
});

// =============================================================================
// Arithmetic Expression Parsing
// =============================================================================

describe('parser - arithmetic expressions', () => {
	it('parses addition', () => {
		const ast = parseSuccess('1+2');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '+',
			left: { type: 'number', value: 1 },
			right: { type: 'number', value: 2 }
		});
	});

	it('parses subtraction', () => {
		const ast = parseSuccess('5-3');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '-',
			left: { type: 'number', value: 5 },
			right: { type: 'number', value: 3 }
		});
	});

	it('parses multiplication', () => {
		const ast = parseSuccess('2*3');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '*',
			left: { type: 'number', value: 2 },
			right: { type: 'number', value: 3 }
		});
	});

	it('parses division', () => {
		const ast = parseSuccess('10/2');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '/',
			left: { type: 'number', value: 10 },
			right: { type: 'number', value: 2 }
		});
	});

	it('parses exponentiation', () => {
		const ast = parseSuccess('2^3');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '^',
			left: { type: 'number', value: 2 },
			right: { type: 'number', value: 3 }
		});
	});

	it('parses cell references in expressions', () => {
		const ast = parseSuccess('A1+B2');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '+',
			left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			right: { type: 'cellRef', ref: 'B2', col: 1, row: 1 }
		});
	});
});

// =============================================================================
// Operator Precedence
// =============================================================================

describe('parser - operator precedence', () => {
	it('handles multiplication before addition (left)', () => {
		// 2*3+4 = (2*3)+4
		const ast = parseSuccess('2*3+4');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '+',
			left: {
				type: 'binaryOp',
				operator: '*',
				left: { type: 'number', value: 2 },
				right: { type: 'number', value: 3 }
			},
			right: { type: 'number', value: 4 }
		});
	});

	it('handles multiplication before addition (right)', () => {
		// 2+3*4 = 2+(3*4)
		const ast = parseSuccess('2+3*4');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '+',
			left: { type: 'number', value: 2 },
			right: {
				type: 'binaryOp',
				operator: '*',
				left: { type: 'number', value: 3 },
				right: { type: 'number', value: 4 }
			}
		});
	});

	it('handles division before subtraction', () => {
		// 10-6/2 = 10-(6/2)
		const ast = parseSuccess('10-6/2');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '-',
			left: { type: 'number', value: 10 },
			right: {
				type: 'binaryOp',
				operator: '/',
				left: { type: 'number', value: 6 },
				right: { type: 'number', value: 2 }
			}
		});
	});

	it('handles exponentiation before multiplication', () => {
		// 2*3^2 = 2*(3^2)
		const ast = parseSuccess('2*3^2');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '*',
			left: { type: 'number', value: 2 },
			right: {
				type: 'binaryOp',
				operator: '^',
				left: { type: 'number', value: 3 },
				right: { type: 'number', value: 2 }
			}
		});
	});

	it('handles right-associativity of exponentiation', () => {
		// 2^3^2 = 2^(3^2)
		const ast = parseSuccess('2^3^2');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '^',
			left: { type: 'number', value: 2 },
			right: {
				type: 'binaryOp',
				operator: '^',
				left: { type: 'number', value: 3 },
				right: { type: 'number', value: 2 }
			}
		});
	});

	it('handles left-associativity of addition/subtraction', () => {
		// 1-2+3 = (1-2)+3
		const ast = parseSuccess('1-2+3');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '+',
			left: {
				type: 'binaryOp',
				operator: '-',
				left: { type: 'number', value: 1 },
				right: { type: 'number', value: 2 }
			},
			right: { type: 'number', value: 3 }
		});
	});

	it('handles parentheses to override precedence', () => {
		// (2+3)*4
		const ast = parseSuccess('(2+3)*4');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '*',
			left: {
				type: 'binaryOp',
				operator: '+',
				left: { type: 'number', value: 2 },
				right: { type: 'number', value: 3 }
			},
			right: { type: 'number', value: 4 }
		});
	});
});

// =============================================================================
// Comparison Parsing
// =============================================================================

describe('parser - comparisons', () => {
	it('parses equals comparison', () => {
		const ast = parseSuccess('A1=10');
		expect(ast).toEqual({
			type: 'comparison',
			operator: '=',
			left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			right: { type: 'number', value: 10 }
		});
	});

	it('parses not equals comparison', () => {
		const ast = parseSuccess('A1<>B1');
		expect(ast).toEqual({
			type: 'comparison',
			operator: '<>',
			left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			right: { type: 'cellRef', ref: 'B1', col: 1, row: 0 }
		});
	});

	it('parses less than comparison', () => {
		const ast = parseSuccess('A1<10');
		expect(ast).toEqual({
			type: 'comparison',
			operator: '<',
			left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			right: { type: 'number', value: 10 }
		});
	});

	it('parses greater than comparison', () => {
		const ast = parseSuccess('A1>10');
		expect(ast).toEqual({
			type: 'comparison',
			operator: '>',
			left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			right: { type: 'number', value: 10 }
		});
	});

	it('parses less than or equal comparison', () => {
		const ast = parseSuccess('A1<=10');
		expect(ast).toEqual({
			type: 'comparison',
			operator: '<=',
			left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			right: { type: 'number', value: 10 }
		});
	});

	it('parses greater than or equal comparison', () => {
		const ast = parseSuccess('A1>=10');
		expect(ast).toEqual({
			type: 'comparison',
			operator: '>=',
			left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
			right: { type: 'number', value: 10 }
		});
	});

	it('comparisons have lower precedence than arithmetic', () => {
		// A1+1>10 = (A1+1)>10
		const ast = parseSuccess('A1+1>10');
		expect(ast).toEqual({
			type: 'comparison',
			operator: '>',
			left: {
				type: 'binaryOp',
				operator: '+',
				left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
				right: { type: 'number', value: 1 }
			},
			right: { type: 'number', value: 10 }
		});
	});
});

// =============================================================================
// Function Call Parsing
// =============================================================================

describe('parser - function calls', () => {
	it('parses function with no arguments', () => {
		const ast = parseSuccess('PI()');
		expect(ast).toEqual({
			type: 'functionCall',
			name: 'PI',
			args: []
		});
	});

	it('parses function with single cell argument', () => {
		const ast = parseSuccess('ABS(A1)');
		expect(ast).toEqual({
			type: 'functionCall',
			name: 'ABS',
			args: [{ type: 'cellRef', ref: 'A1', col: 0, row: 0 }]
		});
	});

	it('parses function with range argument', () => {
		const ast = parseSuccess('SUM(A1:A10)');
		expect(ast).toEqual({
			type: 'functionCall',
			name: 'SUM',
			args: [
				{
					type: 'rangeRef',
					start: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
					end: { type: 'cellRef', ref: 'A10', col: 0, row: 9 }
				}
			]
		});
	});

	it('parses function with multiple arguments', () => {
		const ast = parseSuccess('MAX(A1, B1, C1)');
		expect(ast).toEqual({
			type: 'functionCall',
			name: 'MAX',
			args: [
				{ type: 'cellRef', ref: 'A1', col: 0, row: 0 },
				{ type: 'cellRef', ref: 'B1', col: 1, row: 0 },
				{ type: 'cellRef', ref: 'C1', col: 2, row: 0 }
			]
		});
	});

	it('parses IF function with three arguments', () => {
		const ast = parseSuccess('IF(A1>10,"high","low")');
		expect(ast).toEqual({
			type: 'functionCall',
			name: 'IF',
			args: [
				{
					type: 'comparison',
					operator: '>',
					left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
					right: { type: 'number', value: 10 }
				},
				{ type: 'string', value: 'high' },
				{ type: 'string', value: 'low' }
			]
		});
	});

	it('parses nested function calls', () => {
		const ast = parseSuccess('SUM(A1, AVERAGE(B1:B10))');
		expect(ast).toEqual({
			type: 'functionCall',
			name: 'SUM',
			args: [
				{ type: 'cellRef', ref: 'A1', col: 0, row: 0 },
				{
					type: 'functionCall',
					name: 'AVERAGE',
					args: [
						{
							type: 'rangeRef',
							start: { type: 'cellRef', ref: 'B1', col: 1, row: 0 },
							end: { type: 'cellRef', ref: 'B10', col: 1, row: 9 }
						}
					]
				}
			]
		});
	});

	it('parses function with expression argument', () => {
		const ast = parseSuccess('ABS(A1-B1)');
		expect(ast).toEqual({
			type: 'functionCall',
			name: 'ABS',
			args: [
				{
					type: 'binaryOp',
					operator: '-',
					left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
					right: { type: 'cellRef', ref: 'B1', col: 1, row: 0 }
				}
			]
		});
	});
});

// =============================================================================
// French Function Aliases
// =============================================================================

describe('parser - French function aliases', () => {
	it('normalizes SOMME to SUM', () => {
		const ast = parseSuccess('SOMME(A1:A10)');
		expect(ast).toEqual({
			type: 'functionCall',
			name: 'SUM',
			args: [
				{
					type: 'rangeRef',
					start: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
					end: { type: 'cellRef', ref: 'A10', col: 0, row: 9 }
				}
			]
		});
	});

	it('normalizes MOYENNE to AVERAGE', () => {
		const ast = parseSuccess('MOYENNE(A1:A10)');
		expect((ast as { name: string }).name).toBe('AVERAGE');
	});

	it('normalizes SI to IF', () => {
		const ast = parseSuccess('SI(A1>10,"oui","non")');
		expect((ast as { name: string }).name).toBe('IF');
	});

	it('normalizes ET to AND', () => {
		const ast = parseSuccess('ET(A1>0,A1<10)');
		expect((ast as { name: string }).name).toBe('AND');
	});

	it('normalizes OU to OR', () => {
		const ast = parseSuccess('OU(A1>10,B1>10)');
		expect((ast as { name: string }).name).toBe('OR');
	});

	it('normalizes ARRONDI to ROUND', () => {
		const ast = parseSuccess('ARRONDI(A1,2)');
		expect((ast as { name: string }).name).toBe('ROUND');
	});

	it('normalizes RACINE to SQRT', () => {
		const ast = parseSuccess('RACINE(16)');
		expect((ast as { name: string }).name).toBe('SQRT');
	});

	it('handles case-insensitive French aliases', () => {
		const ast1 = parseSuccess('somme(A1:A10)');
		expect((ast1 as { name: string }).name).toBe('SUM');

		const ast2 = parseSuccess('Somme(A1:A10)');
		expect((ast2 as { name: string }).name).toBe('SUM');
	});
});

// =============================================================================
// Complex Formulas
// =============================================================================

describe('parser - complex formulas', () => {
	it('parses =42 (simple value)', () => {
		expect(parseSuccess('=42')).toEqual({ type: 'number', value: 42 });
	});

	it('parses ="hello" (string value)', () => {
		expect(parseSuccess('="hello"')).toEqual({ type: 'string', value: 'hello' });
	});

	it('parses =A1 (cell reference)', () => {
		expect(parseSuccess('=A1')).toEqual({ type: 'cellRef', ref: 'A1', col: 0, row: 0 });
	});

	it('parses =A1+B2 (addition)', () => {
		const ast = parseSuccess('=A1+B2');
		expect(ast.type).toBe('binaryOp');
	});

	it('parses =A1*2+3 (precedence)', () => {
		const ast = parseSuccess('=A1*2+3');
		// Should be (A1*2)+3
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '+',
			left: {
				type: 'binaryOp',
				operator: '*',
				left: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
				right: { type: 'number', value: 2 }
			},
			right: { type: 'number', value: 3 }
		});
	});

	it('parses =SUM(A1:A10) (function with range)', () => {
		const ast = parseSuccess('=SUM(A1:A10)');
		expect(ast.type).toBe('functionCall');
		expect((ast as { name: string }).name).toBe('SUM');
	});

	it('parses =AVERAGE(A1:A10)+5 (function in expression)', () => {
		const ast = parseSuccess('=AVERAGE(A1:A10)+5');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '+',
			left: {
				type: 'functionCall',
				name: 'AVERAGE',
				args: [
					{
						type: 'rangeRef',
						start: { type: 'cellRef', ref: 'A1', col: 0, row: 0 },
						end: { type: 'cellRef', ref: 'A10', col: 0, row: 9 }
					}
				]
			},
			right: { type: 'number', value: 5 }
		});
	});

	it('parses =-A1 (unary minus)', () => {
		const ast = parseSuccess('=-A1');
		expect(ast).toEqual({
			type: 'unaryOp',
			operator: '-',
			operand: { type: 'cellRef', ref: 'A1', col: 0, row: 0 }
		});
	});

	it('parses =2^3 (exponentiation)', () => {
		const ast = parseSuccess('=2^3');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '^',
			left: { type: 'number', value: 2 },
			right: { type: 'number', value: 3 }
		});
	});

	it('parses nested parentheses', () => {
		const ast = parseSuccess('((1+2))');
		expect(ast).toEqual({
			type: 'binaryOp',
			operator: '+',
			left: { type: 'number', value: 1 },
			right: { type: 'number', value: 2 }
		});
	});

	it('parses complex IF formula', () => {
		const ast = parseSuccess('=IF(A1>10, "oui", "non")');
		expect(ast.type).toBe('functionCall');
		expect((ast as unknown as { name: string }).name).toBe('IF');
		expect((ast as unknown as { args: ASTNode[] }).args.length).toBe(3);
	});

	it('parses double negation', () => {
		const ast = parseSuccess('--5');
		expect(ast).toEqual({
			type: 'unaryOp',
			operator: '-',
			operand: {
				type: 'unaryOp',
				operator: '-',
				operand: { type: 'number', value: 5 }
			}
		});
	});
});

// =============================================================================
// Error Handling
// =============================================================================

describe('parser - error handling', () => {
	it('reports syntax errors with position', () => {
		// Note: 1++2 is valid as 1 + (+2), use an actual syntax error
		const error = parseFailure('1+*2');
		expect(error.position).toBeGreaterThan(0);
	});

	it('reports error for unknown function', () => {
		const error = parseFailure('UNKNOWNFUNC(A1)');
		expect(error.message).toContain('inconnue');
		expect(error.message).toContain('#NAME?');
	});

	it('reports error for missing closing parenthesis', () => {
		const error = parseFailure('SUM(A1:A10');
		expect(error.message).toContain('fermante');
	});

	it('reports error for identifier not followed by parenthesis', () => {
		// SUM without ( is treated as an unknown identifier
		const error = parseFailure('SUM A1:A10)');
		expect(error.message).toContain('Identifiant inconnu');
	});

	it('reports error for unexpected token after expression', () => {
		const error = parseFailure('1 2');
		expect(error.message).toContain('inattendu');
	});

	it('reports error for unknown identifier', () => {
		const error = parseFailure('UNKNOWN');
		expect(error.message).toContain('Identifiant inconnu');
	});

	it('reports error for missing range end', () => {
		const error = parseFailure('A1:');
		expect(error.message).toContain('cellule');
	});

	it('provides error messages in French', () => {
		const error = parseFailure('SUM(');
		// Error message should be in French
		expect(error.message).toMatch(/attendue|inattendu|invalide|inconnu/i);
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('parser - edge cases', () => {
	it('handles whitespace in formulas', () => {
		const ast = parseSuccess('=  A1  +  B2  ');
		expect(ast.type).toBe('binaryOp');
	});

	it('handles function call with whitespace', () => {
		const ast = parseSuccess('SUM( A1 : A10 )');
		expect(ast.type).toBe('functionCall');
	});

	it('handles empty formula', () => {
		const error = parseFailure('');
		expect(error.message).toContain('attendue');
	});

	it('handles formula with only =', () => {
		const error = parseFailure('=');
		expect(error.message).toContain('attendue');
	});

	it('handles deeply nested expressions', () => {
		const ast = parseSuccess('((((1+2)*3)-4)/5)');
		expect(ast.type).toBe('binaryOp');
	});

	it('handles function as first argument to function', () => {
		const ast = parseSuccess('MAX(MIN(A1,B1),C1)');
		expect(ast.type).toBe('functionCall');
		expect((ast as { name: string }).name).toBe('MAX');
	});

	it('handles comparison in function argument', () => {
		const ast = parseSuccess('IF(A1=B1,1,0)');
		expect(ast.type).toBe('functionCall');
		const args = (ast as unknown as { args: ASTNode[] }).args;
		expect(args[0].type).toBe('comparison');
	});

	it('handles multiple comparisons (chained)', () => {
		// A1>B1>C1 parses as (A1>B1)>C1 (left-associative)
		const ast = parseSuccess('A1>B1>C1');
		expect(ast.type).toBe('comparison');
		expect((ast as { left: ASTNode }).left.type).toBe('comparison');
	});
});
