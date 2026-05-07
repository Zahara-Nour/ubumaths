/**
 * Pedagogical Limits — Public Dispatcher
 *
 * String-friendly entry point used by `correction-generator.ts` (Mode B,
 * `kind: 'limit'`) and CLI demos. Parses the LaTeX-formatted `expression`
 * and `approach` arguments, then forwards to the typed pipeline.
 *
 * The split between `dispatch.ts` (string parsing + arg validation) and
 * `pipeline.ts` (typed orchestration) mirrors the convention used by other
 * pedagogical modules and keeps `pipeline.ts` testable without going
 * through the parser.
 *
 * @module mathAST/pedagogical-limits/dispatch
 */

import { parseCustomSafe } from '../parser/custom';
import type { MathNode } from '../types';
import type { LimitDirection } from '../limits/types';
import { infinity } from '../factory';
import { generatePedagogicalLimitSteps } from './pipeline';
import { PedagogicalLimitNotImplemented } from './types';
import type { PedagogicalLimitOptions, PedagogicalLimitResult } from './types';

// =============================================================================
// String-shaped options
// =============================================================================

/**
 * Mode-B-friendly options shape, where the expression and the approach point
 * are LaTeX strings (the format produced by template authors).
 */
export interface PedagogicalLimitDispatchOptions {
	/** LaTeX expression of `f(x)` (e.g. `'(x^2-4)/(x-2)'`). */
	readonly expression: string;
	/** Variable. Default: `'x'`. */
	readonly variable?: string;
	/** Approach point as LaTeX (`'\\infty'`, `'-\\infty'`, `'2'`, `'a'`, …). */
	readonly approach: string;
	/** Direction. Default: `'both'`. */
	readonly direction?: LimitDirection;
	/** School level. Required. */
	readonly schoolLevel: PedagogicalLimitOptions['schoolLevel'];
	/** Verbosity. Default: `'detailed'`. */
	readonly verbosity?: PedagogicalLimitOptions['verbosity'];
}

// =============================================================================
// Public dispatcher
// =============================================================================

/**
 * Parse the string options, then run the pipeline.
 *
 * Throws `PedagogicalLimitNotImplemented` when:
 * - the expression or approach cannot be parsed
 * - any of the throw conditions of the underlying pipeline fire
 */
export function dispatchPedagogicalLimit(
	options: PedagogicalLimitDispatchOptions
): PedagogicalLimitResult {
	const expression = parseExpression(options.expression);
	const approach = parseApproach(options.approach);

	return generatePedagogicalLimitSteps(expression, {
		variable: options.variable ?? 'x',
		approach,
		direction: options.direction,
		schoolLevel: options.schoolLevel,
		...(options.verbosity && { verbosity: options.verbosity })
	});
}

// =============================================================================
// Parsing helpers
// =============================================================================

function parseExpression(latex: string): MathNode {
	const trimmed = latex.trim();
	if (trimmed.length === 0) {
		throw new PedagogicalLimitNotImplemented(
			{ type: 'number', value: '0' },
			'empty expression string'
		);
	}

	const result = parseCustomSafe(trimmed);
	if (result.errors.length > 0 || !result.ast) {
		throw new PedagogicalLimitNotImplemented(
			{ type: 'number', value: '0' },
			`parse error in expression: ${result.errors[0]?.message ?? 'unknown'}`
		);
	}
	return result.ast;
}

/**
 * Parse the approach LaTeX into a MathNode.
 *
 * Recognises a handful of canonical infinity spellings before falling back
 * to the generic LaTeX parser, since `\infty` parses to a non-`InfinityNode`
 * symbol in some configurations. Spellings handled :
 *
 * - `'\\infty'`, `'+\\infty'` → `infinity('positive')`
 * - `'-\\infty'`              → `infinity('negative')`
 * - `'oo'`, `'+oo'`           → `infinity('positive')`  (math.js / WolframAlpha conventions)
 * - `'-oo'`                   → `infinity('negative')`
 *
 * Otherwise the string is fed to `parseLatexSafe`.
 */
function parseApproach(latex: string): MathNode {
	const trimmed = latex.trim();
	if (trimmed.length === 0) {
		throw new PedagogicalLimitNotImplemented(
			{ type: 'number', value: '0' },
			'empty approach string'
		);
	}

	const canonical = trimmed.replace(/\s+/g, '');
	if (
		canonical === '\\infty' ||
		canonical === '+\\infty' ||
		canonical === '+oo' ||
		canonical === 'oo'
	) {
		return infinity('positive');
	}
	if (canonical === '-\\infty' || canonical === '-oo') {
		return infinity('negative');
	}

	const result = parseCustomSafe(trimmed);
	if (result.errors.length > 0 || !result.ast) {
		throw new PedagogicalLimitNotImplemented(
			{ type: 'number', value: '0' },
			`parse error in approach: ${result.errors[0]?.message ?? 'unknown'}`
		);
	}
	return result.ast;
}
