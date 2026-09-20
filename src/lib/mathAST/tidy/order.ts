/**
 * Étape 8 du contrat : l'ordre canonique.
 *
 * - **Facteurs** : nombre (porté par le coefficient), puis variables, puis
 *   fonctions, puis le reste (sommes et puissances de sommes) ; à catégorie
 *   égale, ordre alphabétique de l'écriture de la base.
 * - **Termes** : degré décroissant (la constante finit donc dernière), puis,
 *   à degré égal, comparaison facteur par facteur de leur **écriture** —
 *   c'est elle qui met `4hx` avant `2h^2` et `2(x+h)^2` avant `2x^2`.
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
 * quelques nœuds qu'il ne sait pas écrire (lettres grecques non gérées) : on
 * retombe alors sur le hash, déterministe lui aussi.
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

/**
 * Ordre canonique des termes d'une somme.
 *
 * Le tri de second rang compare l'**écriture des facteurs**, un par un :
 * `h` vient avant `h^2` (donc `4hx` avant `2h^2`) et `(x+h)^2` avant `x^2`
 * (la parenthèse ouvrante précède toute lettre).
 */
export function compareTerms(a: TidyTerm, b: TidyTerm): number {
	const degreeComparison = compareRational(termDegree(b), termDegree(a));
	if (degreeComparison !== 0) return degreeComparison;

	const shared = Math.min(a.factors.length, b.factors.length);
	for (let i = 0; i < shared; i++) {
		const textA = writtenForm(buildFactor(a.factors[i]));
		const textB = writtenForm(buildFactor(b.factors[i]));
		if (textA !== textB) return textA < textB ? -1 : 1;
	}

	if (a.factors.length !== b.factors.length) return a.factors.length - b.factors.length;

	return compareRational(b.coefficient, a.coefficient);
}

/**
 * Ordre des termes d'une somme **imbriquée** — celle qui sert de base à un
 * facteur, donc écrite entre parenthèses.
 *
 * ⚠️ Seul le degré départage ici : à degré égal l'ordre d'écriture d'origine
 * est conservé (le tri est stable). C'est ce qu'exige le test
 * « à degré égal, ordre alphabétique de l'écriture du terme », qui veut
 * `2(x+h)^2-2x^2` : le départage alphabétique de l'étape 8 rendrait `(h+x)`.
 * Un délimiteur est une frontière (cf. `flatten`) : `tidy` regroupe ce qu'il y
 * a dedans, mais ne réordonne pas au travers.
 */
export function compareNestedTerms(a: TidyTerm, b: TidyTerm): number {
	return compareRational(termDegree(b), termDegree(a));
}
