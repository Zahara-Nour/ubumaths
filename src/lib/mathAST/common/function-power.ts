/**
 * Exposant écrit sur le nom d'une fonction : `sin^2(x)`, `\cos^3(x)`, `\cos^{-1}(x)`.
 *
 * Les parseurs (custom et LaTeX) la représentent par un nœud `function` dont le
 * champ `power` porte l'exposant — `{ name: 'sin', args: [x], power: 2 }` — et
 * non par `superscript(sin(x), 2)`. Un consommateur qui lit le nom et les
 * arguments sans regarder `power` calcule sur sin(x) au lieu de sin(x)² (la
 * dérivée de sin²x devenait cos x). Ce module donne la forme équivalente à
 * laquelle les consommateurs se ramènent.
 *
 * Exception : `f^{-1}` sur une fonction nommée est la notation de la RÉCIPROQUE
 * (`\cos^{-1}` = arccos), pas `1/f` — convention de `normalizeFunction` :
 * - trigonométrie (`sin`, `cos`, `tan`) → `arcsin`, `arccos`, `arctan` ;
 * - autres fonctions (`ln^{-1}`, `exp^{-1}`…) → nœud `isInverse`, que les
 *   consommateurs traitent déjà comme une réciproque sans définition (refus,
 *   pas de valeur fausse). On n'invente pas de réciproque.
 *
 * @module mathAST/common/function-power
 */

import type { FunctionNode, MathNode, SuperscriptNode } from '../types';
import { isFunction } from '../guards';
import { findFirst, mapNode } from '../transforms';

/** Réciproques connues des fonctions trigonométriques. */
const TRIG_RECIPROCALS: Readonly<Record<string, string>> = {
	sin: 'arcsin',
	cos: 'arccos',
	tan: 'arctan'
};

/**
 * `-1` en exposant d'une fonction nommée : la réciproque, pas l'inverse.
 * La fabrique refuse les littéraux signés, donc `-1` se lit `opposite(1)`.
 */
export function isInverseNotation(power: MathNode): boolean {
	if (power.type === 'opposite') {
		return power.operand.type === 'number' && power.operand.value === '1';
	}
	return power.type === 'number' && power.value === '-1';
}

/**
 * `sin^2(x)` → `superscript(sin(x), 2)`. Rend `null` si le nœud ne porte pas
 * d'exposant à réécrire (pas de `power`, ou notation de la réciproque).
 */
export function functionPowerAsSuperscript(node: FunctionNode): SuperscriptNode | null {
	if (node.power === undefined || node.isInverse === true || isInverseNotation(node.power)) {
		return null;
	}
	const { power, ...withoutPower } = node;
	return { type: 'superscript', base: withoutPower, superscript: power };
}

/**
 * Notation de la réciproque `f^{-1}(x)` (exposant `-1` ou drapeau `isInverse`)
 * → `arccos(x)` pour la trigonométrie, nœud `isInverse` sans `power` sinon.
 * Rend `null` s'il n'y a pas de notation de réciproque à réécrire.
 */
export function inverseNotationAsFunction(node: FunctionNode): FunctionNode | null {
	const powerInverse = node.power !== undefined && isInverseNotation(node.power);
	if (!powerInverse && node.isInverse !== true) return null;
	if (node.derivativeOrder !== undefined || node.base !== undefined) return null;

	const { power: _power, isInverse: _isInverse, ...rest } = node;
	const reciprocal = TRIG_RECIPROCALS[node.name];
	if (reciprocal !== undefined && node.args.length === 1) {
		return { ...rest, name: reciprocal };
	}
	// Réciproque sans définition connue : seul le drapeau change de place.
	return powerInverse ? { ...rest, isInverse: true } : null;
}

/**
 * Forme que les consommateurs savent lire : `f^n(x)` → `f(x)^n`,
 * `\cos^{-1}(x)` → `arccos(x)`, `\ln^{-1}(x)` → `ln` marqué `isInverse`.
 * Rend `null` si le nœud n'a rien à réécrire.
 */
export function rewriteFunctionPower(node: FunctionNode): MathNode | null {
	return inverseNotationAsFunction(node) ?? functionPowerAsSuperscript(node);
}

/** Y a-t-il, dans l'arbre, un nœud `function` à réécrire ? */
function hasRewritableFunction(node: MathNode): boolean {
	return (
		findFirst(node, (current) => isFunction(current) && rewriteFunctionPower(current) !== null) !==
		undefined
	);
}

/**
 * Réécrit, dans tout l'arbre, chaque `f^n(x)` en `f(x)^n` et chaque
 * `\cos^{-1}(x)` en `arccos(x)`. Rend la MÊME référence si rien ne change
 * (les appelants comparent par identité).
 */
export function expandFunctionPowers(node: MathNode): MathNode {
	if (!hasRewritableFunction(node)) return node;
	return mapNode(node, (current) => {
		if (!isFunction(current)) return current;
		return rewriteFunctionPower(current) ?? current;
	});
}
