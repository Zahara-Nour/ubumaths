/**
 * Pedagogical Limits — les décimaux tapés restent décimaux (lot 5f-3, R7 ;
 * Q45, David, 2026-10-24)
 *
 * Quand l'expression tape un décimal, les étapes l'écrivent comme la réponse
 * de la ligne (S1) : un nombre à écriture décimale finie en décimal
 * (`\dfrac{1}{2}` → `0,5`, `\dfrac{x + 1}{2}` → `0,5(x + 1)`), sinon en
 * fraction (`\dfrac{1}{3}` reste). Le pipeline calcule en rationnels exacts ;
 * l'écriture se choisit ici, une fois, sur les étapes finies.
 *
 * Sont lus les nombres et les coefficients : ni l'exposant d'une puissance, ni
 * l'argument d'une fonction (`\sqrt{x/4}`, `e^{x/2}` restent ; la racine d'un
 * nombre, si : `\sqrt{0,16}`), ni un quotient
 * qui porte une constante (`π/4` reste) — comme `withDecimalCoefficients`
 * (`variations/display.ts`). L'expression tapée elle-même n'est pas récrite.
 *
 * @module mathAST/pedagogical-limits/decimal-register
 */

import type { MathNode, DivisionNode, NumberNode } from '../types';
import { multiply, number, opposite, parentheses } from '../factory';
import {
	flattenProductShallow,
	flattenSumShallow,
	unflattenProduct,
	unflattenSum
} from '../flatten';
import type { FlatSum } from '../flatten';
import { isAddition, isNumber, isSubtraction } from '../guards';
import { findNodes } from '../transforms';
import { getVariables } from '../eval/substitute';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import type { PedagogicalLimitStep, TermLimits, LimitLine, LimitBindings } from './types';

/**
 * Les étapes écrites dans le registre de `expression` : décimal quand elle
 * tape un décimal, sinon telles quelles.
 */
export function stepsInRegister(
	steps: readonly PedagogicalLimitStep[],
	expression: MathNode
): readonly PedagogicalLimitStep[] {
	if (!hasDecimalLiteral(expression)) return steps;
	// L'expression tapée garde son écriture (`\dfrac{x}{4}` tapé reste)
	const write = (node: MathNode): MathNode =>
		node === expression ? node : inDecimalRegister(node);
	const rewrite = (step: PedagogicalLimitStep): PedagogicalLimitStep => ({
		...step,
		before: write(step.before),
		after: write(step.after),
		...(step.chain && { chain: step.chain.map(write) }),
		...(step.globalAfter && { globalAfter: write(step.globalAfter) }),
		...(step.bindings && { bindings: bindingsWith(step.bindings, write) }),
		...(step.termLimits && { termLimits: termLimitsWith(step.termLimits, write) }),
		...(step.subSteps && { subSteps: step.subSteps.map(rewrite) })
	});
	return steps.map(rewrite);
}

/** Les nombres et coefficients à écriture décimale finie de `node`, en décimal. */
export function inDecimalRegister(node: MathNode): MathNode {
	switch (node.type) {
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return {
				...node,
				left: inDecimalRegister(node.left),
				right: inDecimalRegister(node.right)
			};
		case 'opposite':
			return { ...node, operand: inDecimalRegister(node.operand) };
		case 'delimiter':
			return { ...node, content: inDecimalRegister(node.content) };
		case 'superscript':
			return { ...node, base: inDecimalRegister(node.base) };
		// La racine d'un NOMBRE est un nombre : `\sqrt{0,16}`, comme `Δ = 0,16`
		// (lot 5f-4) ; `\sqrt{x/4}` reste
		case 'function':
			return node.name === 'sqrt' && getVariables(node).size === 0
				? { ...node, args: node.args.map(inDecimalRegister) }
				: node;
		case 'division': {
			const division: DivisionNode = {
				...node,
				numerator: inDecimalRegister(node.numerator),
				denominator: inDecimalRegister(node.denominator)
			};
			return decimalQuotient(division) ?? division;
		}
		default:
			return node;
	}
}

function bindingsWith(bindings: LimitBindings, write: (n: MathNode) => MathNode): LimitBindings {
	return Object.fromEntries(Object.entries(bindings).map(([key, node]) => [key, write(node)]));
}

function termLimitsWith(limits: TermLimits, write: (n: MathNode) => MathNode): TermLimits {
	const line = (l: LimitLine): LimitLine => ({
		expression: write(l.expression),
		value: write(l.value)
	});
	return { premises: limits.premises.map(line), conclusions: limits.conclusions.map(line) };
}

/**
 * `k·reste / n` → `(k/n)·reste` quand k/n s'écrit en décimal fini :
 * `\dfrac{1}{2}` → `0,5`, `\dfrac{3x}{2}` → `1,5x`, `\dfrac{x + 1}{2}` →
 * `0,5(x + 1)`, `\dfrac{-x}{4}` → `-0,25x` ; `null` hors de cette forme.
 */
function decimalQuotient(node: DivisionNode): MathNode | null {
	if (!isPositiveInteger(node.denominator)) return null;
	if (node.numerator.type === 'opposite') {
		const inner = decimalQuotient({ ...node, numerator: node.numerator.operand });
		return inner && opposite(inner);
	}
	const factors = flattenProductShallow(node.numerator);
	const numeric = factors.map(({ factor }) => factor).filter(isNumber);
	if (numeric.length > 1 || (numeric.length === 1 && !isPositiveInteger(numeric[0]))) return null;
	const others = factors.filter(({ factor }) => !isNumber(factor));
	if (others.some(({ factor }) => findNodes(factor, (n) => n.type === 'constant').length > 0)) {
		return null;
	}
	const decimal = decimalString({
		n: numeric.length === 1 ? BigInt(numeric[0].value) : 1n,
		d: BigInt(node.denominator.value)
	});
	if (decimal === null) return null;
	const rest = unflattenProduct(others);
	if (rest === null) return number(decimal);
	if (decimal === '1') return rest;
	if (!isAddition(rest) && !isSubtraction(rest)) return multiply(number(decimal), rest, 'implicit');
	// Une somme qui commence par un − : le signe devant, `-0,5(x + 1)`, jamais `0,5(-x - 1)`
	const terms = flattenSumShallow(rest);
	const negated = leadingNegative(terms);
	const sum = negated === null ? rest : unflattenSum(negated);
	const product = multiply(number(decimal), parentheses(sum ?? rest), 'implicit');
	return negated === null ? product : opposite(product);
}

/** Les termes, signes inversés, quand le premier porte un − (`-x - 1` → `x + 1`) ; sinon `null`. */
function leadingNegative(terms: FlatSum): FlatSum | null {
	const [first] = terms;
	const leads = first.sign === '-' || first.term.type === 'opposite';
	if (!leads) return null;
	return terms.map(({ sign, term }, i) => {
		if (i === 0 && term.type === 'opposite') return { sign, term: term.operand };
		return { sign: sign === '+' ? '-' : '+', term };
	});
}

/** Un entier positif écrit : `5`. */
function isPositiveInteger(node: MathNode): node is NumberNode {
	return isNumber(node) && /^\d+$/.test(node.value) && node.value !== '0';
}
