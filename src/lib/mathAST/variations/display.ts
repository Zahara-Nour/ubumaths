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
import { delimiter, divide, multiply, number, opposite, variable } from '../factory';
import { findNodes, mapNode } from '../transforms';
import { flattenProductShallow, unflattenProduct } from '../flatten';
import { decimalString, hasDecimalLiteral } from '../tidy/decimal';
import { getVariables } from '../eval/substitute';
import { toPolynomial } from '../factor/polynomial';
import { rationalPolynomialNode } from '../factor/polynomial-node';
import { absRational, divRational } from '../normal/rational';
import { tidy } from '../tidy';
import { hashMathNode } from '../normal/hash';
import { generatePedagogicalSimplifySteps } from '../pedagogical-simplify/pipeline';
import { finalDerivative, isExponential } from '../pedagogical-differentiation/final-form';
import { toCustom } from '../custom-generator';

/** Le budget de la politique `factoriser`, comme celui d'`auto` dans final-form. */
const FACTOR_TIMEOUT_MS = 1000;

/**
 * Ce que la factorisation accepte en plus de la règle du tableau (D4, lot 5e) :
 * une forme factorisée DEMANDÉE par l'énoncé n'a pas à servir la lecture du signe.
 */
export interface FactoredFormOptions {
	/** Un nombre devant une somme : `8x − 8 → 8(x − 1)` (Q39, David 2026-10-24) */
	readonly numberBeforeSum?: boolean;
	/**
	 * Un facteur qui porte une fraction (`x(x²/3 + 1)`) : refusé quand `false`
	 * (primitive, Q34). Par défaut accepté, comme au tableau.
	 */
	readonly fractionInFactor?: boolean;
}

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

/**
 * `node` sous forme factorisée, ou `node` lui-même (même référence) quand rien
 * ne se factorise : la forme demandée par l'énoncé (D4). Ne lève jamais.
 */
export function factoredForm(node: MathNode, options: FactoredFormOptions = {}): MathNode {
	try {
		return factoredForSign(node, options);
	} catch {
		return node;
	}
}

/** Quotient (sous un éventuel −) : numérateur seul ; sinon l'expression entière. */
function factoredForSign(node: MathNode, options: FactoredFormOptions = {}): MathNode {
	if (isOpposite(node) && isDivision(node.operand)) {
		const quotient = node.operand;
		const top = factored(quotient.numerator, options);
		return top === quotient.numerator
			? node
			: opposite(divide(top, quotient.denominator, quotient.displayStyle));
	}
	if (isDivision(node)) {
		const top = factored(node.numerator, options);
		return top === node.numerator ? node : divide(top, node.denominator, node.displayStyle);
	}
	return factored(node, options);
}

/**
 * `node` factorisée pour lire son signe, ou `node` elle-même (même référence)
 * si le candidat est refusé (`acceptable`) ou le budget dépassé. Un produit qui
 * porte des exponentielles n'est factorisé que HORS d'elles : leur exposant
 * reste écrit (`(2x − 2)e^{x²−2x}` → `2(x − 1)e^{x²−2x}`, jamais `e^{x(x−2)}`).
 */
function factored(node: MathNode, options: FactoredFormOptions): MathNode {
	// Le coefficient décimal de tête devant d'abord (Q44 a), sinon la politique seule
	for (const kernel of [decimalLeadFactored, kernelFactored]) {
		const candidate = factoredWith(node, kernel);
		if (candidate === null) continue;
		const written = withDecimalCoefficients(
			withTypedDecimals(tidy(candidate, { order: 'kept' }), node),
			node
		);
		if (acceptable(written, node, options)) return written;
	}
	return node;
}

/** `node` factorisée par `kernel`, hors de ses exponentielles ; `null` si `kernel` échoue. */
function factoredWith(
	node: MathNode,
	kernel: (node: MathNode) => MathNode | null
): MathNode | null {
	const sign = isOpposite(node);
	const inner = sign ? node.operand : node;
	const factors = flattenProductShallow(inner);
	const exponentials = factors.filter(({ factor }) => isExponential(factor));
	const others = factors.filter(({ factor }) => !isExponential(factor));
	const rest = unflattenProduct(others);
	if (exponentials.length === 0 || rest === null) return kernel(node);
	const top = kernel(rest);
	const whole =
		top === null ? null : unflattenProduct([{ style: 'implicit', factor: top }, ...exponentials]);
	return whole === null ? null : sign ? opposite(whole) : whole;
}

/**
 * Q44 a (David, 2026-10-24) : un polynôme à décimaux de coefficient de tête
 * décimal le sort devant, le reste factorisé par la politique :
 * `1,5x² − 3x → 1,5x(x − 2)`, `0,3x² − 0,3 → 0,3(x − 1)(x + 1)`. `null` pour
 * tout autre `node` (pas un polynôme en une lettre, tête entière).
 */
function decimalLeadFactored(node: MathNode): MathNode | null {
	if (!hasDecimalLiteral(node)) return null;
	const letters = [...getVariables(node)];
	if (letters.length !== 1) return null;
	const p = toPolynomial(node, letters[0]);
	if (p === null || p.length < 2) return null;
	const lead = p[p.length - 1];
	const written = decimalString(absRational(lead));
	if (lead.d === 1n || written === null) return null;
	const monic = rationalPolynomialNode(
		p.map((c) => divRational(c, lead)),
		variable(letters[0])
	);
	const kernel = kernelFactored(monic);
	if (kernel === null) return null;
	const product = multiply(
		number(written),
		isSum(kernel) ? delimiter('parentheses', kernel) : kernel,
		'implicit'
	);
	return lead.n < 0n ? opposite(product) : product;
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
function acceptable(
	candidate: MathNode,
	node: MathNode,
	options: FactoredFormOptions = {}
): boolean {
	if (hashMathNode(candidate) === hashMathNode(node)) return false;
	const inner = unwrap(isOpposite(candidate) ? candidate.operand : candidate);
	if (isSum(inner)) return false;
	const nonNumeric = flattenProductShallow(inner).filter(({ factor }) => !isNumericFactor(factor));
	if (options.numberBeforeSum !== true && nonNumeric.length === 1) {
		const only = unwrap(nonNumeric[0].factor);
		if (isSum(only) && !isPolynomialOfDegreeTwoOrMore(only)) return false;
	}
	if (
		options.fractionInFactor === false &&
		nonNumeric.some(({ factor }) => findNodes(factor, isDivision).length > 0)
	) {
		return false;
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
export function withTypedDecimals(candidate: MathNode, node: MathNode): MathNode {
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

/**
 * Quand `node` portait un décimal tapé, un coefficient en fraction redevient
 * décimal (S1) : `3x²/10` → `0,3x²`, `x²/5` → `0,2x²` (revue du lot 5e, R6) —
 * `withTypedDecimals` ne récrit que les fractions de deux nombres.
 */
export function withDecimalCoefficients(candidate: MathNode, node: MathNode): MathNode {
	if (!hasDecimalLiteral(node)) return candidate;
	return mapNode(candidate, (current) => {
		if (!isDivision(current) || !isPositiveInteger(current.denominator)) return current;
		const factors = flattenProductShallow(current.numerator);
		const numeric = factors.map(({ factor }) => factor).filter(isNumber);
		if (numeric.length > 1 || (numeric.length === 1 && !isPositiveInteger(numeric[0]))) {
			return current;
		}
		const decimal = decimalString({
			n: numeric.length === 1 ? BigInt(numeric[0].value) : 1n,
			d: BigInt(current.denominator.value)
		});
		if (decimal === null) return current;
		const rest = unflattenProduct(factors.filter(({ factor }) => !isNumber(factor)));
		return rest === null ? number(decimal) : multiply(number(decimal), rest, 'implicit');
	});
}

/** Un entier positif écrit : `5`. */
function isPositiveInteger(node: MathNode): node is NumberNode {
	return isNumber(node) && /^\d+$/.test(node.value) && node.value !== '0';
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
