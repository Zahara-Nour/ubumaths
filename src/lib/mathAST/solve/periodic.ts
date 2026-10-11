/**
 * Réunion de familles périodiques de solutions
 *
 * `sin x · cos x = 0` a DEUX familles (kπ et π/2 + kπ) ; le produit nul n'en
 * gardait que la première, et le module de signe, qui énumère les zéros d'un
 * intervalle borné à partir de la famille, en perdait la moitié. Même chose
 * pour un changement de variable : `sin²x = 1/4` réunit les familles de
 * `sin x = 1/2` et de `sin x = −1/2`.
 *
 * @module mathAST/solve/periodic
 */

import type { MathNode } from '../types';
import type { PeriodicSolutionFamily, Solution } from './types';
import { add, divide, multiply, number } from '../factory';
import { normalize, denormalize } from '../normal';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

// =============================================================================
// Constantes
// =============================================================================

const TOLERANCE = 1e-9;

/** Nombre maximal de divisions de la période (2π → π → π/2 → …). */
const MAX_DIVISIONS = 4;

/**
 * Diviseurs essayés par défaut : 2 (2π → π). La division par 3 (2π → 2π/3)
 * est demandée par `tryTrigEquality` seul (`cos 2x = cos x` → 2kπ/3) : ailleurs
 * elle réécrivait l'écriture du manuel (`2cos²x − cos x − 1 = 0` : cos x = 1
 * ou cos x = −1/2 devenait 2kπ/3, revue 2026-10-09).
 */
const DEFAULT_DIVISORS: readonly number[] = [2];

export interface MergeOptions {
	/** Diviseurs de la période essayés, dans l'ordre (par défaut : 2) */
	readonly divisors?: readonly number[];
}

/** Plus grand multiple essayé de la plus longue période pour la période commune. */
const MAX_COMMON_MULTIPLE = 12;

// =============================================================================
// Aides
// =============================================================================

function numericOf(solution: Solution): number | null {
	if (solution.approximate !== undefined) return solution.approximate;
	try {
		const value = evaluateNodeToApproximatedNumber(solution.value);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

function simplified(node: MathNode): MathNode {
	return denormalize(normalize(node));
}

/** `a ≡ b (mod period)`, à la tolérance près. */
function congruent(a: number, b: number, period: number): boolean {
	const r = (((a - b) % period) + period) % period;
	return r < TOLERANCE || period - r < TOLERANCE;
}

interface NumericSolution {
	readonly solution: Solution;
	readonly numeric: number;
}

/**
 * Diviser la période par d (2, et 3 si demandé) tant que l'ensemble des bases est
 * invariant par translation de T/d : `{π/6, 5π/6, −π/6, −5π/6} + 2kπ` devient
 * `{π/6, −π/6} + kπ`, `{0, 2π/3, 4π/3} + 2kπ` devient `2kπ/3` (cos 2x = cos x,
 * revue 2026-10-09). De chaque orbite, on garde la base de plus petite valeur
 * absolue (la positive à égalité).
 */
function reduceByDivision(
	bases: readonly NumericSolution[],
	period: MathNode,
	periodNumeric: number,
	divisors: readonly number[]
): { bases: readonly NumericSolution[]; period: MathNode; periodNumeric: number } {
	let current = bases;
	let currentPeriod = period;
	let currentNumeric = periodNumeric;

	for (let i = 0; i < MAX_DIVISIONS; i++) {
		const divisor = divisors.find((d) => {
			if (current.length % d !== 0) return false;
			const shift = currentNumeric / d;
			return current.every((b) =>
				current.some((other) => congruent(other.numeric, b.numeric + shift, currentNumeric))
			);
		});
		if (divisor === undefined) break;

		const reduced = currentNumeric / divisor;
		const kept: NumericSolution[] = [];
		for (const b of current) {
			if (kept.some((k) => congruent(k.numeric, b.numeric, reduced))) continue;
			const orbit = current.filter((o) => congruent(o.numeric, b.numeric, reduced));
			const best = orbit.reduce((x, y) =>
				Math.abs(y.numeric) < Math.abs(x.numeric) - TOLERANCE ||
				(Math.abs(Math.abs(y.numeric) - Math.abs(x.numeric)) <= TOLERANCE && y.numeric > x.numeric)
					? y
					: x
			);
			kept.push(best);
		}

		current = kept;
		currentPeriod = simplified(divide(currentPeriod, number(String(divisor)), 'fraction'));
		currentNumeric = reduced;
	}

	return { bases: current, period: currentPeriod, periodNumeric: currentNumeric };
}

/** Le plus petit m tel que m·T divise par chaque période, sinon `null`. */
function commonMultiple(
	families: readonly PeriodicSolutionFamily[],
	longestNumeric: number
): number | null {
	for (let m = 1; m <= MAX_COMMON_MULTIPLE; m++) {
		const candidate = m * longestNumeric;
		const divides = families.every((f) => {
			const ratio = candidate / f.periodNumeric;
			return Math.abs(ratio - Math.round(ratio)) < TOLERANCE;
		});
		if (divides) return m;
	}
	return null;
}

// =============================================================================
// API
// =============================================================================

/**
 * La réunion de familles périodiques, ou `null` si leurs périodes n'ont pas
 * de multiple commun simple (au plus 12 fois la plus longue).
 *
 * Les bases de chaque famille sont recopiées sur la période commune
 * (`x₀ + k·T` pour k = 0 … L/T − 1), dédoublonnées modulo cette période,
 * puis la période est réduite si l'ensemble le permet (voir `reduceByDivision`).
 */
export function mergePeriodicFamilies(
	families: readonly PeriodicSolutionFamily[],
	options: MergeOptions = {}
): PeriodicSolutionFamily | null {
	if (families.length === 0) return null;

	const longest = families.reduce((a, b) => (b.periodNumeric > a.periodNumeric ? b : a));

	// Période commune : le plus petit multiple de la plus longue que toutes
	// divisent — π et 2π/3 (sin 2x · sin 3x) donnent 2π. Sans multiple commun
	// raisonnable : `null`, jamais une famille partielle.
	const multiple = commonMultiple(families, longest.periodNumeric);
	if (multiple === null) return null;
	const commonNumeric = multiple * longest.periodNumeric;
	const commonPeriod =
		multiple === 1
			? longest.period
			: simplified(multiply(number(String(multiple)), longest.period, 'implicit'));

	const bases: NumericSolution[] = [];
	for (const family of families) {
		const ratio = commonNumeric / family.periodNumeric;
		const copies = Math.round(ratio);
		if (Math.abs(ratio - copies) > TOLERANCE || copies < 1) return null;

		for (const base of family.baseSolutions) {
			const numeric = numericOf(base);
			if (numeric === null) return null;
			for (let k = 0; k < copies; k++) {
				const shifted = numeric + k * family.periodNumeric;
				if (bases.some((b) => congruent(b.numeric, shifted, commonNumeric))) continue;
				const value =
					k === 0
						? base.value
						: simplified(add(base.value, multiply(number(String(k)), family.period, 'implicit')));
				bases.push({
					solution: { ...base, value, approximate: shifted },
					numeric: shifted
				});
			}
		}
	}

	const reduced = reduceByDivision(
		bases,
		commonPeriod,
		commonNumeric,
		options.divisors ?? DEFAULT_DIVISORS
	);
	const sorted = [...reduced.bases].sort((a, b) => a.numeric - b.numeric);

	return {
		baseSolutions: sorted.map((b) => b.solution),
		period: reduced.period,
		periodNumeric: reduced.periodNumeric
	};
}
