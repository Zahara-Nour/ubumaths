/**
 * Source pseudo-aléatoire des instances (`createRandomSource`, mulberry32)
 * =======================================================================
 *
 * Une graine donne une suite reproductible (graine 0 comprise) ; deux graines
 * différentes, deux suites différentes ; les tirages restent dans leurs bornes.
 */
import { describe, it, expect } from 'vitest';
import { createRandomSource, randomIndex, randomInt, shuffled } from '../random';

function first(seed: number | undefined, count = 5): number[] {
	const random = createRandomSource(seed);
	return Array.from({ length: count }, () => random());
}

describe('createRandomSource', () => {
	it('même graine → même suite, y compris la graine 0', () => {
		expect(first(0)).toEqual(first(0));
		expect(first(12345)).toEqual(first(12345));
	});

	it('graines voisines → suites différentes', () => {
		expect(first(1)).not.toEqual(first(2));
		expect(first(0)).not.toEqual(first(1));
	});

	it('graines négatives, au-delà de 2³², décimales : reproductibles et distinctes', () => {
		expect(first(-7)).toEqual(first(-7));
		expect(first(-7)).not.toEqual(first(7));
		expect(first(2 ** 32 + 1)).not.toEqual(first(1));
		// Partie décimale ignorée (graine entière attendue)
		expect(first(42.9)).toEqual(first(42));
	});

	it('chaque tirage est dans [0, 1[', () => {
		const random = createRandomSource(99);
		for (let i = 0; i < 1000; i++) {
			const value = random();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	it('sans graine : Math.random', () => {
		expect(createRandomSource()).toBe(Math.random);
	});
});

describe('randomInt, randomIndex, shuffled', () => {
	it('randomInt : bornes comprises, toutes les valeurs atteintes', () => {
		const random = createRandomSource(7);
		const seen = new Set<number>();
		for (let i = 0; i < 2000; i++) {
			const value = randomInt(3, 8, random);
			expect(value).toBeGreaterThanOrEqual(3);
			expect(value).toBeLessThanOrEqual(8);
			seen.add(value);
		}
		expect([...seen].sort()).toEqual([3, 4, 5, 6, 7, 8]);
	});

	it('randomIndex : dans [0, length[', () => {
		const random = createRandomSource(3);
		for (let i = 0; i < 500; i++) {
			const index = randomIndex(4, random);
			expect(index).toBeGreaterThanOrEqual(0);
			expect(index).toBeLessThan(4);
		}
	});

	it('shuffled : permutation sans perte, copie, reproductible', () => {
		const items = [1, 2, 3, 4, 5];
		const once = shuffled(items, createRandomSource(11));
		expect([...once].sort()).toEqual(items);
		expect(items).toEqual([1, 2, 3, 4, 5]);
		expect(shuffled(items, createRandomSource(11))).toEqual(once);
	});
});
