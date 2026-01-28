/**
 * Test that both LaTeX and Custom parsers support the same limited set of Greek letters
 * and that π is properly handled as a MathConstant (not a Greek letter).
 */

import { describe, it, expect } from 'vitest';
import { parsePratt as parseLatex } from '../latex/parser-pratt';
import { parseCustomPratt as parseCustom } from '../custom/parser-pratt';

describe('Greek letter support - harmonization between parsers', () => {
	// Note: 'pi' is NOT a Greek letter - it's a MathConstant
	const SUPPORTED_GREEK = ['alpha', 'beta', 'gamma', 'theta'];
	const UNSUPPORTED_GREEK = ['omega', 'sigma', 'delta', 'epsilon', 'lambda', 'mu', 'nu'];

	describe('LaTeX parser', () => {
		it.each(SUPPORTED_GREEK)('should accept supported Greek letter \\%s', (letter) => {
			const result = parseLatex(`\\${letter}`);
			expect(result).toBeTruthy();
			expect(result.type).toBe('greek');
			if (result.type === 'greek') {
				expect(result.letter).toBe(letter);
			}
		});

		it('should parse \\pi as MathConstant, not Greek letter', () => {
			const result = parseLatex('\\pi');
			expect(result.type).toBe('constant');
			if (result.type === 'constant') {
				expect(result.constant).toBe('pi');
			}
		});

		it.each(UNSUPPORTED_GREEK)('should reject unsupported Greek letter \\%s', (letter) => {
			expect(() => parseLatex(`\\${letter}`)).toThrow(/Unknown command/);
		});
	});

	describe('Custom parser', () => {
		it.each(SUPPORTED_GREEK)('should accept supported Greek letter \\%s', (letter) => {
			const result = parseCustom(`\\${letter}`);
			expect(result).toBeTruthy();
			expect(result.type).toBe('greek');
			if (result.type === 'greek') {
				expect(result.letter).toBe(letter);
			}
		});

		it('should parse \\pi as MathConstant, not Greek letter', () => {
			const result = parseCustom('\\pi');
			expect(result.type).toBe('constant');
			if (result.type === 'constant') {
				expect(result.constant).toBe('pi');
			}
		});

		it.each(UNSUPPORTED_GREEK)('should reject unsupported Greek letter \\%s', (letter) => {
			// Custom parser should fail to parse unsupported Greek
			// The tokenizer will create BACKSLASH + LETTER tokens, not SYMBOL
			expect(() => parseCustom(`\\${letter}`)).toThrow(/Invalid backslash sequence/);
		});
	});

	describe('Harmonization', () => {
		it('should have both parsers support exactly the same Greek letters', () => {
			// Both parsers should support the same set
			for (const letter of SUPPORTED_GREEK) {
				const latexResult = parseLatex(`\\${letter}`);
				const customResult = parseCustom(`\\${letter}`);

				expect(latexResult.type).toBe('greek');
				expect(customResult.type).toBe('greek');

				if (latexResult.type === 'greek' && customResult.type === 'greek') {
					expect(latexResult.letter).toBe(customResult.letter);
				}
			}
		});

		it('should have both parsers treat \\pi as MathConstant', () => {
			const latexResult = parseLatex('\\pi');
			const customResult = parseCustom('\\pi');

			expect(latexResult.type).toBe('constant');
			expect(customResult.type).toBe('constant');

			if (latexResult.type === 'constant' && customResult.type === 'constant') {
				expect(latexResult.constant).toBe('pi');
				expect(customResult.constant).toBe('pi');
			}
		});
	});
});
