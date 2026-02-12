/**
 * assignBlankIndices Tests
 * =========================
 *
 * Tests for the blank index assignment pipeline that processes a resolved
 * statement and assigns sequential 0-based indices to all blanks.
 *
 * Three types of blanks:
 * - `?` in math zones ($...$, $$...$$) → \placeholder[N]{}
 * - `[_]` in text → {{blank:N}}
 * - `<<expr:NAME>>` expressions → reserve indices for ? in answerFormats
 */

import { describe, it, expect } from 'vitest';
import { assignBlankIndices } from './assign-blank-indices';

describe('assignBlankIndices', () => {
	describe('? in inline math', () => {
		it('should replace single ? in inline math', () => {
			const result = assignBlankIndices('$?$');
			expect(result.statement).toBe('$\\placeholder[0]{}$');
			expect(result.totalBlanks).toBe(1);
		});

		it('should replace multiple ? in inline math', () => {
			const result = assignBlankIndices('$? + ? = 10$');
			expect(result.statement).toBe('$\\placeholder[0]{} + \\placeholder[1]{} = 10$');
			expect(result.totalBlanks).toBe(2);
		});

		it('should handle ? in multiple inline math zones', () => {
			const result = assignBlankIndices('$?$ et $?$');
			expect(result.statement).toBe('$\\placeholder[0]{}$ et $\\placeholder[1]{}$');
			expect(result.totalBlanks).toBe(2);
		});
	});

	describe('? in block math', () => {
		it('should replace ? in block math', () => {
			const result = assignBlankIndices('$$? \\times ?$$');
			expect(result.statement).toBe('$$\\placeholder[0]{} \\times \\placeholder[1]{}$$');
			expect(result.totalBlanks).toBe(2);
		});

		it('should handle single ? in block math', () => {
			const result = assignBlankIndices('$$?$$');
			expect(result.statement).toBe('$$\\placeholder[0]{}$$');
			expect(result.totalBlanks).toBe(1);
		});
	});

	describe('? outside math — NOT replaced', () => {
		it('should not replace ? in plain text', () => {
			const result = assignBlankIndices('Is this correct?');
			expect(result.statement).toBe('Is this correct?');
			expect(result.totalBlanks).toBe(0);
		});

		it('should not replace ? in mixed text and math', () => {
			const result = assignBlankIndices('Question? Repondre $?$');
			expect(result.statement).toBe('Question? Repondre $\\placeholder[0]{}$');
			expect(result.totalBlanks).toBe(1);
		});
	});

	describe('[_] in text', () => {
		it('should replace single [_] in text', () => {
			const result = assignBlankIndices('Le nombre [_] est pair');
			expect(result.statement).toBe('Le nombre {{blank:0}} est pair');
			expect(result.totalBlanks).toBe(1);
		});

		it('should replace multiple [_] in text', () => {
			const result = assignBlankIndices('[_] et [_] sont des nombres');
			expect(result.statement).toBe('{{blank:0}} et {{blank:1}} sont des nombres');
			expect(result.totalBlanks).toBe(2);
		});
	});

	describe('<<expr:NAME>> expressions — index reservation', () => {
		it('should reserve indices for ? in answerFormat', () => {
			const result = assignBlankIndices('$$<<expr:expression1>>10^{2} \\times 10^{3}$$', {
				expression1: '10^{?}'
			});
			// Expression content unchanged in statement
			expect(result.statement).toBe('$$<<expr:expression1>>10^{2} \\times 10^{3}$$');
			// answerFormat modified
			expect(result.answerFormats).toEqual({
				expression1: '10^{\\placeholder[0]{}}'
			});
			expect(result.totalBlanks).toBe(1);
		});

		it('should reserve multiple indices for multiple ? in answerFormat', () => {
			const result = assignBlankIndices('$$<<expr:expression1>>content$$', {
				expression1: '? \\times 10^{?}'
			});
			expect(result.answerFormats).toEqual({
				expression1: '\\placeholder[0]{} \\times 10^{\\placeholder[1]{}}'
			});
			expect(result.totalBlanks).toBe(2);
		});

		it('should handle expression with default answerFormat "?"', () => {
			const result = assignBlankIndices('$$<<expr:expression1>>5 + 3$$', { expression1: '?' });
			expect(result.answerFormats).toEqual({
				expression1: '\\placeholder[0]{}'
			});
			expect(result.totalBlanks).toBe(1);
		});
	});

	describe('global left-to-right counter', () => {
		it('should count expression indices before statement ? indices', () => {
			const result = assignBlankIndices('$$<<expr:expression1>>10^2$$ et $? + ?$', {
				expression1: '10^{?}'
			});
			// Expression at position 0 → reserves index 0
			// Then ? + ? → indices 1, 2
			expect(result.statement).toBe(
				'$$<<expr:expression1>>10^2$$ et $\\placeholder[1]{} + \\placeholder[2]{}$'
			);
			expect(result.answerFormats).toEqual({
				expression1: '10^{\\placeholder[0]{}}'
			});
			expect(result.totalBlanks).toBe(3);
		});

		it('should count math ? before text [_]', () => {
			const result = assignBlankIndices('$?$ est un nombre [_]');
			expect(result.statement).toBe('$\\placeholder[0]{}$ est un nombre {{blank:1}}');
			expect(result.totalBlanks).toBe(2);
		});

		it('should count text [_] before math ? when [_] comes first', () => {
			const result = assignBlankIndices('Le mot [_] vaut $?$');
			expect(result.statement).toBe('Le mot {{blank:0}} vaut $\\placeholder[1]{}$');
			expect(result.totalBlanks).toBe(2);
		});
	});

	describe('complete example from architecture doc (section 3.10)', () => {
		it('should handle expression + math blanks + text blank', () => {
			const result = assignBlankIndices(
				'$$<<expr:expression1>>10^{2} \\times 10^{3}$$ Completer : $? + ?$ est un nombre [_].',
				{ expression1: '10^{?}' }
			);

			expect(result.statement).toBe(
				'$$<<expr:expression1>>10^{2} \\times 10^{3}$$ Completer : $\\placeholder[1]{} + \\placeholder[2]{}$ est un nombre {{blank:3}}.'
			);
			expect(result.answerFormats).toEqual({
				expression1: '10^{\\placeholder[0]{}}'
			});
			expect(result.totalBlanks).toBe(4);
		});
	});

	describe('expression with ? in statement (fill-in inside expression)', () => {
		it('should replace ? inside expression math content normally', () => {
			// Expression like "(-3) × ? = -12" — the ? IS in the statement math
			const result = assignBlankIndices('$<<expr:expression1>>(-3) \\times ? = -12$');
			// The ? inside math is replaced normally
			expect(result.statement).toBe('$<<expr:expression1>>(-3) \\times \\placeholder[0]{} = -12$');
			expect(result.totalBlanks).toBe(1);
		});
	});

	describe('no answerFormats', () => {
		it('should work without answerFormats parameter', () => {
			const result = assignBlankIndices('$?$ et [_]');
			expect(result.statement).toBe('$\\placeholder[0]{}$ et {{blank:1}}');
			expect(result.answerFormats).toBeUndefined();
			expect(result.totalBlanks).toBe(2);
		});
	});

	describe('no blanks', () => {
		it('should return totalBlanks 0 for statement without blanks', () => {
			const result = assignBlankIndices('Texte simple sans trou');
			expect(result.statement).toBe('Texte simple sans trou');
			expect(result.totalBlanks).toBe(0);
		});

		it('should return totalBlanks 0 for math without ?', () => {
			const result = assignBlankIndices('$x^2 + 1$');
			expect(result.statement).toBe('$x^2 + 1$');
			expect(result.totalBlanks).toBe(0);
		});
	});

	describe('answerFormats without matching expression in statement', () => {
		it('should return answerFormats unchanged if no expression found', () => {
			const result = assignBlankIndices('$?$', { expression1: '10^{?}' });
			// No <<expr:expression1>> in statement, so answerFormat untouched
			expect(result.statement).toBe('$\\placeholder[0]{}$');
			expect(result.answerFormats).toEqual({ expression1: '10^{?}' });
			expect(result.totalBlanks).toBe(1);
		});
	});

	describe('multiple expressions', () => {
		it('should handle two expressions with answerFormats', () => {
			const result = assignBlankIndices('$$<<expr:expression1>>a$$ et $$<<expr:expression2>>b$$', {
				expression1: '?',
				expression2: '?'
			});
			// expression1 at index 0, expression2 at index 1
			expect(result.answerFormats).toEqual({
				expression1: '\\placeholder[0]{}',
				expression2: '\\placeholder[1]{}'
			});
			expect(result.totalBlanks).toBe(2);
		});
	});

	describe('edge cases', () => {
		it('should handle escaped dollar signs', () => {
			// \\$ is not a math zone
			const result = assignBlankIndices('Le prix est 5\\$ et $?$');
			expect(result.statement).toBe('Le prix est 5\\$ et $\\placeholder[0]{}$');
			expect(result.totalBlanks).toBe(1);
		});

		it('should handle nested braces in math', () => {
			const result = assignBlankIndices('$\\frac{?}{2}$');
			expect(result.statement).toBe('$\\frac{\\placeholder[0]{}}{2}$');
			expect(result.totalBlanks).toBe(1);
		});

		it('should handle empty statement', () => {
			const result = assignBlankIndices('');
			expect(result.statement).toBe('');
			expect(result.totalBlanks).toBe(0);
		});
	});
});
