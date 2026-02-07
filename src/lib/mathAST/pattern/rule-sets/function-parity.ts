/**
 * Function Parity Simplification Rules
 *
 * Auto-generated from the canonical EVEN_FUNCTIONS / ODD_FUNCTIONS lists
 * in normal/parity.ts (single source of truth).
 *
 * Even functions: f(-x) = f(x)   (cos, cosh, abs, sec, sech)
 * Odd functions:  f(-x) = -f(x)  (sin, sinh, tan, tanh, cot, coth, csc, csch, arcsin, arctan, arcsinh, arctanh)
 *
 * @module mathAST/pattern/rule-sets/function-parity
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule } from '../types';
import { EVEN_FUNCTIONS, ODD_FUNCTIONS } from '../../normal/parity';

// f(-x) → f(x) for each even function
const evenRules: Rule[] = [...EVEN_FUNCTIONS].map((name) =>
	createRule(P.func(name, [P.neg(P._('x'))]), P.func(name, [P._('x')]), {
		name: `${name}-even`
	})
);

// f(-x) → -f(x) for each odd function
const oddRules: Rule[] = [...ODD_FUNCTIONS].map((name) =>
	createRule(P.func(name, [P.neg(P._('x'))]), P.neg(P.func(name, [P._('x')])), {
		name: `${name}-odd`
	})
);

export const functionParityRules: readonly Rule[] = [...evenRules, ...oddRules] as const;
