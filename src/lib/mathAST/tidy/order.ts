/**
 * Étape 8 du contrat : l'ordre canonique — **le même partout**, sommes
 * imbriquées comprises (finding K1 de la revue).
 *
 * - **Facteurs** : nombre (porté par le coefficient), puis variables, puis
 *   fonctions, puis le reste (sommes et puissances de sommes) ; à catégorie
 *   égale, ordre alphabétique de l'écriture de la base.
 * - **Termes** : degré décroissant (la constante finit donc dernière), puis,
 *   à degré égal, comparaison facteur par facteur de leur **écriture** —
 *   c'est elle qui met `4hx` avant `2h^2` et `(h+x)^2` avant `x^2`.
 *
 * L'écriture d'un terme est calculée **une fois par terme** avant le tri, pas
 * à chaque comparaison.
 *
 * @module mathAST/tidy/order
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { TidyFactor, TidyTerm } from './types';
import { toCustom } from '../custom-generator';
import { hashMathNode } from '../normal/hash';
import { ZERO, addRational, compareRational } from '../normal/rational';
import { buildFactor } from './build';

// =============================================================================
// Types
// =============================================================================

/** Clé d'ordre d'un terme, calculée une fois avant le tri. */
type TermOrderKey = {
	readonly degree: Rational;
	readonly factorTexts: readonly string[];
	readonly coefficient: Rational;
};

// =============================================================================
// Constantes
// =============================================================================

/** Rang de la catégorie d'une base dans un produit. */
const CATEGORY_SYMBOL = 0;
const CATEGORY_FUNCTION = 1;
const CATEGORY_OTHER = 2;

// =============================================================================
// Écriture d'un nœud
// =============================================================================

/**
 * L'écriture d'un nœud, utilisée comme clé d'ordre. `toCustom` lève sur les
 * quelques nœuds qu'il ne sait pas écrire (lettre grecque non gérée, style de
 * multiplication absent) : on retombe alors sur le hash, déterministe lui aussi.
 */
function writtenForm(node: MathNode): string {
	try {
		return toCustom(node);
	} catch {
		return hashMathNode(node);
	}
}

function categoryOf(base: MathNode): number {
	switch (base.type) {
		case 'variable':
		case 'greek':
		case 'constant':
		case 'symbol':
		case 'hole':
		case 'subscript':
			return CATEGORY_SYMBOL;
		case 'function':
			return CATEGORY_FUNCTION;
		default:
			return CATEGORY_OTHER;
	}
}

// =============================================================================
// Ordre des facteurs
// =============================================================================

function compareFactors(a: TidyFactor, b: TidyFactor): number {
	const categoryA = categoryOf(a.base);
	const categoryB = categoryOf(b.base);
	if (categoryA !== categoryB) return categoryA - categoryB;

	const textA = writtenForm(a.base);
	const textB = writtenForm(b.base);
	if (textA !== textB) return textA < textB ? -1 : 1;

	return compareRational(a.exponent, b.exponent);
}

/** Trie les facteurs d'un terme selon l'ordre canonique. */
export function sortFactors(factors: readonly TidyFactor[]): TidyFactor[] {
	return [...factors].sort(compareFactors);
}

// =============================================================================
// Ordre des termes
// =============================================================================

/** Degré d'un terme : la somme des exposants de ses facteurs. */
function termDegree(term: TidyTerm): Rational {
	let degree = ZERO;
	for (const factor of term.factors) degree = addRational(degree, factor.exponent);
	return degree;
}

function termOrderKey(term: TidyTerm): TermOrderKey {
	return {
		degree: termDegree(term),
		factorTexts: term.factors.map((factor) => writtenForm(buildFactor(factor))),
		coefficient: term.coefficient
	};
}

function compareOrderKeys(a: TermOrderKey, b: TermOrderKey): number {
	const degreeComparison = compareRational(b.degree, a.degree);
	if (degreeComparison !== 0) return degreeComparison;

	const shared = Math.min(a.factorTexts.length, b.factorTexts.length);
	for (let i = 0; i < shared; i++) {
		if (a.factorTexts[i] !== b.factorTexts[i]) {
			return a.factorTexts[i] < b.factorTexts[i] ? -1 : 1;
		}
	}

	if (a.factorTexts.length !== b.factorTexts.length) {
		return a.factorTexts.length - b.factorTexts.length;
	}

	return compareRational(b.coefficient, a.coefficient);
}

/** Ordonne les termes d'une somme, quel que soit son niveau d'imbrication. */
export function sortTerms(terms: readonly TidyTerm[]): TidyTerm[] {
	const decorated = terms.map((term) => ({ term, key: termOrderKey(term) }));
	decorated.sort((a, b) => compareOrderKeys(a.key, b.key));
	return decorated.map((entry) => entry.term);
}
