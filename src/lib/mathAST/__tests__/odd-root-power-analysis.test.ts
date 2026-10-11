/**
 * Analyse des puissances x^{p/q}, q impair (décision du 2026-10-08) : signe,
 * limites, équivalence, variations — retours de revue du 2026-10-08.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../parser';
import { analyzeSign } from '../sign';
import { evaluateLimit } from '../limits';
import { areEquivalent } from '../equivalence';
import { computeVariations } from '../variations';
import { computeDomain } from '../domain/compute';
import { formatInterval } from '../domain/format';
import { compile } from '../eval/compile';
import { toLatex } from '../latex-generator';

/** Signes rendus : « borne basse:signe » par intervalle, puis les zéros. */
function signSummary(latex: string): { intervals: string[]; zeros: number[] } {
	const result = analyzeSign(parseLatex(latex), { variable: 'x' });
	return {
		intervals: result.signedIntervals.map((i) => i.sign).filter((s) => s !== 'zero'),
		zeros: result.zeros.map((z) => compile(z.value)({})).sort((a, b) => a - b)
	};
}

describe('signe de x^{p/q} − c (q impair)', () => {
	it.each([
		['x^{\\frac{2}{3}}-4', [-8, 8], ['positive', 'negative', 'positive']],
		['x^{\\frac{2}{3}}-1', [-1, 1], ['positive', 'negative', 'positive']],
		['x^{\\frac{4}{3}}-16', [-8, 8], ['positive', 'negative', 'positive']],
		['4-x^{\\frac{2}{3}}', [-8, 8], ['negative', 'positive', 'negative']],
		['x^{\\frac{2}{5}}-1', [-1, 1], ['positive', 'negative', 'positive']]
	])('%s', (latex, zeros, signs) => {
		const s = signSummary(latex);
		expect(s.zeros).toHaveLength(zeros.length);
		s.zeros.forEach((z, i) => expect(z).toBeCloseTo(zeros[i], 9));
		expect(s.intervals).toEqual(signs);
	});

	it.each([
		['x^{-\\frac{1}{13}}', ['negative', 'positive']],
		['x^{-\\frac{2}{13}}', ['positive', 'positive']],
		['\\frac{1}{\\sqrt[5]{x}}', ['negative', 'positive']],
		['\\frac{1}{\\sqrt[7]{x^2}}', ['positive', 'positive']]
	])('%s : grand dénominateur, même analyse', (latex, signs) => {
		expect(signSummary(latex).intervals).toEqual(signs);
	});
});

function limit(latex: string, at: string, dir: 'left' | 'right' | 'both') {
	return evaluateLimit(parseLatex(latex), 'x', parseLatex(at), dir);
}

describe('limites de x^{p/q} (q impair)', () => {
	it('x^{-1/13} en 0⁻ : −∞', () => {
		const r = limit('x^{-\\frac{1}{13}}', '0', 'left');
		expect(r.status).toBe('infinite');
		expect(toLatex(r.value as never)).toMatch(/^-/);
	});

	it.each([
		['x^{\\frac{1}{3}}', '0'],
		['x^{\\frac{2}{3}}', '0']
	])('%s en 0⁻ : %s', (latex, value) => {
		const r = limit(latex, '0', 'left');
		expect(r.status).toBe('exact');
		expect(toLatex(r.value as never)).toBe(value);
	});

	it('x^{-1/3} en 0 (deux côtés) : pas de limite', () => {
		const r = limit('x^{-\\frac{1}{3}}', '0', 'both');
		expect(r.status).toBe('does-not-exist');
	});

	it('x^{2/3} − 4 en −∞ : +∞', () => {
		const r = limit('x^{\\frac{2}{3}}-4', '-\\infty', 'both');
		expect(r.status).toBe('infinite');
	});
});

describe('limites : produit / quotient de puissances de x (seconde revue)', () => {
	it.each([
		['\\frac{x^{\\frac{1}{5}}}{x^{\\frac{1}{3}}}', '0', 'both', '+\\infty'],
		['\\frac{x^{\\frac{1}{5}}}{x^{\\frac{1}{3}}}', '0', 'right', '+\\infty'],
		['\\frac{\\sqrt[5]{x}}{\\sqrt[3]{x}}', '0', 'right', '+\\infty'],
		['\\frac{x^{\\frac{1}{3}}}{\\sqrt{x}}', '0', 'right', '+\\infty'],
		['\\frac{\\sqrt{x}}{x^{\\frac{1}{3}}}', '0', 'right', '0'],
		['\\frac{2x^{\\frac{1}{5}}}{x^{\\frac{1}{3}}}', '0', 'both', '+\\infty'],
		['x^{\\frac{1}{3}}x^{-\\frac{1}{3}}', '0', 'both', '1'],
		['\\frac{x^{\\frac{1}{3}}}{x^{\\frac{2}{3}}}', '0', 'left', '-\\infty'],
		// Exposant réuni négatif : x^{|r|} reste au dénominateur (troisième revue)
		['\\frac{x^{\\frac{1}{3}}(e^x-1)}{x^{\\frac{4}{3}}}', '0', 'both', '1'],
		['\\frac{x^{\\frac{1}{3}}\\ln(1+x)}{x^{\\frac{4}{3}}}', '0', 'both', '1'],
		['\\frac{x^{\\frac{1}{3}}\\sin x}{x^{\\frac{1}{3}}x}', '0', 'both', '1'],
		['\\frac{x^{\\frac{2}{3}}\\sin x}{x^{\\frac{5}{3}}}', '0', 'both', '1'],
		['\\frac{x^{\\frac{1}{3}}e^x}{x^{\\frac{4}{3}}}', '+\\infty', 'both', '+\\infty']
	] as const)('%s en %s (%s) : %s', (latex, at, dir, expected) => {
		const r = limit(latex, at, dir);
		expect(r.status === 'exact' || r.status === 'infinite').toBe(true);
		expect(toLatex(r.value as never)).toBe(expected);
	});
});

describe('équivalence : base négative, q impair', () => {
	it.each([
		['(-8)^{\\frac{1}{3}}', '-2'],
		['(-8)^{\\frac{2}{3}}', '4'],
		['(-1)^{\\frac{1}{3}}', '-1']
	])('%s ≡ %s', (a, b) => {
		expect(areEquivalent(parseLatex(a), parseLatex(b))).toBe(true);
	});

	it.each([
		['(-8)^{\\frac{1}{2}}', '2'],
		['(-4)^{\\frac{2}{4}}', '2'],
		['(-4)^{\\frac{2}{4}}', '-2'],
		['(-32)^{0.2}', '-2']
	])('%s ≢ %s (q pair ou décimal)', (a, b) => {
		expect(areEquivalent(parseLatex(a), parseLatex(b))).toBe(false);
	});
});

describe('variations : extremum calculé', () => {
	it.each([
		['x^{\\frac{2}{3}}-4', -4],
		['x^{\\frac{4}{3}}', 0]
	])('%s : minimum en 0 de valeur %s', (latex, value) => {
		const r = computeVariations(parseLatex(latex), { variable: 'x' });
		const min = r.extrema.find((e) => e.type.includes('minimum'));
		expect(min).toBeDefined();
		expect(toLatex(min!.y as never)).toBe(String(value));
	});

	it('x^{2/3} − 4 : décroissante puis croissante', () => {
		const r = computeVariations(parseLatex('x^{\\frac{2}{3}}-4'), { variable: 'x' });
		expect(r.monotonicIntervals.map((m) => m.monotonicity)).toEqual(['decreasing', 'increasing']);
	});
});

describe('domaine composé', () => {
	it.each([
		['\\ln(x^{\\frac{2}{3}})', 'ℝ \\ {0}'],
		['(x^{\\frac{1}{3}})^{\\frac{1}{2}}', '[0 ; +∞[']
	])('%s : %s', (latex, expected) => {
		const r = computeDomain(parseLatex(latex), 'x');
		expect(r.unresolved ?? []).toEqual([]);
		expect(formatInterval(r.domain)).toBe(expected);
	});
});
