/**
 * La valeur approchée d'un résultat exact — le bouton ≈ de la vue Calcul.
 *
 * Décisions de David (2026-10-11, `docs/wip/atelier-cas-phase0.md`, PR 2) :
 * - **4 décimales**, zéros compris : `\approx 5.0990` ;
 * - une valeur dont l'écriture décimale tient dans l'arrondi s'écrit avec
 *   **=**, sans zéros inutiles : 1/4 → `= 0.25` ;
 * - **rien** pour un résultat déjà entier ou décimal, ni pour une expression
 *   littérale.
 *
 * ⚠️ « Exacte » se décide sur le RATIONNEL, jamais à une tolérance près : un
 * seuil relatif écrivait `= 485165195.4098` pour e²⁰ (revue).
 *
 * Hors de [10⁻⁶ ; 10⁹[, la **notation scientifique** du collège, 4 décimales sur la
 * mantisse : `\approx 8.7700 \times 10^{9}` (décisions a, b, c de David, 2026-10-12,
 * `docs/wip/mode-decimal-progress.md`). Un entier exact s'écrit en entier jusqu'à 15
 * chiffres. Mantisse et exposant se calculent sur la FRACTION exacte, jamais sur un
 * flottant : `0.3^{1000}` vaut 1,3221 × 10⁻⁵²³, hors de portée d'un flottant, et
 * 2⁶⁴ s'écrivait `18446744073709552000` (chiffres du flottant, faux).
 *
 * Le point décimal reste un point : la vue Calcul écrit la virgule à la
 * française à son point de passage (`decimal-comma.ts`), comme pour le reste.
 *
 * @module mathAST/cli/approximation
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { isMultiplication, isNumber, isOpposite, isSuperscript, isUnit } from '../guards';
import { multiply, number, opposite, power } from '../factory';
import { findNodes } from '../transforms';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToRational } from '../eval/evaluate';

// =============================================================================
// Types
// =============================================================================

/** Une valeur écrite en décimal, et si cette écriture est exacte. */
export interface ApproximateDigits {
	/** Le nombre décimal, ou la mantisse en notation scientifique, signe compris : `-8.7700`. */
	readonly digits: string;
	/** La puissance de 10 de la notation scientifique (`8.7700 × 10⁹` : 9), `null` sinon. */
	readonly exponent: number | null;
	readonly exact: boolean;
}

// =============================================================================
// Constantes
// =============================================================================

/** Le nombre de décimales de la valeur approchée (décision de David). */
const PLACES = 4;
const SCALE = 10n ** BigInt(PLACES);

/**
 * À partir de 10⁹, la notation scientifique : 4 décimales demanderaient plus de
 * chiffres qu'un flottant n'en porte (une fonction transcendante y entre par son
 * flottant), et la mantisse n'en montre que 5.
 */
const SCIENTIFIC_FROM = 10n ** 9n;

/** Sous 10⁻⁶ (10⁶ × valeur < 1), la notation scientifique. */
const SCIENTIFIC_BELOW_INVERSE = 10n ** 6n;

/** Un entier exact plus petit s'écrit en entier, sans `≈` (décision b : 15 chiffres). */
const WHOLE_BELOW = 10n ** 15n;

// =============================================================================
// Fonctions
// =============================================================================

/** Un nombre écrit tel quel (`3`, `2.5`, `-3`) : sa valeur approchée n'apprend rien. */
export function isWrittenNumber(node: MathNode): boolean {
	return isNumber(node) || (isOpposite(node) && isNumber(node.operand));
}

/** Les zéros inutiles d'une écriture décimale retirés : `0.2500` → `0.25`, `3.0000` → `3`. */
function withoutTrailingZeros(digits: string): string {
	return digits.includes('.') ? digits.replace(/\.?0+$/, '') : digits;
}

/** La valeur rationnelle d'une expression sans variable ni unité, ou `null`. */
function rationalOf(node: MathNode): Rational | null {
	if (getVariables(node).size > 0) return null;
	// L'arbre d'une grandeur a perdu le sens de son unité : pas de valeur approchée
	if (findNodes(node, isUnit).length > 0) return null;
	try {
		const { n, d } = evaluateNodeToRational(node);
		if (d === 0n) return null;
		return d < 0n ? { n: -n, d: -d } : { n, d };
	} catch {
		return null;
	}
}

/** `q` dix-millièmes, écrits avec leurs 4 décimales : `-14142` → `-1.4142`. */
function withPlaces(q: bigint): string {
	const size = q < 0n ? -q : q;
	const units = (size / SCALE).toString();
	const decimals = (size % SCALE).toString().padStart(PLACES, '0');
	return `${q < 0n ? '-' : ''}${units}.${decimals}`;
}

/** Le nombre de bits d'un entier positif. */
function bitLength(x: bigint): number {
	return x.toString(2).length;
}

/** size / d ⩾ 10^k, en entiers. */
function atLeastPowerOfTen(size: bigint, d: bigint, k: number): boolean {
	return k >= 0 ? size >= d * 10n ** BigInt(k) : size * 10n ** BigInt(-k) >= d;
}

/**
 * L'exposant décimal de size / d > 0 : le k tel que 10^k ⩽ size / d < 10^(k+1).
 * Estimé par le nombre de bits (à 1 près), puis ajusté en entiers.
 */
function decimalExponent(size: bigint, d: bigint): number {
	let k = Math.floor((bitLength(size) - bitLength(d)) * Math.log10(2));
	while (!atLeastPowerOfTen(size, d, k)) k -= 1;
	while (atLeastPowerOfTen(size, d, k + 1)) k += 1;
	return k;
}

/**
 * La notation scientifique de n / d (d > 0) : mantisse arrondie à 4 décimales
 * (demi loin de zéro), en entiers exacts. Une retenue garde la mantisse sous 10 :
 * 9,99996 × 10⁹ s'écrit 1,0000 × 10¹⁰.
 */
function scientific(n: bigint, d: bigint): ApproximateDigits {
	const negative = n < 0n;
	const size = negative ? -n : n;
	let exponent = decimalExponent(size, d);
	// mantisse × 10⁴ = size × 10^(4 − exponent) / d
	const shift = PLACES - exponent;
	const numerator = shift >= 0 ? size * 10n ** BigInt(shift) : size;
	const denominator = shift >= 0 ? d : d * 10n ** BigInt(-shift);
	const remainder = numerator % denominator;
	let q = numerator / denominator + (2n * remainder >= denominator ? 1n : 0n);
	if (q === 10n * SCALE) {
		q = SCALE;
		exponent += 1;
	}
	const mantissa = withPlaces(negative ? -q : q);
	const exact = remainder === 0n;
	return { digits: exact ? withoutTrailingZeros(mantissa) : mantissa, exponent, exact };
}

/**
 * Entre 10⁻⁶ et 10⁻⁴ : 4 chiffres significatifs, en entiers exacts (4 décimales
 * donneraient « ≈ 0 »). Exacte si ces 4 chiffres disent toute la valeur — revue :
 * l'exactitude se décidait à 10 décimales et l'écriture à 4 chiffres, si bien que
 * 0,0000123456 s'écrivait « = 0.00001235 ».
 */
function fourSignificantDigits(n: bigint, d: bigint): ApproximateDigits {
	const negative = n < 0n;
	const size = negative ? -n : n;
	// 10^k ⩽ valeur < 10^(k+1), k = −6 ou −5 : les 4 chiffres vont jusqu'à 10^(k−3)
	let places = PLACES - 1 - decimalExponent(size, d);
	const scaled = size * 10n ** BigInt(places);
	const remainder = scaled % d;
	let q = scaled / d + (2n * remainder >= d ? 1n : 0n);
	// Retenue : 9,99996 × 10⁻⁵ s'arrondit à 1,000 × 10⁻⁴ (4 chiffres, pas 5)
	if (q === 10n ** BigInt(PLACES)) {
		q /= 10n;
		places -= 1;
	}
	const text = `0.${q.toString().padStart(places, '0')}`;
	const exact = remainder === 0n;
	return {
		digits: `${negative ? '-' : ''}${exact ? withoutTrailingZeros(text) : text}`,
		exponent: null,
		exact
	};
}

/**
 * L'écriture décimale d'une expression numérique : arrondie à 4 décimales
 * (demi loin de zéro, en entiers exacts), ou exacte si elle y tient ; hors de
 * [10⁻⁶ ; 10⁹[, en notation scientifique. `null` pour une expression littérale,
 * une grandeur ou une valeur non réelle.
 */
export function approximateDigitsOf(node: MathNode): ApproximateDigits | null {
	const rational = rationalOf(node);
	if (rational === null) return null;
	const { n, d } = rational;
	if (n === 0n) return { digits: '0', exponent: null, exact: true };
	const size = n < 0n ? -n : n;
	// Décision b : un entier exact jusqu'à 15 chiffres, écrit en entier
	if (d === 1n && size < WHOLE_BELOW) return { digits: n.toString(), exponent: null, exact: true };
	if (size >= d * SCIENTIFIC_FROM || size * SCIENTIFIC_BELOW_INVERSE < d) return scientific(n, d);

	if (size * SCALE < d) return fourSignificantDigits(n, d);

	const scaled = n * SCALE;
	const remainder = scaled % d;
	if (remainder === 0n) {
		return { digits: withoutTrailingZeros(withPlaces(scaled / d)), exponent: null, exact: true };
	}
	const half = 2n * (remainder < 0n ? -remainder : remainder) >= d;
	// Ici |valeur| ⩾ 10⁻⁴ : l'arrondi ne tombe jamais sur « -0.0000 »
	const q = scaled / d + (half ? (n < 0n ? -1n : 1n) : 0n);
	return { digits: withPlaces(q), exponent: null, exact: false };
}

/** Le texte, qui se retape dans la console : `0.25`, `8.7700*10^9`, `1.4286*10^-7`. */
export function approximationText(approximation: ApproximateDigits): string {
	const { digits, exponent } = approximation;
	return exponent === null ? digits : `${digits}*10^${exponent}`;
}

/** Le LaTeX : `0.25`, `8.7700 \times 10^{9}`. */
export function approximationLatex(approximation: ApproximateDigits): string {
	const { digits, exponent } = approximation;
	return exponent === null ? digits : `${digits} \\times 10^{${exponent}}`;
}

/** L'arbre, pour l'écran : `8.7700 × 10⁹`, le signe devant. */
export function approximationNode(approximation: ApproximateDigits): MathNode {
	const { digits, exponent } = approximation;
	const negative = digits.startsWith('-');
	const magnitude = number(negative ? digits.slice(1) : digits);
	const written =
		exponent === null
			? magnitude
			: multiply(
					magnitude,
					power(
						number('10'),
						exponent < 0 ? opposite(number(String(-exponent))) : number(String(exponent))
					),
					'cross'
				);
	return negative ? opposite(written) : written;
}

/**
 * Une notation scientifique écrite par `approximationNode` (`3 × 10²⁰`) : à
 * montrer telle quelle — `tidy` la recalculerait en 300000000000000000000.
 */
export function isScientificNotation(node: MathNode): boolean {
	const written = isOpposite(node) ? node.operand : node;
	if (!isMultiplication(written) || written.displayStyle !== 'cross') return false;
	const { left, right } = written;
	if (!isNumber(left) || !isSuperscript(right)) return false;
	const exponent = isOpposite(right.superscript) ? right.superscript.operand : right.superscript;
	return isNumber(right.base) && right.base.value === '10' && isNumber(exponent);
}

/** `\\approx 0.7071`, `= 0.25` : une valeur décimale déjà lue, avec sa relation. */
export function approximateLatexOf(approximation: ApproximateDigits): string {
	return `${approximation.exact ? '=' : '\\approx'} ${approximationLatex(approximation)}`;
}

/**
 * Des solutions en valeurs approchées, DANS L'ORDRE DONNÉ — celui de la ligne
 * qu'elles accompagnent : `S \approx \left\{ -1.4142 \,;\, 1.4142 \right\}`,
 * `x = 0.5`. `asSet` : écrire un ensemble même pour une seule solution, comme
 * la ligne (`S = \{√2\}`).
 *
 * `null` si toutes sont déjà des nombres écrits, ou si l'une n'a pas de
 * valeur approchée (paramètre, valeur non réelle).
 */
export function approximateSolutionsLatex(
	variable: string,
	solutions: readonly MathNode[],
	asSet: boolean
): string | null {
	if (solutions.length === 0 || solutions.every(isWrittenNumber)) return null;
	const approximations: ApproximateDigits[] = [];
	for (const solution of solutions) {
		const approximation = approximateDigitsOf(solution);
		if (approximation === null) return null;
		approximations.push(approximation);
	}
	const relation = approximations.every((a) => a.exact) ? '=' : '\\approx';
	if (approximations.length === 1 && !asSet) {
		return `${variable} ${relation} ${approximationLatex(approximations[0])}`;
	}
	const values = approximations.map(approximationLatex).join(' \\,;\\, ');
	return `S ${relation} \\left\\{ ${values} \\right\\}`;
}
