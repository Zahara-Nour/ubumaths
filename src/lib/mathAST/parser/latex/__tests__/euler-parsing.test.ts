/**
 * Tests for parsing the Euler constant \exponentialE in LaTeX
 *
 * MathLive uses \exponentialE to represent Euler's number e.
 * We parse it as MathConstantNode('euler').
 */

import { describe, it, expect } from 'vitest';
import { parseLatexSafe } from '../../index';
import { isMathConstant, isEulerConstant, isNumber, isSuperscript } from '../../../guards';

describe('Euler constant parsing (\\exponentialE)', () => {
	describe('basic parsing', () => {
		it('parses \\exponentialE as MathConstantNode(euler)', () => {
			const result = parseLatexSafe('\\exponentialE');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(isMathConstant(result.ast!)).toBe(true);
			expect(isEulerConstant(result.ast!)).toBe(true);
			if (isMathConstant(result.ast!)) {
				expect(result.ast!.constant).toBe('euler');
			}
		});
	});

	describe('expressions with Euler constant', () => {
		it('parses \\exponentialE^x as e^x', () => {
			const result = parseLatexSafe('\\exponentialE^x');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(isSuperscript(result.ast!)).toBe(true);
			if (isSuperscript(result.ast!)) {
				expect(isEulerConstant(result.ast!.base)).toBe(true);
			}
		});

		it('parses 2\\exponentialE as 2 * e (implicit multiplication)', () => {
			const result = parseLatexSafe('2\\exponentialE');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(result.ast!.type).toBe('multiplication');
			if (result.ast!.type === 'multiplication') {
				expect(isNumber(result.ast!.left)).toBe(true);
				expect(isEulerConstant(result.ast!.right)).toBe(true);
			}
		});

		it('parses \\exponentialE^{2x} as e^(2x)', () => {
			const result = parseLatexSafe('\\exponentialE^{2x}');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(isSuperscript(result.ast!)).toBe(true);
			if (isSuperscript(result.ast!)) {
				expect(isEulerConstant(result.ast!.base)).toBe(true);
				expect(result.ast!.superscript.type).toBe('multiplication');
			}
		});

		it('parses \\frac{1}{\\exponentialE}', () => {
			const result = parseLatexSafe('\\frac{1}{\\exponentialE}');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(result.ast!.type).toBe('division');
			if (result.ast!.type === 'division') {
				expect(isEulerConstant(result.ast!.denominator)).toBe(true);
			}
		});
	});
});
