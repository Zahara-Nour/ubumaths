/**
 * Le registre des coefficients d'une primitive (R5, Q42 b — David, 2026-10-24)
 *
 * Quand l'intégrande tape un décimal, la primitive s'écrit dans UN registre :
 * - chaque coefficient a une écriture décimale finie → tous en décimal
 *   (`3x²/10 + 1,2x` → `0,3x² + 1,2x`, `\dfrac{1}{2}\ln|x|` → `0,5\ln|x|`) ;
 * - sinon → tous en fraction (`x³/3 + 0,5x` → `x³/3 + x/2`).
 *
 * Un coefficient entier va avec les deux. Sont lus les coefficients devant les
 * termes, et ceux d'UNE somme facteur d'un terme (`(x/2 − 1/2)eˣ` →
 * `(0,5x − 0,5)eˣ`, revue de 5f-2) ; un nombre non entier ailleurs (exposant,
 * argument d'une fonction) laisse la primitive telle quelle. Partagé par les
 * corrections (`pedagogical-integration`) et `.intégrer` de l'Atelier.
 *
 * @module mathAST/integration/coefficient-register
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { delimiter, multiply, number } from '../factory';
import {
	flattenProductShallow,
	flattenSumShallow,
	unflattenProduct,
	unflattenSum
} from '../flatten';
import type { FlatProduct, Sign } from '../flatten';
import { extractExactRational, rationalToNode } from '../common/numeric';
import { absRational, mulRational, divRational, negRational, ONE } from '../normal/rational';
import { isDivision, isNumber } from '../guards';
import { findNodes } from '../transforms';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import { tidy } from '../tidy';
import { getVariables } from '../eval/substitute';
import { exactValueToShow } from '../eval/exact-value';

/** Une somme lue terme à terme. */
type ReadSum = readonly {
	readonly sign: Sign;
	readonly term: MathNode;
	readonly part: CoefficientTerm;
}[];

/**
 * Un terme lu « coefficient × reste » ; `decimal` : le coefficient tapait un
 * décimal ; `nested` : la somme facteur du reste, lue elle aussi.
 */
type CoefficientTerm = {
	readonly k: Rational;
	readonly rest: MathNode | null;
	readonly decimal: boolean;
	readonly nested: NestedSum | null;
};

/** La somme facteur du reste : `factors[index]`, entre parenthèses. */
type NestedSum = {
	readonly factors: FlatProduct;
	readonly index: number;
	readonly sum: ReadSum;
};

/**
 * `primitive` réécrite dans un seul registre quand `integrand` tape un décimal ;
 * sinon, ou sur un terme de forme imprévue, `primitive` telle quelle.
 */
export function withUniformCoefficients(primitive: MathNode, integrand: MathNode): MathNode {
	if (!hasDecimalLiteral(integrand)) return primitive;
	const sum = readSum(primitive);
	if (sum === null) return primitive;
	const allDecimal = coefficients(sum).every((k) => decimalString(absRational(k)) !== null);
	return writeSum(sum, allDecimal) ?? primitive;
}

/**
 * La VALEUR d'une intégrale bornée quand `integrand` tape un décimal (Q49 —
 * David, 2026-10-25) : un rationnel en décimal si son écriture est finie
 * (`0,25`), sinon en fraction (`1/6`) ; une constante irrationnelle n'a pas
 * d'écriture décimale finie (Q22) : écrite par la valeur exacte à afficher
 * (`√2/4`, pas `0,25√2`) ; une valeur à paramètre comme une primitive (`0,25a`).
 */
export function withValueInRegister(value: MathNode, integrand: MathNode): MathNode {
	if (!hasDecimalLiteral(integrand)) return value;
	const irrational = getVariables(value).size === 0 && extractExactRational(value) === null;
	return irrational ? exactValueToShow(value) : withUniformCoefficients(value, integrand);
}

function readSum(node: MathNode): ReadSum | null {
	const read: { sign: Sign; term: MathNode; part: CoefficientTerm }[] = [];
	for (const { sign, term } of flattenSumShallow(node)) {
		const part = coefficientTerm(term);
		if (part === null) return null;
		read.push({ sign, term, part });
	}
	return read;
}

/** Tous les coefficients de la somme, ceux de ses sommes facteurs compris. */
function coefficients(sum: ReadSum): Rational[] {
	return sum.flatMap(({ part }) => [part.k, ...(part.nested ? coefficients(part.nested.sum) : [])]);
}

function writeSum(sum: ReadSum, allDecimal: boolean): MathNode | null {
	return unflattenSum(
		sum.map(({ sign, term, part }) => {
			// Rien à réécrire : le terme tel quel (`\dfrac{x^3}{6}` reste)
			if (!rewrites(part, allDecimal) && part.nested === null) return { sign, term };
			return { sign: part.k.n < 0n ? flip(sign) : sign, term: writeTerm(part, allDecimal) };
		})
	);
}

/** Le terme, coefficient en valeur absolue (le signe passe à la somme). */
function writeTerm(part: CoefficientTerm, allDecimal: boolean): MathNode {
	const rest = part.nested ? withNestedSum(part.nested, allDecimal) : part.rest;
	const magnitude = absRational(part.k);
	if (rewrites(part, allDecimal))
		return allDecimal ? decimalTerm(magnitude, rest) : fractionTerm(magnitude, rest);
	// Coefficient gardé : écrit tel quel devant le reste réécrit
	if (rest === null) return rationalToNode(magnitude);
	return magnitude.n === magnitude.d ? rest : multiply(rationalToNode(magnitude), rest, 'implicit');
}

/** Le coefficient change d'écriture : décimal tapé, ou fraction passée en décimal. */
function rewrites(part: CoefficientTerm, allDecimal: boolean): boolean {
	return part.decimal || (allDecimal && part.k.d !== 1n);
}

function withNestedSum(nested: NestedSum, allDecimal: boolean): MathNode | null {
	const inner = writeSum(nested.sum, allDecimal);
	if (inner === null) return null;
	const factors = nested.factors.map((entry, i) =>
		i === nested.index ? { ...entry, factor: delimiter('parentheses', inner) } : entry
	);
	return unflattenProduct(factors);
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
 * `\dfrac{1}{2}e^{2x}`, `-\dfrac{3}{10}x^2`, `5`, `x^3`, `(\dfrac{x}{2} − \dfrac{1}{2})e^x` ;
 * `null` quand un nombre non entier reste ailleurs.
 */
function coefficientTerm(term: MathNode): CoefficientTerm | null {
	const read = readTerm(term);
	if (read === null || read.rest === null || !hasLooseNumber(read.rest)) return read;
	const nested = nestedSum(read.rest);
	return nested && { ...read, nested };
}

/** La seule somme facteur de `rest` qui porte les nombres non entiers, lue ; sinon `null`. */
function nestedSum(rest: MathNode): NestedSum | null {
	const factors = flattenProductShallow(rest);
	const loose = factors
		.map(({ factor }, index) => ({ factor, index }))
		.filter(({ factor }) => hasLooseNumber(factor));
	if (loose.length !== 1) return null;
	const { factor, index } = loose[0];
	const content = factor.type === 'delimiter' ? factor.content : factor;
	if (content.type !== 'addition' && content.type !== 'subtraction') return null;
	const sum = readSum(content);
	if (sum === null || sum.some(({ part }) => part.nested !== null)) return null;
	return { factors, index, sum };
}

function readTerm(term: MathNode): CoefficientTerm | null {
	if (term.type === 'opposite') {
		const inner = readTerm(term.operand);
		return inner && { ...inner, k: negRational(inner.k) };
	}
	if (isNumericCoefficient(term)) {
		const k = extractExactRational(term);
		return k && { k, rest: null, decimal: hasDecimalLiteral(term), nested: null };
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
		const decimal = numeric.some(({ factor }) => hasDecimalLiteral(factor));
		return { k, rest: unflattenProduct(others), decimal, nested: null };
	}
	return { k: ONE, rest: term, decimal: false, nested: null };
}

/**
 * Un nombre écrit (`3`, `0.5`), une fraction de deux entiers écrits
 * (`\dfrac{1}{2}`, `\dfrac{-3}{10}`), sous un éventuel − (`-\dfrac{3}{10}`,
 * qu'écrit le moteur de l'Atelier).
 */
function isNumericCoefficient(node: MathNode): boolean {
	if (node.type === 'opposite') return isNumericCoefficient(node.operand);
	return isNumber(node) || isNumericFraction(node);
}

function isNumericFraction(node: MathNode): boolean {
	if (!isDivision(node)) return false;
	const top = node.numerator.type === 'opposite' ? node.numerator.operand : node.numerator;
	return (
		isNumber(top) &&
		isNumber(node.denominator) &&
		isIntegerText(top.value) &&
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
