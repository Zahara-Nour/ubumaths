/**
 * Product Decomposition Tests (Zero-Product Property)
 *
 * Tests for solving equations of the form A·B = 0 by decomposing
 * into A = 0 or B = 0 and solving each factor independently.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseCustom } from '../../parser/custom';
import type { RelationNode } from '../../types';

// =============================================================================
// Helpers
// =============================================================================

function parseEquation(custom: string): RelationNode {
	const node = parseCustom(custom);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type}`);
	}
	return node;
}

function hasApproxSolution(
	solutions: readonly { approximate?: number }[],
	value: number,
	tolerance = 0.01
): boolean {
	return solutions.some(
		(s) => s.approximate !== undefined && Math.abs(s.approximate - value) < tolerance
	);
}

// =============================================================================
// Mixed Products (main use case)
// =============================================================================

describe('Product Decomposition (Zero-Product Property)', () => {
	describe('Mixed products', () => {
		it('should solve x*sin(x) = 0 → x = 0 + periodic sin zeros', () => {
			const eq = parseEquation('x*sin(x) = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(hasApproxSolution(result.solutions, 0)).toBe(true);
			// Should have periodic solutions from sin(x) = 0
			expect(result.periodicSolutions).toBeDefined();
		});

		it('should solve (x^2 - 1)*e^x = 0 → x = ±1', () => {
			const eq = parseEquation('(x^2 - 1)*e^x = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(result.solutions.length).toBe(2);
			expect(hasApproxSolution(result.solutions, -1)).toBe(true);
			expect(hasApproxSolution(result.solutions, 1)).toBe(true);
		});

		it('should solve x*cos(x) = 0 → x = 0 + periodic cos zeros', () => {
			const eq = parseEquation('x*cos(x) = 0');
			const result = solve(eq);

			expect(result.status).toBe('multiple');
			expect(hasApproxSolution(result.solutions, 0)).toBe(true);
			expect(result.periodicSolutions).toBeDefined();
		});
	});

	// =============================================================================
	// Polynomial Products
	// =============================================================================

	describe('Polynomial products', () => {
		it('should solve x*(x - 1)*(x + 2) = 0 → x = -2, 0, 1', () => {
			const eq = parseEquation('x*(x - 1)*(x + 2) = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBe(3);
			expect(hasApproxSolution(result.solutions, -2)).toBe(true);
			expect(hasApproxSolution(result.solutions, 0)).toBe(true);
			expect(hasApproxSolution(result.solutions, 1)).toBe(true);
		});

		it('should solve (x - 1)*(x + 1) = 0 → x = ±1', () => {
			const eq = parseEquation('(x - 1)*(x + 1) = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBe(2);
			expect(hasApproxSolution(result.solutions, -1)).toBe(true);
			expect(hasApproxSolution(result.solutions, 1)).toBe(true);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('Edge cases', () => {
		it('should solve x*(x^2 + 1) = 0 → x = 0 only', () => {
			const eq = parseEquation('x*(x^2 + 1) = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBe(1);
			expect(hasApproxSolution(result.solutions, 0)).toBe(true);
		});

		it('should deduplicate: (x - 1)*(x - 1) = 0 → x = 1', () => {
			const eq = parseEquation('(x - 1)*(x - 1) = 0');
			const result = solve(eq);

			expect(result.solutions.length).toBe(1);
			expect(hasApproxSolution(result.solutions, 1)).toBe(true);
		});

		it('should not decompose sums: x + sin(x) = 0 goes through normal path', () => {
			// This is a sum, not a product — should NOT be decomposed
			const eq = parseEquation('x + sin(x) = 0');
			const result = solve(eq);

			// Should not be decomposed as a product (it's a sum)
			// The solver may or may not find solutions, but it should not crash
			expect(result).toBeDefined();
		});
	});

	// =============================================================================
	// Pedagogical Steps
	// =============================================================================

	describe('Pedagogical steps', () => {
		it('should include zero-product-property step in detailed mode', () => {
			const eq = parseEquation('x*sin(x) = 0');
			const result = solve(eq, { verbosity: 'detailed' });

			const hasZPPStep = result.steps.some((step) => step.rule === 'zero-product-property');
			expect(hasZPPStep).toBe(true);
		});
	});
});

/**
 * `u^n = 0` équivaut à `u = 0` : la multiplicité ne change pas l'ensemble des
 * solutions. Sans cette règle, `(x²−2)² = 0` tombait sur le solveur de
 * quartiques, qui refusait des coefficients non numériques, et l'équation
 * n'avait « pas de solution » — alors qu'elle en a deux.
 */
describe('Puissance nulle — u^n = 0 équivaut à u = 0', () => {
	function solutionsOf(custom: string): { status: string; approx: number[] } {
		const result = solve(parseEquation(custom));
		return {
			status: result.status,
			approx: result.solutions
				.map((s) => s.approximate)
				.filter((v): v is number => v !== undefined)
				.sort((a, b) => a - b)
		};
	}

	it('résout (x^2-2)^2 = 0', () => {
		const { status, approx } = solutionsOf('(x^2-2)^2 = 0');

		expect(status).toBe('multiple');
		expect(approx).toHaveLength(2);
		expect(approx[0]).toBeCloseTo(-Math.SQRT2, 12);
		expect(approx[1]).toBeCloseTo(Math.SQRT2, 12);
	});

	it('résout (x^2-2)^3 = 0, où le degré 6 n’est pas géré autrement', () => {
		const { approx } = solutionsOf('(x^2-2)^3 = 0');

		expect(approx).toHaveLength(2);
		expect(approx[1]).toBeCloseTo(Math.SQRT2, 12);
	});

	it('résout une puissance de facteur linéaire', () => {
		expect(solutionsOf('(x-1)^2 = 0').approx).toEqual([1]);
		expect(solutionsOf('(2x-4)^4 = 0').approx).toEqual([2]);
	});

	it('ne trouve aucune solution réelle quand la base n’en a pas', () => {
		expect(solutionsOf('(x^2+1)^2 = 0').approx).toHaveLength(0);
	});

	it('laisse x^2 = 0 au chemin habituel', () => {
		expect(solutionsOf('x^2 = 0').approx).toEqual([0]);
	});

	it('ne s’applique pas à une puissance qui n’est pas nulle', () => {
		// (x-1)^2 = 4 n'est pas de la forme u^n = 0 : la forme standard est
		// (x-1)^2 - 4, une soustraction.
		expect(solutionsOf('(x-1)^2 = 4').approx).toEqual([-1, 3]);
	});
});
