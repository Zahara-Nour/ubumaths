/**
 * Le pgcd et les quatre opérations sur de grands termes (lot « défauts des grandes fractions »,
 * 2026-10-12). Mesuré avant : une somme de 5 fractions d'environ 9 000 chiffres chacune
 * prenait 4,1 s dans la console de Calcul — Euclide, quadratique, sur des termes qui doublent
 * à chaque addition. Le pgcd de Lehmer (Knuth, algorithme L) et les opérations de Henrici
 * (Knuth 4.5.1 : le pgcd sur les dénominateurs, pas sur le résultat) doivent rendre
 * EXACTEMENT ce que rendait Euclide sur le résultat entier.
 */

import { describe, it, expect } from 'vitest';
import {
	gcd,
	rational,
	addRational,
	addReduced,
	subReduced,
	mulReduced,
	divReduced
} from '../rational';
import type { Rational } from '../types';

/** La référence : Euclide, tel qu'il était. */
function euclid(a: bigint, b: bigint): bigint {
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;
	while (b !== 0n) [a, b] = [b, a % b];
	return a;
}

/** Fraction réduite, dénominateur positif, sans passer par le code testé. */
function reference(n: bigint, d: bigint): Rational {
	const g = euclid(n, d);
	const sign = d < 0n ? -1n : 1n;
	return n === 0n ? { n: 0n, d: 1n } : { n: (sign * n) / g, d: (sign * d) / g };
}

/** Un générateur déterministe (suite reproductible d'un essai à l'autre). */
function randomBits(seed: { value: number }) {
	return (bits: number): bigint => {
		let x = 0n;
		for (let left = bits; left > 0; left -= 30) {
			seed.value = (seed.value * 1103515245 + 12345) % 2 ** 31;
			x = (x << 30n) | BigInt(seed.value & (2 ** 30 - 1));
		}
		return x;
	};
}

describe('le pgcd sur de grands entiers', () => {
	it('rend celui d’Euclide sur 2 000 paires, facteurs communs compris', () => {
		const random = randomBits({ value: 42 });
		const seedSize = randomBits({ value: 7 });
		for (let i = 0; i < 2000; i++) {
			const sizes = Number(seedSize(30) % 3000n);
			const common = random(1 + (i % 300)) + 1n;
			const a = random(sizes) * common;
			const b = random(Number(seedSize(30) % 3000n)) * common;
			const signA = i % 3 === 0 ? -1n : 1n;
			expect(gcd(signA * a, b)).toBe(euclid(a, b));
		}
	});

	it('cas limites', () => {
		expect(gcd(0n, 0n)).toBe(0n);
		expect(gcd(0n, -5n)).toBe(5n);
		expect(gcd(2n ** 200n, 0n)).toBe(2n ** 200n);
		expect(gcd(2n ** 200n, 2n ** 199n)).toBe(2n ** 199n);
		expect(gcd(3n ** 500n * 7n, 3n ** 400n * 11n)).toBe(3n ** 400n);
		// deux termes consécutifs de Fibonacci : le pire cas d'Euclide
		let [f, g] = [1n, 1n];
		for (let i = 0; i < 2000; i++) [f, g] = [g, f + g];
		expect(gcd(f, g)).toBe(1n);
	});

	// Mesuré : Euclide 1,7 s, Lehmer 357 ms (Mac mini M6). La CI est 3 à 5 fois plus lente
	// (1 265 ms et 1 626 ms relevés le 2026-10-12 sous l'ancien plafond de 1 200 ms) : le
	// plafond de 3 000 ms y laisse passer Lehmer et refuserait Euclide (~7 s au même facteur).
	// Les deux nombres sont construits hors du chronomètre, qui ne mesure que le pgcd.
	it('deux nombres de 40 000 chiffres en moins de 3 000 ms', () => {
		const a = 10001n ** 10000n;
		const b = 10000n ** 10000n;
		const start = performance.now();
		expect(gcd(a, b)).toBe(1n);
		expect(performance.now() - start).toBeLessThan(3000);
	});
});

describe('les quatre opérations sur des fractions réduites rendent la fraction réduite d’avant', () => {
	const random = randomBits({ value: 2026 });
	const pairs: [Rational, Rational][] = [];
	for (let i = 0; i < 400; i++) {
		const common = random(1 + (i % 90)) + 1n;
		const d1 = (random(1 + (i % 400)) + 1n) * (i % 2 === 0 ? common : 1n);
		const d2 = (random(1 + ((i * 7) % 400)) + 1n) * common;
		const n1 = (i % 5 === 0 ? -1n : 1n) * random((i * 3) % 400) * (i % 4 === 0 ? common : 1n);
		const n2 = (i % 7 === 0 ? -1n : 1n) * random((i * 11) % 400);
		pairs.push([reference(n1, d1), reference(n2, d2)]);
	}

	it.each([
		[
			'addition',
			addReduced,
			(a: Rational, b: Rational) => reference(a.n * b.d + b.n * a.d, a.d * b.d)
		],
		[
			'soustraction',
			subReduced,
			(a: Rational, b: Rational) => reference(a.n * b.d - b.n * a.d, a.d * b.d)
		],
		['multiplication', mulReduced, (a: Rational, b: Rational) => reference(a.n * b.n, a.d * b.d)]
	] as const)('%s', (_, operation, expected) => {
		for (const [a, b] of pairs) expect(operation(a, b)).toEqual(expected(a, b));
	});

	it('division', () => {
		for (const [a, b] of pairs) {
			if (b.n === 0n) continue;
			expect(divReduced(a, b)).toEqual(reference(a.n * b.d, a.d * b.n));
		}
	});

	it('les cas simples', () => {
		expect(addReduced(rational(1n, 6n), rational(1n, 3n))).toEqual({ n: 1n, d: 2n });
		expect(addReduced(rational(1n, 2n), rational(-1n, 2n))).toEqual({ n: 0n, d: 1n });
		expect(subReduced(rational(5n, 6n), rational(1n, 3n))).toEqual({ n: 1n, d: 2n });
		expect(mulReduced(rational(-4n, 9n), rational(3n, 8n))).toEqual({ n: -1n, d: 6n });
		expect(divReduced(rational(4n, 9n), rational(-8n, 3n))).toEqual({ n: -1n, d: 6n });
		expect(mulReduced(rational(0n, 1n), rational(3n, 8n))).toEqual({ n: 0n, d: 1n });
		expect(() => divReduced(rational(1n, 2n), rational(0n, 1n))).toThrow();
	});

	// Le dépôt construit des rationnels à la main sans les réduire : la réduction complète reste
	it('addRational réduit toujours, même une entrée non réduite', () => {
		expect(addRational({ n: 2n, d: 4n }, { n: 2n, d: 4n })).toEqual({ n: 1n, d: 1n });
	});
});
