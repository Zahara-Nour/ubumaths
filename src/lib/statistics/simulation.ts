/**
 * Statistiques — simuler une variable aléatoire finie
 *
 * v2, lot 1 (Q72-Q76, 2026-10-02). Programmes : 6e (fréquence observée et
 * probabilité), 2de `2-179` (loi des grands nombres), 1re spé `1SPE-170` →
 * `173` (N échantillons de taille n, écart à l'espérance au plus 2σ/√n).
 *
 * Le hasard vient d'une `RandomSource` : avec une graine, les mêmes tirages à
 * chaque fois (Q70) — un atelier partagé par URL montre ce qu'a vu l'élève, et
 * un test vérifie une simulation au chiffre près.
 *
 * ⚠️ Pas d'import `$lib` dans ce module (cf. v1) : chemins relatifs.
 *
 * @module statistics/simulation
 */

import type { Fraction } from './fraction';
import { failure, success, type Outcome } from './outcome';
import { randomVariable, type RandomVariableLaw } from './random-variable';
import { geometricMoments } from './geometric';
import { uniformMoments } from './uniform';
import {
	exponentialMoments,
	normalMoments,
	normalQuantile,
	uniformDensityMoments
} from './density';
import type { RandomSource } from '../utils/random';

// =============================================================================
// Types
// =============================================================================

/**
 * Une loi qu'on sait tirer (manche 14) : un tirage, et E, V, σ. Les lois de
 * maths complémentaires se tirent par INVERSION du générateur à graine ; une
 * loi finie écrite à la main, par ses probabilités cumulées.
 */
export interface LawSampler {
	readonly draw: (random: RandomSource) => number;
	readonly law: RandomVariableLaw;
}

export interface SimulatedCounts {
	/** Effectif observé de chaque valeur, dans l'ordre des valeurs */
	readonly counts: readonly number[];
}

export interface SimulatedRunningMean {
	/** Moyenne des k premiers tirages, pour k de 1 à n */
	readonly means: readonly number[];
	readonly expectation: Fraction;
}

export interface SimulatedSamples {
	/** Moyenne de chaque échantillon */
	readonly means: readonly number[];
	readonly expectation: Fraction;
	/** Écart type σ de la variable */
	readonly deviation: number;
	/** 2σ/√n */
	readonly margin: number;
	/** Nombre d'échantillons dont la moyenne m vérifie |m − μ| ≤ 2σ/√n */
	readonly within: number;
}

// =============================================================================
// Constantes
// =============================================================================

/** Bornes de calcul (Q73-Q75) : chaque simulation reste instantanée */
export const SIMULATION_LIMITS = {
	/** `simuler` : n tirages, résumés en effectifs */
	draws: 100_000,
	/** `fréquence` : une moyenne gardée par tirage */
	runningDraws: 10_000,
	/** `échantillons` : N échantillons… */
	samples: 1_000,
	/** … de taille n */
	sampleSize: 1_000
} as const;

// =============================================================================
// Fonctions
// =============================================================================

/** 100000 → « 100 000 », comme dans un message à l'élève */
function grouped(value: number): string {
	return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Un nombre de tirages : entier de 1 à `max`, sinon le message */
function checkCount(n: number, max: number, name: string): string | null {
	return Number.isInteger(n) && n >= 1 && n <= max
		? null
		: `${name} doit être un entier entre 1 et ${grouped(max)}`;
}

/**
 * La loi, validée par `randomVariable` (mêmes messages que l'action « Loi »),
 * et un tirage d'indice selon les probabilités.
 */
function prepareLaw(
	values: readonly Fraction[],
	probabilities: readonly Fraction[]
): Outcome<{ law: RandomVariableLaw; draw: (random: RandomSource) => number }> {
	const law = randomVariable(values, probabilities);
	if (law === null) return failure('Il faut au moins une valeur.');
	if (!law.ok) return law;

	// Probabilités cumulées ; une valeur de probabilité nulle n'est jamais tirée
	// (`u < cumul` strict : son cumul égale celui de la valeur précédente)
	const cumulative: number[] = [];
	let total = 0;
	for (const p of probabilities) cumulative.push((total += p.toNumber()));
	const lastPossible = probabilities.findLastIndex((p) => p.toNumber() > 0);

	const draw = (random: RandomSource) => {
		const u = random();
		const index = cumulative.findIndex((c) => u < c);
		// Une somme flottante un peu sous 1 (dix fois 1/10) : `u` peut dépasser
		// le dernier cumul ; on rend la dernière valeur possible, jamais une nulle
		return index === -1 ? lastPossible : index;
	};
	return success({ law: law.value, draw });
}

/** Une loi finie écrite à la main : tirer une VALEUR (et non son indice) */
export function discreteSampler(
	values: readonly Fraction[],
	probabilities: readonly Fraction[]
): Outcome<LawSampler> {
	const prepared = prepareLaw(values, probabilities);
	if (!prepared.ok) return prepared;
	const numbers = values.map((v) => v.toNumber());
	const { law, draw } = prepared.value;
	return success({ law, draw: (random) => numbers[draw(random)] });
}

/**
 * G(p) par inversion : P(X > k) = q^k, donc X = ⌈ln(v)/ln(q)⌉ avec
 * v = 1 − u ∈ ]0 ; 1] — jamais ln(0). v = 1 donnerait 0 : ramené à 1.
 * G(1) : toujours 1 (ln(0) au dénominateur évité).
 */
export function geometricSampler(p: Fraction): LawSampler {
	const chance = p.toNumber();
	const logQ = Math.log1p(-chance);
	return {
		law: geometricMoments(p),
		draw: (random) => {
			const v = 1 - random();
			if (chance >= 1) return 1;
			return Math.max(1, Math.ceil(Math.log(v) / logQ));
		}
	};
}

/** U(a ; b), entiers : a + ⌊(b − a + 1)u⌋, de a à b (u < 1) */
export function uniformSampler(a: number, b: number): LawSampler {
	const count = b - a + 1;
	return {
		law: uniformMoments(a, b),
		// `Math.min` : un garde-fou si un produit flottant touchait b + 1
		draw: (random) => Math.min(b, a + Math.floor(count * random()))
	};
}

/** U([a ; b]) : a + (b − a)u, dans [a ; b[ */
export function uniformDensitySampler(a: Fraction, b: Fraction): LawSampler {
	const low = a.toNumber();
	const length = b.toNumber() - low;
	return { law: uniformDensityMoments(a, b), draw: (random) => low + length * random() };
}

/** E(λ) par inversion : −ln(1 − u)/λ, fini (1 − u ∈ ]0 ; 1]) et positif */
export function exponentialSampler(lambda: Fraction): LawSampler {
	const rate = lambda.toNumber();
	// `+ 0` : −0 pour u = 0 s'écrirait « −0 »
	return { law: exponentialMoments(lambda), draw: (random) => -Math.log1p(-random()) / rate + 0 };
}

/**
 * N(μ ; σ²) par inversion (D7, 2026-10-11) : μ + σ·Φ⁻¹(u), un nombre
 * aléatoire par tirage comme les autres lois. u = 0 (Φ⁻¹ = −∞) est ramené au
 * plus petit flottant positif : le tirage reste fini (≈ μ − 38,5σ).
 */
export function normalSampler(mu: Fraction, variance: Fraction): LawSampler {
	const center = mu.toNumber();
	const sigma = Math.sqrt(variance.toNumber());
	return {
		law: normalMoments(mu, variance),
		draw: (random) => {
			const u = random();
			return center + sigma * normalQuantile(u === 0 ? Number.MIN_VALUE : u);
		}
	};
}

/** n tirages bruts d'une loi (manche 14) : les lois de maths complémentaires */
export function simulateDraws(
	sampler: LawSampler,
	n: number,
	random: RandomSource
): Outcome<readonly number[]> {
	const invalid = checkCount(n, SIMULATION_LIMITS.draws, 'n');
	if (invalid) return failure(invalid);
	return success(Array.from({ length: n }, () => sampler.draw(random)));
}

/** n tirages, résumés en effectifs par valeur (Q73) */
export function simulateCounts(
	values: readonly Fraction[],
	probabilities: readonly Fraction[],
	n: number,
	random: RandomSource
): Outcome<SimulatedCounts> {
	const invalid = checkCount(n, SIMULATION_LIMITS.draws, 'n');
	if (invalid) return failure(invalid);
	const prepared = prepareLaw(values, probabilities);
	if (!prepared.ok) return prepared;

	const counts = new Array<number>(values.length).fill(0);
	for (let k = 0; k < n; k++) counts[prepared.value.draw(random)]++;
	return success({ counts });
}

/** Moyenne des tirages selon n : la loi des grands nombres (Q74) */
export function simulateRunningMean(
	values: readonly Fraction[],
	probabilities: readonly Fraction[],
	n: number,
	random: RandomSource
): Outcome<SimulatedRunningMean> {
	const invalid = checkCount(n, SIMULATION_LIMITS.runningDraws, 'n');
	if (invalid) return failure(invalid);
	const sampler = discreteSampler(values, probabilities);
	if (!sampler.ok) return sampler;
	return simulateLawRunningMean(sampler.value, n, random);
}

/** Moyenne des tirages selon n, pour une loi qu'on sait tirer (manche 14) */
export function simulateLawRunningMean(
	sampler: LawSampler,
	n: number,
	random: RandomSource
): Outcome<SimulatedRunningMean> {
	const invalid = checkCount(n, SIMULATION_LIMITS.runningDraws, 'n');
	if (invalid) return failure(invalid);
	const means: number[] = [];
	let sum = 0;
	for (let k = 1; k <= n; k++) {
		sum += sampler.draw(random);
		means.push(sum / k);
	}
	return success({ means, expectation: sampler.law.expectation });
}

/** N échantillons de taille n, et l'écart de leur moyenne à μ (Q75) */
export function simulateSamples(
	values: readonly Fraction[],
	probabilities: readonly Fraction[],
	sampleCount: number,
	sampleSize: number,
	random: RandomSource
): Outcome<SimulatedSamples> {
	const invalid =
		checkCount(sampleCount, SIMULATION_LIMITS.samples, 'N') ??
		checkCount(sampleSize, SIMULATION_LIMITS.sampleSize, 'n');
	if (invalid) return failure(invalid);
	const sampler = discreteSampler(values, probabilities);
	if (!sampler.ok) return sampler;
	return simulateLawSamples(sampler.value, sampleCount, sampleSize, random);
}

/** N échantillons de taille n, pour une loi qu'on sait tirer (manche 14) */
export function simulateLawSamples(
	sampler: LawSampler,
	sampleCount: number,
	sampleSize: number,
	random: RandomSource
): Outcome<SimulatedSamples> {
	const invalid =
		checkCount(sampleCount, SIMULATION_LIMITS.samples, 'N') ??
		checkCount(sampleSize, SIMULATION_LIMITS.sampleSize, 'n');
	if (invalid) return failure(invalid);

	const { law, draw } = sampler;
	const mu = law.expectation.toNumber();
	const margin = (2 * law.deviation) / Math.sqrt(sampleSize);

	const means: number[] = [];
	let within = 0;
	for (let s = 0; s < sampleCount; s++) {
		let sum = 0;
		for (let k = 0; k < sampleSize; k++) sum += draw(random);
		const mean = sum / sampleSize;
		means.push(mean);
		// Tolérance : une moyenne PILE sur la marge (loi discrète, n = 36 pour
		// une pièce) était comptée dehors par un arrondi flottant (revue)
		if (Math.abs(mean - mu) <= margin + 1e-9 * Math.max(1, Math.abs(mu))) within++;
	}
	return success({
		means,
		expectation: law.expectation,
		deviation: law.deviation,
		margin,
		within
	});
}
