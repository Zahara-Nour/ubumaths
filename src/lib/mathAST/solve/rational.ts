/**
 * Rational equation decomposition.
 *
 * Handles equations of the shape `P(x)/Q(x) = 0` (and any expression that
 * normalizes to that form, like `1/x − 1` → `(−x + 1)/x`).
 *
 * Strategy :
 * 1. Apply `denormalize(normalize(expr))` to canonicalize. If the result
 *    is not a `division` node, this isn't a rational equation — return
 *    `null` (let the polynomial / transcendental paths take over).
 * 2. Solve `numerator = 0` recursively (this re-enters `solve`).
 * 3. Filter out solutions that annul the denominator (extraneous roots).
 *
 * Why this works without infinite recursion : after step 1, the
 * `numerator` MathNode no longer contains a division (it is a polynomial
 * or simpler), so the recursive call to `solve` falls into the polynomial
 * / transcendental paths and never re-enters this decomposition.
 *
 * @module mathAST/solve/rational
 */

import type { MathNode, RelationNode } from '../types';
import type { Solution, SolveResult, SolveOptions } from './types';
import type { SolveStepRecorder } from './types';
import { denormalize, normalize } from '../normal';
import { equals, number } from '../factory';
import { hasVariable } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { substitute } from '../eval/substitute';
import { mapNode } from '../transforms';

/**
 * Maximum nesting depth for rational decomposition recursion. The
 * canonicalization step normally produces a polynomial numerator that
 * does not re-enter this function, but a defensive guard prevents a
 * pathological infinite loop in case `normalize` ever changes behaviour.
 */
const MAX_RATIONAL_DEPTH = 4;

/**
 * Per-invocation depth counter. Passed by `solve.ts` and threaded into
 * the recursive `solveFn` call site so that a fresh top-level `solve()`
 * call (e.g. from a different thread, the sign/range modules, or a
 * parallel Vitest worker) starts with `depth = 0` rather than reading
 * stale state from an unrelated previous traversal.
 */
export interface RationalDepthState {
	depth: number;
}

export function createRationalDepthState(): RationalDepthState {
	return { depth: 0 };
}

/**
 * Try to solve `expr = 0` as a rational equation. Returns `null` if the
 * expression is not (or cannot be normalized to) a fraction with the
 * variable in the denominator.
 *
 * @param expr - Standard-form expression `f(x)` such that `f(x) = 0` is the equation.
 * @param variable - Name of the unknown.
 * @param opts - Solver options (verbosity, precision, …).
 * @param recorder - Step recorder for pedagogical output.
 * @param solveFn - Recursive solver (passed by `solve.ts` to break the
 *   import cycle between `rational.ts` and `solve.ts`).
 */
export function tryRationalDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		domain?: SolveOptions['domain'];
		initialGuesses?: readonly number[];
	},
	recorder: SolveStepRecorder,
	solveFn: (eq: RelationNode, options?: SolveOptions) => SolveResult,
	state: RationalDepthState = createRationalDepthState()
): SolveResult | null {
	if (state.depth >= MAX_RATIONAL_DEPTH) return null;

	// Detect "looks rational" on the ORIGINAL expression — even when
	// `normalize` later cancels everything to a plain polynomial (e.g.
	// `(x² − 1)/(x − 1)` simplifies to `x + 1`), we still want to drive
	// the solve through this path so that extraneous-root filtering uses
	// the original denominators.
	const originalDenominators = collectDenominators(expr, variable);
	if (originalDenominators.length === 0) return null;

	// Step 1 : canonicalize. May or may not produce a single fraction.
	const canonical = denormalize(normalize(expr));

	// Decide what the "numerator equation" is :
	// - if canonical is a division, use its numerator ;
	// - otherwise (cancellation reduced to a polynomial), the canonical
	//   form IS the numerator (the denominator went away).
	const numerator = canonical.type === 'division' ? canonical.numerator : canonical;
	const canonicalDenominator =
		canonical.type === 'division' && hasVariable(canonical.denominator, variable)
			? canonical.denominator
			: null;

	recorder.recordStep(
		'rational-decomposition',
		`L'équation se ramène à une fraction P(x)/Q(x) = 0. On résout P(x) = 0 puis on écarte les solutions qui annulent Q(x).`,
		expr,
		canonical,
		'summarized'
	);

	// Step 2 : solve numerator = 0 recursively. The depth state is shared
	// with the recursive call via the caller's `state` box — re-entrancy
	// from sign/range/parallel-workers stays correct.
	let numResult: SolveResult;
	state.depth++;
	try {
		numResult = solveFn(equals(numerator, number('0')), {
			variable,
			verbosity: opts.verbosity
		});
	} finally {
		state.depth--;
	}

	// If numerator is itself unsolvable, propagate.
	if (
		numResult.status === 'no-solution' ||
		numResult.status === 'no-real-solution' ||
		numResult.status === 'infinite'
	) {
		return {
			...numResult,
			equationType: 'rational',
			strategy: 'algebraic',
			steps: [...recorder.getStepsFiltered(opts.verbosity), ...numResult.steps]
		};
	}

	// Step 3 : filter extraneous roots — solutions that annul ANY
	// denominator from the original expression (or the canonical's
	// denominator when present). Deduplicate by reference to avoid
	// double-evaluating identical denominators (common case: `1/x − 1`
	// has `x` in both lists).
	const denominatorsToCheck: MathNode[] = [...originalDenominators];
	if (canonicalDenominator !== null && !denominatorsToCheck.includes(canonicalDenominator)) {
		denominatorsToCheck.push(canonicalDenominator);
	}

	const validSolutions: Solution[] = [];
	for (const s of numResult.solutions) {
		const enriched = ensureApproximate(s);
		const isExtraneous = denominatorsToCheck.some((d) => annulsAt(d, variable, enriched));
		if (isExtraneous) {
			recorder.recordStep(
				'rational-extraneous',
				`La valeur ${variable} = ${enriched.approximate?.toPrecision(opts.precision) ?? '...'} est rejetée car elle annule le dénominateur.`,
				equals(numerator, number('0')),
				equals(numerator, number('0')),
				'detailed'
			);
			continue;
		}
		validSolutions.push(enriched);
	}

	if (validSolutions.length === 0) {
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'rational',
			strategy: 'algebraic',
			steps: [...recorder.getStepsFiltered(opts.verbosity), ...numResult.steps],
			error: 'Toutes les racines du numérateur annulent le dénominateur (racines étrangères).'
		};
	}

	const status: SolveResult['status'] = validSolutions.length === 1 ? 'unique' : 'multiple';

	return {
		variable,
		status,
		solutions: validSolutions,
		equationType: 'rational',
		strategy: 'algebraic',
		steps: [...recorder.getStepsFiltered(opts.verbosity), ...numResult.steps]
	};
}

/**
 * Collect every `division.denominator` in `expr` whose subtree contains
 * `variable`. Returns the ORIGINAL (non-normalized) denominators so that
 * extraneous-root filtering is based on the user's actual fraction shape.
 */
function collectDenominators(expr: MathNode, variable: string): MathNode[] {
	const denominators: MathNode[] = [];
	mapNode(expr, (n) => {
		if (n.type === 'division' && hasVariable(n.denominator, variable)) {
			denominators.push(n.denominator);
		}
		return n;
	});
	return denominators;
}

/**
 * Ensure `solution.approximate` is populated. The linear solver does not
 * always set it for the trivial case `x = 0` (see linear.ts:230-264 — only
 * the simple-rational path computes the value). We close that gap here so
 * that downstream consumers (and tests) can rely on `approximate`.
 */
function ensureApproximate(s: Solution): Solution {
	if (s.approximate !== undefined) return s;
	try {
		const approx = evaluateNodeToApproximatedNumber(s.value);
		if (Number.isFinite(approx)) {
			return { ...s, approximate: approx };
		}
	} catch {
		// fall through
	}
	return s;
}

/**
 * Returns true when `denominator` evaluates to (numerically) zero at
 * `variable = solution`. Uses exact symbolic substitution when possible,
 * falls back to the approximate value.
 */
function annulsAt(denom: MathNode, variable: string, solution: Solution): boolean {
	const value = evaluateDenominatorAt(denom, variable, solution);
	if (value === null) return false; // Cannot decide — keep solution defensively.
	return Math.abs(value) < 1e-10;
}

/**
 * Evaluate `denom` at `variable = solution.value`. Prefers the exact
 * symbolic substitution path (so `(x-2)` at `x = 2` gives `0` rather than
 * a near-zero float); falls back to the approximate value if the
 * substitution can't be evaluated symbolically.
 */
function evaluateDenominatorAt(
	denom: MathNode,
	variable: string,
	solution: Solution
): number | null {
	// Prefer exact symbolic substitution.
	try {
		const substituted = substitute(denom, { [variable]: solution.value });
		const value = evaluateNodeToApproximatedNumber(substituted);
		if (Number.isFinite(value)) return value;
	} catch {
		// Fall through to approximate path.
	}

	// Approximate fallback.
	if (solution.approximate !== undefined) {
		try {
			const substituted = substitute(denom, { [variable]: solution.approximate });
			const value = evaluateNodeToApproximatedNumber(substituted);
			if (Number.isFinite(value)) return value;
		} catch {
			return null;
		}
	}
	return null;
}
