/**
 * Les identités de l'exponentielle pour l'écriture `e^{…}`, sur le chemin
 * d'ÉCRITURE de `normalize`.
 *
 * ## Le trou, mesuré
 *
 * `normalize` réduisait `ln(exp(x))` en `x`, `exp(ln x)` en `x`,
 * `exp(x)·exp(2x)` en `exp(3x)` — mais ne voyait dans `e^{x}` qu'une puissance
 * opaque. Le minimum de x² ln x s'affichait donc `ln(e^{−1/2})·(e^{−1/2})²`
 * au lieu de −1/(2e).
 *
 * ## Pourquoi pas `expandEulerPowers`
 *
 * `expandEulerPowers` réécrit `e^{u}` en `exp(u)` : la forme normale
 * s'afficherait alors `\exp(u)`, et `simplify(e^{x})` ne rendrait plus `e^x`
 * (décision de la PR #382 : on ne réécrit pas la notation de l'élève). Ce
 * module applique les identités en GARDANT l'écriture `e^{…}` :
 *
 * - `ln(eᵃ)` → `a` ;
 * - `e^{ln a}` → `a` (même convention que `exp(ln a)` dans `normalize` : le
 *   domaine a > 0 est celui de l'expression de départ) ;
 * - `(eᵃ)ⁿ` → `e^{an}` ;
 * - `eᵃ·eᵇ` → `e^{a+b}` dans un même produit (un `e` seul compte pour `e¹`) ;
 * - `e⁰` → `1` est déjà fait par la normalisation des puissances.
 *
 * Décision de David (option A, 2026-10-05) : `tidy` n'applique aucune
 * identité, c'est `normalize` qui le fait.
 *
 * ## Ce que ce module ne fait PAS
 *
 * - le quotient `eᵃ/eᵇ` ;
 * - un produit à travers des parenthèses de groupement englobant d'autres
 *   facteurs (`(2e^{x})·e^{x}`) : le produit s'aplatit en surface seulement.
 *
 * Sur le chemin de l'équivalence, `expandEulerPowers` passe AVANT et ne laisse
 * plus aucune puissance de `e` : ce module n'y change rien.
 */

import { add, multiply, number, superscript } from '../../factory';
import { flattenProductShallow, unflattenProduct, type StyledFactor } from '../../flatten';
import {
	isDelimiter,
	isEulerConstant,
	isFunction,
	isMultiplication,
	isSuperscript,
	isVariable
} from '../../guards';
import { findFirst, mapNode } from '../../transforms';
import type { MathNode } from '../../types';

export interface EulerIdentitiesContext {
	/**
	 * L'écriture canonique d'un exposant (`x + 2x` → `3x`, `2·(−1/2)` → `−1`).
	 * Fournie par `normalize`, que ce module ne peut pas importer sans cycle.
	 */
	readonly canonicalExponent: (exponent: MathNode) => MathNode;
}

/** Le contenu sous des parenthèses de groupement, sinon le nœud lui-même. */
function unwrapDelimiters(node: MathNode): MathNode {
	let current = node;
	while (isDelimiter(current)) current = current.content;
	return current;
}

/**
 * La base d'Euler : la constante `\exponentialE` ou la lettre `e` seule (même
 * contrepartie assumée que `euler-power.ts` : `e` y est le nombre d'Euler).
 */
function isEulerBase(node: MathNode): boolean {
	const inner = unwrapDelimiters(node);
	return isEulerConstant(inner) || (isVariable(inner) && inner.name === 'e');
}

/** Une puissance de la base d'Euler, sous ses éventuelles parenthèses. */
function asEulerPower(node: MathNode): { base: MathNode; exponent: MathNode } | null {
	const inner = unwrapDelimiters(node);
	if (isSuperscript(inner) && isEulerBase(inner.base)) {
		return { base: unwrapDelimiters(inner.base), exponent: inner.superscript };
	}
	return null;
}

/** `eᵃ` ou `e` seul (exposant `1`), sinon `null`. */
function asEulerFactor(node: MathNode): { base: MathNode; exponent: MathNode | null } | null {
	const power = asEulerPower(node);
	if (power !== null) return power;
	const inner = unwrapDelimiters(node);
	return isEulerBase(inner) ? { base: inner, exponent: null } : null;
}

/** `ln(eᵃ)` → `a`. */
function reduceLnOfEulerPower(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'ln' || node.args.length !== 1) return null;
	const power = asEulerPower(node.args[0]);
	return power === null ? null : power.exponent;
}

/** `e^{ln a}` → `a`, `(eᵃ)ⁿ` → `e^{an}`. */
function reduceEulerPower(node: MathNode, ctx: EulerIdentitiesContext): MathNode | null {
	if (!isSuperscript(node)) return null;

	if (isEulerBase(node.base)) {
		const exponent = unwrapDelimiters(node.superscript);
		if (isFunction(exponent) && exponent.name === 'ln' && exponent.args.length === 1) {
			return exponent.args[0];
		}
		return null;
	}

	const inner = asEulerPower(node.base);
	if (inner === null) return null;
	return superscript(
		inner.base,
		ctx.canonicalExponent(multiply(inner.exponent, node.superscript, 'implicit'))
	);
}

/**
 * `eᵃ·eᵇ` → `e^{a+b}` dans un produit, à la place du premier facteur
 * exponentiel. La constante l'emporte sur la lettre si les deux se côtoient.
 */
function mergeEulerFactors(node: MathNode, ctx: EulerIdentitiesContext): MathNode | null {
	if (!isMultiplication(node)) return null;

	const factors = flattenProductShallow(node);
	const eulerIndices: number[] = [];
	let powerCount = 0;
	for (let i = 0; i < factors.length; i++) {
		const factor = asEulerFactor(factors[i].factor);
		if (factor === null) continue;
		eulerIndices.push(i);
		if (factor.exponent !== null) powerCount++;
	}
	// Au moins une vraie puissance : `e·e` reste à la normalisation des monômes.
	if (eulerIndices.length < 2 || powerCount === 0) return null;

	let exponentSum: MathNode | null = null;
	let base: MathNode | null = null;
	for (const index of eulerIndices) {
		const factor = asEulerFactor(factors[index].factor);
		if (factor === null) continue;
		const exponent: MathNode = factor.exponent ?? number('1');
		exponentSum = exponentSum === null ? exponent : add(exponentSum, exponent);
		if (base === null || isEulerConstant(factor.base)) base = factor.base;
	}
	if (exponentSum === null || base === null) return null;

	const merged = superscript(base, ctx.canonicalExponent(exponentSum));
	const first = eulerIndices[0];
	const kept: StyledFactor[] = [];
	for (let i = 0; i < factors.length; i++) {
		if (i === first) kept.push({ style: factors[i].style, factor: merged });
		else if (!eulerIndices.includes(i)) kept.push(factors[i]);
	}
	return unflattenProduct(kept);
}

/**
 * Applique les identités de la base d'Euler, de bas en haut.
 *
 * Rend le nœud INCHANGÉ (même référence) s'il ne contient aucune base
 * d'Euler : la forme normale de tout ce qui n'a pas d'exponentielle ne bouge
 * pas, et la passe ne coûte qu'une recherche.
 */
export function applyEulerIdentities(node: MathNode, ctx: EulerIdentitiesContext): MathNode {
	if (findFirst(node, isEulerBase) === undefined) return node;
	return mapNode(
		node,
		(current) =>
			reduceLnOfEulerPower(current) ??
			reduceEulerPower(current, ctx) ??
			mergeEulerFactors(current, ctx) ??
			current
	);
}
