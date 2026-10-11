/**
 * La valeur approchée d'un résultat exact — le bouton ≈ de la vue Calcul.
 *
 * Décisions de David (2026-10-11, `docs/wip/atelier-cas-phase0.md`, PR 2) :
 * - **4 décimales** : `\approx 0.7071` ;
 * - une valeur dont l'écriture décimale tient dans l'arrondi s'écrit avec
 *   **=**, sans zéros inutiles : 1/4 → `= 0.25` ;
 * - **rien** pour un résultat déjà entier ou décimal, ni pour une expression
 *   littérale.
 *
 * Le point décimal reste un point : la vue Calcul écrit la virgule à la
 * française à son point de passage (`decimal-comma.ts`), comme pour le reste.
 *
 * @module mathAST/cli/approximation
 */

import type { MathNode } from '../types';
import { isNumber, isOpposite, isUnit } from '../guards';
import { findNodes } from '../transforms';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

// =============================================================================
// Constantes
// =============================================================================

/** Le nombre de décimales de la valeur approchée (décision de David). */
const PLACES = 4;

/**
 * Au-delà, `toFixed` passe en notation scientifique, et une valeur approchée
 * à 4 décimales d'un nombre de 16 chiffres n'a plus de sens.
 */
const TOO_LARGE = 1e15;

/** En deçà, même 4 chiffres significatifs s'écriraient en notation scientifique. */
const TOO_SMALL = 1e-6;

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

/**
 * La valeur décimale d'un nombre, arrondie, et si elle est exacte.
 *
 * Un nombre trop petit pour 4 décimales (`e^{-10}` donnerait « ≈ 0 ») garde
 * 4 chiffres significatifs.
 */
export function approximateDigits(value: number): { digits: string; exact: boolean } | null {
	if (!Number.isFinite(value)) return null;
	const size = Math.abs(value);
	if (size >= TOO_LARGE || (size !== 0 && size < TOO_SMALL)) return null;

	const fixed =
		size !== 0 && size < 10 ** -PLACES ? value.toPrecision(PLACES) : value.toFixed(PLACES);
	const digits = withoutTrailingZeros(fixed).replace(/^-0$/, '0');
	// Exacte si l'écriture décimale tient dans l'arrondi : 1/4, pas 1/3 ni √2
	// (la valeur d'un irrationnel n'est jamais à 10⁻¹² d'un décimal court)
	const exact = Math.abs(value - Number(digits)) <= 1e-12 * Math.max(1, size);
	return { digits, exact };
}

/**
 * `\approx 0.7071`, `= 0.25`, ou `null` quand le bouton n'a rien à montrer :
 * nombre déjà écrit en décimal, expression littérale, grandeur avec unité
 * (l'arbre a perdu l'unité), valeur non réelle ou hors d'échelle.
 */
export function approximateValueLatex(node: MathNode): string | null {
	if (isWrittenNumber(node)) return null;
	if (getVariables(node).size > 0) return null;
	if (findNodes(node, isUnit).length > 0) return null;

	let value: number;
	try {
		value = evaluateNodeToApproximatedNumber(node);
	} catch {
		return null;
	}
	const approximation = approximateDigits(value);
	if (approximation === null) return null;
	return `${approximation.exact ? '=' : '\\approx'} ${approximation.digits}`;
}
