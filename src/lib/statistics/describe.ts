/**
 * Statistiques — indicateurs d'une série brute ou à effectifs
 *
 * **La** source de calcul des indicateurs : l'atelier (vue Données), le moteur
 * (`.stats`) et les blocs ubumark l'appellent. Pas de seconde implémentation
 * ailleurs (chantier outils statistiques, 2026-10-01).
 *
 * ⚠️ **Aucun import `$lib`** dans `src/lib/statistics/` : `mathAST` l'importe
 * par un chemin relatif, et `pnpm math` le fait tourner sous `tsx`, sans alias.
 *
 * ⚠️ **Variance de POPULATION** : divisée par l'effectif total, pas par
 * `n − 1`. C'est la variance descriptive du programme français, celle de la
 * touche σₓ d'une calculatrice — tranché par David le 2026-09-16. Le moteur
 * (`.stats`) rend la même, puisqu'il appelle ce module.
 *
 * ⚠️ **Quartiles et déciles du programme de 2de** (tranché le 2026-10-01) :
 * Q1 est la plus petite valeur telle qu'au moins 25 % des données lui soient
 * inférieures ou égales ; Q3 à 75 %, D1 à 10 %, D9 à 90 %. Ce n'est PAS la
 * méthode des calculatrices TI / Casio (médiane de chaque moitié) : sur
 * `3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21`, le programme donne Q1 = 7, la
 * calculatrice 6. La médiane garde sa définition usuelle et n'est jamais
 * appelée « Q2 » : les deux peuvent différer.
 *
 * @module statistics/describe
 */

import { STATISTICS_LIMITS } from './limits';
import { failure, formatForMessage, success, type Failure, type Outcome } from './outcome';

// =============================================================================
// Types
// =============================================================================

/** Ce qu'on sait dire d'une série de nombres. */
export interface Description {
	/** Effectif total (somme des effectifs pour une série à effectifs). */
	readonly count: number;
	readonly mean: number;
	readonly median: number;
	readonly min: number;
	readonly max: number;
	/** `max - min`. Absente de `.stats`, promise par le §4 N2. */
	readonly range: number;
	readonly variance: number;
	readonly deviation: number;
}

/** La description, plus les indicateurs de position du programme. */
export interface Summary extends Description {
	readonly q1: number;
	readonly q3: number;
	/** Écart interquartile `Q3 − Q1`. */
	readonly iqr: number;
	readonly d1: number;
	readonly d9: number;
}

/** Une ligne d'un tableau d'effectifs, triée par valeur croissante. */
export interface FrequencyRow {
	readonly value: number;
	readonly count: number;
	readonly frequency: number;
	readonly cumulativeCount: number;
	/** Fréquence cumulée croissante : part des données ≤ `value`. */
	readonly cumulativeFrequency: number;
	/** Fréquence cumulée décroissante : part des données ≥ `value`. */
	readonly decreasingCumulativeFrequency: number;
}

export interface FrequencyTable {
	readonly rows: readonly FrequencyRow[];
	readonly summary: Summary;
}

// =============================================================================
// Constantes
// =============================================================================

/**
 * Tolérance relative des comparaisons de cumuls. Des effectifs entiers
 * tombent juste ; des pourcentages saisis (`33,3 ; 33,3 ; 33,4`) non.
 */
const CUMULATIVE_TOLERANCE = 1e-12;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Décrire une série brute.
 *
 * @returns `null` pour une série vide — une absence, pas une erreur (§4 L2) —
 *   ou pour une série invalide (valeur non finie, trop de valeurs).
 */
export function describeList(values: readonly number[]): Summary | null {
	const outcome = summarizeList(values);
	return outcome?.ok ? outcome.value : null;
}

/**
 * Indicateurs d'une série brute.
 *
 * @returns `null` pour une série vide ; un échec situé pour une valeur non
 *   finie ou un dépassement de `STATISTICS_LIMITS`.
 */
export function summarizeList(values: readonly number[]): Outcome<Summary> | null {
	if (values.length === 0) return null;
	const tooMany = checkSize(values.length);
	if (tooMany) return tooMany;
	const invalid = checkValues(values);
	if (invalid) return invalid;

	return success(
		summarizeWeighted(
			values,
			values.map(() => 1)
		)
	);
}

/**
 * Tableau d'effectifs et indicateurs d'une série à effectifs.
 *
 * Les effectifs peuvent être des pourcentages : seules leurs proportions
 * comptent. Vérifier qu'ils sont entiers, ou qu'on n'a pas mélangé effectifs
 * et pourcentages, revient au parseur du bloc, pas à ce module.
 *
 * @returns `null` pour une table vide ; un échec situé sinon.
 */
export function summarizeTable(
	values: readonly number[],
	counts: readonly number[]
): Outcome<FrequencyTable> | null {
	if (values.length === 0 && counts.length === 0) return null;
	if (values.length !== counts.length) {
		return failure(
			`${values.length} valeur(s) pour ${counts.length} effectif(s) : il en faut autant.`
		);
	}
	const tooMany = checkSize(values.length);
	if (tooMany) return tooMany;
	const invalid = checkValues(values) ?? checkCounts(counts);
	if (invalid) return invalid;

	const total = sumInOrder(counts);
	if (total === 0) return failure('Effectif total nul : aucune donnée à décrire.');

	return success({
		rows: frequencyRows(values, counts, total),
		summary: summarizeWeighted(values, counts)
	});
}

/** Plafond de `STATISTICS_LIMITS`. */
function checkSize(size: number): Failure | null {
	if (size <= STATISTICS_LIMITS.maxValues) return null;
	return failure(`Trop de valeurs : ${size} (au plus ${STATISTICS_LIMITS.maxValues}).`);
}

function checkValues(values: readonly number[]): Failure | null {
	const index = values.findIndex((value) => !Number.isFinite(value));
	if (index === -1) return null;
	return failure(`La valeur n° ${index + 1} n'est pas un nombre fini.`);
}

function checkCounts(counts: readonly number[]): Failure | null {
	const index = counts.findIndex((count) => !Number.isFinite(count) || count < 0);
	if (index === -1) return null;
	return failure(
		`L'effectif n° ${index + 1} doit être un nombre positif ou nul (reçu : ${formatForMessage(counts[index])}).`
	);
}

/**
 * Le calcul, commun aux séries brutes (effectifs tous égaux à 1) et à
 * effectifs.
 *
 * ⚠️ Les sommes sont faites **dans l'ordre de saisie** : pour une série brute,
 * `1 × v` vaut exactement `v`, et l'on retrouve au bit près les nombres que
 * rendaient `describeList` et `.stats` avant ce module.
 *
 * Préconditions : valeurs et effectifs finis, effectifs ≥ 0, total > 0.
 */
function summarizeWeighted(values: readonly number[], weights: readonly number[]): Summary {
	const total = sumInOrder(weights);

	let weightedSum = 0;
	for (let i = 0; i < values.length; i++) weightedSum += weights[i] * values[i];
	const mean = weightedSum / total;

	// Seules les valeurs d'effectif non nul font partie de la série
	const sorted = sortedEntries(values, weights).filter((entry) => entry.weight > 0);
	const min = sorted[0].value;
	const max = sorted[sorted.length - 1].value;

	// Série constante : la moyenne flottante peut différer des valeurs
	// (0,1 ; 0,1 ; 0,1 → 0,10000000000000002) et laisser une variance de
	// 1e-34 qui s'afficherait. La dispersion d'une série constante est nulle.
	let variance = 0;
	if (min !== max) {
		let squares = 0;
		for (let i = 0; i < values.length; i++) squares += weights[i] * (values[i] - mean) ** 2;
		variance = squares / total;
	}

	const q1 = quantile(sorted, total, 25);
	const q3 = quantile(sorted, total, 75);

	return {
		count: total,
		mean,
		median: median(sorted, total),
		min,
		max,
		range: max - min,
		variance,
		deviation: Math.sqrt(variance),
		q1,
		q3,
		iqr: q3 - q1,
		d1: quantile(sorted, total, 10),
		d9: quantile(sorted, total, 90)
	};
}

interface Entry {
	readonly value: number;
	readonly weight: number;
}

/** Couples (valeur, effectif) triés par valeur ; tri stable. */
function sortedEntries(values: readonly number[], weights: readonly number[]): Entry[] {
	return values
		.map((value, i) => ({ value, weight: weights[i] }))
		.sort((a, b) => a.value - b.value);
}

/**
 * Quantile du programme : la plus petite valeur dont la fréquence cumulée
 * atteint `percent` %. Pour une série brute de `n` valeurs, c'est la valeur
 * de rang `⌈n × percent / 100⌉`.
 */
function quantile(sorted: readonly Entry[], total: number, percent: number): number {
	const target = (percent * total) / 100;
	let cumulative = 0;
	for (const entry of sorted) {
		cumulative += entry.weight;
		if (reaches(cumulative, target)) return entry.value;
	}
	return sorted[sorted.length - 1].value;
}

/**
 * Médiane usuelle : si la moitié de l'effectif est atteinte pile sur une
 * valeur, la moyenne de celle-ci et de la suivante ; sinon la première valeur
 * qui dépasse la moitié.
 */
function median(sorted: readonly Entry[], total: number): number {
	const half = total / 2;
	let cumulative = 0;
	for (let i = 0; i < sorted.length; i++) {
		cumulative += sorted[i].weight;
		if (!reaches(cumulative, half)) continue;
		const exactlyHalf = Math.abs(cumulative - half) <= CUMULATIVE_TOLERANCE * total;
		if (exactlyHalf && i + 1 < sorted.length) return (sorted[i].value + sorted[i + 1].value) / 2;
		return sorted[i].value;
	}
	return sorted[sorted.length - 1].value;
}

function reaches(cumulative: number, target: number): boolean {
	return cumulative >= target - CUMULATIVE_TOLERANCE * Math.max(target, 1);
}

function frequencyRows(
	values: readonly number[],
	counts: readonly number[],
	total: number
): FrequencyRow[] {
	let before = 0;
	return sortedEntries(values, counts).map(({ value, weight }) => {
		const cumulativeCount = before + weight;
		const row: FrequencyRow = {
			value,
			count: weight,
			frequency: weight / total,
			cumulativeCount,
			cumulativeFrequency: cumulativeCount / total,
			decreasingCumulativeFrequency: (total - before) / total
		};
		before = cumulativeCount;
		return row;
	});
}

function sumInOrder(numbers: readonly number[]): number {
	return numbers.reduce((total, value) => total + value, 0);
}
