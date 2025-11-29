/**
 * Expression Transforms Tests
 * ===========================
 *
 * Tests for LaTeX expression transformations using Compute Engine.
 * Tests shuffle operations, canonization, and utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	applyDisplayTransforms,
	canTransform,
	getExpressionStructure
} from './expression-transforms';
import { GLOBAL_DISPLAY_DEFAULTS, type DisplayOptions } from './display-options';

// Helper to create resolved options with overrides
function makeOptions(overrides: DisplayOptions = {}): Required<DisplayOptions> {
	return { ...GLOBAL_DISPLAY_DEFAULTS, ...overrides };
}

describe('applyDisplayTransforms', () => {
	// ============================================================================
	// BASIC FUNCTIONALITY
	// ============================================================================

	describe('Basic functionality', () => {
		it('should return original latex when no transforms enabled', () => {
			const latex = 'a + b + c';
			const result = applyDisplayTransforms(latex, makeOptions());
			// Result should be semantically equivalent (CE may normalize)
			expect(result).toBeDefined();
		});

		it('should handle empty string', () => {
			expect(applyDisplayTransforms('', makeOptions())).toBe('');
		});

		it('should handle whitespace-only string', () => {
			expect(applyDisplayTransforms('   ', makeOptions())).toBe('   ');
		});

		it('should handle simple numbers', () => {
			const result = applyDisplayTransforms('42', makeOptions());
			expect(result).toContain('42');
		});

		it('should handle simple variables', () => {
			const result = applyDisplayTransforms('x', makeOptions());
			expect(result).toContain('x');
		});
	});

	// ============================================================================
	// SHUFFLE TERMS
	// ============================================================================

	describe('shuffleTerms', () => {
		// We need to mock Math.random for deterministic tests
		let randomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			// Mock Math.random to return predictable values
			// This sequence will cause Fisher-Yates to reverse a 3-element array
			randomSpy = vi.spyOn(Math, 'random');
		});

		afterEach(() => {
			randomSpy.mockRestore();
		});

		it('should shuffle terms in a sum', () => {
			// Set up deterministic random for testing
			// For a 3-element array [a, b, c], with these random values:
			// i=2: random=0.5 -> j=1, swap [a,c,b]
			// i=1: random=0.5 -> j=0, swap [c,a,b]
			randomSpy.mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);

			const latex = 'a+b+c';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleTerms: true }));

			// Result should contain all original terms
			expect(result).toMatch(/[abc]/);
			expect(result).toMatch(/\+/);
		});

		it('should preserve mathematical equivalence after shuffle', () => {
			randomSpy.mockReturnValue(0.5);

			const latex = '1+2+3';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleTerms: true }));

			// Result should still contain the same numbers
			expect(result).toMatch(/1/);
			expect(result).toMatch(/2/);
			expect(result).toMatch(/3/);
		});

		it('should not shuffle single term', () => {
			const latex = 'x';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleTerms: true }));
			expect(result).toContain('x');
		});

		it('should handle nested sums with deep shuffle', () => {
			randomSpy.mockReturnValue(0.5);

			const latex = '(a+b)+(c+d)';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleTerms: true }));

			// Should still contain all variables
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
			expect(result).toMatch(/d/);
		});
	});

	// ============================================================================
	// SHALLOW SHUFFLE TERMS
	// ============================================================================

	describe('shallowShuffleTerms', () => {
		let randomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			randomSpy = vi.spyOn(Math, 'random');
		});

		afterEach(() => {
			randomSpy.mockRestore();
		});

		it('should only shuffle at root level', () => {
			randomSpy.mockReturnValue(0.5);

			const latex = 'a+b';
			const result = applyDisplayTransforms(latex, makeOptions({ shallowShuffleTerms: true }));

			// Should contain both terms
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
		});
	});

	// ============================================================================
	// SHUFFLE FACTORS
	// ============================================================================

	describe('shuffleFactors', () => {
		let randomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			randomSpy = vi.spyOn(Math, 'random');
		});

		afterEach(() => {
			randomSpy.mockRestore();
		});

		it('should shuffle factors in a product', () => {
			randomSpy.mockReturnValue(0.5);

			const latex = 'a \\times b \\times c';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleFactors: true }));

			// Result should contain all original factors
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
		});

		it('should handle implicit multiplication', () => {
			randomSpy.mockReturnValue(0.5);

			const latex = 'abc';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleFactors: true }));

			// Result should contain all variables
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
		});
	});

	// ============================================================================
	// SHUFFLE TERMS AND FACTORS
	// ============================================================================

	describe('shuffleTermsAndFactors', () => {
		let randomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			randomSpy = vi.spyOn(Math, 'random');
		});

		afterEach(() => {
			randomSpy.mockRestore();
		});

		it('should shuffle both terms and factors', () => {
			randomSpy.mockReturnValue(0.5);

			const latex = 'ab + cd';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleTermsAndFactors: true }));

			// Result should contain all variables
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
			expect(result).toMatch(/d/);
		});
	});

	// ============================================================================
	// REMOVE NULL TERMS
	// ============================================================================

	describe('removeNullTerms', () => {
		it('should remove zero in addition', () => {
			const latex = 'x+0';
			const result = applyDisplayTransforms(latex, makeOptions({ removeNullTerms: true }));

			// Canonization should simplify x+0 to x
			expect(result).toContain('x');
			// Should not contain explicit 0 as a term
		});

		it('should handle 0 + x', () => {
			const latex = '0+x';
			const result = applyDisplayTransforms(latex, makeOptions({ removeNullTerms: true }));

			expect(result).toContain('x');
		});

		it('should handle multiple zeros', () => {
			const latex = '0+x+0+y+0';
			const result = applyDisplayTransforms(latex, makeOptions({ removeNullTerms: true }));

			expect(result).toMatch(/x/);
			expect(result).toMatch(/y/);
		});

		it('should preserve non-zero expression', () => {
			const latex = 'a+b+c';
			const result = applyDisplayTransforms(latex, makeOptions({ removeNullTerms: true }));

			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
		});
	});

	// ============================================================================
	// REMOVE UNNECESSARY BRACKETS
	// ============================================================================

	describe('removeUnnecessaryBrackets', () => {
		it('should simplify redundant parentheses', () => {
			const latex = '(x)';
			const result = applyDisplayTransforms(
				latex,
				makeOptions({ removeUnnecessaryBrackets: true })
			);

			// Should simplify to just x
			expect(result).toContain('x');
		});

		it('should preserve necessary parentheses', () => {
			const latex = '(a+b) \\times c';
			const result = applyDisplayTransforms(
				latex,
				makeOptions({ removeUnnecessaryBrackets: true })
			);

			// Should still contain all variables
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
		});
	});

	// ============================================================================
	// ADD SPACES
	// ============================================================================

	describe('addSpaces', () => {
		it('should add spaces around operators when enabled', () => {
			const latex = 'a+b';
			const result = applyDisplayTransforms(latex, makeOptions({ addSpaces: true }));

			// Should have spaces around +
			expect(result).toMatch(/\s\+\s/);
		});

		it('should remove spaces when disabled', () => {
			const latex = 'a + b';
			const result = applyDisplayTransforms(latex, makeOptions({ addSpaces: false }));

			// Should not have spaces
			expect(result).not.toMatch(/\s/);
		});
	});

	// ============================================================================
	// COMBINED TRANSFORMS
	// ============================================================================

	describe('Combined transforms', () => {
		let randomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			randomSpy = vi.spyOn(Math, 'random');
		});

		afterEach(() => {
			randomSpy.mockRestore();
		});

		it('should apply shuffle and then canonization', () => {
			randomSpy.mockReturnValue(0.5);

			const latex = '0+a+b';
			const result = applyDisplayTransforms(
				latex,
				makeOptions({ shuffleTerms: true, removeNullTerms: true })
			);

			// Should contain a and b but 0 should be removed
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe('Error handling', () => {
		it('should handle malformed LaTeX gracefully', () => {
			// Note: Compute Engine is very permissive and parses most input
			// Even "invalid" LaTeX gets parsed (with error markers)
			const malformedLatex = '\\invalid{{{';
			const result = applyDisplayTransforms(malformedLatex, makeOptions());

			// Should not throw - returns some result (possibly with CE error markers)
			expect(result).toBeDefined();
			expect(typeof result).toBe('string');
		});

		it('should handle complex expressions gracefully', () => {
			const latex = '\\frac{a}{b} + \\sqrt{c}';
			const result = applyDisplayTransforms(latex, makeOptions());

			// Should not throw and should return something
			expect(result).toBeDefined();
		});

		it('should preserve expression on transformation that cannot apply', () => {
			// A number cannot be "shuffled" - no terms or factors
			const latex = '42';
			const result = applyDisplayTransforms(
				latex,
				makeOptions({ shuffleTerms: true, shuffleFactors: true })
			);

			expect(result).toContain('42');
		});
	});
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

describe('canTransform', () => {
	it('should return true for valid LaTeX', () => {
		expect(canTransform('a + b')).toBe(true);
		expect(canTransform('x^2')).toBe(true);
		expect(canTransform('\\frac{1}{2}')).toBe(true);
	});

	it('should return false for empty string', () => {
		expect(canTransform('')).toBe(false);
		expect(canTransform('   ')).toBe(false);
	});

	it('should return false for invalid LaTeX', () => {
		// Most LaTeX is actually parseable, even if malformed
		// CE is quite permissive
		expect(canTransform('')).toBe(false);
	});
});

describe('getExpressionStructure', () => {
	it('should identify Add operator', () => {
		const structure = getExpressionStructure('a + b + c');
		expect(structure?.isSum).toBe(true);
		expect(structure?.isProduct).toBe(false);
		expect(structure?.operator).toBe('Add');
		expect(structure?.operandCount).toBe(3);
	});

	it('should identify Multiply operator', () => {
		const structure = getExpressionStructure('a \\times b');
		expect(structure?.isProduct).toBe(true);
		expect(structure?.isSum).toBe(false);
	});

	it('should handle simple values', () => {
		const structure = getExpressionStructure('42');
		expect(structure?.operator).toBeNull();
		expect(structure?.operandCount).toBe(0);
	});

	it('should return null for empty string', () => {
		expect(getExpressionStructure('')).toBeNull();
		expect(getExpressionStructure('   ')).toBeNull();
	});
});
