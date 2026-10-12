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
 * - **Somme de degré 1** (décision de David, 2026-10-06) : les termes négatifs
 *   passent derrière les positifs, chaque groupe gardant l'ordre ci-dessus —
 *   `1 − x`, `3 − 2x`, `x − 3`, `b − a`. De degré ≥ 2, l'ordre décroissant
 *   reste, signes compris : `−x² + x + 1`.
 * - **Somme sans variable** (décision de David, 2026-10-12) : le nombre
 *   rationnel passe en tête, comme dans les manuels — `1 + √5`, `3 + 2√2`,
 *   `1 + ln 2`, `1 + π`. `e`, `i`, `π` sont des constantes. Un rationnel
 *   négatif n'y passe que si tous les autres termes sont négatifs (`−1 − √2`) :
 *   sinon `√2 − 1` évite le signe − en tête.
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
import {
	ONE,
	ZERO,
	addRational,
	compareRational,
	equalRational,
	isNegative as isNegativeRational
} from '../normal/rational';
import { buildFactor } from './build';
import { variable } from '../factory';
import {
	isEulerConstant,
	isGreek,
	isHole,
	isImaginaryUnit,
	isSegmentLength,
	isSubscript,
	isSymbol,
	isVariable
} from '../guards';
import { mapNode } from '../transforms';

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

/**
 * Rang de la catégorie d'une base dans un produit. Les constantes `e`, `i`, `π`
 * forment la PREMIÈRE catégorie : devant toute lettre, latine (minuscule ou
 * majuscule) ou grecque. Comparées comme du texte, leurs clés (`\euler`, `\i`,
 * `\pi`) passaient derrière `A` et `\alpha` (`A\pi`, `\alpha \imaginaryI`).
 */
const CATEGORY_CONSTANT = 0;
const CATEGORY_SYMBOL = 1;
const CATEGORY_FUNCTION = 2;
const CATEGORY_OTHER = 3;

/** La constante d'Euler dans une clé d'ordre (voir `writtenForm`). */
const EULER_ORDER_KEY: MathNode = variable('\\euler');

/** L'unité imaginaire dans une clé d'ordre (voir `writtenForm`). */
const IMAGINARY_ORDER_KEY: MathNode = variable('\\i');

// =============================================================================
// Écriture d'un nœud
// =============================================================================

/**
 * L'écriture d'un nœud, utilisée comme clé d'ordre. `toCustom` lève sur les
 * quelques nœuds qu'il ne sait pas écrire (lettre grecque non gérée, style de
 * multiplication absent) : on retombe alors sur le hash, déterministe lui aussi.
 *
 * La constante d'Euler s'y range sous `\euler`, comme `\pi` sous `\pi` : les
 * constantes passent devant les lettres (`\pi a`, `e a`). `toCustom` l'écrit
 * `e`, qui la rangerait parmi les lettres (`a e`). Le nom `\euler` ne sert qu'à
 * la clé : il n'est jamais affiché ni relu.
 *
 * L'unité imaginaire de même, sous `\i`. Entre constantes (catégorie à part,
 * voir `categoryOf`), l'ordre des clés donne `e`, `i`, `π` (`e i`, `i\pi`,
 * l'écriture de `e^{i\pi}`).
 */
function writtenForm(node: MathNode): string {
	try {
		return toCustom(
			mapNode(node, (n) =>
				isEulerConstant(n) ? EULER_ORDER_KEY : isImaginaryUnit(n) ? IMAGINARY_ORDER_KEY : n
			)
		);
	} catch {
		return hashMathNode(node);
	}
}

function categoryOf(base: MathNode): number {
	if (isImaginaryUnit(base)) return CATEGORY_CONSTANT;
	switch (base.type) {
		case 'constant':
			return CATEGORY_CONSTANT;
		case 'variable':
		case 'greek':
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

/** Le degré total d'une somme : le plus grand degré de ses termes. */
function sumDegree(keys: readonly TermOrderKey[]): Rational | null {
	let degree: Rational | null = null;
	for (const key of keys) {
		if (degree === null || compareRational(key.degree, degree) > 0) degree = key.degree;
	}
	return degree;
}

/** La somme est-elle de degré total 1 (`2x − 3`, `b − a`, mais pas `x² − x`) ? */
export function isFirstDegreeSum(terms: readonly TidyTerm[]): boolean {
	const degree = sumDegree(terms.map(termOrderKey));
	return degree !== null && equalRational(degree, ONE);
}

/**
 * Le nœud contient-il une inconnue ? Les constantes `e`, `i`, `π` n'en sont
 * pas (π est un nœud `constant`, jamais `greek`) ; une lettre, une lettre
 * grecque, un indice (`u_0`), une longueur (`AB`), un trou ou un symbole en
 * sont (prudence : l'ordre ne change alors pas).
 */
function containsUnknown(node: MathNode): boolean {
	let found = false;
	mapNode(node, (n) => {
		if (
			isVariable(n) ||
			isGreek(n) ||
			isSubscript(n) ||
			isSegmentLength(n) ||
			isHole(n) ||
			isSymbol(n)
		) {
			found = true;
		}
		return n;
	});
	return found;
}

/** Un terme qui n'est qu'un nombre rationnel (ni facteur, ni unité). */
function isRationalTerm(term: TidyTerm): boolean {
	return term.factors.length === 0 && !term.verbatim && term.unit === null;
}

/**
 * Somme sans variable : le rationnel passe en tête (`1 + √5`). Négatif, il n'y
 * passe que si tous les autres termes le sont aussi (`−1 − √2`, mais `√2 − 1`).
 * Toute somme qui contient une variable, une unité ou un terme opaque est
 * rendue telle quelle.
 */
function rationalFirst(sorted: readonly TidyTerm[]): TidyTerm[] {
	const index = sorted.findIndex(isRationalTerm);
	if (index <= 0) return [...sorted];
	const others = sorted.filter((_, i) => i !== index);
	const plain = others.every(
		(term) =>
			!term.verbatim &&
			term.unit === null &&
			term.factors.every((factor) => !containsUnknown(factor.base))
	);
	if (!plain) return [...sorted];
	const rational = sorted[index];
	if (
		isNegativeRational(rational.coefficient) &&
		!others.every((term) => isNegativeRational(term.coefficient))
	) {
		return [...sorted];
	}
	return [rational, ...others];
}

/** Ordonne les termes d'une somme, quel que soit son niveau d'imbrication. */
export function sortTerms(terms: readonly TidyTerm[]): TidyTerm[] {
	const decorated = terms.map((term) => ({ term, key: termOrderKey(term) }));
	decorated.sort((a, b) => compareOrderKeys(a.key, b.key));
	const sorted = decorated.map((entry) => entry.term);

	const degree = sumDegree(decorated.map((entry) => entry.key));
	if (degree === null || !equalRational(degree, ONE)) return rationalFirst(sorted);

	// Degré 1 : les positifs devant, les négatifs derrière, l'ordre gardé dans
	// chaque groupe. Idempotent : trier à nouveau redonne les mêmes groupes.
	const isNegativeTerm = (term: TidyTerm) => isNegativeRational(term.coefficient);
	return rationalFirst([
		...sorted.filter((term) => !isNegativeTerm(term)),
		...sorted.filter(isNegativeTerm)
	]);
}
