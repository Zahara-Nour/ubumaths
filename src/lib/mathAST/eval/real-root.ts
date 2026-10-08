/**
 * Racine n-ième réelle, en flottant.
 *
 * Indice impair (entier) : racine définie sur ℝ, ⁿ√a = −ⁿ√|a| pour a < 0
 * (décision du 2026-10-07, #925). Indice pair ou non entier : a ≥ 0 exigé.
 * Partagé par `evaluate` (repli flottant) et la validation de domaine.
 */

import type { MathNode } from '../types';

/** Indice entier impair : la racine accepte un radicande négatif. */
export function isOddRootIndex(index: number): boolean {
	return Number.isInteger(index) && index % 2 !== 0;
}

/**
 * ⁿ√radicand sur ℝ, ou `null` hors du domaine (radicande négatif sous un
 * indice pair ou non entier, indice nul ou non fini).
 */
export function realNthRoot(radicand: number, index: number): number | null {
	if (!Number.isFinite(index) || index === 0) return null;
	if (radicand < 0 && !isOddRootIndex(index)) return null;
	const magnitude = Math.pow(Math.abs(radicand), 1 / index);
	return radicand < 0 ? -magnitude : magnitude;
}

// =============================================================================
// Puissance d'exposant rationnel de dénominateur impair (décision du 2026-10-08)
// =============================================================================

/**
 * Exposant ÉCRIT comme une fraction d'entiers `p/q` (littéraux sans virgule,
 * signe et parenthèses permis), rendu IRRÉDUCTIBLE, quand son dénominateur q
 * est impair et ≥ 3 : x^{p/q} = (ᵠ√x)^p est alors défini pour x < 0.
 *
 * `null` sinon : dénominateur pair (`1/2`, `3/4`), exposant entier (`6/3`),
 * décimal (`0.2` : convention x^a = e^{a ln x} inchangée), irrationnel ou non
 * constant.
 */
export function oddDenominatorExponent(node: MathNode): { n: bigint; d: bigint } | null {
	const value = writtenRational(node);
	return value !== null && value.d >= 3n && value.d % 2n === 1n ? value : null;
}

/**
 * Rationnel ÉCRIT avec des entiers littéraux (voir `integerFraction`), rendu
 * irréductible, dénominateur > 0 ; `null` pour un décimal, une constante
 * irrationnelle ou une expression non constante.
 */
export function writtenRational(node: MathNode): { n: bigint; d: bigint } | null {
	const value = integerFraction(node);
	if (value === null || value.d === 0n) return null;
	let n = value.n;
	let d = value.d;
	if (d < 0n) {
		n = -n;
		d = -d;
	}
	const g = gcdBigInt(n < 0n ? -n : n, d);
	if (g > 1n) {
		n /= g;
		d /= g;
	}
	return { n, d };
}

/**
 * Rationnel écrit avec des entiers littéraux : `3`, `-3`, `(3)`, `\frac{1}{3}`,
 * et leurs sommes, différences, produits — `\frac{1}{3} - 1`, exposant que
 * rend la dérivée brute de x^{1/3}. Aucun décimal.
 */
function integerFraction(node: MathNode): { n: bigint; d: bigint } | null {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication': {
			const left = integerFraction(node.left);
			const right = integerFraction(node.right);
			if (left === null || right === null) return null;
			if (node.type === 'multiplication') return { n: left.n * right.n, d: left.d * right.d };
			const sign = node.type === 'addition' ? 1n : -1n;
			return { n: left.n * right.d + sign * right.n * left.d, d: left.d * right.d };
		}
		case 'number':
			return /^\d+$/.test(node.value) ? { n: BigInt(node.value), d: 1n } : null;
		case 'delimiter':
			return integerFraction(node.content);
		case 'positive':
			return integerFraction(node.operand);
		case 'opposite': {
			const inner = integerFraction(node.operand);
			return inner === null ? null : { n: -inner.n, d: inner.d };
		}
		case 'division': {
			const num = integerFraction(node.numerator);
			const den = integerFraction(node.denominator);
			if (num === null || den === null) return null;
			return { n: num.n * den.d, d: num.d * den.n };
		}
		default:
			return null;
	}
}

function gcdBigInt(a: bigint, b: bigint): bigint {
	while (b !== 0n) [a, b] = [b, a % b];
	return a;
}

/**
 * base^{p/q} sur ℝ pour q impair : (ᵠ√base)^p ; `null` pour 0 sous un
 * exposant négatif. Pour une base ≥ 0, c'est Math.pow.
 */
export function realRationalPower(base: number, p: number, q: number): number | null {
	if (base === 0 && p < 0) return null;
	const root = realNthRoot(base, q);
	return root === null ? null : Math.pow(root, p);
}
