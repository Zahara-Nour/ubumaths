/**
 * Limite d'un produit par un facteur constant : lim k·f = k·lim f.
 *
 * Bug relevé dans l'atelier (vue Calcul) : x²/(3x²+1) donnait 1/3 en ±∞, mais
 * 2·(x²/(3x²+1)) sortait « non supportée ». La règle du produit ne combinait
 * que des limites infinies ou nulles (algèbre de l'infini) : un facteur
 * constant devant une forme que seul le terme dominant ou L'Hôpital lève
 * n'était jamais réduit.
 *
 * Chaque cas asserte la VALEUR rendue (LaTeX), jamais seulement le statut.
 * Coefficients ≠ 1 partout.
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

/** `statut valeur` : `exact \dfrac{2}{3}`, `infinite -inf`, `unsupported null`. */
function describeLimit(result: LimitResult): string {
	if (result.value === null) return `${result.status} null`;
	if (result.value.type === 'infinity') {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

function customLimit(input: string, at: string): string {
	return describeLimit(evaluateLimit(parseCustom(input), 'x', target(at)));
}

function latexLimit(input: string, at: string): string {
	return describeLimit(evaluateLimit(parseLatex(input), 'x', target(at)));
}

describe('lim k·f = k·lim f (facteur constant)', () => {
	it.each([
		// Le cas de l'atelier, en +∞ et en −∞
		['2*(x^2/(3x^2+1))', '+inf', 'exact \\dfrac{2}{3}'],
		['2*(x^2/(3x^2+1))', '-inf', 'exact \\dfrac{2}{3}'],
		// Facteur à droite
		['(x^2/(3x^2+1))*2', '+inf', 'exact \\dfrac{2}{3}'],
		// Le parseur custom lit 2*x^2/(…) comme 2·(x²/(…))
		['2*x^2/(3x^2+1)', '+inf', 'exact \\dfrac{2}{3}'],
		// Facteur négatif : le signe suit
		['-3*(x/(x+1))', '+inf', 'exact -3'],
		['-(x^2/(3x^2+1))', '+inf', 'exact -\\dfrac{1}{3}'],
		// Facteur fractionnaire
		['2/3*(x^2/(3x^2+1))', '+inf', 'exact \\dfrac{2}{9}'],
		// Facteur constant devant une fonction qui tend vers l'infini (∞ − ∞ dedans)
		['2*(x^2-x)', '+inf', 'infinite +inf'],
		['-2*(x^2-x)', '+inf', 'infinite -inf'],
		['-3*(x^3-x)', '-inf', 'infinite +inf'],
		// Point fini : forme 0/0 levée à l'intérieur
		['2*((x^2-1)/(x-1))', '1', 'exact 4'],
		['5*(sin(x)/x)', '0', 'exact 5'],
		// 0·f est la fonction nulle sur son domaine
		['0*(x^2/(3x^2+1))', '+inf', 'exact 0'],
		['0*x', '+inf', 'exact 0']
	])('lim %s en %s → %s', (input, at, expected) => {
		expect(customLimit(input, at)).toBe(expected);
	});

	it('même résultat depuis le LaTeX : 2\\cdot\\left(\\frac{x^2}{3x^2+1}\\right) → 2/3', () => {
		expect(latexLimit('2\\cdot\\left(\\frac{x^2}{3x^2+1}\\right)', '+inf')).toBe(
			'exact \\dfrac{2}{3}'
		);
		expect(latexLimit('\\frac{2}{3}\\left(\\frac{x^2}{3x^2+1}\\right)', '-inf')).toBe(
			'exact \\dfrac{2}{9}'
		);
	});

	// Facteur irrationnel : valeur exacte symbolique (LaTeX : le parseur custom
	// lit « pi » comme p·i)
	it.each([
		['\\pi\\left(\\frac{x^2}{3x^2+1}\\right)', '+inf', 'exact \\dfrac{\\pi}{3}'],
		['-2\\pi\\left(\\frac{x^2}{3x^2+1}\\right)', '-inf', 'exact -\\dfrac{2 \\pi}{3}'],
		['\\sqrt{2}\\left(x^2-x\\right)', '-inf', 'infinite +inf']
	])('lim %s en %s → %s', (input, at, expected) => {
		expect(latexLimit(input, at)).toBe(expected);
	});

	it('ne touche pas aux cas déjà résolus ni aux produits sans facteur constant', () => {
		expect(customLimit('x^2/(3x^2+1)', '+inf')).toBe('exact \\dfrac{1}{3}');
		expect(customLimit('-2*(x^2)', '+inf')).toBe('infinite -inf');
		// 0·∞ entre deux fonctions : forme indéterminée, rien d'inventé
		expect(customLimit('x*(1/x^2)', '+inf')).not.toMatch(/inf$/);
	});

	it('le tableau de variations (atelier) porte 2/3 aux deux bornes infinies', () => {
		const result = computeVariations(parseCustom('2*(x^2/(3x^2+1))'), {
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
	// Revue : un facteur nul ou non défini, calculé en flottant, ne doit
	// jamais produire une limite fausse rendue « exacte ».
	describe('facteur constant non sûr : la stratégie ne conclut pas à tort', () => {
		it.each([
			['\\sin(\\pi)\\cdot x', '+inf'],
			['\\cos(\\frac{\\pi}{2})\\cdot x', '+inf'],
			['(\\sqrt{2}^2-2)\\cdot x', '+inf'],
			['(\\sqrt{2}^2-2)\\cdot\\frac{x^2}{3x^2+1}', '+inf'],
			['\\tan(\\frac{\\pi}{2})\\cdot\\frac{x^2}{3x^2+1}', '+inf']
		])('lim %s en %s : ni infini, ni valeur exacte inventée', (input, at) => {
			const result = latexLimit(input, at);
			expect(result).not.toMatch(/inf$/);
			// Seule valeur exacte admissible : 0 (k vaut réellement 0 pour les quatre premiers)
			if (result.startsWith('exact')) expect(result).toBe('exact 0');
			expect(result).not.toMatch(/tan/);
		});
	});

	describe('limite intérieure nulle : la valeur rendue est 0, pas « 2 0 »', () => {
		it.each([
			['2\\cdot x\\sin(\\frac{1}{x})', '0'],
			['2\\cdot x\\cdot e^{-x}', '+inf'],
			['-(x-\\sqrt{x^2+1})', '+inf']
		])('lim %s en %s → exact 0', (input, at) => {
			expect(latexLimit(input, at)).toBe('exact 0');
		});
	});
});
