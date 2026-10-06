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

/** Nombre maximal de divisions de la période par 2 (2π → π → π/2 → …). */
const MAX_HALVINGS = 4;

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
 * Diviser la période par 2 tant que l'ensemble des bases est invariant par
 * translation d'une demi-période : `{π/6, 5π/6, −π/6, −5π/6} + 2kπ` devient
 * `{π/6, −π/6} + kπ`. De chaque paire, on garde la base de plus petite valeur
 * absolue (la positive à égalité).
 */
function reduceByHalving(
	bases: readonly NumericSolution[],
	period: MathNode,
	periodNumeric: number
): { bases: readonly NumericSolution[]; period: MathNode; periodNumeric: number } {
	let current = bases;
	let currentPeriod = period;
	let currentNumeric = periodNumeric;

	for (let i = 0; i < MAX_HALVINGS; i++) {
		const half = currentNumeric / 2;
		const invariant = current.every((b) =>
			current.some((other) => congruent(other.numeric, b.numeric + half, currentNumeric))
		);
		if (!invariant || current.length % 2 !== 0) break;

		const kept: NumericSolution[] = [];
		for (const b of current) {
			if (kept.some((k) => congruent(k.numeric, b.numeric, half))) continue;
			const partner = current.find((o) => congruent(o.numeric, b.numeric + half, currentNumeric));
			const better =
				partner === undefined ||
				Math.abs(b.numeric) < Math.abs(partner.numeric) - TOLERANCE ||
				(Math.abs(Math.abs(b.numeric) - Math.abs(partner.numeric)) <= TOLERANCE &&
					b.numeric >= partner.numeric)
					? b
					: partner;
			kept.push(better);
		}

		current = kept;
		currentPeriod = simplified(divide(currentPeriod, number('2'), 'fraction'));
		currentNumeric = half;
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
 * puis la période est réduite si l'ensemble le permet (voir `reduceByHalving`).
 */
export function mergePeriodicFamilies(
	families: readonly PeriodicSolutionFamily[]
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

	const reduced = reduceByHalving(bases, commonPeriod, commonNumeric);
	const sorted = [...reduced.bases].sort((a, b) => a.numeric - b.numeric);

	return {
		baseSolutions: sorted.map((b) => b.solution),
		period: reduced.period,
		periodNumeric: reduced.periodNumeric
	};
}
