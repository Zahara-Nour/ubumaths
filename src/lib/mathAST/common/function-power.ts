/**
 * Puissance d'une fonction écrite à l'exposant du nom : `sin^2(x)`, `\cos^3(x)`.
 *
 * Les parseurs (custom et LaTeX) la représentent par un nœud `function` dont le
 * champ `power` porte l'exposant — `{ name: 'sin', args: [x], power: 2 }` — et
 * non par `superscript(sin(x), 2)`. Un consommateur qui lit le nom et les
 * arguments sans regarder `power` calcule sur sin(x) au lieu de sin(x)² (la
 * dérivée de sin²x devenait cos x). Ce module donne la forme `superscript`
 * équivalente, à laquelle les consommateurs se ramènent.
 *
 * Exception : `f^{-1}` sur une fonction nommée est la notation de la réciproque
 * (`\sin^{-1}` = arcsin), pas `1/f` — on la laisse telle quelle, comme
 * `normalizeFunction`.
 *
 * @module mathAST/common/function-power
 */

import type { FunctionNode, MathNode, SuperscriptNode } from '../types';
import { isFunction } from '../guards';
import { mapNode } from '../transforms';

/**
 * `-1` en exposant d'une fonction nommée : la réciproque, pas l'inverse.
 * La fabrique refuse les littéraux signés, donc `-1` se lit `opposite(1)`.
 */
function isReciprocalNotation(power: MathNode): boolean {
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
	if (node.power === undefined || node.isInverse === true || isReciprocalNotation(node.power)) {
		return null;
	}
	const { power, ...withoutPower } = node;
	return { type: 'superscript', base: withoutPower, superscript: power };
}

/**
 * Réécrit, dans tout l'arbre, chaque `f^n(x)` en `f(x)^n`. Les autres nœuds
 * sont rendus à l'identique.
 */
export function expandFunctionPowers(node: MathNode): MathNode {
	return mapNode(node, (current) => {
		if (!isFunction(current)) return current;
		return functionPowerAsSuperscript(current) ?? current;
	});
}
