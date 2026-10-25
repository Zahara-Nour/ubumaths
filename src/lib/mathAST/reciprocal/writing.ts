/**
 * L'écriture du manuel pour f⁻¹, sur l'écriture finale seulement (décisions
 * de David du 2026-10-13, docs/archive/wip/atelier-reciproque-phase0.md) :
 *
 * - **sous une racine**, le contenu du radicande sort : `factorPolynomial`
 *   (noyau de l'ADR 0024) le donne, `extractPerfectPower` (`normal/radical.ts`)
 *   en garde la partie parfaite, puis `tidy` simplifie avec le dénominateur :
 *   `√(4y + 12)/2 + 2` → `√(y + 3) + 2`, `∛(y/8 + 2)` → `∛(y + 16)/2` ;
 * - **une seule fraction** quand tous les termes d'une somme ont le même
 *   dénominateur entier, à chaque niveau (l'argument du ln compris) :
 *   `y/2 − 3/2` → `(y − 3)/2`, `ln(y/3 + 1/3)` → `ln((y + 1)/3)` ;
 * - **l'opposé d'un quotient** par une différence change l'ordre de la
 *   différence : `−y/(y − 1)` → `y/(1 − y)` (logistique).
 *
 * `tidy` ne factorise pas (mesuré le 2026-10-13) ; rien ne touche au moteur.
 *
 * @module mathAST/reciprocal/writing
 */

import type { MathNode } from '../types';
import { fraction, func, multiply, number, subtract, variable as variableNode } from '../factory';
import { isFunction, isNumber } from '../guards';
import { flattenSumShallow, unflattenSum } from '../flatten';
import { mapNode } from '../transforms';
import { nodesEqual } from '../normal/hash';
import { tidy } from '../tidy';
import { P } from '../pattern/builder';
import { tryMatch } from '../pattern/match';
import { getBindingNode } from '../pattern/types';
import { factorPolynomial, polynomialNode, toPolynomial } from '../factor';
import { extractPerfectPower } from '../normal/radical';
import { isInteger, mulRational, rational } from '../normal/rational';

const FRACTION = P.div(P._('n'), P._('d', P.isInteger()));

const OPPOSITE_OVER_DIFFERENCE = P.neg(P.div(P._('n'), P.sub(P._('a'), P._('b'))));

/** `a/d ± b/d` → `(a ± b)/d` ; sinon le nœud tel quel. */
function overCommonDenominator(node: MathNode): MathNode {
	const terms = flattenSumShallow(node);
	if (terms.length < 2) return node;
	let denominator: MathNode | null = null;
	const numerators = [];
	for (const { sign, term } of terms) {
		const bindings = tryMatch(FRACTION, term);
		const n = bindings && getBindingNode(bindings, 'n');
		const d = bindings && getBindingNode(bindings, 'd');
		if (!n || !d) return node;
		if (denominator !== null && !nodesEqual(denominator, d)) return node;
		denominator = d;
		numerators.push({ sign, term: n });
	}
	const numerator = unflattenSum(numerators);
	return numerator === null || denominator === null ? node : fraction(numerator, denominator);
}

/** `−n/(a − b)` → `n/(b − a)` ; sinon le nœud tel quel. */
function oppositeOverDifference(node: MathNode): MathNode {
	const bindings = tryMatch(OPPOSITE_OVER_DIFFERENCE, node);
	const n = bindings && getBindingNode(bindings, 'n');
	const a = bindings && getBindingNode(bindings, 'a');
	const b = bindings && getBindingNode(bindings, 'b');
	return n && a && b ? fraction(n, subtract(b, a)) : node;
}

/** Le radicande et l'indice d'une racine (`√`, `∛`, `root(u, n)`), ou null. */
function rootParts(node: MathNode): { radicand: MathNode; index: bigint } | null {
	if (!isFunction(node) || node.power !== undefined) return null;
	let indexNode: MathNode | null = null;
	if (node.name === 'sqrt' && node.args.length === 1) indexNode = node.base ?? number('2');
	if (node.name === 'root' && node.args.length === 2) indexNode = node.args[1];
	if (indexNode === null || !isNumber(indexNode) || !/^\d+$/.test(indexNode.value)) return null;
	const index = BigInt(indexNode.value);
	return index >= 2n ? { radicand: node.args[0], index } : null;
}

/**
 * `ⁿ√(c·Q)` → `k·ⁿ√(r·Q)` quand c = kⁿ·r : la partie parfaite du contenu c
 * (numérateur et dénominateur) sort de la racine. Le radicande réécrit doit
 * être à coefficients entiers ; sinon le nœud tel quel.
 */
function contentOutOfRoot(node: MathNode, letter: string): MathNode {
	const root = rootParts(node);
	if (root === null || !isFunction(node)) return node;
	const factorization = factorPolynomial(root.radicand, letter);
	const poly = toPolynomial(root.radicand, letter);
	if (factorization === null || poly === null || factorization.constant.n === 0n) return node;
	const { n, d } = factorization.constant;
	const [outOfNumerator] = extractPerfectPower(n < 0n ? -n : n, root.index);
	const [outOfDenominator] = extractPerfectPower(d, root.index);
	if (outOfNumerator === 1n && outOfDenominator === 1n) return node;
	const scale = rational(outOfDenominator ** root.index, outOfNumerator ** root.index);
	const scaled = poly.map((c) => mulRational(c, scale));
	if (!scaled.every(isInteger)) return node;
	const radicand = polynomialNode(
		scaled.map((c) => c.n),
		variableNode(letter)
	);
	const rebuilt =
		node.name === 'root'
			? func('root', [radicand, node.args[1]])
			: func('sqrt', [radicand], node.base ? { base: node.base } : undefined);
	const out = (k: bigint): MathNode => number(k.toString());
	const factor =
		outOfDenominator === 1n
			? out(outOfNumerator)
			: fraction(out(outOfNumerator), out(outOfDenominator));
	return multiply(factor, rebuilt, 'implicit');
}

/**
 * L'écriture du manuel de `node`, une expression en `letter` (le second
 * membre y de `y = f(x)`).
 */
export function textbookWriting(node: MathNode, letter: string): MathNode {
	const tidied = tidy(node);
	const extracted = mapNode(tidied, (n) => contentOutOfRoot(n, letter));
	const settled = nodesEqual(extracted, tidied) ? tidied : tidy(extracted);
	return mapNode(settled, (n) => oppositeOverDifference(overCommonDenominator(n)));
}
