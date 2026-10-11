/**
 * `e` élevé à une puissance est l'exponentielle.
 *
 * ## Le trou, mesuré
 *
 * Les deux parseurs lisent la lettre `e` comme la constante d'Euler `euler`.
 * Mais la machinerie qui combine les exponentielles — `combineExpInMonomial`,
 * `combineExpInPolynomial`, `combineExpAcrossFraction` — ne reconnaît que les
 * nœuds **fonction** `exp`. Elle ne voyait donc jamais passer `e^{x}`.
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
 * Un exposant symbolique sur une base **quelconque** n'est pas son affaire :
 * un `SymbolicFactor` porte un exposant **rationnel**, si bien qu'une puissance
 * à exposant symbolique reste une base opaque. Les bases numériques
 * strictement positives (`2^{2x}/2^{x}`) sont traitées à part par
 * `general-power.ts` ; les bases variables (`x^a · x^b`) restent opaques.
 */

import { func, multiply, number } from '../../factory';
import { isDelimiter, isEulerConstant, isFunction, isNumber } from '../../guards';
import { mapNode } from '../../transforms';
import type { MathNode } from '../../types';

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

/** Le contenu sous des parenthèses de groupement, sinon le nœud lui-même. */
function unwrapDelimiters(node: MathNode): MathNode {
	let current = node;
	while (isDelimiter(current)) current = current.content;
	return current;
}

/**
 * Réécrit un nœud s'il est une puissance de `e`, ou `e` tout court.
 * `null` quand il n'y a rien à faire.
 */
function expandEulerPowerAt(node: MathNode): MathNode | null {
	if (node.type === 'superscript' && (isEulerConstant(node.base) || isExpOfOne(node.base))) {
		return func('exp', [node.superscript]);
	}

	// `(e^{a})^{n}` → `exp(a·n)`, vrai pour tous réels `a`, `n`. De bas en haut,
	// la base est déjà `exp(a)` (sous ses parenthèses). Sans ce cas, un exposant
	// extérieur SYMBOLIQUE laissait une puissance opaque : un `SymbolicFactor` ne
	// porte qu'un exposant rationnel, et `(e^{2})^{n} ≢ e^{2n}` rendait faux.
	if (node.type === 'superscript') {
		const base = unwrapDelimiters(node.base);
		if (isFunction(base) && base.name === 'exp' && base.args.length === 1) {
			return func('exp', [multiply(base.args[0], node.superscript, 'implicit')]);
		}
	}

	// `e` seul vaut `exp(1)` : sans ça, `e^{x+1}/e` ne se simplifierait pas,
	// le dénominateur restant une constante opaque face à une exponentielle.
	if (isEulerConstant(node)) {
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
 * Idempotente : le résultat ne contient plus aucune puissance de `e`.
 */
export function expandEulerPowers(node: MathNode): MathNode {
	return mapNode(node, (current) => expandEulerPowerAt(current) ?? current);
}
