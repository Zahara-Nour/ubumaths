/**
 * `isMathPureExpr()` — detects whether a DslExpr can be routed to mathAST's
 * `parseCustom()` (Phase 2 of dsl-mathast-routing plan).
 *
 * An expression is "math pure" iff it contains only pure-math constructs:
 *   - number / bool literals
 *   - identifiers
 *   - binary / unary arithmetic operators
 *   - function calls whose name is NOT a DSL builtin nor a user macro
 *
 * Anything else (tuples, lists, indexed/property access, calls to
 * `BUILTIN_NAMES` like `point`/`slider`/`distance`, calls to user macros)
 * forces the interpreter to keep the existing DSL evaluation path.
 */

import type { DslExpr } from './types';
import { BUILTIN_NAMES } from './builtins';

export interface MathPureOptions {
	/** Names of user-defined macros currently in scope (treated as opaque DSL calls). */
	readonly macroNames?: ReadonlySet<string>;
}

export function isMathPureExpr(expr: DslExpr, options: MathPureOptions = {}): boolean {
	const macroNames = options.macroNames ?? EMPTY_SET;

	switch (expr.kind) {
		case 'number':
		case 'bool':
		case 'identifier':
			return true;

		// Strings cannot evaluate to a number — they're consumed as raw payload
		// by builtins (e.g. courbe equations) but never as part of a math expr.
		case 'string':
			return false;

		case 'unary':
			return isMathPureExpr(expr.operand, options);

		case 'binary':
			return isMathPureExpr(expr.left, options) && isMathPureExpr(expr.right, options);

		case 'call': {
			// DSL builtin or user macro → opaque, NOT math pure
			if (BUILTIN_NAMES.has(expr.name)) return false;
			if (macroNames.has(expr.name)) return false;
			// Named args break math purity — mathAST has no concept of `name=value`
			if (expr.namedArgs.size > 0) return false;
			// All positional args must themselves be math pure
			return expr.args.every((a) => isMathPureExpr(a, options));
		}

		// Non-arithmetic structures: never math pure
		case 'tuple':
		case 'list':
		case 'indexedAccess':
		case 'propertyAccess':
			return false;
	}
}

const EMPTY_SET: ReadonlySet<string> = new Set();
