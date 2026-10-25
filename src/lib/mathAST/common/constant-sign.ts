/**
 * Signe d'une constante, lu sur sa VALEUR et non sur la forme de son nœud.
 *
 * Une même valeur a plusieurs écritures : `-\frac23` est `opposite(division)`,
 * `\frac{-3}{4}` une division de numérateur opposé, `-0.5` devient `-\dfrac12`
 * après `canon`, `-\sqrt2` un opposé de racine. Lire le signe sur
 * `number` / `opposite(number)` seulement (`literalNumberValue`) les rate tous :
 * c'est ce qui faisait garder le sens de `-\frac23 x + 1 < 5` (écart V36).
 *
 * @module mathAST/common/constant-sign
 */

import type { MathNode } from '../types';
import { extractExactRational } from './numeric';
import { computeNumericValue } from '../eval/numeric-value';

/** Signe d'une constante : −1, 0 ou 1. */
export type ConstantSign = -1 | 0 | 1;

/**
 * En deçà de cette marge, une valeur approchée est trop proche de 0 pour que
 * son signe soit sûr : on ne tranche pas.
 */
const SIGN_MARGIN = 1e-9;

/**
 * Signe d'une expression constante.
 *
 * 1. Rationnel exact (littéral, opposé, quotient de littéraux : `-\frac23`,
 *    `\frac{-3}{4}`, `-0.5`) : signe exact, zéro compris.
 * 2. Sinon (radicaux, π, sommes de constantes : `-\sqrt2`, `2 - \sqrt2`) :
 *    valeur approchée, retenue seulement hors de la marge autour de 0.
 *
 * Rend `null` quand le signe ne peut pas être établi : expression non
 * constante, non évaluable, ou valeur approchée trop proche de 0.
 *
 * ⚠️ Un zéro exact écrit comme une SOMME (`\sqrt2 - \sqrt2`, `1 - \frac22`)
 * n'est pas un rationnel lisible par l'étape 1 : sa valeur approchée tombe
 * dans la marge et le résultat est `null`, pas 0. Les appelants passent donc
 * d'abord l'expression par `canon` (`normalize ∘ denormalize`), qui réduit ces
 * sommes à `0`.
 */
export function constantSign(node: MathNode): ConstantSign | null {
	const exact = extractExactRational(node);
	if (exact !== null) return exact.n === 0n ? 0 : exact.n < 0n ? -1 : 1;

	const value = computeNumericValue(node);
	if (value === null || Math.abs(value) <= SIGN_MARGIN) return null;
	return value < 0 ? -1 : 1;
}
