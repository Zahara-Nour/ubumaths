/**
 * Arithmétique modulo 26 : PGCD, inverse modulaire, et l'écriture des
 * réductions telle qu'on la pose au tableau.
 *
 * @module lib/ciphers/modular
 */
import { ALPHABET_SIZE, formatNumber, mod } from './alphabet';

// Functions

export function gcd(a: number, b: number): number {
	let [x, y] = [Math.abs(a), Math.abs(b)];
	while (y !== 0) [x, y] = [y, x % y];
	return x;
}

/** Inverse de a modulo m, ou null quand a n'est pas premier avec m */
export function modInverse(a: number, m: number): number | null {
	const reduced = mod(a, m);
	for (let candidate = 1; candidate < m; candidate++) {
		if ((reduced * candidate) % m === 1) return candidate;
	}
	return m === 1 ? 0 : null;
}

/** L'inverse de a modulo 26 et sa vérification : « 5 × 21 = 105 = 4 × 26 + 1 » */
export function inverseSearch(a: number): { inverse: number; detail: string } | null {
	const inverse = modInverse(a, ALPHABET_SIZE);
	if (inverse === null) return null;
	const product = a * inverse;
	const quotient = Math.floor(product / ALPHABET_SIZE);
	const detail =
		quotient === 0
			? `${a} × ${inverse} = ${product}`
			: `${a} × ${inverse} = ${product} = ${quotient} × 26 + 1`;
	return { inverse, detail };
}

/** « → 108 − 4 × 26 = 4 » ; rien quand la valeur est déjà entre 0 et 25 */
export function reduceDetail(value: number): string {
	const reduced = mod(value, ALPHABET_SIZE);
	if (reduced === value) return '';
	const times = Math.abs(value - reduced) / ALPHABET_SIZE;
	const multiple = times === 1 ? '26' : `${times} × 26`;
	const sign = value > reduced ? '−' : '+';
	return ` → ${formatNumber(value)} ${sign} ${multiple} = ${reduced}`;
}
