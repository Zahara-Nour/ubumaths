/**
 * Quadratic Solver Tests
 *
 * Tests for solving quadratic equations ax^2 + bx + c = 0.
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

describe('Quadratic Solver', () => {
	describe('Two distinct real solutions (Delta > 0)', () => {
		it('should solve x^2 - 5x + 6 = 0 -> x = 2, x = 3', () => {
			const eq = parseEquation('x^2 - 5x + 6 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.equationType).toBe('quadratic');
			expect(result.solutions).toHaveLength(2);

			// Solutions should be 2 and 3 (order may vary)
			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('2');
			expect(values).toContain('3');
			expect(result.solutions.every((s) => s.exact)).toBe(true);
		});

		it('should solve x^2 - 4 = 0 -> x = -2, x = 2', () => {
			const eq = parseEquation('x^2 - 4 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);

			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('-2');
			expect(values).toContain('2');
		});

		it('should solve 2x^2 - 8x + 6 = 0 -> x = 1, x = 3', () => {
			const eq = parseEquation('2x^2 - 8x + 6 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);

			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('1');
			expect(values).toContain('3');
		});
	});

	describe('One double solution (Delta = 0)', () => {
		it('should solve x^2 - 4x + 4 = 0 -> x = 2', () => {
			const eq = parseEquation('x^2 - 4x + 4 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.equationType).toBe('quadratic');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('2');
			expect(result.solutions[0].exact).toBe(true);
		});

		it('should solve x^2 + 6x + 9 = 0 -> x = -3', () => {
			const eq = parseEquation('x^2 + 6x + 9 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-3');
		});

		it('should solve 4x^2 - 4x + 1 = 0 -> x = 1/2', () => {
			const eq = parseEquation('4x^2 - 4x + 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			// Solution is 1/2 (may be \frac or \dfrac)
			const solutionLatex = toLatex(result.solutions[0].value);
			expect(solutionLatex).toMatch(/\\d?frac\{1\}\{2\}|0[.,]5/);
		});
	});

	describe('No real solution (Delta < 0)', () => {
		it('should detect no real solution for x^2 + 1 = 0', () => {
			const eq = parseEquation('x^2 + 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.equationType).toBe('quadratic');
			expect(result.solutions).toHaveLength(0);
		});

		it('should detect no real solution for x^2 + x + 1 = 0', () => {
			const eq = parseEquation('x^2 + x + 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should detect no real solution for 2x^2 + 3x + 5 = 0', () => {
			const eq = parseEquation('2x^2 + 3x + 5 = 0');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});
	});

	describe('Irrational solutions (sqrt in solution)', () => {
		it('should solve x^2 - 2 = 0 -> x = sqrt(2), x = -sqrt(2)', () => {
			const eq = parseEquation('x^2 - 2 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
			expect(result.solutions.every((s) => s.exact)).toBe(true);

			// Check approximate values
			const approxValues = result.solutions
				.map((s) => s.approximate)
				.sort((a, b) => (a ?? 0) - (b ?? 0));
			expect(approxValues[0]).toBeCloseTo(-Math.sqrt(2), 5);
			expect(approxValues[1]).toBeCloseTo(Math.sqrt(2), 5);
		});

		it('should solve x^2 - 3x + 1 = 0 -> irrational solutions', () => {
			const eq = parseEquation('x^2 - 3x + 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);

			// Solutions are (3 +/- sqrt(5))/2
			// Approximate values: ~2.618 and ~0.382
			const approxValues = result.solutions
				.map((s) => s.approximate)
				.sort((a, b) => (a ?? 0) - (b ?? 0));
			expect(approxValues[0]).toBeCloseTo((3 - Math.sqrt(5)) / 2, 5);
			expect(approxValues[1]).toBeCloseTo((3 + Math.sqrt(5)) / 2, 5);
		});
	});

	describe('Special forms', () => {
		it('should solve x^2 = 9 -> x = -3, x = 3', () => {
			const eq = parseEquation('x^2 = 9');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);

			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('-3');
			expect(values).toContain('3');
		});

		it('should solve x^2 = 0 -> x = 0', () => {
			const eq = parseEquation('x^2 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});
	});

	describe('Discriminant in steps', () => {
		it('should include discriminant calculation in detailed steps', () => {
			const eq = parseEquation('x^2 - 5x + 6 = 0');
			const result = solve(eq, { verbosity: 'detailed' });

			// Should have step about discriminant
			expect(result.steps.some((s) => s.rule === 'compute-discriminant')).toBe(true);

			// Should have French description mentioning Delta
			const discriminantStep = result.steps.find((s) => s.rule === 'compute-discriminant');
			expect(discriminantStep?.description).toMatch(/discriminant|Delta/i);
		});

		it('should explain discriminant interpretation', () => {
			// Positive discriminant
			const eq1 = parseEquation('x^2 - 5x + 6 = 0');
			const result1 = solve(eq1, { verbosity: 'detailed' });
			expect(
				result1.steps.some(
					(s) => s.description.includes('positif') || s.description.includes('deux solutions')
				)
			).toBe(true);

			// Zero discriminant
			const eq2 = parseEquation('x^2 - 4x + 4 = 0');
			const result2 = solve(eq2, { verbosity: 'detailed' });
			expect(
				result2.steps.some(
					(s) => s.description.includes('nul') || s.description.includes('solution double')
				)
			).toBe(true);

			// Negative discriminant
			const eq3 = parseEquation('x^2 + 1 = 0');
			const result3 = solve(eq3, { verbosity: 'detailed' });
			expect(
				result3.steps.some(
					(s) => s.description.includes('negatif') || s.description.includes('pas de solution')
				)
			).toBe(true);
		});
	});

	describe('Verbosity levels', () => {
		it('should return no steps in result mode', () => {
			const eq = parseEquation('x^2 - 5x + 6 = 0');
			const result = solve(eq, { verbosity: 'result' });

			expect(result.steps).toHaveLength(0);
			expect(result.solutions).toHaveLength(2);
		});

		it('should return summarized steps', () => {
			const eq = parseEquation('x^2 - 5x + 6 = 0');
			const result = solve(eq, { verbosity: 'summarized' });

			expect(result.steps.length).toBeGreaterThan(0);
			// Summarized should include the final solution step
			expect(
				result.steps.some((s) => s.rule === 'quadratic-formula' || s.rule === 'isolate-variable')
			).toBe(true);
		});
	});

	describe('Auto-detection of variable', () => {
		it('should auto-detect variable y', () => {
			const eq = parseEquation('y^2 - 4y + 3 = 0');
			const result = solve(eq);

			expect(result.variable).toBe('y');
			expect(result.status).toBe('multiple');

			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toContain('1');
			expect(values).toContain('3');
		});
	});
});
