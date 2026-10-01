/**
 * Statistiques — tableau croisé d'effectifs
 *
 * Programme de 2de, `2-170` à `2-173` : totaux (fréquences marginales) et
 * fréquences conditionnelles, par ligne ou par colonne.
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/cross-table
 */

import { STATISTICS_LIMITS } from './limits';
import { failure, formatForMessage, success, type Outcome } from './outcome';

// =============================================================================
// Types
// =============================================================================

/** Ce que le tableau affiche dans ses cases */
export type CrossTableMode =
	| 'effectifs'
	| 'fréquences'
	| 'fréquences par ligne'
	| 'fréquences par colonne';

/**
 * Valeurs à afficher, totaux compris. En fréquences : un nombre de [0 ; 1] ;
 * `null` quand il n'est pas défini (fréquence par ligne d'une ligne toute nulle).
 */
export interface CrossTableValues {
	readonly cells: (number | null)[][];
	readonly rowTotals: (number | null)[];
	readonly columnTotals: (number | null)[];
	readonly total: number;
}

// =============================================================================
// Fonctions
// =============================================================================

/** `part / tout`, ou null si le tout est nul. */
function ratio(part: number, whole: number): number | null {
	return whole === 0 ? null : part / whole;
}

/**
 * Totaux et fréquences d'un tableau croisé.
 *
 * @param counts une ligne par modalité de la première variable, une colonne
 *   par modalité de la seconde ; effectifs (ou pourcentages) ≥ 0
 * @returns `null` sans aucune case ; un échec situé sinon.
 */
export function crossTable(
	counts: readonly (readonly number[])[],
	mode: CrossTableMode
): Outcome<CrossTableValues> | null {
	if (counts.length === 0 || counts[0].length === 0) return null;
	const width = counts[0].length;
	const ragged = counts.findIndex((row) => row.length !== width);
	if (ragged !== -1) {
		return failure(
			`La ligne n° ${ragged + 1} a ${counts[ragged].length} case(s), la première en a ${width}.`
		);
	}
	if (counts.length * width > STATISTICS_LIMITS.maxValues) {
		return failure(`Trop de cases (au plus ${STATISTICS_LIMITS.maxValues}).`);
	}
	for (let i = 0; i < counts.length; i++) {
		const j = counts[i].findIndex((count) => !Number.isFinite(count) || count < 0);
		if (j !== -1) {
			return failure(
				`La case (${i + 1} ; ${j + 1}) doit être un nombre positif ou nul (reçu : ${formatForMessage(counts[i][j])}).`
			);
		}
	}

	const rowTotals = counts.map((row) => row.reduce((sum, count) => sum + count, 0));
	const columnTotals = counts[0].map((_, j) => counts.reduce((sum, row) => sum + row[j], 0));
	const total = rowTotals.reduce((sum, count) => sum + count, 0);

	switch (mode) {
		case 'effectifs':
			return success({ cells: counts.map((row) => [...row]), rowTotals, columnTotals, total });
		case 'fréquences':
			if (total === 0) return failure('Effectif total nul : aucune fréquence à calculer.');
			return success({
				cells: counts.map((row) => row.map((count) => count / total)),
				rowTotals: rowTotals.map((count) => count / total),
				columnTotals: columnTotals.map((count) => count / total),
				total: 1
			});
		case 'fréquences par ligne':
			if (total === 0) return failure('Effectif total nul : aucune fréquence à calculer.');
			return success({
				cells: counts.map((row, i) => row.map((count) => ratio(count, rowTotals[i]))),
				rowTotals: rowTotals.map((count) => (count === 0 ? null : 1)),
				columnTotals: columnTotals.map((count) => count / total),
				total: 1
			});
		case 'fréquences par colonne':
			if (total === 0) return failure('Effectif total nul : aucune fréquence à calculer.');
			return success({
				cells: counts.map((row) => row.map((count, j) => ratio(count, columnTotals[j]))),
				rowTotals: rowTotals.map((count) => count / total),
				columnTotals: columnTotals.map((count) => (count === 0 ? null : 1)),
				total: 1
			});
	}
}
