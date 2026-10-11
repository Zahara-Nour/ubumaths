/**
 * `e` n'est jamais une variable de calcul : API historique, conservée.
 * La règle commune à `e` et `i` vit dans `reserved-letters.ts`.
 *
 * @module mathAST/common/euler-variable
 */

import type { MathNode } from '../types';
import { EULER_NOT_A_VARIABLE, reservedVariableRefusal } from './reserved-letters';

export { EULER_NOT_A_VARIABLE };

/**
 * Faut-il refuser de calculer par rapport à `name` ? Oui si c'est `e` et
 * qu'aucun des arbres ne contient de variable `e` (base indicée `e_1`).
 */
export function refusesEulerVariable(
	name: string | undefined | null,
	...nodes: readonly MathNode[]
): boolean {
	return name === 'e' && reservedVariableRefusal(name, ...nodes) !== null;
}
