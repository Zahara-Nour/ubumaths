/**
 * `\lim` sans parenthèses porte sur toute l'expression qui suit (décision du
 * 2026-10-07). Avant, le parseur rattachait à `\lim` le premier facteur :
 * `\lim_{x\to+\infty}3x^2` devenait (lim 3)·x² et evaluateLimit recevait un
 * produit (« Variable and approach point required »).
 *
 * Chaque cas asserte la VALEUR rendue.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { isLimit, isRelation } from '../../guards';
import type { LimitResult } from '../types';

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

describe('\\lim sans parenthèses : la limite porte sur toute l’expression', () => {
	it.each([
		['\\lim_{x\\to+\\infty}3x^2-5x+1', 'infinite +inf'],
		['\\lim_{x\\to+\\infty}\\sqrt{x^2+1}-x', 'exact 0'],
		['\\lim_{x\\to 0}\\frac{\\sin x}{x}+1', 'exact 2'],
		['\\lim_{x\\to+\\infty}x^2+3x+1', 'infinite +inf'],
		['\\lim_{n\\to+\\infty}3\\sqrt{n}', 'infinite +inf'],
		['\\lim_{x \\to +\\infty } 2 - \\dfrac{3}{\\ln(x)}', 'exact 2'],
		['\\lim_{x\\to+\\infty}-2x^{3}+x', 'infinite -inf']
	])('%s → %s', (latex, expected) => {
		expect(studentLimit(latex)).toBe(expected);
	});

	it.each([
		['\\lim_{x\\to0}\\frac{\\sin x}{x}+\\sqrt{2}', 'exact 1 + \\sqrt{2}'],
		['\\lim_{x\\to0}\\frac{\\sin x}{x}+\\ln 2', 'exact 1 + \\ln\\left( 2 \\right)'],
		['\\lim_{x\\to0}\\frac{\\sin x}{x}+e', 'exact 1 + e'],
		['\\lim_{x\\to0}\\pi+\\sqrt{2}+\\frac{\\sin x}{x}', 'exact \\pi + \\sqrt{2} + 1'],
		['\\lim_{x\\to0}\\frac{\\ln(1+x)}{x}+\\sqrt2', 'exact 1 + \\sqrt{2}']
	])(
		'constante irrationnelle gardée symbolique, jamais une fraction décimale : %s → %s',
		(latex, expected) => {
			expect(studentLimit(latex)).toBe(expected);
		}
	);

	it.each([
		['\\lim_{x\\to0}\\frac{\\tan x}{x}-1', 'exact 0'],
		['\\lim_{x\\to0}\\frac{\\sin x}{x}-\\cos x', 'exact 0'],
		['\\lim_{x\\to0}\\frac{\\sin x}{x}-x-1', 'exact 0'],
		['\\lim_{x\\to0^-}\\frac{|x|}{x}+1', 'exact 0']
	])('somme des limites réduite : %s → %s', (latex, expected) => {
		expect(studentLimit(latex)).toBe(expected);
	});

	it('limite d’une constante irrationnelle : √2 symbolique, pas 1.41421356237309', () => {
		expect(studentLimit('\\lim_{x\\to0}\\sqrt{2}')).toBe('exact \\sqrt{2}');
	});

	it('\\lim_{x\\to1}x^2=1 : relation dont le membre de gauche est lim x² = 1', () => {
		const node = parseLatex('\\lim_{x\\to1}x^2=1');
		if (!isRelation(node) || !isLimit(node.left)) throw new Error('relation attendue');
		expect(describeLimit(evaluateLimit(node.left))).toBe('exact 1');
	});

	it('\\lim A + \\lim B : chaque limite est évaluée séparément', () => {
		const node = parseLatex('\\lim_{x\\to2}x^2+\\lim_{x\\to0}\\frac{\\sin x}{x}');
		if (node.type !== 'addition' || !isLimit(node.left) || !isLimit(node.right)) {
			throw new Error('somme de deux limites attendue');
		}
		expect(describeLimit(evaluateLimit(node.left))).toBe('exact 4');
		expect(describeLimit(evaluateLimit(node.right))).toBe('exact 1');
	});

	it('(\\lim_{x\\to0}x)+1 : la parenthèse explicite garde son sens', () => {
		const node = parseLatex('(\\lim_{x\\to0}x)+1');
		expect(node.type).toBe('addition');
	});
});
