/**
 * Le registre des coefficients d'une primitive (R5, Q42 b — David, 2026-10-24)
 *
 * Quand l'intégrande tape un décimal, la primitive s'écrit dans UN registre :
 * - chaque coefficient a une écriture décimale finie → tous en décimal
 *   (`3x²/10 + 1,2x` → `0,3x² + 1,2x`, `\dfrac{1}{2}\ln|x|` → `0,5\ln|x|`) ;
 * - sinon → tous en fraction (`x³/3 + 0,5x` → `x³/3 + x/2`).
 *
 * Un coefficient entier va avec les deux. Seuls les coefficients DEVANT les
 * termes sont lus : un terme qui porte un nombre non entier ailleurs
 * (`(0,5x + 1)eˣ`) laisse la primitive telle quelle. Partagé par les
 * corrections (`pedagogical-integration`) et `.intégrer` de l'Atelier.
 *
 * @module mathAST/integration/coefficient-register
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { multiply, number } from '../factory';
import {
	flattenProductShallow,
	flattenSumShallow,
	unflattenProduct,
	unflattenSum
} from '../flatten';
import type { Sign } from '../flatten';
import { extractExactRational, rationalToNode } from '../common/numeric';
import { absRational, mulRational, divRational, negRational, ONE } from '../normal/rational';
import { isDivision, isNumber } from '../guards';
import { findNodes } from '../transforms';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import { tidy } from '../tidy';

/** Un terme lu « coefficient × reste » ; `decimal` : le coefficient tapait un décimal. */
type CoefficientTerm = {
	readonly k: Rational;
	readonly rest: MathNode | null;
	readonly decimal: boolean;
};

/**
 * `primitive` réécrite dans un seul registre quand `integrand` tape un décimal ;
 * sinon, ou sur un terme de forme imprévue, `primitive` telle quelle.
 */
export function withUniformCoefficients(primitive: MathNode, integrand: MathNode): MathNode {
	if (!hasDecimalLiteral(integrand)) return primitive;
	const terms = flattenSumShallow(primitive);
	const parts = terms.map(({ term }) => coefficientTerm(term));
	if (parts.some((part) => part === null)) return primitive;
	const read = parts as CoefficientTerm[];
	const allDecimal = read.every(({ k }) => decimalString(absRational(k)) !== null);
	const rewritten = terms.map(({ sign, term }, i) => {
		const part = read[i];
		if (part.k.d === 1n && !part.decimal) return { sign, term };
		if (!allDecimal && !part.decimal) return { sign, term };
		const negative = part.k.n < 0n;
		const magnitude = absRational(part.k);
		const written = allDecimal
			? decimalTerm(magnitude, part.rest)
			: fractionTerm(magnitude, part.rest);
		return { sign: negative ? flip(sign) : sign, term: written };
	});
	return unflattenSum(rewritten) ?? primitive;
}

function flip(sign: Sign): Sign {
	return sign === '+' ? '-' : '+';
}

/** `0,3x²` : le coefficient en décimal devant le reste. */
function decimalTerm(k: Rational, rest: MathNode | null): MathNode {
	// `decimalString` est non null : `allDecimal` l'a vérifié
	const value = number(decimalString(k) ?? '0');
	if (rest === null) return value;
	return k.n === k.d ? rest : multiply(value, rest, 'implicit');
}

/** `x/2` : le terme écrit par `tidy`, qui l'écrit en fraction (aucun décimal lu). */
function fractionTerm(k: Rational, rest: MathNode | null): MathNode {
	const coefficient = rationalToNode(k);
	return rest === null ? coefficient : tidy(multiply(coefficient, rest, 'implicit'));
}

/**
 * Le terme lu « coefficient × reste » : `0.3x^2`, `\dfrac{3x^2}{10}`,
 * `\dfrac{1}{2}e^{2x}`, `5`, `x^3` ; `null` quand un nombre non entier reste
 * ailleurs que devant.
 */
function coefficientTerm(term: MathNode): CoefficientTerm | null {
	const read = readTerm(term);
	if (read === null) return null;
	if (read.rest !== null && hasLooseNumber(read.rest)) return null;
	return read;
}

function readTerm(term: MathNode): CoefficientTerm | null {
	if (term.type === 'opposite') {
		const inner = readTerm(term.operand);
		return inner && { ...inner, k: negRational(inner.k) };
	}
	if (isNumber(term)) {
		const k = extractExactRational(term);
		return k && { k, rest: null, decimal: !isIntegerText(term.value) };
	}
	if (isDivision(term) && isNumber(term.denominator) && isIntegerText(term.denominator.value)) {
		const d = extractExactRational(term.denominator);
		const top = readTerm(term.numerator);
		if (top === null || d === null || d.n === 0n) return null;
		return { ...top, k: divRational(top.k, d) };
	}
	if (term.type === 'multiplication') {
		const factors = flattenProductShallow(term);
		const numeric = factors.filter(({ factor }) => isNumericCoefficient(factor));
		const others = factors.filter(({ factor }) => !isNumericCoefficient(factor));
		let k = ONE;
		for (const { factor } of numeric) {
			const value = extractExactRational(factor);
			if (value === null) return null;
			k = mulRational(k, value);
		}
		const decimal = numeric.some(({ factor }) => isNumber(factor) && !isIntegerText(factor.value));
		return { k, rest: unflattenProduct(others), decimal };
	}
	return { k: ONE, rest: term, decimal: false };
}

/** Un nombre écrit (`3`, `0.5`) ou une fraction de deux entiers écrits (`\dfrac{1}{2}`). */
function isNumericCoefficient(node: MathNode): boolean {
	return isNumber(node) || isNumericFraction(node);
}

function isNumericFraction(node: MathNode): boolean {
	return (
		isDivision(node) &&
		isNumber(node.numerator) &&
		isNumber(node.denominator) &&
		isIntegerText(node.numerator.value) &&
		isIntegerText(node.denominator.value)
	);
}

/** Un nombre non entier ou une fraction de nombres sous le reste : `(0,5x + 1)`, `x^{1/2}`. */
function hasLooseNumber(node: MathNode): boolean {
	return (
		findNodes(node, (n) => (isNumber(n) && !isIntegerText(n.value)) || isNumericFraction(n))
			.length > 0
	);
}

function isIntegerText(value: string): boolean {
	return /^\d+$/.test(value);
}
