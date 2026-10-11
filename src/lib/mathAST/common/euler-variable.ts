/**
 * `e` n'est jamais une variable de calcul (décision de David, 2026-10-10).
 *
 * Les parseurs lisent la lettre `e` comme la constante d'Euler. Un appelant
 * qui impose `e` comme variable d'intégration, de dérivation, inconnue ou
 * variable d'une limite recevait un résultat faux (`∫ e² de` rendait `e³`) :
 * chaque module le refuse par son mécanisme habituel, avec ce message.
 *
 * ⚠️ Sauf si l'arbre contient une VARIABLE `e` : seule la base d'une variable
 * indicée en produit (`e_1`, `e_n`), et `getVariables` nomme une variable
 * indicée par sa base. `solve(e_1 + 2 = 5)` détecte alors l'inconnue `e` et se
 * rappelle avec elle : le refus ne doit pas tomber sur cette entrée légitime.
 *
 * @module mathAST/common/euler-variable
 */

import type { MathNode } from '../types';
import { isVariable } from '../guards';
import { findNodes } from '../transforms';

/** Le refus, en français, tel que l'élève le lit. */
export const EULER_NOT_A_VARIABLE = 'e est la constante d’Euler, pas une variable.';

/**
 * Faut-il refuser de calculer par rapport à `name` ? Oui si c'est `e` et
 * qu'aucun des arbres ne contient de variable `e` (base indicée `e_1`).
 */
export function refusesEulerVariable(
	name: string | undefined | null,
	...nodes: readonly MathNode[]
): boolean {
	if (name !== 'e') return false;
	return !nodes.some((node) => findNodes(node, (n) => isVariable(n) && n.name === 'e').length > 0);
}
