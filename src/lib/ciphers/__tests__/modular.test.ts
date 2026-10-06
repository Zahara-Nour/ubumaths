import { describe, expect, it } from 'vitest';
import { gcd, inverseSearch, modInverse, reduceDetail } from '../modular';

describe('gcd', () => {
	it('PGCD usuel', () => {
		expect(gcd(12, 18)).toBe(6);
		expect(gcd(5, 26)).toBe(1);
		expect(gcd(0, 7)).toBe(7);
	});
});

describe('modInverse', () => {
	it('5⁻¹ = 21 modulo 26', () => {
		expect(modInverse(5, 26)).toBe(21);
	});

	it('chaque a premier avec 26 a un inverse, et a × a⁻¹ ≡ 1', () => {
		for (const a of [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]) {
			const inverse = modInverse(a, 26);
			expect(inverse).not.toBeNull();
			expect((a * (inverse as number)) % 26).toBe(1);
		}
	});

	it('pas d’inverse quand a n’est pas premier avec 26', () => {
		expect(modInverse(2, 26)).toBeNull();
		expect(modInverse(13, 26)).toBeNull();
	});
});

describe('inverseSearch', () => {
	it('montre la vérification : 5 × 21 = 105 = 4 × 26 + 1', () => {
		expect(inverseSearch(5)).toEqual({ inverse: 21, detail: '5 × 21 = 105 = 4 × 26 + 1' });
	});

	it('a = 1 : 1 × 1 = 1', () => {
		expect(inverseSearch(1)).toEqual({ inverse: 1, detail: '1 × 1 = 1' });
	});
});

describe('reduceDetail', () => {
	it('rien à réduire entre 0 et 25', () => {
		expect(reduceDetail(7)).toBe('');
	});

	it('une seule fois 26 : écrit comme César', () => {
		expect(reduceDetail(27)).toBe(' → 27 − 26 = 1');
		expect(reduceDetail(-2)).toBe(' → −2 + 26 = 24');
	});

	it('plusieurs fois 26', () => {
		expect(reduceDetail(108)).toBe(' → 108 − 4 × 26 = 4');
		expect(reduceDetail(-84)).toBe(' → −84 + 4 × 26 = 20');
	});
});
