/**
 * Statistiques — l'arrondi d'affichage, une seule règle
 * ======================================================
 *
 * **Demi vers le haut sur la valeur absolue** (−0,125 → −0,13 ; 0,125 → 0,13),
 * calculé en ENTIERS : jamais `Math.round(v × 100)`, qui arrondit −0,125 vers
 * +∞ et rate 1,005 (1,005 × 100 = 100,4999…). Écart V6, 2026-10-11 : un seul
 * module pour les fractions exactes (`roundExact`, `roundFraction`) et pour les
 * flottants des indicateurs (`roundNumber`).
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/rounding
 */

import { Fraction } from './fraction';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * num/den (positif) arrondi à `places` décimales, demi vers le
 * haut, en entiers. `digits` s'écrit avec un point (`0.850`) ; `exact` : la
 * valeur tombe juste à cette précision.
 */
export function roundExact(
	num: bigint,
	den: bigint,
	places: number
): { digits: string; exact: boolean } {
	const scale = 10n ** BigInt(places);
	const scaled = num * scale;
	const quotient = scaled / den;
	const remainder = scaled % den;
	// Demi vers le haut : reste ⩾ den / 2
	const rounded = 2n * remainder >= den ? quotient + 1n : quotient;
	const text = rounded.toString().padStart(places + 1, '0');
	const digits = places === 0 ? text : `${text.slice(0, -places)}.${text.slice(-places)}`;
	return { digits, exact: remainder === 0n };
}

/**
 * Arrondi unique à `places` décimales, demi vers le haut sur la valeur absolue
 * (−0,125 → −0,13). `digits` s'écrit avec un point, zéros finals gardés
 * (`4.630`) ; `exact` : la valeur tombe juste à cette précision.
 */
export function roundFraction(value: Fraction, places: number): { digits: string; exact: boolean } {
	const negative = value.isNegative();
	const { digits, exact } = roundExact(negative ? -value.num : value.num, value.den, places);
	// Pas de « −0,00 » : un arrondi nul n'a pas de signe
	const zero = /^[0.]+$/.test(digits);
	return { digits: negative && !zero ? `-${digits}` : digits, exact };
}

/**
 * Un flottant arrondi à `places` décimales, même règle. Le flottant est lu
 * comme le décimal qu'il écrit (12 chiffres significatifs : 1,005 et non
 * 1,00499…), puis arrondi en entiers par `roundFraction`. Au-delà de 12
 * chiffres significatifs, la valeur est déjà tronquée à 12 (comme l'affichage
 * de `formatStatNumber`) : sans effet sur des données d'élèves.
 */
export function roundNumber(value: number, places: number): number {
	const decimal = Fraction.parse(String(Number(value.toPrecision(12))));
	// Écriture exponentielle (1e-7, 1e21) : pas de demi à départager à cette échelle
	if (decimal === null) {
		const scale = 10 ** places;
		return (Math.sign(value) * Math.round(Math.abs(value) * scale)) / scale + 0;
	}
	return Number(roundFraction(decimal, places).digits) + 0;
}
