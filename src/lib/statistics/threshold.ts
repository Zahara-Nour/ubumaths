/**
 * Statistiques — seuil d'une loi (binomiale, géométrique)
 *
 * Le k qui vérifie « P(X ⋄ k) ⩽ α » ou « ⩾ α » (surréservation, Q140 ; loi
 * géométrique : manche 14), en valeurs EXACTES (entiers BigInt).
 *
 * ⚠️ Pas d'import `$lib` dans ce module (cf. v1) : chemins relatifs.
 *
 * @module statistics/threshold
 */

import type { Fraction } from './fraction';

// =============================================================================
// Types
// =============================================================================

export type ThresholdEvent = '>' | '⩾' | '<' | '⩽';

/**
 * k et P(X ⋄ k) ; k null si aucun ne convient, ou (`beyond`) si tous les k
 * cherchés conviennent et que le plus grand est au-delà de la recherche
 */
export interface ThresholdResult {
	k: number | null;
	smallest: boolean;
	num: bigint;
	den: bigint;
	beyond: boolean;
}

// =============================================================================
// Fonctions
// =============================================================================

/** num/den ⩽ value (fractions positives), en entiers */
export function atMost(num: bigint, den: bigint, value: Fraction): boolean {
	return num * value.den <= value.num * den;
}

/** num/den ⩾ value */
export function atLeast(num: bigint, den: bigint, value: Fraction): boolean {
	return num * value.den >= value.num * den;
}

/**
 * Le k de 0 à `last` qui vérifie « P(X `event` k) `comparison` α ». Le sens
 * découle de la MONOTONIE : une probabilité qui DÉCROÎT avec k (P(X > k),
 * P(X ⩾ k)) donne le plus petit k pour ⩽, le plus grand pour ⩾ ; une
 * probabilité qui CROÎT (P(X ⩽ k), P(X < k)), l'inverse. La condition est donc
 * monotone en k : recherche dichotomique (loi géométrique : k jusqu'à 1 000,
 * des puissances de 1 000 chiffres).
 *
 * `open` : le support continue après `last` (loi géométrique). Un « plus grand
 * k » vrai en `last` est alors au-delà : pas de k annoncé, `beyond` (revue).
 */
export function findThreshold(
	last: number,
	open: boolean,
	probability: (k: number) => { num: bigint; den: bigint },
	event: ThresholdEvent,
	comparison: '⩽' | '⩾',
	alpha: Fraction
): ThresholdResult {
	const decreasing = event === '>' || event === '⩾';
	const smallest = decreasing === (comparison === '⩽');
	const fits = (k: number) => {
		const { num, den } = probability(k);
		return comparison === '⩽' ? atMost(num, den, alpha) : atLeast(num, den, alpha);
	};
	let k: number | null;
	if (smallest) {
		// Faux puis vrai : le premier vrai
		let [low, high] = [0, last + 1];
		while (low < high) {
			const middle = Math.floor((low + high) / 2);
			if (fits(middle)) high = middle;
			else low = middle + 1;
		}
		k = low <= last ? low : null;
	} else {
		// Vrai puis faux : le dernier vrai
		let [low, high] = [-1, last];
		while (low < high) {
			const middle = Math.ceil((low + high) / 2);
			if (fits(middle)) low = middle;
			else high = middle - 1;
		}
		k = low >= 0 ? low : null;
	}
	if (!smallest && open && k === last) {
		return { k: null, smallest, num: 0n, den: 1n, beyond: true };
	}
	if (k === null) return { k, smallest, num: 0n, den: 1n, beyond: false };
	return { k, smallest, ...probability(k), beyond: false };
}
