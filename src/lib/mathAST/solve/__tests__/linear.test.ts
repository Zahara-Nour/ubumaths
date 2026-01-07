/**
 * Linear Solver Tests
 *
 * Tests for solving linear equations ax + b = 0.
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

describe('Linear Solver', () => {
	describe('Basic linear equations', () => {
		it('should solve 2x + 6 = 0 -> x = -3', () => {
			const eq = parseEquation('2x + 6 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.equationType).toBe('linear');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-3');
			expect(result.solutions[0].exact).toBe(true);
		});

		it('should solve 3x = 9 -> x = 3', () => {
			const eq = parseEquation('3x = 9');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('3');
		});

		it('should solve x + 5 = 0 -> x = -5', () => {
			const eq = parseEquation('x + 5 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-5');
		});

		it('should solve -x + 3 = 0 -> x = 3', () => {
			const eq = parseEquation('-x + 3 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('3');
		});

		it('should solve x = 7 -> x = 7', () => {
			const eq = parseEquation('x = 7');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('7');
		});

		it('should solve -2x + 6 = 0 -> x = 3', () => {
			const eq = parseEquation('-2x + 6 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('3');
		});
	});

	describe('Equations with fractions', () => {
		it('should solve x/2 + 1 = 0 -> x = -2', () => {
			const eq = parseEquation('\\frac{x}{2} + 1 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-2');
		});

		it('should solve 2x/3 = 4 -> x = 6', () => {
			const eq = parseEquation('\\frac{2x}{3} = 4');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('6');
		});
	});

	describe('Edge cases', () => {
		it('should detect no solution for 0x + 5 = 0', () => {
			const eq = parseEquation('0 \\cdot x + 5 = 0');
			const result = solve(eq);

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should detect infinite solutions for 0x + 0 = 0', () => {
			const eq = parseEquation('0 \\cdot x = 0');
			const result = solve(eq);

			expect(result.status).toBe('infinite');
			expect(result.solutions).toHaveLength(0);
		});

		it('should detect no solution for 5 = 0', () => {
			const eq = parseEquation('5 = 0');
			const result = solve(eq);

			// This should be no-solution since 5 != 0
			expect(result.status).toBe('no-solution');
		});

		it('should detect infinite solutions for 0 = 0', () => {
			const eq = parseEquation('0 = 0');
			const result = solve(eq);

			expect(result.status).toBe('infinite');
		});
	});

	describe('Auto-detection of variable', () => {
		it('should auto-detect variable x', () => {
			const eq = parseEquation('2x + 4 = 0');
			const result = solve(eq);

			expect(result.variable).toBe('x');
			expect(result.status).toBe('unique');
		});

		it('should auto-detect variable y', () => {
			const eq = parseEquation('3y - 9 = 0');
			const result = solve(eq);

			expect(result.variable).toBe('y');
			expect(result.status).toBe('unique');
			expect(toLatex(result.solutions[0].value)).toBe('3');
		});
	});

	describe('Verbosity levels', () => {
		it('should return no steps in result mode', () => {
			const eq = parseEquation('2x + 6 = 0');
			const result = solve(eq, { verbosity: 'result' });

			expect(result.steps).toHaveLength(0);
			expect(result.solutions).toHaveLength(1);
		});

		it('should return summarized steps', () => {
			const eq = parseEquation('2x + 6 = 0');
			const result = solve(eq, { verbosity: 'summarized' });

			expect(result.steps.length).toBeGreaterThan(0);
			// Summarized should include the final solution step
			expect(result.steps.some((s) => s.rule === 'isolate-variable')).toBe(true);
		});

		it('should return detailed steps', () => {
			const eq = parseEquation('2x + 6 = 0');
			const result = solve(eq, { verbosity: 'detailed' });

			// Detailed should have more steps than summarized
			const summarized = solve(eq, { verbosity: 'summarized' });
			expect(result.steps.length).toBeGreaterThanOrEqual(summarized.steps.length);
		});

		it('should have French descriptions in steps', () => {
			const eq = parseEquation('2x + 6 = 0');
			const result = solve(eq, { verbosity: 'detailed' });

			// Check that descriptions are in French
			const descriptions = result.steps.map((s) => s.description);
			expect(descriptions.some((d) => d.includes('soustrait') || d.includes('divise'))).toBe(true);
		});
	});

	describe('Numeric approximations', () => {
		it('should include numeric approximation for simple solutions', () => {
			const eq = parseEquation('2x + 6 = 0');
			const result = solve(eq);

			expect(result.solutions[0].approximate).toBe(-3);
		});
	});
});
