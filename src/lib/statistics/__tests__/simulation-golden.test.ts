/**
 * Non-régression « or » de la simulation (revue de la manche 14, 2026-10-04).
 *
 * `simulateCounts`, `simulateRunningMean` et `simulateSamples` passent
 * désormais par `LawSampler` : les nombres EXACTS tirés pour une graine ne
 * doivent pas avoir bougé. Valeurs relevées sur `main` (3765e70d0, avant la
 * manche 14) par un script qui importait les modules du dépôt principal, puis
 * collées ici — jamais recalculées sur la branche.
 */

import { describe, it, expect } from 'vitest';
import { Fraction } from '../fraction';
import { binomialDistribution } from '../binomial';
import { simulateCounts, simulateRunningMean, simulateSamples } from '../simulation';
import { createRandomSource } from '../../utils/random';

const f = (text: string) => Fraction.parse(text)!;

const HAND = { values: ['-2', '0', '5'].map(f), probabilities: ['1/2', '3/10', '1/5'].map(f) };
const BINOMIAL = (() => {
	const law = binomialDistribution(10, f('0,3'));
	return {
		values: Array.from({ length: 11 }, (_, k) => f(String(k))),
		probabilities: law.numerators.map((num) => new Fraction(num, law.denominator))
	};
})();

const okValue = <T>(outcome: { ok: true; value: T } | { ok: false; message: string }) => {
	if (!outcome.ok) throw new Error(outcome.message);
	return outcome.value;
};

/** Relevé sur main : effectifs (1 000 tirages, graine 42), moyennes (500, graine 7), échantillons (20 × 30, graine 2026) */
const GOLDEN = [
	{
		name: 'loi écrite à la main (−2 ; 0 ; 5)',
		law: HAND,
		counts: [480, 316, 204],
		means: [-2, -0.5, 0.09],
		samples: {
			first: [
				-0.6, 0.5333333333333333, 0.8666666666666667, 0.26666666666666666, 0.13333333333333333
			],
			within: 20,
			margin: 0.966091783079296
		}
	},
	{
		name: 'B(10 ; 0,3)',
		law: BINOMIAL,
		counts: [23, 113, 226, 290, 188, 111, 37, 12, 0, 0, 0],
		means: [0, 2.9, 3.104],
		samples: {
			first: [2.7333333333333334, 3.433333333333333, 3.2, 3, 2.8666666666666667],
			within: 20,
			margin: 0.5291502622129182
		}
	}
];

describe('simulation — mêmes nombres que sur main pour une graine donnée', () => {
	it.each(GOLDEN)('$name : effectifs', ({ law, counts }) => {
		const result = okValue(
			simulateCounts(law.values, law.probabilities, 1000, createRandomSource(42))
		);
		expect(result.counts).toEqual(counts);
	});

	it.each(GOLDEN)('$name : moyenne selon n', ({ law, means }) => {
		const result = okValue(
			simulateRunningMean(law.values, law.probabilities, 500, createRandomSource(7))
		);
		expect([result.means[0], result.means[9], result.means[499]]).toEqual(means);
	});

	it.each(GOLDEN)('$name : échantillons', ({ law, samples }) => {
		const result = okValue(
			simulateSamples(law.values, law.probabilities, 20, 30, createRandomSource(2026))
		);
		expect(result.means.slice(0, 5)).toEqual(samples.first);
		expect(result.within).toBe(samples.within);
		expect(result.margin).toBe(samples.margin);
	});
});
