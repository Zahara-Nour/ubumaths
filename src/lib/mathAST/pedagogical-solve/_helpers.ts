/**
 * Pedagogical Solve — Shared helpers
 *
 * Reusable building blocks shared between the linear and quadratic pipelines.
 *
 * Conventions :
 * - Every helper that produces a `MathNode` or `RelationNode` returns the
 *   canonicalized form (`denormalize ∘ normalize`) so consumers can rely on
 *   structural equality of equivalent expressions.
 * - Helpers are pure (no side effect, no I/O).
 *
 * @module mathAST/pedagogical-solve/_helpers
 */

import type { MathNode, RelationNode } from '../types';
import type { Domain, IntervalSet } from '../domain/types';
import type { Verbosity } from '../common/verbosity';
import { add, divide, relation } from '../factory';
import { denormalize, normalize } from '../normal';
import { getNumericValue } from '../common/numeric';
import { getVariables } from '../eval/substitute';
import { toLatex } from '../latex-generator';
import type { EquationOperation, EquationStep } from './types';

// =============================================================================
// Canonicalization
// =============================================================================

/** Canonicalize a MathNode (run `normalize ∘ denormalize`). */
export function canon(node: MathNode): MathNode {
	return denormalize(normalize(node));
}

/** Canonicalize a RelationNode by canonicalizing both sides. */
export function canonEquation(eq: RelationNode): RelationNode {
	return relation(eq.relation, canon(eq.left), canon(eq.right));
}

// =============================================================================
// Bilateral operations on equations
// =============================================================================

/** Add `operand` to both sides and canonicalize the result. */
export function addToBothSides(eq: RelationNode, operand: MathNode): RelationNode {
	return canonEquation(relation(eq.relation, add(eq.left, operand), add(eq.right, operand)));
}

/** Divide both sides by `divisor` and canonicalize. */
export function divideBothSides(eq: RelationNode, divisor: MathNode): RelationNode {
	return canonEquation(
		relation(
			eq.relation,
			divide(eq.left, divisor, 'fraction'),
			divide(eq.right, divisor, 'fraction')
		)
	);
}

/**
 * Divide both sides by `divisor` and, for inequalities, flip the operator if
 * the divisor is a numerically negative scalar. Returns the resulting
 * relation along with a `flipped` flag indicating whether the operator was
 * inverted (`<` → `>`, etc.). For `=` and `!=` the flag is always `false`.
 *
 * If `divisor` is symbolic (no numeric value extractable), `flipped` defaults
 * to `false` — the caller is expected to either ensure `divisor` is numeric
 * or to call `divideBothSides` directly. This is the V1 pedagogical
 * inequality flow which only handles numeric coefficients.
 */
export function divideBothSidesWithFlip(
	ineq: RelationNode,
	divisor: MathNode
): { result: RelationNode; flipped: boolean } {
	const numeric = getNumericValue(divisor);
	const shouldFlip =
		numeric !== null &&
		numeric < 0 &&
		(ineq.relation === '<' ||
			ineq.relation === '>' ||
			ineq.relation === '<=' ||
			ineq.relation === '>=');

	const newRelation = shouldFlip ? flipRelation(ineq.relation) : ineq.relation;
	const result = canonEquation(
		relation(
			newRelation,
			divide(ineq.left, divisor, 'fraction'),
			divide(ineq.right, divisor, 'fraction')
		)
	);
	return { result, flipped: shouldFlip };
}

/**
 * Flip a strict/non-strict inequality operator. `=` and `!=` are returned
 * unchanged. Throws on unknown relation strings.
 */
export function flipRelation(rel: string): RelationNode['relation'] {
	switch (rel) {
		case '<':
			return '>';
		case '>':
			return '<';
		case '<=':
			return '>=';
		case '>=':
			return '<=';
		case '=':
		case '!=':
			return rel;
		default:
			throw new Error(`flipRelation: unsupported relation '${rel}'`);
	}
}

// =============================================================================
// Number literal predicates
// =============================================================================

/** True when a MathNode is a number literal equal to 1. */
export function isOne(node: MathNode): boolean {
	return node.type === 'number' && node.value === '1';
}

/** True when a MathNode is a number literal equal to 0. */
export function isZero(node: MathNode): boolean {
	return node.type === 'number' && node.value === '0';
}

/**
 * True when a coefficient carries no symbolic variable. Used by the quadratic
 * pipelines (equation + inequality) to reject parametric coefficients in V1.
 */
export function isConstantCoefficient(coeff: MathNode): boolean {
	return getVariables(coeff).size === 0;
}

// =============================================================================
// Step builder + renumbering
// =============================================================================

/**
 * Construct an `EquationStep` with the optional fields normalized — `operation`
 * and `subSteps` are spread only when present (and `subSteps` only when
 * non-empty), matching the JSON shape the renderer expects.
 */
export function makeStep(args: {
	id: number;
	rule: string;
	description: string;
	before: RelationNode;
	after: RelationNode;
	operation?: EquationOperation;
	verbosityLevel?: Verbosity;
	subSteps?: readonly EquationStep[];
}): EquationStep {
	return {
		id: args.id,
		rule: args.rule,
		description: args.description,
		before: args.before,
		after: args.after,
		verbosityLevel: args.verbosityLevel ?? 'detailed',
		...(args.operation !== undefined && { operation: args.operation }),
		...(args.subSteps !== undefined && args.subSteps.length > 0 && { subSteps: args.subSteps })
	};
}

/**
 * Renumber a step tree so top-level steps get IDs 1, 2, 3, … and each parent's
 * substeps restart at 1. Applied as a final pass after assembly because the
 * generation order does not always match the desired top-level order
 * (substeps may be created before their wrapping group step).
 */
export function renumberSteps(steps: readonly EquationStep[]): readonly EquationStep[] {
	return steps.map((step, i) => renumberStep(step, i + 1));
}

function renumberStep(step: EquationStep, id: number): EquationStep {
	const renumberedSubs = step.subSteps?.map((sub, j) => renumberStep(sub, j + 1));
	return {
		...step,
		id,
		...(renumberedSubs !== undefined && { subSteps: renumberedSubs })
	};
}

// =============================================================================
// Domain → French description (shared by quadratic + rational pipelines)
// =============================================================================

/**
 * Convert a `Domain` into a human-readable French description :
 *   - empty           → "∅"
 *   - universal       → "ℝ"
 *   - interval set    → "]a ; b[", "]a ; b[ ∪ ]c ; d[", "{a}", "ℝ \\ {a, b}"
 *
 * Used by `inequality-conclude-quadratic.solutionDescription` (palier 2b),
 * `inequality-conclude-from-isolated-square` (palier 2c), and
 * `inequality-conclude-rational` (palier 3) for the step description and the
 * renderer's title.
 */
export function describeDomain(domain: Domain): string {
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
