/**
 * Tests for algebraic identity transformations
 */

import { describe, it, expect } from 'vitest';
import type { MathNode } from '../../types';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import {
	TRANSFORM_DIFF_SQUARES_TO_PRODUCT,
	TRANSFORM_PERFECT_SQUARE_TRINOMIAL,
	TRANSFORM_SUM_CUBES_TO_PRODUCT,
	TRANSFORM_DIFF_CUBES_TO_PRODUCT,
	TRANSFORM_PRODUCT_TO_DIFF_SQUARES,
	TRANSFORM_EXPAND_SUM_SQUARED,
	TRANSFORM_EXPAND_DIFF_SQUARED,
	factorAlgebraic,
	expandAlgebraic
} from '../algebraic-identities';

// =============================================================================
// Helpers
// =============================================================================

/** Apply a single transform to a LaTeX string */
function applyTransform(
	latex: string,
	transform: (node: MathNode) => MathNode | null
): MathNode | null {
	const node = parseLatex(latex);
	return transform(node);
}

/** Assert that the transformed result matches expected LaTeX (via toLatex normalization) */
function expectTransformEquals(
	input: string,
	transform: (node: MathNode) => MathNode | null,
	expectedLatex: string
): void {
	const result = applyTransform(input, transform);
	expect(result).not.toBeNull();
	// Compare via toLatex to normalize structural differences (associativity, etc.)
	expect(toLatex(result!)).toBe(toLatex(parseLatex(expectedLatex)));
}

/** Assert that the transform returns null (no match) */
function expectTransformNull(input: string, transform: (node: MathNode) => MathNode | null): void {
	const result = applyTransform(input, transform);
	expect(result).toBeNull();
}

// =============================================================================
// Factoring: Difference of Squares
// =============================================================================

describe('Difference of squares: a² - b² → (a+b)(a-b)', () => {
	it('factors x² - y²', () => {
		expectTransformEquals('x^2-y^2', TRANSFORM_DIFF_SQUARES_TO_PRODUCT, '(x+y)(x-y)');
	});

	it('factors a² - b²', () => {
		expectTransformEquals('a^2-b^2', TRANSFORM_DIFF_SQUARES_TO_PRODUCT, '(a+b)(a-b)');
	});

	it('factors x² - 4 (numeric perfect square)', () => {
		expectTransformEquals('x^2-4', TRANSFORM_DIFF_SQUARES_TO_PRODUCT, '(x+2)(x-2)');
	});

	it('factors x² - 9 (numeric perfect square)', () => {
		expectTransformEquals('x^2-9', TRANSFORM_DIFF_SQUARES_TO_PRODUCT, '(x+3)(x-3)');
	});

	it('does not factor x² + y² (sum, not difference)', () => {
		expectTransformNull('x^2+y^2', TRANSFORM_DIFF_SQUARES_TO_PRODUCT);
	});

	it('does not factor x² - 3 (3 is not a perfect square)', () => {
		expectTransformNull('x^2-3', TRANSFORM_DIFF_SQUARES_TO_PRODUCT);
	});
});

// =============================================================================
// Factoring: Perfect Square Trinomial
// =============================================================================

describe('Perfect square trinomial: a² ± 2ab + b² → (a±b)²', () => {
	it('factors x² + 2xy + y² → (x+y)²', () => {
		expectTransformEquals('x^2+2xy+y^2', TRANSFORM_PERFECT_SQUARE_TRINOMIAL, '(x+y)^2');
	});

	it('factors x² - 2xy + y² → (x-y)²', () => {
		expectTransformEquals('x^2-2xy+y^2', TRANSFORM_PERFECT_SQUARE_TRINOMIAL, '(x-y)^2');
	});

	it('factors x² + 6x + 9 → (x+3)²', () => {
		expectTransformEquals('x^2+6x+9', TRANSFORM_PERFECT_SQUARE_TRINOMIAL, '(x+3)^2');
	});

	it('does not factor x² + 3x + 1 (not a perfect square)', () => {
		expectTransformNull('x^2+3x+1', TRANSFORM_PERFECT_SQUARE_TRINOMIAL);
	});

	it('does not factor x² + y² (only 2 terms)', () => {
		expectTransformNull('x^2+y^2', TRANSFORM_PERFECT_SQUARE_TRINOMIAL);
	});
});

// =============================================================================
// Factoring: Sum of Cubes
// =============================================================================

describe('Sum of cubes: a³ + b³ → (a+b)(a² - ab + b²)', () => {
	it('factors a³ + b³', () => {
		expectTransformEquals('a^3+b^3', TRANSFORM_SUM_CUBES_TO_PRODUCT, '(a+b)(a^2-ab+b^2)');
	});

	it('factors x³ + 8 (numeric perfect cube)', () => {
		// 8 = 2³, so x³ + 8 → (x+2)(x² - 2x + 4)
		expectTransformEquals('x^3+8', TRANSFORM_SUM_CUBES_TO_PRODUCT, '(x+2)(x^2-2x+4)');
	});

	it('does not factor a³ - b³ (that is difference of cubes)', () => {
		expectTransformNull('a^3-b^3', TRANSFORM_SUM_CUBES_TO_PRODUCT);
	});
});

// =============================================================================
// Factoring: Difference of Cubes
// =============================================================================

describe('Difference of cubes: a³ - b³ → (a-b)(a² + ab + b²)', () => {
	it('factors a³ - b³', () => {
		expectTransformEquals('a^3-b^3', TRANSFORM_DIFF_CUBES_TO_PRODUCT, '(a-b)(a^2+ab+b^2)');
	});

	it('factors x³ - 27 (numeric perfect cube)', () => {
		// 27 = 3³, so x³ - 27 → (x-3)(x² + 3x + 9)
		expectTransformEquals('x^3-27', TRANSFORM_DIFF_CUBES_TO_PRODUCT, '(x-3)(x^2+3x+9)');
	});

	it('does not factor a³ + b³ (that is sum of cubes)', () => {
		expectTransformNull('a^3+b^3', TRANSFORM_DIFF_CUBES_TO_PRODUCT);
	});
});

// =============================================================================
// Expanding: Product to Difference of Squares
// =============================================================================

describe('Expanding: (a+b)(a-b) → a² - b²', () => {
	it('expands (x+y)(x-y)', () => {
		expectTransformEquals('(x+y)(x-y)', TRANSFORM_PRODUCT_TO_DIFF_SQUARES, 'x^2-y^2');
	});

	it('expands (a+b)(a-b)', () => {
		expectTransformEquals('(a+b)(a-b)', TRANSFORM_PRODUCT_TO_DIFF_SQUARES, 'a^2-b^2');
	});
});

// =============================================================================
// Expanding: Sum Squared
// =============================================================================

describe('Expanding: (a+b)² → a² + 2ab + b²', () => {
	it('expands (a+b)²', () => {
		expectTransformEquals('(a+b)^2', TRANSFORM_EXPAND_SUM_SQUARED, 'a^2+2ab+b^2');
	});

	it('expands (x+y)²', () => {
		expectTransformEquals('(x+y)^2', TRANSFORM_EXPAND_SUM_SQUARED, 'x^2+2xy+y^2');
	});
});

// =============================================================================
// Expanding: Difference Squared
// =============================================================================

describe('Expanding: (a-b)² → a² - 2ab + b²', () => {
	it('expands (a-b)²', () => {
		expectTransformEquals('(a-b)^2', TRANSFORM_EXPAND_DIFF_SQUARED, 'a^2-2ab+b^2');
	});

	it('expands (x-y)²', () => {
		expectTransformEquals('(x-y)^2', TRANSFORM_EXPAND_DIFF_SQUARED, 'x^2-2xy+y^2');
	});
});

// =============================================================================
// Public API: factorAlgebraic
// =============================================================================

describe('factorAlgebraic', () => {
	it('factors x² - y² recursively', () => {
		const node = parseLatex('x^2-y^2');
		const result = factorAlgebraic(node);
		expect(result.changed).toBe(true);
		expect(result.appliedRules).toContain('diff-squares-to-product');
		expect(toLatex(result.result)).toBe(toLatex(parseLatex('(x+y)(x-y)')));
	});

	it('factors x² - 4 recursively', () => {
		const node = parseLatex('x^2-4');
		const result = factorAlgebraic(node);
		expect(result.changed).toBe(true);
		expect(toLatex(result.result)).toBe(toLatex(parseLatex('(x+2)(x-2)')));
	});

	it('reports changed=false when nothing factors', () => {
		const node = parseLatex('x+y');
		const result = factorAlgebraic(node);
		expect(result.changed).toBe(false);
	});
});

// =============================================================================
// Public API: expandAlgebraic
// =============================================================================

describe('expandAlgebraic', () => {
	it('expands (x+y)(x-y) recursively', () => {
		const node = parseLatex('(x+y)(x-y)');
		const result = expandAlgebraic(node);
		expect(result.changed).toBe(true);
		expect(result.appliedRules).toContain('product-to-diff-squares');
		expect(toLatex(result.result)).toBe(toLatex(parseLatex('x^2-y^2')));
	});

	it('expands (a+b)² recursively', () => {
		const node = parseLatex('(a+b)^2');
		const result = expandAlgebraic(node);
		expect(result.changed).toBe(true);
		expect(toLatex(result.result)).toBe(toLatex(parseLatex('a^2+2ab+b^2')));
	});

	it('expands (a-b)² recursively', () => {
		const node = parseLatex('(a-b)^2');
		const result = expandAlgebraic(node);
		expect(result.changed).toBe(true);
		expect(toLatex(result.result)).toBe(toLatex(parseLatex('a^2-2ab+b^2')));
	});

	it('reports changed=false when nothing expands', () => {
		const node = parseLatex('x+y');
		const result = expandAlgebraic(node);
		expect(result.changed).toBe(false);
	});
});
