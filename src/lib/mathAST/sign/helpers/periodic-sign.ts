/**
 * Signe d'une fonction PÉRIODIQUE sur un intervalle non borné
 *
 * Sur ℝ, le solveur ne rend que les zéros d'une période : un intervalle non
 * borné du tableau (]π ; +∞[ pour 1 + cos x) en contient d'autres, et
 * l'échantillonnage dans [−100 ; 100] ne les voit pas forcément (`cos(πx/180)`
 * était déclaré négatif sur ]90 ; +∞[, alors qu'il redevient positif en 270).
 *
 * Quand f est elle-même périodique de période T (`detectPeriodicity`, prouvée,
 * f continue), son signe se lit sur UNE période : entre deux zéros consécutifs
 * de [0 ; T], f garde un signe (TVI) ; un même signe sur tous ces morceaux vaut
 * pour tout ℝ privé des zéros. `1 + cos x`, `sin²x`, `1 − cos x` (dérivée de
 * x − sin x) sont donc positifs ; `cos x`, `cos(πx/180)` changent de signe →
 * inconnu. f non périodique (`eˣ·cos x`, `x·sin x`) → inconnu : rien ne relie
 * le signe d'une période à celui des suivantes.
 *
 * @module mathAST/sign/helpers/periodic-sign
 */

import type { MathNode } from '../../types';
import type { PeriodicSolutionFamily } from '../../solve/types';
import type { Sign, ZeroInfo } from '../types';
import { detectPeriodicity } from '../../analysis/periodicity';
import { compile } from '../../eval/compile';

/** Au-delà, les zéros d'une période sont trop nombreux pour conclure. */
const MAX_ZEROS_PER_PERIOD = 500;

/** Écart sous lequel deux zéros de la période sont confondus. */
const MERGE_EPS = 1e-9;

/** Positions des échantillons entre deux zéros consécutifs (fractions de l'écart). */
const FRACTIONS = [0.25, 0.5, 0.75] as const;

/**
 * Le signe de f partout hors de ses zéros quand f est périodique et de signe
 * constant sur une période ; `'unknown'` sinon.
 *
 * @param family - Les zéros périodiques rendus par le solveur
 * @param zeros - Les autres zéros connus (ramenés dans la période)
 */
export function signOverOnePeriod(
	expr: MathNode,
	variable: string,
	family: PeriodicSolutionFamily,
	zeros: readonly ZeroInfo[],
	tolerance: number
): Sign {
	const periodicity = detectPeriodicity(expr, { variable, verbosity: 'result' });
	const period = periodicity.periodNumeric;
	if (
		!periodicity.isPeriodic ||
		periodicity.confidence !== 'proven' ||
		periodicity.isContinuous === false ||
		period === null ||
		!Number.isFinite(period) ||
		period <= 0
	) {
		return 'unknown';
	}

	const cuts = zerosInPeriod(family, zeros, period);
	if (cuts === null) return 'unknown';

	let f: (scope: Record<string, number>) => number;
	try {
		f = compile(expr);
	} catch {
		return 'unknown';
	}

	let found: Sign | null = null;
	for (let i = 1; i < cuts.length; i++) {
		const a = cuts[i - 1];
		const b = cuts[i];
		if (b - a <= MERGE_EPS) continue;
		for (const t of FRACTIONS) {
			const value = f({ [variable]: a + (b - a) * t });
			if (!Number.isFinite(value) || Math.abs(value) <= tolerance) return 'unknown';
			const sign: Sign = value > 0 ? 'positive' : 'negative';
			if (found !== null && sign !== found) return 'unknown';
			found = sign;
		}
	}
	return found ?? 'unknown';
}

/**
 * Les zéros de f dans [0 ; T], bornes 0 et T comprises, triés ; `null` quand
 * ils sont trop nombreux.
 */
function zerosInPeriod(
	family: PeriodicSolutionFamily,
	zeros: readonly ZeroInfo[],
	period: number
): number[] | null {
	const reduce = (z: number): number => z - Math.floor(z / period) * period;
	const points: number[] = [0, period];

	const step = family.periodNumeric;
	if (!Number.isFinite(step) || step <= 0) return null;
	for (const base of family.baseSolutions) {
		const z0 = base.approximate;
		if (z0 === undefined || !Number.isFinite(z0)) return null;
		const kMin = Math.ceil((0 - z0) / step) - 1;
		const kMax = Math.floor((period - z0) / step) + 1;
		if (kMax - kMin > MAX_ZEROS_PER_PERIOD) return null;
		for (let k = kMin; k <= kMax; k++) points.push(reduce(z0 + k * step));
	}
	for (const zero of zeros) {
		if (zero.approximate === undefined || !Number.isFinite(zero.approximate)) return null;
		points.push(reduce(zero.approximate));
	}
	return points.sort((x, y) => x - y);
}
