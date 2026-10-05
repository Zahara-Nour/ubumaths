/**
 * Revue #875 : une limite finie EXACTE sortait en décimal flottant.
 *
 * lim_{x→+∞} (2x²+1)/(3x²−x) affichait « 0.6666666666666666 » au lieu de 2/3 :
 * quotient des coefficients dominants, L'Hôpital après dérivation et
 * substitution directe calculaient la valeur en flottant. Une valeur exacte à
 * coefficients rationnels se rend en nœud exact (entier ou fraction réduite) ;
 * un flottant n'apparaît qu'avec le statut 'approximate'.
 *
 * Chaque cas asserte la VALEUR exacte (LaTeX) et le statut 'exact'.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { positiveInfinity, negativeInfinity } from '../../factory';
import { parseLatex } from '../../parser';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import { computeVariations } from '../../variations/compute';
import type { LimitResult } from '../types';
import type { MathNode } from '../../types';

function target(at: string): MathNode {
	if (at === '+inf') return positiveInfinity();
	if (at === '-inf') return negativeInfinity();
	return parseLatex(at);
}

function limitOf(latex: string, at: string): LimitResult {
	return evaluateLimit(parseLatex(latex), 'x', target(at));
}

/** `+inf`, `-inf`, ou le LaTeX de la valeur finie ; sinon `statut:null`. */
function describeLimit(result: LimitResult): string {
	if (result.value === null) return `${result.status}:null`;
	if (result.value.type === 'infinity') {
		return result.value.sign === 'positive' ? '+inf' : '-inf';
	}
	return toLatex(result.value);
}

describe('Limites finies exactes : fraction réduite, jamais un flottant', () => {
	it.each([
		// Quotient des coefficients dominants
		['\\frac{2x^2+1}{3x^2-x}', '+inf', '\\dfrac{2}{3}'],
		['\\frac{2x^2+1}{3x^2-x}', '-inf', '\\dfrac{2}{3}'],
		['\\frac{3x-1}{6x+5}', '+inf', '\\dfrac{1}{2}'],
		['\\frac{-4x^3}{6x^3+x}', '+inf', '-\\dfrac{2}{3}'],
		['\\frac{-4x^3}{6x^3+x}', '-inf', '-\\dfrac{2}{3}'],
		['\\frac{6x^2}{4x^2+1}', '+inf', '\\dfrac{3}{2}'],
		['\\frac{3x^2-2x}{5x^2+7}', '+inf', '\\dfrac{3}{5}'],
		// L'Hôpital / conjugué / limites usuelles en 0
		['\\frac{\\sqrt{x+1}-1}{x}', '0', '\\dfrac{1}{2}'],
		['\\frac{\\sqrt{x+4}-2}{x}', '0', '\\dfrac{1}{4}'],
		['\\frac{\\sin(3x)}{2x}', '0', '\\dfrac{3}{2}'],
		['\\frac{\\sin(2x)}{3x}', '0', '\\dfrac{2}{3}'],
		['\\frac{e^x-1}{2x}', '0', '\\dfrac{1}{2}'],
		['\\frac{\\ln(1+2x)}{3x}', '0', '\\dfrac{2}{3}'],
		['\\frac{1-\\cos(x)}{x^2}', '0', '\\dfrac{1}{2}'],
		// Forme 0/0 en un point
		['\\frac{x-1}{x^2-1}', '1', '\\dfrac{1}{2}'],
		['\\frac{x^2-2x}{x^2-4}', '2', '\\dfrac{1}{2}'],
		// Substitution directe
		['\\frac{x+1}{x+2}', '1', '\\dfrac{2}{3}'],
		['\\frac{1}{x-1}', '3', '\\dfrac{1}{2}'],
		// Constante
		['\\frac{2}{3}', '1', '\\dfrac{2}{3}']
	] as const)('lim (%s) en %s = %s', (latex, at, expected) => {
		const result = limitOf(latex, at);
		expect(result.status).toBe('exact');
		expect(describeLimit(result)).toBe(expected);
	});
});

describe('Témoins : limites déjà exactes inchangées', () => {
	it.each([
		['\\frac{x^2-4}{x-2}', '2', '4'],
		['\\frac{x^3-8}{x-2}', '2', '12'],
		['\\frac{4x+2}{2x-1}', '+inf', '2'],
		['\\frac{x^2+1}{x^2}', '+inf', '1'],
		['\\frac{x}{x^2+1}', '+inf', '0'],
		['\\frac{\\sin x}{x}', '0', '1'],
		['\\frac{e^{2x}-1}{x}', '0', '2'],
		['x^2+3x', '1', '4'],
		['\\frac{x^3}{x+1}', '-inf', '+inf'],
		['\\frac{x^2}{x+1}', '-inf', '-inf'],
		['\\frac{\\sqrt{x}-2}{x-4}', '4', '\\dfrac{1}{4}'],
		['\\sqrt{x^2+x}-x', '+inf', '\\dfrac{1}{2}']
	] as const)('lim (%s) en %s = %s', (latex, at, expected) => {
		expect(describeLimit(limitOf(latex, at))).toBe(expected);
	});
});

describe('Tableau de variations : limite exacte aux bornes (asymptote horizontale)', () => {
	it('(2x²+1)/(3x²−x) en ±∞ : 2/3 au tableau', () => {
		const result = computeVariations(parseCustom('(2x^2+1)/(3x^2-x)'), {
			variable: 'x',
			includeBoundaryLimits: true
		});
		const limits = (result.boundaryLimits ?? []).filter((bl) =>
			['+\\infty', '-\\infty'].includes(toLatex(bl.point))
		);
		expect(limits).toHaveLength(2);
		for (const bl of limits) {
			expect(typeof bl.limit).not.toBe('string');
			expect(toLatex(bl.limit as MathNode)).toBe('\\dfrac{2}{3}');
		}
	});

	// Revue #877 : une borne exacte 2/3 doit garder sa valeur approchée, sinon
	// la fonction passe pour non bornée et le minimum global redevient local
	it.each(['\\frac{2x^2}{3x^2+1}', '\\frac{x^2}{2x^2+1}', '\\frac{x^2}{x^2+1}'])(
		'%s : bornes finies lues (approximate) → minimum global en 0',
		(latex) => {
			const result = computeVariations(parseLatex(latex), {
				variable: 'x',
				includeBoundaryLimits: true
			});
			for (const bl of result.boundaryLimits ?? []) {
				expect(Number.isFinite(bl.approximate)).toBe(true);
			}
			expect(result.extrema.map((e) => e.type)).toEqual(['global_minimum']);
		}
	);
});
