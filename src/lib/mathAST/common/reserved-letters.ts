/**
 * `e` et `i` ne sont jamais des variables de calcul (décisions de David,
 * 2026-10-10 pour `e`, 2026-10-11 pour `i`).
 *
 * Les parseurs lisent la lettre `e` comme la constante d'Euler et la lettre `i`
 * comme l'unité imaginaire `complex(0, 1)`. Un appelant qui impose l'une
 * d'elles comme variable d'intégration, de dérivation, inconnue ou variable
 * d'une limite recevait un résultat faux (`∫ e² de` rendait `e³`) : chaque
 * module le refuse par son mécanisme habituel, avec le message de la lettre.
 *
 * ⚠️ Sauf si l'arbre contient une VARIABLE de ce nom : la base d'une variable
 * indicée en produit une (`e_1`, `i_n`), et `i` dans un indice aussi (`u_i`) ;
 * `getVariables` nomme une variable indicée par sa base. `solve(e_1 + 2 = 5)`
 * détecte alors l'inconnue `e` et se rappelle avec elle : le refus ne doit pas
 * tomber sur cette entrée légitime.
 *
 * @module mathAST/common/reserved-letters
 */

import type { MathNode } from '../types';
import { isVariable } from '../guards';
import { findNodes } from '../transforms';

/** Le refus de `e`, en français, tel que l'élève le lit. */
export const EULER_NOT_A_VARIABLE = 'e est la constante d’Euler, pas une variable.';

/** Le refus de `i`, en français, tel que l'élève le lit. */
export const IMAGINARY_NOT_A_VARIABLE = 'i est l’unité imaginaire, pas une variable.';

/** Lettre réservée → son refus. */
const RESERVED_LETTERS: ReadonlyMap<string, string> = new Map([
	['e', EULER_NOT_A_VARIABLE],
	['i', IMAGINARY_NOT_A_VARIABLE]
]);

/**
 * Le refus d'une lettre réservée (`e`, `i`) tapée comme nom de variable, ou
 * `null`. Sans arbre à consulter : la saisie d'un nom (`pour i`, `; e`).
 */
export function reservedLetterMessage(name: string | undefined | null): string | null {
	return name == null ? null : (RESERVED_LETTERS.get(name) ?? null);
}

/**
 * Le refus à opposer quand on calcule par rapport à `name`, ou `null` : `name`
 * est une lettre réservée et aucun des arbres ne contient de variable de ce nom.
 */
export function reservedVariableRefusal(
	name: string | undefined | null,
	...nodes: readonly MathNode[]
): string | null {
	const message = reservedLetterMessage(name);
	if (message === null) return null;
	const present = nodes.some(
		(node) => findNodes(node, (n) => isVariable(n) && n.name === name).length > 0
	);
	return present ? null : message;
}
