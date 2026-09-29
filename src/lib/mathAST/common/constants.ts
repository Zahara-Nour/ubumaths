/**
 * Shared Constants
 *
 * Centralized tolerance values and thresholds used across mathAST modules.
 *
 * @module mathAST/common/constants
 */

/**
 * Tolerance for considering a floating-point value as zero.
 * Used in comparisons like `Math.abs(x) < ZERO_TOLERANCE`.
 */
export const ZERO_TOLERANCE = 1e-10;

/**
 * Tolerance for considering two floating-point values as equal.
 * Used in comparisons like `Math.abs(a - b) < EQUALITY_TOLERANCE`.
 */
export const EQUALITY_TOLERANCE = 1e-10;

/**
 * Écart RELATIF sous lequel deux valeurs calculées sont le même nombre
 * (cf. `numbersAreClose`). 1e-12 : mille fois le bruit des flottants (~1e-15),
 * et deux entiers voisins restent distincts jusqu’à 10¹² (à 1e-10, 123456789012
 * et 123456789020 étaient confondus).
 */
export const RELATIVE_EQUALITY_TOLERANCE = 1e-12;

/**
 * Plancher ABSOLU de `numbersAreClose` : le bruit des flottants autour de 0
 * (`0.1 + 0.2 - 0.3` vaut 5,5·10⁻¹⁷). Assez bas pour que 10⁻¹² ≠ 0.
 */
export const ABSOLUTE_EQUALITY_FLOOR = 1e-14;

/**
 * Deux valeurs numériques sont-elles le même nombre, au bruit des flottants
 * près ? Tolérance relative, avec un plancher absolu minuscule.
 *
 * Une tolérance absolue seule (`|a − b| < 1e-10`) jugeait 10⁻¹² égal à 0, et
 * 123456789012 différent de 123456789012,001 (écart relatif 10⁻¹⁵).
 */
export function numbersAreClose(a: number, b: number): boolean {
	if (a === b) return true;
	if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
	const scale = Math.max(Math.abs(a), Math.abs(b));
	return Math.abs(a - b) <= Math.max(ABSOLUTE_EQUALITY_FLOOR, RELATIVE_EQUALITY_TOLERANCE * scale);
}

/**
 * Threshold above which a finite value is treated as "approaching infinity".
 * Used in numeric heuristics for limit evaluation.
 */
export const INFINITY_THRESHOLD = 1e8;

/**
 * Small delta for numeric differentiation and one-sided approach.
 */
export const NUMERIC_DELTA = 1e-8;
