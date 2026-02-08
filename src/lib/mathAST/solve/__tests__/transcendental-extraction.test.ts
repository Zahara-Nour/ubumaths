/**
 * Transcendental Extraction + Exp/Log Solving Tests
 *
 * Tests for:
 * - Generic extractTranscendentalEquation (trig, exp, log)
 * - Exp/log solving via linear solver
 * - Exp/log recursive decomposition for non-linear arguments
 *
 * NOTE: The custom parser uses {} for complex superscripts (e^{2x+1}),
 * NOT () like LaTeX would.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { toStandardForm } from '../classify';
import { parseCustom } from '../../parser/custom';
import type { RelationNode } from '../../types';
import { extractTranscendentalEquation } from '../solvers/transcendental';

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

/**
 * Parse an equation and convert to standard form (lhs - rhs = 0)
 * then extract transcendental equation parts.
 */
function extractFromEquation(equation: string, variable = 'x') {
	const eq = parseEquation(equation);
	const stdForm = toStandardForm(eq);
	return extractTranscendentalEquation(stdForm, variable);
}

function solveEquation(equation: string, variable = 'x') {
	const eq = parseEquation(equation);
	return solve(eq, { variable });
}

function expectSolutionNear(result: ReturnType<typeof solve>, value: number, tolerance = 0.001) {
	const found = result.solutions.some(
		(s) => s.approximate !== undefined && Math.abs(s.approximate - value) < tolerance
	);
	expect(
		found,
		`Expected solution near ${value}, got: ${result.solutions.map((s) => s.approximate)}`
	).toBe(true);
}

function expectNoSolution(result: ReturnType<typeof solve>) {
	expect(
		result.status === 'no-solution' || result.status === 'no-real-solution',
		`Expected no solution, got status ${result.status}`
	).toBe(true);
}

// =============================================================================
// Extraction Tests
// =============================================================================

describe('extractTranscendentalEquation', () => {
	describe('Trig extraction (backward compat)', () => {
		it('should extract sin(x) = 0', () => {
			const result = extractFromEquation('sin(x) = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('trig');
			expect(result!.funcName).toBe('sin');
			expect(result!.constantNumeric).toBeCloseTo(0);
		});

		it('should extract cos(x) - 1/2 = 0', () => {
			const result = extractFromEquation('cos(x) - 1/2 = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('trig');
			expect(result!.funcName).toBe('cos');
			expect(result!.constantNumeric).toBeCloseTo(0.5);
		});

		it('should extract -sin(x) = 0', () => {
			const result = extractFromEquation('-sin(x) = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('trig');
			expect(result!.funcName).toBe('sin');
			expect(result!.constantNumeric).toBeCloseTo(0);
		});

		it('should extract 3*cos(x) = 0', () => {
			const result = extractFromEquation('3*cos(x) = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('trig');
			expect(result!.funcName).toBe('cos');
			expect(result!.constantNumeric).toBeCloseTo(0);
		});

		it('should extract 2*sin(x) - 1 = 0', () => {
			const result = extractFromEquation('2*sin(x) - 1 = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('trig');
			expect(result!.funcName).toBe('sin');
			expect(result!.constantNumeric).toBeCloseTo(0.5);
		});
	});

	describe('Exp extraction', () => {
		it('should extract e^x - 5 = 0', () => {
			const result = extractFromEquation('e^x - 5 = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('exp');
			expect(result!.funcName).toBe('exp');
			expect(result!.constantNumeric).toBeCloseTo(5);
		});

		it('should extract 3*e^x - 6 = 0 → constant = 2', () => {
			const result = extractFromEquation('3*e^x - 6 = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('exp');
			expect(result!.funcName).toBe('exp');
			expect(result!.constantNumeric).toBeCloseTo(2);
		});

		it('should extract e^{2x+1} - 5 = 0', () => {
			const result = extractFromEquation('e^{2x+1} - 5 = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('exp');
			expect(result!.funcName).toBe('exp');
			expect(result!.constantNumeric).toBeCloseTo(5);
		});
	});

	describe('Log extraction', () => {
		it('should extract ln(x) - 3 = 0', () => {
			const result = extractFromEquation('ln(x) - 3 = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('log');
			expect(result!.funcName).toBe('ln');
			expect(result!.constantNumeric).toBeCloseTo(3);
		});

		it('should extract 2*ln(x) - 4 = 0 → constant = 2', () => {
			const result = extractFromEquation('2*ln(x) - 4 = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('log');
			expect(result!.funcName).toBe('ln');
			expect(result!.constantNumeric).toBeCloseTo(2);
		});

		it('should extract ln(x^2) = 0', () => {
			const result = extractFromEquation('ln(x^2) = 0');
			expect(result).not.toBeNull();
			expect(result!.kind).toBe('log');
			expect(result!.funcName).toBe('ln');
			expect(result!.constantNumeric).toBeCloseTo(0);
		});
	});

	describe('Non-match', () => {
		it('should return null for x^2 + 1 = 0', () => {
			const result = extractFromEquation('x^2 + 1 = 0');
			expect(result).toBeNull();
		});

		it('should return null for sin(x) + cos(x) = 0 (mixed trig)', () => {
			const result = extractFromEquation('sin(x) + cos(x) = 0');
			expect(result).toBeNull();
		});

		it('should return null for x*sin(x) = 0 (product, not sum pattern)', () => {
			const result = extractFromEquation('x*sin(x) = 0');
			expect(result).toBeNull();
		});
	});
});

// =============================================================================
// Exp/Log Solving (linear arguments)
// =============================================================================

describe('Exp/Log solving (linear arguments)', () => {
	it('should solve e^x = 1 → x = 0', () => {
		const result = solveEquation('e^x = 1');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, 0);
	});

	it('should solve e^x - 5 = 0 → x = ln(5)', () => {
		const result = solveEquation('e^x - 5 = 0');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, Math.log(5));
	});

	it('should solve e^{2x} - 3 = 0 → x = ln(3)/2', () => {
		const result = solveEquation('e^{2x} - 3 = 0');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, Math.log(3) / 2);
	});

	it('should solve e^{2x+1} = 5 → x = (ln(5)-1)/2', () => {
		const result = solveEquation('e^{2x+1} = 5');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, (Math.log(5) - 1) / 2);
	});

	it('should solve 3*e^x = 6 → x = ln(2)', () => {
		const result = solveEquation('3*e^x = 6');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, Math.log(2));
	});

	it('should detect no solution for e^x = -1', () => {
		const result = solveEquation('e^x + 1 = 0');
		expectNoSolution(result);
	});

	it('should solve ln(x) = 0 → x = 1', () => {
		const result = solveEquation('ln(x) = 0');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, 1);
	});

	it('should solve ln(x) - 3 = 0 → x = e^3', () => {
		const result = solveEquation('ln(x) - 3 = 0');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, Math.exp(3));
	});

	it('should solve 2*ln(x) - 4 = 0 → x = e^2', () => {
		const result = solveEquation('2*ln(x) - 4 = 0');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, Math.exp(2));
	});
});

// =============================================================================
// Recursive Decomposition (non-linear arguments)
// =============================================================================

describe('Exp/Log recursive decomposition', () => {
	it('should solve e^{x^2} = e → x = ±1', () => {
		const result = solveEquation('e^{x^2} = e');
		expect(result.solutions.length).toBe(2);
		expectSolutionNear(result, -1);
		expectSolutionNear(result, 1);
	});

	it('should solve e^{x^2} - 1 = 0 → x = 0', () => {
		const result = solveEquation('e^{x^2} - 1 = 0');
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
		expectSolutionNear(result, 0);
	});

	it('should solve ln(x^2) = 0 → x^2 = 1 → x = ±1', () => {
		const result = solveEquation('ln(x^2) = 0');
		expect(result.solutions.length).toBe(2);
		expectSolutionNear(result, -1);
		expectSolutionNear(result, 1);
	});

	it('should solve ln(x^2+1) - 2 = 0 → x = ±√(e²-1)', () => {
		const result = solveEquation('ln(x^2+1) - 2 = 0');
		const expected = Math.sqrt(Math.exp(2) - 1);
		expect(result.solutions.length).toBe(2);
		expectSolutionNear(result, -expected);
		expectSolutionNear(result, expected);
	});

	it('should detect no solution for e^{x^2} = -1', () => {
		const result = solveEquation('e^{x^2} + 1 = 0');
		expectNoSolution(result);
	});

	it('should NOT use recursive decomposition for linear args (e^{2x} = 3)', () => {
		// This should be handled by the normal solver, producing a single solution
		const result = solveEquation('e^{2x} = 3');
		expect(result.solutions.length).toBe(1);
		expectSolutionNear(result, Math.log(3) / 2);
	});
});
