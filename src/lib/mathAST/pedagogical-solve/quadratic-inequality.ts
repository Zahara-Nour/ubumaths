/**
 * Pedagogical Solve — Quadratic inequalities (palier 2b)
 *
 * Generates pedagogical step-by-step explanations for solving a quadratic
 * inequality `ax² + bx + c ⊻ 0` where ⊻ ∈ {<, >, ≤, ≥, ≠}. Mirrors the
 * structure of `linear-inequality.ts` but reuses the discriminant + roots
 * machinery from `quadratic.ts` (via internal exports prefixed with `_`).
 *
 * Pipeline (Δ standard path) :
 *   1. identify-equation       (kind = 'quadratic')
 *   2. standardize             (when rhs ≠ 0)
 *   3. identify-coefficients   (a, b, c)
 *   4. compute-discriminant    (Δ = b² − 4ac)
 *   5. discriminant-{positive | zero | negative}  (lycée only)
 *   6. apply-quadratic-formula (when Δ ≥ 0)
 *   7. simplify-solutions      (when canonicalisation changed roots)
 *   8. quadratic-sign-table    (NEW — sign of f(x) on each interval)
 *   9. inequality-conclude-quadratic (NEW — reads solution from the table)
 *
 * Per-level granularity is controlled by `STRATEGIES_QUADRATIC` (same as
 * the equation pipeline). `lycee` emits step 5, `superieur` folds the sign
 * declaration into the compute-discriminant description.
 *
 * Out of V1 scope :
 * - Cas spéciaux dédiés (`b = 0`, `c = 0`, déjà factorisé) — tout passe par
 *   Δ uniformément.
 * - Coefficients paramétriques → throw `InequalityNotSolvable`.
 * - Cas dégénéré `a = 0` → délégation à `generateLinearInequalitySteps`.
 *
 * @module mathAST/pedagogical-solve/quadratic-inequality
 */

import type { MathNode, RelationNode } from '../types';
import type { EquationStep, QuadraticInequalityStepsOptions } from './types';
import { STRATEGIES_QUADRATIC } from './types';
import {
	add,
	fraction,
	implicitMultiply,
	number,
	opposite,
	parentheses,
	power,
	relation,
	subtract,
	variable as varNode
} from '../factory';
import { detectVariable, getPolynomialDegree } from '../solve/classify';
import { extractQuadraticCoefficients } from '../solve/solvers/quadratic';
import { computeNumericValue } from '../solve/numeric-value';
import {
	canon,
	describeDomain,
	flipRelation,
	isConstantCoefficient,
	isZero,
	makeStep,
	renumberSteps
} from './_helpers';
import {
	_buildStandardizeStep,
	_buildIdentifyCoefficientsStep,
	_computeDiscriminantValue,
	_buildComputeDiscriminantStep,
	_buildDiscriminantSignStep,
	_buildApplyQuadraticFormulaStep,
	_buildSimplifySolutionsStep,
	_tryDetectFactored,
	_solveLinearFactor,
	_extractLinearCoefficients
} from './quadratic';
import {
	generateLinearInequalitySteps,
	UnsupportedInequalityDegree,
	PedagogicalInequalityError
} from './linear-inequality';
import { solveInequality } from '../solve/inequality';
import { InequalityNotSolvable } from '../solve/inequality/types';

// Re-export for convenience (consumers throw + catch through these from a
// single import).
export { UnsupportedInequalityDegree, PedagogicalInequalityError };

// =============================================================================
// Internal types
// =============================================================================

type InequalityOp = '<' | '>' | '<=' | '>=' | '!=';
type DiscriminantSign = 'positive' | 'zero' | 'negative';

const INEQUALITY_OPS: ReadonlySet<string> = new Set(['<', '>', '<=', '>=', '!=']);

// =============================================================================
// Sign-table + conclusion builders
// =============================================================================

/**
 * Build the `quadratic-sign-table` step. The structural data (a, roots,
 * variable) is enough for the renderer to format both the LaTeX `\begin{array}`
 * and the ASCII representation.
 */
function buildSignTableStep(
	equation: RelationNode,
	a: MathNode,
	roots: readonly MathNode[],
	variable: string,
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'quadratic-sign-table',
		description: 'On dresse le tableau de signes du polynôme',
		before: equation,
		after: equation,
		operation: { kind: 'quadratic-sign-table', a, roots, variable }
	});
}

/**
 * Build the `inequality-conclude-from-isolated-square` step (palier 2c).
 * Used by the `b = 0` fast path : after `isolate-square` reduces the form to
 * `x² ⊻ k`, this step concludes directly without going through a sign table.
 *
 * The solution domain comes from `solveInequality` (palier 1), so this step is
 * just the pedagogical narrative — the math is delegated.
 *
 * @param displayedOp — the operator as displayed on the isolated form (already
 *   flipped if `a < 0` in the caller).
 */
function buildConcludeFromIsolatedSquareStep(
	originalIneq: RelationNode,
	displayedOp: InequalityOp,
	idGen: () => number
): EquationStep {
	const result = solveInequality(originalIneq);
	const solutionDescription = describeDomain(result.solution);
	return makeStep({
		id: idGen(),
		rule: 'inequality-conclude-from-isolated-square',
		description: `Solution : ${solutionDescription}`,
		before: originalIneq,
		after: originalIneq,
		operation: {
			kind: 'inequality-conclude-from-isolated-square',
			relation: displayedOp,
			solutionDescription
		},
		verbosityLevel: 'summarized'
	});
}

/**
 * Build the `b = 0` fast-path sub-pipeline (palier 2c).
 * Sequence : (standardize) → recognize-no-linear-term → isolate-square →
 * inequality-conclude-from-isolated-square.
 */
function buildBZeroInequalitySteps(
	originalIneq: RelationNode,
	standardForm: MathNode,
	a: MathNode,
	c: MathNode,
	op: InequalityOp,
	variable: string,
	idGen: () => number
): readonly EquationStep[] {
	const steps: EquationStep[] = [];
	let current = originalIneq;

	// Step: standardize (move rhs to lhs) if needed
	if (!isZero(originalIneq.right)) {
		const { step, after } = _buildStandardizeStep(current, standardForm, idGen);
		steps.push(step);
		current = after;
	}

	// Step: recognize-no-linear-term
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

	// Step: isolate-square. After dividing by `a`, x² ⊻ rhs where rhs = -c/a.
	// CRITICAL: dividing by `a < 0` flips the inequality operator. The displayed
	// isolated form must reflect this so the student sees the correct intermediate
	// step. The final solution comes from `solveInequality(originalIneq)`, which
	// is independent of how we phrase the intermediate.
	const aValue = computeNumericValue(a);
	const displayedOp: InequalityOp =
		aValue !== null && aValue < 0 ? (flipRelation(op) as InequalityOp) : op;

	const rhs = canon(fraction(opposite(c), a));
	const square = power(varNode(variable), number('2'));
	const isolatedIneq = relation(displayedOp, square, rhs);
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'isolate-square',
			description: 'On isole le carré',
			before: current,
			after: isolatedIneq,
			operation: { kind: 'isolate-square', rhs }
		})
	);

	// Step: conclude (uses the displayed operator for consistency)
	steps.push(buildConcludeFromIsolatedSquareStep(originalIneq, displayedOp, idGen));

	return steps;
}

/**
 * Build the `c = 0` fast-path sub-pipeline (palier 2c).
 * Sequence : (standardize) → recognize-no-constant-term → factor-common-x →
 * quadratic-sign-table (roots 0 and −b/a) → inequality-conclude-quadratic.
 */
function buildCZeroInequalitySteps(
	originalIneq: RelationNode,
	standardForm: MathNode,
	a: MathNode,
	b: MathNode,
	op: InequalityOp,
	variable: string,
	idGen: () => number
): readonly EquationStep[] {
	const steps: EquationStep[] = [];
	let current = originalIneq;

	// Step: standardize if needed
	if (!isZero(originalIneq.right)) {
		const { step, after } = _buildStandardizeStep(current, standardForm, idGen);
		steps.push(step);
		current = after;
	}

	// Step: recognize-no-constant-term
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

	// Step: factor-common-x — `x · (ax + b) ⊻ 0`
	const remainder = canon(add(implicitMultiply(a, varNode(variable)), b));
	const factoredLeft = implicitMultiply(varNode(variable), parentheses(remainder));
	const factoredIneq = relation(op, factoredLeft, number('0'));
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'factor-common-x',
			description: 'On factorise par x',
			before: current,
			after: factoredIneq,
			operation: { kind: 'factor-common-x', remainder }
		})
	);
	current = factoredIneq;

	// Roots: 0 and -b/a
	const root0 = number('0');
	const rootOther = canon(fraction(opposite(b), a));

	// Step: sign table
	steps.push(buildSignTableStep(current, a, [root0, rootOther], variable, idGen));

	// Step: conclude (reuses palier 2b inequality-conclude-quadratic)
	steps.push(buildConcludeStep(originalIneq, op, idGen));

	return steps;
}

/**
 * Build the factored fast-path sub-pipeline (palier 2c).
 * Sequence : recognize-factored → quadratic-sign-table (roots from factors) →
 * inequality-conclude-quadratic. No standardize, no Δ.
 */
function buildFactoredInequalitySteps(
	originalIneq: RelationNode,
	factors: readonly MathNode[],
	op: InequalityOp,
	variable: string,
	idGen: () => number
): readonly EquationStep[] {
	const steps: EquationStep[] = [];

	// Step: recognize-factored
	steps.push(
		makeStep({
			id: idGen(),
			rule: 'recognize-factored',
			description: 'L’inéquation est déjà sous forme factorisée',
			before: originalIneq,
			after: originalIneq,
			operation: { kind: 'recognize-factored', factors }
		})
	);

	// Extract roots r₁, r₂ from each linear factor, plus effective `a` for the
	// sign analysis (product of leading coefficients α₁ · α₂).
	// Pre-condition (guaranteed by `_tryDetectFactored`): every factor is degree 1
	// in `variable`. A `null` return from `_extractLinearCoefficients` therefore
	// signals a programming bug (caller violated the precondition), so we throw.
	const roots: MathNode[] = [];
	let effectiveA: MathNode = number('1');
	for (const factor of factors) {
		const root = _solveLinearFactor(factor, variable);
		roots.push(root);
		const linear = _extractLinearCoefficients(factor, variable);
		if (linear === null) {
			throw new Error(
				`buildFactoredInequalitySteps: cannot extract linear coefficients from a factor (precondition violated by caller)`
			);
		}
		effectiveA = canon(implicitMultiply(effectiveA, linear.alpha));
	}

	// Step: sign table
	steps.push(buildSignTableStep(originalIneq, effectiveA, roots, variable, idGen));

	// Step: conclude
	steps.push(buildConcludeStep(originalIneq, op, idGen));

	return steps;
}

/**
 * Read the inequality's solution domain from `solveInequality` (palier 1)
 * and build the final conclude step.
 */
function buildConcludeStep(
	originalIneq: RelationNode,
	op: InequalityOp,
	idGen: () => number
): EquationStep {
	const result = solveInequality(originalIneq);
	const solutionDescription = describeDomain(result.solution);
	return makeStep({
		id: idGen(),
		rule: 'inequality-conclude-quadratic',
		description: `Solution : ${solutionDescription}`,
		before: originalIneq,
		after: originalIneq,
		operation: {
			kind: 'inequality-conclude-quadratic',
			relation: op,
			solutionDescription
		},
		verbosityLevel: 'summarized'
	});
}

// `describeDomain` (and helpers `isInfinite`, `latexBound`, `formatInterval`)
// moved to `_helpers.ts` (V1.1 polish — shared with rational-inequality.ts).

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Generate pedagogical steps for solving a quadratic inequality.
 *
 * @throws PedagogicalInequalityError — relation is `=`.
 * @throws UnsupportedInequalityDegree — degree ≥ 3 (or non-polynomial).
 * @throws InequalityNotSolvable — parametric coefficients detected.
 */
export function generateQuadraticInequalitySteps(
	inequality: RelationNode,
	options: QuadraticInequalityStepsOptions
): readonly EquationStep[] {
	const { level, variable: varOpt } = options;
	const strategy = STRATEGIES_QUADRATIC[level];

	// 1. Operator validation — reject '='
	if (inequality.relation === '=') {
		throw new PedagogicalInequalityError(
			"L'égalité n'est pas une inéquation — utiliser generateQuadraticEquationSteps()"
		);
	}
	if (!INEQUALITY_OPS.has(inequality.relation)) {
		throw new PedagogicalInequalityError(
			`Opérateur de relation non supporté: '${inequality.relation}'`
		);
	}
	const op = inequality.relation as InequalityOp;

	// 2. Detect variable + reject parametric
	const variable = varOpt ?? detectVariable(inequality);
	if (variable === null) {
		// No variable detected — degenerate constant inequality. Delegate to
		// the linear pipeline which handles `0 < 1`, `7 < 3` etc.
		return generateLinearInequalitySteps(inequality, {
			level: level === 'lycee' ? 'lycee' : 'superieur'
		});
	}

	// Standardize for the degree probe. Parametric coefficients are rejected
	// by the per-coefficient check after `extractQuadraticCoefficients` below
	// (mirrors the pattern in `quadratic.ts`).
	const standardForm = canon(subtract(inequality.left, inequality.right));

	// 3. Sanity check : degree must be 0, 1, or 2.
	const degree = getPolynomialDegree(standardForm, variable);
	if (degree === null) {
		throw new UnsupportedInequalityDegree(null);
	}
	if (degree >= 3) {
		throw new UnsupportedInequalityDegree(degree);
	}

	// 4. If degree is 0 or 1, delegate to the linear pipeline.
	if (degree <= 1) {
		return generateLinearInequalitySteps(inequality, {
			level: level === 'lycee' ? 'lycee' : 'superieur'
		});
	}

	// 5. Extract coefficients (a, b, c)
	const coeffs = extractQuadraticCoefficients(standardForm, variable);
	if (!coeffs) {
		throw new InequalityNotSolvable(
			"Impossible d'extraire les coefficients (a, b, c) — structure inhabituelle.",
			'Hors scope V1.'
		);
	}
	if (
		!isConstantCoefficient(coeffs.a) ||
		!isConstantCoefficient(coeffs.b) ||
		!isConstantCoefficient(coeffs.c)
	) {
		throw new InequalityNotSolvable(
			'Coefficients paramétriques détectés (V1 supporte uniquement les coefficients numériques).',
			'Hors scope V1.'
		);
	}
	if (isZero(coeffs.a)) {
		// Degenerate quadratic with a = 0 → linear. Should not happen post
		// degree-2 check, but defensive.
		return generateLinearInequalitySteps(inequality, {
			level: level === 'lycee' ? 'lycee' : 'superieur'
		});
	}

	const { a, b, c } = coeffs;

	// =========================================================================
	// Build the pipeline
	// =========================================================================

	let nextId = 1;
	const idGen = () => nextId++;
	const result: EquationStep[] = [];
	let current = inequality;

	// Step 1: identify-equation
	if (strategy.includeIdentify) {
		result.push(
			makeStep({
				id: idGen(),
				rule: 'identify-equation',
				description: 'Inéquation du second degré',
				before: current,
				after: current,
				operation: { kind: 'identify-equation', equationType: 'quadratic' }
			})
		);
	}

	// =========================================================================
	// Palier 2c — fast paths for special quadratic forms
	// =========================================================================

	// Fast path: already-factored form `(αx + β)(γx + δ) ⊻ 0` — detected BEFORE
	// any standardisation. Sign analysis goes directly from the linear factors.
	if (isZero(inequality.right)) {
		const factored = _tryDetectFactored(inequality.left, variable);
		if (factored !== null) {
			result.push(...buildFactoredInequalitySteps(inequality, factored, op, variable, idGen));
			return renumberSteps(result);
		}
	}

	// Fast paths: `b = 0` (`ax² + c ⊻ 0`) and `c = 0` (`ax² + bx ⊻ 0`).
	const bIsZero = isZero(b);
	const cIsZero = isZero(c);
	if (bIsZero) {
		// Both zero (ax² ⊻ 0) and `b = 0, c ≠ 0` go through the same path —
		// pedagogically equivalent to "isolate the square".
		result.push(...buildBZeroInequalitySteps(inequality, standardForm, a, c, op, variable, idGen));
		return renumberSteps(result);
	}
	if (cIsZero) {
		result.push(...buildCZeroInequalitySteps(inequality, standardForm, a, b, op, variable, idGen));
		return renumberSteps(result);
	}

	// =========================================================================
	// Standard Δ pipeline (palier 2b)
	// =========================================================================

	// Step 2: standardize (move rhs to lhs)
	const needsStandardize = !isZero(inequality.right);
	if (needsStandardize) {
		const { step, after } = _buildStandardizeStep(current, standardForm, idGen);
		result.push(step);
		current = after;
	}

	// Step 3: identify-coefficients.
	// Note: GCD simplification (`factor-gcd`, present in the equation pipeline)
	// is intentionally omitted here in V1. Inequalities and equations differ on
	// the sign-flip rule when dividing by a negative GCD, and the sign table
	// already canonicalises the sign analysis — so the extra step would add
	// pedagogical noise without changing the solution.
	result.push(_buildIdentifyCoefficientsStep(current, a, b, c, idGen));

	// Step 4: compute-discriminant
	const { discriminant, numericValue } = _computeDiscriminantValue(a, b, c);
	result.push(_buildComputeDiscriminantStep(current, a, b, c, discriminant, numericValue, idGen));

	// Determine the sign of Δ
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

	// Step 5: discriminant-{positive,zero,negative} (lycée only)
	if (strategy.emitSeparateDiscriminantSign) {
		result.push(_buildDiscriminantSignStep(current, sign, discriminant, numericValue, idGen));
	}

	// Step 6: apply-quadratic-formula (when Δ ≥ 0) → roots
	let roots: readonly MathNode[] = [];
	if (sign !== 'negative') {
		const formulaCase = sign === 'zero' ? 'double' : 'two-distinct';
		const { step: formulaStep, rawSolutions } = _buildApplyQuadraticFormulaStep(
			current,
			a,
			b,
			discriminant,
			formulaCase,
			idGen
		);
		result.push(formulaStep);

		// Step 7: simplify-solutions (only when canonicalisation changes the form)
		const { step: simplifyStep, simplified } = _buildSimplifySolutionsStep(
			current,
			rawSolutions,
			idGen
		);
		if (simplifyStep) result.push(simplifyStep);
		roots = simplified;
	}

	// Step 8: quadratic-sign-table
	result.push(buildSignTableStep(current, a, roots, variable, idGen));

	// Step 9: inequality-conclude-quadratic
	result.push(buildConcludeStep(inequality, op, idGen));

	return renumberSteps(result);
}

// Make `opposite` and `relation` import paths usable at module load (avoids
// tree-shake removal that would defeat the imports' side-effects). Inert at
// runtime — the symbols are referenced for ESM correctness.
void opposite;
void relation;
void number;
