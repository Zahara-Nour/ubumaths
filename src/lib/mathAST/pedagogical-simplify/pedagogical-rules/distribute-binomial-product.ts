/**
 * Pedagogical rule — generic binomial product distribution.
 *
 * Matches `(α ± β)·(γ ± δ)` where each side is a parenthesised
 * `addition` or `subtraction`, and rewrites to the canonical four-term
 * pre-collected expansion:
 *
 *   (a + b)(c + d) → a·c + a·d + b·c + b·d
 *   (a + b)(c - d) → a·c - a·d + b·c - b·d
 *   (a - b)(c + d) → a·c + a·d - b·c - b·d
 *   (a - b)(c - d) → a·c - a·d - b·c + b·d
 *
 * One step ; the next pass (`combine-like-terms` from normalize) collapses
 * the four products into a polynomial in canonical form. Lower priority
 * than the dedicated identity rules (`expand-sum-squared`,
 * `expand-diff-squared`, `product-to-diff-squares`) so they fire first
 * on the cases they cover.
 *
 * V1 scope : binomial × binomial only. Trinomial × binomial,
 * `(a+b)(c+d)(e+f)` and `(a+b)^n` for n ≥ 3 fall through unchanged.
 *
 * @module mathAST/pedagogical-simplify/pedagogical-rules/distribute-binomial-product
 */

import type { MathNode } from '../../types';
import type { Rule, MatchBindings } from '../../pattern/types';
import { getBindingNode } from '../../pattern/types';
import { createRule } from '../../pattern/rule';
import { P } from '../../pattern/builder';
import { add, multiply, subtract } from '../../factory';
import { isAddition, isSubtraction } from '../../guards';

function get(b: MatchBindings, name: string): MathNode {
	const node = getBindingNode(b, name);
	if (!node) throw new Error(`distribute-binomial-product: missing binding '${name}'`);
	return node;
}

function isAddOrSub(n: MathNode): boolean {
	return isAddition(n) || isSubtraction(n);
}

function leftRightOf(n: MathNode): { left: MathNode; right: MathNode } {
	if (isAddition(n) || isSubtraction(n)) {
		return { left: n.left, right: n.right };
	}
	throw new Error('distribute-binomial-product: expected addition or subtraction node');
}

/**
 * Combine four implicit products via add/sub matching the (left, right) sign
 * pattern of the two binomials.
 *
 * leftSign, rightSign ∈ {'+', '-'} :
 *   (+, +) →  ac + ad + bc + bd
 *   (+, -) →  ac - ad + bc - bd
 *   (-, +) →  ac + ad - bc - bd
 *   (-, -) →  ac - ad - bc + bd
 */
function buildExpansion(
	a: MathNode,
	b: MathNode,
	c: MathNode,
	d: MathNode,
	leftSign: '+' | '-',
	rightSign: '+' | '-'
): MathNode {
	const ac = multiply(a, c, 'implicit');
	const ad = multiply(a, d, 'implicit');
	const bc = multiply(b, c, 'implicit');
	const bd = multiply(b, d, 'implicit');

	// First pair: ac (signRight) ad
	const pair1 = rightSign === '+' ? add(ac, ad) : subtract(ac, ad);

	// Sign of bc and bd in the final sum:
	//   leftSign=+ : keep rightSign for bd → pair2 = bc (signRight) bd, joined with `+`
	//   leftSign=- : flip rightSign for bd → pair2 = bc (flipRight) bd, joined with `-`
	const flippedRightSign: '+' | '-' = rightSign === '+' ? '-' : '+';

	if (leftSign === '+') {
		const pair2 = rightSign === '+' ? add(bc, bd) : subtract(bc, bd);
		return add(pair1, pair2);
	}
	// leftSign === '-'
	const pair2 = flippedRightSign === '+' ? add(bc, bd) : subtract(bc, bd);
	return subtract(pair1, pair2);
}

export const distributeBinomialProduct: Rule = createRule(
	P.mul(P.paren(P._('left')), P.paren(P._('right'))),
	(bindings) => {
		const left = get(bindings, 'left');
		const right = get(bindings, 'right');
		const { left: a, right: b } = leftRightOf(left);
		const { left: c, right: d } = leftRightOf(right);
		const leftSign: '+' | '-' = isAddition(left) ? '+' : '-';
		const rightSign: '+' | '-' = isAddition(right) ? '+' : '-';
		return buildExpansion(a, b, c, d, leftSign, rightSign);
	},
	{
		name: 'distribute-binomial-product',
		// Lower than default 0 so identités remarquables (default priority) win
		// when both apply. Single rule fires for all 4 sign combinations via the
		// dynamic replacement function.
		priority: -1,
		condition: (bindings) => {
			const left = getBindingNode(bindings, 'left');
			const right = getBindingNode(bindings, 'right');
			if (!left || !right) return false;
			return isAddOrSub(left) && isAddOrSub(right);
		}
	}
);
