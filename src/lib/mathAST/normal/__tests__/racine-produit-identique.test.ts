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

/**
 * ⚠️ La règle ne vaut QUE pour l'indice 2.
 *
 * `√a · √a = a` parce que `√a` est la puissance 1/2. Pour un indice `n`,
 * `ⁿ√a · ⁿ√a = a^{2/n}`, qui ne vaut `a` que si `n = 2`.
 *
 * Le piège est dans le nœud : `parseLatex('\sqrt[3]{x}')` rend une fonction
 * nommée `sqrt` avec **un seul argument**, l'indice étant rangé à part dans
 * `base`. Un test sur le nom et le nombre d'arguments ne les distingue donc
 * pas, et la première version de ce correctif faisait rendre `true` à
 * `∛x·∛x ≡ x`.
 *
 * Mesuré, campagne numérique de 400 tirages : aucun point du domaine commun ne
 * valide cette égalité. Sur `main` elle rendait `false`. C'était un faux
 * positif introduit par ce correctif, c'est-à-dire la seule faute qui compte
 * JUSTE une réponse FAUSSE d'élève.
 */
describe('la règle s’arrête à l’indice 2', () => {
	it.each([
		['\\sqrt[3]{x}\\sqrt[3]{x}', 'x'],
		['\\sqrt[4]{x}\\sqrt[4]{x}', 'x'],
		['\\sqrt[3]{x}\\sqrt{x}', 'x'],
		['\\sqrt[3]{8}\\sqrt[3]{8}', '8'],
		['\\sqrt[5]{x}\\sqrt[5]{x}', 'x']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('et l’indice 2 explicite marche comme l’implicite', () => {
		expect(eq('\\sqrt[2]{x}\\sqrt[2]{x}', 'x')).toBe(true);
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

// =============================================================================
// La limite : une chaîne de quatre racines sur un radicande composé
// =============================================================================

/**
 * Le correctif casse la chaîne de fusion, et ça se paie à partir de quatre
 * racines quand le radicande n'est pas une simple variable.
 *
 * Le produit plat est associé à gauche : `((√b·√b)·√b)·√b`. La règle exige que
 * ses DEUX enfants soient des racines. En rendant le radicande, qui n'en est
 * plus une, elle casse la chaîne : le parent devient `b·√b` et les deux
 * dernières racines ne fusionnent jamais. Sur `main`, le retour `√(b·b)` restait
 * une racine et la chaîne allait jusqu'à `√(b⁴)`.
 *
 * Ce qui reste bloque alors sur une faiblesse **préexistante** : un facteur dont
 * la base est composée et l'exposant 1 ne se remet pas à plat. Mesuré,
 * `(x+1)·√(x+1)·√(x+1) ≢ (x+1)²` rend le même hachage faux sur `main` et ici.
 *
 * Bilan mesuré sur `(√b)^n ≡ b^{n/2}`, 10 radicandes × n de 2 à 5 :
 *
 * | | `main` | branche |
 * | --- | --- | --- |
 * | réussites | 15/40 | **26/40** |
 *
 * Quinze gains, tous à n = 2 et n = 3, contre quatre reculs, tous à n = 4 sur
 * un radicande composé. Un élève écrit `√x·√x`, pas quatre racines de `xy` à la
 * suite. Le compromis est assumé, mais il n'est pas nul et ce bloc le pinne.
 */
describe('limite assumée : quatre racines d’un radicande composé', () => {
	it.each([
		['\\sqrt{xy}\\sqrt{xy}\\sqrt{xy}\\sqrt{xy}', '(xy)^{2}'],
		['\\sqrt{2x}\\sqrt{2x}\\sqrt{2x}\\sqrt{2x}', '(2x)^{2}']
	])('%s ≢ %s, faute de chaîne', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('mais deux et trois racines marchent, y compris sur un radicande composé', () => {
		expect(eq('\\sqrt{xy}\\sqrt{xy}', 'xy')).toBe(true);
		expect(eq('\\sqrt{xy}\\sqrt{xy}\\sqrt{xy}', 'xy\\sqrt{xy}')).toBe(true);
		expect(eq('\\sqrt{2x}\\sqrt{2x}', '2x')).toBe(true);
	});

	it('et une variable simple va jusqu’au bout', () => {
		expect(eq('\\sqrt{x}\\sqrt{x}\\sqrt{x}\\sqrt{x}', 'x^{2}')).toBe(true);
	});
});

// =============================================================================
// Gains collatéraux, mesurés
// =============================================================================

/**
 * Le correctif répare au passage le piège classique des complexes, et la garde
 * d'indice supprime un faux positif de `main`.
 */
describe('gains collatéraux', () => {
	it('le piège des complexes : √(−1)·√(−1) vaut −1, pas 1', () => {
		expect(eq('\\sqrt{-1}\\sqrt{-1}', '-1')).toBe(true);
		expect(eq('\\sqrt{-1}\\sqrt{-1}', '1')).toBe(false);
	});

	it('la garde d’indice retire un faux positif de main : ∛x·∛y ≢ √(xy)', () => {
		expect(eq('\\sqrt[3]{x}\\sqrt[3]{y}', '\\sqrt{xy}')).toBe(false);
		// Contrepartie : `∛x·∛y ≡ ∛(xy)`, vrai, n'est plus prouvé. Faux négatif
		// assumé — la fusion ne sait pas transporter l'indice.
		expect(eq('\\sqrt[3]{x}\\sqrt[3]{y}', '\\sqrt[3]{xy}')).toBe(false);
	});

	it.each([
		['\\sqrt{\\frac{1}{x}}\\sqrt{\\frac{1}{x}}', '\\frac{1}{x}'],
		['\\sqrt{\\sin(x)}\\sqrt{\\sin(x)}', '\\sin(x)'],
		['\\sqrt{-x}\\sqrt{-x}', '-x'],
		['\\sqrt{x}\\sqrt{x}+\\sqrt{y}\\sqrt{y}', 'x+y']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});
