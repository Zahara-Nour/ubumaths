/**
 * Arrondis exacts et écriture des décimales (2026-11-26)
 * ======================================================
 *
 * Un seul arrondi pour `round(x, n)` et les modificateurs `;aN` / `;pN` des `{{eval:…}}` :
 * au plus proche, 5 vers l'extérieur, calculé sur la valeur EXACTE (rationnel) —
 * 2,675 arrondi au centième donne 2,68, là où le flottant 2.675 (2.67499…) donnerait 2,67.
 *
 * L'écriture garde les zéros qui disent quelque chose : `3.70` (arrondi au centième).
 *
 * @module mathAST/eval/decimal-rounding
 */

import type { Rational } from '../normal/types';
import {
	absBigInt,
	divRational,
	fromInteger,
	mulRational,
	rational,
	roundRational
} from '../normal/rational';

// =============================================================================
// Constantes
// =============================================================================

/** Plus grand nombre de décimales ou de chiffres significatifs demandé (`;a15`, `round(x, 15)`) */
export const MAX_ROUNDING_DIGITS = 15;

// =============================================================================
// Arrondis
// =============================================================================

/** `r` arrondi à `places` décimales (au plus proche, 5 vers l'extérieur), exact */
export function roundToDecimalPlaces(r: Rational, places: number): Rational {
	const scale = fromInteger(10n ** BigInt(places));
	return divRational(fromInteger(roundRational(mulRational(r, scale))), scale);
}

/** `r` arrondi à un multiple de 10^`power` (`power` ≥ 0 : dizaines, centaines…) */
function roundToPowerOfTen(r: Rational, power: number): Rational {
	const scale = fromInteger(10n ** BigInt(power));
	return mulRational(fromInteger(roundRational(divRational(r, scale))), scale);
}

/** 10^`exponent`, exact (exposant négatif compris) */
function powerOfTen(exponent: number): Rational {
	return exponent >= 0
		? fromInteger(10n ** BigInt(exponent))
		: rational(1n, 10n ** BigInt(-exponent));
}

/** |a| ≥ |b|, exact */
function absAtLeast(a: Rational, b: Rational): boolean {
	return absBigInt(a.n) * absBigInt(b.d) >= absBigInt(b.n) * absBigInt(a.d);
}

/** Exposant décimal de `r` non nul : 10^e ≤ |r| < 10^(e+1), exact */
function decimalExponent(r: Rational): number {
	const approx = Math.abs(Number(r.n) / Number(r.d));
	let exponent = Number.isFinite(approx) && approx > 0 ? Math.floor(Math.log10(approx)) : 0;
	// Le flottant peut se tromper d'une unité près d'une puissance de 10 : corrigé en exact
	while (!absAtLeast(r, powerOfTen(exponent))) exponent--;
	while (absAtLeast(r, powerOfTen(exponent + 1))) exponent++;
	return exponent;
}

/** Résultat d'un arrondi à N chiffres significatifs */
export interface SignificantRounding {
	/** La valeur arrondie, exacte */
	readonly value: Rational;
	/** Exposant décimal de la valeur arrondie (9,96 à 2 chiffres → 10, exposant 1) */
	readonly exponent: number;
	/** Décimales à écrire pour montrer les N chiffres (0 si l'arrondi tombe sur les dizaines…) */
	readonly places: number;
}

/**
 * `r` arrondi à `digits` chiffres significatifs : 0,0996 à 2 chiffres → 0,10 (2 décimales),
 * 9,96 → 10 (0 décimale), 1 234 → 1 200. Zéro reste zéro (aucun chiffre significatif).
 */
export function roundToSignificantDigits(r: Rational, digits: number): SignificantRounding {
	if (r.n === 0n) return { value: r, exponent: 0, places: 0 };
	let exponent = decimalExponent(r);
	const decimals = digits - 1 - exponent;
	const value = decimals >= 0 ? roundToDecimalPlaces(r, decimals) : roundToPowerOfTen(r, -decimals);
	// L'arrondi peut passer à la puissance de 10 suivante (9,96 → 10,0) : un chiffre de moins
	if (absAtLeast(value, powerOfTen(exponent + 1))) exponent++;
	return { value, exponent, places: Math.max(0, digits - 1 - exponent) };
}

/**
 * Valeur décimale exacte d'un flottant, lue sur son écriture la plus courte
 * (`String(2.675)` = « 2.675 ») : ce que l'auteur a tapé, pas 2.67499…
 */
export function rationalOfFloat(x: number): Rational {
	if (!Number.isFinite(x)) throw new Error(`Valeur non finie : ${x}`);
	const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(x));
	if (!match) throw new Error(`Écriture inattendue : ${String(x)}`);
	const [, sign, integerPart, fractionPart = '', exponentText = '0'] = match;
	const digits = BigInt(`${sign}${integerPart}${fractionPart}`);
	return mulRational(rational(digits, 1n), powerOfTen(Number(exponentText) - fractionPart.length));
}

/** `round(x, n)` sur un flottant (chemin compilé) : même arrondi exact que `;aN` */
export function roundFloatToDecimalPlaces(x: number, places: number): number {
	if (!Number.isFinite(x)) return x;
	const rounded = roundToDecimalPlaces(rationalOfFloat(x), places);
	return Number(rounded.n) / Number(rounded.d);
}

// =============================================================================
// Écriture
// =============================================================================

/**
 * Écriture d'un rationnel avec EXACTEMENT `places` décimales (point décimal, signe `-`) :
 * `3.70`, `-2.35`, `0.00`. `r` doit déjà être arrondi à `places` décimales.
 * Zéro s'écrit sans signe (−0,001 arrondi au centième : `0.00`).
 */
export function fixedDecimalWriting(r: Rational, places: number): string {
	const scaled = mulRational(r, fromInteger(10n ** BigInt(places)));
	if (scaled.d !== 1n) throw new Error(`fixedDecimalWriting : valeur non arrondie à ${places}`);
	const text = absBigInt(scaled.n)
		.toString()
		.padStart(places + 1, '0');
	const written =
		places === 0 ? text : `${text.slice(0, text.length - places)}.${text.slice(-places)}`;
	return scaled.n < 0n ? `-${written}` : written;
}
