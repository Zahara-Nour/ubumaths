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
import type { Verbosity } from '../common/verbosity';
import { add, divide, relation } from '../factory';
import { denormalize, normalize } from '../normal';
import { getNumericValue } from '../common/numeric';
import { getVariables } from '../eval/substitute';
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
