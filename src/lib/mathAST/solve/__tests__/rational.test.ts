/**
 * Solve — Rational equations.
 *
 * Before this fix, `solve(1/x − 1 = 0)` returned `no-solution` because the
 * solver had no path for rational expressions. The fix exploits the
 * existing `normalize` canonicalization: `1/x − 1` becomes `(−x + 1)/x`
 * (a single division), so we solve numerator = 0 and filter solutions
 * that annul the denominator (extraneous roots).
 *
 * @module mathAST/solve/__tests__/rational.test
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { equals, number } from '../../factory';
import type { RelationNode } from '../../types';

function eq0(latex: string): RelationNode {
	return equals(parseLatex(latex), number('0'));
}

describe('solve — rational equations', () => {
	it('1/x − 1 = 0 → x = 1', () => {
		const result = solve(eq0('\\frac{1}{x} - 1'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions.length).toBe(1);
		expect(result.solutions[0].approximate).toBeCloseTo(1, 8);
	});

	it('2/x − 3 = 0 → x = 2/3', () => {
		const result = solve(eq0('\\frac{2}{x} - 3'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(2 / 3, 8);
	});

	it('1/x = 0 → no-solution (1 ≠ 0)', () => {
		const result = solve(eq0('\\frac{1}{x}'), { variable: 'x' });
		expect(['no-solution', 'no-real-solution']).toContain(result.status);
	});

	it('(x + 1)/(x − 2) = 0 → x = −1', () => {
		const result = solve(eq0('\\frac{x + 1}{x - 2}'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(-1, 8);
	});

	it('(x + 1)/(x − 2) − 1 = 0 → no-solution (numérateur réduit à constante non nulle)', () => {
		// (x+1)/(x-2) - 1 = ((x+1) - (x-2))/(x-2) = 3/(x-2). Always non-zero.
		const result = solve(eq0('\\frac{x + 1}{x - 2} - 1'), { variable: 'x' });
		expect(['no-solution', 'no-real-solution']).toContain(result.status);
	});

	it('1/(x − 1) + 1/(x + 1) = 0 → x = 0', () => {
		const result = solve(eq0('\\frac{1}{x - 1} + \\frac{1}{x + 1}'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(0, 8);
	});

	it('(x² − 1)/(x − 1) = 0 → x = −1 (x = 1 rejeté car annule le dénominateur)', () => {
		// After normalize, may simplify to x + 1 (cancellation), in which case
		// the polynomial solver finds x = -1 directly. Either way, x = 1 must
		// NOT appear in the solutions.
		const result = solve(eq0('\\frac{x^2 - 1}{x - 1}'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(-1, 8);
		// Confirm x = 1 not in solutions.
		expect(result.solutions.every((s) => Math.abs((s.approximate ?? 0) - 1) > 0.01)).toBe(true);
	});

	it('1/x = 1/2 → x = 2', () => {
		// Form: 1/x - 1/2 = 0
		const result = solve(eq0('\\frac{1}{x} - \\frac{1}{2}'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(2, 8);
	});

	it('(x − 1)/x = 0 → x = 1 (denominator x at 1 is 1, non-zero)', () => {
		const result = solve(eq0('\\frac{x - 1}{x}'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(1, 8);
	});
});

describe('solve — numérateur à zéros périodiques', () => {
	// La famille du numérateur suit : sans elle, seuls ±π/2 restaient, et les
	// tableaux de signes et de variations ne voyaient pas 3π/2, 5π/2…
	it('cos x/(x² + 1) = 0 : famille ±π/2 + 2kπ', () => {
		const family = solve(eq0('\\frac{\\cos(x)}{x^2+1}'), { variable: 'x' }).periodicSolutions;
		expect(family?.periodNumeric).toBeCloseTo(2 * Math.PI, 12);
		const bases = family?.baseSolutions.map((s) => s.approximate ?? Number.NaN) ?? [];
		expect(bases.sort((a, b) => a - b)).toEqual([-Math.PI / 2, Math.PI / 2]);
	});

	it('−cos x/sin²x = 0 (f′ de 1/sin x) : famille, aucun membre ne vaut kπ', () => {
		const result = solve(eq0('\\frac{-\\cos(x)}{\\sin(x)^2}'), { variable: 'x' });
		expect(result.periodicSolutions?.periodNumeric).toBeCloseTo(2 * Math.PI, 12);
	});

	it('cos x/(2 + sin x) = 0 (f′ de ln(2 + sin x)) : famille', () => {
		const result = solve(eq0('\\frac{\\cos(x)}{2+\\sin(x)}'), { variable: 'x' });
		expect(result.periodicSolutions).toBeDefined();
	});

	// Un dénominateur NON DÉFINI en certains membres (√x, ln x, tan x) : la
	// liste est filtrée par le domaine, la famille ne le serait pas
	it.each([
		'\\frac{\\cos(x)}{\\sqrt{x}}',
		'\\frac{\\cos(x)}{\\sqrt{x+5}}',
		'\\frac{\\cos(x)}{\\ln(x)}',
		'\\frac{\\cos(x)}{\\tan(x)}'
	])('%s = 0 : pas de famille (dénominateur non défini partout)', (latex) => {
		expect(solve(eq0(latex), { variable: 'x' }).periodicSolutions).toBeUndefined();
	});

	it('sin x/x = 0 : pas de famille, 0 en est un membre et annule le dénominateur', () => {
		const result = solve(eq0('\\frac{\\sin(x)}{x}'), { variable: 'x' });
		expect(result.periodicSolutions).toBeUndefined();
		expect(result.solutions.some((s) => s.approximate === 0)).toBe(false);
	});
});

describe('solve — REGRESSION (rationals must not break polynomial path)', () => {
	it('x² − 4 = 0 → 2 solutions (polynomial unchanged)', () => {
		const result = solve(eq0('x^2 - 4'), { variable: 'x' });
		expect(result.status).toBe('multiple');
		expect(result.solutions.length).toBe(2);
	});

	it('2x − 6 = 0 → x = 3 (linear unchanged)', () => {
		const result = solve(eq0('2x - 6'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(3, 8);
	});

	it('e^x − 1 = 0 → x = 0 (exponential unchanged)', () => {
		const result = solve(eq0('e^x - 1'), { variable: 'x' });
		expect(result.status).toBe('unique');
		expect(result.solutions[0].approximate).toBeCloseTo(0, 6);
	});
});
