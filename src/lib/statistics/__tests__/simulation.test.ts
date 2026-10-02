/**
 * Simulation d'une variable aléatoire finie (v2, lot 1, Q72-Q76, 2026-10-02).
 *
 * Programmes : 6e (fréquence observée et probabilité), 2de `2-179` (loi des
 * grands nombres), 1re spé `1SPE-170` → `173` (échantillons, 2σ/√n).
 * Tirages reproductibles par une graine (Q70, Q76).
 */

import { describe, it, expect } from 'vitest';
import { Fraction } from '../fraction';
import {
	SIMULATION_LIMITS,
	simulateCounts,
	simulateRunningMean,
	simulateSamples
} from '../simulation';
import { createRandomSource } from '../../utils/random';

const fractions = (...texts: string[]) => texts.map((t) => Fraction.parse(t)!);
const DIE = fractions('1', '2', '3', '4', '5', '6');
const SIXTHS = fractions('1/6', '1/6', '1/6', '1/6', '1/6', '1/6');
const COIN = fractions('1', '0');
const HALVES = fractions('1/2', '1/2');

const okValue = <T>(outcome: { ok: true; value: T } | { ok: false; message: string } | null) => {
	if (outcome === null || !outcome.ok) throw new Error(`échec : ${JSON.stringify(outcome)}`);
	return outcome.value;
};

describe('simulateCounts — n tirages, effectifs par valeur', () => {
	it('dé, 600 tirages : 6 effectifs de somme 600', () => {
		const { counts } = okValue(simulateCounts(DIE, SIXTHS, 600, createRandomSource(4821)));

		expect(counts).toHaveLength(6);
		expect(counts.reduce((a, b) => a + b, 0)).toBe(600);
	});

	it('même graine, mêmes effectifs ; autre graine, autres effectifs', () => {
		const a = okValue(simulateCounts(DIE, SIXTHS, 600, createRandomSource(4821))).counts;
		const b = okValue(simulateCounts(DIE, SIXTHS, 600, createRandomSource(4821))).counts;
		const c = okValue(simulateCounts(DIE, SIXTHS, 600, createRandomSource(17))).counts;

		expect(b).toEqual(a);
		expect(c).not.toEqual(a);
	});

	it('n = 1 : un seul effectif à 1', () => {
		const { counts } = okValue(simulateCounts(DIE, SIXTHS, 1, createRandomSource(1)));

		expect(counts.filter((c) => c === 1)).toHaveLength(1);
		expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
	});

	it('une probabilité nulle : effectif toujours nul', () => {
		const { counts } = okValue(
			simulateCounts(
				fractions('1', '2', '3'),
				fractions('1/2', '0', '1/2'),
				10_000,
				createRandomSource(3)
			)
		);

		expect(counts[1]).toBe(0);
	});

	// Revue : avec des lois symétriques seulement, une erreur qui inverse
	// l'association valeur → indice passait inaperçue
	it('loi asymétrique (1/10, 9/10) : chaque valeur reçoit SA fréquence', () => {
		const { counts } = okValue(
			simulateCounts(COIN, fractions('1/10', '9/10'), 100_000, createRandomSource(11))
		);

		expect(Math.abs(counts[0] / 100_000 - 0.1)).toBeLessThan(0.01);
		expect(Math.abs(counts[1] / 100_000 - 0.9)).toBeLessThan(0.01);
	});

	it.each([
		['en premier', fractions('0', '1/10', '9/10'), 0],
		['en dernier', fractions('1/10', '9/10', '0'), 2]
	])('probabilité nulle %s : jamais tirée, les autres à leur fréquence', (_, law, zero) => {
		const { counts } = okValue(
			simulateCounts(fractions('1', '2', '3'), law, 100_000, createRandomSource(11))
		);
		const others = counts.filter((_, i) => i !== zero);

		expect(counts[zero]).toBe(0);
		expect(Math.abs(others[0] / 100_000 - 0.1)).toBeLessThan(0.01);
		expect(Math.abs(others[1] / 100_000 - 0.9)).toBeLessThan(0.01);
	});

	it('dix fois 1/10 : uniforme, malgré une somme flottante sous 1', () => {
		const tenths = fractions(...Array.from({ length: 10 }, () => '1/10'));
		const values = fractions(...Array.from({ length: 10 }, (_, i) => String(i)));
		const { counts } = okValue(simulateCounts(values, tenths, 100_000, createRandomSource(7)));

		counts.forEach((c) => expect(Math.abs(c / 100_000 - 0.1)).toBeLessThan(0.01));
	});

	it('loi des grands nombres : 100 000 tirages d’une pièce, fréquence proche de 1/2', () => {
		const { counts } = okValue(
			simulateCounts(COIN, HALVES, SIMULATION_LIMITS.draws, createRandomSource(9))
		);

		expect(Math.abs(counts[0] / SIMULATION_LIMITS.draws - 0.5)).toBeLessThan(0.01);
	});

	it.each([
		[0, 'n doit être un entier entre 1 et 100 000'],
		[-3, 'n doit être un entier entre 1 et 100 000'],
		[2.5, 'n doit être un entier entre 1 et 100 000'],
		[100_001, 'n doit être un entier entre 1 et 100 000']
	])('n = %s refusé', (n, message) => {
		const outcome = simulateCounts(DIE, SIXTHS, n, createRandomSource(1));

		expect(outcome).toEqual({ ok: false, message });
	});

	it('une loi invalide : le message de la loi (somme ≠ 1)', () => {
		const outcome = simulateCounts(COIN, fractions('1/2', '2/5'), 10, createRandomSource(1));

		expect(outcome).toMatchObject({
			ok: false,
			message: 'La somme des probabilités fait 9/10, pas 1.'
		});
	});

	it('des longueurs différentes : refusé', () => {
		expect(simulateCounts(DIE, HALVES, 10, createRandomSource(1))).toMatchObject({ ok: false });
	});
});

describe('simulateRunningMean — moyenne des tirages selon n', () => {
	it('pièce, 5 000 tirages : 5 000 moyennes, la dernière proche de 0,5, E = 1/2', () => {
		const { means, expectation } = okValue(
			simulateRunningMean(COIN, HALVES, 5000, createRandomSource(4821))
		);

		expect(means).toHaveLength(5000);
		expect(means[0] === 0 || means[0] === 1).toBe(true);
		expect(Math.abs(means[4999] - 0.5)).toBeLessThan(0.05);
		expect(expectation.equals(Fraction.parse('1/2')!)).toBe(true);
	});

	it('la moyenne n° k est bien la moyenne des k premiers tirages', () => {
		const { means } = okValue(simulateRunningMean(DIE, SIXTHS, 50, createRandomSource(2)));

		// Chaque moyenne × k est un entier (somme de faces de dé), entre k et 6k
		means.forEach((m, i) => {
			const sum = m * (i + 1);
			expect(Math.abs(sum - Math.round(sum))).toBeLessThan(1e-9);
			expect(sum).toBeGreaterThanOrEqual(i + 1);
			expect(sum).toBeLessThanOrEqual(6 * (i + 1));
		});
	});

	it('n au-delà de 10 000 : refusé', () => {
		expect(simulateRunningMean(COIN, HALVES, 10_001, createRandomSource(1))).toEqual({
			ok: false,
			message: 'n doit être un entier entre 1 et 10 000'
		});
	});
});

describe('simulateSamples — N échantillons de taille n (1SPE-173)', () => {
	it('dé, 50 échantillons de taille 100 : μ, σ, 2σ/√n, proportion', () => {
		const result = okValue(simulateSamples(DIE, SIXTHS, 50, 100, createRandomSource(4821)));

		expect(result.means).toHaveLength(50);
		expect(result.expectation.equals(Fraction.parse('7/2')!)).toBe(true);
		expect(result.deviation).toBeCloseTo(Math.sqrt(35 / 12), 12);
		expect(result.margin).toBeCloseTo((2 * Math.sqrt(35 / 12)) / 10, 12);
		const within = result.means.filter((m) => Math.abs(m - 3.5) <= result.margin).length;
		expect(result.within).toBe(within);
		// Environ 95 % des échantillons
		expect(result.within).toBeGreaterThanOrEqual(40);
	});

	it('N × n = 1 000 000 accepté ; au-delà, refusé', () => {
		expect(simulateSamples(COIN, HALVES, 1000, 1000, createRandomSource(1)).ok).toBe(true);
		expect(simulateSamples(COIN, HALVES, 1001, 10, createRandomSource(1))).toEqual({
			ok: false,
			message: 'N doit être un entier entre 1 et 1 000'
		});
		expect(simulateSamples(COIN, HALVES, 10, 1001, createRandomSource(1))).toEqual({
			ok: false,
			message: 'n doit être un entier entre 1 et 1 000'
		});
	});

	// Revue : une moyenne pile sur la marge était comptée dehors (arrondi)
	it('moyenne pile sur la marge : comptée dedans', () => {
		// Une seule valeur : σ = 0, marge 0, toutes les moyennes valent μ
		const single = okValue(
			simulateSamples(fractions('1/10'), fractions('1'), 5, 3, createRandomSource(1))
		);
		expect(single.within).toBe(5);

		// Pièce, n = 36 : marge 1/6, moyennes 12/36 et 24/36 exactement au bord
		const coin = okValue(simulateSamples(COIN, HALVES, 1000, 36, createRandomSource(1)));
		const expected = coin.means.filter((m) => Math.abs(m * 36 - 18) <= 6).length;
		expect(coin.within).toBe(expected);
	});

	it('même graine, mêmes moyennes', () => {
		const a = okValue(simulateSamples(DIE, SIXTHS, 20, 30, createRandomSource(5))).means;
		const b = okValue(simulateSamples(DIE, SIXTHS, 20, 30, createRandomSource(5))).means;

		expect(b).toEqual(a);
	});
});
