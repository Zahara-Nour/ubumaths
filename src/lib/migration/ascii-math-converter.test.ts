import { describe, it, expect } from 'vitest';
import {
	convertAsciiMathToLatexSafe,
	containsAsciiMath,
	convertAsciiMathBatch
} from './ascii-math-converter';

/**
 * Helper function to test successful conversion
 */
function expectConversion(input: string, expected: string) {
	const result = convertAsciiMathToLatexSafe(input);
	expect(result.success).toBe(true);
	expect(result.converted).toBe(expected);
}

/**
 * Helper function to test conversion contains specific patterns
 */
function expectConversionContains(input: string, ...patterns: string[]) {
	const result = convertAsciiMathToLatexSafe(input);
	expect(result.success).toBe(true);
	for (const pattern of patterns) {
		expect(result.converted).toContain(pattern);
	}
}

/**
 * Helper function to test conversion with placeholder count
 */
function expectConversionWithPlaceholders(
	input: string,
	expected: string,
	expectedPlaceholders: number
) {
	const result = convertAsciiMathToLatexSafe(input);
	expect(result.success).toBe(true);
	expect(result.converted).toBe(expected);
	expect(result.placeholdersPreserved).toBe(expectedPlaceholders);
}

describe('AsciiMath to LaTeX Converter', () => {
	describe('1. Basic AsciiMath Conversions', () => {
		// Note: MathLive's AsciiMath converter doesn't convert all patterns to LaTeX equivalents
		// It preserves simple fractions like a/b and focuses on more complex patterns

		it('should convert sqrt', () => {
			// MathLive converts sqrt(x) to \sqrt{x}
			expectConversionContains('sqrt(x)', '\\sqrt');
			expectConversionContains('sqrt(4)', '\\sqrt');
		});

		it('should convert powers', () => {
			expectConversion('x^2', 'x^{2}');
			expectConversion('a^n', 'a^{n}');
			expectConversion('2^10', '2^{10}');
		});

		it('should convert subscripts', () => {
			expectConversion('x_1', 'x_{1}');
			expectConversion('a_i', 'a_{i}');
			expectConversion('x_n', 'x_{n}');
		});

		it('should convert combined power and subscript', () => {
			expectConversion('x_i^2', 'x_{i}^{2}');
		});

		it('should convert sum and product', () => {
			// MathLive may add trailing space
			expectConversionContains('sum', '\\sum');
			expectConversionContains('prod', '\\prod');
		});

		it('should convert integrals', () => {
			expectConversionContains('int', '\\int');
		});

		it('should convert trigonometric functions', () => {
			// MathLive uses \left( and \right) for function arguments
			expectConversionContains('sin(x)', '\\sin');
			expectConversionContains('cos(x)', '\\cos');
			expectConversionContains('tan(x)', '\\tan');
		});

		it('should convert logarithms', () => {
			expectConversionContains('log(x)', '\\log');
			expectConversionContains('ln(x)', '\\ln');
		});

		it('should convert Greek letters', () => {
			expectConversionContains('alpha', '\\alpha');
			expectConversionContains('beta', '\\beta');
			expectConversionContains('pi', '\\pi');
			expectConversionContains('theta', '\\theta');
		});

		it('should convert infinity', () => {
			expectConversionContains('oo', '\\infty');
		});

		it('should convert abs', () => {
			// MathLive uses \left| and \right|
			expectConversionContains('abs(x)', '|');
		});
	});

	describe('2. Placeholder Preservation', () => {
		it('should preserve simple placeholder', () => {
			expectConversionWithPlaceholders('{{a}}', '{{a}}', 1);
			expectConversionWithPlaceholders('{{b}}', '{{b}}', 1);
		});

		it('should preserve multiple placeholders', () => {
			const result = convertAsciiMathToLatexSafe('{{a}} + {{b}}');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('{{a}}');
			expect(result.converted).toContain('{{b}}');
			expect(result.placeholdersPreserved).toBe(2);
		});

		it('should preserve range placeholders', () => {
			expectConversionWithPlaceholders('{{1..10}}', '{{1..10}}', 1);
			expectConversionWithPlaceholders('{{0..99}}', '{{0..99}}', 1);
		});

		it('should preserve eval placeholders', () => {
			expectConversionWithPlaceholders('{{eval:a+b}}', '{{eval:a+b}}', 1);
			expectConversionWithPlaceholders('{{eval:2*x}}', '{{eval:2*x}}', 1);
		});

		it('should preserve complex placeholders', () => {
			expectConversionWithPlaceholders('{{1..10!a}}', '{{1..10!a}}', 1);
			expectConversionWithPlaceholders(
				'{{if:a>0|positif|negatif}}',
				'{{if:a>0|positif|negatif}}',
				1
			);
		});
	});

	describe('3. AsciiMath with Placeholders', () => {
		it('should convert sqrt with placeholder', () => {
			const result = convertAsciiMathToLatexSafe('sqrt({{a}})');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('\\sqrt');
			expect(result.converted).toContain('{{a}}');
			expect(result.placeholdersPreserved).toBe(1);
		});

		it('should convert power with placeholder', () => {
			const result = convertAsciiMathToLatexSafe('{{a}}^2');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('{{a}}');
			expect(result.converted).toContain('^{2}');
			expect(result.placeholdersPreserved).toBe(1);
		});

		it('should preserve placeholders in expressions', () => {
			const result = convertAsciiMathToLatexSafe('{{a}}^2 + {{b}}^2');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('{{a}}');
			expect(result.converted).toContain('{{b}}');
			expect(result.placeholdersPreserved).toBe(2);
		});

		it('should preserve placeholder in division', () => {
			// MathLive doesn't convert a/b to \frac{a}{b}
			const result = convertAsciiMathToLatexSafe('{{a}}/{{b}}');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('{{a}}');
			expect(result.converted).toContain('{{b}}');
			expect(result.placeholdersPreserved).toBe(2);
		});

		it('should handle placeholder with subscript', () => {
			// This is tricky because _ followed by placeholder
			const result = convertAsciiMathToLatexSafe('x_{{i}}');
			expect(result.success).toBe(true);
			// Check that the placeholder is preserved somehow
			expect(result.placeholdersPreserved).toBe(1);
		});
	});

	describe('4. Edge Cases', () => {
		it('should handle empty string', () => {
			const result = convertAsciiMathToLatexSafe('');
			expect(result.success).toBe(true);
			expect(result.converted).toBe('');
			expect(result.placeholdersPreserved).toBe(0);
		});

		it('should handle whitespace only', () => {
			const result = convertAsciiMathToLatexSafe('   ');
			expect(result.success).toBe(true);
			expect(result.converted).toBe('   ');
		});

		it('should pass through existing LaTeX', () => {
			const result = convertAsciiMathToLatexSafe('\\frac{1}{2}');
			expect(result.success).toBe(true);
			// The result should still be valid LaTeX
			expect(result.converted).toContain('frac');
		});

		it('should handle simple arithmetic', () => {
			// MathLive may remove spaces
			const result = convertAsciiMathToLatexSafe('2 + 3');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('2');
			expect(result.converted).toContain('3');
		});

		it('should handle multiplication', () => {
			const result = convertAsciiMathToLatexSafe('2 * 3');
			expect(result.success).toBe(true);
		});

		it('should handle placeholder only expressions', () => {
			const result = convertAsciiMathToLatexSafe('{{solution}}');
			expect(result.success).toBe(true);
			expect(result.converted).toBe('{{solution}}');
			expect(result.placeholdersPreserved).toBe(1);
		});

		it('should handle undefined input', () => {
			// @ts-expect-error testing undefined input
			const result = convertAsciiMathToLatexSafe(undefined);
			expect(result.success).toBe(true);
			expect(result.converted).toBe('');
		});

		it('should handle null input', () => {
			// @ts-expect-error testing null input
			const result = convertAsciiMathToLatexSafe(null);
			expect(result.success).toBe(true);
			expect(result.converted).toBe('');
		});
	});

	describe('5. containsAsciiMath detection', () => {
		it('should detect sqrt', () => {
			expect(containsAsciiMath('sqrt(x)')).toBe(true);
			expect(containsAsciiMath('sqrt(4)')).toBe(true);
		});

		it('should detect fractions', () => {
			expect(containsAsciiMath('a/b')).toBe(true);
			expect(containsAsciiMath('1/2')).toBe(true);
		});

		it('should detect powers without braces', () => {
			expect(containsAsciiMath('x^2')).toBe(true);
			expect(containsAsciiMath('a^n')).toBe(true);
		});

		it('should detect subscripts without braces', () => {
			expect(containsAsciiMath('x_1')).toBe(true);
			expect(containsAsciiMath('a_i')).toBe(true);
		});

		it('should detect trig functions', () => {
			expect(containsAsciiMath('sin(x)')).toBe(true);
			expect(containsAsciiMath('cos(theta)')).toBe(true);
		});

		it('should detect Greek letters', () => {
			expect(containsAsciiMath('alpha + beta')).toBe(true);
			expect(containsAsciiMath('pi * r^2')).toBe(true);
		});

		it('should return false for empty/null', () => {
			expect(containsAsciiMath('')).toBe(false);
			expect(containsAsciiMath(null as unknown as string)).toBe(false);
		});

		it('should return false for simple arithmetic without AsciiMath', () => {
			// Simple + and - without specific patterns
			expect(containsAsciiMath('2 + 3')).toBe(false);
		});
	});

	describe('6. Batch conversion', () => {
		it('should convert multiple expressions', () => {
			const inputs = ['sqrt(x)', '{{a}} + {{b}}'];
			const results = convertAsciiMathBatch(inputs);

			expect(results.length).toBe(2);
			expect(results[0].converted).toContain('\\sqrt');
			expect(results[1].placeholdersPreserved).toBe(2);
		});

		it('should handle empty array', () => {
			const results = convertAsciiMathBatch([]);
			expect(results.length).toBe(0);
		});
	});

	describe('7. Real-world question expressions', () => {
		it('should preserve placeholders in addition expression', () => {
			const result = convertAsciiMathToLatexSafe('{{a}} + {{b}}');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('{{a}}');
			expect(result.converted).toContain('{{b}}');
		});

		it('should preserve placeholders in division', () => {
			const result = convertAsciiMathToLatexSafe('{{a}}/{{b}}');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('{{a}}');
			expect(result.converted).toContain('{{b}}');
		});

		it('should convert Pythagorean theorem expression', () => {
			const result = convertAsciiMathToLatexSafe('sqrt({{a}}^2 + {{b}}^2)');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('sqrt');
			expect(result.placeholdersPreserved).toBe(2);
		});

		it('should convert area formula', () => {
			const result = convertAsciiMathToLatexSafe('pi * {{r}}^2');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('\\pi');
			expect(result.placeholdersPreserved).toBe(1);
		});

		it('should handle simple addition without placeholders', () => {
			const result = convertAsciiMathToLatexSafe('2 + 3');
			expect(result.success).toBe(true);
		});

		it('should convert variable expression with multiplication', () => {
			const result = convertAsciiMathToLatexSafe('{{a}} * {{b}}');
			expect(result.success).toBe(true);
			expect(result.converted).toContain('{{a}}');
			expect(result.converted).toContain('{{b}}');
		});
	});
});
