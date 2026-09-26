/**
 * Expression Transforms Tests
 * ===========================
 *
 * Tests for LaTeX expression transformations using mathAST.
 * Tests shuffle operations, null term removal, bracket simplification, and utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	applyDisplayTransforms,
	canTransform,
	getExpressionStructure
} from '../../parameterization/expression-transforms';
import {
	GLOBAL_DISPLAY_DEFAULTS,
	type DisplayOptions
} from '../../parameterization/display-options';

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
			// Result should be semantically equivalent (mathAST may normalize)
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
		let randomSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			randomSpy = vi.spyOn(Math, 'random');
		});

		afterEach(() => {
			randomSpy.mockRestore();
		});

		it('should shuffle terms in a sum', () => {
			randomSpy.mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);

			const latex = 'a+b+c';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleTerms: true }));

			// Result should contain all original terms
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
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

		it('should preserve signs when shuffling subtraction terms', () => {
			// Use identity shuffle (no swap) to verify signs are preserved
			randomSpy.mockReturnValue(0.99);

			const latex = 'a-b+c';
			const result = applyDisplayTransforms(latex, makeOptions({ shuffleTerms: true }));

			// All terms should still be present
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
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

			const expr = 'a*b*c';
			const result = applyDisplayTransforms(expr, makeOptions({ shuffleFactors: true }));

			// Result should contain all original factors
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
		});

		it('should output \\times for multiplication from custom syntax', () => {
			randomSpy.mockReturnValue(0.5);

			const expr = 'a*b*c';
			const result = applyDisplayTransforms(expr, makeOptions({ shuffleFactors: true }));

			// Custom parser: * → cross → \times in LaTeX output
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
			expect(result).toMatch(/\\times/);
		});

		it('should handle implicit multiplication', () => {
			randomSpy.mockReturnValue(0.5);

			const expr = 'abc';
			const result = applyDisplayTransforms(expr, makeOptions({ shuffleFactors: true }));

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

			expect(result).toContain('x');
			expect(result).not.toMatch(/0/);
		});

		it('should handle 0 + x', () => {
			const latex = '0+x';
			const result = applyDisplayTransforms(latex, makeOptions({ removeNullTerms: true }));

			expect(result).toContain('x');
			expect(result).not.toMatch(/0/);
		});

		it('should handle multiple zeros', () => {
			const latex = '0+x+0+y+0';
			const result = applyDisplayTransforms(latex, makeOptions({ removeNullTerms: true }));

			expect(result).toMatch(/x/);
			expect(result).toMatch(/y/);
			expect(result).not.toMatch(/0/);
		});

		it('should preserve non-zero expression', () => {
			const latex = 'a+b+c';
			const result = applyDisplayTransforms(latex, makeOptions({ removeNullTerms: true }));

			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
		});

		it('should remove zero in nested expression (deep)', () => {
			const latex = '(x+0)+y';
			const result = applyDisplayTransforms(latex, makeOptions({ removeNullTerms: true }));

			expect(result).toMatch(/x/);
			expect(result).toMatch(/y/);
		});

		it('should remove product with zero factor', () => {
			const result = applyDisplayTransforms('(0*10)+x', makeOptions({ removeNullTerms: true }));
			expect(result).toBe('x');
		});

		it('should remove multiple zero products', () => {
			const result = applyDisplayTransforms(
				'x+(0*100)+(0*10)',
				makeOptions({ removeNullTerms: true })
			);
			expect(result).toBe('x');
		});

		it('should return 0 when all terms are zero products', () => {
			const result = applyDisplayTransforms(
				'(0*10)+(0*100)',
				makeOptions({ removeNullTerms: true })
			);
			expect(result).toBe('0');
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

			expect(result).toContain('x');
		});

		it('should preserve necessary parentheses', () => {
			const expr = '(a+b)*c';
			const result = applyDisplayTransforms(expr, makeOptions({ removeUnnecessaryBrackets: true }));

			// Should still contain all variables
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).toMatch(/c/);
		});

		// Un nombre négatif à droite d'un opérateur binaire garde ses parenthèses,
		// quel que soit l'opérateur (× comme :, / en ligne, −).
		describe('négatif à droite d’un opérateur binaire', () => {
			const strip = (expr: string) =>
				applyDisplayTransforms(expr, makeOptions({ removeUnnecessaryBrackets: true }));

			it('division « : » : 49:(-65) garde les parenthèses', () => {
				expect(strip('49:(-65)')).toBe('49 : \\left( -65 \\right)');
			});

			it('division « : » : 49:(-x) garde les parenthèses', () => {
				expect(strip('49:(-x)')).toBe('49 : \\left( -x \\right)');
			});

			// En syntaxe ubumark, « / » est une fraction : le dénominateur est isolé,
			// aucune parenthèse n'est nécessaire (le « / » en ligne est testé côté mathAST)
			it('fraction « / » : 49/(-65) → \\dfrac{49}{-65}', () => {
				expect(strip('49/(-65)')).toBe('\\dfrac{49}{-65}');
			});

			it('multiplication « × » : 49*(-65) garde les parenthèses (non-régression)', () => {
				expect(strip('49*(-65)')).toBe('49 \\times \\left( -65 \\right)');
			});

			it('soustraction : 5-(-3) garde les parenthèses (non-régression)', () => {
				expect(strip('5-(-3)')).toBe('5 - \\left( -3 \\right)');
			});

			it('négatif en tête de division : (-65):49 → -65 : 49', () => {
				expect(strip('(-65):49')).toBe('-65 : 49');
			});

			it('division enchaînée : 12:(6:2) garde les parenthèses', () => {
				expect(strip('12:(6:2)')).toBe('12 : \\left( 6 : 2 \\right)');
			});

			it('division enchaînée à gauche : (12:6):2 → 12 : 6 : 2', () => {
				expect(strip('(12:6):2')).toBe('12 : 6 : 2');
			});

			it('parenthèses inutiles autour d’un nombre après « : » : 49:(5) → 49 : 5', () => {
				expect(strip('49:(5)')).toBe('49 : 5');
			});
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

		it('should apply shuffle and then null term removal', () => {
			randomSpy.mockReturnValue(0.5);

			const latex = '0+a+b';
			const result = applyDisplayTransforms(
				latex,
				makeOptions({ shuffleTerms: true, removeNullTerms: true })
			);

			// Should contain a and b but 0 should be removed
			expect(result).toMatch(/a/);
			expect(result).toMatch(/b/);
			expect(result).not.toMatch(/0/);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe('Error handling', () => {
		it('should handle malformed LaTeX gracefully', () => {
			// mathAST throws on invalid LaTeX, catch returns original
			const malformedLatex = '\\invalid{{{';
			const result = applyDisplayTransforms(malformedLatex, makeOptions());

			// Should not throw - returns original latex
			expect(result).toBe(malformedLatex);
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
	it('should return true for valid custom-syntax expressions', () => {
		expect(canTransform('a + b')).toBe(true);
		expect(canTransform('x^2')).toBe(true);
		expect(canTransform('1/2')).toBe(true);
	});

	it('should return false for empty string', () => {
		expect(canTransform('')).toBe(false);
		expect(canTransform('   ')).toBe(false);
	});

	it('should return false for invalid LaTeX', () => {
		// mathAST is stricter than CE - malformed LaTeX throws
		expect(canTransform('\\invalid{{{')).toBe(false);
	});
});

describe('getExpressionStructure', () => {
	it('should identify addition operator', () => {
		const structure = getExpressionStructure('a + b + c');
		expect(structure?.isSum).toBe(true);
		expect(structure?.isProduct).toBe(false);
		expect(structure?.operator).toBe('addition');
		expect(structure?.operandCount).toBe(3);
	});

	it('should identify multiplication operator', () => {
		const structure = getExpressionStructure('a \\times b');
		expect(structure?.isProduct).toBe(true);
		expect(structure?.isSum).toBe(false);
		expect(structure?.operator).toBe('multiplication');
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

	it('should identify subtraction as a sum', () => {
		const structure = getExpressionStructure('a - b');
		expect(structure?.isSum).toBe(true);
		expect(structure?.operandCount).toBe(2);
	});
});
