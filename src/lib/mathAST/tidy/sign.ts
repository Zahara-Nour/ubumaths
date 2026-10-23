/**
 * Une base peut-elle s'annuler ? (S3, chantier simplify-carte, 2026-10-23)
 *
 * `tidy` ne simplifie une base entre numérateur et dénominateur que si elle
 * reste au dénominateur ou ne peut pas valoir 0 : `eˣ/eˣ → 1`, mais `x/x`
 * reste. Les réponses sont **prudentes** : `false` veut dire « pas prouvé »,
 * et la base reste alors des deux côtés de la barre.
 *
 * `numtype` répond pour les feuilles (constantes, variables sous hypothèse
 * déclarée) ; il ignore qu'un carré est positif ou nul et que `eˣ` est
 * positif (mesuré le 2026-10-23), d'où la lecture de structure ci-dessous.
 *
 * @module mathAST/tidy/sign
 */

import type { MathNode } from '../types';
import type { TypeContext } from '../numtype';
import { isNonNegativeType, isNonzeroType, isPositiveType } from '../numtype';
import { extractRational } from '../common/numeric';
import { hashMathNode } from '../normal/hash';
import { findNodes, getChildren } from '../transforms';
import { isVariable } from '../guards';

/** La base ne vaut 0 en aucun point où elle est définie. */
export function cannotVanish(node: MathNode, typeCtx: TypeContext | undefined): boolean {
	switch (node.type) {
		case 'number': {
			const value = extractRational(node);
			return value !== null && value.n !== 0n;
		}
		case 'delimiter':
			return cannotVanish(node.content, typeCtx);
		case 'positive':
		case 'opposite':
			return cannotVanish(node.operand, typeCtx);
		case 'multiplication':
			return cannotVanish(node.left, typeCtx) && cannotVanish(node.right, typeCtx);
		case 'division':
			return cannotVanish(node.numerator, typeCtx);
		case 'superscript':
			// a^b ≠ 0 là où il est défini, dès que a ≠ 0.
			return cannotVanish(node.base, typeCtx);
		case 'function':
			if (node.name === 'exp') return true;
			if (node.name === 'sqrt' || node.name === 'abs') {
				return node.args.length === 1 && cannotVanish(node.args[0], typeCtx);
			}
			break;
		case 'addition':
			return isPositive(node, typeCtx);
		default:
			break;
	}
	return isNonzeroType(node, typeCtx);
}

/** Strictement positif partout où c'est défini. */
function isPositive(node: MathNode, typeCtx: TypeContext | undefined): boolean {
	switch (node.type) {
		case 'number': {
			const value = extractRational(node);
			return value !== null && value.n > 0n;
		}
		case 'delimiter':
			return isPositive(node.content, typeCtx);
		case 'multiplication':
			return isPositive(node.left, typeCtx) && isPositive(node.right, typeCtx);
		case 'division':
			return isPositive(node.numerator, typeCtx) && isPositive(node.denominator, typeCtx);
		case 'superscript':
			return isPositive(node.base, typeCtx);
		case 'function':
			if (node.name === 'exp') return true;
			break;
		case 'addition':
			// Une somme de termes positifs ou nuls dont l'un est strictement positif.
			return (
				isNonNegative(node.left, typeCtx) &&
				isNonNegative(node.right, typeCtx) &&
				(isPositive(node.left, typeCtx) || isPositive(node.right, typeCtx))
			);
		default:
			break;
	}
	return isPositiveType(node, typeCtx);
}

/** Positif ou nul partout où c'est défini. */
function isNonNegative(node: MathNode, typeCtx: TypeContext | undefined): boolean {
	if (isPositive(node, typeCtx)) return true;
	switch (node.type) {
		case 'number': {
			const value = extractRational(node);
			return value !== null && value.n >= 0n;
		}
		case 'delimiter':
			return isNonNegative(node.content, typeCtx);
		case 'multiplication':
			return isNonNegative(node.left, typeCtx) && isNonNegative(node.right, typeCtx);
		case 'superscript': {
			// Une puissance paire : `x²`, `(x+1)⁴`.
			const exponent = extractRational(node.superscript);
			if (exponent !== null && exponent.d === 1n && exponent.n % 2n === 0n) return true;
			return isNonNegative(node.base, typeCtx);
		}
		case 'function':
			if (node.name === 'sqrt' || node.name === 'abs') return true;
			break;
		case 'addition':
			return isNonNegative(node.left, typeCtx) && isNonNegative(node.right, typeCtx);
		default:
			break;
	}
	return isNonNegativeType(node, typeCtx);
}

/**
 * Les bases non nulles sur un domaine acquis (option `domain` de `tidy`) :
 * l'argument d'un `ln` ou d'un `log`, un dénominateur, la base d'une puissance
 * négative ou d'exposant variable (`xˣ` n'est défini que pour x > 0). Un produit non nul a tous ses facteurs non nuls : `ln(2x)` dit
 * aussi `x ≠ 0`. Rendues par le hash de leur forme mise au propre, celle des
 * facteurs de `tidy`.
 *
 * @param domain - Les expressions dont le domaine de définition est acquis
 * @param tidyBase - La mise au propre (passée en argument : `collect` importe ce module)
 */
export function nonZeroBases(
	domain: readonly MathNode[],
	tidyBase: (node: MathNode) => MathNode
): ReadonlySet<string> {
	const bases = new Set<string>();
	const add = (node: MathNode): void => {
		switch (node.type) {
			case 'delimiter':
				add(node.content);
				return;
			case 'positive':
			case 'opposite':
				add(node.operand);
				return;
			case 'multiplication':
				add(node.left);
				add(node.right);
				return;
			case 'division':
				add(node.numerator);
				add(node.denominator);
				return;
			case 'superscript':
				add(node.base);
				return;
			default:
				bases.add(hashMathNode(node));
		}
	};
	const visit = (node: MathNode): void => {
		if (node.type === 'function' && (node.name === 'ln' || node.name === 'log')) {
			if (node.args.length === 1) add(tidyBase(node.args[0]));
		} else if (node.type === 'division') {
			add(tidyBase(node.denominator));
		} else if (node.type === 'superscript') {
			const exponent = extractRational(node.superscript);
			const variable = exponent === null && findNodes(node.superscript, isVariable).length > 0;
			if (variable || (exponent !== null && exponent.n < 0n)) add(tidyBase(node.base));
		}
		for (const child of getChildren(node)) visit(child);
	};
	for (const node of domain) visit(node);
	return bases;
}
