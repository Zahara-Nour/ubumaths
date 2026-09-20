/**
 * `√a · √a` vaut `a`, pas `|a|`.
 *
 * ## Le symptôme : le moteur refuse encore sa propre sortie
 *
 * `simplify(√x·√x)` rend `x`, et `areEquivalent` déclare l'entrée **non
 * équivalente** à cette sortie. Mesuré sur `main` à `fe89e8367`.
 *
 * ## La chaîne, et l'étape qui perd l'information
 *
 * 1. `rules/radicals.ts` fusionne `√a · √b` en `√(a·b)`. C'est valide **parce
 *    que** les deux radicaux sont écrits, donc `a ≥ 0` et `b ≥ 0`.
 * 2. `normalize` applique ensuite `√(a²) = |a|`, qui est correcte **en soi**.
 *
 * La perte est entre les deux. L'étape 1 ne pouvait s'appliquer que sous
 * `a ≥ 0` ; l'étape 2 reçoit `√(a²)`, qui est défini sur tout ℝ, et ne sait
 * plus d'où il vient. La valeur absolue qu'elle ajoute est donc inutile ici.
 *
 * Trois verdicts en découlaient, dont **un seul** était faux :
 *
 * | égalité              | avant     | jugement                          |
 * | -------------------- | --------- | --------------------------------- |
 * | `√(x²) ≡ \|x\|`      | `true`    | juste                             |
 * | `√(x²) ≡ x`          | `false`   | juste, les deux diffèrent en x<0  |
 * | `√x·√x ≡ x`          | **`false`** | **faux**, écrire `√x` impose x≥0 |
 *
 * ## Le correctif
 *
 * La fusion rend le radicande lui-même quand les deux radicandes sont
 * identiques, au lieu de fabriquer un carré dont la provenance sera oubliée.
 * La règle `√(a²) = |a|` n'est pas touchée : elle reste juste pour un carré que
 * l'élève a écrit.
 *
 * ## La conséquence assumée
 *
 * `√x·√x ≡ |x|` passe de `true` à `false`. Les deux sont pourtant égaux sur
 * `[0, +∞)`, le seul domaine où le membre de gauche existe. Le décideur ne
 * porte aucune information de domaine, donc il compare `x` à `|x|` et les
 * sépare. C'est le prix de ce correctif, et il est bien moins cher que
 * l'inverse : `√x·√x ≡ x` est ce qu'un élève écrit, `√x·√x ≡ |x|` est exotique.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('un produit de deux racines identiques vaut le radicande', () => {
	it.each([
		['\\sqrt{x}\\sqrt{x}', 'x'],
		['\\sqrt{x+1}\\sqrt{x+1}', 'x+1'],
		['\\sqrt{xy}\\sqrt{xy}', 'xy'],
		['2\\sqrt{x}\\sqrt{x}', '2x'],
		['\\frac{\\sqrt{x}\\sqrt{x}}{x}', '1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('la règle √(a²) = |a| n’est pas touchée', () => {
	it('un carré écrit par l’élève garde sa valeur absolue', () => {
		expect(eq('\\sqrt{x^2}', '|x|')).toBe(true);
		// Juste : les deux diffèrent pour x < 0.
		expect(eq('\\sqrt{x^2}', 'x')).toBe(false);
	});

	it('et les autres fusions de radicaux continuent', () => {
		expect(eq('\\sqrt{x}\\sqrt{y}', '\\sqrt{xy}')).toBe(true);
		expect(eq('\\sqrt{2}\\sqrt{2}', '2')).toBe(true);
		expect(eq('\\sqrt{x}\\sqrt{x}\\sqrt{x}', 'x\\sqrt{x}')).toBe(true);
		expect(eq('\\sqrt{2}\\sqrt{8}', '4')).toBe(true);
	});
});

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		['\\sqrt{x}\\sqrt{x}', 'y'],
		['\\sqrt{x}\\sqrt{x}', 'x^2'],
		['\\sqrt{x}\\sqrt{y}', 'xy'],
		['\\sqrt{x+1}\\sqrt{x+1}', 'x']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('la conséquence assumée', () => {
	it('√x·√x ne s’apparie plus à |x|, faute d’information de domaine', () => {
		// Mathématiquement égaux sur [0, +∞), le seul domaine où le membre de
		// gauche existe. Le décideur ne porte pas les domaines : il compare `x`
		// à `|x|`. Faux négatif assumé, et bien moins coûteux que l'inverse.
		expect(eq('\\sqrt{x}\\sqrt{x}', '|x|')).toBe(false);
	});
});

describe('le moteur ne refuse plus sa propre sortie', () => {
	it.each([
		'\\sqrt{x}\\sqrt{x}',
		'\\sqrt{x+1}\\sqrt{x+1}',
		'\\sqrt{x^2}',
		'\\sqrt{x}\\sqrt{y}',
		'\\sqrt{x}\\sqrt{x}\\sqrt{x}'
	])('%s', (entree) => {
		const node = parseLatex(entree);
		expect(areEquivalent(node, simplify(node).result)).toBe(true);
	});
});
