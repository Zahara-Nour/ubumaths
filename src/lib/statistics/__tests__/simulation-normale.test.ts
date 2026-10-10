/**
 * Simulation de la loi normale (D7, décision de David du 2026-10-11)
 *
 * Par inversion, comme les autres lois : Y = μ + σ·Φ⁻¹(u), un nombre aléatoire
 * par tirage. Φ⁻¹ sans table (`normalQuantile`).
 */
import { describe, it, expect } from 'vitest';
import { normalCdf, normalQuantile } from '../density';
import { normalSampler, simulateDraws } from '../simulation';
import { Fraction } from '../fraction';
import { createRandomSource } from '$lib/utils/random';

const fixed = (u: number) => () => u;

describe('normalQuantile : Φ⁻¹ sans table', () => {
	it('Φ⁻¹(0,5) = 0 ; Φ⁻¹(0,975) ≈ 1,959964', () => {
		expect(normalQuantile(0.5)).toBe(0);
		expect(normalQuantile(0.975)).toBeCloseTo(1.959963984540054, 9);
	});

	it.each([-6, -3, -1.5, -0.2, 0.7, 2, 4.5])('Φ⁻¹(Φ(%s)) ≈ %s', (z) => {
		expect(normalQuantile(normalCdf(z))).toBeCloseTo(z, 9);
	});

	it('symétrie : Φ⁻¹(1 − p) = −Φ⁻¹(p)', () => {
		for (const p of [0.001, 0.02, 0.3]) {
			expect(normalQuantile(1 - p)).toBeCloseTo(-normalQuantile(p), 9);
		}
	});

	it('p minuscule : fini, très négatif', () => {
		const z = normalQuantile(Number.MIN_VALUE);
		expect(Number.isFinite(z)).toBe(true);
		expect(z).toBeLessThan(-30);
	});
});

describe('normalSampler : N(μ ; σ²) par inversion', () => {
	const sampler = normalSampler(new Fraction(10n, 1n), new Fraction(4n, 1n));

	it('la loi : E = μ, V = σ²', () => {
		expect(sampler.law.expectation.equals(new Fraction(10n, 1n))).toBe(true);
		expect(sampler.law.variance.equals(new Fraction(4n, 1n))).toBe(true);
	});

	it('inversion exacte : u = 0,5 → μ ; u = Φ(1,96) → μ + 1,96σ', () => {
		expect(sampler.draw(fixed(0.5))).toBe(10);
		expect(sampler.draw(fixed(normalCdf(1.96)))).toBeCloseTo(10 + 2 * 1.96, 9);
	});

	it('bords du générateur : u = 0 et u tout près de 1 restent finis', () => {
		expect(Number.isFinite(sampler.draw(fixed(0)))).toBe(true);
		expect(Number.isFinite(sampler.draw(fixed(1 - 2 ** -53)))).toBe(true);
	});

	it('moyenne de 10 000 tirages à moins de 3σ/√n de μ', () => {
		const outcome = simulateDraws(sampler, 10000, createRandomSource(7));
		if (!outcome.ok) throw new Error(outcome.message);
		const mean = outcome.value.reduce((a, b) => a + b, 0) / 10000;
		expect(Math.abs(mean - 10)).toBeLessThan((3 * 2) / Math.sqrt(10000));
	});

	it('même graine, mêmes tirages ; autre graine, autres tirages', () => {
		const draws = (seed: number) => {
			const outcome = simulateDraws(sampler, 50, createRandomSource(seed));
			if (!outcome.ok) throw new Error(outcome.message);
			return outcome.value;
		};
		expect(draws(3)).toEqual(draws(3));
		expect(draws(3)).not.toEqual(draws(4));
	});
});
