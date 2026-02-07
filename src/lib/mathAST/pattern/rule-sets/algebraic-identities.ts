/**
 * Algebraic Identity Rules
 *
 * Pattern rules for algebraic identities (factoring and expanding).
 * Uses dual detection: symbolic pattern matching + numeric fallback
 * via analysis/structures.ts for cases like x² - 4.
 */

import type { MathNode } from '../../types';
import type { Rule, MatchBindings } from '../types';
import { getBindingNode } from '../types';
import { createRule } from '../rule';
import { P } from '../builder';
import {
	isDifferenceOfSquares,
	isPerfectSquareTrinomial,
	isSumOfCubes,
	isDifferenceOfCubes
} from '../../analysis/structures';
import { number, multiply, add, subtract, superscript, parentheses } from '../../factory';

// =============================================================================
// Helper Functions
// =============================================================================

function get(b: MatchBindings, name: string): MathNode {
	const node = getBindingNode(b, name);
	if (!node) throw new Error(`Missing binding '${name}'`);
	return node;
}

function implicitProduct(a: MathNode, b: MathNode): MathNode {
	if (b.type === 'number') return multiply(b, a, 'implicit');
	return multiply(a, b, 'implicit');
}

function squared(node: MathNode): MathNode {
	if (node.type === 'number') {
		const val = parseFloat((node as { value: string }).value);
		return number(String(val * val));
	}
	return superscript(node, number('2'));
}

function buildSumCubesFactored(a: MathNode, b: MathNode): MathNode {
	return multiply(
		parentheses(add(a, b)),
		parentheses(add(subtract(squared(a), implicitProduct(a, b)), squared(b))),
		'implicit'
	);
}

function buildDiffCubesFactored(a: MathNode, b: MathNode): MathNode {
	return multiply(
		parentheses(subtract(a, b)),
		parentheses(add(add(squared(a), implicitProduct(a, b)), squared(b))),
		'implicit'
	);
}

// =============================================================================
// Factoring Rules
// =============================================================================

// a² - b² → (a+b)(a-b) — symbolic pattern
const diffSquaresSymbolic = createRule(
	P.sub(P.pow(P._('a'), P.num(2)), P.pow(P._('b'), P.num(2))),
	(bindings) => {
		const a = get(bindings, 'a');
		const b = get(bindings, 'b');
		return multiply(parentheses(add(a, b)), parentheses(subtract(a, b)), 'implicit');
	},
	{ name: 'diff-squares-symbolic', priority: 1 }
);

// a² - b² → (a+b)(a-b) — numeric fallback (e.g., x² - 4)
const diffSquaresNumeric = createRule(
	P._(
		'expr',
		P.custom((n) => isDifferenceOfSquares(n) !== null)
	),
	(bindings) => {
		const expr = get(bindings, 'expr');
		const detected = isDifferenceOfSquares(expr)!;
		return multiply(
			parentheses(add(detected.a, detected.b)),
			parentheses(subtract(detected.a, detected.b)),
			'implicit'
		);
	},
	{ name: 'diff-squares-numeric', priority: 0 }
);

// a² ± 2ab + b² → (a±b)² — uses isPerfectSquareTrinomial detection only
const perfectSquareTrinomial = createRule(
	P._(
		'expr',
		P.custom((n) => isPerfectSquareTrinomial(n) !== null)
	),
	(bindings) => {
		const expr = get(bindings, 'expr');
		const detected = isPerfectSquareTrinomial(expr)!;
		const inner =
			detected.sign === '+' ? add(detected.a, detected.b) : subtract(detected.a, detected.b);
		return superscript(parentheses(inner), number('2'));
	},
	{ name: 'perfect-square-trinomial' }
);

// a³ + b³ → (a+b)(a²-ab+b²) — symbolic pattern
const sumCubesSymbolic = createRule(
	P.add(P.pow(P._('a'), P.num(3)), P.pow(P._('b'), P.num(3))),
	(bindings) => buildSumCubesFactored(get(bindings, 'a'), get(bindings, 'b')),
	{ name: 'sum-cubes-symbolic', priority: 1 }
);

// a³ + b³ → (a+b)(a²-ab+b²) — numeric fallback (e.g., x³ + 8)
const sumCubesNumeric = createRule(
	P._(
		'expr',
		P.custom((n) => isSumOfCubes(n) !== null)
	),
	(bindings) => {
		const detected = isSumOfCubes(get(bindings, 'expr'))!;
		return buildSumCubesFactored(detected.a, detected.b);
	},
	{ name: 'sum-cubes-numeric', priority: 0 }
);

// a³ - b³ → (a-b)(a²+ab+b²) — symbolic pattern
const diffCubesSymbolic = createRule(
	P.sub(P.pow(P._('a'), P.num(3)), P.pow(P._('b'), P.num(3))),
	(bindings) => buildDiffCubesFactored(get(bindings, 'a'), get(bindings, 'b')),
	{ name: 'diff-cubes-symbolic', priority: 1 }
);

// a³ - b³ → (a-b)(a²+ab+b²) — numeric fallback (e.g., x³ - 27)
const diffCubesNumeric = createRule(
	P._(
		'expr',
		P.custom((n) => isDifferenceOfCubes(n) !== null)
	),
	(bindings) => {
		const detected = isDifferenceOfCubes(get(bindings, 'expr'))!;
		return buildDiffCubesFactored(detected.a, detected.b);
	},
	{ name: 'diff-cubes-numeric', priority: 0 }
);

// =============================================================================
// Expanding Rules (excluded from simplify — inverse of factoring)
// =============================================================================

// (a+b)(a-b) → a² - b²
const productToDiffSquares = createRule(
	P.mul(P.paren(P.add(P._('a'), P._('b'))), P.paren(P.sub(P._('a'), P._('b')))),
	(bindings) => {
		const a = get(bindings, 'a');
		const b = get(bindings, 'b');
		return subtract(superscript(a, number('2')), superscript(b, number('2')));
	},
	{ name: 'product-to-diff-squares' }
);

// (a+b)² → a² + 2ab + b²
const expandSumSquared = createRule(
	P.pow(P.paren(P.add(P._('a'), P._('b'))), P.num(2)),
	(bindings) => {
		const a = get(bindings, 'a');
		const b = get(bindings, 'b');
		return add(
			add(
				superscript(a, number('2')),
				multiply(number('2'), multiply(a, b, 'implicit'), 'implicit')
			),
			superscript(b, number('2'))
		);
	},
	{ name: 'expand-sum-squared' }
);

// (a-b)² → a² - 2ab + b²
const expandDiffSquared = createRule(
	P.pow(P.paren(P.sub(P._('a'), P._('b'))), P.num(2)),
	(bindings) => {
		const a = get(bindings, 'a');
		const b = get(bindings, 'b');
		return add(
			subtract(
				superscript(a, number('2')),
				multiply(number('2'), multiply(a, b, 'implicit'), 'implicit')
			),
			superscript(b, number('2'))
		);
	},
	{ name: 'expand-diff-squared' }
);

// =============================================================================
// Exports
// =============================================================================

export const algebraicFactoringRules: Rule[] = [
	diffSquaresSymbolic,
	diffSquaresNumeric,
	perfectSquareTrinomial,
	sumCubesSymbolic,
	sumCubesNumeric,
	diffCubesSymbolic,
	diffCubesNumeric
];

export const algebraicExpandingRules: Rule[] = [
	productToDiffSquares,
	expandSumSquared,
	expandDiffSquared
];

/** Rules used by simplify pipeline — factoring only (expanding is inverse) */
export const algebraicSimplifyRules: Rule[] = [...algebraicFactoringRules];
