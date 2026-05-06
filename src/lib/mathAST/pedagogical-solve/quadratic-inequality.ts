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
import type { Domain, IntervalSet } from '../domain/types';
import type { EquationStep, QuadraticInequalityStepsOptions } from './types';
import { STRATEGIES_QUADRATIC } from './types';
import { number, opposite, relation, subtract } from '../factory';
import { getVariables } from '../eval/substitute';
import { detectVariable, getPolynomialDegree } from '../solve/classify';
import { extractQuadraticCoefficients } from '../solve/solvers/quadratic';
import { canon, isZero, makeStep, renumberSteps } from './_helpers';
import { toLatex } from '../latex-generator';
import {
	_buildStandardizeStep,
	_buildIdentifyCoefficientsStep,
	_computeDiscriminantValue,
	_buildComputeDiscriminantStep,
	_buildDiscriminantSignStep,
	_buildApplyQuadraticFormulaStep,
	_buildSimplifySolutionsStep
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
// Validation helpers
// =============================================================================

/** True when a coefficient contains no variable other than the implicit unknown. */
function isConstantCoefficient(coeff: MathNode): boolean {
	return getVariables(coeff).size === 0;
}

/**
 * Reject expressions whose coefficient set carries a free variable other than
 * `variable`. Mirrors `linear-inequality.rejectIfParametric`.
 */
function rejectIfParametric(expression: MathNode, variable: string): void {
	const vars = getVariables(expression);
	const free = [...vars].filter((v) => v !== variable);
	if (free.length > 0) {
		throw new InequalityNotSolvable(
			`Coefficients paramétriques détectés: ${[...new Set(free)].join(', ')}`,
			'Hors scope V1 — fournir des coefficients numériques.'
		);
	}
}

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

/**
 * Convert a `Domain` into a human-readable French description :
 *   - empty           → "∅"
 *   - universal       → "ℝ"
 *   - interval set    → "]a ; b[", "]a ; b[ ∪ ]c ; d[", "{a}", "ℝ \\ {a, b}"
 *
 * Used by both `inequality-conclude-quadratic.solutionDescription` and the
 * step description.
 */
function describeDomain(domain: Domain): string {
	if (domain.kind === 'empty') return '∅';
	if (domain.kind === 'universal') return 'ℝ';
	if (domain.kind !== 'interval_set') return 'ℝ';

	const set = domain as IntervalSet;
	const intervals = set.intervals;
	const excluded = set.excludedPoints;

	// === All-real shapes ===
	// (a) `[(]-∞, +∞[)]` with no excluded points → "ℝ"
	if (
		intervals.length === 1 &&
		excluded.length === 0 &&
		isInfinite(intervals[0].lower.value, 'lower') &&
		isInfinite(intervals[0].upper.value, 'upper')
	) {
		return 'ℝ';
	}
	// (b) `[(]-∞, +∞[)]` with excluded points → "ℝ \ {a, b}"
	if (
		intervals.length === 1 &&
		isInfinite(intervals[0].lower.value, 'lower') &&
		isInfinite(intervals[0].upper.value, 'upper') &&
		excluded.length > 0
	) {
		const points = excluded.map((ep) => latexBound(ep.value)).join(' ; ');
		return `ℝ \\ {${points}}`;
	}
	// (c) Multi-interval covering all of ℝ minus a few points :
	//     `]-∞, a[ ∪ ]a, +∞[`     → "ℝ \ {a}"
	//     `]-∞, a[ ∪ ]a, b[ ∪ ]b, +∞[` → "ℝ \ {a, b}"
	if (excluded.length === 0 && intervals.length >= 2) {
		const allOpen = intervals.every(
			(int) => int.lower.type === 'open' && int.upper.type === 'open'
		);
		const firstStartsAtMinusInf = isInfinite(intervals[0].lower.value, 'lower');
		const lastEndsAtPlusInf = isInfinite(intervals[intervals.length - 1].upper.value, 'upper');
		// Detect contiguity : upper[i] == lower[i+1] (open both sides → single
		// excluded point between consecutive intervals).
		let contiguous = true;
		const missingPoints: MathNode[] = [];
		for (let i = 0; i < intervals.length - 1; i++) {
			const upper = intervals[i].upper.value;
			const nextLower = intervals[i + 1].lower.value;
			if (latexBound(upper) !== latexBound(nextLower)) {
				contiguous = false;
				break;
			}
			missingPoints.push(upper);
		}
		if (allOpen && firstStartsAtMinusInf && lastEndsAtPlusInf && contiguous) {
			const pts = missingPoints.map(latexBound).join(' ; ');
			return `ℝ \\ {${pts}}`;
		}
	}

	// === Single closed-degenerate interval `[a, a]` — display as `{a}` ===
	if (intervals.length === 1 && excluded.length === 0) {
		const int = intervals[0];
		if (
			int.lower.type === 'closed' &&
			int.upper.type === 'closed' &&
			!isInfinite(int.lower.value, 'lower') &&
			!isInfinite(int.upper.value, 'upper')
		) {
			const lo = latexBound(int.lower.value);
			const hi = latexBound(int.upper.value);
			if (lo === hi) return `{${lo}}`;
		}
	}

	// === Generic union of intervals ===
	const parts = intervals.map((int) => formatInterval(int));
	return parts.join(' ∪ ');
}

function isInfinite(value: MathNode, side: 'lower' | 'upper'): boolean {
	if (value.type !== 'infinity') return false;
	const sign = (value as { sign?: string }).sign;
	if (side === 'lower') return sign === 'negative';
	return sign === 'positive' || sign === undefined;
}

function latexBound(node: MathNode): string {
	if (node.type === 'infinity') {
		const sign = (node as { sign?: string }).sign;
		return sign === 'negative' ? '-∞' : '+∞';
	}
	return toLatex(node).replace(/\\infty/g, '∞');
}

function formatInterval(int: {
	lower: { value: MathNode; type: 'open' | 'closed' };
	upper: { value: MathNode; type: 'open' | 'closed' };
}): string {
	const lo = isInfinite(int.lower.value, 'lower') ? '-∞' : latexBound(int.lower.value);
	const hi = isInfinite(int.upper.value, 'upper') ? '+∞' : latexBound(int.upper.value);
	const lb = int.lower.type === 'closed' ? '[' : ']';
	const rb = int.upper.type === 'closed' ? ']' : '[';
	return `${lb}${lo} ; ${hi}${rb}`;
}

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

	// Standardize for degree probe and parametric check
	const standardForm = canon(subtract(inequality.left, inequality.right));
	rejectIfParametric(standardForm, variable);

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

	// Step 2: standardize (move rhs to lhs)
	const needsStandardize = !isZero(inequality.right);
	if (needsStandardize) {
		const { step, after } = _buildStandardizeStep(current, standardForm, idGen);
		result.push(step);
		current = after;
	}

	// Step 3: identify-coefficients
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
