/**
 * Integration Tests for Equation Solver
 *
 * Tests the solve() function integration with various equation types.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import type { RelationNode } from '../../types';

// Helper to parse an equation
function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type}`);
	}
	return node;
}

describe('Solve Integration', () => {
	describe('Linear equations', () => {
		it('should solve 2x + 4 = 0', () => {
			const eq = parseEquation('2x + 4 = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(-2, 5);
			expect(result.variable).toBe('x');
		});

		it('should solve 3x - 9 = 0', () => {
			const result = solve(parseEquation('3x - 9 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions[0].approximate).toBeCloseTo(3, 5);
		});

		it('should handle specific variable', () => {
			const result = solve(parseEquation('2a + 4 = 0'), { variable: 'a' });

			expect(result.status).toBe('unique');
			expect(result.variable).toBe('a');
			expect(result.solutions[0].approximate).toBeCloseTo(-2, 5);
		});
	});

	describe('Quadratic equations', () => {
		it('should solve x^2 - 5x + 6 = 0 (two solutions)', () => {
			const result = solve(parseEquation('x^2 - 5x + 6 = 0'));

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);

			const approxValues = result.solutions.map((s) => s.approximate).sort();
			expect(approxValues[0]).toBeCloseTo(2, 5);
			expect(approxValues[1]).toBeCloseTo(3, 5);
		});

		it('should solve x^2 - 4 = 0', () => {
			const result = solve(parseEquation('x^2 - 4 = 0'));

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);

			const approxValues = result.solutions.map((s) => s.approximate).sort();
			expect(approxValues[0]).toBeCloseTo(-2, 5);
			expect(approxValues[1]).toBeCloseTo(2, 5);
		});

		it('should return no-real-solution for x^2 + 1 = 0', () => {
			const result = solve(parseEquation('x^2 + 1 = 0'));

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});
	});

	describe('Verbosity options', () => {
		it('should include steps in detailed mode', () => {
			const result = solve(parseEquation('x^2 - 4x + 3 = 0'), { verbosity: 'detailed' });

			expect(result.steps.length).toBeGreaterThan(0);
		});

		it('should include minimal steps in result mode', () => {
			const result = solve(parseEquation('x^2 - 4x + 3 = 0'), { verbosity: 'result' });

			expect(result.steps.length).toBe(0);
		});
	});

	describe('Mixed equation types in sequence', () => {
		it('should handle multiple equation types', () => {
			// Linear
			const linear = solve(parseEquation('x + 5 = 0'));
			expect(linear.equationType).toBe('linear');
			expect(linear.status).toBe('unique');

			// Quadratic
			const quadratic = solve(parseEquation('x^2 - 1 = 0'));
			expect(quadratic.equationType).toBe('quadratic');
			expect(quadratic.status).toBe('multiple');

			// Transcendental
			const transcendental = solve(parseEquation('\\sin(x) = 2'));
			expect(transcendental.equationType).toBe('trigonometric');
			expect(transcendental.status).toBe('no-real-solution');
		});
	});
});
