/**
 * Dénominateur trinôme NON factorisé (x² − 4x + 3, 2x² − 2, x² − a²) :
 * factorisation par les racines, puis décomposition en éléments simples.
 *
 * - racines rationnelles (Δ carré parfait) : le dénominateur est réécrit à
 *   facteurs entiers k(q₁x − p₁)(q₂x − p₂) ou k(qx − p)², puis confié à la
 *   décomposition existante ;
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
import { exactRational } from '../../normal';
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
	negRational
} from '../../normal/rational';
import { extractQuadraticCoefficients } from '../../solve/solvers/quadratic';
import { integerNthRoot } from '../../normal/radical';
import { integerLinearFactorNode, quadraticRootParts, toPolynomial } from '../../factor';
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

/** √r si r est le carré d'un rationnel (racine entière exacte du noyau) */
function rationalSqrt(r: Rational): Rational | null {
	const n = r.n < 0n ? null : integerNthRoot(r.n, 2n);
	const d = integerNthRoot(r.d, 2n);
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

// =============================================================================
// Factorisation
// =============================================================================

/**
 * Factorisation d'un trinôme ax² + bx + c en `variable`, ou null. Coefficients
 * rationnels : lus et tranchés par le noyau `factor/` (ADR 0024) — écriture
 * quelconque (`x(x − 5) + 6`, `(2x − 1)(2x + 1)`), racines exactes par Δ.
 * Coefficient littéral : seul `ax² − t²` est reconnu (racines ±t/√a).
 */
export function factorQuadratic(
	denominator: MathNode,
	variable: string
): QuadraticFactorization | null {
	const poly = toPolynomial(denominator, variable);
	if (poly !== null) {
		if (poly.length !== 3) return null;
		const [c, b, a] = poly;
		const parts = quadraticRootParts(a, b, c, 0n);
		switch (parts.kind) {
			case 'none': {
				const fourAC = mulRational(rational(4n, 1n), mulRational(a, c));
				return {
					kind: 'negative-discriminant',
					a,
					b,
					minusDelta: subRational(fourAC, mulRational(b, b))
				};
			}
			case 'double':
				return { kind: 'rational-roots', leading: a, roots: [parts.root] };
			case 'rational':
				// (−b − √Δ)/2a d'abord : l'ordre des termes de la primitive en dépend
				return {
					kind: 'rational-roots',
					leading: a,
					roots: isSign(a) > 0 ? parts.roots : [parts.roots[1], parts.roots[0]]
				};
			default:
				return null; // racines irrationnelles : refus
		}
	}

	const coefficients = extractQuadraticCoefficients(denominator, variable);
	if (coefficients === null) return null;
	const a = extractExactRational(coefficients.a);
	const b = extractExactRational(coefficients.b);
	if (a === null || a.n === 0n || b === null) return null;

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

/**
 * Le dénominateur factorisé à coefficients ENTIERS (ADR 0024, décision de
 * David du 2026-10-12) : k(q₁x − p₁)(q₂x − p₂) ou k(qx − p)², rᵢ = pᵢ/qᵢ,
 * k = a/(q₁q₂) — `4x² − 1` s'écrit `(2x - 1)(2x + 1)`, `2x² − 2` s'écrit
 * `2(x - 1)(x + 1)`. La décomposition (`partial-fractions.ts`) lit ces
 * facteurs `px + q` et intègre A/(px + q) en (A/p) ln|px + q|.
 */
export function factoredDenominator(
	variable: string,
	leading: Rational,
	roots: readonly Rational[]
): MathNode {
	const product =
		roots.length === 1
			? power(integerLinearFactorNode(variable, roots[0]), number('2'))
			: multiply(
					integerLinearFactorNode(variable, roots[0]),
					integerLinearFactorNode(variable, roots[1]),
					'implicit'
				);
	// k = a / Π qᵢ^multiplicité
	const scale = roots.length === 1 ? roots[0].d * roots[0].d : roots[0].d * roots[1].d;
	const k = divRational(leading, rational(scale, 1n));
	return k.n === 1n && k.d === 1n ? product : multiply(rationalToNode(k), product, 'implicit');
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
	const alpha = exactRational(slope);
	const beta = exactRational(
		substitute(numerator, { [variable]: number('0') }, { maxIterations: 1 })
	);
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
