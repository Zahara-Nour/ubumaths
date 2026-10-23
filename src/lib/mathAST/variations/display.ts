/**
 * La dérivée telle qu'on l'écrit au-dessus d'un tableau de variations
 * (décision D2, lot 5b du chantier simplify-carte, 2026-10-23).
 *
 * ⚠️ L'élève lit le SIGNE de f′ dans ce qui est affiché. Deux écritures :
 *
 * 1. **La forme finale** (`finalDerivative`, lot 5a) : celle de `.dériver`,
 *    quotient divisé par le facteur commun quand le domaine de f le permet
 *    (Q18), exponentielle commune en facteur. C'est l'étape « Dérivée ».
 * 2. **La forme factorisée** : la politique `factoriser` (ADR 0024, lycée)
 *    sur le numérateur d'un quotient (dénominateur tel quel, un carré la
 *    plupart du temps), sur l'expression entière sinon. `x² − 2` →
 *    `(x − √2)(x + √2)`, `(x² + 2x)/(x + 1)²` → `x(x + 2)/(x + 1)²`,
 *    `(2x − x²)e^{−x}` → `x(2 − x)e^{−x}`. Un − devant reste
 *    (`−x(x + 4)/(x + 2)²`). L'ordre des facteurs et l'ordre interne d'un
 *    facteur sont ceux du noyau. La forme finale reste quand rien ne se
 *    factorise (`x² + 1`, `x² − 2x + 5`), quand seul un nombre sort devant
 *    une somme (`4x − 8`, `−(2x² + 18)/(x² − 9)²`), quand le budget est
 *    dépassé. Les exponentielles restent telles qu'écrites, exposant compris
 *    (`2x e^{x²−1}`, pas `e^{(x−1)(x+1)}`), et un décimal tapé reste décimal
 *    (`x(3x − 4,8)`, S1) — revue du lot 5b.
 *
 * Le calcul du signe ne lit ni l'une ni l'autre : il part de `result.derivative`.
 *
 * @module mathAST/variations/display
 */

import type { DivisionNode, MathNode, NumberNode } from '../types';
import {
	isDelimiter,
	isDivision,
	isFunction,
	isMultiplication,
	isNumber,
	isOpposite,
	isSuperscript
} from '../guards';
import { delimiter, divide, number, opposite } from '../factory';
import { findNodes, mapNode } from '../transforms';
import { flattenProductShallow, unflattenProduct } from '../flatten';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import { tidy } from '../tidy';
import { hashMathNode } from '../normal/hash';
import { generatePedagogicalSimplifySteps } from '../pedagogical-simplify/pipeline';
import { finalDerivative, isExponential } from '../pedagogical-differentiation/final-form';
import { toCustom } from '../custom-generator';

/** Le budget de la politique `factoriser`, comme celui d'`auto` dans final-form. */
const FACTOR_TIMEOUT_MS = 1000;

/** Les deux écritures de f′ d'une étude de variations. */
export interface DisplayedDerivatives {
	/** La forme finale de `.dériver` (lot 5a) */
	readonly final: MathNode;
	/** La forme où se lit le signe : `final` factorisée, ou `final` elle-même */
	readonly factored: MathNode;
}

/**
 * La forme finale de f′ et sa forme factorisée. Ne lève jamais.
 *
 * @param derivative - La dérivée calculée (`result.derivative`)
 * @param f - La fonction dérivée : son domaine est acquis pour f′ (S3)
 */
export function displayedDerivatives(derivative: MathNode, f: MathNode): DisplayedDerivatives {
	const final = finalDerivative(derivative, f);
	try {
		return { final, factored: factoredForSign(final) };
	} catch {
		return { final, factored: final };
	}
}

/**
 * f′ écrite pour qu'on y lise le signe : la forme factorisée. Pour le CLI.
 *
 * @param f - La fonction dérivée : son domaine est acquis pour f′ (S3)
 */
export function reducedDerivative(derivative: MathNode, f: MathNode): MathNode {
	return displayedDerivatives(derivative, f).factored;
}

/** Quotient (sous un éventuel −) : numérateur seul ; sinon l'expression entière. */
function factoredForSign(node: MathNode): MathNode {
	if (isOpposite(node) && isDivision(node.operand)) {
		const quotient = node.operand;
		const top = factored(quotient.numerator);
		return top === quotient.numerator
			? node
			: opposite(divide(top, quotient.denominator, quotient.displayStyle));
	}
	if (isDivision(node)) {
		const top = factored(node.numerator);
		return top === node.numerator ? node : divide(top, node.denominator, node.displayStyle);
	}
	return factored(node);
}

/**
 * `node` factorisée pour lire son signe, ou `node` elle-même (même référence)
 * si le candidat est refusé (`acceptable`) ou le budget dépassé. Un produit qui
 * porte des exponentielles n'est factorisé que HORS d'elles : leur exposant
 * reste écrit (`(2x − 2)e^{x²−2x}` → `2(x − 1)e^{x²−2x}`, jamais `e^{x(x−2)}`).
 */
function factored(node: MathNode): MathNode {
	const sign = isOpposite(node);
	const inner = sign ? node.operand : node;
	const factors = flattenProductShallow(inner);
	const exponentials = factors.filter(({ factor }) => isExponential(factor));
	const others = factors.filter(({ factor }) => !isExponential(factor));
	const rest = unflattenProduct(others);
	let candidate: MathNode | null;
	if (exponentials.length > 0 && rest !== null) {
		const top = kernelFactored(rest);
		const whole =
			top === null ? null : unflattenProduct([{ style: 'implicit', factor: top }, ...exponentials]);
		candidate = whole === null ? null : sign ? opposite(whole) : whole;
	} else {
		candidate = kernelFactored(node);
	}
	if (candidate === null) return node;
	const written = withTypedDecimals(tidy(candidate, { order: 'kept' }), node);
	return acceptable(written, node) ? written : node;
}

/** La politique `factoriser` (lycée), ou `null` si le budget est dépassé. */
function kernelFactored(node: MathNode): MathNode | null {
	const result = generatePedagogicalSimplifySteps(node, {
		intent: 'factoriser',
		schoolLevel: 'lycee',
		timeoutMs: FACTOR_TIMEOUT_MS
	});
	return result.aborted === true ? null : result.result;
}

/**
 * Un candidat qui aide à lire le signe (revue du lot 5b) :
 * - il change l'écriture, et n'est plus une somme ;
 * - ce n'est pas un nombre devant UNE somme (`2(e^{2x} − 2eˣ)`, `4(x − 2)`) :
 *   sortir le coefficient ne dit rien du signe ; `3(x − 1)(x + 1)` l'est.
 *   Sauf devant un polynôme de degré ≥ 2, forme de classe de la phase 0
 *   (`−2(x² + 9)/(x² − 9)²`, § 49 du journal) ;
 * - aucun facteur ne mêle racine et fraction (`x − √2/2`, `x − 1/3 − √10/3`) :
 *   `(1 − 2x²)e^{−x²}` se lit mieux (David, 2026-10-24) ; `x − 2√3` passe ;
 * - ses exponentielles sont celles de `node`, exposants compris ;
 * - un décimal tapé reste décimal (S1) : pas de fraction de nombres que
 *   `withTypedDecimals` n'a pu récrire (`3x² − 0,75` garde ses décimaux).
 */
function acceptable(candidate: MathNode, node: MathNode): boolean {
	if (hashMathNode(candidate) === hashMathNode(node)) return false;
	const inner = unwrap(isOpposite(candidate) ? candidate.operand : candidate);
	if (isSum(inner)) return false;
	const nonNumeric = flattenProductShallow(inner).filter(({ factor }) => !isNumericFactor(factor));
	if (nonNumeric.length === 1 && isSum(unwrap(nonNumeric[0].factor))) {
		if (!isPolynomialOfDegreeTwoOrMore(unwrap(nonNumeric[0].factor))) return false;
	}
	if (flattenProductShallow(inner).some(({ factor }) => isRootWithFraction(factor))) return false;
	if (exponentialKeys(candidate) !== exponentialKeys(node)) return false;
	if (hasDecimalLiteral(node) && findNodes(candidate, isNumericFraction).length > 0) return false;
	return true;
}

/**
 * Les fractions de nombres à écriture décimale finie récrites en décimal,
 * quand `node` portait un décimal tapé : `x(3x − 24/5)` → `x(3x − 4,8)`.
 */
function withTypedDecimals(candidate: MathNode, node: MathNode): MathNode {
	if (!hasDecimalLiteral(node)) return candidate;
	return mapNode(candidate, (current) => {
		if (!isNumericFraction(current)) return current;
		const decimal = decimalString({
			n: BigInt(current.numerator.value),
			d: BigInt(current.denominator.value)
		});
		return decimal === null ? current : number(decimal);
	});
}

/** `24/5` : un quotient de deux entiers positifs écrits. */
function isNumericFraction(
	node: MathNode
): node is DivisionNode & { numerator: NumberNode; denominator: NumberNode } {
	return (
		isDivision(node) &&
		isNumber(node.numerator) &&
		isNumber(node.denominator) &&
		/^\d+$/.test(node.numerator.value) &&
		/^\d+$/.test(node.denominator.value) &&
		node.denominator.value !== '0'
	);
}

/** Un nombre, sous un éventuel − ou des parenthèses. */
function isNumericFactor(node: MathNode): boolean {
	const inner = unwrap(node);
	return isNumber(inner) || (isOpposite(inner) && isNumber(unwrap(inner.operand)));
}

/** Les exponentielles d'une écriture, exposants compris, en une clé. */
function exponentialKeys(node: MathNode): string {
	return findNodes(node, isExponential)
		.map((n) => hashMathNode(n))
		.sort()
		.join('|');
}

/** Une somme sans fonction ni exponentielle, avec au moins une puissance : `x² + 9`. */
function isPolynomialOfDegreeTwoOrMore(node: MathNode): boolean {
	if (findNodes(node, (n) => isFunction(n) || isExponential(n)).length > 0) return false;
	return findNodes(node, isSuperscript).length > 0;
}

/** Un facteur qui porte à la fois une racine carrée et une fraction : `x − √2/2`. */
function isRootWithFraction(factor: MathNode): boolean {
	const hasRoot = findNodes(factor, (n) => isFunction(n) && n.name === 'sqrt').length > 0;
	return hasRoot && findNodes(factor, isDivision).length > 0;
}

function isSum(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}

function unwrap(node: MathNode): MathNode {
	let current = node;
	while (isDelimiter(current)) current = current.content;
	return current;
}

/**
 * Une expression en notation de texte lisible : `-2/(2x-1)^2`, `(x^2-2x)/(x-1)^2`,
 * jamais les accolades de la notation maison (`{-2}/{(2x-1)^2}`).
 *
 * Les fractions deviennent des divisions EN LIGNE, qui groupent leurs sommes
 * d'elles-mêmes ; un produit ou un quotient au dénominateur est mis entre
 * parenthèses (`1/(2x)`, jamais `1/2x`, qui se lirait (1/2)x).
 */
export function readableText(node: MathNode): string {
	const inline = mapNode(node, (current) => {
		if (!isDivision(current)) return current;
		const { denominator } = current;
		const grouped =
			isMultiplication(denominator) || isDivision(denominator) || isOpposite(denominator)
				? delimiter('parentheses', denominator)
				: denominator;
		return { ...current, denominator: grouped, displayStyle: 'inline' as const };
	});
	return toCustom(inline).replace(/:\//g, '/');
}
