/**
 * L'écriture du manuel pour f⁻¹ : `tidy`, puis une seule fraction quand tous
 * les termes d'une somme ont le même dénominateur entier.
 *
 * `tidy` rend `y/2 − 3/2` et `ln(y/3 + 1/3)` ; le manuel écrit `(y − 3)/2` et
 * `ln((y + 1)/3)`. On ne touche qu'à ce cas, à chaque niveau de l'arbre
 * (l'argument du ln compris), sans toucher au moteur.
 *
 * @module mathAST/reciprocal/writing
 */

import type { MathNode } from '../types';
import { fraction } from '../factory';
import { flattenSumShallow, unflattenSum } from '../flatten';
import { mapNode } from '../transforms';
import { nodesEqual } from '../normal/hash';
import { tidy } from '../tidy';
import { P } from '../pattern/builder';
import { tryMatch } from '../pattern/match';
import { getBindingNode } from '../pattern/types';

const FRACTION = P.div(P._('n'), P._('d', P.isInteger()));

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

export function textbookWriting(node: MathNode): MathNode {
	return mapNode(tidy(node), overCommonDenominator);
}
