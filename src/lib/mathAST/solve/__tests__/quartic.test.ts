/**
 * Quartic Solver Tests
 *
 * Tests for solving quartic equations ax⁴ + bx³ + cx² + dx + e = 0.
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
	tolerance = 0.001
): boolean {
	return solutions.some(
		(s) => s.approximate !== undefined && Math.abs(s.approximate - expected) < tolerance
	);
}

describe('Quartic Solver', () => {
	describe('Biquadratic (ax⁴ + cx² + e = 0)', () => {
		it('should solve x⁴ - 5x² + 4 = 0 -> x = ±1, ±2', () => {
			const eq = parseEquation('x^4 - 5x^2 + 4 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.equationType).toBe('polynomial');
			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});

		it('should solve x⁴ - 13x² + 36 = 0 -> x = ±2, ±3', () => {
			const eq = parseEquation('x^4 - 13x^2 + 36 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -3)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 3)).toBe(true);
		});

		it('should solve x⁴ - x² = 0 -> x = 0, ±1', () => {
			const eq = parseEquation('x^4 - x^2 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(3);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should solve x⁴ - 2x² + 1 = 0 -> x = ±1 (double roots)', () => {
			const eq = parseEquation('x^4 - 2x^2 + 1 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should detect no real solution for x⁴ + x² + 1 = 0', () => {
			const eq = parseEquation('x^4 + x^2 + 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should solve non-monic 2x⁴ - 10x² + 8 = 0 -> x = ±1, ±2', () => {
			const eq = parseEquation('2x^4 - 10x^2 + 8 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});
	});

	describe('Common factor (e = 0): x(ax³ + bx² + cx + d) = 0', () => {
		it('should solve x⁴ - 6x³ + 11x² - 6x = 0 -> x = 0, 1, 2, 3', () => {
			const eq = parseEquation('x^4 - 6x^3 + 11x^2 - 6x = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(4);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 3)).toBe(true);
		});

		it('should solve x⁴ - x = 0 -> x = 0, 1', () => {
			const eq = parseEquation('x^4 - x = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should solve x⁴ + x³ = 0 -> x = 0, -1', () => {
			const eq = parseEquation('x^4 + x^3 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 0)).toBe(true);
		});
	});

	describe('General quartic (Ferrari)', () => {
		it('should solve x⁴ + 2x³ - 7x² - 8x + 12 = 0 -> x = 1, -3, 2, -2', () => {
			const eq = parseEquation('x^4 + 2x^3 - 7x^2 - 8x + 12 = 0');
			const result = solve(eq);

			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -3)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});

		it('should solve x⁴ - 4x³ + 6x² - 4x + 1 = 0 -> x = 1 (quadruple root)', () => {
			const eq = parseEquation('x^4 - 4x^3 + 6x^2 - 4x + 1 = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBeGreaterThanOrEqual(1);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
		});

		it('should solve x⁴ - 10x² + 9 = 0 -> x = ±1, ±3 (also biquadratic)', () => {
			const eq = parseEquation('x^4 - 10x^2 + 9 = 0');
			const result = solve(eq);

			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -3)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 3)).toBe(true);
		});
	});

	describe('Pure power (x⁴ = k)', () => {
		it('should still solve x⁴ = 16 -> x = ±2', () => {
			const eq = parseEquation('x^4 = 16');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('-2');
			expect(values).toContain('2');
		});

		it('should still solve x⁴ = 0 -> x = 0', () => {
			const eq = parseEquation('x^4 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});
	});

	describe('Variable auto-detection', () => {
		it('should auto-detect variable y', () => {
			const eq = parseEquation('y^4 - 5y^2 + 4 = 0');
			const result = solve(eq);

			expect(result.variable).toBe('y');
			expect(result.solutions).toHaveLength(4);
		});

		it('should auto-detect variable t', () => {
			const eq = parseEquation('t^4 - t = 0');
			const result = solve(eq);

			expect(result.variable).toBe('t');
			expect(result.solutions.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('Negative leading coefficient', () => {
		it('should solve -x⁴ + 5x² - 4 = 0 -> x = ±1, ±2', () => {
			const eq = parseEquation('-x^4 + 5x^2 - 4 = 0');
			const result = solve(eq);

			expect(result.solutions).toHaveLength(4);
			expect(solutionsContainApprox(result.solutions, -2)).toBe(true);
			expect(solutionsContainApprox(result.solutions, -1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 1)).toBe(true);
			expect(solutionsContainApprox(result.solutions, 2)).toBe(true);
		});
	});

	describe('Pedagogical steps', () => {
		it('should include identification step in detailed mode', () => {
			const eq = parseEquation('x^4 - 5x^2 + 4 = 0');
			const result = solve(eq, { verbosity: 'detailed' });

			expect(result.steps.length).toBeGreaterThan(0);
			const hasQuarticStep = result.steps.some(
				(s) => s.rule === 'identify-quartic' || s.rule === 'identify-biquadratic'
			);
			expect(hasQuarticStep).toBe(true);
		});

		it('should have fewer steps in summarized mode', () => {
			const eq = parseEquation('x^4 - 5x^2 + 4 = 0');
			const detailed = solve(eq, { verbosity: 'detailed' });
			const summarized = solve(eq, { verbosity: 'summarized' });

			expect(summarized.steps.length).toBeLessThanOrEqual(detailed.steps.length);
		});
	});
});
