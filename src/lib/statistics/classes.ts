/**
 * Statistiques — série regroupée en classes
 *
 * Programme de 2de, `2-160` et `2-161` : répartition supposée **uniforme**
 * dans chaque classe. La moyenne se calcule avec les centres des classes ; la
 * classe médiane est la première où les effectifs cumulés atteignent la
 * moitié de l'effectif total, et la médiane s'y estime par interpolation
 * linéaire.
 *
 * Classes `[lower ; upper[`, contiguës et dans l'ordre : c'est ce que donnent
 * `n + 1` bornes et `n` effectifs, la saisie retenue pour l'atelier.
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/classes
 */

import { isExactly, reaches } from './cumulative';
import { STATISTICS_LIMITS } from './limits';
import { failure, formatForMessage, success, type Failure, type Outcome } from './outcome';

// =============================================================================
// Types
// =============================================================================

/** Une classe `[lower ; upper[` et son effectif. */
export interface StatClass {
	readonly lower: number;
	readonly upper: number;
	readonly count: number;
}

export interface ClassRow extends StatClass {
	/** Amplitude `upper − lower`. */
	readonly width: number;
	/**
	 * Effectif par unité d'amplitude : la hauteur d'un rectangle
	 * d'histogramme, dont l'AIRE est alors proportionnelle à l'effectif.
	 */
	readonly density: number;
	readonly frequency: number;
	/** Part des données < `upper` (polygone croissant, point à la borne droite) */
	readonly cumulativeFrequency: number;
	/** Part des données ≥ `lower` (polygone décroissant, point à la borne gauche) */
	readonly decreasingCumulativeFrequency: number;
}

export interface ClassSummary {
	readonly classes: readonly ClassRow[];
	readonly total: number;
	/** Moyenne calculée avec les centres des classes. */
	readonly mean: number;
	readonly medianClassIndex: number;
	/** Médiane estimée par interpolation linéaire dans la classe médiane. */
	readonly estimatedMedian: number;
}

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Indicateurs d'une série en classes.
 *
 * @returns `null` sans aucune classe ; un échec situé pour une classe vide ou
 *   inversée, deux classes qui ne se suivent pas, un effectif invalide.
 */
export function summarizeClasses(classes: readonly StatClass[]): Outcome<ClassSummary> | null {
	if (classes.length === 0) return null;
	const invalid = checkClasses(classes);
	if (invalid) return invalid;

	const total = classes.reduce((sum, { count }) => sum + count, 0);
	if (total === 0) return failure('Effectif total nul : aucune donnée à décrire.');

	let weightedCenters = 0;
	let cumulative = 0;
	const rows: ClassRow[] = [];

	for (let i = 0; i < classes.length; i++) {
		const { lower, upper, count } = classes[i];
		const width = upper - lower;
		const before = cumulative;
		cumulative += count;
		weightedCenters += count * ((lower + upper) / 2);

		rows.push({
			lower,
			upper,
			count,
			width,
			density: count / width,
			frequency: count / total,
			cumulativeFrequency: cumulative / total,
			decreasingCumulativeFrequency: (total - before) / total
		});
	}

	// Une seule règle d'interpolation pour la médiane et les quartiles (revue du lot 3)
	const median = interpolate(classes, total, total / 2);
	return success({
		classes: rows,
		total,
		mean: weightedCenters / total,
		medianClassIndex: median.classIndex,
		estimatedMedian: median.value
	});
}

/**
 * Quantile estimé d'une série en classes, par interpolation linéaire dans la
 * classe où les effectifs cumulés atteignent `percent` % (répartition
 * uniforme) : ce que l'on lit sur le polygone des fréquences cumulées.
 *
 * ⚠️ Une ESTIMATION, à ne pas confondre avec le quartile d'une série brute
 * (`summarizeList`, définition du programme).
 *
 * @returns `null` sans aucune classe ; un échec situé sinon.
 */
export function estimateClassQuantile(
	classes: readonly StatClass[],
	percent: number
): Outcome<number> | null {
	if (classes.length === 0) return null;
	if (!(percent > 0 && percent < 100)) {
		return failure(`Pourcentage hors de ]0 ; 100[ (reçu ${formatForMessage(percent)}).`);
	}
	const invalid = checkClasses(classes);
	if (invalid) return invalid;

	const total = classes.reduce((sum, { count }) => sum + count, 0);
	if (total === 0) return failure('Effectif total nul : aucune donnée à décrire.');

	return success(interpolate(classes, total, (percent * total) / 100).value);
}

/**
 * Valeur où l'effectif cumulé atteint `target`, par interpolation linéaire
 * dans sa classe (répartition uniforme), et l'indice de cette classe.
 * Préconditions : classes valides, total > 0, 0 < target < total.
 */
function interpolate(
	classes: readonly StatClass[],
	total: number,
	target: number
): { value: number; classIndex: number } {
	let cumulative = 0;
	for (let i = 0; i < classes.length; i++) {
		const { lower, upper, count } = classes[i];
		const before = cumulative;
		cumulative += count;
		if (count > 0 && reaches(cumulative, target, total)) {
			// Atteint pile en fin de classe : la borne droite, sans bruit flottant
			if (isExactly(cumulative, target, total)) return { value: upper, classIndex: i };
			return { value: lower + ((target - before) / count) * (upper - lower), classIndex: i };
		}
	}
	const last = classes.length - 1;
	return { value: classes[last].upper, classIndex: last };
}

function checkClasses(classes: readonly StatClass[]): Failure | null {
	if (classes.length > STATISTICS_LIMITS.maxValues) {
		return failure(`Trop de classes : ${classes.length} (au plus ${STATISTICS_LIMITS.maxValues}).`);
	}

	for (let i = 0; i < classes.length; i++) {
		const { lower, upper, count } = classes[i];
		if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
			return failure(`La classe n° ${i + 1} a une borne qui n'est pas un nombre fini.`);
		}
		if (lower >= upper) {
			return failure(
				`La classe n° ${i + 1} ${interval(classes[i])} doit avoir une borne gauche inférieure à sa borne droite.`
			);
		}
		if (!Number.isFinite(count) || count < 0) {
			return failure(
				`L'effectif de la classe n° ${i + 1} doit être un nombre positif ou nul (reçu : ${formatForMessage(count)}).`
			);
		}
		if (i > 0 && classes[i - 1].upper !== lower) {
			return failure(
				`Les classes ${interval(classes[i - 1])} et ${interval(classes[i])} ne se suivent pas : la seconde doit commencer où la première finit.`
			);
		}
	}
	return null;
}

function interval({ lower, upper }: StatClass): string {
	return `[${formatForMessage(lower)} ; ${formatForMessage(upper)}[`;
}
