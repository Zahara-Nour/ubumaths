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
	const { mode, ast, firstIndex, firstTerm, bindings = {} } = spec;

	if (!Number.isInteger(rank) || rank < firstIndex) return null;
	if (rank - firstIndex > MAX_EXACT_RANK) return null;

	if (mode === 'explicit') {
		return evaluateExactly(ast, { ...bindings, [INDEX_VARIABLE]: rank });
	}

	if (firstTerm === null || !Number.isFinite(firstTerm)) return null;

	// The first term is written as a decimal in the panel: 0.1 is the fraction
	// 1/10, and the iteration must start from that, not from a float.
	let current = evaluateExactly(number(String(firstTerm)), {});
	if (!current) return null;

	for (let n = firstIndex; n < rank; n++) {
		const next = evaluateExactly(ast, {
			...bindings,
			[INDEX_VARIABLE]: n,
			[PREV_TERM_VARIABLE]: current
		});

		if (!next) return null;
		current = next;
	}

	return current;
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
