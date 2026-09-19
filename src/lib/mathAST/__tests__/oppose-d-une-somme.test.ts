/**
 * L'opposé d'une somme doit garder ses parenthèses.
 *
 * ⚠️ Mesuré : `opposite(add(x, 2))` — c'est-à-dire **−(x + 2)** — était rendu
 * `"-x + 2"` en LaTeX **et** `"-x+2"` en syntaxe texte. Ce n'est pas une
 * question de style : la chaîne produite se relit `(−x) + 2`, une **autre**
 * expression. Le calcul était juste, son écriture était fausse.
 *
 * Trouvé en portant la fonction de coût : la règle `abs-negative` produit
 * exactement ce nœud sur `|x + 2|` quand `x < −3`, et la chaîne affichée
 * annonçait `-x + 2` au lieu de `-(x + 2)`.
 *
 * ⚠️ Le défaut ne se voyait pas parce que les nœuds écrits À LA MAIN portent un
 * `delimiter` explicite (le parseur en met un sur `-(x+2)`), et parce que la
 * normalisation distribue le signe. Seule une règle qui construit
 * `opposite(somme)` directement l'expose — c'est la même famille de piège que
 * les parenthèses obligatoires de la mise en facteur commun.
 */

import { describe, it, expect } from 'vitest';
import { opposite, add, subtract, multiply, variable, number } from '../factory';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';

const x = () => variable('x');

describe('en LaTeX', () => {
	it('−(x + 2) ne s’écrit pas « -x + 2 »', () => {
		expect(toLatex(opposite(add(x(), number('2'))))).toBe('-\\left( x + 2 \\right)');
	});

	it('−(x − 2) non plus', () => {
		expect(toLatex(opposite(subtract(x(), number('2'))))).toBe('-\\left( x - 2 \\right)');
	});

	it('mais l’opposé d’un produit ou d’une variable reste nu', () => {
		expect(toLatex(opposite(x()))).toBe('-x');
		expect(toLatex(opposite(multiply(number('2'), x(), 'implicit')))).toBe('-2 x');
	});
});

describe('en syntaxe texte', () => {
	it('−(x + 2) ne s’écrit pas « -x+2 »', () => {
		expect(toCustom(opposite(add(x(), number('2'))))).toBe('-(x+2)');
	});

	it('l’opposé d’une variable reste nu', () => {
		expect(toCustom(opposite(x()))).toBe('-x');
	});
});

describe('la chaîne produite se relit à l’identique', () => {
	/**
	 * ⚠️ La vraie garde : ce qu'on écrit doit se relire comme ce qu'on a écrit.
	 * Un test sur la forme exacte de la chaîne pourrait se contenter d'un style ;
	 * celui-ci vérifie le SENS.
	 */
	it('aller-retour par le parseur', async () => {
		const { parseCustomSafe } = await import('../parser/custom');
		const node = opposite(add(x(), number('2')));

		const relu = parseCustomSafe(toCustom(node)).ast;

		expect(relu).toBeDefined();
		expect(toCustom(relu!)).toBe(toCustom(node));
	});
});
