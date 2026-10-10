/**
 * Écriture des primitives en ln : la constante multiplicative de l'argument
 * est sortie du ln et absorbée dans la constante d'intégration.
 *
 *   ln|c·u| = ln|c| + ln|u|, et ln|c| est une constante : ½ ln|2x| → ½ ln|x|,
 *   ln|ln 2 · 2ˣ + ln 2| / ln 2 → ln|2ˣ + 1| / ln 2, ⅓ ln|3x + 6| → ⅓ ln|x + 2|.
 *
 * Valide pour une PRIMITIVE (définie à une constante près) ET pour une
 * intégrale définie : la constante ln|c| s'annule dans F(b) − F(a), sur tout
 * intervalle où F est définie (ln|c| ne dépend pas de l'intervalle).
 *
 * Garde-fous :
 * - seulement quand le ln apparaît LINÉAIREMENT dans la primitive (somme de
 *   constante × ln) : dans x·ln(2x) ou (ln 2x)², la constante ne s'absorbe pas ;
 * - facteur commun = PGCD des coefficients entiers et facteurs constants
 *   SANS paramètre communs à tous les termes (ln 2, √3) ; un paramètre
 *   littéral n'est jamais sorti (son signe et sa nullité sont inconnus) ;
 * - ln(c·u) SANS valeur absolue (u > 0 prouvé) : seulement si c > 0 ;
 *   ln|c·u| : c ≠ 0 suffit.
 *
 * Un argument sans facteur commun (2x + 1) est gardé tel quel : ½ ln|2x + 1|.
 *
 * @module mathAST/integration/ln-constant
 */

import type { MathNode } from '../types';
import { isFunction, isNumber } from '../guards';
import { func, number } from '../factory';
import {
	flattenSumShallow,
	flattenProductShallow,
	unflattenSum,
	unflattenProduct,
	type FlatProduct
} from '../flatten';
import { extractExactRational } from '../common/numeric';
import { nodesEqual } from '../normal/hash';
import { compile } from '../eval/compile';
import { getVariables } from '../eval/substitute';
import { containsVariable } from './rules';

// =============================================================================
// Types
// =============================================================================

/** Un terme de l'argument : coefficient entier × constantes × partie en x */
type SplitTerm = {
	readonly sign: '+' | '-';
	readonly coefficient: bigint;
	readonly constants: readonly MathNode[];
	readonly rest: FlatProduct;
};

// =============================================================================
// Constantes sans paramètre
// =============================================================================

function constantValue(node: MathNode): number | null {
	if (getVariables(node).size > 0) return null;
	try {
		const value = compile(node)({});
		return Number.isFinite(value) && value !== 0 ? value : null;
	} catch {
		return null;
	}
}

// =============================================================================
// Décomposition de l'argument
// =============================================================================

function splitTerm(sign: '+' | '-', term: MathNode, variable: string): SplitTerm | null {
	let coefficient = 1n;
	const constants: MathNode[] = [];
	const rest: FlatProduct[number][] = [];
	for (const styled of flattenProductShallow(term)) {
		const factor = styled.factor;
		if (containsVariable(factor, variable)) {
			rest.push(styled);
			continue;
		}
		if (isNumber(factor)) {
			const rational = extractExactRational(factor);
			if (rational === null || rational.d !== 1n) return null;
			coefficient *= rational.n;
			continue;
		}
		if (constantValue(factor) === null) return null;
		constants.push(factor);
	}
	return { sign, coefficient, constants, rest };
}

function gcd(a: bigint, b: bigint): bigint {
	return b === 0n ? a : gcd(b, a % b);
}

/** Argument divisé par son facteur constant commun, ou null s'il n'y en a pas */
function divideByCommonFactor(
	argument: MathNode,
	variable: string,
	requirePositive: boolean
): MathNode | null {
	const terms: SplitTerm[] = [];
	for (const { sign, term } of flattenSumShallow(argument)) {
		const split = splitTerm(sign, term, variable);
		if (split === null) return null;
		terms.push(split);
	}
	const divisor = terms.reduce((acc, term) => gcd(acc, term.coefficient), 0n);
	const shared = terms[0].constants.filter((candidate) =>
		terms.every((term) => term.constants.some((c) => nodesEqual(c, candidate)))
	);
	if (divisor <= 1n && shared.length === 0) return null;
	if (requirePositive && shared.some((c) => (constantValue(c) ?? 0) < 0)) return null;

	const rebuilt = terms.map(({ sign, coefficient, constants, rest }) => {
		const remaining = [...constants];
		for (const common of shared) {
			remaining.splice(
				remaining.findIndex((c) => nodesEqual(c, common)),
				1
			);
		}
		const quotient = divisor > 1n ? coefficient / divisor : coefficient;
		const factors: FlatProduct[number][] = [
			...(quotient !== 1n
				? [{ style: 'implicit' as const, factor: number(String(quotient)) }]
				: []),
			...remaining.map((factor) => ({ style: 'implicit' as const, factor })),
			...rest
		];
		return { sign, term: unflattenProduct(factors) ?? number('1') };
	});
	return unflattenSum(rebuilt);
}

// =============================================================================
// Réécriture
// =============================================================================

function absorbInLn(node: MathNode, variable: string): MathNode {
	if (!isFunction(node) || node.name !== 'ln' || node.args.length !== 1) return node;
	const argument = node.args[0];
	if (!containsVariable(argument, variable)) return node;
	if (isFunction(argument) && argument.name === 'abs' && argument.args.length === 1) {
		const divided = divideByCommonFactor(argument.args[0], variable, false);
		return divided === null ? node : func('ln', [func('abs', [divided])]);
	}
	const divided = divideByCommonFactor(argument, variable, true);
	return divided === null ? node : func('ln', [divided]);
}

/** Parcourt la primitive en ne descendant que là où le ln reste linéaire */
function rewriteLinear(node: MathNode, variable: string): MathNode {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
			return {
				...node,
				left: rewriteLinear(node.left, variable),
				right: rewriteLinear(node.right, variable)
			};
		case 'opposite':
			return { ...node, operand: rewriteLinear(node.operand, variable) };
		case 'delimiter':
			return { ...node, content: rewriteLinear(node.content, variable) };
		case 'division':
			return containsVariable(node.denominator, variable)
				? node
				: { ...node, numerator: rewriteLinear(node.numerator, variable) };
		case 'multiplication': {
			const factors = flattenProductShallow(node);
			const variableFactors = factors.filter((f) => containsVariable(f.factor, variable));
			if (variableFactors.length !== 1) return node;
			const rewritten = factors.map((f) =>
				containsVariable(f.factor, variable)
					? { ...f, factor: rewriteLinear(f.factor, variable) }
					: f
			);
			return unflattenProduct(rewritten) ?? node;
		}
		case 'function':
			return absorbInLn(node, variable);
		default:
			return node;
	}
}

/** ln|c·u| → ln|u| (constante absorbée) dans une primitive finale */
export function absorbLnConstantFactors(expr: MathNode, variable: string): MathNode {
	return rewriteLinear(expr, variable);
}
