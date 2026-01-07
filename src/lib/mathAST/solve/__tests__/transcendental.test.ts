/**
 * Transcendental Solver Tests
 *
 * Tests for solving transcendental equations (exp, ln, sin, cos).
 * NOTE: This is a partial implementation. Complex transcendental equations
 * require more sophisticated pattern matching.
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

describe('Transcendental Solver', () => {
	describe('Domain restrictions', () => {
		it('should detect no solution for sin(x) = 2', () => {
			const eq = parseEquation('\\sin(x) = 2');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should detect no solution for cos(x) = -2', () => {
			const eq = parseEquation('\\cos(x) = -2');
			const result = solve(eq);

			expect(result.status).toBe('no-real-solution');
			expect(result.solutions).toHaveLength(0);
		});
	});

	describe('Simple logarithmic', () => {
		it('should solve ln(x) = 0 -> x = 1', () => {
			const eq = parseEquation('\\ln(x) = 0');
			const result = solve(eq);

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(result.solutions[0].approximate).toBeCloseTo(1, 5);
		});
	});

	// TODO: Add more sophisticated tests when pattern matching is improved
	// - e^x = c equations
	// - a^x = c equations
	// - ln(x) = c equations
	// - sin(x) = c equations with valid c in [-1, 1]
});
