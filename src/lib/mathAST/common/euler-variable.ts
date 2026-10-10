/**
 * `e` n'est jamais une variable de calcul (décision de David, 2026-10-10).
 *
 * Les parseurs lisent la lettre `e` comme la constante d'Euler. Un appelant
 * qui impose `e` comme variable d'intégration, de dérivation, inconnue ou
 * variable d'une limite recevait un résultat faux (`∫ e² de` rendait `e³`) :
 * chaque module le refuse par son mécanisme habituel, avec ce message.
 *
 * @module mathAST/common/euler-variable
 */

/** Le refus, en français, tel que l'élève le lit. */
export const EULER_NOT_A_VARIABLE = 'e est la constante d’Euler, pas une variable.';

/** Le nom de variable demandé est-il `e` ? */
export function isEulerVariableName(name: string | undefined | null): boolean {
	return name === 'e';
}
