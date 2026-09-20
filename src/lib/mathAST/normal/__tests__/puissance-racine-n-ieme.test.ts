/**
 * `(ⁿ√a)^k` vaut `a^{k/n}`, pas `a^{k/2}`.
 *
 * ## Le bug, mesuré sur `main` à `270ce0311`
 *
 * La règle « puissance d'une racine » divisait l'exposant par **2**, en dur,
 * alors que l'indice de la racine est disponible sur le nœud. Toute racine
 * autre que carrée était donc traitée comme une racine carrée.
 *
 * | expression | forme normale rendue | valeur juste |
 * | --- | --- | --- |
 * | `(∛x)²` | `x` | `x^{2/3}` |
 * | `(∛x)³` | `x^{3/2}` | `x` |
 * | `(⁴√x)²` | `x` | `x^{1/2}` |
 *
 * Deux de ces trois lignes sont des **faux positifs** du décideur : `(∛x)² ≡ x`
 * et `(⁴√x)² ≡ x` rendaient `true`. Un faux positif compte JUSTE une réponse
 * FAUSSE d'élève, c'est la seule faute qui ne se rattrape pas.
 *
 * ## Comment il se manifestait
 *
 * `simplify(∛x·∛x)` rendait `x`. La trace montre `tidy` produisant `(∛x)²`,
 * ce qui est juste, puis l'étape suivante repliant ça en `x` par le chemin
 * fautif. Le produit `∛x·∛x` avait pourtant la bonne forme normale,
 * `x^{2/3}` : seule la mise en puissance explicite se trompait.
 *
 * ## Même angle mort que la veille, ailleurs
 *
 * `parseLatex('\sqrt[3]{x}')` rend une fonction nommée `sqrt` avec **un seul
 * argument**, l'indice étant rangé à part dans `base`. Tout test de la forme
 * `name === 'sqrt' && args.length === 1` confond donc les deux. La PR #388
 * avait fermé ce trou dans la fusion des radicaux ; celui-ci était dans la
 * mise en puissance.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { toLatex } from '../../index';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('la puissance d’une racine divise par l’INDICE', () => {
	it.each([
		['\\sqrt[3]{x}^{2}', 'x^{2/3}'],
		['\\sqrt[3]{x}^{3}', 'x'],
		['\\sqrt[3]{x}^{6}', 'x^{2}'],
		['\\sqrt[4]{x}^{2}', '\\sqrt{x}'],
		['\\sqrt[4]{x}^{4}', 'x'],
		['\\sqrt[6]{x}^{3}', '\\sqrt{x}'],
		['\\sqrt[3]{8}^{2}', '4'],
		['\\sqrt[3]{x}^{-3}', '\\frac{1}{x}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('aucun faux positif : une racine n-ième n’est pas une racine carrée', () => {
	it.each([
		['\\sqrt[3]{x}^{2}', 'x'],
		['\\sqrt[4]{x}^{2}', 'x'],
		['\\sqrt[3]{x}^{2}', '\\sqrt{x}'],
		['\\sqrt[5]{x}^{2}', 'x'],
		['\\sqrt[3]{x}^{3}', 'x^{3/2}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('la racine carrée n’est pas touchée', () => {
	it.each([
		['\\sqrt{x}^{2}', 'x'],
		['\\sqrt{x}^{3}', 'x\\sqrt{x}'],
		['\\sqrt{x}^{4}', 'x^{2}'],
		['\\sqrt{x}\\sqrt{x}', 'x'],
		['\\sqrt{2}^{2}', '2'],
		['\\sqrt[2]{x}^{2}', 'x']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('l’affichage cesse de se contredire', () => {
	it.each([
		'\\sqrt[3]{x}\\sqrt[3]{x}',
		'\\sqrt[3]{x}\\sqrt[3]{x}\\sqrt[3]{x}',
		'\\sqrt[4]{x}\\sqrt[4]{x}',
		'\\sqrt[3]{x}^{2}',
		'\\sqrt{x}\\sqrt{x}'
	])('areEquivalent(%s, simplify(…)) vaut true', (entree) => {
		const node = parseLatex(entree);
		expect(areEquivalent(node, simplify(node).result)).toBe(true);
	});

	it('trois racines cubiques rendent bien le radicande', () => {
		expect(toLatex(simplify(parseLatex('\\sqrt[3]{x}\\sqrt[3]{x}\\sqrt[3]{x}')).result)).toBe('x');
	});
});
