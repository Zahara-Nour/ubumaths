/**
 * Source-position utilities for the geometry DSL.
 *
 * Used by the interpreter to extract the original source slice of a parsed
 * expression — required to route math-pure expressions through mathAST's
 * `parseCustom()` (instead of re-implementing arithmetic in the DSL).
 */

import type { DslExpr } from './types';

/**
 * Extract the raw source substring corresponding to a parsed expression.
 * Returns `null` if the expression has no position annotations (e.g. it
 * was synthesized rather than parsed from source).
 */
export function getRawSource(expr: DslExpr, source: string): string | null {
	if (expr.start === undefined || expr.end === undefined) return null;
	return source.slice(expr.start, expr.end);
}
