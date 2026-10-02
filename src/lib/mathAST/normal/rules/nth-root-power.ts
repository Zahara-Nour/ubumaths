/**
 * Une racine d'indice supérieur d'un produit de puissances se distribue :
 * `ⁿ√(c·u^k·v^m) = ⁿ√c · (ᵠ√u)^p · …`, avec `p/q` la fraction `k/n` réduite.
 *
 * ## Le trou, mesuré
 *
 * Mesuré sur `main` à `7a5174b68` : `∛(x²) ≡ x^{\frac23}` rendait faux. La
 * normalisation d'un radical d'indice `n ≠ 2` ne lit qu'un entier, une variable
 * ou un symbole (cf. `normalizeSqrt`) ; tout autre radicande rend le nœud
 * opaque. `rules/fractional-power.ts` écrit pourtant `x^{\frac23}` en `(∛x)²`,
 * qui devient le facteur `x^{2/3}` : les deux écritures ne se rencontraient
 * jamais. Même faux négatif pour `⁴√(x³)`, `∛(8x³)`, `∛((x+1)²)`.
 *
 * ## La réécriture
 *
 * Le radicande est lu comme un produit (sans traverser de parenthèses) de
 * facteurs `u^k`, `k` entier ≥ 1, et d'entiers positifs. Chaque facteur sort
 * en `(ᵠ√u)^p` — ou `u^p` quand la racine tombe juste — et la normalisation
 * sait déjà lire ces formes-là.
 *
 * **Racines paires** — la convention `√(x²) = |x|` est conservée : sous une
 * racine paire, une base portée à une puissance paire est remplacée par sa
 * valeur absolue tant que le numérateur réduit `p` est impair (`⁴√(x⁴) = |x|`,
 * `⁴√(x²) = √|x|`) ; si `p` est pair, la parité suffit (`⁴√(x⁸) = x²`,
 * `⁶√(x⁴) = (∛x)²`).
 *
 * ## Ce que ce module ne fait PAS, décidé
 *
 * - **Radicande négatif** (`∛(−8x³)`) : même refus que dans
 *   `fractional-power.ts` et `normalizeSqrt`. Le nœud reste opaque.
 * - **Racine paire d'un produit à plusieurs bases d'exposant impair**
 *   (`⁴√(xy)`) : `⁴√(xy) = ⁴√x·⁴√y` exige `x, y ≥ 0`, alors que le produit est
 *   défini dès que `xy ≥ 0`. On ne distribue pas.
 * - **Exposants non entiers, quotients, sommes nues** : rien à distribuer, le
 *   nœud reste tel quel.
 *
 * ## Réduire pour COMPARER, pas pour écrire
 *
 * Comme `fractional-power.ts`, ce module vit sur le chemin de
 * `equivalenceForm` seul (ADR 0006) : `simplify(∛(x²))` n'est pas touché.
 */

import { abs, func, multiply, number, sqrt, superscript } from '../../factory';
import { flattenProductShallow } from '../../flatten';
import {
	isDelimiter,
	isDivision,
	isFunction,
	isNumber,
	isOpposite,
	isSuperscript,
	isUnit
} from '../../guards';
import { findNodes, mapNode } from '../../transforms';
import type { MathNode } from '../../types';
import type { Rational } from '../types';

/** Plafond de l'indice de la racine, aligné sur `fractional-power.ts`. */
const MAX_ROOT_INDEX = 12n;
/** Plafond de l'exposant d'un facteur du radicande. */
const MAX_FACTOR_POWER = 48n;

/** Ce que la règle demande à la normalisation (rappel, cf. `fractional-power.ts`). */
export interface NthRootPowerContext {
	/** La valeur rationnelle exacte du nœud, ou `null` s'il n'en a pas une. */
	rationalValue: (node: MathNode) => Rational | null;
}

/** Un facteur du radicande : `base^power`. */
interface RadicandFactor {
	readonly base: MathNode;
	readonly power: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
	return b === 0n ? a : gcd(b, a % b);
}

function stripDelimiters(node: MathNode): MathNode {
	return isDelimiter(node) ? stripDelimiters(node.content) : node;
}

/** `ᵠ√u`, en `\sqrt{u}` pour `q = 2`. */
function rootOf(radicand: MathNode, index: bigint): MathNode {
	return index === 2n
		? sqrt(radicand)
		: func('sqrt', [radicand], { base: number(index.toString()) });
}

/** L'indice entier ≥ 3 de la racine, ou `null` (racine carrée, indice illisible). */
function readRootIndex(node: MathNode, ctx: NthRootPowerContext): bigint | null {
	if (!isFunction(node) || node.name !== 'sqrt' || node.args.length !== 1) return null;
	if (node.base === undefined) return null;
	const index = ctx.rationalValue(node.base);
	if (index === null || index.d !== 1n || index.n < 3n || index.n > MAX_ROOT_INDEX) return null;
	return index.n;
}

/** Les facteurs du radicande, ou `null` dès qu'un facteur n'est pas lisible. */
function readRadicandFactors(
	radicand: MathNode,
	ctx: NthRootPowerContext
): RadicandFactor[] | null {
	const factors: RadicandFactor[] = [];
	for (const { factor } of flattenProductShallow(radicand)) {
		if (isNumber(factor)) {
			const value = ctx.rationalValue(factor);
			if (value === null || value.n <= 0n || value.d !== 1n) return null;
			factors.push({ base: factor, power: 1n });
			continue;
		}
		if (isSuperscript(factor)) {
			const exponent = ctx.rationalValue(factor.superscript);
			if (exponent === null || exponent.d !== 1n) return null;
			if (exponent.n < 1n || exponent.n > MAX_FACTOR_POWER) return null;
			const base = stripDelimiters(factor.base);
			const baseValue = ctx.rationalValue(base);
			if (baseValue !== null && baseValue.n <= 0n) return null;
			factors.push({ base, power: exponent.n });
			continue;
		}
		// Un signe moins, une fraction, une somme nue : on ne distribue pas
		if (ctx.rationalValue(factor) !== null) return null;
		if (isOpposite(factor) || isDivision(factor)) return null;
		factors.push({ base: stripDelimiters(factor), power: 1n });
	}
	return factors;
}

/** `ⁿ√(base^power)` réécrit, convention des racines paires comprise. */
function rootOfFactor(factor: RadicandFactor, index: bigint): MathNode {
	if (factor.power === 1n) return rootOf(factor.base, index);
	const divisor = gcd(factor.power, index);
	const p = factor.power / divisor;
	const q = index / divisor;
	const needsAbs = index % 2n === 0n && factor.power % 2n === 0n && p % 2n === 1n;
	const base = needsAbs ? abs(factor.base) : factor.base;
	const root = q === 1n ? base : rootOf(base, q);
	return p === 1n ? root : superscript(root, number(p.toString()));
}

/** `ⁿ√(…)` distribué, ou `null` quand il n'y a rien à faire (cf. en-tête). */
function rewriteNthRootAt(node: MathNode, ctx: NthRootPowerContext): MathNode | null {
	const index = readRootIndex(node, ctx);
	if (index === null || !isFunction(node)) return null;
	if (findNodes(node.args[0], isUnit).length > 0) return null;

	const factors = readRadicandFactors(stripDelimiters(node.args[0]), ctx);
	if (factors === null) return null;
	// Rien à gagner : `ⁿ√x`, `ⁿ√8`, `ⁿ√(x+1)` sont déjà lus par la normalisation
	if (factors.length === 1 && factors[0].power === 1n) return null;
	// Racine paire : au plus une base d'exposant impair (cf. en-tête)
	if (index % 2n === 0n) {
		const oddBases = factors.filter((f) => !isNumber(f.base) && f.power % 2n === 1n);
		if (oddBases.length > 1) return null;
	}

	return factors
		.map((factor) => rootOfFactor(factor, index))
		.reduce((product, next) => multiply(product, next, 'implicit'));
}

/**
 * Distribue, de bas en haut, toute racine d'indice ≥ 3 dont le radicande est un
 * produit de puissances entières (cf. en-tête pour les exclusions).
 */
export function expandNthRootPowers(node: MathNode, ctx: NthRootPowerContext): MathNode {
	return mapNode(node, (current) => rewriteNthRootAt(current, ctx) ?? current);
}
