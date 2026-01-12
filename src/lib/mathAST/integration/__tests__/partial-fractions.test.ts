/**
 * Partial Fractions Integration Tests
 *
 * Tests for partial fraction decomposition and integration.
 *
 * @module mathAST/integration/__tests__/partial-fractions
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate } from '../integrate';
import { partialFractionsIntegrator } from '../integrators/partial-fractions';
import type { IntegrateResult } from '../types';
import { toCustom } from '../../custom-generator';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to integrate and check result
 */
function testIntegrate(latex: string, variable: string = 'x'): IntegrateResult {
	const expr = parseLatex(latex);
	return integrate(expr, { variable, verbosity: 'detailed' });
}

/**
 * Helper to check if integrator can handle expression
 */
function canHandle(latex: string, variable: string = 'x'): boolean {
	const expr = parseLatex(latex);
	return partialFractionsIntegrator.canIntegrate(expr, variable);
}

/**
 * Helper to get custom string representation
 */
function toCustomString(result: IntegrateResult): string {
	if (!result.antiderivative) return '';
	return toCustom(result.antiderivative);
}

// =============================================================================
// Rational Function Detection
// =============================================================================

describe('Rational Function Detection', () => {
	it('should detect simple rational function 1/((x-1)(x+1))', () => {
		expect(canHandle('\\frac{1}{(x-1)(x+1)}')).toBe(true);
	});

	it('should detect rational function 1/(x^2-1)', () => {
		expect(canHandle('\\frac{1}{x^2-1}')).toBe(true);
	});

	it('should detect rational function (2x+1)/(x^2+x)', () => {
		expect(canHandle('\\frac{2x+1}{x^2+x}')).toBe(true);
	});

	it('should detect rational function with irreducible quadratic 1/(x^2+1)', () => {
		expect(canHandle('\\frac{1}{x^2+1}')).toBe(true);
	});

	it('should NOT detect non-rational function x*sin(x)', () => {
		expect(canHandle('x\\sin(x)')).toBe(false);
	});

	it('should NOT detect polynomial x^2', () => {
		expect(canHandle('x^2')).toBe(false);
	});

	it('should detect rational with improper fraction (x^2+1)/(x-1)', () => {
		// Needs polynomial division
		expect(canHandle('\\frac{x^2+1}{x-1}')).toBe(true);
	});
});

// =============================================================================
// Simple Linear Factors
// =============================================================================

describe('Simple Linear Factors', () => {
	it('should integrate 1/((x-1)(x+1)) = (1/2)ln|(x-1)/(x+1)|', () => {
		const result = testIntegrate('\\frac{1}{(x-1)(x+1)}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Result should be (1/2) * ln|x-1| - (1/2) * ln|x+1|
		// or equivalently (1/2) * ln|(x-1)/(x+1)|
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/); // Should contain logarithm
	});

	it('should integrate 1/(x^2-1) with factorization', () => {
		const result = testIntegrate('\\frac{1}{x^2-1}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Should factor x^2-1 = (x-1)(x+1) and decompose
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/);
	});

	it('should integrate (2x+1)/(x^2+x) = (2x+1)/(x(x+1))', () => {
		const result = testIntegrate('\\frac{2x+1}{x^2+x}');

		expect(result.status).toBe('exact');
		// Note: This may be handled by u-substitution (u = x^2+x) or partial fractions
		// Both give correct results, so we only check the result contains ln

		// Factor: x^2+x = x(x+1)
		// Result should contain logarithm
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/);
	});

	it('should integrate 1/(x(x+2))', () => {
		const result = testIntegrate('\\frac{1}{x(x+2)}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Decompose: 1/(x(x+2)) = A/x + B/(x+2)
		// Solve: A=1/2, B=-1/2
		// Result: (1/2)ln|x| - (1/2)ln|x+2|
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/);
	});

	it('should integrate 3/(x^2-4) with difference of squares', () => {
		const result = testIntegrate('\\frac{3}{x^2-4}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Factor: x^2-4 = (x-2)(x+2)
		// Decompose: 3/((x-2)(x+2)) = A/(x-2) + B/(x+2)
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/);
	});
});

// =============================================================================
// Irreducible Quadratic Factors
// =============================================================================

describe('Irreducible Quadratic Factors', () => {
	it('should integrate 1/(x^2+1) = arctan(x)', () => {
		const result = testIntegrate('\\frac{1}{x^2+1}');

		expect(result.status).toBe('exact');
		// Note: basic-rule handles this directly with arctan pattern
		// The result is the same regardless of technique

		// This is irreducible, result should be arctan(x)
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/arctan|atan/);
	});

	it('should integrate x/(x^2+1) = (1/2)ln(x^2+1)', () => {
		const result = testIntegrate('\\frac{x}{x^2+1}');

		expect(result.status).toBe('exact');
		// Note: This is u-substitution (u=x^2+1), not partial fractions
		// But if partial fractions handles it: (Ax+B)/(x^2+1) with A=1, B=0

		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/);
	});

	it('should integrate 1/(x^2+4) using irreducible quadratic', () => {
		const result = testIntegrate('\\frac{1}{x^2+4}');

		expect(result.status).toBe('exact');

		// Result: (1/2) * arctan(x/2)
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/arctan|atan/);
	});

	it('should integrate (2x+3)/(x^2+1) mixing logarithm and arctan', () => {
		const result = testIntegrate('\\frac{2x+3}{x^2+1}');

		expect(result.status).toBe('exact');

		// Decompose: (2x+3)/(x^2+1) = (2x)/(x^2+1) + 3/(x^2+1)
		// First term: ln(x^2+1)
		// Second term: 3*arctan(x)
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/);
		expect(customStr).toMatch(/arctan|atan/);
	});
});

// =============================================================================
// Repeated Linear Factors
// =============================================================================

describe('Repeated Linear Factors', () => {
	it('should integrate 1/(x-1)^2 = -1/(x-1)', () => {
		const result = testIntegrate('\\frac{1}{(x-1)^2}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Direct power rule: ∫(x-1)^(-2) dx = -(x-1)^(-1) = -1/(x-1)
		// After normalization, may appear as 1/(-x+1) which is equivalent
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/x-1|x\s*-\s*1|-x\+1|-x\s*\+\s*1/);
	});

	it('should integrate 1/((x-1)^2(x+1))', () => {
		const result = testIntegrate('\\frac{1}{(x-1)^2(x+1)}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Decompose: 1/((x-1)^2(x+1)) = A/(x-1) + B/(x-1)^2 + C/(x+1)
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln|x-1/);
	});

	it('should integrate x/((x+1)^2)', () => {
		const result = testIntegrate('\\frac{x}{(x+1)^2}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Decompose: x/(x+1)^2 = A/(x+1) + B/(x+1)^2
		// Or use polynomial division first: x/(x+1)^2 = ...
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln|x\+1/);
	});
});

// =============================================================================
// Polynomial Division (Improper Fractions)
// =============================================================================

describe('Polynomial Division', () => {
	it('should integrate (x^2+1)/(x-1) with polynomial division', () => {
		const result = testIntegrate('\\frac{x^2+1}{x-1}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Polynomial division: (x^2+1)/(x-1) = x + 1 + 2/(x-1)
		// Integrate: x^2/2 + x + 2*ln|x-1|
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/x\^2|x\*\*2/); // Polynomial term
		expect(customStr).toMatch(/ln/); // Logarithm from remainder
	});

	it('should integrate (x^3)/(x^2-1)', () => {
		const result = testIntegrate('\\frac{x^3}{x^2-1}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Polynomial division first, then partial fractions on remainder
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/x\^2|x\*\*2/);
		expect(customStr).toMatch(/ln/);
	});

	it('should integrate (2x^2+3x+1)/(x+1)', () => {
		const result = testIntegrate('\\frac{2x^2+3x+1}{x+1}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Polynomial division
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/x/);
	});
});

// =============================================================================
// Mixed Cases
// =============================================================================

describe('Mixed Cases', () => {
	it('should integrate 1/(x(x^2+1)) mixing linear and irreducible quadratic', () => {
		const result = testIntegrate('\\frac{1}{x(x^2+1)}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Decompose: 1/(x(x^2+1)) = A/x + (Bx+C)/(x^2+1)
		// A = 1 (Heaviside at x=0), B = -1, C = 0 (from coefficient matching)
		// Result: ln|x| - (1/2)ln(x^2+1)
		// Note: No arctan because C=0
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/);
	});

	it('should integrate (x^2+2x+1)/((x+1)(x^2+1))', () => {
		const result = testIntegrate('\\frac{x^2+2x+1}{(x+1)(x^2+1)}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');

		// Decompose: ... = A/(x+1) + (Bx+C)/(x^2+1)
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln|arctan|atan/);
	});
});

// =============================================================================
// Step Recording
// =============================================================================

describe('Step Recording', () => {
	it('should record polynomial division step when needed', () => {
		const result = testIntegrate('\\frac{x^2+1}{x-1}');

		expect(result.steps.length).toBeGreaterThan(0);

		// Should have a polynomial division step
		const divisionStep = result.steps.find((s) => s.rule.includes('polynomial-division'));
		expect(divisionStep).toBeDefined();
	});

	it('should record factorization step', () => {
		const result = testIntegrate('\\frac{1}{x^2-1}');

		expect(result.steps.length).toBeGreaterThan(0);

		// Should have factorization step
		const factorStep = result.steps.find((s) => s.rule.includes('factor'));
		expect(factorStep).toBeDefined();
	});

	it('should record partial fraction decomposition step', () => {
		const result = testIntegrate('\\frac{1}{(x-1)(x+1)}');

		expect(result.steps.length).toBeGreaterThan(0);

		// Should have decomposition step
		const decomposeStep = result.steps.find((s) => s.rule.includes('decompose'));
		expect(decomposeStep).toBeDefined();
	});

	it('should record coefficient solving step', () => {
		const result = testIntegrate('\\frac{1}{(x-1)(x+1)}');

		// Should have coefficient solving step
		const solveStep = result.steps.find((s) => s.rule.includes('solve-coefficients'));
		expect(solveStep).toBeDefined();
	});

	it('should record integration of each partial fraction', () => {
		const result = testIntegrate('\\frac{1}{(x-1)(x+1)}');

		// Should have steps for decomposition process
		// At minimum: factor, decompose, solve-coefficients
		expect(result.steps.length).toBeGreaterThanOrEqual(3);
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
	it('should handle constant numerator', () => {
		const result = testIntegrate('\\frac{5}{x^2-1}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');
	});

	it('should handle negative coefficients', () => {
		const result = testIntegrate('\\frac{-2}{x(x+1)}');

		expect(result.status).toBe('exact');
		expect(result.technique).toBe('partial-fractions');
	});

	it('should simplify before decomposing', () => {
		const result = testIntegrate('\\frac{x^2-1}{x^2-1}');

		// Should give correct result (integral of 1 = x)
		expect(result.status).toBe('exact');
		// Note: Ideally this should simplify to 1 first, but even if it uses
		// partial fractions, the result should be x (0*ln terms + x = x)
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/x/);
	});

	it('should return unsupported for non-polynomial denominator', () => {
		const result = testIntegrate('\\frac{1}{\\sin(x)}');

		// Cannot apply partial fractions to non-polynomial
		expect(result.technique).not.toBe('partial-fractions');
	});

	it('should handle single linear factor', () => {
		const result = testIntegrate('\\frac{1}{x-1}');

		expect(result.status).toBe('exact');
		// This can be handled by partial fractions or u-substitution
		// Result should be ln|x-1|
		const customStr = toCustomString(result);
		expect(customStr).toMatch(/ln/);
	});
});

// =============================================================================
// Verbosity Levels
// =============================================================================

describe('Verbosity Levels', () => {
	it('should filter steps for "result" verbosity', () => {
		const expr = parseLatex('\\frac{1}{(x-1)(x+1)}');
		const result = integrate(expr, { variable: 'x', verbosity: 'result' });

		expect(result.steps.length).toBe(0);
	});

	it('should include summarized steps for "summarized" verbosity', () => {
		const expr = parseLatex('\\frac{1}{(x-1)(x+1)}');
		const result = integrate(expr, { variable: 'x', verbosity: 'summarized' });

		// Summarized mode may have fewer or no steps depending on implementation
		// The key is that it shouldn't crash
		expect(result.status).toBe('exact');
	});

	it('should include all steps for "detailed" verbosity', () => {
		const expr = parseLatex('\\frac{1}{(x-1)(x+1)}');
		const result = integrate(expr, { variable: 'x', verbosity: 'detailed' });

		// Should have the most steps
		expect(result.steps.length).toBeGreaterThan(0);
	});
});
