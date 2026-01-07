/**
 * Cubic Solver Tests (Cardano's Formula)
 *
 * Tests for solving cubic equations ax³ + bx² + cx + d = 0.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { RelationNode } from '../../types';

// Helper to parse an equation
function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type}`);
	}
	return node;
}

// Helper to check if solutions contain expected values (by approximation)
function solutionsContainApprox(
	solutions: readonly { approximate?: number }[],
	expected: number,
	tolerance = 0.0001
): boolean {
	return solutions.some(
		(s) => s.approximate !== undefined && Math.abs(s.approximate - expected) < tolerance
	);
}

describe('Cubic Solver (Cardano)', () => {
	describe('Rational roots (factorable cubics)', () => {
		it('should solve x³ - 6x² + 11x - 6 = 0 -> x = 1, 2, 3', () => {
			const eq = parseEquation('x^3 - 6x^2 + 11x - 6 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.equationType).toBe('polynomial');
			expect(result.solutions).toHaveLength(3);

			// Check solutions contain 1, 2, 3
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 3)).toBe(true);
		});

		it('should solve x³ - 3x² + 3x - 1 = 0 -> x = 1 (triple root)', () => {
			const eq = parseEquation('x^3 - 3x^2 + 3x - 1 = 0');
			const result = solve(eq);

			// Triple root case
			expect(result.solutions.length).toBeGreaterThanOrEqual(1);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should solve x³ + x² - x - 1 = 0 -> x = 1, x = -1 (double)', () => {
			const eq = parseEquation('x^3 + x^2 - x - 1 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
		});

		it('should solve x³ - 1 = 0 -> x = 1', () => {
			const eq = parseEquation('x^3 - 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('1');
		});

		it('should solve x³ + 1 = 0 -> x = -1', () => {
			const eq = parseEquation('x^3 + 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-1');
		});
	});

	describe('One real root (Δ < 0)', () => {
		it('should solve x³ + x - 2 = 0 -> x = 1', () => {
			const eq = parseEquation('x^3 + x - 2 = 0');
			const result = solve(eq);

			// This has one real root: x = 1
			expect(result.solutions.length).toBeGreaterThanOrEqual(1);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should solve x³ - 2 = 0 -> x = ∛2 ≈ 1.26', () => {
			// This is a pure power equation, should use Phase 1 solver
			const eq = parseEquation('x^3 - 2 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(Math.cbrt(2), 4);
		});

		it('should solve x³ + 3x - 4 = 0 -> x = 1', () => {
			const eq = parseEquation('x^3 + 3x - 4 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(1);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should solve x³ - x - 6 = 0 -> x ≈ 2', () => {
			const eq = parseEquation('x^3 - x - 6 = 0');
			const result = solve(eq);

			// Real root is approximately 2
			expect(result.solutions.length).toBeGreaterThanOrEqual(1);
			expect(solutionsContainApprox(result.solutions, 2, 0.01)).toBe(true);
		});
	});

	describe('Three real roots (Δ > 0 - trigonometric form)', () => {
		it('should solve x³ - 7x + 6 = 0 -> x = 1, 2, -3', () => {
			const eq = parseEquation('x^3 - 7x + 6 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(3);

			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -3)).toBe(true);
		});

		it('should solve x³ - 3x = 0 -> x = 0, ±√3', () => {
			const eq = parseEquation('x^3 - 3x = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(3);

			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, Math.sqrt(3))).toBe(true);
			expect(solutionsContainApprox(result.solutions, -Math.sqrt(3))).toBe(true);
		});

		it('should solve x³ - 6x² + 9x = 0 -> x = 0, 3 (double)', () => {
			const eq = parseEquation('x^3 - 6x^2 + 9x = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 3)).toBe(true);
		});
	});

	describe('Non-monic cubics (a ≠ 1)', () => {
		it('should solve 2x³ - 6x² + 4x = 0 -> x = 0, 1, 2', () => {
			const eq = parseEquation('2x^3 - 6x^2 + 4x = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(3);

			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});

		it('should solve 3x³ - 3x = 0 -> x = 0, ±1', () => {
			const eq = parseEquation('3x^3 - 3x = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(3);

			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
		});
	});

	describe('Depressed cubics (b = 0)', () => {
		it('should solve x³ + 3x + 2 = 0 -> x ≈ -0.596', () => {
			const eq = parseEquation('x^3 + 3x + 2 = 0');
			const result = solve(eq);

			// One real root approximately -0.596
			expect(result.solutions.length).toBeGreaterThanOrEqual(1);
			// The real root is approximately -0.5961...
			const hasRoot = result.solutions.some(
				(s) => s.approximate !== undefined && Math.abs(s.approximate + 0.596) < 0.01
			);
			expect(hasRoot).toBe(true);
		});

		it('should solve x³ - 3x + 2 = 0 -> x = 1, 1, -2', () => {
			const eq = parseEquation('x^3 - 3x + 2 = 0');
			const result = solve(eq);

			// Has roots 1 (double) and -2
			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
		});
	});

	describe('Pedagogical steps', () => {
		it('should include identification step in detailed mode', () => {
			const eq = parseEquation('x^3 - 6x^2 + 11x - 6 = 0');
			const result = solve(eq, { verbosity: 'detailed' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps.some((s) => s.rule === 'identify-cubic')).toBe(true);
		});

		it('should explain discriminant computation', () => {
			const eq = parseEquation('x^3 + x - 2 = 0');
			const result = solve(eq, { verbosity: 'detailed' });

			expect(
				result.steps.some(
					(s) =>
						s.rule.includes('discriminant') ||
						s.description.includes('discriminant') ||
						s.description.includes('Δ')
				)
			).toBe(true);
		});
	});

	describe('Variable auto-detection', () => {
		it('should auto-detect variable y in y³ - y = 0', () => {
			const eq = parseEquation('y^3 - y = 0');
			const result = solve(eq);

			expect(result.variable).toBe('y');
			expect(result.solutions.length).toBe(3);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
		});

		it('should auto-detect variable t in t³ - 8 = 0', () => {
			const eq = parseEquation('t^3 - 8 = 0');
			const result = solve(eq);

			expect(result.variable).toBe('t');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('2');
		});
	});

	describe('Edge cases', () => {
		it('should handle x³ = 0 -> x = 0', () => {
			const eq = parseEquation('x^3 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});

		it('should handle x³ - x² = 0 -> x = 0, 1', () => {
			const eq = parseEquation('x^3 - x^2 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});
	});
});
