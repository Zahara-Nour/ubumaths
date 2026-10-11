/**
 * Équations et inéquations avec x^{p/q}, q impair : définies pour x < 0
 * (décision du 2026-10-08). x^{2/3} = 4 a DEUX solutions, ±8, comme ∛(x²) = 4.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { solve } from '../solve';
import { solveInequality } from '../inequality';
import { compile } from '../../eval/compile';
import { formatInterval } from '../../domain/format';
import { analyzeSign } from '../../sign';
import type { RelationNode } from '../../types';

function solutions(latex: string): number[] {
	const result = solve(parseLatex(latex) as RelationNode, { variable: 'x' });
	return result.solutions
		.map((s) => s.approximate ?? Number(compile(s.value)({})))
		.sort((a, b) => a - b);
}

describe('solve : x^{p/q} = c, q impair', () => {
	it.each([
		['x^{\\frac{2}{3}}=4', [-8, 8]],
		['x^{\\frac{4}{3}}=16', [-8, 8]],
		['x^{\\frac{2}{5}}=1', [-1, 1]],
		['(x-1)^{\\frac{2}{3}}=4', [-7, 9]],
		['x^{-\\frac{2}{3}}=4', [-0.125, 0.125]],
		['x^{\\frac{1}{3}}=-2', [-8]],
		['\\sqrt[3]{x^2}=4', [-8, 8]]
	])('%s → %j', (latex, expected) => {
		const got = solutions(latex);
		expect(got).toHaveLength(expected.length);
		got.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
	});

	// Quatrième revue : changement de variable x = u^L
	it.each([
		['x^{\\frac{2}{3}}=x', [0, 1]],
		['x^{\\frac{2}{3}}=x^{\\frac{1}{3}}', [0, 1]],
		['x^{\\frac{4}{3}}=x^{\\frac{2}{3}}', [-1, 0, 1]],
		['x^{\\frac{1}{3}}=x^3', [-1, 0, 1]],
		['\\frac{1}{x^{\\frac{1}{3}}}=x', [-1, 1]],
		['x^{\\frac{2}{5}}=x^{\\frac{1}{5}}+2', [-1, 32]],
		['x^{0.5}=2', [4]],
		['\\sqrt[3]{x^2}=x', [0, 1]],
		['x^{\\frac{2}{3}}=-1', []]
	])('%s → %j (changement de variable)', (latex, expected) => {
		const got = solutions(latex);
		expect(got).toHaveLength(expected.length);
		got.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
	});

	it('x^{0.2} = −1 : décimal, base ≥ 0 → aucune solution', () => {
		expect(solutions('x^{0.2}=-1')).toEqual([]);
	});

	it('x^{1/2} = 2 inchangé : {4}', () => {
		expect(solutions('x^{\\frac{1}{2}}=2')).toEqual([4]);
	});
});

describe('analyzeSign : x^{2/3} − x', () => {
	it('zéros 0 et 1', () => {
		const result = analyzeSign(parseLatex('x^{\\frac{2}{3}}-x'), { variable: 'x' });
		const zeros = result.zeros.map((z) => compile(z.value)({})).sort((a, b) => a - b);
		expect(zeros).toEqual([0, 1]);
	});
});

describe('solveInequality : x^{p/q}, q impair', () => {
	it.each([
		['x^{\\frac{2}{3}}<4', ']-8 ; 8['],
		['x^{\\frac{1}{3}}>-2', ']-8 ; +∞['],
		['x^{\\frac{1}{2}}<2', '[0 ; 4['],
		['x^{\\frac{2}{3}}-x>0', ']-∞ ; 0[ ∪ ]0 ; 1[']
	])('%s → %s', (latex, expected) => {
		const result = solveInequality(parseLatex(latex) as RelationNode, { variable: 'x' });
		expect(formatInterval(result.solution)).toBe(expected);
	});
});

describe('c − x^n = 0 : le signe du terme en x^n (bug trouvé par la quatrième revue)', () => {
	it.each([
		['2-x^3=0', [Math.cbrt(2)]],
		['1-x^4=0', [-1, 1]],
		['1-x^8=0', [-1, 1]],
		['-x^4+16=0', [-2, 2]],
		['x^3-2=0', [Math.cbrt(2)]]
	])('%s → %j', (latex, expected) => {
		const got = solutions(latex);
		expect(got).toHaveLength(expected.length);
		got.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
	});
});

describe('changement de variable : jamais « aucune solution » à tort (cinquième revue)', () => {
	it.each([
		['\\sqrt{2}x^{\\frac{1}{3}}=1', [Math.SQRT2 / 4]],
		['x^{\\frac{1}{3}}=\\sqrt{2}', [2 * Math.SQRT2]],
		['x^{\\frac{5}{3}}+x^{\\frac{1}{3}}+1=0', [-0.43015970900194667]]
	])('%s → %j', (latex, expected) => {
		const got = solutions(latex);
		expect(got).toHaveLength(expected.length);
		got.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 5));
	});

	it.each([
		['ax^{\\frac{1}{3}}=2', { a: 2 }, 1],
		['x^{\\frac{1}{3}}=a', { a: 2 }, 8]
	])('%s : paramètre gardé (a = 2 → x = %s)', (latex, scope, expected) => {
		const result = solve(parseLatex(latex) as RelationNode, { variable: 'x' });
		expect(result.solutions).toHaveLength(1);
		expect(Number(compile(result.solutions[0].value)(scope))).toBeCloseTo(expected, 9);
	});

	it('x^{1/2} = x^{1/3} + 2 : ≈ 23,7, écriture de taille raisonnable', () => {
		const result = solve(parseLatex('x^{\\frac{1}{2}}=x^{\\frac{1}{3}}+2') as RelationNode, {
			variable: 'x'
		});
		expect(result.solutions).toHaveLength(1);
		const value = result.solutions[0].approximate ?? Number(compile(result.solutions[0].value)({}));
		expect(Math.abs(Math.sqrt(value) - Math.cbrt(value) - 2)).toBeLessThan(1e-9);
		expect(JSON.stringify(result.solutions[0].value).length).toBeLessThan(2000);
	});

	it('résolution en u non concluante : jamais « aucune solution » concluante', () => {
		const result = solve(parseLatex('x^{\\frac{1}{3}}=\\sin(x)') as RelationNode, {
			variable: 'x'
		});
		expect(result.status === 'no-solution' && result.conclusive === true).toBe(false);
	});
});
