/**
 * `e` élevé à une puissance est l'exponentielle.
 *
 * ## Le trou, mesuré
 *
 * Le système a **déjà tranché** que la lettre `e` désigne le nombre d'Euler :
 * `evaluate(parseLatex('e'))` rend `2.718281828459045`. Seul le chemin
 * symbolique l'ignorait. Le parseur lit `e^{x}` comme
 * `superscript(variable e, x)`, alors que la machinerie qui combine les
 * exponentielles — `combineExpInMonomial`, `combineExpInPolynomial`,
 * `combineExpAcrossFraction` — ne reconnaît que les nœuds **fonction** `exp`.
 * Elle ne voyait donc jamais passer `e^{x}`.
 *
 * Résultat : `exp(x)·exp(2x) ≡ exp(3x)` rendait `true`, et `e^x·e^{2x} ≡ e^{3x}`
 * rendait `false`. Deux écritures du même objet qui ne se parlaient pas.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * Ce module vit sur le chemin de `equivalenceForm` seul. `simplify(e^{x})`
 * continue de rendre `e^x` : on ne réécrit jamais la notation de l'élève, on se
 * contente de la comprendre. C'est la décision d'architecture de la PR #382.
 *
 * ## Ce que ce module ne fait PAS
 *
 * Un exposant symbolique sur une base **quelconque** reste opaque :
 * `x^a · x^b` ne devient pas `x^{a+b}`, et `2^{2x}/2^{x}` reste tel quel. Ce
 * n'est pas le même trou : un `SymbolicFactor` porte un exposant **rationnel**,
 * si bien qu'une puissance à exposant symbolique ne peut pas être représentée
 * comme un facteur et reste une base opaque. Le réparer demanderait de changer
 * la forme normale, pas d'y ajouter une règle.
 *
 * ## La contrepartie assumée
 *
 * Une expression qui utiliserait `e` comme nom de **variable** — la charge
 * élémentaire en physique, par exemple — voit ce `e` compris comme le nombre
 * d'Euler. Ce n'est pas une régression : `evaluate` lui donnait déjà la valeur
 * 2,718, donc cette écriture était déjà cassée partout ailleurs.
 */

import { func, number } from '../../factory';
import { isFunction, isNumber, isVariable } from '../../guards';
import { mapNode } from '../../transforms';
import type { MathNode } from '../../types';

/**
 * Le nœud est-il la lettre `e` employée seule, sans indice ni décoration ?
 */
function isEulerLetter(node: MathNode): boolean {
	return isVariable(node) && node.name === 'e';
}

/**
 * Le nœud est-il déjà `exp(1)` ?
 *
 * ⚠️ `mapNode` travaille de bas en haut : quand on atteint `e^{x}`, sa base a
 * DÉJÀ été réécrite en `exp(1)` par la règle du `e` seul. Sans ce test, la
 * puissance ne reconnaîtrait plus sa base et `e^{x}` resterait `exp(1)^x`, que
 * personne ne sait combiner puisque l'exposant est symbolique. Le piège a
 * coûté une mesure : `e^{2}` passait (les deux côtés valant un nombre) et
 * `e^{x}` non.
 */
function isExpOfOne(node: MathNode): boolean {
	return (
		isFunction(node) &&
		node.name === 'exp' &&
		node.args.length === 1 &&
		isNumber(node.args[0]) &&
		node.args[0].value === '1'
	);
}

/**
 * Réécrit un nœud s'il est une puissance de `e`, ou `e` tout court.
 * `null` quand il n'y a rien à faire.
 */
function expandEulerPowerAt(node: MathNode): MathNode | null {
	if (node.type === 'superscript' && (isEulerLetter(node.base) || isExpOfOne(node.base))) {
		return func('exp', [node.superscript]);
	}

	// `e` seul vaut `exp(1)` : sans ça, `e^{x+1}/e` ne se simplifierait pas,
	// le dénominateur restant une variable opaque face à une exponentielle.
	if (isEulerLetter(node)) {
		return func('exp', [number('1')]);
	}

	return null;
}

/**
 * Remplace toute puissance de `e` par l'appel `exp` correspondant, de bas en
 * haut.
 *
 * De bas en haut, `(e^{x})^{2}` donne `exp(x)^2`, que `combineExpInMonomial`
 * ramène ensuite à `exp(2x)` : ce module n'a pas à connaître les lois des
 * exposants, il se contente de rendre les exponentielles visibles à celle qui
 * les connaît déjà.
 *
 * Idempotente : le résultat ne contient plus aucune puissance de la lettre `e`.
 */
export function expandEulerPowers(node: MathNode): MathNode {
	return mapNode(node, (current) => expandEulerPowerAt(current) ?? current);
}
