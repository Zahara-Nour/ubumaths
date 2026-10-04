/**
 * Statistiques — loi binomiale B(n ; p), en valeurs EXACTES
 *
 * Manche 11 (2026-10-03, Terminale spécialité) : P(X = k), P(X ⩽ k),
 * P(k ⩽ X ⩽ k′). Avec p = a/b, toutes les probabilités ont le dénominateur
 * commun b^n : P(X = k) = C(n, k) · a^k · (b − a)^(n − k) / b^n. Le calcul se
 * fait en entiers (BigInt), et l'arrondi décimal aussi : aucun flottant, donc
 * aucun arrondi faux sur un demi (le défaut de #671).
 *
 * ⚠️ Pas d'import `$lib` dans ce module (cf. v1) : chemins relatifs.
 *
 * @module statistics/binomial
 */

import { Fraction } from './fraction';
import type { RandomVariableLaw } from './random-variable';

// =============================================================================
// Types
// =============================================================================

export interface BinomialDistribution {
	readonly n: number;
	readonly p: Fraction;
	/** Numérateurs de P(X = k), k de 0 à n, sur le dénominateur commun */
	readonly numerators: readonly bigint[];
	/** b^n */
	readonly denominator: bigint;
}

// =============================================================================
// Constantes
// =============================================================================

/** n au plus : 1 001 numérateurs d'au plus ~3 000 chiffres, calcul instantané */
export const BINOMIAL_MAX_N = 1000;

// =============================================================================
// Fonctions
// =============================================================================

/** La loi B(n ; p), exacte. `n` entier de 1 à 1 000, `p` entre 0 et 1 (vérifiés avant). */
export function binomialDistribution(n: number, p: Fraction): BinomialDistribution {
	const a = p.num;
	const b = p.den;
	const q = b - a;
	const numerators: bigint[] = [];
	// C(n, k) mis à jour de proche en proche : C(n, k + 1) = C(n, k) · (n − k) / (k + 1)
	let coefficient = 1n;
	for (let k = 0; k <= n; k++) {
		numerators.push(coefficient * a ** BigInt(k) * q ** BigInt(n - k));
		coefficient = (coefficient * BigInt(n - k)) / BigInt(k + 1);
	}
	return { n, p, numerators, denominator: b ** BigInt(n) };
}

/** P(X ∈ A) exacte, A décrit par un prédicat sur k */
export function binomialProbability(
	law: BinomialDistribution,
	contains: (k: number) => boolean
): { num: bigint; den: bigint } {
	let num = 0n;
	law.numerators.forEach((value, k) => {
		if (contains(k)) num += value;
	});
	return { num, den: law.denominator };
}

/** E(X) = np, V(X) = np(1 − p), σ : la forme du module (`formatLawIndicators`) */
export function binomialMoments(law: BinomialDistribution): RandomVariableLaw {
	const n = new Fraction(BigInt(law.n));
	const expectation = n.mul(law.p);
	const variance = expectation.mul(Fraction.ONE.sub(law.p));
	return {
		expectation,
		variance,
		deviation: Math.sqrt(variance.toNumber()),
		exactDeviation: variance.sqrt()
	};
}

/**
 * num/den (positif, au plus 1) arrondi à `places` décimales, demi vers le
 * haut, en entiers. `digits` s'écrit avec un point (`0.850`) ; `exact` : la
 * valeur tombe juste à cette précision.
 */
export function roundExact(
	num: bigint,
	den: bigint,
	places: number
): { digits: string; exact: boolean } {
	const scale = 10n ** BigInt(places);
	const scaled = num * scale;
	const quotient = scaled / den;
	const remainder = scaled % den;
	// Demi vers le haut : reste ⩾ den / 2
	const rounded = 2n * remainder >= den ? quotient + 1n : quotient;
	const text = rounded.toString().padStart(places + 1, '0');
	const digits = places === 0 ? text : `${text.slice(0, -places)}.${text.slice(-places)}`;
	return { digits, exact: remainder === 0n };
}

/** num/den ⩽ value (fractions positives), en entiers */
function atMost(num: bigint, den: bigint, value: Fraction): boolean {
	return num * value.den <= value.num * den;
}

/** num/den ⩾ value */
function atLeast(num: bigint, den: bigint, value: Fraction): boolean {
	return num * value.den >= value.num * den;
}

/**
 * Intervalle I = [a ; b] avec P(X ∈ I) ⩾ `level` (Q140) : le plus petit tel
 * que P(X < a) ⩽ α/2 et P(X > b) ⩽ α/2, α = 1 − level. Le programme n'impose
 * pas de méthode : celle-ci est écrite sous le résultat.
 */
export function binomialInterval(
	law: BinomialDistribution,
	level: Fraction
): { a: number; b: number; num: bigint; den: bigint } {
	const half = Fraction.ONE.sub(level).mul(new Fraction(1n, 2n));
	const { numerators, denominator: den } = law;
	// below[k] = P(X < k) · den ; above[k] = P(X > k) · den
	const below: bigint[] = [0n];
	for (const value of numerators) below.push(below[below.length - 1] + value);
	const total = below[below.length - 1];
	let a = 0;
	for (let k = 0; k <= law.n; k++) if (atMost(below[k], den, half)) a = k;
	let b = law.n;
	for (let k = law.n; k >= 0; k--) if (atMost(total - below[k + 1], den, half)) b = k;
	return { a, b, num: below[b + 1] - below[a], den };
}

export type ThresholdEvent = '>' | '⩾' | '<' | '⩽';

/**
 * Seuil (surréservation, programme) : le k de 0 à `last` qui vérifie
 * « P(X `event` k) `comparison` α ». Le sens découle de la MONOTONIE : une
 * probabilité qui DÉCROÎT avec k (P(X > k), P(X ⩾ k)) donne le plus petit k
 * pour ⩽, le plus grand pour ⩾ ; une probabilité qui CROÎT (P(X ⩽ k),
 * P(X < k)), l'inverse. La condition est donc monotone en k : recherche
 * dichotomique (loi géométrique : k jusqu'à 1 000, des puissances de 1 000
 * chiffres). Rend k et P, ou null si aucun ne convient.
 */
export function findThreshold(
	last: number,
	probability: (k: number) => { num: bigint; den: bigint },
	event: ThresholdEvent,
	comparison: '⩽' | '⩾',
	alpha: Fraction
): { k: number | null; smallest: boolean; num: bigint; den: bigint } {
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
	if (k === null) return { k, smallest, num: 0n, den: 1n };
	return { k, smallest, ...probability(k) };
}

/** Seuil de la loi binomiale B(n ; p) : k de 0 à n (Q140) */
export function binomialThreshold(
	law: BinomialDistribution,
	event: ThresholdEvent,
	comparison: '⩽' | '⩾',
	alpha: Fraction
): { k: number | null; smallest: boolean; num: bigint; den: bigint } {
	const { numerators, denominator: den } = law;
	const below: bigint[] = [0n];
	for (const value of numerators) below.push(below[below.length - 1] + value);
	const total = below[below.length - 1];
	const probability = (k: number) => {
		switch (event) {
			case '>':
				return { num: total - below[k + 1], den };
			case '⩾':
				return { num: total - below[k], den };
			case '<':
				return { num: below[k], den };
			case '⩽':
				return { num: below[k + 1], den };
		}
	};
	return findThreshold(law.n, probability, event, comparison, alpha);
}
