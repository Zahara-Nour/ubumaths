/**
 * Facteur commun polynomial quand **aucun des deux ne divise l'autre**.
 *
 * ## Ce que la PR #386 a laissé ouvert
 *
 * Elle a réglé la **divisibilité** : `(x+y)²/(x+y)` se réduit parce que le
 * dénominateur divise le numérateur. Mais quand les deux partagent un facteur
 * sans que l'un divise l'autre, la division exacte ne peut rien, et le moteur
 * se contredit toujours. Mesuré sur `main` à `59c62b499` :
 *
 * | entrée                       | `simplify` rend | `areEquivalent(entrée, ça)` |
 * | ---------------------------- | --------------- | --------------------------- |
 * | `(x²−y²)/(x²+2xy+y²)`        | `(x−y)/(x+y)`   | **`false`**                 |
 * | `(x+y)(x−y)/((x+y)(x+2y))`   | `(x−y)/(x+2y)`  | **`false`**                 |
 * | `(a+b)(a−b)/((a+b)(a+2b))`   | `(a−b)/(a+2b)`  | **`false`**                 |
 *
 * `simplify` y arrive par ses règles de factorisation, le décideur non : il lui
 * faut un **pgcd** multivarié, là où `tryUnivariateGcd` ne traite qu'une
 * variable et `gcdPolynomials` un monôme.
 *
 * ## L'invariant, encore lui
 *
 * `areEquivalent(e, simplify(e).result)` doit **toujours** valoir `true`. La
 * PR #386 l'a rétabli sur la divisibilité ; ce fichier le réclame sur le
 * facteur commun.
 *
 * ## Le risque, et le filet
 *
 * Un faux positif du décideur compte juste une réponse fausse d'élève. Le pgcd
 * n'a donc pas besoin d'être prouvé : tout candidat doit être **vérifié** par
 * division exacte des deux côtés avant d'être utilisé. Un candidat faux est
 * alors refusé, et la fraction reste telle quelle — un faux négatif, jamais un
 * faux positif.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('un facteur commun se simplifie même si aucun des deux ne divise l’autre', () => {
	it.each([
		['\\frac{x^2-y^2}{x^2+2xy+y^2}', '\\frac{x-y}{x+y}'],
		['\\frac{(x+y)(x-y)}{(x+y)(x+2y)}', '\\frac{x-y}{x+2y}'],
		['\\frac{(a+b)(a-b)}{(a+b)(a+2b)}', '\\frac{a-b}{a+2b}'],
		['\\frac{x^3-y^3}{x^2-y^2}', '\\frac{x^2+xy+y^2}{x+y}'],
		['\\frac{x^4-y^4}{x^3-y^3}', '\\frac{(x+y)(x^2+y^2)}{x^2+xy+y^2}'],
		['\\frac{2x^2-2y^2}{3x^2+6xy+3y^2}', '\\frac{2(x-y)}{3(x+y)}'],
		['\\frac{(x+y)^2(x-y)}{(x+y)(x-y)^2}', '\\frac{x+y}{x-y}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		['\\frac{x^2-y^2}{x^2+2xy+y^2}', '\\frac{x+y}{x-y}'],
		['\\frac{x^3-y^3}{x^2-y^2}', '\\frac{x^2-xy+y^2}{x+y}'],
		['\\frac{x^2+y^2}{x^2+2xy+y^2}', '\\frac{x-y}{x+y}'],
		['\\frac{(x+y)(x-y)}{(x+y)(x+2y)}', '\\frac{x-y}{x+3y}'],
		['\\frac{x^2-y^2}{x^2-z^2}', '\\frac{x-y}{x-z}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('non-régression : ce que la PR #386 avait acquis', () => {
	it.each([
		['\\frac{(x+y)^2}{x+y}', 'x+y'],
		['\\frac{x^2-y^2}{x-y}', 'x+y'],
		['\\frac{z(x+y)^2}{z(x+y)}', 'x+y'],
		['\\frac{x^2-1}{x+1}', 'x-1'],
		['\\frac{2ab}{a}', '2b'],
		['\\frac{1}{\\sqrt{2}}', '\\frac{\\sqrt{2}}{2}'],
		['\\frac{2}{x+y}', '\\frac{2}{x+y}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});

	it('la limite de la divisibilité recule mais ne disparaît pas partout', () => {
		// x+2y et (x+y)² n'ont aucun facteur commun : rien à réduire.
		expect(eq('\\frac{(x+y)^2}{x+2y}', 'x+y')).toBe(false);
	});
});

describe('areEquivalent(e, simplify(e)) vaut toujours true', () => {
	it.each([
		'\\frac{x^2-y^2}{x^2+2xy+y^2}',
		'\\frac{(x+y)(x-y)}{(x+y)(x+2y)}',
		'\\frac{(a+b)(a-b)}{(a+b)(a+2b)}',
		'\\frac{x^3-y^3}{x^2-y^2}',
		'\\frac{x^4-y^4}{x^3-y^3}',
		'\\frac{(x+y)^2}{x+2y}',
		'\\frac{x^2+y^2}{x+y}',
		'\\frac{x^2-y^2}{x-y}'
	])('%s', (entree) => {
		const node = parseLatex(entree);
		expect(areEquivalent(node, simplify(node).result)).toBe(true);
	});
});
