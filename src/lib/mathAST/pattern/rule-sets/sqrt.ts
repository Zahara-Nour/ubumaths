/**
 * Square Root Simplification Rules
 *
 * Known values:
 * - sqrt(0) = 0
 * - sqrt(1) = 1
 *
 * Structural rules:
 * - sqrt(x) * sqrt(y) = sqrt(x * y)
 * - sqrt(x / y) = sqrt(x) / sqrt(y)
 *
 * @module mathAST/pattern/rule-sets/sqrt
 */

import { multiply } from '../../factory';
import { hashMathNode } from '../../normal/hash';
import type { MathNode } from '../../types';
import { P } from '../builder';
import { createRule } from '../rule';
import { getBindingNode } from '../types';
import type { Rule } from '../types';

// =============================================================================
// Known Values
// =============================================================================

/** sqrt(0) = 0 */
const sqrtZero = createRule(P.func('sqrt', [P.num(0)]), P.num(0), {
	name: 'sqrt-zero'
});

/** sqrt(1) = 1 */
const sqrtOne = createRule(P.func('sqrt', [P.num(1)]), P.num(1), {
	name: 'sqrt-one'
});

// =============================================================================
// Structural Rules
// =============================================================================

/**
 * Le nœud est-il une racine CARRÉE, indice absent ?
 *
 * ⚠️ `parseLatex('\\sqrt[3]{x}')` rend une fonction nommée `sqrt` avec **un
 * seul argument**, l'indice vivant à part dans `base`. Un motif qui ne teste
 * que le nom confond donc `∛x` et `√x`. Sans ce garde, `∛x · ∛x` devenait
 * `√(x·x)` puis `|x|` — un faux positif, `|x|` n'étant pas la valeur, qui est
 * `x^{2/3}`. Même angle mort que dans `normal/rules/radicals.ts` et dans deux
 * endroits de `normal/normalize.ts`.
 */
function isPlainSqrt(node: MathNode): boolean {
	return (
		node.type === 'function' &&
		node.name === 'sqrt' &&
		node.args.length === 1 &&
		node.base === undefined
	);
}

/** Le radicande d'une racine carrée simple. */
function plainRadicand(node: MathNode): MathNode {
	return (node as MathNode & { type: 'function' }).args[0];
}

/**
 * `√x · √y = √(xy)`, et `√x · √x = x`.
 *
 * ⚠️ Radicandes IDENTIQUES : on rend le radicande, pas `√(a·a)`. La fusion
 * n'est licite que parce que les deux radicaux sont ÉCRITS, donc que `a ≥ 0` ;
 * fabriquer un carré perdrait cette information, et la règle `√(a²) = |a|` la
 * recevrait sans savoir d'où elle vient. C'est ce qui faisait rendre `|x|` à
 * `√x · √x`, là où `simplify` rend `x`.
 */
const sqrtProduct = createRule(
	P.mul(P._('a'), P._('b')),
	(bindings) => {
		const left = getBindingNode(bindings, 'a');
		const right = getBindingNode(bindings, 'b');
		// Inatteignable : `condition` a déjà exigé deux racines carrées simples.
		if (!left || !right) throw new Error('sqrt-product: membres du produit absents');
		const x = plainRadicand(left);
		const y = plainRadicand(right);
		return hashMathNode(x) === hashMathNode(y)
			? x
			: { type: 'function', name: 'sqrt', args: [multiply(x, y, 'implicit')] };
	},
	{
		name: 'sqrt-product',
		condition: (bindings) => {
			const left = getBindingNode(bindings, 'a');
			const right = getBindingNode(bindings, 'b');
			return left !== null && right !== null && isPlainSqrt(left) && isPlainSqrt(right);
		}
	}
);

/** sqrt(x / y) = sqrt(x) / sqrt(y) */
const sqrtQuotient = createRule(
	P.func('sqrt', [P.div(P._('x'), P._('y'))]),
	P.div(P.func('sqrt', [P._('x')]), P.func('sqrt', [P._('y')])),
	{ name: 'sqrt-quotient' }
);

// =============================================================================
// Exports
// =============================================================================

export const sqrtRules: readonly Rule[] = [sqrtZero, sqrtOne, sqrtProduct, sqrtQuotient] as const;
