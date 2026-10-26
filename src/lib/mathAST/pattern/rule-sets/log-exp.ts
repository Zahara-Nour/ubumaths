/**
 * Logarithm/Exponential Simplification Rules
 *
 * Inverse pairs:
 * - ln(e^x) = x
 * - e^(ln(x)) = x
 *
 * Known values:
 * - ln(1) = 0
 * - ln(e) = 1
 *
 * Logarithm properties:
 * - ln(x^n) = n*ln(x)
 * - ln(x*y) = ln(x) + ln(y)
 * - ln(x/y) = ln(x) - ln(y)
 *
 * @module mathAST/pattern/rule-sets/log-exp
 */

import { P } from '../builder';
import { createRule } from '../rule';
import { isMathNodeBinding, type MatchBindings, type Rule } from '../types';
import { euler, superscript } from '../../factory';
import { extractRational, numericNode } from '../../common/numeric';
import type { MathNode } from '../../types';
import { getVariables } from '../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';

// =============================================================================
// Log/Exp Inverse Rules
// =============================================================================

/**
 * `ln(x)` existe-t-il ? Un nombre doit être strictement positif (revue du § 4.2 :
 * `e^(2ln(−3))` donnait 9, `e^(ln(−3))` donnait −3) ; une lettre, le domaine le dit.
 */
function lnMayExist(x: MathNode): boolean {
	if (getVariables(x).size > 0) return true;
	try {
		return evaluateNodeToApproximatedNumber(x) > 0;
	} catch {
		return false;
	}
}

/** `lnMayExist` sur la liaison `x` d'une règle. */
function lnArgumentMayExist(bindings: MatchBindings): boolean {
	const x = bindings.get('x');
	return x !== undefined && isMathNodeBinding(x) && lnMayExist(x);
}

/** ln(e^x) = x */
const lnExp = createRule(P.func('ln', [P.pow(P.lit(euler()), P._('x'))]), P._('x'), {
	name: 'ln-exp'
});

/** e^(ln(x)) = x */
const expLn = createRule(P.pow(P.lit(euler()), P.func('ln', [P._('x')])), P._('x'), {
	name: 'exp-ln',
	condition: lnArgumentMayExist
});

/**
 * L'exposant `n·ln(x)`, n entier, lu dans un produit de nombres entiers et d'un
 * seul `ln` : `4ln(x)`, `ln(x)·4`, `2·(2ln(x))` (le `2·2` du moteur n'est
 * multiplié qu'après la boucle des règles), `−ln(x)`. `null` sinon.
 */
function integerTimesLn(exponent: MathNode): { n: bigint; arg: MathNode } | null {
	let n = 1n;
	let arg: MathNode | null = null;
	const visit = (node: MathNode): boolean => {
		if (node.type === 'delimiter') return visit(node.content);
		if (node.type === 'opposite') {
			n = -n;
			return visit(node.operand);
		}
		if (node.type === 'multiplication') return visit(node.left) && visit(node.right);
		if (node.type === 'function' && node.name === 'ln' && node.args.length === 1) {
			if (arg !== null) return false;
			arg = node.args[0];
			return true;
		}
		const value = extractRational(node);
		if (value === null || value.d !== 1n) return false;
		n *= value.n;
		return true;
	};
	if (!visit(exponent) || arg === null) return null;
	return { n, arg };
}

/**
 * e^(n·ln(x)) = xⁿ, n entier (tidy-conditions § 4.2) : le moteur passe de bas
 * en haut, `ln-pow` récrit `e^(ln(x²))` en `e^(2ln(x))` avant que `exp-ln`
 * ne voie la racine, et le calcul s'arrêtait là. `e^(ln(x))` reste à `exp-ln`.
 */
const expNLn = createRule(
	P.pow(P.lit(euler()), P._('e')),
	(bindings) => {
		const found = integerTimesLn(bindings.get('e') as MathNode) as { n: bigint; arg: MathNode };
		return superscript(found.arg, numericNode(found.n.toString()));
	},
	{
		name: 'exp-n-ln',
		condition: (bindings) => {
			const e = bindings.get('e');
			if (e === undefined || !isMathNodeBinding(e)) return false;
			const found = integerTimesLn(e);
			if (found === null || found.n === 1n) return false;
			return lnMayExist(found.arg);
		}
	}
);

// =============================================================================
// Known Values
// =============================================================================

/** ln(1) = 0 */
const lnOne = createRule(P.func('ln', [P.num(1)]), P.num(0), {
	name: 'ln-one'
});

/** ln(e) = 1 */
const lnE = createRule(P.func('ln', [P.lit(euler())]), P.num(1), {
	name: 'ln-e'
});

// =============================================================================
// Logarithm Properties
// =============================================================================

/** ln(x^n) = n * ln(x) */
const lnPow = createRule(
	P.func('ln', [P.pow(P._('x'), P._('n'))]),
	P.mul(P._('n'), P.func('ln', [P._('x')])),
	{ name: 'ln-pow' }
);

/** ln(x * y) = ln(x) + ln(y) */
const lnProduct = createRule(
	P.func('ln', [P.mul(P._('x'), P._('y'))]),
	P.add(P.func('ln', [P._('x')]), P.func('ln', [P._('y')])),
	{ name: 'ln-product' }
);

/** ln(x / y) = ln(x) - ln(y) */
const lnQuotient = createRule(
	P.func('ln', [P.div(P._('x'), P._('y'))]),
	P.sub(P.func('ln', [P._('x')]), P.func('ln', [P._('y')])),
	{ name: 'ln-quotient' }
);

// =============================================================================
// La fonction exp écrite exp(…)
// =============================================================================

// `exp(x)` n'est pas `e^x` pour les motifs : sans `normalize`, `réduire` et
// `auto` ne savaient plus réduire `ln(exp(x))` (chantier simplify-carte § 33).
// Les noms sont ceux des étapes de `normalize` qu'elles remplacent : l'élève
// garde les mêmes titres.

/** ln(exp(x)) = x */
const lnExpFunction = createRule(P.func('ln', [P.func('exp', [P._('x')])]), P._('x'), {
	name: 'ln-exp-inverse'
});

/** exp(ln(x)) = x */
const expFunctionLn = createRule(P.func('exp', [P.func('ln', [P._('x')])]), P._('x'), {
	name: 'exp-ln-inverse',
	condition: lnArgumentMayExist
});

/** exp(a) · exp(b) = exp(a + b) */
const expProduct = createRule(
	P.mul(P.func('exp', [P._('a')]), P.func('exp', [P._('b')])),
	P.func('exp', [P.add(P._('a'), P._('b'))]),
	{ name: 'exp-product' }
);

// =============================================================================
// Exports
// =============================================================================

export const logExpRules: readonly Rule[] = [
	lnExp,
	expLn,
	expNLn,
	lnOne,
	lnE,
	lnPow,
	lnProduct,
	lnQuotient
] as const;

/** La fonction écrite `exp(…)` : réciproque de ln, produit. Lues par le moteur pédagogique. */
export const expFunctionRules: readonly Rule[] = [
	lnExpFunction,
	expFunctionLn,
	expProduct
] as const;
