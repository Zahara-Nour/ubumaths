/**
 * Un exposant rationnel non entier est une racine : `u^{p/q} = (ᵠ√u)^{p}`, et
 * `u^{-p/q} = 1/(ᵠ√u)^{p}`.
 *
 * ## Le trou, mesuré
 *
 * Mesuré sur `main` à `6b773b4c3` : pour l'attendu `\frac{1}{2\sqrt{x}}`
 * (dérivée de `√x`), les réponses `\frac{1}{2}x^{-\frac12}` et `0.5x^{-0.5}`
 * étaient comptées FAUSSES. La normalisation ne lit un exposant que sous trois
 * formes (entier, `-entier`, `\frac{p}{q}`) : `-\frac12`, `0.5`, `-0.5`
 * laissaient la puissance opaque. Et une base composée (`(4x+1)^{\frac12}`)
 * devenait un nœud opaque, quand `\sqrt{4x+1}` devient le facteur
 * `(4x+1)^{1/2}` : les deux écritures ne se rencontraient jamais.
 *
 * ## La réécriture
 *
 * L'exposant est lu par sa VALEUR rationnelle exacte (rappel
 * `rationalValue`) : `0.5`, `\frac{2}{4}`, `-\frac12`, `(-0.5)` disent tous la
 * même chose. La puissance est alors écrite en radical, dont la normalisation
 * sait déjà tout : variables, constantes, entiers, carrés parfaits — et la
 * convention de domaine `√(x²) = |x|`, qui vaut donc aussi pour
 * `(x²)^{1/2}`. Une seule porte d'entrée pour les deux écritures, au lieu de
 * deux chemins qui divergent.
 *
 * ## Ce que ce module ne fait PAS, décidé
 *
 * - **Bases négatives ou nulles** (`(-8)^{1/3}`, `0^{-1/2}`) : la puissance
 *   réelle d'une base négative dépend de la convention (`∛(-8) = -2`, mais
 *   `(-8)^{1/3}` n'est pas définie en lecture `exp(⅓ ln(-8))`). On ne conclut
 *   pas : le nœud reste tel quel.
 * - **Grandeurs** (`[m]^{1/2}`) : les unités ont leur propre algèbre.
 * - **Exposants à grand dénominateur ou numérateur** (au-delà du plafond) :
 *   `2^{0.123}` deviendrait la racine 1000ᵉ de 2 élevée à la puissance 123,
 *   un calcul de coefficient algébrique sans borne. Faux négatif assumé.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * Comme `euler-power.ts` et `general-power.ts`, ce module vit sur le chemin de
 * `equivalenceForm` seul (ADR 0006) : `simplify(x^{-\frac12})` continue de
 * rendre `x^{-\frac{1}{2}}`.
 */

import { divide, func, number, sqrt, superscript } from '../../factory';
import { isDelimiter, isSuperscript, isUnit } from '../../guards';
import { findNodes, mapNode } from '../../transforms';
import type { MathNode } from '../../types';
import type { Rational } from '../types';

/** Plafond de l'indice de la racine (dénominateur de l'exposant). */
const MAX_ROOT_INDEX = 12n;
/** Plafond de la puissance de la racine (numérateur de l'exposant, en valeur absolue). */
const MAX_ROOT_POWER = 48n;

/**
 * Ce que la règle demande à la normalisation, passé en rappel pour ne pas
 * importer `normalize.ts` (dépendance circulaire).
 */
export interface FractionalPowerContext {
	/**
	 * La valeur rationnelle exacte du nœud, ou `null` s'il n'en a pas une.
	 */
	rationalValue: (node: MathNode) => Rational | null;
}

/** `u^{p/q}` → radical, ou `null` quand il n'y a rien à faire (cf. en-tête). */
function rewriteFractionalPowerAt(node: MathNode, ctx: FractionalPowerContext): MathNode | null {
	if (!isSuperscript(node)) return null;

	const exponent = ctx.rationalValue(node.superscript);
	if (exponent === null || exponent.d === 1n) return null;
	const power = exponent.n < 0n ? -exponent.n : exponent.n;
	if (exponent.d > MAX_ROOT_INDEX || power > MAX_ROOT_POWER) return null;

	if (findNodes(node.base, isUnit).length > 0) return null;
	const baseValue = ctx.rationalValue(node.base);
	if (baseValue !== null && baseValue.n <= 0n) return null;

	const radicand = isDelimiter(node.base) ? node.base.content : node.base;
	const root =
		exponent.d === 2n
			? sqrt(radicand)
			: func('sqrt', [radicand], { base: number(exponent.d.toString()) });
	const raised = power === 1n ? root : superscript(root, number(power.toString()));
	return exponent.n < 0n ? divide(number('1'), raised, 'fraction') : raised;
}

/**
 * Remplace, de bas en haut, toute puissance d'exposant rationnel non entier par
 * le radical correspondant (cf. en-tête pour les exclusions).
 */
export function expandFractionalPowers(node: MathNode, ctx: FractionalPowerContext): MathNode {
	return mapNode(node, (current) => rewriteFractionalPowerAt(current, ctx) ?? current);
}
