/**
 * Une puissance de base numérique strictement positive est une exponentielle.
 *
 * ## Le trou, mesuré
 *
 * Un `SymbolicFactor` porte un exposant **rationnel** : une puissance à exposant
 * symbolique (`2^{x}`) ne peut pas devenir un facteur, elle reste une base
 * opaque. Mesuré sur `main` à `ae617c192`, toutes ces réponses justes étaient
 * refusées : `2^{2x}/2^{x} ≡ 2^{x}`, `4^{x} ≡ 2^{2x}`, `2^{x}·3^{x} ≡ 6^{x}`,
 * `2^{x+1} ≡ 2·2^{x}`, `3·2^{n} ≡ 6·2^{n-1}` (terme général d'une suite).
 *
 * ## La réécriture, et pourquoi elle est sûre
 *
 * Pour `a > 0` et `u` réel quelconque, `a^u = exp(u·ln a)` : c'est la
 * DÉFINITION de la puissance réelle, pas une identité à domaine. Les deux
 * membres existent exactement aux mêmes points (tous), donc la réécriture ne
 * peut ni élargir ni restreindre le domaine. La machinerie qui combine les
 * exponentielles (`combineExpInMonomial`…) et celle qui décompose les
 * logarithmes de rationnels font le reste.
 *
 * La condition porte donc sur UNE chose : que la base soit un rationnel
 * **strictement positif**, ce que le rappel `rationalValue` établit sur la
 * forme normale de la base. `0`, les bases négatives, les radicaux, `π` et
 * toute base contenant une variable sont laissés tels quels.
 *
 * ## Ce que ce module ne fait PAS, décidé
 *
 * - Les bases **variables** : `x^a·x^b ≢ x^{a+b}` reste faux. Réécrire
 *   `x^a = exp(a·ln x)` supposerait `x > 0`, ce que le décideur ne sait pas.
 * - Les bases **négatives** : `(-2)^{n}` n'a pas d'écriture exponentielle
 *   réelle.
 * - Les exposants **rationnels** (`2^{3}`, `4^{1/2}`) : la forme normale les
 *   traite déjà exactement (`8`, `2`), les passer par `exp(3·ln 2)` ne ferait
 *   que les rendre opaques.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * Comme `euler-power.ts`, ce module vit sur le chemin de `equivalenceForm`
 * seul (ADR 0006) : `simplify(2^{x})` continue de rendre `2^x`.
 */

import { func, multiply } from '../../factory';
import { isSuperscript } from '../../guards';
import { mapNode } from '../../transforms';
import type { MathNode } from '../../types';
import type { Rational } from '../types';

/**
 * Ce que la règle demande à la normalisation, passé en rappel pour ne pas
 * importer `normalize.ts` (dépendance circulaire).
 */
export interface GeneralPowerContext {
	/**
	 * La valeur rationnelle exacte du nœud, ou `null` s'il n'en a pas une
	 * (variable, radical, `π`, imaginaire, normalisation impossible).
	 */
	rationalValue: (node: MathNode) => Rational | null;
}

/**
 * Réécrit `a^u` en `exp(u·ln a)` quand `a` est un rationnel strictement positif
 * et `u` n'est pas rationnel. `null` quand il n'y a rien à faire.
 */
function expandPositiveBasePowerAt(node: MathNode, ctx: GeneralPowerContext): MathNode | null {
	if (!isSuperscript(node)) return null;

	const base = ctx.rationalValue(node.base);
	// Strictement positif : `n > 0` suffit, le dénominateur d'un `Rational`
	// normalisé est toujours positif.
	if (base === null || base.n <= 0n) return null;

	// Exposant rationnel : la forme normale sait déjà faire, exactement.
	if (ctx.rationalValue(node.superscript) !== null) return null;

	return func('exp', [multiply(node.superscript, func('ln', [node.base]))]);
}

/**
 * Remplace, de bas en haut, toute puissance de base rationnelle strictement
 * positive et d'exposant non rationnel par l'exponentielle correspondante.
 *
 * À appeler APRÈS `expandEulerPowers` : `e^{x}` y est déjà devenu `exp(x)`, et
 * la lettre `e` n'a pas de valeur rationnelle, elle n'est donc jamais visée.
 */
export function expandPositiveBasePowers(node: MathNode, ctx: GeneralPowerContext): MathNode {
	return mapNode(node, (current) => expandPositiveBasePowerAt(current, ctx) ?? current);
}
