/**
 * Pedagogical Solve — Quadratic equations
 *
 * Generates pedagogical step-by-step explanations for solving a quadratic
 * equation `ax² + bx + c = 0`. Mirrors the structure of `linear.ts` and reuses
 * the shared helpers from `_helpers.ts`.
 *
 * Per-level granularity is controlled by `STRATEGIES_QUADRATIC` (see `./types`):
 * - `lycee` : separate `discriminant-{positive,zero,negative}` step after
 *   `compute-discriminant` ; `identify-equation` step included.
 * - `superieur` : sign-declaration folded into `compute-discriminant` (the
 *   renderer reads `numericValue` to print "Δ = … > 0" inline) ; no
 *   `identify-equation` step.
 *
 * Special cases (detected and dispatched BEFORE the standard formula) :
 * - `ax² + c = 0` (b = 0) → isolate-square + extract-square-root.
 * - `ax² + bx = 0` (c = 0) → factor-common-x + zero-product.
 * - `(linear)(linear) = 0` → zero-product directly (no expansion).
 *
 * Out of scope (V1) — throws `PedagogicalQuadraticNotImplemented` :
 * - Parametric coefficients (e.g. `mx² + 2x + 1 = 0`).
 * - Any non-degree-2 polynomial in the chosen variable.
 *
 * @module mathAST/pedagogical-solve/quadratic
 */

import type { MathNode, RelationNode } from '../types';
import {
	type EquationStep,
	type EquationOperation,
	type QuadraticEquationStepsOptions,
	type QuadraticGenerationStrategy,
	STRATEGIES_QUADRATIC
} from './types';
import {
	add,
	divide,
	fraction,
	implicitMultiply,
	number,
	opposite,
	parentheses,
	power,
	relation,
	sqrt as sqrtNode,
	subtract,
	variable as varNode
} from '../factory';
import { getVariables } from '../eval/substitute';
import { nodesEqual } from '../normal/hash';
import { detectVariable, getPolynomialDegree } from '../solve/classify';
import { extractQuadraticCoefficients } from '../solve/solvers/quadratic';
import { computeNumericValue } from '../solve/numeric-value';
import { canon, isZero, makeStep, renumberSteps } from './_helpers';

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown when the pedagogical quadratic solver hits a case outside the V1
 * scope (parametric coefficients, biquadratic, etc.). Catch-and-fallback
 * happens in `correction-generator.ts` (Phase 6).
 */
export class PedagogicalQuadraticNotImplemented extends Error {
	constructor(public readonly reason: string) {
		super(
			`Pedagogical quadratic solver not yet implemented: ${reason}. ` +
				`See docs/wip/quadratic-stepper-progress.md for the V1 scope.`
		);
		this.name = 'PedagogicalQuadraticNotImplemented';
	}
}

// =============================================================================
// Detection
// =============================================================================

interface DetectedStandard {
	readonly kind: 'standard';
	readonly a: MathNode;
	readonly b: MathNode;
	readonly c: MathNode;
	readonly needsStandardize: boolean;
	readonly standardForm: MathNode;
}
interface DetectedBZero {
	readonly kind: 'b-zero';
	readonly a: MathNode;
	readonly c: MathNode;
	readonly needsStandardize: boolean;
	readonly standardForm: MathNode;
}
interface DetectedCZero {
	readonly kind: 'c-zero';
	readonly a: MathNode;
	readonly b: MathNode;
	readonly needsStandardize: boolean;
	readonly standardForm: MathNode;
}
interface DetectedFactored {
	readonly kind: 'factored';
	readonly factors: readonly MathNode[];
}
type DetectedCase = DetectedStandard | DetectedBZero | DetectedCZero | DetectedFactored;

/** Strip a top-level `delimiter` wrapper (e.g. parentheses) for structural inspection. */
function unwrap(node: MathNode): MathNode {
	return node.type === 'delimiter' ? node.content : node;
}

/**
 * Detect the already-factored form `(linear)(linear) = 0` BEFORE any
 * standardization. Returns the two factors (un-wrapped) when the input is in
 * that form, `null` otherwise.
 */
function tryDetectFactored(left: MathNode, variable: string): readonly MathNode[] | null {
	const top = unwrap(left);
	if (top.type !== 'multiplication') return null;
	const lf = unwrap(top.left);
	const rf = unwrap(top.right);
	const ld = getPolynomialDegree(lf, variable);
	const rd = getPolynomialDegree(rf, variable);
	if (ld !== 1 || rd !== 1) return null;
	return [lf, rf];
}

/** True when a coefficient contains no variable other than the implicit unknown. */
function isConstantCoefficient(coeff: MathNode): boolean {
	return getVariables(coeff).size === 0;
}

/**
 * Negate a node, eliminating a redundant `opposite(opposite(x))` chain to
 * avoid the `--N` LaTeX output (V1.1-D). Used for the formula's `-b` term in
 * `apply-quadratic-formula` so the rawSolutions display
 * `(5 − √Δ) / 2a` instead of `(--5 − √Δ) / 2a` when `b = -5`.
 *
 * Distinct from `canon(opposite(node))` which would over-simplify the
 * surrounding fraction structure. We only collapse the unary chain.
 */
function smartNegate(node: MathNode): MathNode {
	if (node.type === 'opposite') return node.operand;
	return opposite(node);
}

/**
 * Convert a (possibly negative) integer to a `MathNode` factory output. The
 * factory rejects signed numeric literals, so negatives are wrapped in
 * `opposite(...)`.
 */
function intToNode(n: number): MathNode {
	if (n < 0) return opposite(number(Math.abs(n).toString()));
	return number(n.toString());
}

/** Euclidean GCD on non-negative integers. `gcd(n, 0) = n` by convention. */
function gcdInteger(a: number, b: number): number {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y !== 0) {
		const r = x % y;
		x = y;
		y = r;
	}
	return x;
}

/**
 * V1.1-C — Detect a non-trivial GCD across integer coefficients `(a, b, c)`.
 * Returns the simplified coefficients and the simplified standard-form
 * polynomial (computed via `canon(standardForm / gcd)`), or `null` when
 * the GCD is 1 or the coefficients are not all integers.
 */
function tryExtractGcd(
	a: MathNode,
	b: MathNode,
	c: MathNode,
	standardForm: MathNode
): {
	readonly gcd: MathNode;
	readonly aSimp: MathNode;
	readonly bSimp: MathNode;
	readonly cSimp: MathNode;
	readonly simplifiedLeft: MathNode;
} | null {
	const aN = computeNumericValue(a);
	const bN = computeNumericValue(b);
	const cN = computeNumericValue(c);
	if (aN === null || bN === null || cN === null) return null;
	if (!Number.isInteger(aN) || !Number.isInteger(bN) || !Number.isInteger(cN)) return null;

	const g = gcdInteger(gcdInteger(aN, bN), cN);
	if (g <= 1) return null;

	const gcdNode = number(g.toString());
	return {
		gcd: gcdNode,
		aSimp: intToNode(aN / g),
		bSimp: intToNode(bN / g),
		cSimp: intToNode(cN / g),
		simplifiedLeft: canon(divide(standardForm, gcdNode, 'fraction'))
	};
}

/**
 * Build the optional `factor-gcd` step at the top of a non-factored case
 * pipeline. Returns the new `(a, b, c, current)` if the simplification
 * fired, or `null` to indicate "no GCD step emitted".
 */
function buildFactorGcdStep(
	current: RelationNode,
	a: MathNode,
	b: MathNode,
	c: MathNode,
	standardForm: MathNode,
	idGen: () => number
): {
	readonly step: EquationStep;
	readonly after: RelationNode;
	readonly aSimp: MathNode;
	readonly bSimp: MathNode;
	readonly cSimp: MathNode;
} | null {
	const info = tryExtractGcd(a, b, c, standardForm);
	if (info === null) return null;
	const after = relation('=', info.simplifiedLeft, number('0'));
	const step = makeStep({
		id: idGen(),
		rule: 'factor-gcd',
		description: `On simplifie en divisant les deux membres par ${(info.gcd as { value: string }).value} (PGCD)`,
		before: current,
		after,
		operation: { kind: 'factor-gcd', gcd: info.gcd, simplified: info.simplifiedLeft }
	});
	return { step, after, aSimp: info.aSimp, bSimp: info.bSimp, cSimp: info.cSimp };
}

/**
 * Dispatch the input equation to one of the four supported cases.
 * Throws `PedagogicalQuadraticNotImplemented` for parametric coefficients or
 * extraction failures, and a plain `Error` for non-degree-2 polynomials.
 */
function detectCase(equation: RelationNode, variable: string): DetectedCase {
	// Already-factored form is recognised BEFORE any standardisation, so the
	// pedagogical narrative skips the expand/standardize step.
	if (isZero(equation.right)) {
		const factored = tryDetectFactored(equation.left, variable);
		if (factored !== null) {
			return { kind: 'factored', factors: factored };
		}
	}

	const needsStandardize = !isZero(equation.right);
	const standardForm = needsStandardize
		? canon(subtract(equation.left, equation.right))
		: canon(equation.left);

	const degree = getPolynomialDegree(standardForm, variable);
	if (degree !== 2) {
		throw new Error(
			`generateQuadraticEquationSteps: equation is not quadratic in '${variable}' (degree=${degree}).`
		);
	}

	const coeffs = extractQuadraticCoefficients(standardForm, variable);
	if (!coeffs) {
		throw new PedagogicalQuadraticNotImplemented(
			'cannot extract a, b, c (likely parametric or unusual structure)'
		);
	}

	if (
		!isConstantCoefficient(coeffs.a) ||
		!isConstantCoefficient(coeffs.b) ||
		!isConstantCoefficient(coeffs.c)
	) {
		throw new PedagogicalQuadraticNotImplemented(
			'parametric coefficients (V1 supports only numeric coefficients)'
		);
	}

	if (isZero(coeffs.a)) {
		throw new Error(
			'generateQuadraticEquationSteps: coefficient of x² is zero — equation is not actually quadratic.'
		);
	}

	const bIsZero = isZero(coeffs.b);
	const cIsZero = isZero(coeffs.c);

	if (bIsZero && !cIsZero) {
		return { kind: 'b-zero', a: coeffs.a, c: coeffs.c, needsStandardize, standardForm };
	}
	if (cIsZero && !bIsZero) {
		return { kind: 'c-zero', a: coeffs.a, b: coeffs.b, needsStandardize, standardForm };
	}
	if (bIsZero && cIsZero) {
		// `ax² = 0` is degenerate — pedagogically equivalent to `x² = 0` (b-zero
		// path with rhs = 0).
		return { kind: 'b-zero', a: coeffs.a, c: coeffs.c, needsStandardize, standardForm };
	}
	return {
		kind: 'standard',
		a: coeffs.a,
		b: coeffs.b,
		c: coeffs.c,
		needsStandardize,
		standardForm
	};
}

// =============================================================================
// Atomic step builders
// =============================================================================

function buildStandardizeStep(
	before: RelationNode,
	standardForm: MathNode,
	idGen: () => number
): { step: EquationStep; after: RelationNode } {
	const after = relation('=', standardForm, number('0'));
	const step = makeStep({
		id: idGen(),
		rule: 'standardize',
		description: 'On déplace tous les termes dans le membre de gauche',
		before,
		after,
		operation: { kind: 'standardize', from: 'free-form' }
	});
	return { step, after };
}

// Internal helpers exported for the inequality pipeline (palier 2b). Each
// builder takes `equation` (a RelationNode that may carry any operator) and
// produces a step whose `before`/`after` preserve that operator. The naming
// keeps the equation-only legacy spelling (no rename to avoid touching every
// caller).
export {
	buildStandardizeStep as _buildStandardizeStep,
	buildIdentifyCoefficientsStep as _buildIdentifyCoefficientsStep,
	computeDiscriminantValue as _computeDiscriminantValue,
	buildComputeDiscriminantStep as _buildComputeDiscriminantStep,
	buildDiscriminantSignStep as _buildDiscriminantSignStep,
	buildApplyQuadraticFormulaStep as _buildApplyQuadraticFormulaStep,
	buildSimplifySolutionsStep as _buildSimplifySolutionsStep,
	tryExtractGcd as _tryExtractGcd
};

function buildIdentifyEquationStep(equation: RelationNode, idGen: () => number): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'identify-equation',
		description: 'Équation du second degré',
		before: equation,
		after: equation,
		operation: { kind: 'identify-equation', equationType: 'quadratic' }
	});
}

function buildIdentifyCoefficientsStep(
	equation: RelationNode,
	a: MathNode,
	b: MathNode,
	c: MathNode,
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'identify-coefficients',
		description: 'On identifie les coefficients a, b et c',
		before: equation,
		after: equation,
		operation: { kind: 'identify-coefficients', a, b, c }
	});
}

/** Compute Δ = b² − 4ac (canonicalised) and its numeric value when available. */
function computeDiscriminantValue(
	a: MathNode,
	b: MathNode,
	c: MathNode
): { discriminant: MathNode; numericValue: number | null } {
	const bSquared = power(b, number('2'));
	const fourAC = implicitMultiply(number('4'), implicitMultiply(a, c));
	const raw = subtract(bSquared, fourAC);
	const discriminant = canon(raw);
	const numericValue = computeNumericValue(discriminant);
	return { discriminant, numericValue };
}

function buildComputeDiscriminantStep(
	equation: RelationNode,
	a: MathNode,
	b: MathNode,
	c: MathNode,
	discriminant: MathNode,
	numericValue: number | null,
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'compute-discriminant',
		description: 'On calcule le discriminant Δ = b² − 4ac',
		before: equation,
		after: equation,
		operation: {
			kind: 'compute-discriminant',
			a,
			b,
			c,
			discriminant,
			...(numericValue !== null && { numericValue })
		}
	});
}

type DiscriminantSign = 'positive' | 'zero' | 'negative';

function buildDiscriminantSignStep(
	equation: RelationNode,
	sign: DiscriminantSign,
	discriminant: MathNode,
	numericValue: number | null,
	idGen: () => number
): EquationStep {
	const description =
		sign === 'positive'
			? 'Δ > 0 : deux solutions distinctes'
			: sign === 'zero'
				? 'Δ = 0 : une solution double'
				: 'Δ < 0 : pas de solution réelle';
	const operation: EquationOperation =
		sign === 'positive'
			? {
					kind: 'discriminant-positive',
					discriminant,
					...(numericValue !== null && { numericValue })
				}
			: sign === 'zero'
				? {
						kind: 'discriminant-zero',
						discriminant,
						...(numericValue !== null && { numericValue })
					}
				: {
						kind: 'discriminant-negative',
						discriminant,
						...(numericValue !== null && { numericValue })
					};
	return makeStep({
		id: idGen(),
		rule: `discriminant-${sign}`,
		description,
		before: equation,
		after: equation,
		operation
	});
}

function buildApplyQuadraticFormulaStep(
	equation: RelationNode,
	a: MathNode,
	b: MathNode,
	discriminant: MathNode,
	formulaCase: 'two-distinct' | 'double',
	idGen: () => number
): { step: EquationStep; rawSolutions: readonly MathNode[] } {
	// `smartNegate` collapses `opposite(opposite(x))` (which arises when `b` is
	// itself an `opposite(...)` AST for a negative integer coefficient like
	// `b = -5`). Without this, `-b` renders as `--5` in the rawSolutions
	// (V1.1-D). The substituted form in `formatApplyQuadraticFormula` keeps
	// the literal `-(b_value)` for pedagogy — that path uses `op.b` directly,
	// not `negB`.
	const negB = smartNegate(b);
	const twoA = implicitMultiply(number('2'), a);

	let rawSolutions: readonly MathNode[];
	let description: string;
	if (formulaCase === 'double') {
		rawSolutions = [fraction(negB, twoA)];
		description = 'On applique la formule : x = −b / (2a)';
	} else {
		const sqrtDelta = sqrtNode(discriminant);
		rawSolutions = [
			fraction(subtract(negB, sqrtDelta), twoA),
			fraction(add(negB, sqrtDelta), twoA)
		];
		description = 'On applique la formule : x = (−b ± √Δ) / (2a)';
	}

	const step = makeStep({
		id: idGen(),
		rule: 'apply-quadratic-formula',
		description,
		before: equation,
		after: equation,
		operation: {
			kind: 'apply-quadratic-formula',
			a,
			b,
			discriminant,
			case: formulaCase,
			solutions: rawSolutions
		}
	});
	return { step, rawSolutions };
}

/**
 * Emit a `simplify-solutions` step only when canonicalisation actually changed
 * at least one solution (compared by structural AST equality via `nodesEqual`).
 * When the raw and simplified forms coincide, we return `step: null` and let
 * the next step (`read-solutions`) display the canonical solutions directly.
 */
function buildSimplifySolutionsStep(
	equation: RelationNode,
	rawSolutions: readonly MathNode[],
	idGen: () => number
): { step: EquationStep | null; simplified: readonly MathNode[] } {
	const simplified = rawSolutions.map(canon);
	// V1.1-B : structural equality via `nodesEqual` instead of `JSON.stringify`
	// (which is fragile to property-order changes in factory output).
	const allSame = rawSolutions.every((raw, i) => nodesEqual(raw, simplified[i]));
	if (allSame) return { step: null, simplified };
	const step = makeStep({
		id: idGen(),
		rule: 'simplify-solutions',
		description: 'On simplifie les solutions',
		before: equation,
		after: equation,
		operation: {
			kind: 'simplify-solutions',
			rawSolutions,
			solutions: simplified
		}
	});
	return { step, simplified };
}

function buildReadSolutionsStep(
	equation: RelationNode,
	variable: string,
	solutions: readonly MathNode[],
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'read-solutions',
		description: 'On conclut sur l’ensemble des solutions',
		before: equation,
		after: equation,
		operation: { kind: 'read-solutions', variable, solutions },
		verbosityLevel: 'summarized'
	});
}

function buildNoRealSolutionStep(equation: RelationNode, idGen: () => number): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'no-real-solution',
		description: 'L’équation n’a pas de solution réelle',
		before: equation,
		after: equation,
		operation: { kind: 'no-real-solution' },
		verbosityLevel: 'summarized'
	});
}

// =============================================================================
// Per-case builders
// =============================================================================

function buildStandardCaseSteps(
	equation: RelationNode,
	detected: DetectedStandard,
	strategy: QuadraticGenerationStrategy,
	variable: string,
	idGen: () => number
): readonly EquationStep[] {
	const steps: EquationStep[] = [];
	let current = equation;
	let { a, b, c } = detected;
	let standardForm = detected.standardForm;

	if (detected.needsStandardize) {
		const { step, after } = buildStandardizeStep(current, standardForm, idGen);
		steps.push(step);
		current = after;
	}

	// V1.1-C : optional GCD simplification before identify-coefficients.
	const gcd = buildFactorGcdStep(current, a, b, c, standardForm, idGen);
	if (gcd !== null) {
		steps.push(gcd.step);
		current = gcd.after;
		a = gcd.aSimp;
		b = gcd.bSimp;
		c = gcd.cSimp;
		standardForm = gcd.after.left;
	}

	steps.push(buildIdentifyCoefficientsStep(current, a, b, c, idGen));

	const { discriminant, numericValue } = computeDiscriminantValue(a, b, c);
	steps.push(buildComputeDiscriminantStep(current, a, b, c, discriminant, numericValue, idGen));

	// V1 enforces numeric coefficients (parametric coefficients throw
	// `PedagogicalQuadraticNotImplemented` at `detectCase`), so `numericValue`
	// is guaranteed non-null here in practice. The fallback below — defaulting
	// to `'positive'` when `isZero(discriminant)` is false — is a safety net
	// that would mis-handle a symbolic-but-actually-negative discriminant.
	// Acceptable for V1 ; revisit when V2 admits parametric coefficients.
	const sign: DiscriminantSign =
		numericValue !== null
			? numericValue > 0
				? 'positive'
				: numericValue === 0
					? 'zero'
					: 'negative'
			: isZero(discriminant)
				? 'zero'
				: 'positive';

	if (strategy.emitSeparateDiscriminantSign) {
		steps.push(buildDiscriminantSignStep(current, sign, discriminant, numericValue, idGen));
	}

	if (sign === 'negative') {
		steps.push(buildNoRealSolutionStep(current, idGen));
		return steps;
	}

	const formulaCase = sign === 'zero' ? 'double' : 'two-distinct';
	const { step: formulaStep, rawSolutions } = buildApplyQuadraticFormulaStep(
		current,
		a,
		b,
		discriminant,
		formulaCase,
		idGen
	);
	steps.push(formulaStep);

	const { step: simplifyStep, simplified } = buildSimplifySolutionsStep(
		current,
		rawSolutions,
		idGen
	);
	if (simplifyStep) steps.push(simplifyStep);

	steps.push(buildReadSolutionsStep(current, variable, simplified, idGen));
	return steps;
}

function buildBZeroCaseSteps(
	equation: RelationNode,
	detected: DetectedBZero,
	variable: string,
	idGen: () => number
): readonly EquationStep[] {
	const steps: EquationStep[] = [];
	let current = equation;
	let a = detected.a;
	let c = detected.c;

	if (detected.needsStandardize) {
		const { step, after } = buildStandardizeStep(current, detected.standardForm, idGen);
		steps.push(step);
		current = after;
	}

	// V1.1-C : optional GCD simplification (b is zero in this branch).
	const gcd = buildFactorGcdStep(current, a, number('0'), c, detected.standardForm, idGen);
	if (gcd !== null) {
		steps.push(gcd.step);
		current = gcd.after;
		a = gcd.aSimp;
		c = gcd.cSimp;
	}

	steps.push(
		makeStep({
			id: idGen(),
			rule: 'recognize-no-linear-term',
			description: 'Le coefficient de x est nul : on isole directement le carré',
			before: current,
			after: current,
			operation: { kind: 'recognize-no-linear-term' }
		})
	);

	// Isolate the square: x² = -c/a
	const rhs = canon(fraction(opposite(c), a));
	const isolatedEq = relation('=', power(varNode(variable), number('2')), rhs);
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'isolate-square',
			description: 'On isole le carré',
			before: current,
			after: isolatedEq,
			operation: { kind: 'isolate-square', rhs }
		})
	);
	current = isolatedEq;

	// Sign of rhs determines: positive (two solutions ±√rhs), zero (single x=0),
	// negative (no real solution).
	const rhsValue = computeNumericValue(rhs);
	const rhsSign: 'positive' | 'zero' | 'negative' =
		rhsValue !== null
			? rhsValue > 0
				? 'positive'
				: rhsValue === 0
					? 'zero'
					: 'negative'
			: isZero(rhs)
				? 'zero'
				: 'positive';

	if (rhsSign === 'negative') {
		steps.push(buildNoRealSolutionStep(current, idGen));
		return steps;
	}

	if (rhsSign === 'zero') {
		const xEqZero = relation('=', varNode(variable), number('0'));
		steps.push(
			makeStep({
				id: idGen(),
				rule: 'extract-square-root',
				description: 'On extrait la racine carrée',
				before: current,
				after: xEqZero,
				operation: { kind: 'extract-square-root', argument: rhs }
			})
		);
		steps.push(buildReadSolutionsStep(current, variable, [number('0')], idGen));
		return steps;
	}

	// rhsSign === 'positive' : x = ±√rhs
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'extract-square-root',
			description: 'On extrait la racine carrée',
			before: current,
			after: current,
			operation: { kind: 'extract-square-root', argument: rhs }
		})
	);

	const sqrtRhs = canon(sqrtNode(rhs));
	const negSqrtRhs = canon(opposite(sqrtRhs));
	steps.push(buildReadSolutionsStep(current, variable, [negSqrtRhs, sqrtRhs], idGen));
	return steps;
}

function buildCZeroCaseSteps(
	equation: RelationNode,
	detected: DetectedCZero,
	variable: string,
	idGen: () => number
): readonly EquationStep[] {
	const steps: EquationStep[] = [];
	let current = equation;
	let a = detected.a;
	let b = detected.b;

	if (detected.needsStandardize) {
		const { step, after } = buildStandardizeStep(current, detected.standardForm, idGen);
		steps.push(step);
		current = after;
	}

	// V1.1-C : optional GCD simplification (c is zero in this branch).
	const gcd = buildFactorGcdStep(current, a, b, number('0'), detected.standardForm, idGen);
	if (gcd !== null) {
		steps.push(gcd.step);
		current = gcd.after;
		a = gcd.aSimp;
		b = gcd.bSimp;
	}

	steps.push(
		makeStep({
			id: idGen(),
			rule: 'recognize-no-constant-term',
			description: 'Le terme constant est nul : on factorise par x',
			before: current,
			after: current,
			operation: { kind: 'recognize-no-constant-term' }
		})
	);

	// Factor common x: ax + b
	const remainder = canon(add(implicitMultiply(a, varNode(variable)), b));
	const factoredLeft = implicitMultiply(varNode(variable), parentheses(remainder));
	const factoredEq = relation('=', factoredLeft, number('0'));
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'factor-common-x',
			description: 'On factorise par x',
			before: current,
			after: factoredEq,
			operation: { kind: 'factor-common-x', remainder }
		})
	);
	current = factoredEq;

	// zero-product
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'zero-product',
			description: 'Par la propriété du produit nul',
			before: current,
			after: current,
			operation: { kind: 'zero-product', factors: [varNode(variable), remainder] }
		})
	);

	// solve-each-factor
	const xZero = number('0');
	const otherSolution = canon(fraction(opposite(b), a));
	const pairs = [
		{ factor: varNode(variable), value: xZero },
		{ factor: remainder, value: otherSolution }
	];
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'solve-each-factor',
			description: 'On résout chaque facteur séparément',
			before: current,
			after: current,
			operation: { kind: 'solve-each-factor', pairs }
		})
	);

	steps.push(buildReadSolutionsStep(current, variable, [xZero, otherSolution], idGen));
	return steps;
}

/**
 * Extract linear coefficients `(α, β)` such that `factor = αx + β`. Reuses
 * `extractQuadraticCoefficients` and renames the relevant slots :
 * - degree-1 terms land in `coeffs.b` ⇒ α
 * - degree-0 terms land in `coeffs.c` ⇒ β
 * - degree-2 terms (which would land in `coeffs.a`) must be absent.
 *
 * Returns `null` only when the underlying extractor itself returned `null`
 * (unusual structure). The caller is responsible for ensuring the factor is
 * already known to be of degree 1 in `variable`.
 */
function extractLinearCoefficients(
	factor: MathNode,
	variable: string
): { readonly alpha: MathNode; readonly beta: MathNode } | null {
	const coeffs = extractQuadraticCoefficients(factor, variable);
	if (!coeffs) return null;
	return { alpha: coeffs.b, beta: coeffs.c };
}

/**
 * Solve a linear factor `αx + β = 0` ⇒ `x = −β/α`.
 *
 * Pre-condition : `factor` must be of degree 1 in `variable` — guaranteed by
 * `tryDetectFactored` upstream. A failure here therefore signals a programming
 * error (caller violated the precondition), not a user-facing limitation, so
 * we throw a plain `Error` rather than `PedagogicalQuadraticNotImplemented`.
 */
function solveLinearFactor(factor: MathNode, variable: string): MathNode {
	const linear = extractLinearCoefficients(factor, variable);
	if (!linear) {
		throw new Error(
			`solveLinearFactor: cannot extract linear coefficients (caller must guarantee degree 1 in '${variable}')`
		);
	}
	if (isZero(linear.alpha)) {
		throw new Error(
			`solveLinearFactor: zero leading coefficient — caller passed a constant factor`
		);
	}
	return canon(fraction(opposite(linear.beta), linear.alpha));
}

function buildFactoredCaseSteps(
	equation: RelationNode,
	detected: DetectedFactored,
	variable: string,
	idGen: () => number
): readonly EquationStep[] {
	const steps: EquationStep[] = [];

	steps.push(
		makeStep({
			id: idGen(),
			rule: 'recognize-factored',
			description: 'L’équation est déjà sous forme factorisée',
			before: equation,
			after: equation,
			operation: { kind: 'recognize-factored', factors: detected.factors }
		})
	);

	steps.push(
		makeStep({
			id: idGen(),
			rule: 'zero-product',
			description: 'Par la propriété du produit nul, chaque facteur est nul',
			before: equation,
			after: equation,
			operation: { kind: 'zero-product', factors: detected.factors }
		})
	);

	const pairs = detected.factors.map((factor) => ({
		factor,
		value: solveLinearFactor(factor, variable)
	}));
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'solve-each-factor',
			description: 'On résout chaque facteur séparément',
			before: equation,
			after: equation,
			operation: { kind: 'solve-each-factor', pairs }
		})
	);

	const solutions = pairs.map((p) => p.value);
	steps.push(buildReadSolutionsStep(equation, variable, solutions, idGen));
	return steps;
}

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Generate pedagogical steps for solving a quadratic equation.
 *
 * @throws if the equation is not second-degree in the chosen variable.
 * @throws `PedagogicalQuadraticNotImplemented` for parametric coefficients
 *   or unusual structures outside the V1 scope.
 */
export function generateQuadraticEquationSteps(
	equation: RelationNode,
	options: QuadraticEquationStepsOptions
): readonly EquationStep[] {
	const { level, variable: varOpt } = options;
	const strategy: QuadraticGenerationStrategy = STRATEGIES_QUADRATIC[level];

	const variable = varOpt ?? detectVariable(equation);
	if (variable === null) {
		throw new Error('generateQuadraticEquationSteps: cannot detect a single variable');
	}

	const detected = detectCase(equation, variable);

	let nextId = 1;
	const idGen = () => nextId++;

	const result: EquationStep[] = [];
	if (strategy.includeIdentify) {
		result.push(buildIdentifyEquationStep(equation, idGen));
	}

	switch (detected.kind) {
		case 'factored':
			result.push(...buildFactoredCaseSteps(equation, detected, variable, idGen));
			break;
		case 'b-zero':
			result.push(...buildBZeroCaseSteps(equation, detected, variable, idGen));
			break;
		case 'c-zero':
			result.push(...buildCZeroCaseSteps(equation, detected, variable, idGen));
			break;
		case 'standard':
			result.push(...buildStandardCaseSteps(equation, detected, strategy, variable, idGen));
			break;
	}

	return renumberSteps(result);
}
