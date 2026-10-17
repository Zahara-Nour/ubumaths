import { describe, expect, it } from 'vitest';
import { PI_DECIMALS } from '../pi-decimals';
import { PI_STATUS_OCCURRENCES, frenchOrdinal, piOccurrence } from '../pi-status';

/**
 * Décimales de π recalculées ici, indépendamment des tables : formule de Machin
 * π = 16·arctan(1/5) − 4·arctan(1/239), en entiers BigInt (10 chiffres de garde).
 */
function computePiDecimals(count: number): string {
	const one = 10n ** BigInt(count + 10);
	const arctanInverse = (x: bigint): bigint => {
		const x2 = x * x;
		let term = one / x;
		let sum = term;
		for (let k = 3n, sign = -1n; term !== 0n; k += 2n, sign = -sign) {
			term /= x2;
			sum += (sign * term) / k;
		}
		return sum;
	};
	const pi = 4n * (4n * arctanInverse(5n) - arctanInverse(239n));
	return pi.toString().slice(1, count + 1);
}

const REFERENCE = computePiDecimals(7000);

describe('décimales de π de la page d’erreur', () => {
	it('le calcul de référence commence bien par 14159 26535', () => {
		expect(REFERENCE.slice(0, 10)).toBe('1415926535');
	});

	it('les décimales de la spirale sont exactes', () => {
		expect(PI_DECIMALS).toBe(REFERENCE.slice(0, PI_DECIMALS.length));
		expect(PI_DECIMALS.length).toBe(1800);
	});

	it.each(Object.entries(PI_STATUS_OCCURRENCES))(
		'%s : première apparition, chiffres voisins compris',
		(code, { position, before, after }) => {
			const index = position - 1;
			// Première apparition : nulle part avant
			expect(REFERENCE.indexOf(code)).toBe(index);
			expect(before).toBe(REFERENCE.slice(Math.max(0, index - 6), index));
			expect(after).toBe(REFERENCE.slice(index + 3, index + 9));
		}
	);

	it('404 commence à la 1 272ᵉ décimale (vérifié aussi contre api.pi.delivery)', () => {
		expect(piOccurrence(404)?.position).toBe(1272);
	});

	it('un code hors table n’a pas d’occurrence', () => {
		expect(piOccurrence(418)).toBeNull();
	});
});

describe('frenchOrdinal', () => {
	it('1ʳᵉ, puis ᵉ', () => {
		expect(frenchOrdinal(1)).toBe('1ʳᵉ');
		expect(frenchOrdinal(2)).toBe('2ᵉ');
	});

	it('sépare les milliers par une espace fine insécable', () => {
		expect(frenchOrdinal(1272)).toBe('1 272ᵉ');
	});
});
