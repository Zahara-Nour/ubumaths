/**
 * Tests for complex fraction rationalization in normalize
 *
 * Verifies that fractions with complex denominators are reduced to the form a+bi.
 * For example: 1/i → -i, 1/(1+i) → (1-i)/2, (2+3i)/(1-i) → (-1+5i)/2
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { normalize } from '../normalize';
import { denormalize } from '../denormalize';

/**
 * Helper to simplify an expression via normalize/denormalize
 */
function simplify(input: string): string {
	const node = parseLatex(input);
	const normalForm = normalize(node);
	const simplified = denormalize(normalForm);
	return toLatex(simplified);
}

/**
 * Helper to normalize LaTeX output for comparison (removes spaces, normalizes i)
 */
function normalizeLatex(latex: string): string {
	return latex
		.replace(/\\imaginaryI/g, 'i')
		.replace(/\\dfrac/g, '\\frac')
		.replace(/\s+/g, '');
}

/**
 * Helper to compare LaTeX expressions for equivalence
 */
function expectLatex(actual: string, ...expected: string[]): void {
	const normalizedActual = normalizeLatex(actual);
	const normalizedExpected = expected.map(normalizeLatex);
	expect(normalizedExpected).toContain(normalizedActual);
}

describe('Complex fraction rationalization', () => {
	describe('Simple cases: 1/i', () => {
		it('reduces 1/i to -i', () => {
			expectLatex(simplify('\\frac{1}{i}'), '-i');
		});

		it('reduces 2/i to -2i', () => {
			expectLatex(simplify('\\frac{2}{i}'), '-2i');
		});

		it('reduces -1/i to i', () => {
			expectLatex(simplify('\\frac{-1}{i}'), 'i');
		});

		it('reduces i/i to 1', () => {
			expect(simplify('\\frac{i}{i}')).toBe('1');
		});
	});

	describe('Binomial complex denominators: 1/(a+bi)', () => {
		it('reduces 1/(1+i) to (1-i)/2', () => {
			// 1/(1+i) × (1-i)/(1-i) = (1-i)/(1+1) = (1-i)/2 = 1/2 - i/2
			expectLatex(
				simplify('\\frac{1}{1+i}'),
				'\\frac{1}{2}-\\frac{1}{2}i',
				'\\frac{1}{2}-\\frac{i}{2}',
				'\\frac{1-i}{2}'
			);
		});

		it('reduces 1/(1-i) to (1+i)/2', () => {
			expectLatex(
				simplify('\\frac{1}{1-i}'),
				'\\frac{1}{2}+\\frac{1}{2}i',
				'\\frac{1}{2}+\\frac{i}{2}',
				'\\frac{1+i}{2}'
			);
		});

		it('reduces 2/(1+i) to 1-i', () => {
			// 2/(1+i) × (1-i)/(1-i) = 2(1-i)/2 = 1-i
			expectLatex(simplify('\\frac{2}{1+i}'), '1-i');
		});

		it('reduces 1/(2+i) to (2-i)/5', () => {
			// 1/(2+i) × (2-i)/(2-i) = (2-i)/(4+1) = (2-i)/5
			expectLatex(
				simplify('\\frac{1}{2+i}'),
				'\\frac{2}{5}-\\frac{1}{5}i',
				'\\frac{2}{5}-\\frac{i}{5}',
				'\\frac{2-i}{5}'
			);
		});
	});

	describe('Complex numerator and denominator', () => {
		it('reduces (1+i)/(1-i) to i', () => {
			// (1+i)/(1-i) × (1+i)/(1+i) = (1+i)²/2 = (1+2i-1)/2 = 2i/2 = i
			expectLatex(simplify('\\frac{1+i}{1-i}'), 'i');
		});

		it('reduces (1-i)/(1+i) to -i', () => {
			expectLatex(simplify('\\frac{1-i}{1+i}'), '-i');
		});

		it('reduces (2+3i)/(1-i) to -1/2 + 5/2 i', () => {
			// (2+3i)/(1-i) × (1+i)/(1+i) = (2+3i)(1+i)/2
			// = (2+2i+3i+3i²)/2 = (2+5i-3)/2 = (-1+5i)/2
			expectLatex(
				simplify('\\frac{2+3i}{1-i}'),
				'-\\frac{1}{2}+\\frac{5}{2}i',
				'-\\frac{1}{2}+\\frac{5i}{2}',
				'\\frac{-1+5i}{2}'
			);
		});

		it('reduces (3+4i)/(3-4i) to complex form', () => {
			// (3+4i)/(3-4i) × (3+4i)/(3+4i) = (3+4i)²/(9+16)
			// = (9+24i-16)/25 = (-7+24i)/25
			expectLatex(
				simplify('\\frac{3+4i}{3-4i}'),
				'-\\frac{7}{25}+\\frac{24}{25}i',
				'-\\frac{7}{25}+\\frac{24i}{25}',
				'\\frac{-7+24i}{25}'
			);
		});
	});

	describe('Pure imaginary denominators', () => {
		it('reduces 1/(2i) to -i/2', () => {
			expectLatex(simplify('\\frac{1}{2i}'), '-\\frac{1}{2}i', '-\\frac{i}{2}', '\\frac{-i}{2}');
		});

		it('reduces i/(2i) to 1/2', () => {
			expectLatex(simplify('\\frac{i}{2i}'), '\\frac{1}{2}');
		});

		it('reduces (1+i)/(2i) to 1/2 - i/2', () => {
			// (1+i)/(2i) × (-i)/(-i) = (1+i)(-i)/2 = (-i-i²)/2 = (-i+1)/2 = (1-i)/2
			expectLatex(
				simplify('\\frac{1+i}{2i}'),
				'\\frac{1}{2}-\\frac{1}{2}i',
				'\\frac{1}{2}-\\frac{i}{2}',
				'\\frac{1-i}{2}'
			);
		});
	});

	describe('With radicals and complex', () => {
		it('reduces sqrt(2)/i to -sqrt(2)i', () => {
			expectLatex(simplify('\\frac{\\sqrt{2}}{i}'), '-\\sqrt{2}i');
		});

		it('reduces 1/(sqrt(2)+i) to (sqrt(2)-i)/3', () => {
			// 1/(√2+i) × (√2-i)/(√2-i) = (√2-i)/(2+1) = (√2-i)/3
			expectLatex(
				simplify('\\frac{1}{\\sqrt{2}+i}'),
				'\\frac{\\sqrt{2}}{3}-\\frac{1}{3}i',
				'\\frac{\\sqrt{2}}{3}-\\frac{i}{3}',
				'\\frac{\\sqrt{2}-i}{3}',
				'\\frac{1}{3}\\sqrt{2}-\\frac{1}{3}i'
			);
		});
	});

	describe('Edge cases', () => {
		it('handles i² = -1 in denominator', () => {
			// i² = -1, so 1/i² = 1/(-1) = -1
			expect(simplify('\\frac{1}{i^2}')).toBe('-1');
		});

		it('handles (i+1)(i-1) = i²-1 = -2 in denominator', () => {
			// (i+1)(i-1) = i²-1 = -1-1 = -2
			expect(simplify('\\frac{2}{(i+1)(i-1)}')).toBe('-1');
		});

		it('preserves real denominators unchanged', () => {
			expectLatex(
				simplify('\\frac{1+i}{2}'),
				'\\frac{1}{2}+\\frac{1}{2}i',
				'\\frac{1}{2}+\\frac{i}{2}',
				'\\frac{1+i}{2}'
			);
		});
	});
});
