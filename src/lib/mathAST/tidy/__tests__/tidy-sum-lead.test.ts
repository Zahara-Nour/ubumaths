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

/**
 * Une somme opérande d'un `−` (binaire ou unaire) n'est PAS un facteur : son
 * signe ne sort pas. Sinon `x − (−x − 1)` devenait `(x + 1) + x`, que le
 * passage suivant aplatissait en `2x + 1` — `tidy` n'était plus idempotent.
 */
describe("somme toute négative, opérande d'un − : le signe ne sort pas", () => {
	const cases: [string, string][] = [
		['x-(-x-1)', 'x-(-x-1)'],
		['(x+1)-(-x-1)', 'x+1-(-x-1)'],
		['-(-x-1)+1', '1-(-x-1)'],
		['-(-x-1)', '-(-x-1)'],
		['(-x-1)^2-(-x-1)', '(x+1)^2-(-x-1)'],
		// le premier terme est un vrai facteur (retourné), le second non
		['y(-x-1)-(-y-1)', '-y(x+1)-(-y-1)']
	];

	it.each(cases)('tidy(%s) = %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it.each(cases.map(([input]) => input))('tidy(tidy(%s)) stable', (s) => {
		const once = tidy(parseCustom(s));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
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

/**
 * Une somme SANS variable : le nombre rationnel passe en tête, comme dans les
 * manuels (décision de David, 2026-10-12) — `1 + √5`, `3 + 2√2`, `1 + ln 2`.
 * `e`, `i`, `π` sont des constantes, pas des variables.
 *
 * Un rationnel NÉGATIF ne passe en tête que si tous les autres termes sont
 * négatifs aussi : `√2 − 1` garde son écriture (pas de signe − en tête quand on
 * peut l'éviter), `−√2 − 1` devient `−1 − √2`.
 *
 * Une somme qui contient une variable garde l'ordre ci-dessus (`x + 1`).
 */
describe('somme sans variable : le rationnel en tête', () => {
	const l = (s: string) => toLatex(tidy(parseLatex(s) as MathNode));

	it.each([
		['\\sqrt5+1', '1 + \\sqrt{5}'],
		['1+\\sqrt5', '1 + \\sqrt{5}'],
		['\\dfrac{\\sqrt5+1}{2}', '\\dfrac{1 + \\sqrt{5}}{2}'],
		['2\\sqrt2+3', '3 + 2 \\sqrt{2}'],
		['\\ln2+1', '1 + \\ln\\left( 2 \\right)'],
		['-\\dfrac3e+2', '2 - \\dfrac{3}{\\exponentialE}'],
		['\\sqrt3+\\dfrac12', '\\dfrac{1}{2} + \\sqrt{3}'],
		['2\\pi+3', '3 + 2 \\pi'],
		['\\exponentialE^2+1', '1 + \\exponentialE^2'],
		['2\\imaginaryI+1', '1 + 2 \\imaginaryI'],
		// `e` et `i` saisis comme des lettres : ce sont des constantes
		['e^2+1', '1 + \\exponentialE^2'],
		['2i+1', '1 + 2 \\imaginaryI'],
		['\\pi+1', '1 + \\pi'],
		['\\sqrt2+\\sqrt3+2', '2 + \\sqrt{2} + \\sqrt{3}'],
		// une fonction usuelle en un nombre est une constante
		['2\\sin(1)+1', '1 + 2 \\sin\\left( 1 \\right)'],
		['\\arctan(2)+1', '1 + \\arctan\\left( 2 \\right)'],
		['\\sqrt[3]{2}+1', '1 + \\sqrt[3]{2}'],
		// degré 1 : les négatifs restent derrière, le rationnel passe devant
		['\\ln(3)-\\ln(2)+1', '1 + \\ln\\left( 3 \\right) - \\ln\\left( 2 \\right)'],
		// une somme imbriquée sans variable, dans une expression qui en a une
		['x\\ln(\\sqrt2+1)', 'x \\ln\\left( 1 + \\sqrt{2} \\right)'],
		// tous négatifs dans un facteur : le signe sort, puis le rationnel en tête
		['3(-\\sqrt2-1)', '-3 \\left( 1 + \\sqrt{2} \\right)'],
		['\\dfrac{-1-\\sqrt5}{2}', '-\\dfrac{1 + \\sqrt{5}}{2}']
	])('tidy(%s) = %s', (input, expected) => {
		expect(l(input)).toBe(expected);
	});

	it.each([
		// rationnel négatif, un autre terme positif : pas de − en tête
		['-1+\\sqrt2', '\\sqrt{2} - 1'],
		['\\sqrt2-1', '\\sqrt{2} - 1'],
		['\\dfrac{-1+\\sqrt5}{2}', '\\dfrac{\\sqrt{5} - 1}{2}'],
		['\\sqrt2-1+\\sqrt3', '\\sqrt{2} + \\sqrt{3} - 1'],
		// rationnel négatif, tous les autres négatifs : il passe en tête
		['-\\sqrt2-1', '-1 - \\sqrt{2}'],
		['-1-\\sqrt2', '-1 - \\sqrt{2}']
	])('rationnel négatif : tidy(%s) = %s', (input, expected) => {
		expect(l(input)).toBe(expected);
	});

	it.each([
		// témoins : une variable, l'ordre ne change pas
		['x^2+1', 'x^2 + 1'],
		['1+x', 'x + 1'],
		['\\sqrt2 x+1', 'x \\sqrt{2} + 1'],
		['x+\\sqrt2+1', '\\sqrt{2} + x + 1'],
		['u_0+1', 'u_0 + 1'],
		['\\alpha+1', '\\alpha + 1'],
		['3^x+1', '3^x + 1'],
		['\\sin x+1', '\\sin\\left( x \\right) + 1'],
		['f(x)+1', 'f\\left( x \\right) + 1'],
		['\\square+1', '\\square + 1'],
		['AB+1', 'A B + 1'],
		['\\exponentialE^{x+1}+1', '\\exponentialE^{x + 1} + 1'],
		['\\sqrt{x}+1', '\\sqrt{x} + 1'],
		['\\ln(x)+1', '\\ln\\left( x \\right) + 1'],
		// une fonction de l'énoncé (f, g, f′, f⁻¹) est une inconnue, même en un nombre
		['f(2)+1', 'f\\left( 2 \\right) + 1'],
		["f'(1)+3", "f'\\left( 1 \\right) + 3"],
		['g(0)+1', 'g\\left( 0 \\right) + 1'],
		// déjà en tête : inchangé
		['1-\\sqrt2', '1 - \\sqrt{2}'],
		['4-\\exponentialE', '4 - \\exponentialE']
	])('témoin : tidy(%s) = %s', (input, expected) => {
		expect(l(input)).toBe(expected);
	});

	it('une grandeur garde son ordre : tidy(1[m]+sqrt(2)[m]) = sqrt(2)[m]+1[m]', () => {
		expect(t('1[m]+sqrt(2)[m]')).toBe('sqrt(2)[m]+1[m]');
	});

	it.each([
		'\\sqrt5+1',
		'-\\sqrt2-1',
		'-1+\\sqrt2',
		'\\ln(3)-\\ln(2)+1',
		'3(-\\sqrt2-1)',
		'(-1-\\sqrt2)^2'
	])('tidy(tidy(%s)) stable', (s) => {
		const once = tidy(parseLatex(s) as MathNode);
		expect(toLatex(tidy(once))).toBe(toLatex(once));
	});
});
