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
 * ## Bases variables : seulement sous hypothèse de l'énoncé (ADR 0012)
 *
 * Sans hypothèse, `x^a·x^b ≢ x^{a+b}` reste faux : réécrire
 * `x^a = exp(a·ln x)` supposerait `x > 0`. Quand la question DÉCLARE
 * `x > 0`, le rappel `isPositiveBase` le dit, et la même définition
 * s'applique : `x^a = exp(a·ln x)` pour tout `a` réel dès que `x > 0`. La
 * condition est donc exactement celle de l'identité, « strictement » compris :
 * `x ≥ 0` ne suffit pas (`0^a` vaut `0`, `1` ou n'existe pas selon `a`).
 *
 * ## Bases négatives : le signe à part
 *
 * `(-2)^{n}` n'a pas d'écriture exponentielle réelle. Mais pour `a > 0`,
 * `(-a)^{u} = (-1)^{u}·a^{u}` : vrai en valeur principale complexe
 * (`Log(-a) = ln a + iπ`) comme en lecture réelle (exposant rationnel à
 * dénominateur impair, où `(-1)^{p/q} = (-1)^{p}`), et les deux membres
 * existent aux mêmes points. Le facteur `a^{u}` devient une exponentielle,
 * `(-1)^{u}` reste opaque et rejoint les autres puissances de `-1`
 * (`mergeNegativeBasePowers`). Sans ça, deux bases négatives différentes ne
 * se rencontraient jamais : `5×(-1)^{n+1}×3^{n} ≢ -5(-3)^{n}` rendait faux
 * (mesuré sur `main` à `112827ef4`). `(-2)^{n} ≢ 2^{n}` et
 * `(-2)^{2n} ≢ 4^{n}` restent faux : le facteur `(-1)^{u}` les sépare.
 *
 * ## Ce que ce module ne fait PAS, décidé
 *
 * - Les exposants **rationnels** (`2^{3}`, `4^{1/2}`) : la forme normale les
 *   traite déjà exactement (`8`, `2`), les passer par `exp(3·ln 2)` ne ferait
 *   que les rendre opaques.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * Comme `euler-power.ts`, ce module vit sur le chemin de `equivalenceForm`
 * seul (ADR 0006) : `simplify(2^{x})` continue de rendre `2^x`.
 */

import {
	add,
	divide,
	func,
	multiply,
	number,
	opposite,
	parentheses,
	superscript
} from '../../factory';
import { flattenProductShallow } from '../../flatten';
import { isDelimiter, isSuperscript } from '../../guards';
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
	/**
	 * Vrai si la base est strictement positive d'après les hypothèses de
	 * l'énoncé (`isPositiveType`). Absent sans hypothèse : seules les bases
	 * rationnelles strictement positives sont alors visées.
	 */
	isPositiveBase?: (node: MathNode) => boolean;
}

/**
 * Réécrit `a^u` en `exp(u·ln a)` quand `a` est un rationnel strictement positif
 * (ou une base déclarée strictement positive) et `u` n'est pas rationnel. `null` quand il n'y a rien à faire.
 */
function expandPositiveBasePowerAt(node: MathNode, ctx: GeneralPowerContext): MathNode | null {
	if (!isSuperscript(node)) return null;

	const base = ctx.rationalValue(node.base);
	// Strictement positif : `n > 0` suffit, le dénominateur d'un `Rational`
	// normalisé est toujours positif.
	const positiveRational = base !== null && base.n > 0n;
	if (base !== null && base.n < 0n) return splitNegativeBasePowerAt(node, base, ctx);
	if (!positiveRational && !(base === null && ctx.isPositiveBase?.(node.base))) return null;

	// Exposant rationnel : la forme normale sait déjà faire, exactement.
	if (ctx.rationalValue(node.superscript) !== null) return null;

	const logarithm = positiveRational
		? func('ln', [node.base])
		: positiveProductLogarithm(node.base, ctx);
	return func('exp', [multiply(node.superscript, logarithm, 'cross')]);
}

/**
 * `(-a)^{u}` → `(-1)^{u}·exp(u·ln a)` pour `a > 0` rationnel différent de 1 et
 * `u` non rationnel (cf. en-tête). `null` sinon : `(-1)^{u}` est déjà le
 * facteur de signe seul.
 */
function splitNegativeBasePowerAt(
	node: MathNode & { type: 'superscript' },
	base: Rational,
	ctx: GeneralPowerContext
): MathNode | null {
	if (base.n === -1n && base.d === 1n) return null;
	if (ctx.rationalValue(node.superscript) !== null) return null;
	const magnitudeNumerator = number((-base.n).toString());
	const magnitude =
		base.d === 1n
			? magnitudeNumerator
			: divide(magnitudeNumerator, number(base.d.toString()), 'fraction');
	const sign = superscript(parentheses(opposite(number('1'))), node.superscript);
	const exponential = func('exp', [multiply(node.superscript, func('ln', [magnitude]), 'cross')]);
	return multiply(sign, exponential, 'cross');
}

/**
 * `ln(a·b·…)` écrit `ln a + ln b + …` quand CHAQUE facteur est strictement
 * positif (rationnel positif ou base déclarée positive) : `(2x)^{x} ≡
 * 2^{x}·x^{x}` pour x > 0. Identité vraie dès que tous les facteurs sont
 * positifs, exactement la condition vérifiée ici. Sinon `ln(base)` tel quel.
 */
function positiveProductLogarithm(base: MathNode, ctx: GeneralPowerContext): MathNode {
	const content = isDelimiter(base) ? base.content : base;
	const factors = flattenProductShallow(content).map(({ factor }) => factor);
	const allPositive = factors.every((factor) => {
		const value = ctx.rationalValue(factor);
		return value !== null ? value.n > 0n : ctx.isPositiveBase?.(factor) === true;
	});
	if (factors.length < 2 || !allPositive) return func('ln', [base]);
	return factors
		.map((factor): MathNode => func('ln', [factor]))
		.reduce((sum, logarithm) => add(sum, logarithm));
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
