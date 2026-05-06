/**
 * Solve — Exponential equation classification fix.
 *
 * Before the fix, `solve(e^x − 1 = 0)` returned `no-solution` because
 * `getTranscendentalType` only matched function-call nodes
 * (`exp(...)`, `ln(...)`, …) and ignored superscript-with-euler-base nodes
 * like `e^x` (parsed as `superscript { base: euler, superscript: x }`).
 * The downstream `solveExponential` function had the right logic but was
 * never called because classification returned `'unknown'`.
 *
 * Fix: extend `containsTranscendental` and `getTranscendentalType` to
 * detect `e^u` superscript shapes as exponential.
 *
 * @module mathAST/solve/__tests__/exponential-shapes.test
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { equals, number } from '../../factory';
import type { RelationNode } from '../../types';

function eqEqualsZero(latex: string): RelationNode {
	return equals(parseLatex(latex), number('0'));
}

describe('solve — exponential shapes a·e^x + b = 0', () => {
	it('e^x − 1 = 0 → x = 0', () => {
		const result = solve(eqEqualsZero('e^x - 1'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions.length).toBe(1);
		expect(result.solutions[0].approximate).toBeCloseTo(0, 8);
	});

	it('e^x − 5 = 0 → x = ln(5)', () => {
		const result = solve(eqEqualsZero('e^x - 5'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(Math.log(5), 6);
	});

	it('2·e^x − 6 = 0 → x = ln(3)', () => {
		const result = solve(eqEqualsZero('2 e^x - 6'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(Math.log(3), 6);
	});

	it('−e^x + 5 = 0 → x = ln(5)', () => {
		const result = solve(eqEqualsZero('-e^x + 5'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(Math.log(5), 6);
	});

	it('e^x + 1 = 0 → no real solution (e^x > 0 always)', () => {
		const result = solve(eqEqualsZero('e^x + 1'), { variable: 'x' });
		expect(['no-real-solution', 'no-solution']).toContain(result.status);
	});

	it('e^x = 0 (i.e. e^x − 0 = 0) → no real solution', () => {
		// `e^x = 0` is impossible. The solver should detect this.
		const result = solve(eqEqualsZero('e^x'), { variable: 'x' });
		expect(['no-real-solution', 'no-solution']).toContain(result.status);
	});

	it('e^(2x) − 9 = 0 → x = ln(3) (regression: linear argument with coefficient)', () => {
		const result = solve(eqEqualsZero('e^{2x} - 9'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(Math.log(9) / 2, 6);
	});

	it('e^(x+1) − e = 0 → x = 0 (linear argument with offset)', () => {
		const result = solve(eqEqualsZero('e^{x+1} - e'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(0, 6);
	});
});

describe('solve — logarithmic shapes (regression — should already work)', () => {
	it('ln(x) − 1 = 0 → x = e', () => {
		const result = solve(eqEqualsZero('\\ln(x) - 1'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(Math.E, 6);
	});

	it('2·ln(x) − 4 = 0 → x = e²', () => {
		const result = solve(eqEqualsZero('2 \\ln(x) - 4'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(Math.E * Math.E, 5);
	});
});

describe('solve — REGRESSION (these still classified correctly)', () => {
	it('x² − 4 = 0 → 2 solutions (polynomial unchanged)', () => {
		const result = solve(eqEqualsZero('x^2 - 4'), { variable: 'x' });
		expect(result.status).toBe('multiple');
		expect(result.solutions.length).toBe(2);
	});

	it('sin(x) − 1/2 = 0 → trigonometric (unchanged)', () => {
		const result = solve(eqEqualsZero('\\sin(x) - \\frac{1}{2}'), { variable: 'x' });
		// Trigonometric returns at least one principal solution
		expect(result.solutions.length).toBeGreaterThanOrEqual(1);
	});

	it('x − 3 = 0 → x = 3 (linear unchanged)', () => {
		const result = solve(eqEqualsZero('x - 3'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(3, 8);
	});
});
