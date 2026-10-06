/**
 * L'ordre des termes d'une somme dans `tidy` (décision de David, 2026-10-06).
 *
 * Défaut relevé en revue de #876 : l'ordre par degré décroissant réécrivait
 * `1 − x` en `−x + 1`, jusque dans les corrections (dérivée de x + (1−x)²
 * finissant sur `1 − 2(−x + 1)`).
 *
 * - **Degré 1** (degré total de la somme, une ou plusieurs variables) : les
 *   termes négatifs passent derrière les positifs ; dans chaque groupe, ordre
 *   décroissant par degré. Si TOUS les termes sont négatifs : hors d'un
 *   facteur, ordre décroissant (`−x − 1`) ; dans un facteur (opérande d'un
 *   produit, base d'une puissance), le signe − est mis en facteur, parité
 *   respectée : `3(−x − 1)` → `−3(x + 1)`, `(−x − 1)²` → `(x + 1)²`.
 * - **Degré ≥ 2** : ordre décroissant, toujours (`−x² + x + 1`).
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { tidyTerms } from '../terms';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { differentiate } from '../../differentiation';
import type { MathNode } from '../../types';

const t = (s: string) => toCustom(tidy(parseCustom(s)));

function derivative(latex: string): MathNode {
	return differentiate(parseLatex(latex) as MathNode, { variable: 'x', simplify: true });
}

describe('degré 1 : les positifs devant, les négatifs derrière', () => {
	it.each([
		['-x+1', '1-x'],
		['1-x', '1-x'],
		['-2x+3', '3-2x'],
		['3-2x', '3-2x'],
		['-3+x', 'x-3'],
		['-a+b', 'b-a'],
		// le x de tête devient −x au regroupement
		['x+1-2x', '1-x'],
		// plusieurs variables : décroissant par degré dans chaque groupe
		['-x+2y+1', '2y+1-x'],
		['-2x+y-3', 'y-2x-3']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it.each([
		['x-1', 'x-1'],
		['2x+3', '2x+3'],
		['2+x', 'x+2'],
		// tous négatifs, hors d'un facteur : ordre décroissant
		['-x-1', '-x-1'],
		['-1-x', '-x-1']
	])('témoin : tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('degré 1 dans un facteur', () => {
	it.each([
		['(1-x)^2', '(1-x)^2'],
		['(-x+1)^2', '(1-x)^2'],
		['2*(1-x)', '2(1-x)'],
		// tous négatifs : le signe − sort, parité respectée
		['3(-x-1)', '-3(x+1)'],
		['(-x-1)^2', '(x+1)^2'],
		['(-x-1)^3', '-(x+1)^3'],
		['x(-x-1)', '-x(x+1)']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('degré ≥ 2 : ordre décroissant, toujours', () => {
	it.each([
		['1+x-x^2', '-x^2+x+1'],
		['x^2-3x+1', 'x^2-3x+1'],
		['-x^2+3x', '-x^2+3x'],
		['3x-x^2', '-x^2+3x'],
		// pas de mise en facteur du signe hors du degré 1
		['(-x^2-1)^2', '(-x^2-1)^2']
	])('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('tidy est idempotent', () => {
	it.each([
		'-x+1',
		'x+1-2x',
		'-x+2y+1',
		'-x-1',
		'3(-x-1)',
		'(-x-1)^2',
		'(-x-1)^3',
		'x(-x-1)',
		'1+x-x^2',
		'3x-x^2'
	])('tidy(tidy(%s))', (s) => {
		const once = tidy(parseCustom(s));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});
});

describe('dérivées mises au propre : (1 − x) reste (1 − x)', () => {
	it.each([
		['x+(1-x)^2', '1-2(1-x)', '1 - 2 \\left( 1 - x \\right)'],
		['x^2+(1-x)^3', '2x-3(1-x)^2', '2 x - 3 \\left( 1 - x \\right)^2']
	])('tidyTerms((%s)′) = %s', (input, custom, latex) => {
		const tidied = tidyTerms(derivative(input));
		expect(toCustom(tidied)).toBe(custom);
		expect(toLatex(tidied)).toBe(latex);
	});

	it.each([
		['x+(1-x)^2', '1-2(1-x)'],
		// degré 2 (le facteur (1 − x)²) : ordre décroissant, mais (1 − x) garde son écriture
		['x^2+(1-x)^3', '-3(1-x)^2+2x'],
		['-3x^2+2x', '2-6x']
	])('tidy((%s)′) = %s', (input, custom) => {
		expect(toCustom(tidy(derivative(input)))).toBe(custom);
	});

	it('tidyTerms suit tidy quand seul le signe de tête change : (−3x² + 2x)′ = 2 − 6x', () => {
		expect(toCustom(tidyTerms(derivative('-3x^2+2x')))).toBe('2-6x');
	});
});
