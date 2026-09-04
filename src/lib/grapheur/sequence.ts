/**
 * Grapheur Sequence Engine — numeric sequences for the graphing calculator
 *
 * Handles sequences defined either explicitly (`u_n = f(n)`) or by a first
 * order recurrence (`u_{n+1} = f(u_n)`), plus the staircase / cobweb path used
 * to visualise the convergence of a recurrence.
 *
 * Why this module exists rather than reusing `grapheur/evaluator`:
 * - `compile()` refuses `subscript` nodes, so `u_n` has to be rewritten into a
 *   plain variable before it can be evaluated;
 * - `createEvaluator()` hard-codes `{ x }` as its binding and cannot bind `n`.
 *
 * @module grapheur/sequence
 */

import { compile } from '$lib/mathAST/eval/compile';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { variable } from '$lib/mathAST/factory';
import { isVariable } from '$lib/mathAST/guards';
import { parseLatexSafe } from '$lib/mathAST/parser';
import type { MathNode, SubscriptNode } from '$lib/mathAST/types';
import { transformAST } from '$lib/mathAST/visitor';
// Imported from geometry-core rather than from grapheur/types, which depends on
// this module for MAX_SEQUENCE_TERMS.
import type { Point } from '$lib/geometry-core/viewport';

// =============================================================================
// Types
// =============================================================================

/** How a sequence is defined. */
export type SequenceMode = 'explicit' | 'recurrence';

/** Result of parsing the right-hand side of a sequence definition. */
export interface SequenceParseResult {
	/** Whether parsing and validation succeeded. */
	readonly success: boolean;
	/** AST with `u_n` already rewritten to {@link PREV_TERM_VARIABLE} (null on failure). */
	readonly ast: MathNode | null;
	/** French error message shown under the input (null on success). */
	readonly error: string | null;
	/** Whether the expression depends on the index `n` (a cobweb needs it to be false). */
	readonly usesIndex: boolean;
}

/** A single computed term of a sequence. */
export interface SequenceTerm {
	readonly n: number;
	readonly value: number;
}

/** Everything needed to compute the terms of a sequence. */
export interface SequenceComputeSpec {
	readonly mode: SequenceMode;
	/** Rewritten AST, as returned by {@link parseSequence}. */
	readonly ast: MathNode;
	/** Index of the first term (`n0`), usually 0 or 1. */
	readonly firstIndex: number;
	/** Value of the first term — required for a recurrence, ignored otherwise. */
	readonly firstTerm: number | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Hard cap on the number of computed terms.
 *
 * Protects against a viewport panned far to the right and, for a recurrence,
 * against an iteration that would otherwise freeze the UI.
 */
export const MAX_SEQUENCE_TERMS = 1000;

/** Number of staircase steps drawn when a cobweb is first switched on. */
export const DEFAULT_COBWEB_STEPS = 10;

/** Names offered to new sequences, in order. */
export const SEQUENCE_NAMES = ['u', 'v', 'w', 't', 'a', 'b', 'c'] as const;

/** Variable the previous term is rewritten to before compilation. */
export const PREV_TERM_VARIABLE = '__prev';

/** Variable carrying the rank of the term. */
export const INDEX_VARIABLE = 'n';

/** Variables any sequence expression may reference. */
const ALLOWED_VARIABLES = new Set([INDEX_VARIABLE, 'pi', 'e']);

/**
 * Variables a recurrence may reference.
 *
 * The previous term only exists in recurrence mode: leaving it allowed in
 * explicit mode would let an expression through that silently evaluates to 0.
 */
const ALLOWED_RECURRENCE_VARIABLES = new Set([...ALLOWED_VARIABLES, PREV_TERM_VARIABLE]);

// =============================================================================
// Functions
// =============================================================================

/** Internal signal carrying a user-facing message out of the AST rewrite. */
class SequenceExpressionError extends Error {}

/** Render a subscript node the way the student wrote it, for error messages. */
function describeSubscript(node: SubscriptNode): string {
	const base = isVariable(node.base) ? node.base.name : '?';
	const index = isVariable(node.subscript) ? node.subscript.name : '…';
	return `${base}_${index}`;
}

/**
 * Rewrite `u_n` into a plain variable so the expression becomes compilable.
 *
 * @throws SequenceExpressionError when the subscript is not the previous term
 * of this very sequence (wrong name, shifted index, or explicit mode).
 */
function rewritePreviousTerm(ast: MathNode, mode: SequenceMode, name: string): MathNode {
	return transformAST(ast, {
		enterSubscript: (node) => {
			if (mode === 'explicit') {
				throw new SequenceExpressionError(
					`« ${describeSubscript(node)} » n'a pas de sens dans une suite explicite : passe en mode récurrence.`
				);
			}

			const baseIsThisSequence = isVariable(node.base) && node.base.name === name;
			const indexIsN = isVariable(node.subscript) && node.subscript.name === INDEX_VARIABLE;

			if (baseIsThisSequence && indexIsN) return variable(PREV_TERM_VARIABLE);

			if (baseIsThisSequence) {
				throw new SequenceExpressionError(
					`Seul « ${name}_n » est accepté : une récurrence d'ordre 1 ne peut pas décaler l'indice.`
				);
			}

			throw new SequenceExpressionError(
				`La suite « ${name} » ne peut pas dépendre de « ${describeSubscript(node)} ».`
			);
		}
	});
}

/**
 * Parse the right-hand side of a sequence definition.
 *
 * @param latex - Right-hand side only (the `u_{n+1} =` part is UI chrome)
 * @param mode - Explicit or first-order recurrence
 * @param name - Name of the sequence, used to recognise its own previous term
 *
 * @example
 * ```typescript
 * parseSequence('0.5u_n+3', 'recurrence', 'u'); // success, usesIndex: false
 * parseSequence('3n+2', 'explicit', 'u');       // success, usesIndex: true
 * ```
 */
export function parseSequence(
	latex: string,
	mode: SequenceMode,
	name: string
): SequenceParseResult {
	const failure = (error: string): SequenceParseResult => ({
		success: false,
		ast: null,
		error,
		usesIndex: false
	});

	if (!latex || latex.trim() === '') {
		return failure("L'expression est vide.");
	}

	const parsed = parseLatexSafe(latex);
	if (parsed.errors.length > 0 || !parsed.ast) {
		const messages = parsed.errors.map((e) => e.message).join(' ; ');
		return failure(messages || 'Expression invalide.');
	}

	let rewritten: MathNode;
	try {
		rewritten = rewritePreviousTerm(parsed.ast, mode, name);
	} catch (err) {
		if (err instanceof SequenceExpressionError) return failure(err.message);
		throw err;
	}

	const variables = getVariables(rewritten);
	const allowed = mode === 'recurrence' ? ALLOWED_RECURRENCE_VARIABLES : ALLOWED_VARIABLES;
	const unknown = [...variables].filter((v) => !allowed.has(v));
	if (unknown.length > 0) {
		const quoted = unknown.map((v) => `« ${v} »`).join(', ');
		return failure(`Variable inconnue : ${quoted}.`);
	}

	// Compile eagerly so an unsupported node surfaces as an input error rather
	// than as an empty plot later on.
	try {
		compile(rewritten);
	} catch {
		return failure("Cette expression n'est pas évaluable.");
	}

	return {
		success: true,
		ast: rewritten,
		error: null,
		usesIndex: variables.has(INDEX_VARIABLE)
	};
}

/**
 * Compute the terms of a sequence, from its first index up to `lastIndex`.
 *
 * An explicit sequence skips a rank it is undefined at and carries on; a
 * recurrence stops there, since the following terms cannot be reached.
 * Both are capped by {@link MAX_SEQUENCE_TERMS}.
 *
 * @param spec - Mode, rewritten AST, first index and first term
 * @param lastIndex - Highest rank of interest (usually the viewport's right edge)
 */
export function computeSequenceTerms(spec: SequenceComputeSpec, lastIndex: number): SequenceTerm[] {
	const { mode, ast, firstIndex, firstTerm } = spec;

	if (!Number.isFinite(lastIndex) || lastIndex < firstIndex) return [];

	let evaluateNode: (env: Record<string, number>) => number;
	try {
		evaluateNode = compile(ast);
	} catch {
		return [];
	}

	// Single mutable env reused across the loop — never rebuild it per iteration.
	const env: Record<string, number> = {
		[INDEX_VARIABLE]: firstIndex,
		[PREV_TERM_VARIABLE]: 0
	};
	const terms: SequenceTerm[] = [];

	if (mode === 'explicit') {
		for (let n = firstIndex; n <= lastIndex && n - firstIndex < MAX_SEQUENCE_TERMS; n++) {
			env[INDEX_VARIABLE] = n;
			const value = evaluateNode(env);
			if (Number.isFinite(value)) terms.push({ n, value });
		}
		return terms;
	}

	if (firstTerm === null || !Number.isFinite(firstTerm)) return [];

	let value = firstTerm;
	terms.push({ n: firstIndex, value });

	for (let n = firstIndex; n < lastIndex && terms.length < MAX_SEQUENCE_TERMS; n++) {
		env[INDEX_VARIABLE] = n;
		env[PREV_TERM_VARIABLE] = value;

		const next = evaluateNode(env);
		if (!Number.isFinite(next)) break;

		value = next;
		terms.push({ n: n + 1, value });
	}

	return terms;
}

/**
 * Build an evaluator for `f` seen as a function of the previous term.
 *
 * Used to draw the curve of `f` under a cobweb diagram. The caller must first
 * check that the expression does not depend on the index
 * ({@link SequenceParseResult.usesIndex}), otherwise `f` is not a single curve.
 */
export function createRecurrenceFunctionEvaluator(ast: MathNode): (x: number) => number | null {
	let evaluateNode: (env: Record<string, number>) => number;
	try {
		evaluateNode = compile(ast);
	} catch {
		return () => null;
	}

	const env: Record<string, number> = { [INDEX_VARIABLE]: 0, [PREV_TERM_VARIABLE]: 0 };

	return (x: number) => {
		if (!Number.isFinite(x)) return null;
		env[PREV_TERM_VARIABLE] = x;
		const y = evaluateNode(env);
		return Number.isFinite(y) ? y : null;
	};
}

/**
 * Build the staircase (cobweb) polyline for a recurrence.
 *
 * Starts on the x-axis at `u0`, then alternates a vertical move onto the curve
 * of `f` and a horizontal move onto the line `y = x`.
 *
 * @param terms - Terms of the sequence, in order
 * @param maxSteps - Number of steps to draw (defaults to every available one)
 */
export function computeCobwebPath(terms: readonly SequenceTerm[], maxSteps?: number): Point[] {
	if (terms.length === 0) return [];

	const path: Point[] = [{ x: terms[0].value, y: 0 }];

	const available = terms.length - 1;
	const steps = maxSteps === undefined ? available : Math.max(0, Math.min(maxSteps, available));

	for (let i = 0; i < steps; i++) {
		const from = terms[i].value;
		const to = terms[i + 1].value;

		path.push({ x: from, y: to });
		path.push({ x: to, y: to });
	}

	return path;
}

/**
 * Narrow a plotted sequence down to what {@link computeSequenceTerms} needs.
 *
 * Keeps the two call sites (the plot and the table) from drifting apart.
 *
 * @param sequence - Any object carrying the definition of a sequence
 * @returns null when the expression did not parse, so there is nothing to compute
 */
export function toComputeSpec(sequence: {
	mode: SequenceMode;
	ast: MathNode | undefined;
	firstIndex: number;
	firstTerm: number | null;
}): SequenceComputeSpec | null {
	if (!sequence.ast) return null;

	return {
		mode: sequence.mode,
		ast: sequence.ast,
		firstIndex: sequence.firstIndex,
		firstTerm: sequence.firstTerm
	};
}

/**
 * Pick a name for a new sequence, avoiding the ones already taken.
 *
 * Falls back to the first name of the pool once every name is in use — two
 * sequences sharing a name is confusing but harmless, since each one resolves
 * its own previous term.
 *
 * @param usedNames - Names of the sequences already on the graph
 */
export function nextSequenceName(usedNames: readonly string[]): string {
	const taken = new Set(usedNames);
	return SEQUENCE_NAMES.find((name) => !taken.has(name)) ?? SEQUENCE_NAMES[0];
}

/**
 * Validate a sequence as a whole, expression plus first term.
 *
 * @returns A French message to display, or null when the sequence is usable
 */
export function sequenceValidationError(
	mode: SequenceMode,
	parseError: string | null,
	firstTerm: number | null
): string | null {
	if (parseError) return parseError;
	if (mode === 'recurrence' && firstTerm === null) {
		return 'Précise le premier terme de la suite.';
	}
	return null;
}
