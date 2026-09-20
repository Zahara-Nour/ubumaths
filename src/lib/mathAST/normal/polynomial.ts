/**
 * MathAST Normal Form - Polynomial Operations
 *
 * Operations on polynomials (lists of NormalTerm).
 * A polynomial is represented as a sorted list of terms with distinct monomials.
 */

import { checkAbort, getActiveAbortChecker } from '../common/abort';
import type { NormalTerm, AlgebraicCoefficient, SymbolicFactor } from './types';
import { hashMathNode, hashPolynomial } from './hash';
import {
	ALGEBRAIC_ONE,
	addAlgebraic,
	divAlgebraic,
	gcdAlgebraic,
	isOneAlgebraic,
	isZeroAlgebraic
} from './algebraic';
import {
	ONE_TERM,
	mulTerms,
	negTerm,
	isZeroTerm,
	getMonomialSignature,
	sortNormalTerms
} from './term';
import { gcdMonomials, divMonomials } from './monomial';

// =============================================================================
// Constants
// =============================================================================

/** Empty polynomial (represents zero) */
export const ZERO_POLYNOMIAL: readonly NormalTerm[] = [];

/** Polynomial representing one */
export const ONE_POLYNOMIAL: readonly NormalTerm[] = [ONE_TERM];

// =============================================================================
// Normalization
// =============================================================================

/**
 * Collects like terms in a polynomial.
 *
 * Groups terms by monomial signature and combines their coefficients.
 * Eliminates zero terms and sorts result canonically.
 *
 * @param terms - Array of terms (may have duplicate monomials)
 * @returns Normalized polynomial with distinct monomials
 *
 * @example
 * // 3x + 2x = 5x
 * collectLikeTerms([3*x, 2*x]) // [5*x]
 *
 * // 3x + 2y stays as 3x + 2y
 * collectLikeTerms([3*x, 2*y]) // [3*x, 2*y]
 */
export function collectLikeTerms(terms: NormalTerm[]): NormalTerm[] {
	if (terms.length === 0) return [];

	// Group by monomial signature
	const groups = new Map<
		string,
		{ coefficient: AlgebraicCoefficient; monomial: readonly import('./types').SymbolicFactor[] }
	>();

	for (const term of terms) {
		if (isZeroTerm(term)) continue;

		const sig = getMonomialSignature(term);
		const existing = groups.get(sig);

		if (existing) {
			// Add coefficients
			const newCoefficient = addAlgebraic(existing.coefficient, term.coefficient);
			groups.set(sig, { coefficient: newCoefficient, monomial: existing.monomial });
		} else {
			groups.set(sig, { coefficient: term.coefficient, monomial: term.monomial });
		}
	}

	// Convert back to array, filtering zeros
	const result: NormalTerm[] = [];
	for (const [, value] of groups) {
		if (!isZeroAlgebraic(value.coefficient)) {
			result.push({ coefficient: value.coefficient, monomial: value.monomial });
		}
	}

	// Sort canonically
	return sortNormalTerms(result);
}

// =============================================================================
// Arithmetic Operations
// =============================================================================

/**
 * Adds two polynomials.
 *
 * @param a - First polynomial
 * @param b - Second polynomial
 * @returns a + b with like terms collected
 *
 * @example
 * // (2x + 3) + (3x + 1) = 5x + 4
 * addPolynomials([2*x, 3], [3*x, 1])
 */
export function addPolynomials(a: readonly NormalTerm[], b: readonly NormalTerm[]): NormalTerm[] {
	// Short-circuit for zero
	if (a.length === 0) return [...b];
	if (b.length === 0) return [...a];

	// Concatenate and collect like terms
	const allTerms = [...a, ...b];
	return collectLikeTerms(allTerms);
}

/**
 * Subtracts two polynomials.
 *
 * @param a - First polynomial
 * @param b - Second polynomial
 * @returns a - b
 *
 * @example
 * // (5x + 3) - (2x + 1) = 3x + 2
 * subPolynomials([5*x, 3], [2*x, 1])
 */
export function subPolynomials(a: readonly NormalTerm[], b: readonly NormalTerm[]): NormalTerm[] {
	// Short-circuit for zero
	if (b.length === 0) return [...a];
	if (a.length === 0) return negPolynomial(b);

	// a - b = a + (-b)
	return addPolynomials(a, negPolynomial(b));
}

/**
 * Negates a polynomial.
 *
 * @param p - A polynomial
 * @returns -p
 *
 * @example
 * // -(3x + 2) = -3x - 2
 * negPolynomial([3*x, 2])
 */
export function negPolynomial(p: readonly NormalTerm[]): NormalTerm[] {
	if (p.length === 0) return [];

	return p.map((term) => negTerm(term));
}

/**
 * Multiplies two polynomials.
 *
 * Uses distribution: (sum of a_i) * (sum of b_j) = sum of (a_i * b_j)
 *
 * @param a - First polynomial
 * @param b - Second polynomial
 * @returns a * b with like terms collected
 *
 * @example
 * // (a + b)^2 = (a + b) * (a + b) = a^2 + 2ab + b^2
 * mulPolynomials([a, b], [a, b])
 *
 * // (x + 1) * (x - 1) = x^2 - 1
 * mulPolynomials([x, 1], [x, -1])
 */
export function mulPolynomials(a: readonly NormalTerm[], b: readonly NormalTerm[]): NormalTerm[] {
	// Short-circuit for zero
	if (a.length === 0 || b.length === 0) return [];

	// Short-circuit for one
	if (isOnePolynomial(a)) return [...b];
	if (isOnePolynomial(b)) return [...a];

	// Distribution. La boucle externe consulte le signal d'interruption : c'est
	// ici que le développement d'une puissance de somme large consomme le tas,
	// et un `timeoutMs` ne bornait rien tant que personne ne le lisait.
	const abortChecker = getActiveAbortChecker();
	const products: NormalTerm[] = [];

	for (const termA of a) {
		checkAbort(abortChecker);
		for (const termB of b) {
			const product = mulTerms(termA, termB);
			if (!isZeroTerm(product)) {
				products.push(product);
			}
		}
	}

	// Collect like terms
	return collectLikeTerms(products);
}

/**
 * Raises a polynomial to a non-negative integer power.
 *
 * @param p - A polynomial
 * @param n - The exponent (non-negative integer)
 * @returns p^n
 * @throws Error if n is negative
 *
 * @example
 * // (a + b)^2 = a^2 + 2ab + b^2
 * powPolynomial([a, b], 2)
 */
export function powPolynomial(p: readonly NormalTerm[], n: number): NormalTerm[] {
	if (!Number.isInteger(n) || n < 0) {
		throw new Error('powPolynomial: exponent must be a non-negative integer');
	}

	if (n === 0) return [...ONE_POLYNOMIAL];
	if (n === 1) return [...p];
	if (p.length === 0) return [];

	// Use repeated squaring
	const abortChecker = getActiveAbortChecker();
	let result = [...ONE_POLYNOMIAL];
	let base = [...p];
	let exp = n;

	while (exp > 0) {
		checkAbort(abortChecker);
		if (exp % 2 === 1) {
			result = mulPolynomials(result, base);
		}
		// Le dernier carré est inutile : `exp` vaut 1, la boucle s'arrête après.
		// Il coûtait pourtant le carré du plus gros polynôme de tout le calcul.
		exp = Math.floor(exp / 2);
		if (exp > 0) base = mulPolynomials(base, base);
	}

	return result;
}

// =============================================================================
// Predicates
// =============================================================================

/**
 * Checks if a polynomial is zero.
 *
 * @param p - A polynomial
 * @returns true if polynomial has no terms
 */
export function isZeroPolynomial(p: readonly NormalTerm[]): boolean {
	return p.length === 0;
}

/**
 * Checks if a polynomial is one.
 *
 * @param p - A polynomial
 * @returns true if polynomial equals 1
 */
export function isOnePolynomial(p: readonly NormalTerm[]): boolean {
	if (p.length !== 1) return false;
	const term = p[0];
	return (
		term.monomial.length === 0 &&
		term.coefficient.terms.length === 1 &&
		term.coefficient.terms[0].radicals.length === 0 &&
		term.coefficient.terms[0].rational.n === 1n &&
		term.coefficient.terms[0].rational.d === 1n &&
		!term.coefficient.terms[0].hasImaginaryUnit
	);
}

/**
 * Checks if a polynomial is a constant (no variables).
 *
 * @param p - A polynomial
 * @returns true if all terms have empty monomials
 */
export function isConstantPolynomial(p: readonly NormalTerm[]): boolean {
	return p.every((term) => term.monomial.length === 0);
}

/**
 * Checks if two polynomials are equal.
 *
 * Since polynomials are in canonical form, we can compare term by term.
 *
 * @param a - First polynomial
 * @param b - Second polynomial
 * @returns true if polynomials are identical
 */
export function polynomialsEqual(a: readonly NormalTerm[], b: readonly NormalTerm[]): boolean {
	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; i++) {
		// Import from term to avoid circular dep
		const termA = a[i];
		const termB = b[i];

		// Compare monomials
		if (termA.monomial.length !== termB.monomial.length) return false;
		for (let j = 0; j < termA.monomial.length; j++) {
			const factorA = termA.monomial[j];
			const factorB = termB.monomial[j];
			// Compare base hashes
			if (hashMathNode(factorA.base) !== hashMathNode(factorB.base)) return false;
			// Compare exponents
			if (factorA.exponent.n !== factorB.exponent.n || factorA.exponent.d !== factorB.exponent.d) {
				return false;
			}
		}

		// Compare coefficients
		if (termA.coefficient.terms.length !== termB.coefficient.terms.length) return false;
		for (let j = 0; j < termA.coefficient.terms.length; j++) {
			const coeffA = termA.coefficient.terms[j];
			const coeffB = termB.coefficient.terms[j];
			if (coeffA.rational.n !== coeffB.rational.n || coeffA.rational.d !== coeffB.rational.d) {
				return false;
			}
			if (coeffA.radicals.length !== coeffB.radicals.length) return false;
			for (let k = 0; k < coeffA.radicals.length; k++) {
				if (
					coeffA.radicals[k].radicand !== coeffB.radicals[k].radicand ||
					coeffA.radicals[k].index !== coeffB.radicals[k].index
				) {
					return false;
				}
			}
		}
	}

	return true;
}

// =============================================================================
// Degree Operations
// =============================================================================

/**
 * Gets the total degree of a polynomial.
 *
 * The degree is the maximum degree among all terms.
 *
 * @param p - A polynomial
 * @returns The total degree, or -Infinity for zero polynomial
 */
export function polynomialDegree(p: readonly NormalTerm[]): number {
	if (p.length === 0) return -Infinity;

	let maxDegree = -Infinity;
	for (const term of p) {
		let termDegree = 0;
		for (const factor of term.monomial) {
			termDegree += Number(factor.exponent.n) / Number(factor.exponent.d);
		}
		maxDegree = Math.max(maxDegree, termDegree);
	}

	return maxDegree;
}

/**
 * Gets the leading term of a polynomial.
 *
 * The leading term is the first term in canonical order (highest degree).
 *
 * @param p - A polynomial (must be non-empty)
 * @returns The leading term
 */
export function leadingTerm(p: readonly NormalTerm[]): NormalTerm | null {
	if (p.length === 0) return null;
	return p[0];
}

// =============================================================================
// Polynomial GCD (for fraction reduction)
// =============================================================================

/**
 * Computes the GCD of two polynomials for fraction reduction.
 *
 * This implementation handles the common case where both polynomials
 * are monomials (single terms), which allows canceling common variable factors.
 *
 * For multi-term polynomials, we currently only extract common monomial factors.
 * Full polynomial GCD is complex and not implemented yet.
 *
 * @param a - First polynomial
 * @param b - Second polynomial
 * @returns GCD polynomial (single term representing common monomial factor)
 */
export function gcdPolynomials(a: readonly NormalTerm[], b: readonly NormalTerm[]): NormalTerm[] {
	if (a.length === 0 || b.length === 0) return [...ONE_POLYNOMIAL];

	// Extract common monomial factor from each polynomial
	const monomialGcdA = extractCommonMonomial(a);
	const monomialGcdB = extractCommonMonomial(b);

	// GCD of the common monomials
	const commonMonomial = gcdMonomials(monomialGcdA, monomialGcdB);

	if (commonMonomial.length === 0) {
		return [...ONE_POLYNOMIAL];
	}

	// Return as a single term with coefficient 1
	return [{ coefficient: ALGEBRAIC_ONE, monomial: commonMonomial }];
}

/**
 * Extracts the common monomial factor from a polynomial.
 *
 * For a polynomial like 3x^2 + 6x, the common monomial is x (not 3x).
 * We only extract variable factors, not numeric GCDs.
 *
 * @param p - A polynomial
 * @returns The common monomial (intersection of all term monomials with min exponents)
 */
function extractCommonMonomial(p: readonly NormalTerm[]): SymbolicFactor[] {
	if (p.length === 0) return [];
	if (p.length === 1) return [...p[0].monomial];

	// Start with the first term's monomial
	let common = [...p[0].monomial];

	// Intersect with each subsequent term's monomial
	for (let i = 1; i < p.length && common.length > 0; i++) {
		common = gcdMonomials(common, p[i].monomial);
	}

	return common;
}

/**
 * Divides a polynomial by a monomial.
 *
 * @param p - The polynomial to divide
 * @param m - The monomial divisor
 * @returns The quotient polynomial
 */
export function divPolynomialByMonomial(
	p: readonly NormalTerm[],
	m: readonly SymbolicFactor[]
): NormalTerm[] {
	if (m.length === 0) return [...p];
	if (p.length === 0) return [];

	const result: NormalTerm[] = [];

	for (const term of p) {
		const newMonomial = divMonomials(term.monomial, m);
		result.push({
			coefficient: term.coefficient,
			monomial: newMonomial
		});
	}

	return collectLikeTerms(result);
}

// =============================================================================
// Exact Multivariate Division (for fraction reduction)
// =============================================================================

/**
 * Ordre monomial utilisé par la division exacte : **graded lex**.
 *
 * Degré total d'abord, puis lexicographique sur les hachages de bases pris dans
 * l'ordre croissant. Deux raisons de ce choix :
 *
 * 1. C'est un ordre monomial valide — total, compatible avec la multiplication
 *    (`m1 > m2` ⟹ `m1·m > m2·m`) et bien fondé sur les exposants entiers
 *    positifs. C'est ce qui **garantit la terminaison** : à chaque tour le
 *    monôme de tête du reste décroît strictement, et il n'existe qu'un nombre
 *    fini de monômes sous un degré donné.
 * 2. Le degré total en premier fait chuter le degré du reste dès le premier
 *    tour, là où l'ordre lexicographique pur peut traîner longtemps sur des
 *    monômes de même degré. Le départage par hachage de base — et non par
 *    l'ordre d'apparition des facteurs — rend l'ordre déterministe, quelle que
 *    soit la manière dont les termes ont été construits.
 *
 * @param a - Premier monôme
 * @param b - Second monôme
 * @returns Négatif si a < b, positif si a > b, 0 s'ils sont identiques
 */
function compareMonomialsGradedLex(
	a: readonly SymbolicFactor[],
	b: readonly SymbolicFactor[]
): number {
	// ⚠️ Précondition : un monôme porte au plus UN facteur par base, ce que
	// `mulTerms` garantit. Sur une entrée non canonique la comparaison est
	// fausse — mesuré, `cmp([x¹, x²], [x³])` rend −1 au lieu de 0, le degré
	// total additionnant 1+2 tandis que la table ci-dessous n'en retient qu'un.
	// Rien dans `normalize` ne produit ça ; on ne paie pas une fusion défensive
	// à chaque comparaison pour un cas qui n'arrive pas.
	// Degré total (les exposants sont des entiers positifs, cf. la garde)
	let degreeA = 0n;
	for (const factor of a) degreeA += factor.exponent.n;
	let degreeB = 0n;
	for (const factor of b) degreeB += factor.exponent.n;
	if (degreeA !== degreeB) return degreeA < degreeB ? -1 : 1;

	// À degré égal : lexicographique sur les bases triées par hachage
	const exponentsA = new Map<string, bigint>();
	for (const factor of a) exponentsA.set(hashMathNode(factor.base), factor.exponent.n);
	const exponentsB = new Map<string, bigint>();
	for (const factor of b) exponentsB.set(hashMathNode(factor.base), factor.exponent.n);

	const bases = [...new Set([...exponentsA.keys(), ...exponentsB.keys()])].sort();
	for (const base of bases) {
		const expA = exponentsA.get(base) ?? 0n;
		const expB = exponentsB.get(base) ?? 0n;
		if (expA !== expB) return expA > expB ? 1 : -1;
	}

	return 0;
}

/**
 * Vérifie que tous les exposants d'un polynôme sont des entiers strictement
 * positifs.
 *
 * La division exacte ne sait raisonner que là-dessus : un exposant fractionnaire
 * (`x^{1/2}`) ou négatif (`x^{-1}`) casserait la bonne fondation de l'ordre
 * monomial, donc la terminaison. Hors de ce domaine, on renonce.
 */
function hasPositiveIntegerExponents(p: readonly NormalTerm[]): boolean {
	for (const term of p) {
		for (const factor of term.monomial) {
			if (factor.exponent.d !== 1n || factor.exponent.n <= 0n) return false;
		}
	}
	return true;
}

/**
 * Terme de tête d'un polynôme pour l'ordre graded lex.
 *
 * Les polynômes sont stockés dans l'ordre canonique du module, qui n'est pas
 * l'ordre monomial de la division : on cherche donc explicitement le maximum.
 */
function leadingTermGradedLex(p: readonly NormalTerm[]): NormalTerm | null {
	if (p.length === 0) return null;

	let best = p[0];
	for (let i = 1; i < p.length; i++) {
		if (compareMonomialsGradedLex(p[i].monomial, best.monomial) > 0) {
			best = p[i];
		}
	}
	return best;
}

/**
 * Divise un terme par un autre, exactement.
 *
 * @returns Le quotient, ou `null` si le monôme de `b` ne divise pas celui de
 *   `a` (exposant négatif) ou si les coefficients ne se divisent pas dans le
 *   domaine algébrique.
 */
function divideTermExactly(a: NormalTerm, b: NormalTerm): NormalTerm | null {
	const monomial = divMonomials(a.monomial, b.monomial);
	for (const factor of monomial) {
		if (factor.exponent.n < 0n) return null;
	}

	const coefficient = divAlgebraic(a.coefficient, b.coefficient);
	if (coefficient === null || isZeroAlgebraic(coefficient)) return null;

	return { coefficient, monomial };
}

/**
 * Division exacte de deux polynômes, à plusieurs variables.
 *
 * Rend `q` tel que `a = b·q` **exactement**, ou `null` si `b` ne divise pas
 * `a`. Ce n'est PAS un pgcd multivarié : on ne cherche pas un facteur commun,
 * on teste une divisibilité.
 *
 * Algorithme : division multivariée classique pour l'ordre graded lex décrit
 * sur `compareMonomialsGradedLex`. Tant que le reste n'est pas nul, si son
 * terme de tête est divisible par celui de `b`, on lui retranche
 * `(lt(r)/lt(b))·b` ; sinon on rend `null`.
 *
 * ## Le filet de sécurité
 *
 * Avant de rendre `q`, on **recalcule `b·q` et on le compare à `a`**. Un faux
 * positif du décideur d'équivalence compte juste une réponse fausse d'élève :
 * c'est le risque numéro un ici, et cette vérification le rend structurellement
 * impossible — si le produit ne redonne pas `a`, on rend `null`, quoi qu'ait
 * cru la boucle.
 *
 * @param a - Dividende
 * @param b - Diviseur
 * @returns `q` tel que `a = b·q`, ou `null`
 *
 * @example
 * // (x+y)² / (x+y) = x+y
 * exactDividePolynomials(xPlusYSquared, xPlusY)
 *
 * // (x+y)² / (x+2y) → null : le reste ne s'annule pas
 * exactDividePolynomials(xPlusYSquared, xPlusTwoY)
 */
export function exactDividePolynomials(
	a: readonly NormalTerm[],
	b: readonly NormalTerm[]
): NormalTerm[] | null {
	// Division par zéro : pas de quotient
	if (b.length === 0) return null;
	// 0 = b·0
	if (a.length === 0) return [];
	if (isOnePolynomial(b)) return [...a];

	// Hors du domaine des exposants entiers positifs, on renonce
	if (!hasPositiveIntegerExponents(a) || !hasPositiveIntegerExponents(b)) return null;

	const divisorLead = leadingTermGradedLex(b);
	if (divisorLead === null) return null;

	// Comme `mulPolynomials`, la boucle consulte le signal d'interruption : le
	// reste peut enfler avant de s'annuler, et un `timeoutMs` ne borne que ce
	// qu'on lui donne à lire.
	const abortChecker = getActiveAbortChecker();

	const quotientTerms: NormalTerm[] = [];
	let remainder: readonly NormalTerm[] = a;
	let previousLead: readonly SymbolicFactor[] | null = null;

	while (remainder.length > 0) {
		checkAbort(abortChecker);

		const remainderLead = leadingTermGradedLex(remainder);
		if (remainderLead === null) break;

		// Garde-fou de terminaison : le monôme de tête DOIT décroître strictement.
		// La théorie le garantit, mais une division de coefficients inexacte la
		// prendrait en défaut, et une boucle infinie gèlerait l'onglet de l'élève.
		if (
			previousLead !== null &&
			compareMonomialsGradedLex(remainderLead.monomial, previousLead) >= 0
		) {
			return null;
		}
		previousLead = remainderLead.monomial;

		const factor = divideTermExactly(remainderLead, divisorLead);
		if (factor === null) return null;

		quotientTerms.push(factor);
		remainder = subPolynomials(remainder, mulPolynomials(b, [factor]));
	}

	const quotient = collectLikeTerms(quotientTerms);

	// Filet de sécurité : le produit doit redonner le dividende, sinon rien.
	// Les DEUX côtés passent par `collectLikeTerms`, qui trie canoniquement.
	// `mulPolynomials` court-circuite quand un facteur vaut `1` et rend l'autre
	// tel quel, non trié : sans ce `collectLikeTerms`-ci, le filet comparerait un
	// tableau brut à un tableau trié et rejetterait une division valide.
	if (
		hashPolynomial(collectLikeTerms(mulPolynomials(b, quotient))) !==
		hashPolynomial(collectLikeTerms([...a]))
	) {
		return null;
	}

	return quotient;
}

// =============================================================================
// Conversion
// =============================================================================

/**
 * Converts a polynomial to a string representation.
 *
 * @param p - A polynomial
 * @returns Human-readable string
 */
export function polynomialToString(p: readonly NormalTerm[]): string {
	if (p.length === 0) return '0';

	return p
		.map((term, index) => {
			const termStr = termToStringSimple(term);
			if (index === 0) return termStr;

			// Check if term is negative
			const isNegative =
				term.coefficient.terms.length > 0 && term.coefficient.terms[0].rational.n < 0n;

			if (isNegative) {
				// Remove the leading minus and add " - "
				return ` - ${termStr.startsWith('-') ? termStr.slice(1) : termStr}`;
			}
			return ` + ${termStr}`;
		})
		.join('');
}

/**
 * Simple term to string conversion.
 */
function termToStringSimple(term: NormalTerm): string {
	if (isZeroTerm(term)) return '0';

	const coeffStr = coefficientToStringSimple(term.coefficient);

	if (term.monomial.length === 0) {
		return coeffStr;
	}

	const monomialStr = term.monomial
		.map((f) => {
			const baseStr = nodeToStringSimple(f.base);
			if (f.exponent.n === 1n && f.exponent.d === 1n) return baseStr;
			const expStr =
				f.exponent.d === 1n ? f.exponent.n.toString() : `(${f.exponent.n}/${f.exponent.d})`;
			return `${baseStr}^${expStr}`;
		})
		.join('');

	// Coefficient is 1: just show monomial
	if (
		term.coefficient.terms.length === 1 &&
		term.coefficient.terms[0].radicals.length === 0 &&
		term.coefficient.terms[0].rational.n === 1n &&
		term.coefficient.terms[0].rational.d === 1n
	) {
		return monomialStr;
	}

	// Coefficient is -1: show -monomial
	if (
		term.coefficient.terms.length === 1 &&
		term.coefficient.terms[0].radicals.length === 0 &&
		term.coefficient.terms[0].rational.n === -1n &&
		term.coefficient.terms[0].rational.d === 1n
	) {
		return `-${monomialStr}`;
	}

	return `${coeffStr}${monomialStr}`;
}

function coefficientToStringSimple(coef: AlgebraicCoefficient): string {
	if (coef.terms.length === 0) return '0';

	if (
		coef.terms.length === 1 &&
		coef.terms[0].radicals.length === 0 &&
		coef.terms[0].rational.d === 1n
	) {
		return coef.terms[0].rational.n.toString();
	}

	return `(${coef.terms
		.map((term) => {
			const rStr =
				term.rational.d === 1n
					? term.rational.n.toString()
					: `${term.rational.n}/${term.rational.d}`;
			if (term.radicals.length === 0) return rStr;
			const radStr = term.radicals
				.map((r) => (r.index === 2n ? `sqrt(${r.radicand})` : `root[${r.index}](${r.radicand})`))
				.join('');
			return term.rational.n === 1n && term.rational.d === 1n ? radStr : `${rStr}${radStr}`;
		})
		.join('+')})`;
}

function nodeToStringSimple(node: import('../types').MathNode): string {
	switch (node.type) {
		case 'variable':
			return node.name;
		case 'greek':
			return node.letter;
		case 'number':
			return node.value;
		default:
			return `[${node.type}]`;
	}
}

// =============================================================================
// Pgcd multivarié (facteur commun sans divisibilité)
// =============================================================================

/**
 * Plafonds du pgcd multivarié.
 *
 * Le pgcd n'est PAS prouvé correct — il n'a pas à l'être, tout candidat étant
 * revérifié par division exacte des deux côtés. Ce qui doit être garanti, c'est
 * qu'il **s'arrête**, et vite : il tourne dans `areEquivalent`, donc sur le
 * chemin d'une correction d'élève.
 *
 * Trois plafonds, chacun sur une grandeur qui peut enfler indépendamment :
 *
 * - `GCD_MAX_STEPS` — nombre total de tours de pseudo-division, **partagé par
 *   toute la récursion** (un budget, pas une profondeur). C'est la grandeur qui
 *   explose sur les suites de restes : les coefficients grossissent à chaque
 *   tour, et la récursion sur les coefficients repart pour un tour de plus.
 * - `GCD_MAX_TERMS` — taille d'un polynôme intermédiaire. La pseudo-division
 *   multiplie par le coefficient dominant du diviseur : un reste peut compter
 *   beaucoup plus de termes que les deux entrées réunies.
 * - `GCD_MAX_VARIABLES` — nombre de bases distinctes. Le coût de la récursion
 *   est exponentiel en ce nombre ; au-delà de quelques variables, on renonce.
 *
 * ## La mesure qui les fixe
 *
 * Décor : les deux suites ciblées du 2026-09-20 — `src/lib/mathAST/normal`
 * (1859 cas, 34 fichiers) et `src/lib/mathAST/simplify` (207 cas, 9 fichiers)
 * —, plafonds abaissés par dichotomie jusqu'à ce qu'un cas bascule au rouge.
 * Le plancher trouvé est le maximum réellement consommé par un appel :
 *
 * - **15 tours** (14 → un cas du contrat échoue, 15 → tout passe) ;
 * - **4 termes** de reste intermédiaire (3 → un cas échoue, 4 → tout passe) ;
 * - **3 variables** au plus dans tout le corpus.
 *
 * Aux plafonds abaissés à ce plancher exact, les deux suites rendent les mêmes
 * compteurs qu'aux plafonds larges : rien d'autre dans ces 2066 cas n'en
 * consomme davantage. Les valeurs retenues sont ~33× (tours) et 75× (termes)
 * la mesure — assez large pour ne jamais mordre sur ce que les élèves
 * écrivent, assez bas pour qu'un cas pathologique rende `null` en quelques
 * millisecondes au lieu de geler l'onglet.
 */
const GCD_MAX_STEPS = 500;
const GCD_MAX_TERMS = 300;
const GCD_MAX_VARIABLES = 5;

/** Budget PARTAGÉ par toute la récursion : un seul compteur, décrémenté partout. */
interface GcdBudget {
	steps: number;
}

/**
 * Dépense un tour du budget.
 * @returns `false` quand le plafond est atteint — l'appelant rend alors `null`.
 */
function spendStep(budget: GcdBudget): boolean {
	if (budget.steps <= 0) return false;
	budget.steps -= 1;
	return true;
}

/** Recense les bases distinctes d'un polynôme, indexées par hachage. */
function collectBases(p: readonly NormalTerm[]): Map<string, import('../types').MathNode> {
	const bases = new Map<string, import('../types').MathNode>();
	for (const term of p) {
		for (const factor of term.monomial) {
			const hash = hashMathNode(factor.base);
			if (!bases.has(hash)) bases.set(hash, factor.base);
		}
	}
	return bases;
}

/** Degré d'un polynôme en une base donnée (0 si la base est absente). */
function degreeInBase(p: readonly NormalTerm[], baseHash: string): number {
	let degree = 0;
	for (const term of p) {
		for (const factor of term.monomial) {
			if (hashMathNode(factor.base) === baseHash) {
				const exponent = Number(factor.exponent.n);
				if (exponent > degree) degree = exponent;
			}
		}
	}
	return degree;
}

/**
 * Vue récursive d'un polynôme : `p = Σ coeffs[i]·base^i`, où chaque `coeffs[i]`
 * est un polynôme dans les AUTRES bases.
 *
 * ⚠️ Même précondition que `compareMonomialsGradedLex` : un monôme ne porte
 * qu'un facteur par base.
 */
function splitByBase(p: readonly NormalTerm[], baseHash: string): NormalTerm[][] {
	const buckets: NormalTerm[][] = [];
	for (const term of p) {
		let degree = 0;
		const rest: SymbolicFactor[] = [];
		for (const factor of term.monomial) {
			if (hashMathNode(factor.base) === baseHash) {
				degree = Number(factor.exponent.n);
			} else {
				rest.push(factor);
			}
		}
		while (buckets.length <= degree) buckets.push([]);
		buckets[degree].push({ coefficient: term.coefficient, monomial: rest });
	}
	return buckets.map((bucket) => collectLikeTerms(bucket));
}

/** Reconstruit `coefficient·base^degree` comme polynôme. */
function mulByBasePower(
	p: readonly NormalTerm[],
	base: import('../types').MathNode,
	degree: number
): NormalTerm[] {
	if (degree === 0) return [...p];
	const power: NormalTerm[] = [
		{ coefficient: ALGEBRAIC_ONE, monomial: [{ base, exponent: { n: BigInt(degree), d: 1n } }] }
	];
	return mulPolynomials(p, power);
}

/**
 * Divise tous les coefficients par leur pgcd algébrique, pour empêcher les
 * entiers d'enfler le long de la suite de restes.
 *
 * Multiplier un candidat de pgcd par une constante ne change pas sa validité :
 * les coefficients vivent dans un corps, donc `exactDividePolynomials` réussit
 * de la même façon. En cas de division impossible (radicaux mélangés), on rend
 * le polynôme inchangé — on renonce à la normalisation, pas au calcul.
 */
function normalizeNumericContent(p: readonly NormalTerm[]): NormalTerm[] {
	if (p.length <= 1) return [...p];

	let content = p[0].coefficient;
	for (let i = 1; i < p.length; i++) {
		content = gcdAlgebraic(content, p[i].coefficient);
	}
	if (isZeroAlgebraic(content) || isOneAlgebraic(content)) return [...p];

	const result: NormalTerm[] = [];
	for (const term of p) {
		const coefficient = divAlgebraic(term.coefficient, content);
		if (coefficient === null || isZeroAlgebraic(coefficient)) return [...p];
		result.push({ coefficient, monomial: term.monomial });
	}
	return result;
}

/**
 * Contenu d'un polynôme vu en `baseHash` : pgcd de ses coefficients, qui sont
 * eux-mêmes des polynômes dans les autres bases. C'est ici que la récursion
 * descend d'une variable.
 *
 * @returns Le contenu, ou `null` si le budget est épuisé.
 */
function contentInBase(
	p: readonly NormalTerm[],
	baseHash: string,
	budget: GcdBudget
): NormalTerm[] | null {
	const coefficients = splitByBase(p, baseHash).filter((c) => c.length > 0);
	if (coefficients.length === 0) return [...ONE_POLYNOMIAL];

	let content = coefficients[0];
	for (let i = 1; i < coefficients.length; i++) {
		if (isConstantPolynomial(content)) return [...ONE_POLYNOMIAL];
		const next = gcdRecursive(content, coefficients[i], budget);
		if (next === null) return null;
		content = next;
	}
	return isConstantPolynomial(content) ? [...ONE_POLYNOMIAL] : content;
}

/**
 * Pseudo-reste de `a` par `b` en la base `baseHash`.
 *
 * Boucle classique : tant que le degré du reste atteint celui du diviseur, on
 * lui retranche `lc(r)·base^(deg r − deg b)·b` après l'avoir multiplié par
 * `lc(b)` — la multiplication par `lc(b)` évite de diviser des coefficients qui
 * ne forment pas un corps.
 *
 * Deux garde-fous : le budget partagé, et la décroissance STRICTE du degré,
 * qui est ce qui fait terminer la boucle. Si elle est prise en défaut (des
 * coefficients qui ne s'annulent pas comme prévu), on rend `null` plutôt que de
 * tourner.
 */
function pseudoRemainderInBase(
	a: readonly NormalTerm[],
	b: readonly NormalTerm[],
	baseHash: string,
	base: import('../types').MathNode,
	budget: GcdBudget
): NormalTerm[] | null {
	const degreeB = degreeInBase(b, baseHash);
	// Un diviseur de degré 0 en la base divise formellement tout : le
	// pseudo-reste est nul. Le court-circuit évite `deg(a)` tours inutiles.
	if (degreeB === 0) return [];

	const coefficientsB = splitByBase(b, baseHash);
	const leadB = coefficientsB[degreeB];
	if (leadB === undefined || leadB.length === 0) return null;

	const abortChecker = getActiveAbortChecker();
	let remainder: readonly NormalTerm[] = a;

	while (remainder.length > 0) {
		checkAbort(abortChecker);
		const degreeR = degreeInBase(remainder, baseHash);
		if (degreeR < degreeB) break;
		if (!spendStep(budget)) return null;

		const leadR = splitByBase(remainder, baseHash)[degreeR];
		if (leadR === undefined || leadR.length === 0) return null;

		const scaled = mulPolynomials(leadB, remainder);
		const subtracted = mulPolynomials(mulByBasePower(leadR, base, degreeR - degreeB), b);
		const next = subPolynomials(scaled, subtracted);

		if (next.length > GCD_MAX_TERMS) return null;
		// Le degré DOIT décroître strictement : c'est la terminaison.
		if (next.length > 0 && degreeInBase(next, baseHash) >= degreeR) return null;

		remainder = normalizeNumericContent(next);
	}

	return [...remainder];
}

/**
 * Cœur récursif du pgcd multivarié : suite de restes primitive sur une variable
 * principale, récursion sur les coefficients.
 *
 * @returns Un CANDIDAT de pgcd — non prouvé —, ou `null` si l'on renonce.
 */
function gcdRecursive(
	a: readonly NormalTerm[],
	b: readonly NormalTerm[],
	budget: GcdBudget
): NormalTerm[] | null {
	if (a.length === 0) return [...b];
	if (b.length === 0) return [...a];
	// Une constante n'a pas de facteur commun polynomial : le pgcd est une
	// constante, et un diviseur constant ne réduit rien ici.
	if (isConstantPolynomial(a) || isConstantPolynomial(b)) return [...ONE_POLYNOMIAL];
	if (a.length > GCD_MAX_TERMS || b.length > GCD_MAX_TERMS) return null;

	// Variable principale : une base présente des DEUX côtés. S'il n'y en a
	// aucune, tout diviseur commun est sans variable, donc constant.
	const basesA = collectBases(a);
	const basesB = collectBases(b);
	const shared = [...basesA.keys()].filter((hash) => basesB.has(hash)).sort();
	if (shared.length === 0) return [...ONE_POLYNOMIAL];

	// Le plus petit degré d'abord : c'est la variable la moins chère à éliminer.
	// Départage par hachage trié, pour que le résultat ne dépende pas de l'ordre
	// de construction des termes.
	let baseHash = shared[0];
	let bestDegree = Math.max(degreeInBase(a, baseHash), degreeInBase(b, baseHash));
	for (const candidate of shared.slice(1)) {
		const degree = Math.max(degreeInBase(a, candidate), degreeInBase(b, candidate));
		if (degree < bestDegree) {
			bestDegree = degree;
			baseHash = candidate;
		}
	}
	const base = basesA.get(baseHash);
	if (base === undefined) return null;

	// Contenus et parties primitives : le pgcd est (pgcd des contenus) × (pgcd
	// des parties primitives).
	const contentA = contentInBase(a, baseHash, budget);
	if (contentA === null) return null;
	const contentB = contentInBase(b, baseHash, budget);
	if (contentB === null) return null;

	const contentGcd = gcdRecursive(contentA, contentB, budget);
	if (contentGcd === null) return null;

	const primitiveA = isOnePolynomial(contentA) ? [...a] : exactDividePolynomials(a, contentA);
	if (primitiveA === null) return null;
	const primitiveB = isOnePolynomial(contentB) ? [...b] : exactDividePolynomials(b, contentB);
	if (primitiveB === null) return null;

	let current: readonly NormalTerm[] = primitiveA;
	let next: readonly NormalTerm[] = primitiveB;
	if (degreeInBase(current, baseHash) < degreeInBase(next, baseHash)) {
		[current, next] = [next, current];
	}

	const abortChecker = getActiveAbortChecker();
	while (next.length > 0) {
		checkAbort(abortChecker);
		if (!spendStep(budget)) return null;

		const remainder = pseudoRemainderInBase(current, next, baseHash, base, budget);
		if (remainder === null) return null;

		current = next;
		if (remainder.length === 0) {
			next = [];
		} else {
			const remainderContent = contentInBase(remainder, baseHash, budget);
			if (remainderContent === null) return null;
			const primitive = isOnePolynomial(remainderContent)
				? [...remainder]
				: exactDividePolynomials(remainder, remainderContent);
			if (primitive === null) return null;
			next = normalizeNumericContent(primitive);
		}
	}

	return normalizeNumericContent(mulPolynomials(contentGcd, current));
}

/**
 * Pgcd multivarié de deux polynômes — un **candidat**, pas une certitude.
 *
 * Algorithme : suite de restes **primitive** (primitive PRS), récursive sur les
 * variables. À chaque niveau on choisit une variable principale présente des
 * deux côtés, on sépare contenu et partie primitive (le contenu étant lui-même
 * un pgcd de polynômes dans les variables restantes → récursion), puis on
 * déroule la suite des pseudo-restes en rendant chaque reste primitif. Le pgcd
 * est le produit du pgcd des contenus par le dernier reste non nul.
 *
 * Variante choisie parmi les trois classiques (euclidienne à coefficients
 * fractionnaires, PRS primitive, PRS sous-résultante) : la **PRS primitive**.
 * Elle coûte un pgcd récursif de contenus à chaque tour, mais elle garde les
 * coefficients petits, et c'est la seule des trois qui reste lisible. La suite
 * sous-résultante serait plus rapide sur de gros degrés ; à 2 ou 3 variables et
 * degré ≤ 4 — ce que les élèves écrivent — la différence ne se mesure pas.
 *
 * ## Ce qui rend l'approche sûre
 *
 * Ce résultat n'est PAS prouvé être le pgcd. L'appelant DOIT le vérifier en
 * divisant exactement les deux polynômes par lui, et abandonner si l'une des
 * deux divisions échoue. Un candidat faux donne alors un faux négatif — une
 * fraction non réduite —, jamais un faux positif. C'est la propriété qui
 * compte : un faux positif du décideur compte une réponse d'élève FAUSSE.
 *
 * @param a - Premier polynôme
 * @param b - Second polynôme
 * @returns Un candidat de pgcd, ou `null` (hors domaine, plafond atteint, ou
 *   renoncement d'une division intermédiaire)
 */
export function gcdPolynomialsMultivariate(
	a: readonly NormalTerm[],
	b: readonly NormalTerm[]
): NormalTerm[] | null {
	if (a.length === 0 || b.length === 0) return null;

	// Même domaine que la division exacte : exposants entiers strictement
	// positifs. Hors de là, l'ordre monomial n'est plus bien fondé.
	if (!hasPositiveIntegerExponents(a) || !hasPositiveIntegerExponents(b)) return null;

	const bases = new Set([...collectBases(a).keys(), ...collectBases(b).keys()]);
	if (bases.size > GCD_MAX_VARIABLES) return null;

	const budget: GcdBudget = { steps: GCD_MAX_STEPS };
	const gcd = gcdRecursive(a, b, budget);
	if (gcd === null || gcd.length === 0) return null;
	// Un diviseur constant ne réduit rien et défigurerait la fraction.
	if (isConstantPolynomial(gcd)) return null;
	return gcd;
}
