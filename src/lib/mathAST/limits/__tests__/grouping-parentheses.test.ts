/**
 * Limite saisie comme un élève : `\lim_{x\to a}\left(f\right)`.
 *
 * Une somme DOIT être parenthésée après `\lim` (le parseur refuse
 * `\lim … 3x^2-5x+1`), c'est donc la saisie la plus courante. L'oracle
 * (#908) relevait 144 limites « non supportées » ainsi écrites alors que f
 * seule était résolue : les parenthèses de tête masquaient f à toutes les
 * stratégies. Et `x\to -2^+` ne passait pas le parseur.
 *
 * Chaque cas asserte la VALEUR rendue (LaTeX), jamais seulement le statut.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { isLimit } from '../../guards';
import type { LimitResult } from '../types';

/** `statut valeur` : `exact 2`, `infinite +inf`, `unsupported null`. */
function describeLimit(result: LimitResult): string {
	if (result.value === null) return `${result.status} null`;
	if (result.value.type === 'infinity') {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

function studentLimit(latex: string): string {
	const node = parseLatex(latex);
	if (!isLimit(node)) throw new Error(`${latex} n'est pas une limite`);
	return describeLimit(evaluateLimit(node));
}

describe('\\lim(…) : les parenthèses de groupement sont transparentes', () => {
	it.each([
		['\\lim_{x\\to+\\infty}\\left(3x^2-5x+1\\right)', 'infinite +inf'],
		['\\lim_{x\\to-\\infty}\\left(3x^2-5x+1\\right)', 'infinite +inf'],
		['\\lim_{x\\to 0}\\left(\\frac{\\sin x}{x}\\right)', 'exact 1'],
		['\\lim_{x\\to 0}\\left(\\frac{\\sin(3x)}{x}\\right)', 'exact 3'],
		['\\lim_{x\\to 1}\\left(\\frac{x^2-1}{x-1}\\right)', 'exact 2'],
		['\\lim_{x\\to 1}\\left(\\left(\\frac{x^2-1}{x-1}\\right)\\right)', 'exact 2'],
		['\\lim_{x\\to+\\infty}\\left(\\left(\\left(2x^3-x\\right)\\right)\\right)', 'infinite +inf'],
		['\\lim_{x\\to 2}(3x+1)', 'exact 7']
	])('%s → %s', (latex, expected) => {
		expect(studentLimit(latex)).toBe(expected);
	});

	it('parenthèses internes : (1 + 1/x)^x en +∞ vaut e', () => {
		const result = evaluateLimit(
			parseLatex('\\left(1+\\frac{1}{x}\\right)^{x}'),
			'x',
			parseLatex('+\\infty')
		);
		expect(result.status).toBe('exact');
		expect(result.value && toLatex(result.value)).toMatch(/^(e|\\exp\\left\( 1 \\right\))$/);
	});

	it('la valeur absolue reste une valeur absolue', () => {
		expect(studentLimit('\\lim_{x\\to 2^+}\\left(\\frac{|x-2|}{x-2}\\right)')).toBe('exact 1');
		expect(studentLimit('\\lim_{x\\to 2^-}\\left(\\frac{|x-2|}{x-2}\\right)')).toBe('exact -1');
		expect(studentLimit('\\lim_{x\\to 2}\\left(\\frac{|x-2|}{x-2}\\right)')).toBe(
			'does-not-exist null'
		);
	});
});

describe('borne négative avec un côté : x\\to -2^+', () => {
	it.each([
		['\\lim_{x\\to -2^+}\\frac{1}{x+2}', 'infinite +inf'],
		['\\lim_{x\\to -2^-}\\frac{1}{x+2}', 'infinite -inf'],
		['\\lim_{x\\to -2^{+}}\\frac{3}{x+2}', 'infinite +inf'],
		['\\lim_{x\\to -\\frac{\\pi}{2}^+}\\tan x', 'infinite -inf']
	])('%s → %s', (latex, expected) => {
		expect(studentLimit(latex)).toBe(expected);
	});

	it('la borne est −2 et le côté est la droite', () => {
		const node = parseLatex('\\lim_{x\\to -2^+}\\frac{1}{x+2}');
		if (!isLimit(node)) throw new Error('pas une limite');
		expect(toLatex(node.approach)).toBe('-2');
		expect(node.direction).toBe('right');
	});

	it('les bornes signées sans côté sont inchangées', () => {
		for (const [latex, approach] of [
			['\\lim_{x\\to -2}x', '-2'],
			['\\lim_{x\\to -\\infty}x', '-\\infty'],
			['\\lim_{x\\to +\\infty}x', '+\\infty']
		]) {
			const node = parseLatex(latex);
			if (!isLimit(node)) throw new Error('pas une limite');
			expect(toLatex(node.approach)).toBe(approach);
			expect(node.direction).toBe('both');
		}
	});
});
