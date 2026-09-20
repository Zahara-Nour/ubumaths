/**
 * La lettre `e` élevée à une puissance est l'exponentielle.
 *
 * ## L'incohérence, mesurée
 *
 * Le système a **déjà tranché** que `e` désigne le nombre d'Euler :
 * `evaluate(parseLatex('e'))` rend `2.718281828459045`. Seul le chemin
 * symbolique l'ignore. `e^{x}` est parsé en `superscript(variable e, x)`, alors
 * que la machinerie qui combine les exponentielles (`combineExpInMonomial`,
 * `combineExpInPolynomial`, `combineExpAcrossFraction`) ne reconnaît que les
 * nœuds **fonction** `exp`. Elle ne voit donc jamais passer `e^{x}`.
 *
 * Conséquence, mesurée sur `main` à `59c62b499` :
 *
 * | paire                          | verdict   |
 * | ------------------------------ | --------- |
 * | `exp(x)·exp(2x) ≡ exp(3x)`     | `true`    |
 * | `e^x·e^{2x} ≡ e^{3x}`          | **`false`** |
 * | `e^{2x}/e^{x} ≡ e^{x}`         | **`false`** |
 * | `e^{2} ≡ exp(2)`               | **`false`** |
 *
 * Les deux écritures du même objet ne se parlent pas. Ce n'est pas une
 * question de produit : l'évaluateur a déjà décidé.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * L'identification vit sur le chemin du décideur, jamais dans la forme
 * affichée : `simplify(e^{x})` doit continuer à rendre `e^{x}`, et surtout pas
 * `\exp(x)`. C'est la décision d'architecture de la PR #382, et le dernier bloc
 * de ce fichier la vérifie.
 *
 * ## Hors périmètre, et pourquoi
 *
 * Un exposant **symbolique** sur une base quelconque reste opaque :
 * `x^a·x^b ≢ x^{a+b}`, `2^{2x}/2^{x} ≢ 2^{x}`. Ce n'est pas le même trou : un
 * `SymbolicFactor` porte un exposant **rationnel**, si bien qu'une puissance à
 * exposant symbolique ne peut pas être représentée comme un facteur et reste
 * une base opaque. Le réparer demanderait de changer la forme normale, pas d'y
 * ajouter une règle. Deux tests le pinnent tel quel.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { simplify } from '../../simplify';
import { solve } from '../../solve/solve';
import { toLatex } from '../../index';
import type { RelationNode } from '../../types';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('les deux écritures de l’exponentielle se parlent', () => {
	it.each([
		['e^{2}', '\\exp(2)'],
		['e^{x}', '\\exp(x)'],
		['e^{x}e^{2x}', 'e^{3x}'],
		['\\frac{e^{2x}}{e^{x}}', 'e^{x}'],
		['\\frac{e^{3x}}{e^{x}}', 'e^{2x}'],
		['\\frac{e^{x+1}}{e}', 'e^{x}'],
		['e^{x}\\exp(2x)', 'e^{3x}'],
		['(e^{x})^{2}', 'e^{2x}'],
		['\\frac{e^{x}}{e^{x}}', '1'],
		['e^{0}', '1']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

/**
 * Un troisième bug, **préexistant** et trouvé en chemin : `exp(1)` normalise
 * vers la constante d'Euler tandis que `exp(2)` reste un nœud fonction, si bien
 * que la machinerie de combinaison ne voit plus qu'un seul des deux côtés.
 *
 * Mesuré sur `main` à `59c62b499`, sans aucune lettre `e` en jeu :
 *
 * | paire                            | verdict   |
 * | -------------------------------- | --------- |
 * | `exp(x+2)/exp(2) ≡ exp(x)`       | `true`    |
 * | `exp(x+1)/exp(1) ≡ exp(x)`       | **`false`** |
 * | `exp(x+1) ≡ exp(x)·exp(1)`       | **`false`** |
 * | `exp(x+1)/exp(x) ≡ exp(1)`       | **`false`** |
 *
 * Seul l'exposant `1` fait la différence. Il bloquait aussi `e^{x+1}/e`, ce qui
 * l'a mis sur le chemin de ce correctif.
 */
describe('l’exposant 1 ne doit pas sortir l’exponentielle de la machinerie', () => {
	it.each([
		['\\frac{\\exp(x+1)}{\\exp(1)}', '\\exp(x)'],
		['\\exp(x+1)', '\\exp(x)\\exp(1)'],
		['\\frac{\\exp(x+1)}{\\exp(x)}', '\\exp(1)'],
		['\\frac{\\exp(x+2)}{\\exp(2)}', '\\exp(x)']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('ce qui n’est pas égal ne le devient pas', () => {
	it.each([
		['e^{x}', 'e^{2x}'],
		['e^{x}e^{2x}', 'e^{2x}'],
		['\\frac{e^{2x}}{e^{x}}', 'e^{2x}'],
		['e^{x}', 'x'],
		['e^{x+y}', 'e^{x}+e^{y}']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});
});

describe('hors périmètre : un exposant symbolique sur une base quelconque', () => {
	it('reste opaque, et c’est assumé', () => {
		expect(eq('x^{a}x^{b}', 'x^{a+b}')).toBe(false);
		expect(eq('\\frac{2^{2x}}{2^{x}}', '2^{x}')).toBe(false);
	});

	it('mais reste réflexif', () => {
		for (const s of ['x^{a}x^{b}', '\\frac{2^{2x}}{2^{x}}']) {
			expect(eq(s, s)).toBe(true);
		}
	});
});

describe('réduire pour comparer, pas pour écrire', () => {
	it('l’affichage garde la notation de l’élève', () => {
		expect(toLatex(simplify(parseLatex('e^{x}')).result)).toBe('e^x');
		expect(toLatex(simplify(parseLatex('\\exp(x)')).result)).toContain('exp');
	});
});

// =============================================================================
// La promotion de la constante doit rester CONDITIONNELLE
// =============================================================================

/**
 * La constante d'Euler n'est traitée comme une base exponentielle que s'il y a
 * une vraie fonction `exp` avec qui se combiner. Sans cette condition, `e²`
 * devient `exp(2)` dans la forme NORMALE — donc sur le chemin d'écriture, que
 * ce chantier n'a pas le droit de toucher.
 *
 * Ce que ça casse, mesuré en levant la condition : le solveur ne reconnaît plus
 * la forme qu'il attend et `ln(x²+1) − 2 = 0` passe de **deux solutions à
 * zéro**. Un test préexistant de `solve/__tests__/transcendental-extraction`
 * l'attrape, mais il ne nomme ni la condition ni l'exponentielle-comme-base :
 * qui relirait ce fichier-ci croirait la condition libre.
 */
describe('un `e` isolé n’a rien à absorber, on ne le promeut pas', () => {
	const resoudre = (equation: string) =>
		solve(parseCustom(equation) as RelationNode, { variable: 'x' });

	it.each([['ln(x^2+1)-2=0'], ['ln(x^2+1)=2'], ['ln(x^2-1)-2=0']])(
		'%s garde ses deux solutions',
		(equation) => {
			expect(resoudre(equation).solutions.length).toBe(2);
		}
	);

	it('et l’affichage de e² ne bouge pas', () => {
		expect(toLatex(simplify(parseLatex('e^{2}')).result)).toBe('e^2');
		expect(toLatex(simplify(parseLatex('\\frac{e^{2}}{x}')).result)).toContain('e^2');
	});
});

// =============================================================================
// Le pgcd ne doit pas faire dépasser le budget de correction
// =============================================================================

/**
 * Les plafonds internes du pgcd bornent sa terminaison, pas son temps. Sur une
 * fraction dense à quatre variables, aucun n'est atteint et le calcul coûtait
 * 164 ms là où `main` répondait en 18. La correction d'une réponse d'élève
 * dispose de 500 ms : un dépassement la compte FAUSSE.
 *
 * Un pré-filtre de taille au site d'appel ramène le coût à 19 ms. Mesuré : le
 * contrat des quotients multivariés ne consomme jamais plus de 16 (produit des
 * nombres de termes), la fraction dense en consomme 420.
 */
describe('une fraction dense ne fait pas exploser le budget', () => {
	it('rend la main bien avant les 500 ms de la correction', () => {
		const V = ['x', 'y', 'z', 'w'];
		const monomes: string[] = [];
		for (let i = 0; i < 4; i++)
			for (let j = i; j < 4; j++) for (let k = j; k < 4; k++) monomes.push(`${V[i]}${V[j]}${V[k]}`);

		const numerateur = monomes.map((m, i) => `${(i % 3) + 1}${m}`).join('+');
		const denominateur = monomes.map((m, i) => `${(i % 4) + 1}${m}`).join('+') + '+1';
		const fraction = `\\frac{${numerateur}}{${denominateur}}`;

		const started = performance.now();
		const verdict = areEquivalent(parseLatex(fraction), parseLatex(`${fraction}+0`), {
			timeoutMs: 500
		});

		// La réponse est vraie : une fraction est égale à elle-même plus zéro.
		expect(verdict).toBe(true);
		expect(performance.now() - started).toBeLessThan(150);
	});
});
