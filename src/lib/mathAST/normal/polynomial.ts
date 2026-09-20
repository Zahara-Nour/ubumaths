/**
 * MathAST Normal Form - Polynomial Operations
 *
 * Operations on polynomials (lists of NormalTerm).
 * A polynomial is represented as a sorted list of terms with distinct monomials.
 */

import { checkAbort, getActiveAbortChecker } from '../common/abort';
import type { NormalTerm, AlgebraicCoefficient, SymbolicFactor } from './types';
import { hashMathNode, hashPolynomial } from './hash';
import { ALGEBRAIC_ONE, addAlgebraic, divAlgebraic, isZeroAlgebraic } from './algebraic';
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
	if (hashPolynomial(mulPolynomials(b, quotient)) !== hashPolynomial(collectLikeTerms([...a]))) {
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
