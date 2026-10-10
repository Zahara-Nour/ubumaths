/**
 * Racines d'indice IMPAIR (n ≥ 3) dans une primitive.
 *
 * Convention (décision du 2026-10-07) : ⁿ√a est définie sur ℝ pour n impair
 * (∛(−8) = −2), alors que la puissance `a^{p/n}` ne l'est que pour a > 0.
 * Le moteur calcule en puissances (règle de la puissance, substitution) : on
 * convertit les racines impaires en puissances À L'ENTRÉE, puis on réécrit les
 * puissances d'exposant p/n (n impair) en racines À LA SORTIE, pour que la
 * primitive soit définie là où l'intégrande l'est.
 *
 * Ces réécritures sont cohérentes : avec r = ⁿ√u (n impair), r(uᵃ) = r(u)ᵃ et
 * (rᵖ)′ = (p/n)·r^{p−n}·u′ valent pour tout u réel (u ≠ 0 si l'exposant est
 * négatif) ; les calculs formels sur les exposants restent donc justes.
 *
 * @module mathAST/integration/odd-roots
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { func, fraction, power, implicitMultiply } from '../factory';
import { extractExactRational, rationalToNode } from '../common/numeric';
import { isDelimiter, isDivision, isFunction, isNumber, isSuperscript } from '../guards';
import { findNodes, mapNode, mapNodeTopDown } from '../transforms';

// =============================================================================
// Outils
// =============================================================================

function gcd(a: bigint, b: bigint): bigint {
	let x = a < 0n ? -a : a;
	let y = b < 0n ? -b : b;
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

/** Fraction irréductible, dénominateur positif */
function reduced(r: Rational): Rational {
	const sign = r.d < 0n ? -1n : 1n;
	const g = gcd(r.n, r.d) || 1n;
	return { n: (sign * r.n) / g, d: (sign * r.d) / g };
}

/** Indice impair ≥ 3 d'une racine `\sqrt[n]{…}`, sinon null */
function oddRootIndex(node: MathNode): bigint | null {
	if (!isFunction(node) || node.name !== 'sqrt' || node.args.length !== 1 || !node.base) {
		return null;
	}
	const index = extractExactRational(node.base);
	if (index === null || index.d !== 1n) return null;
	return index.n >= 3n && index.n % 2n === 1n ? index.n : null;
}

/** u^{p/n} si `node` est une racine impaire ⁿ√(u^a) (p = a) ou ⁿ√u (p = 1) */
function oddRootAsPower(node: MathNode): { base: MathNode; exponent: Rational } | null {
	const n = oddRootIndex(node);
	if (n === null || !isFunction(node)) return null;
	const radicand = node.args[0];
	if (isSuperscript(radicand)) {
		const a = extractExactRational(radicand.superscript);
		if (a !== null) return { base: radicand.base, exponent: reduced({ n: a.n, d: a.d * n }) };
	}
	return { base: radicand, exponent: { n: 1n, d: n } };
}

// =============================================================================
// API
// =============================================================================

/** L'expression contient-elle une racine d'indice impair ≥ 3 ? */
export function containsOddRoot(expr: MathNode): boolean {
	return findNodes(expr, (node) => oddRootIndex(node) !== null).length > 0;
}

/**
 * ⁿ√(u^a) → u^{a/n}, ⁿ√u → u^{1/n}, 1/ⁿ√(u^a) → u^{−a/n} (n impair ≥ 3).
 * Les racines d'indice pair sont laissées telles quelles. Parcours descendant :
 * la division 1/ⁿ√… est vue avant que sa racine ne devienne une puissance.
 */
export function oddRootsAsPowers(expr: MathNode): MathNode {
	return mapNodeTopDown(expr, (node) => {
		if (isDivision(node) && isNumber(node.numerator) && node.numerator.value === '1') {
			const inverse = oddRootAsPower(node.denominator);
			if (inverse) {
				const { n, d } = inverse.exponent;
				return power(inverse.base, rationalToNode({ n: -n, d }));
			}
		}
		const direct = oddRootAsPower(node);
		return direct ? power(direct.base, rationalToNode(direct.exponent)) : node;
	});
}

/**
 * u^{p/n} (n impair ≥ 3, fraction irréductible) → racine définie sur ℝ :
 * p = mn + r (0 < r < n) → u^m · ⁿ√(u^r) ; p < 0 → 1 / (u^{|m|} · ⁿ√(u^r)).
 * Ex. u^{4/3} → u·∛u, u^{2/3} → ∛(u²), u^{−1/3} → 1/∛u.
 */
export function oddPowersAsRoots(expr: MathNode): MathNode {
	return mapNode(expr, (node) => {
		if (!isSuperscript(node)) return node;
		const raw = extractExactRational(node.superscript);
		if (raw === null) return node;
		const { n: p, d: n } = reduced(raw);
		if (n < 3n || n % 2n === 0n) return node;

		const magnitude = p < 0n ? -p : p;
		const whole = magnitude / n;
		const rest = magnitude % n;
		const base = node.base;
		const radicandBase = isDelimiter(base) ? base.content : base;
		const radicand = rest === 1n ? radicandBase : power(base, rationalToNode({ n: rest, d: 1n }));
		const root = func('sqrt', [radicand], { base: rationalToNode({ n, d: 1n }) });
		const factor =
			whole === 0n ? null : whole === 1n ? base : power(base, rationalToNode({ n: whole, d: 1n }));
		const positive = factor ? implicitMultiply(factor, root) : root;
		return p < 0n ? fraction(rationalToNode({ n: 1n, d: 1n }), positive) : positive;
	});
}
