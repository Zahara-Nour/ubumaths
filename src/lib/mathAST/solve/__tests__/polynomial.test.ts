/**
 * Polynomial Solver Tests (x^n = k form)
 *
 * Tests for solving power equations using nth roots.
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

describe('Polynomial Solver (x^n = k)', () => {
	describe('Odd exponents (single real solution)', () => {
		it('should solve x^3 = 8 -> x = 2', () => {
			const eq = parseEquation('x^3 = 8');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.equationType).toBe('polynomial');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('2');
			expect(result.solutions[0].exact).toBe(true);
		});

		it('should solve x^3 = 27 -> x = 3', () => {
			const eq = parseEquation('x^3 = 27');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('3');
			expect(result.solutions[0].exact).toBe(true);
		});

		it('should solve x^3 = -8 -> x = -2', () => {
			const eq = parseEquation('x^3 = -8');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-2');
			expect(result.solutions[0].exact).toBe(true);
		});

		it('should solve x^3 = -27 -> x = -3', () => {
			const eq = parseEquation('x^3 = -27');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-3');
		});

		it('should solve x^5 = 32 -> x = 2', () => {
			const eq = parseEquation('x^5 = 32');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('2');
		});

		it('should solve x^5 = -32 -> x = -2', () => {
			const eq = parseEquation('x^5 = -32');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-2');
		});

		it('should return symbolic root for x^3 = 2', () => {
			const eq = parseEquation('x^3 = 2');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].exact).toBe(true);
			expect(result.solutions[0].approximate).toBeCloseTo(Math.cbrt(2), 5);
		});
	});

	describe('Even exponents with positive k (two solutions)', () => {
		it('should solve x^4 = 16 -> x = 2, x = -2', () => {
			const eq = parseEquation('x^4 = 16');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.equationType).toBe('polynomial');
			expect(result.solutions).toHaveLength(2);

			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('-2');
			expect(values).toContain('2');
		});

		it('should solve x^4 = 81 -> x = 3, x = -3', () => {
			const eq = parseEquation('x^4 = 81');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);

			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('-3');
			expect(values).toContain('3');
		});

		it('should solve x^6 = 64 -> x = 2, x = -2', () => {
			const eq = parseEquation('x^6 = 64');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);

			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('-2');
			expect(values).toContain('2');
		});

		it('should return symbolic roots for x^4 = 3', () => {
			const eq = parseEquation('x^4 = 3');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
			// Both solutions should have approximations
			const approxValues = result.solutions
				.map((s) => s.approximate)
				.sort((a, b) => (a ?? 0) - (b ?? 0));
			expect(approxValues[0]).toBeCloseTo(-Math.pow(3, 0.25), 5);
			expect(approxValues[1]).toBeCloseTo(Math.pow(3, 0.25), 5);
		});
	});

	describe('Even exponents with negative k (no real solution)', () => {
		it('should detect no real solution for x^4 = -16', () => {
			const eq = parseEquation('x^4 = -16');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should detect no real solution for x^6 = -1', () => {
			const eq = parseEquation('x^6 = -1');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should detect no real solution for x^4 = -81', () => {
			const eq = parseEquation('x^4 = -81');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});
	});

	describe('k = 0 (unique solution x = 0)', () => {
		it('should solve x^3 = 0 -> x = 0', () => {
			const eq = parseEquation('x^3 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
			expect(result.solutions[0].approximate).toBe(0);
		});

		it('should solve x^4 = 0 -> x = 0', () => {
			const eq = parseEquation('x^4 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});

		it('should solve x^5 = 0 -> x = 0', () => {
			const eq = parseEquation('x^5 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});
	});

	describe('Exact simplification', () => {
		it('should simplify cbrt(1) to 1', () => {
			const eq = parseEquation('x^3 = 1');
			const result = solve(eq);

			expect(result.solutions[0].exact).toBe(true);
			expect(toLatex(result.solutions[0].value)).toBe('1');
		});

		it('should simplify cbrt(-1) to -1', () => {
			const eq = parseEquation('x^3 = -1');
			const result = solve(eq);

			expect(result.solutions[0].exact).toBe(true);
			expect(toLatex(result.solutions[0].value)).toBe('-1');
		});

		it('should simplify 4th root of 1 exactly', () => {
			const eq = parseEquation('x^4 = 1');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('-1');
			expect(values).toContain('1');
		});
	});

	describe('Pedagogical steps', () => {
		it('should include identification step in detailed mode', () => {
			const eq = parseEquation('x^3 = 8');
			const result = solve(eq, { verbosity: 'detailed' });

			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps.some((s) => s.rule === 'identify-power-equation')).toBe(true);
		});

		it('should explain root extraction', () => {
			const eq = parseEquation('x^4 = 16');
			const result = solve(eq, { verbosity: 'detailed' });

			expect(result.steps.some((s) => s.description.includes('racine'))).toBe(true);
		});

		it('should have fewer steps in summarized mode', () => {
			const eq = parseEquation('x^3 = 27');
			const detailed = solve(eq, { verbosity: 'detailed' });
			const summarized = solve(eq, { verbosity: 'summarized' });

			expect(summarized.steps.length).toBeLessThanOrEqual(detailed.steps.length);
		});
	});

	describe('Variable auto-detection', () => {
		it('should auto-detect variable y in y^3 = 27', () => {
			const eq = parseEquation('y^3 = 27');
			const result = solve(eq);

			expect(result.variable).toBe('y');
			expect(result.status).toBe('unique');
			expect(toLatex(result.solutions[0].value)).toBe('3');
		});

		it('should auto-detect variable t in t^4 = 16', () => {
			const eq = parseEquation('t^4 = 16');
			const result = solve(eq);

			expect(result.variable).toBe('t');
			expect(result.status).toBe('multiple');
		});
	});

	describe('Edge cases', () => {
		it('should handle x^3 = 1000 -> x = 10', () => {
			const eq = parseEquation('x^3 = 1000');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(toLatex(result.solutions[0].value)).toBe('10');
		});

		it('should handle large perfect powers x^3 = 125 -> x = 5', () => {
			const eq = parseEquation('x^3 = 125');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(toLatex(result.solutions[0].value)).toBe('5');
		});
	});
});
