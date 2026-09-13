/**
 * Grapheur Exact Values — the exact value of a term, when it can be read
 *
 * The plot answers « where is the point » with a float; this module answers
 * « what is the value » with what the maths actually say: -3/8 rather than
 * -0.375, √2 rather than 1.414.
 *
 * Exactness is not always reachable, and not always desirable: iterating a
 * recurrence symbolically doubles the size of the numerator at every rank for
 * something as ordinary as u² - 1. The caller gets null then, and falls back
 * to the decimal it already has.
 *
 * @module grapheur/exact
 */

import { evaluate } from '$lib/mathAST/eval/evaluate';
import { substitute } from '$lib/mathAST/eval/substitute';
import { toLatex } from '$lib/mathAST/latex-generator';
import { number } from '$lib/mathAST/factory';
import type { MathNode } from '$lib/mathAST/types';
import { INDEX_VARIABLE, PREV_TERM_VARIABLE, type SequenceComputeSpec } from './sequence';

// =============================================================================
// Constants
// =============================================================================

/**
 * Largest LaTeX form an exact value may take, in characters.
 *
 * Measured on the recurrences a class actually writes: u_n/2 + 3 reaches a
 * 19-digit fraction by rank 30, and u_n² - 1 passes 2400 characters by rank
 * 11. Past this bound the exact value stops informing anyone, so the decimal
 * takes over.
 */
const MAX_EXACT_LATEX_LENGTH = 2000;

/**
 * Highest rank a recurrence is iterated to.
 *
 * Each rank costs one substitution and one exact evaluation; a few hundred
 * stay imperceptible, and nobody points at the thousandth term of a staircase.
 */
const MAX_EXACT_RANK = 300;

// =============================================================================
// Functions
// =============================================================================

/**
 * Exact value of a term, or null when it cannot be computed or read.
 *
 * @param spec - Mode, rewritten AST, first index and first term, as the plot uses
 * @param rank - Rank of the wanted term
 *
 * @example
 * ```typescript
 * const node = exactTermValue(spec, 3); // 3·(-1/2)^n → -3/8
 * ```
 */
export function exactTermValue(spec: SequenceComputeSpec, rank: number): MathNode | null {
	if (!Number.isInteger(rank) || rank < spec.firstIndex) return null;
	if (rank - spec.firstIndex > MAX_EXACT_RANK) return null;

	// An explicit sequence knows its rank directly; a recurrence has to be
	// unrolled, and unrolling it already computes every rank on the way.
	if (spec.mode === 'explicit') {
		return evaluateExactly(spec.ast, { ...spec.bindings, [INDEX_VARIABLE]: rank });
	}

	return exactTermValues(spec, rank).get(rank) ?? null;
}

/**
 * Exact value of every term up to a rank, for a whole column of a table.
 *
 * A recurrence is unrolled once here: asking rank by rank would restart the
 * iteration each time, and cost the square of the number of rows.
 *
 * @param spec - Mode, rewritten AST, first index and first term
 * @param lastIndex - Highest rank wanted
 * @returns Ranks mapped to their exact value; a rank is absent when its exact
 *   value cannot be computed or could not be read
 *
 * @example
 * ```typescript
 * const values = exactTermValues(spec, 10);
 * const u3 = values.get(3); // -3/8
 * ```
 */
export function exactTermValues(
	spec: SequenceComputeSpec,
	lastIndex: number
): Map<number, MathNode> {
	const { mode, ast, firstIndex, firstTerm, bindings = {} } = spec;
	const values = new Map<number, MathNode>();

	const highestRank = Math.min(lastIndex, firstIndex + MAX_EXACT_RANK);

	if (mode === 'explicit') {
		for (let n = firstIndex; n <= highestRank; n++) {
			const value = evaluateExactly(ast, { ...bindings, [INDEX_VARIABLE]: n });
			if (value) values.set(n, value);
		}

		return values;
	}

	if (firstTerm === null || !Number.isFinite(firstTerm)) return values;

	// The first term is written as a decimal in the panel: 0.1 is the fraction
	// 1/10, and the iteration must start from that, not from a float.
	let current = evaluateExactly(number(String(firstTerm)), {});
	if (!current) return values;

	values.set(firstIndex, current);

	for (let n = firstIndex; n < highestRank; n++) {
		const next = evaluateExactly(ast, {
			...bindings,
			[INDEX_VARIABLE]: n,
			[PREV_TERM_VARIABLE]: current
		});

		// Once the exact form stops being readable, every later rank is worse:
		// the column simply ends there.
		if (!next) return values;

		current = next;
		values.set(n + 1, current);
	}

	return values;
}

/**
 * Substitute then evaluate exactly, refusing a result nobody could read.
 *
 * @param ast - Expression to evaluate
 * @param bindings - Values to substitute, numbers or already-exact nodes
 */
function evaluateExactly(
	ast: MathNode,
	bindings: Readonly<Record<string, number | MathNode>>
): MathNode | null {
	try {
		const substituted = substitute(ast, bindings);
		const result = evaluate(substituted);

		// `exact` is the evaluator saying whether it rounded: an approximated
		// result has no business being displayed as the exact value.
		if (result.status !== 'value' || !result.exact) return null;

		return toLatex(result.node).length > MAX_EXACT_LATEX_LENGTH ? null : result.node;
	} catch {
		// An exact value is a bonus: a solver giving up must never take the plot
		// down with it.
		return null;
	}
}
