/**
 * Dénominateur trinôme NON factorisé (x² − 4x + 3, 2x² − 2, x² − a²) :
 * factorisation par les racines, puis décomposition en éléments simples.
 *
 * - racines rationnelles (Δ carré parfait) : le dénominateur est réécrit
 *   a(x − r₁)(x − r₂) ou a(x − r)², puis confié à la décomposition existante ;
 * - racines littérales simples (x² − t², t² − x²) : formule des résidus
 *   F = Σ N(rᵢ)/D′(rᵢ) · ln|x − rᵢ| (racines simples) ;
 * - Δ < 0 (décision de David du 2026-10-08) : αx + β = (α/2a)·D′ + k, d'où
 *   (α/2a)·ln|D| + k·∫1/D, et D = a((x + p)² + q²) donne
 *   ∫1/D = arctan((x + p)/q)/(a q). Le |·| de ln|D| est ôté en fin
 *   d'intégration quand D > 0 sur ℝ (a > 0) ; racines irrationnelles : refus
 *   (non traité).
 *
 * Convention sur les paramètres littéraux (la même que 1/(x² + a²) →
 * arctan(x/a)/a et que aˣ → aˣ / ln a dans basic.ts) : ils sont supposés
 * GÉNÉRIQUES — a ≠ 0 dans x² − a² (sinon racine double, 1/x²), a ≠ b pour
 * deux racines littérales (sinon racine double), base a > 0 et a ≠ 1. Le
 * cas particulier n'est pas détecté : c'est le cas générique qui est traité.
 *
 * @module mathAST/integration/integrators/quadratic-denominator
 */

import type { MathNode } from '../../types';
import type { Rational } from '../../normal/types';
import { isNumber } from '../../guards';
import { containsVariable } from '../rules';
import { normalize, denormalize } from '../../normal';
import {
	number,
	variable as variableNode,
	add,
	subtract,
	divide,
	multiply,
	opposite,
	power,
	func
} from '../../factory';
import { extractExactRational, rationalToNode } from '../../common/numeric';
import {
	rational,
	mulRational,
	subRational,
	divRational,
	negRational,
	addRational
} from '../../normal/rational';
import { extractQuadraticCoefficients } from '../../solve/solvers/quadratic';
import { differentiate } from '../../differentiation';
import { substitute } from '../../eval/substitute';
import { lnAbsRule } from '../rules';

// =============================================================================
// Types
// =============================================================================

export type QuadraticFactorization =
	| {
			readonly kind: 'negative-discriminant';
			readonly a: Rational;
			readonly b: Rational;
			/** −Δ = 4ac − b² > 0 */
			readonly minusDelta: Rational;
	  }
	| {
			readonly kind: 'rational-roots';
			readonly leading: Rational;
			/** Une racine = racine double */
			readonly roots: readonly Rational[];
	  }
	| { readonly kind: 'literal-roots'; readonly roots: readonly [MathNode, MathNode] };

// =============================================================================
// Outils
// =============================================================================

function bigintSqrt(value: bigint): bigint | null {
	if (value < 0n) return null;
	const root = BigInt(Math.round(Math.sqrt(Number(value))));
	for (const candidate of [root - 1n, root, root + 1n]) {
		if (candidate >= 0n && candidate * candidate === value) return candidate;
	}
	return null;
}

/** √r si r est le carré d'un rationnel */
function rationalSqrt(r: Rational): Rational | null {
	const n = bigintSqrt(r.n);
	const d = bigintSqrt(r.d);
	return n === null || d === null ? null : rational(n, d);
}

function isSign(r: Rational): -1 | 0 | 1 {
	return r.n === 0n ? 0 : r.n > 0n ? 1 : -1;
}

/** t si `node` = t² (t sans la variable), à un signe près rendu à part */
function squareRoot(
	node: MathNode
): { readonly root: MathNode; readonly negative: boolean } | null {
	const negative = node.type === 'opposite';
	const inner = negative ? node.operand : node;
	if (
		inner.type === 'superscript' &&
		isNumber(inner.superscript) &&
		inner.superscript.value === '2'
	) {
		return { root: inner.base, negative };
	}
	return null;
}

/** x − r (x + |r| si r < 0, x si r = 0) */
export function linearFactor(variable: string, root: Rational): MathNode {
	const x = variableNode(variable);
	const sign = isSign(root);
	if (sign === 0) return x;
	return sign > 0 ? subtract(x, rationalToNode(root)) : add(x, rationalToNode(negRational(root)));
}

// =============================================================================
// Factorisation
// =============================================================================

/** Factorisation d'un trinôme ax² + bx + c en `variable`, ou null */
export function factorQuadratic(
	denominator: MathNode,
	variable: string
): QuadraticFactorization | null {
	const coefficients = extractQuadraticCoefficients(denominator, variable);
	if (coefficients === null) return null;
	const a = extractExactRational(coefficients.a);
	const b = extractExactRational(coefficients.b);
	if (a === null || a.n === 0n || b === null) return null;
	const c = extractExactRational(coefficients.c);

	if (c !== null) {
		// Δ = b² − 4ac ; racines (−b ± √Δ) / 2a
		const delta = subRational(mulRational(b, b), mulRational(rational(4n, 1n), mulRational(a, c)));
		if (isSign(delta) < 0) {
			return { kind: 'negative-discriminant', a, b, minusDelta: negRational(delta) };
		}
		const sqrtDelta = rationalSqrt(delta);
		if (sqrtDelta === null) return null;
		const twoA = mulRational(rational(2n, 1n), a);
		const minusB = negRational(b);
		if (isSign(delta) === 0) {
			return { kind: 'rational-roots', leading: a, roots: [divRational(minusB, twoA)] };
		}
		return {
			kind: 'rational-roots',
			leading: a,
			roots: [
				divRational(subRational(minusB, sqrtDelta), twoA),
				divRational(addRational(minusB, sqrtDelta), twoA)
			]
		};
	}

	// ax² − t² (a > 0) ou −ax² + t² : racines ±t/√|a|
	if (b.n !== 0n) return null;
	const square = squareRoot(coefficients.c);
	if (square === null || square.negative !== isSign(a) > 0) return null;
	const scale = rationalSqrt(isSign(a) > 0 ? a : negRational(a));
	if (scale === null) return null;
	const t =
		scale.n === 1n && scale.d === 1n
			? square.root
			: divide(square.root, rationalToNode(scale), 'fraction');
	return { kind: 'literal-roots', roots: [t, opposite(t)] };
}

/** a(x − r₁)(x − r₂) ou a(x − r)² */
export function factoredDenominator(
	variable: string,
	leading: Rational,
	roots: readonly Rational[]
): MathNode {
	const product =
		roots.length === 1
			? power(linearFactor(variable, roots[0]), number('2'))
			: multiply(linearFactor(variable, roots[0]), linearFactor(variable, roots[1]), 'implicit');
	return leading.n === 1n && leading.d === 1n
		? product
		: multiply(rationalToNode(leading), product, 'implicit');
}

// =============================================================================
// Formule des résidus (racines simples)
// =============================================================================

/**
 * ∫ N/D = Σ N(rᵢ)/D′(rᵢ) · ln|x − rᵢ| pour D à racines SIMPLES rᵢ et
 * deg N < deg D. Rend null si D′(rᵢ) ne se calcule pas.
 */
export function residueAntiderivative(
	numerator: MathNode,
	denominator: MathNode,
	roots: readonly MathNode[],
	variable: string
): MathNode | null {
	let derivative: MathNode;
	try {
		derivative = differentiate(denominator, { variable });
	} catch {
		return null;
	}
	const terms = roots.map((root) => {
		const at = (node: MathNode): MathNode =>
			substitute(node, { [variable]: root }, { maxIterations: 1 });
		const coefficient = divide(at(numerator), at(derivative), 'fraction');
		return multiply(coefficient, lnAbsRule(subtract(variableNode(variable), root)), 'implicit');
	});
	return terms.slice(1).reduce<MathNode>((acc, term) => add(acc, term), terms[0]);
}

// =============================================================================
// Discriminant négatif : ln + arctan
// =============================================================================

/** Valeur rationnelle exacte de `node` (après normalisation), ou null */
function exactValue(node: MathNode): Rational | null {
	try {
		return extractExactRational(denormalize(normalize(node)));
	} catch {
		return null;
	}
}

/** c · node, sans facteur 1 ni 0 (null pour c = 0) */
function scaled(coefficient: Rational, node: MathNode): MathNode | null {
	if (coefficient.n === 0n) return null;
	if (coefficient.n === coefficient.d) return node;
	if (coefficient.n === -coefficient.d) return opposite(node);
	return multiply(rationalToNode(coefficient), node, 'implicit');
}

/**
 * ∫ (αx + β)/D avec D = ax² + bx + c de discriminant Δ < 0 :
 * (α/2a)·ln|D| + (2k·sgn(a)/s)·arctan((2|a|x + sgn(a)·b)/s), où
 * k = β − αb/(2a) et s = √(−Δ). Rend null si le numérateur n'est pas affine
 * à coefficients rationnels.
 */
export function negativeDiscriminantAntiderivative(
	numerator: MathNode,
	denominator: MathNode,
	factorization: Extract<QuadraticFactorization, { kind: 'negative-discriminant' }>,
	variable: string
): MathNode | null {
	let slope: MathNode;
	try {
		slope = differentiate(numerator, { variable });
	} catch {
		return null;
	}
	if (containsVariable(slope, variable)) return null;
	const alpha = exactValue(slope);
	const beta = exactValue(substitute(numerator, { [variable]: number('0') }, { maxIterations: 1 }));
	if (alpha === null || beta === null) return null;

	const { a, b, minusDelta } = factorization;
	const twoA = mulRational(rational(2n, 1n), a);
	const k = subRational(beta, divRational(mulRational(alpha, b), twoA));
	const positiveA = isSign(a) > 0;

	const lnTerm = scaled(divRational(alpha, twoA), lnAbsRule(denominator));

	let arctanTerm: MathNode | null = null;
	if (k.n !== 0n) {
		// s = √(−Δ) : rationnel si −Δ est un carré, sinon √(−Δ)
		const exactS = rationalSqrt(minusDelta);
		const sNode =
			exactS !== null ? rationalToNode(exactS) : func('sqrt', [rationalToNode(minusDelta)]);
		const absA = positiveA ? a : negRational(a);
		const shift = positiveA ? b : negRational(b);
		const x = variableNode(variable);
		const twoAbsA = mulRational(rational(2n, 1n), absA);
		const linear = twoAbsA.n === twoAbsA.d ? x : multiply(rationalToNode(twoAbsA), x, 'implicit');
		const affine =
			isSign(shift) === 0
				? linear
				: isSign(shift) > 0
					? add(linear, rationalToNode(shift))
					: subtract(linear, rationalToNode(negRational(shift)));
		const numeratorCoefficient = mulRational(rational(positiveA ? 2n : -2n, 1n), k);
		const argument = divide(affine, sNode, 'fraction');
		const coefficient =
			exactS !== null
				? rationalToNode(divRational(numeratorCoefficient, exactS))
				: divide(rationalToNode(numeratorCoefficient), sNode, 'fraction');
		arctanTerm = multiply(coefficient, func('arctan', [argument]), 'implicit');
	}

	if (lnTerm === null) return arctanTerm;
	return arctanTerm === null ? lnTerm : add(lnTerm, arctanTerm);
}
