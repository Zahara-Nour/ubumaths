/**
 * Tests for Blank Resolver
 *
 * Validates:
 * 1. expression* without ? → answerFormat mode (Result/Rewrite)
 * 2. shared.answerFormat used if defined, else default ?
 * 3. variation.answerFormat overrides shared
 * 4. ? in $...$ converted to \placeholder[N]{} with global numbering
 * 5. ? in $$...$$ also converted
 * 6. Numbering continuous between expression and statement
 * 7. Pipeline generates instance.blanks with type: 'math' | 'text'
 * 8. [_] in statement generates text blanks
 */

import { describe, it, expect } from 'vitest';
import { resolveBlanks, buildAnswerFormatExpression } from './blank-resolver';

// ============================================================================
// resolveBlanks
// ============================================================================

describe('resolveBlanks', () => {
	it('should convert ? in inline math $...$ to \\placeholder[N]{}', () => {
		const result = resolveBlanks('Calculate $? + ?$');
		expect(result.resolvedStatement).toBe('Calculate $\\placeholder[0]{} + \\placeholder[1]{}$');
		expect(result.blanks).toHaveLength(2);
		expect(result.blanks[0]).toMatchObject({ position: 0, type: 'math' });
		expect(result.blanks[1]).toMatchObject({ position: 1, type: 'math' });
	});

	it('should convert ? in block math $$...$$ to \\placeholder[N]{}', () => {
		const result = resolveBlanks('$$? + ? = 10$$');
		expect(result.resolvedStatement).toBe('$$\\placeholder[0]{} + \\placeholder[1]{} = 10$$');
		expect(result.blanks).toHaveLength(2);
	});

	it('should NOT convert ? in plain text', () => {
		const result = resolveBlanks('What is 2+3? Calculate it.');
		expect(result.resolvedStatement).toBe('What is 2+3? Calculate it.');
		expect(result.blanks).toHaveLength(0);
	});

	it('should detect [_] as text blank', () => {
		const result = resolveBlanks('A triangle is a [_] shape.');
		expect(result.resolvedStatement).toBe('A triangle is a [_] shape.');
		expect(result.blanks).toHaveLength(1);
		expect(result.blanks[0]).toMatchObject({ position: 0, type: 'text' });
	});

	it('should detect {{blank:N}} as text blank', () => {
		const result = resolveBlanks('Answer: {{blank:0}}');
		expect(result.resolvedStatement).toBe('Answer: {{blank:0}}');
		expect(result.blanks).toHaveLength(1);
		expect(result.blanks[0]).toMatchObject({ position: 0, type: 'text' });
	});

	it('should number all blanks positionally (math and text mixed)', () => {
		const result = resolveBlanks('$? + ?$ is a [_] number');
		expect(result.resolvedStatement).toBe(
			'$\\placeholder[0]{} + \\placeholder[1]{}$ is a [_] number'
		);
		expect(result.blanks).toHaveLength(3);
		expect(result.blanks[0]).toMatchObject({ position: 0, type: 'math' });
		expect(result.blanks[1]).toMatchObject({ position: 1, type: 'math' });
		expect(result.blanks[2]).toMatchObject({ position: 2, type: 'text' });
	});

	it('should handle text blank before math blank', () => {
		const result = resolveBlanks('[_] equals $?$');
		expect(result.blanks).toHaveLength(2);
		expect(result.blanks[0]).toMatchObject({ position: 0, type: 'text' });
		expect(result.blanks[1]).toMatchObject({ position: 1, type: 'math' });
	});

	it('should handle multiple [_] with correct numbering', () => {
		const result = resolveBlanks('[_] et [_] sont des [_]');
		expect(result.blanks).toHaveLength(3);
		expect(result.blanks.map((b) => b.position)).toEqual([0, 1, 2]);
		expect(result.blanks.every((b) => b.type === 'text')).toBe(true);
	});

	it('should return empty blanks for statement without blanks', () => {
		const result = resolveBlanks('Calculate $2 + 3$');
		expect(result.blanks).toHaveLength(0);
		expect(result.resolvedStatement).toBe('Calculate $2 + 3$');
	});

	it('should handle statement with only math blanks', () => {
		const result = resolveBlanks('$(-3) \\times ? = ?$');
		expect(result.blanks).toHaveLength(2);
		expect(result.blanks.every((b) => b.type === 'math')).toBe(true);
	});
});

// ============================================================================
// buildAnswerFormatExpression
// ============================================================================

describe('buildAnswerFormatExpression', () => {
	it('should build expression = answerFormat with single ?', () => {
		const result = buildAnswerFormatExpression('2^3 \\times 2^4', '?');
		expect(result.displayLatex).toBe('2^3 \\times 2^4 = \\placeholder[0]{}');
		expect(result.blanks).toHaveLength(1);
		expect(result.blanks[0]).toMatchObject({ position: 0, type: 'math' });
	});

	it('should build expression with answerFormat 10^?', () => {
		const result = buildAnswerFormatExpression('10^2 \\times 10^3', '10^?');
		expect(result.displayLatex).toBe('10^2 \\times 10^3 = 10^\\placeholder[0]{}');
		expect(result.blanks).toHaveLength(1);
	});

	it('should handle multi-blank answerFormat ?*10^?', () => {
		const result = buildAnswerFormatExpression('345000', '?*10^?');
		expect(result.displayLatex).toBe('345000 = \\placeholder[0]{}*10^\\placeholder[1]{}');
		expect(result.blanks).toHaveLength(2);
		expect(result.blanks[0].position).toBe(0);
		expect(result.blanks[1].position).toBe(1);
	});

	it('should use startIndex for numbering continuation', () => {
		const result = buildAnswerFormatExpression('expr', '?', 3);
		expect(result.displayLatex).toBe('expr = \\placeholder[3]{}');
		expect(result.blanks[0].position).toBe(3);
	});

	it('should handle answerFormat without ? (edge case)', () => {
		const result = buildAnswerFormatExpression('2+3', '5');
		expect(result.displayLatex).toBe('2+3 = 5');
		expect(result.blanks).toHaveLength(0);
	});

	it('should default answerFormat to ? if not provided', () => {
		const result = buildAnswerFormatExpression('2+3', '?');
		expect(result.displayLatex).toBe('2+3 = \\placeholder[0]{}');
		expect(result.blanks).toHaveLength(1);
	});
});
