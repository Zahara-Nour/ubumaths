/**
 * Dénominateur f(ax + b) − c, f = exp ou ln : le zéro est exclu, EXACTEMENT.
 *
 * Mesuré avant le correctif : `invertMonotone` ne savait inverser
 * `ln u ⊳ c` que pour c = 0 et `e^u ⊳ c` que pour c = 1 (borne restant
 * rationnelle). Au-delà, `nonZeroSet` rendait `null` : le domaine de
 * 1/(eˣ − 2) était ℝ (avec un drapeau `unresolved` que personne ne lit),
 * celui de 1/(ln x − 1) était ]0 ; +∞[, sans exclure e.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { toLatex } from '$lib/mathAST/latex-generator';
import { compile } from '$lib/mathAST/eval/compile';
import { computeDomain } from '../compute';
import { formatInterval } from '../format';
import type { Domain } from '../types';

/** Points exclus d'un domaine `interval_set`. */
function excludedOf(domain: Domain): { latex: string; value: number }[] {
	if (domain.kind !== 'interval_set') return [];
	return domain.excludedPoints.map((p) => ({
		latex: toLatex(p.value),
		value: compile(p.value)({})
	}));
}

/** Points où un intervalle s'arrête (bornes finies). */
function finiteBounds(domain: Domain): number[] {
	if (domain.kind !== 'interval_set') return [];
	const values: number[] = [];
	for (const i of domain.intervals) {
		for (const e of [i.lower, i.upper]) {
			if (e.value.type === 'infinity') continue;
			values.push(compile(e.value)({}));
		}
	}
	return values;
}

/** x exclu du domaine : point exclu, ou borne ouverte entre deux intervalles. */
function excludes(domain: Domain, x: number): boolean {
	const near = (v: number) => Math.abs(v - x) < 1e-9;
	return excludedOf(domain).some((p) => near(p.value)) || finiteBounds(domain).some(near);
}

describe('le zéro du dénominateur est exclu, sous forme exacte', () => {
	it.each([
		['\\frac{1}{e^{x}-2}', Math.LN2],
		['\\frac{1}{\\exp(x)-2}', Math.LN2],
		['\\frac{1}{\\ln(x)-1}', Math.E],
		['\\frac{1}{\\ln(x)+2}', Math.exp(-2)],
		['\\frac{1}{2\\ln(x)-4}', Math.exp(2)],
		['\\frac{1}{e^{2x+1}-3}', (Math.log(3) - 1) / 2],
		['\\frac{1}{3-e^{-x}}', -Math.log(3)],
		['\\frac{5}{3\\ln(2x)+6}', Math.exp(-2) / 2]
	])('%s exclut %f', (latex, root) => {
		const result = computeDomain(parseLatex(latex), 'x');
		expect(result.unresolved ?? []).toEqual([]);
		expect(excludes(result.domain, root)).toBe(true);
		// Valeur exacte : jamais un décimal
		for (const p of excludedOf(result.domain)) expect(p.latex).not.toMatch(/\d\.\d/);
		// Seulement ce point de plus (pas d'exclusion parasite)
		expect(excludes(result.domain, root + 0.1)).toBe(false);
	});

	it('1/(ln x − 1) : ]0 ; e[ ∪ ]e ; +∞[', () => {
		const result = computeDomain(parseLatex('\\frac{1}{\\ln(x)-1}'), 'x');
		expect(formatInterval(result.domain)).toBe(']0 ; e[ ∪ ]e ; +∞[');
	});

	it('1/(eˣ − 2) : ℝ privé de ln 2', () => {
		const result = computeDomain(parseLatex('\\frac{1}{e^{x}-2}'), 'x');
		const [point] = excludedOf(result.domain);
		expect(point?.latex).toMatch(/\\ln/);
		expect(point?.value).toBeCloseTo(Math.LN2, 12);
	});
});

describe('pas de solution réelle : rien à exclure', () => {
	it.each(['\\frac{1}{e^{x}+2}', '\\frac{1}{e^{2x}}', '\\frac{1}{-1-e^{x}}'])('%s', (latex) => {
		const result = computeDomain(parseLatex(latex), 'x');
		expect(result.unresolved ?? []).toEqual([]);
		expect(result.domain.kind).toBe('universal');
	});
});

describe('même mécanisme dans une inéquation de domaine', () => {
	it('√(ln x − 1) : [e ; +∞[', () => {
		const result = computeDomain(parseLatex('\\sqrt{\\ln(x)-1}'), 'x');
		expect(result.unresolved ?? []).toEqual([]);
		expect(finiteBounds(result.domain).map((v) => v.toFixed(9))).toEqual([Math.E.toFixed(9)]);
	});

	it('√(eˣ − 2) : [ln 2 ; +∞[', () => {
		const result = computeDomain(parseLatex('\\sqrt{e^{x}-2}'), 'x');
		expect(result.unresolved ?? []).toEqual([]);
		expect(finiteBounds(result.domain).map((v) => v.toFixed(9))).toEqual([Math.LN2.toFixed(9)]);
	});
});

describe('ce qui ne doit pas bouger', () => {
	it.each([
		['\\frac{1}{\\sqrt{x}-2}', '[0;4[∪]4;+∞['],
		['\\frac{1}{\\ln(x)}', ']0;+∞[\\{1}'],
		['\\frac{1}{e^{x}-1}', 'ℝ\\{0}']
	])('%s', (latex, expected) => {
		const result = computeDomain(parseLatex(latex), 'x');
		expect(formatInterval(result.domain).replace(/\s/g, '')).toBe(expected);
	});
});
