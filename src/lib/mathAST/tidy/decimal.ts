/**
 * L'écriture décimale exacte d'un rationnel.
 *
 * Module à part : `collect` et `build` s'importent l'un l'autre, et un
 * troisième aller-retour entre eux laisserait la constante importée dans sa
 * zone morte (`absBigInt is not defined`, mesuré le 2026-09-20).
 *
 * @module mathAST/tidy/decimal
 */

import type { Rational } from '../normal/types';
import { absBigInt } from '../normal/rational';

/** L'écriture décimale exacte d'un rationnel, ou `null` si elle est infinie. */
export function decimalString(r: Rational): string | null {
	let denominator = r.d;
	let twos = 0;
	let fives = 0;
	while (denominator % 2n === 0n) {
		denominator /= 2n;
		twos++;
	}
	while (denominator % 5n === 0n) {
		denominator /= 5n;
		fives++;
	}
	if (denominator !== 1n) return null;

	const digits = Math.max(twos, fives);
	const scaled = (absBigInt(r.n) * 10n ** BigInt(digits)) / r.d;
	const text = scaled.toString();
	if (digits === 0) return text;

	const padded = text.padStart(digits + 1, '0');
	const integerPart = padded.slice(0, padded.length - digits);
	const fractionPart = padded.slice(padded.length - digits).replace(/0+$/, '');
	return fractionPart === '' ? integerPart : `${integerPart}.${fractionPart}`;
}
