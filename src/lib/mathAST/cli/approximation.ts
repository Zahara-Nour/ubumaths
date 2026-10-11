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
 * Le point décimal reste un point : la vue Calcul écrit la virgule à la
 * française à son point de passage (`decimal-comma.ts`), comme pour le reste.
 *
 * @module mathAST/cli/approximation
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { isNumber, isOpposite, isUnit } from '../guards';
import { findNodes } from '../transforms';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToRational } from '../eval/evaluate';
import { rationalToNumber } from '../normal/rational';

// =============================================================================
// Types
// =============================================================================

/** Une valeur écrite en décimal, et si cette écriture est exacte. */
export interface ApproximateDigits {
	readonly digits: string;
	readonly exact: boolean;
}

// =============================================================================
// Constantes
// =============================================================================

/** Le nombre de décimales de la valeur approchée (décision de David). */
const PLACES = 4;
const SCALE = 10n ** BigInt(PLACES);

/**
 * Au-delà, 4 décimales demanderaient plus de chiffres qu'un flottant n'en
 * porte : une fonction transcendante y entre par son flottant.
 */
const TOO_LARGE = 1e9;

/** En deçà, même 4 chiffres significatifs s'écriraient en notation scientifique. */
const TOO_SMALL = 1e-6;

/** Sous 10⁻⁴, 4 décimales donneraient « ≈ 0 » : on garde 4 chiffres significatifs. */
const BELOW_PLACES = 10 ** -PLACES;

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

/**
 * L'écriture décimale d'une expression numérique : arrondie à 4 décimales
 * (demi loin de zéro, en entiers exacts), ou exacte si elle y tient.
 * `null` pour une expression littérale, une grandeur, une valeur non réelle
 * ou hors d'échelle.
 */
export function approximateDigitsOf(node: MathNode): ApproximateDigits | null {
	const rational = rationalOf(node);
	if (rational === null) return null;
	const { n, d } = rational;
	// Pas `Number(n) / Number(d)` : NaN dès que les termes dépassent 10³⁰⁸
	// ((1001/1000)¹⁰⁰⁰ en porte 3001 chiffres, pour une valeur de 2,7169)
	const value = rationalToNumber(rational);
	const size = Math.abs(value);
	if (!Number.isFinite(value) || size >= TOO_LARGE || (size !== 0 && size < TOO_SMALL)) {
		return null;
	}

	if (size !== 0 && size < BELOW_PLACES) {
		// Exacte si 10 décimales suffisent (1/20000 = 0.00005)
		const exact = (n * 10n ** 10n) % d === 0n;
		const significant = value.toPrecision(PLACES);
		return { digits: exact ? withoutTrailingZeros(significant) : significant, exact };
	}

	const scaled = n * SCALE;
	const remainder = scaled % d;
	if (remainder === 0n) {
		return { digits: withoutTrailingZeros(withPlaces(scaled / d)), exact: true };
	}
	const half = 2n * (remainder < 0n ? -remainder : remainder) >= d;
	// Ici |valeur| ⩾ 10⁻⁴ : l'arrondi ne tombe jamais sur « -0.0000 »
	const q = scaled / d + (half ? (n < 0n ? -1n : 1n) : 0n);
	return { digits: withPlaces(q), exact: false };
}

/**
 * `\approx 0.7071`, `= 0.25`, ou `null` quand le bouton n'a rien à montrer :
 * nombre déjà écrit en décimal, expression littérale, grandeur, valeur non
 * réelle ou hors d'échelle.
 */
export function approximateValueLatex(node: MathNode): string | null {
	if (isWrittenNumber(node)) return null;
	const approximation = approximateDigitsOf(node);
	if (approximation === null) return null;
	return `${approximation.exact ? '=' : '\\approx'} ${approximation.digits}`;
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
		return `${variable} ${relation} ${approximations[0].digits}`;
	}
	const values = approximations.map((a) => a.digits).join(' \\,;\\, ');
	return `S ${relation} \\left\\{ ${values} \\right\\}`;
}
