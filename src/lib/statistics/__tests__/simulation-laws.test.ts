/**
 * Simuler les lois de maths complémentaires (manche 14, PR b, spécification
 * validée par David le 2026-10-04) : G(p), U(a ; b), U([a ; b]), E(λ), tirées
 * par INVERSION du générateur à graine (u ∈ [0 ; 1[).
 *
 * Les tests assertent des VALEURS : support de chaque loi, moyenne de 10 000
 * tirages à moins de 3 σ/√n de E(X), reproductibilité par la graine, et les
 * bords du générateur (u = 0, u tout près de 1).
 */

import { describe, it, expect } from 'vitest';
import { Fraction } from '../fraction';
import {
	exponentialSampler,
	geometricSampler,
	simulateDraws,
	simulateLawRunningMean,
	simulateLawSamples,
	uniformDensitySampler,
	uniformSampler,
	type LawSampler
} from '../simulation';
import { createRandomSource, type RandomSource } from '../../utils/random';

// =============================================================================
// Helpers
// =============================================================================

const f = (text: string) => Fraction.parse(text)!;

const okValue = <T>(outcome: { ok: true; value: T } | { ok: false; message: string }) => {
	if (!outcome.ok) throw new Error(`échec : ${outcome.message}`);
	return outcome.value;
};

/** Les quatre lois, avec E(X) et σ attendus (calculés à la main) */
const LAWS: [string, LawSampler, number, number][] = [
	['G(0,2)', geometricSampler(f('0,2')), 5, Math.sqrt(0.8) / 0.2],
	['U(1 ; 6)', uniformSampler(1, 6), 3.5, Math.sqrt(35 / 12)],
	['U([2 ; 10])', uniformDensitySampler(f('2'), f('10')), 6, 8 / Math.sqrt(12)],
	['E(0,5)', exponentialSampler(f('0,5')), 2, 2]
];

/** Une source qui rend des valeurs fixées, en boucle */
function fixedSource(...values: number[]): RandomSource {
	let i = 0;
	return () => values[i++ % values.length];
}

// =============================================================================
// Support de chaque loi
// =============================================================================

describe('tirages par inversion — chaque tirage est dans le support', () => {
	const draws = (sampler: LawSampler, n = 5000, seed = 7) =>
		okValue(simulateDraws(sampler, n, createRandomSource(seed)));

	it('G(0,2) : des entiers ⩾ 1', () => {
		const xs = draws(geometricSampler(f('0,2')));
		expect(xs.every((x) => Number.isInteger(x) && x >= 1)).toBe(true);
		// Une loi géométrique de paramètre 0,2 dépasse 10 assez souvent (P ≈ 0,107)
		expect(xs.some((x) => x > 10)).toBe(true);
	});

	it('G(1) : toujours 1', () => {
		const xs = draws(geometricSampler(f('1')), 1000);
		expect(new Set(xs)).toEqual(new Set([1]));
	});

	it('U(−2 ; 3) : des entiers de −2 à 3, chacun tiré', () => {
		const xs = draws(uniformSampler(-2, 3));
		expect(xs.every((x) => Number.isInteger(x) && x >= -2 && x <= 3)).toBe(true);
		expect(new Set(xs)).toEqual(new Set([-2, -1, 0, 1, 2, 3]));
	});

	it('U([2 ; 10]) : des réels de [2 ; 10]', () => {
		const xs = draws(uniformDensitySampler(f('2'), f('10')));
		expect(xs.every((x) => x >= 2 && x <= 10)).toBe(true);
		expect(xs.some((x) => !Number.isInteger(x))).toBe(true);
	});

	it('E(0,5) : des réels positifs, finis', () => {
		const xs = draws(exponentialSampler(f('0,5')));
		expect(xs.every((x) => x >= 0 && Number.isFinite(x))).toBe(true);
	});
});

describe('tirages par inversion — bords du générateur', () => {
	it('u = 0 : G et E restent finis, G vaut au moins 1', () => {
		const g = okValue(simulateDraws(geometricSampler(f('0,3')), 3, fixedSource(0)));
		const e = okValue(simulateDraws(exponentialSampler(f('2')), 3, fixedSource(0)));
		expect(g.every((x) => Number.isInteger(x) && x >= 1)).toBe(true);
		expect(e.every((x) => Number.isFinite(x) && x >= 0)).toBe(true);
	});

	it('u tout près de 1 : U(1 ; 6) rend 6, jamais 7 ; U([0 ; 1]) reste ⩽ 1', () => {
		const near = 1 - 2 ** -53;
		expect(okValue(simulateDraws(uniformSampler(1, 6), 1, fixedSource(near)))).toEqual([6]);
		const [x] = okValue(simulateDraws(uniformDensitySampler(f('0'), f('1')), 1, fixedSource(near)));
		expect(x).toBeLessThanOrEqual(1);
	});

	it('inversion exacte : u = 0,5 donne la médiane de E(λ), ln 2 / λ', () => {
		const [x] = okValue(simulateDraws(exponentialSampler(f('2')), 1, fixedSource(0.5)));
		expect(x).toBeCloseTo(Math.log(2) / 2, 12);
	});

	it('G(0,5) : P(X > k) = 0,5^k — u ∈ [0 ; 0,5[ donne 1 (comme 1 − u ∈ ]0,5 ; 1])', () => {
		const xs = okValue(simulateDraws(geometricSampler(f('1/2')), 3, fixedSource(0, 0.25, 0.49)));
		expect(xs).toEqual([1, 1, 1]);
		const ys = okValue(simulateDraws(geometricSampler(f('1/2')), 2, fixedSource(0.6, 0.74)));
		expect(ys).toEqual([2, 2]);
	});
});

// =============================================================================
// Loi des grands nombres : moyenne de 10 000 tirages
// =============================================================================

describe('moyenne de 10 000 tirages à moins de 3 σ/√n de E(X)', () => {
	it.each(LAWS)('%s', (_name, sampler, expectation, deviation) => {
		expect(sampler.law.expectation.toNumber()).toBeCloseTo(expectation, 12);
		expect(sampler.law.deviation).toBeCloseTo(deviation, 12);
		const n = 10_000;
		const xs = okValue(simulateDraws(sampler, n, createRandomSource(2026)));
		const mean = xs.reduce((a, b) => a + b, 0) / n;
		expect(Math.abs(mean - expectation)).toBeLessThan((3 * deviation) / Math.sqrt(n));
	});
});

// =============================================================================
// Reproductibilité
// =============================================================================

describe('même graine, mêmes tirages ; autre graine, autres tirages', () => {
	it.each(LAWS)('%s', (_name, sampler) => {
		const a = okValue(simulateDraws(sampler, 200, createRandomSource(42)));
		const b = okValue(simulateDraws(sampler, 200, createRandomSource(42)));
		const c = okValue(simulateDraws(sampler, 200, createRandomSource(43)));
		expect(a).toEqual(b);
		expect(a).not.toEqual(c);
	});
});

// =============================================================================
// Modes moyenne et échantillons
// =============================================================================

describe('modes moyenne et échantillons pour les quatre lois', () => {
	it.each(LAWS)('%s : moyenne selon n, de longueur n, vers E(X)', (_n, sampler, expectation) => {
		const { means, expectation: e } = okValue(
			simulateLawRunningMean(sampler, 10_000, createRandomSource(5))
		);
		expect(means).toHaveLength(10_000);
		expect(e.toNumber()).toBeCloseTo(expectation, 12);
		expect(Math.abs(means[9999] - expectation)).toBeLessThan(
			(3 * sampler.law.deviation) / Math.sqrt(10_000)
		);
	});

	it.each(LAWS)('%s : N échantillons, marge 2σ/√n', (_n, sampler, expectation, deviation) => {
		const result = okValue(simulateLawSamples(sampler, 200, 100, createRandomSource(9)));
		expect(result.means).toHaveLength(200);
		expect(result.margin).toBeCloseTo((2 * deviation) / 10, 12);
		expect(result.expectation.toNumber()).toBeCloseTo(expectation, 12);
		// Environ 95 % des moyennes dans μ ± 2σ/√n : au moins 85 % sur 200
		expect(result.within).toBeGreaterThanOrEqual(170);
		const counted = result.means.filter(
			(m) => Math.abs(m - expectation) <= result.margin + 1e-9
		).length;
		expect(result.within).toBe(counted);
	});

	it('plafonds : 10 000 tirages pour la moyenne, 100 000 tirages en tout', () => {
		const sampler = exponentialSampler(f('1'));
		expect(simulateLawRunningMean(sampler, 10_001, createRandomSource(1)).ok).toBe(false);
		expect(simulateDraws(sampler, 0, createRandomSource(1)).ok).toBe(false);
		expect(simulateLawSamples(sampler, 1001, 10, createRandomSource(1)).ok).toBe(false);
	});
});
