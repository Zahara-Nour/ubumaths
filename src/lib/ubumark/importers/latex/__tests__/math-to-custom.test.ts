/**
 * Tests for Math to Custom Syntax Converter
 *
 * Tests the conversion of LaTeX math expressions to mathAST custom syntax.
 */

import { describe, it, expect } from 'vitest';
import {
	convertMathToCustomSyntax,
	SUPPORTED_GREEK,
	SUPPORTED_SYMBOLS
} from '../converters/math-to-custom';
import type { ConversionContext, TranspileWarning } from '../types';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Creates a minimal ConversionContext for testing
 */
function createTestContext(): ConversionContext {
	const warnings: TranspileWarning[] = [];
	return {
		indentLevel: 0,
		listStack: [],
		inListItem: false,
		inTable: false,
		inMath: false,
		inVerbatim: false,
		environmentStack: [],
		options: {
			preserveComments: false,
			mathDelimiters: 'dollar',
			maxNestingDepth: 10,
			fallbackToText: false,
			preserveWhitespace: false,
			lineOffset: 0
		},
		warnings,
		addWarning: (warning, line?, column?) => {
			warnings.push({ ...warning, line, column });
		}
	};
}

// =============================================================================
// Basic Conversion Tests
// =============================================================================

describe('convertMathToCustomSyntax', () => {
	describe('simple expressions', () => {
		it('converts simple variable', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x');
			expect(ctx.warnings).toHaveLength(0);
		});

		it('converts simple number', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('42', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('42');
		});

		it('converts addition', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x + y', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x+y');
		});

		it('converts subtraction', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x - y', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x-y');
		});

		it('converts power', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x^2', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x^2');
		});

		it('converts subscript', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x_1', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x_1');
		});

		it('converts polynomial', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x^2 + 3x - 5', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x^2+3x-5');
		});
	});

	describe('fractions', () => {
		it('converts simple fraction', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\frac{a}{b}', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('a/b');
		});

		it('converts fraction with complex numerator', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\frac{a+b}{c}', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('{a+b}/c');
		});

		it('converts fraction with complex denominator', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\frac{a}{b+c}', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('a/{b+c}');
		});

		it('converts fraction with both complex', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\frac{a+b}{c+d}', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('{a+b}/{c+d}');
		});
	});

	describe('functions', () => {
		it('converts sin', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\sin(x)', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('sin(x)');
		});

		it('converts cos', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\cos(x)', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('cos(x)');
		});

		it('converts sqrt', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\sqrt{x}', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('sqrt(x)');
		});

		it('converts log with base', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\log_2(x)', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('log_2(x)');
		});
	});

	describe('supported Greek letters', () => {
		it.each([...SUPPORTED_GREEK])('converts Greek letter: %s', (letter) => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax(`\\${letter}`, ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe(`\\${letter}`);
			expect(ctx.warnings).toHaveLength(0);
		});

		it('converts pi in expression', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\pi r^2', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('\\pir^2');
		});
	});

	describe('supported symbols', () => {
		it('converts infinity', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\infty', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('\\infty');
		});
	});

	describe('relations', () => {
		it('converts equals', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x = 5', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x=5');
		});

		it('converts less than', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x < 5', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x<5');
		});

		it('converts greater than or equal', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x \\geq 0', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x>=0');
		});
	});
});

// =============================================================================
// Fallback Tests (Unsupported Features)
// =============================================================================

describe('unsupported features fallback', () => {
	describe('unsupported Greek letters', () => {
		// Note: Unsupported Greek letters are rejected by the parser as unknown commands,
		// so they result in parse errors rather than being detected as Greek nodes.
		it('falls back for delta (parser rejects unknown Greek)', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\delta', ctx);

			expect(result.converted).toBe(false);
			expect(result.output).toBe('\\delta');
			expect(result.unsupportedFeatures).toHaveLength(1);
			// Parser treats unknown Greek as unknown command, so it's a parse error
			expect(result.unsupportedFeatures?.[0].category).toBe('parse-error');
			expect(ctx.warnings).toHaveLength(1);
			expect(ctx.warnings[0].type).toBe('unsupported-math-feature');
		});

		it('falls back for sigma (parser rejects unknown Greek)', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\sigma', ctx);

			expect(result.converted).toBe(false);
			expect(result.output).toBe('\\sigma');
			// Parser treats unknown Greek as unknown command
			expect(result.unsupportedFeatures?.[0].category).toBe('parse-error');
		});

		it('falls back for expression with unsupported Greek', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\delta x + y', ctx);

			expect(result.converted).toBe(false);
			expect(result.output).toBe('\\delta x + y');
		});
	});

	describe('unsupported symbols', () => {
		it('falls back for partial', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\partial', ctx);

			expect(result.converted).toBe(false);
			expect(result.output).toBe('\\partial');
			expect(result.unsupportedFeatures?.[0].category).toBe('symbol');
		});
	});

	describe('parse errors', () => {
		it('falls back for malformed LaTeX', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x^{', ctx);

			expect(result.converted).toBe(false);
			expect(result.output).toBe('x^{');
			expect(result.unsupportedFeatures?.[0].category).toBe('parse-error');
			expect(ctx.warnings).toHaveLength(1);
		});
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
	it('handles empty input', () => {
		const ctx = createTestContext();
		const result = convertMathToCustomSyntax('', ctx);

		expect(result.converted).toBe(true);
		expect(result.output).toBe('');
	});

	it('handles whitespace-only input', () => {
		const ctx = createTestContext();
		const result = convertMathToCustomSyntax('   ', ctx);

		expect(result.converted).toBe(true);
		expect(result.output).toBe('');
	});

	it('handles parentheses', () => {
		const ctx = createTestContext();
		const result = convertMathToCustomSyntax('(x + y)', ctx);

		expect(result.converted).toBe(true);
		expect(result.output).toBe('(x+y)');
	});

	it('handles nested parentheses', () => {
		const ctx = createTestContext();
		const result = convertMathToCustomSyntax('((x + y) \\cdot z)', ctx);

		expect(result.converted).toBe(true);
		expect(result.output).toContain('(x+y)');
	});

	it('handles negative numbers', () => {
		const ctx = createTestContext();
		const result = convertMathToCustomSyntax('-5', ctx);

		expect(result.converted).toBe(true);
		expect(result.output).toBe('-5');
	});

	it('handles decimal numbers', () => {
		const ctx = createTestContext();
		const result = convertMathToCustomSyntax('3.14', ctx);

		expect(result.converted).toBe(true);
		expect(result.output).toBe('3.14');
	});
});

// =============================================================================
// Preprocessing Tests
// =============================================================================

describe('preprocessing', () => {
	describe('numprint (\\np) command', () => {
		it('converts \\np{12345} to formatted number', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('S = \\np{12345}', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('S=12\u202F345');
		});

		it('converts \\np with decimal comma (preprocessing works even if parse fails)', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x = \\np{9,0001}', ctx);

			// Decimal comma is not valid math syntax, so conversion fails
			// But preprocessing should still replace \np (with decimal formatting)
			expect(result.output).toBe('x = 9,000\u202F1');
			expect(result.output).not.toContain('\\np');
		});

		it('converts \\np in subscript context (preprocessing works even if parse fails)', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('S_{40} = \\np{9,0001}', ctx);

			// Decimal comma causes parse failure but \np should be replaced (with decimal formatting)
			expect(result.output).toBe('S_{40} = 9,000\u202F1');
			expect(result.output).not.toContain('\\np');
		});

		it('converts multiple \\np commands', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('\\np{1000} + \\np{2000}', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('1\u202F000+2\u202F000');
		});

		it('handles \\np with spaces before brace', () => {
			const ctx = createTestContext();
			const result = convertMathToCustomSyntax('x = \\np {12345}', ctx);

			expect(result.converted).toBe(true);
			expect(result.output).toBe('x=12\u202F345');
		});
	});
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('SUPPORTED_GREEK', () => {
	it('contains exactly 5 letters', () => {
		expect(SUPPORTED_GREEK.size).toBe(5);
	});

	it('contains pi, alpha, beta, gamma, theta', () => {
		expect(SUPPORTED_GREEK.has('pi')).toBe(true);
		expect(SUPPORTED_GREEK.has('alpha')).toBe(true);
		expect(SUPPORTED_GREEK.has('beta')).toBe(true);
		expect(SUPPORTED_GREEK.has('gamma')).toBe(true);
		expect(SUPPORTED_GREEK.has('theta')).toBe(true);
	});

	it('does not contain delta', () => {
		// Cast to test unsupported letter - TypeScript only allows GreekLetter type
		expect(SUPPORTED_GREEK.has('delta' as 'pi')).toBe(false);
	});
});

describe('SUPPORTED_SYMBOLS', () => {
	it('contains infinity', () => {
		expect(SUPPORTED_SYMBOLS.has('infinity')).toBe(true);
	});

	it('does not contain partial', () => {
		expect(SUPPORTED_SYMBOLS.has('partial')).toBe(false);
	});
});
