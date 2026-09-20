/**
 * La fonction de coût, portée fidèlement depuis le Compute Engine.
 *
 * ⚠️ L'ancienne version disait « Inspired by Compute Engine / Mathematica » et
 * inventait ses constantes : addition 2, multiplication 3, division 4,
 * racine 3. Les vraies, lues dans
 * `extern/compute-engine/src/compute-engine/cost-function.ts` (v0.30.2), sont
 * 3, 7, 8 et 5 — et elles ne sont pas décoratives : c'est le RAPPORT entre
 * elles qui décide quelle écriture gagne.
 *
 * Elles viennent de `ComplexityFunction` de Mathematica, citée en tête de leur
 * fichier.
 */

import { describe, it, expect } from 'vitest';
import { computeCost, cheapest } from '../cost';
import {
	variable,
	number,
	add,
	subtract,
	multiply,
	divide,
	opposite,
	power,
	sqrt,
	sin,
	ln,
	func
} from '../../factory';
import { simplify } from '../simplify';
import { parseCustomSafe } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import type { MathNode } from '../../types';

const parse = (s: string): MathNode => parseCustomSafe(s).ast!;

const x = () => variable('x');
const y = () => variable('y');

describe('les poids sont ceux du Compute Engine', () => {
	it('un symbole coûte 1', () => {
		expect(computeCost(x())).toBe(1);
	});

	it('addition 3, soustraction 4, multiplication 7, division 8', () => {
		expect(computeCost(add(x(), y()))).toBe(3 + 1 + 1);
		expect(computeCost(subtract(x(), y()))).toBe(4 + 1 + 1);
		expect(computeCost(multiply(x(), y()))).toBe(7 + 1 + 1);
		expect(computeCost(divide(x(), y()))).toBe(8 + 1 + 1);
	});

	it('l’opposé coûte comme une soustraction : 4', () => {
		expect(computeCost(opposite(x()))).toBe(4 + 1);
	});

	it('racine 5, log/exp 9, trigo 10, le reste 11', () => {
		expect(computeCost(sqrt(x()))).toBe(5 + 1);
		expect(computeCost(ln(x()))).toBe(9 + 1);
		expect(computeCost(sin(x()))).toBe(10 + 1);
		expect(computeCost(func('arctan', [x()]))).toBe(11 + 1);
	});
});

describe('le coût d’un nombre suit son nombre de chiffres', () => {
	it('un chiffre coûte 1, deux chiffres 2, trois chiffres 3', () => {
		// ⚠️ L'ancienne version rendait 1 pour « 42 » : elle ne comptait qu'à
		// partir de trois chiffres, et par demi-points.
		expect(computeCost(number('5'))).toBe(1);
		expect(computeCost(number('42'))).toBe(2);
		expect(computeCost(number('123'))).toBe(3);
	});

	it('zéro coûte 1', () => {
		expect(computeCost(number('0'))).toBe(1);
	});

	it('un négatif passe par `opposite`, pas par un littéral signé', () => {
		// ⚠️ CE pénalise le signe DANS le nombre (`n > 0 ? 1 : 2`). Chez nous
		// cette branche est inatteignable : la fabrique REFUSE `number('-5')`
		// (« signed numeric literal rejected ») et `-5` se lit
		// `opposite(number('5'))`. Le surcoût du signe est donc porté par le
		// nœud `opposite`, qui coûte déjà 4.
		expect(computeCost(opposite(number('5')))).toBe(4 + 1);
	});

	it('un décimal coûte 2, quel que soit son nombre de chiffres', () => {
		expect(computeCost(number('2.5'))).toBe(2);
		expect(computeCost(number('3.14159'))).toBe(2);
	});
});

describe('la puissance : le seul poids qu’on ne porte pas', () => {
	/**
	 * ⚠️ CE ne facture pas la puissance — « we want 2q^2 to be less expensive
	 * than 2qq, so we ignore the exponent ». Mesuré : porté tel quel, `x^2`
	 * coûte 1 comme `x`, donc `x² + x²` coûte aussi peu que `x + x` — et
	 * `x² + x² → 2x²` cesse d'être retenu (un test de `simplify.test.ts` est
	 * passé au rouge sur exactement ça).
	 *
	 * Leur poids ne tient que dans LEUR architecture : la forme canonique y
	 * remplace l'expression avant que le coût n'arbitre. Chez nous le coût
	 * arbitre contre l'ENTRÉE, donc des puissances presque gratuites bloquent le
	 * regroupement. On garde `3 + enfants`.
	 */
	it('leur BUT est quand même atteint : `2x²` coûte moins que `2·x·x`', () => {
		// Grâce aux poids généraux portés : une multiplication coûte 7.
		const deuxXCarre = multiply(number('2'), power(x(), number('2')));
		const deuxXX = multiply(number('2'), multiply(x(), x()));

		expect(computeCost(deuxXCarre)).toBeLessThan(computeCost(deuxXX));
	});

	it('et `x² + x²` ne coûte PAS aussi peu que `x + x`', () => {
		// La garde du test qui a rougi : si la puissance redevenait gratuite,
		// le regroupement des termes semblables serait refusé.
		expect(computeCost(add(power(x(), number('2')), power(x(), number('2'))))).toBeGreaterThan(
			computeCost(add(x(), x()))
		);
	});
});

describe('`cheapest` porte le biais en faveur du nouveau', () => {
	/**
	 * ⚠️ Leur commentaire : « return the cheapest of the two, **with a bias
	 * towards the new** (which can actually be a bit more expensive than the
	 * old one, and still be picked) » — `cost(new) <= 1.2 * cost(old)`.
	 *
	 * L'ancienne version était symétrique et sans biais, et n'avait aucun
	 * appelant : le nom avait voyagé, pas le contenu.
	 */
	it('le nouveau gagne s’il ne dépasse pas 20 % du coût de l’ancien', () => {
		// ancien : x + y  → 3 + 1 + 1 = 5.  Seuil : 6.
		const ancien = add(x(), y());
		const aPeinePlusCher = sqrt(x()); // 5 + 1 = 6  → gardé
		const tropCher = multiply(x(), y()); // 7 + 1 + 1 = 9  → refusé

		expect(cheapest(ancien, aPeinePlusCher)).toBe(aPeinePlusCher);
		expect(cheapest(ancien, tropCher)).toBe(ancien);
	});

	it('à coût égal, le nouveau gagne', () => {
		const ancien = add(x(), y());
		const nouveau = add(y(), x());

		expect(cheapest(ancien, nouveau)).toBe(nouveau);
	});
});

describe('la fonction de coût est injectable', () => {
	/**
	 * ⚠️ C'est l'échappatoire documentée du Compute Engine — la phrase qui suit
	 * immédiatement la description du coût par défaut : « To influence how the
	 * complexity of an expression is measured, **set the `costFunction`
	 * property** of the compute engine ». Ils savent que leur barème est
	 * arbitraire, et ils l'ouvrent.
	 *
	 * La version précédente ne l'avait pas reprise : `computeCost` était câblé
	 * en dur, donc « simple » voulait dire la même chose pour un CAS et pour un
	 * élève. C'est cette porte qui permettra un jour un barème scolaire, sans
	 * toucher au barème par défaut ni à ses deux appelants.
	 */
	it('un coût sur mesure change la forme retenue', () => {
		// Depuis que `simplify` repose sur `tidy` (phase 0, §B), le barème
		// n'arbitre plus la mise au propre — `x·x` s'écrit `x²` par construction —
		// mais seulement les règles et le développement. Un barème qui déteste
		// une puissance de somme fait donc développer `(x+1)²`, que le barème
		// porté garde factorisée.
		const detesteLesPuissancesDeSommes = (node: MathNode): number =>
			node.type === 'superscript' && node.base.type === 'delimiter' ? 1000 : computeCost(node);

		const parDefaut = simplify(parse('(x+1)^2')).result;
		const surMesure = simplify(parse('(x+1)^2'), {
			costFunction: detesteLesPuissancesDeSommes
		}).result;

		expect(toLatex(parDefaut)).toBe('\\left( x + 1 \\right)^2');
		expect(toLatex(surMesure)).toBe('x^2 + 2 x + 1');
	});

	it('sans option, rien ne change', () => {
		expect(toLatex(simplify(parse('x*x')).result)).toBe(toLatex(simplify(parse('x*x'), {}).result));
	});
});
