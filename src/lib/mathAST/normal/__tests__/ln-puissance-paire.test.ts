/**
 * ln(u^{2k}) = 2k·ln|u| (décision de David, 2026-10-08).
 *
 * La normalisation écrivait ln(u^{2k}) = 2k·ln u : faux pour u < 0 (ln(x²) est
 * définie sur ℝ*, 2 ln x seulement sur ]0 ; +∞[). Une puissance impaire reste
 * n·ln u (le domaine de ln(u^n) impose déjà u > 0). Base prouvée positive
 * (x² + 1, e^x) : |u| = u, la valeur absolue disparaît.
 *
 * Comparaison (docs/systeme/mathast/convention-equivalence.md) : la convention compare sur
 * l'intersection des domaines, où ln(x²) = 2 ln x (]0 ; +∞[). Le décideur ne
 * porte pas le domaine : il compare 2 ln|x| à 2 ln x et les sépare. Faux
 * négatif assumé, de la famille de `√x·√x ≢ |x|` et `\ln|x| ≢ \ln x` ; sous
 * l'hypothèse x > 0 (ADR 0012), |x| = x et ln(x²) ≡ 2 ln x redevient juste.
 */

import { describe, it, expect } from 'vitest';
import { normalize } from '../index';
import { parseLatex } from '../../parser';
import { areEquivalent } from '../../equivalence';
import type { AnswerAssumptions } from '../../assumptions';

function sameNormalForm(a: string, b: string): boolean {
	return normalize(parseLatex(a)).hash === normalize(parseLatex(b)).hash;
}

const eq = (a: string, b: string, assumptions?: AnswerAssumptions) =>
	areEquivalent(parseLatex(a), parseLatex(b), assumptions ? { assumptions } : undefined);

describe('ln d’une puissance paire : 2k·ln|u|', () => {
	it.each([
		['\\ln(x^{2})', '2\\ln\\left|x\\right|'],
		['\\ln\\left(\\left(x-1\\right)^{2}\\right)', '2\\ln\\left|x-1\\right|'],
		['\\ln(x^{4})', '4\\ln\\left|x\\right|'],
		['\\ln(x^{-2})', '-2\\ln\\left|x\\right|'],
		['\\log(x^{2})', '2\\log\\left|x\\right|'],
		['\\log_{2}(x^{2})', '2\\log_{2}\\left|x\\right|'],
		['\\ln(x^{2}y)', '2\\ln\\left|x\\right|+\\ln(y)'],
		['\\ln\\left(\\left(1-x\\right)^{2}\\right)', '2\\ln\\left|x-1\\right|'],
		['\\ln(x^{2}-2x+1)', '2\\ln\\left|x-1\\right|']
	])('%s ≡ %s (même forme normale)', (a, b) => {
		expect(sameNormalForm(a, b)).toBe(true);
	});

	it.each([
		['\\ln(x^{2})', '2\\ln(x)'],
		['\\ln\\left(\\left(x-1\\right)^{2}\\right)', '2\\ln(x-1)'],
		['\\ln(x^{4})', '4\\ln(x)'],
		['\\log(x^{2})', '2\\log(x)']
	])('%s n’a plus la forme normale de %s', (a, b) => {
		expect(sameNormalForm(a, b)).toBe(false);
	});
});

describe('inchangé : puissance impaire, base positive', () => {
	it.each([
		['\\ln(x^{3})', '3\\ln(x)'],
		['\\ln(x^{\\frac{1}{2}})', '\\frac{1}{2}\\ln(x)'],
		['\\ln\\left(\\left(x^{2}+1\\right)^{2}\\right)', '2\\ln(x^{2}+1)'],
		['\\ln\\left(\\left(e^{x}\\right)^{2}\\right)', '2x'],
		['\\ln(9)', '2\\ln(3)']
	])('%s ≡ %s', (a, b) => {
		expect(sameNormalForm(a, b)).toBe(true);
	});
});

describe('areEquivalent : verdicts attendus', () => {
	it('ln(x²) ≡ 2 ln|x|', () => {
		expect(eq('\\ln(x^{2})', '2\\ln\\left|x\\right|')).toBe(true);
	});
	it('ln(x²) ≢ 2 ln x sans hypothèse (faux négatif assumé)', () => {
		expect(eq('\\ln(x^{2})', '2\\ln x')).toBe(false);
	});
	it('ln(x²) ≡ 2 ln x sous l’hypothèse x > 0', () => {
		expect(eq('\\ln(x^{2})', '2\\ln x', { x: 'positive' })).toBe(true);
	});
	it('ln((x−1)²) ≡ 2 ln|x−1|, ≢ 2 ln(x−1)', () => {
		expect(eq('\\ln\\left(\\left(x-1\\right)^{2}\\right)', '2\\ln\\left|x-1\\right|')).toBe(true);
		expect(eq('\\ln\\left(\\left(x-1\\right)^{2}\\right)', '2\\ln(x-1)')).toBe(false);
	});
	it('ln(x²y) ≡ 2 ln x + ln y sous l’hypothèse x > 0 (contexte transmis au produit)', () => {
		expect(eq('\\ln(x^{2}y)', '2\\ln x+\\ln y', { x: 'positive' })).toBe(true);
	});
	it('ln(x³) ≡ 3 ln x (inchangé)', () => {
		expect(eq('\\ln(x^{3})', '3\\ln x')).toBe(true);
	});
});
