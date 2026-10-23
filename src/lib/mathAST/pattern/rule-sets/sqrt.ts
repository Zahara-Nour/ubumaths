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

import { divide, func, multiply } from '../../factory';
import { hashMathNode } from '../../normal/hash';
import type { MathNode } from '../../types';
import { P } from '../builder';
import { tryMatch } from '../match';
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
export function isPlainSqrt(node: MathNode): boolean {
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

/**
 * sqrt(x / y) = sqrt(x) / sqrt(y) — racine carrée seulement : l'indice perdu,
 * `∛(x/2)` devenait `√x/√2` (lot 5a de simplify-carte).
 */
const sqrtQuotient = createRule(
	P._('root', P.custom(isPlainSqrt, 'racine carrée')),
	(bindings) => {
		const quotient = quotientRadicand(getBindingNode(bindings, 'root'));
		// Inatteignable : `condition` a déjà exigé √(x/y).
		if (quotient === null) throw new Error('sqrt-quotient: radicande quotient absent');
		return divide(func('sqrt', [quotient.x]), func('sqrt', [quotient.y]), 'fraction');
	},
	{
		name: 'sqrt-quotient',
		condition: (bindings) => quotientRadicand(getBindingNode(bindings, 'root')) !== null
	}
);

/** Le motif du radicande de `√(x/y)`. */
const QUOTIENT = P.div(P._('x'), P._('y'));

/** `x` et `y` quand le nœud est la racine carrée `√(x/y)`, sinon `null`. */
function quotientRadicand(
	root: MathNode | null
): { readonly x: MathNode; readonly y: MathNode } | null {
	if (root === null || !isPlainSqrt(root) || (root.type === 'function' && root.power !== undefined))
		return null;
	const bindings = tryMatch(QUOTIENT, plainRadicand(root));
	if (bindings === undefined) return null;
	const x = getBindingNode(bindings, 'x');
	const y = getBindingNode(bindings, 'y');
	return x === null || y === null ? null : { x, y };
}

// =============================================================================
// Exports
// =============================================================================

export const sqrtRules: readonly Rule[] = [sqrtZero, sqrtOne, sqrtProduct, sqrtQuotient] as const;
