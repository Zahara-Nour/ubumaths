/**
 * Changement de base du logarithme : `log_b(a) = ln(a)/ln(b)`.
 *
 * ## Pourquoi
 *
 * La forme normale traite `\log_{b}(a)` comme un atome opaque qui porte sa
 * base : `\log_{x}(2) ≢ \frac{\ln 2}{\ln x}`, `\log_{4}(x) ≢ \frac{1}{2}\log_{2}(x)`,
 * `\log_{10}(x) ≢ \log(x)` étaient refusés (faux négatifs mesurés sur `main`
 * le 2026-09-29). Réécrit en quotient de `ln`, tout se ramène à la machinerie
 * qui décompose déjà les logarithmes népériens.
 *
 * ## Pourquoi c'est sûr
 *
 * C'est la DÉFINITION de `log_b` en analyse réelle, et les deux membres ont
 * exactement le même domaine : `a > 0`, `b > 0`, `b ≠ 1` (en `b = 1`,
 * `ln b = 0` et le quotient n'existe pas non plus). La réécriture ne peut ni
 * élargir ni restreindre le domaine.
 *
 * ## Convention : `\log` sans base est DÉCIMAL
 *
 * C'est celle du dépôt : `normalize` (`getNumericBase`, `\log(100) = 2`),
 * l'évaluateur (`Math.log10`), la dérivation (`logRule` en base 10). Sur le
 * chemin de la comparaison, `\log(a)` devient donc `ln(a)/ln(10)`.
 *
 * ## Où
 *
 * - `equivalenceForm` seul (ADR 0006) : la forme affichée garde `\log_{2}(x)`.
 * - Les limites (`normalize-extended`), qui calculent une VALEUR : la base
 *   change le sens de variation (`\log_{1/2}(x) → +∞` en `0⁺`).
 *
 * Laissés tels quels : un `log` à exposant (`\log_{2}^{2}(x)`), dérivé ou
 * réciproque, et tout appel à plusieurs arguments.
 */

import { divide, func, number } from '../../factory';
import { isFunction } from '../../guards';
import { mapNode } from '../../transforms';
import type { MathNode } from '../../types';

/**
 * `ln(a)/ln(b)` pour `log_b(a)` (et `ln(a)/ln(10)` pour `log(a)` si
 * `includeDecimal`), `null` si le nœud n'est pas un tel logarithme.
 */
export function changeOfBaseAt(node: MathNode, includeDecimal: boolean): MathNode | null {
	if (!isFunction(node) || node.args.length !== 1) return null;
	if (node.power !== undefined || node.derivativeOrder !== undefined || node.isInverse) return null;
	const name = node.name.toLowerCase();
	if (name !== 'log' && name !== 'ln') return null;
	const base = node.base ?? (name === 'log' && includeDecimal ? number('10') : undefined);
	if (base === undefined) return null;
	return divide(func('ln', [node.args[0]]), func('ln', [base]), 'fraction');
}

/**
 * Réécrit, de bas en haut, tout logarithme de base explicite — et `\log`
 * décimal — en quotient de logarithmes népériens. Chemin de `equivalenceForm`
 * seul.
 */
export function expandLogBases(node: MathNode): MathNode {
	return mapNode(node, (current) => changeOfBaseAt(current, true) ?? current);
}
