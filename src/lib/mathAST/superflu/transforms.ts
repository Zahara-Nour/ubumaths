/**
 * Transformations du superflu
 * ===========================
 *
 * Une transformation par règle d'écriture superflue (fraction ou racine
 * simplifiable, facteur 0 ou 1, signes, symbole ×). Le juge de forme
 * (`cosmetic-transforms.ts`, `checkForm`) les rejoue une à une, dans l'ordre du
 * registre (`rules.ts`), pour nommer la faute de l'élève. `tidy` ne les appelle
 * pas : il réécrit l'expression entière, et le test
 * `tidy/__tests__/tidy-passe-le-juge.test.ts` garde l'accord entre les deux.
 *
 * Chantier : docs/archive/wip/simplify-carte-progress.md § 46-47.
 *
 * @module mathAST/superflu/transforms
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import { number, opposite, multiply, divide, add, subtract, sqrt } from '../factory';
import { extractRational } from '../common/numeric';
import { mapNode, mapNodeTopDown } from '../transforms';
import { flattenProductShallow, unflattenProduct } from '../flatten';
import { extractPerfectPower } from '../normal/radical';
import {
	divRational,
	isInteger,
	isZero,
	isNegative,
	absRational,
	negRational
} from '../normal/rational';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

// =============================================================================
// Outils
// =============================================================================

/** Unwrap delimiter nodes to get the content */
function unwrapDelimiters(node: MathNode): MathNode {
	if (node.type === 'delimiter' && node.delimiters === 'parentheses') {
		return node.content;
	}
	return node;
}

/**
 * Extract the numeric coefficient from a node as an exact Rational.
 *
 * Handles atomic numerics (number, opposite/positive/delimiter wrappers) and
 * monomials of the form coefficient × variablePart (e.g. 2x → 2/1).
 */
function extractCoefficient(node: MathNode): Rational | null {
	const direct = extractRational(node);
	if (direct !== null) return direct;

	if (node.type === 'multiplication') {
		const leftR = extractRational(node.left);
		if (leftR !== null) return leftR;
		const rightR = extractRational(node.right);
		if (rightR !== null) return rightR;
	}

	if (node.type === 'opposite' && node.operand.type === 'multiplication') {
		const coef = extractCoefficient(node.operand);
		return coef !== null ? negRational(coef) : null;
	}

	if (node.type === 'delimiter') return extractCoefficient(node.content);

	return null;
}

/** Extract the non-numeric (variable) part of a node, returning null for pure numbers */
function extractVariablePart(node: MathNode): MathNode | null {
	if (node.type === 'number') return null;
	if (node.type === 'opposite') return extractVariablePart(node.operand);
	if (node.type === 'positive') return extractVariablePart(node.operand);
	if (node.type === 'delimiter') return extractVariablePart(node.content);

	if (node.type === 'multiplication') {
		const leftIsNumeric = extractRational(node.left) !== null;
		const rightIsNumeric = extractRational(node.right) !== null;

		if (leftIsNumeric && !rightIsNumeric) return node.right;
		if (rightIsNumeric && !leftIsNumeric) return node.left;
		// Both non-numeric or both numeric — return as-is
		return null;
	}

	// Variable or other non-numeric node
	return node;
}

/** Check if a node is a pure number (no variables) */
function isPureNumber(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
			return true;
		case 'opposite':
		case 'positive':
			return isPureNumber(node.operand);
		case 'delimiter':
			return isPureNumber(node.content);
		default:
			return false;
	}
}

/** Check if a node represents 1 (handles delimiters and positive) */
function isOneNode(node: MathNode): boolean {
	if (node.type === 'number' && parseFloat(node.value) === 1) return true;
	if (node.type === 'positive') return isOneNode(node.operand);
	if (node.type === 'delimiter') return isOneNode(node.content);
	return false;
}

/**
 * Reduce fractions to lowest terms.
 * Handles numeric fractions (including decimals) and monomial fractions.
 *
 * Examples:
 *   4/6      → 2/3
 *   6/3      → 2
 *   1.7/2.3  → 17/23  (exact: parses decimals via BigInt, no parseFloat round-off)
 *   1.2/0.6  → 2
 *   4x/6     → 2x/3
 *
 * Uses exact Rational arithmetic from normal/rational.ts, so decimal operands
 * and big integers (>2^53-1) are handled without precision loss.
 */
export function reduceFractionsAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'division') return node;
		// Only handle fraction-style divisions
		if (node.displayStyle !== 'fraction') return node;

		// Try purely numeric fraction first (including decimals).
		const numR = extractRational(node.numerator);
		const denR = extractRational(node.denominator);

		if (numR !== null && denR !== null && !isZero(denR)) {
			// rational() inside divRational already reduces by gcd, so we get the
			// exact reduced form directly.
			return rationalToNode(divRational(numR, denR));
		}

		// Monomial fraction: numeric coefficient × variable part (e.g. 2x/4 → x/2).
		const numCoef = extractCoefficient(node.numerator);
		const denCoef = extractCoefficient(node.denominator);

		if (numCoef !== null && denCoef !== null && !isZero(denCoef)) {
			const reduced = divRational(numCoef, denCoef);
			const numVarPart = extractVariablePart(node.numerator);
			const denVarPart = extractVariablePart(node.denominator);

			const sign = isNegative(reduced) ? -1 : 1;
			const absReduced = absRational(reduced);
			const newNumCoef = absReduced.n;
			const newDenCoef = absReduced.d;

			// Rebuild numerator: coefficient × variable part (omit coefficient if 1).
			let newNum: MathNode;
			if (numVarPart) {
				newNum =
					newNumCoef === 1n
						? numVarPart
						: multiply(number(newNumCoef.toString()), numVarPart, 'implicit');
			} else {
				newNum = number(newNumCoef.toString());
			}

			// Rebuild denominator: coefficient × variable part (omit coefficient if 1).
			let newDen: MathNode;
			if (denVarPart) {
				newDen =
					newDenCoef === 1n
						? denVarPart
						: multiply(number(newDenCoef.toString()), denVarPart, 'implicit');
			} else {
				newDen = number(newDenCoef.toString());
			}

			// If denominator collapses to 1, return just the numerator.
			if (newDenCoef === 1n && !denVarPart) {
				return sign < 0 ? opposite(newNum) : newNum;
			}

			const frac = divide(newNum, newDen, 'fraction');
			return sign < 0 ? opposite(frac) : frac;
		}

		return node;
	});
}

/** Plus grand radicande examiné : au-delà, la racine est laissée telle quelle */
const MAX_REDUCIBLE_RADICAND = 1_000_000_000n;

/**
 * Racine carrée d'un entier à facteur carré : √n = k√m (k > 1 maximal). `null` pour
 * une autre racine (indice ≠ 2, radicande non entier ou sans facteur carré).
 * L'extraction est celle de `tidy` (`extractPerfectPower`) : une seule définition.
 */
function squareFactorOf(node: MathNode): { k: number; m: number } | null {
	if (node.type !== 'function' || node.name !== 'sqrt' || node.args.length !== 1) return null;
	if (node.base && !(node.base.type === 'number' && node.base.value === '2')) return null;
	const [radicand] = node.args;
	if (radicand.type !== 'number' || !/^\d+$/.test(radicand.value)) return null;
	const n = BigInt(radicand.value);
	if (n < 4n || n > MAX_REDUCIBLE_RADICAND) return null;
	const [k, m] = extractPerfectPower(n, 2n);
	return k > 1n ? { k: Number(k), m: Number(m) } : null;
}

/** k√m, ou k si m = 1 */
function radicalNode(k: number, m: number): MathNode {
	const coefficient = number(String(k));
	return m === 1 ? coefficient : multiply(coefficient, sqrt(number(String(m))), 'implicit');
}

/**
 * Racines simplifiables (décision de David du 2026-10-04, comme une fraction
 * simplifiable) : √12 → 2√3, √4 → 2, 3√12 → 6√3 (coefficient entier écrit devant).
 * Seules les racines carrées d'un entier ; `\sqrt[3]{16}`, `\sqrt{x}` restent.
 */
export function reduceRadicalsAST(ast: MathNode): MathNode {
	return mapNodeTopDown(ast, (node) => {
		if (
			node.type === 'multiplication' &&
			node.left.type === 'number' &&
			/^\d+$/.test(node.left.value)
		) {
			const factor = squareFactorOf(node.right);
			if (factor) return radicalNode(Number(node.left.value) * factor.k, factor.m);
		}
		const factor = squareFactorOf(node);
		return factor ? radicalNode(factor.k, factor.m) : node;
	});
}

/**
 * Render a Rational as a canonical MathNode.
 * Integer → number('N') or opposite(number('N')).
 * Fraction → divide(number, number) (with sign hoisted as opposite around the fraction).
 */
function rationalToNode(r: Rational): MathNode {
	const sign = isNegative(r) ? -1 : 1;
	const abs = absRational(r);

	if (isInteger(abs)) {
		const n = number(abs.n.toString());
		return sign < 0 ? opposite(n) : n;
	}

	const frac = divide(number(abs.n.toString()), number(abs.d.toString()), 'fraction');
	return sign < 0 ? opposite(frac) : frac;
}

/**
 * Simplify products containing zero.
 * 0 * x → 0, a * 0 * b → 0
 */
export function simplifyNullProductsAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'multiplication') return node;

		const factors = flattenProductShallow(node);
		const hasZero = factors.some((f) => {
			try {
				return evaluateNodeToApproximatedNumber(f.factor) === 0;
			} catch {
				return false;
			}
		});

		if (hasZero) return number('0');
		return node;
	});
}

/**
 * Remove factors of one.
 * 1 * x → x, x * 1 → x
 */
export function removeFactorsOneAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'multiplication') return node;

		const factors = flattenProductShallow(node);
		const filtered = factors.filter((f) => !isOneNode(f.factor));

		if (filtered.length === factors.length) return node;
		if (filtered.length === 0) return number('1');
		return unflattenProduct(filtered) ?? node;
	});
}

/**
 * Remove extraneous signs.
 * --x → x, -(-x) → x, +x → x (positive nodes)
 */
export function removeSignsAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		// Remove positive nodes: +x → x
		if (node.type === 'positive') {
			return node.operand;
		}

		// Double negative: -(-x) → x
		if (node.type === 'opposite' && node.operand.type === 'opposite') {
			return node.operand.operand;
		}

		// Opposite wrapping a delimiter wrapping an opposite: -((-x)) → x
		if (
			node.type === 'opposite' &&
			node.operand.type === 'delimiter' &&
			node.operand.content.type === 'opposite'
		) {
			return node.operand.content.operand;
		}

		// Addition with negative right operand: x + (-y) → x - y
		// Note: (-a)+b is NOT transformed (would reorder terms)
		if (node.type === 'addition') {
			const right = unwrapDelimiters(node.right);
			if (right.type === 'opposite') {
				return subtract(node.left, right.operand);
			}
		}

		// Subtraction with negative right operand: x - (-y) → x + y
		if (node.type === 'subtraction') {
			const right = unwrapDelimiters(node.right);
			if (right.type === 'opposite') {
				return add(node.left, right.operand);
			}
		}

		// Multiplication with negative factors: (-a)*b → -(a*b)
		if (node.type === 'multiplication') {
			const leftNeg = unwrapDelimiters(node.left);
			const rightNeg = unwrapDelimiters(node.right);
			if (leftNeg.type === 'opposite' && rightNeg.type === 'opposite') {
				return multiply(leftNeg.operand, rightNeg.operand, node.displayStyle);
			}
			if (leftNeg.type === 'opposite') {
				return opposite(multiply(leftNeg.operand, node.right, node.displayStyle));
			}
			if (rightNeg.type === 'opposite') {
				return opposite(multiply(node.left, rightNeg.operand, node.displayStyle));
			}
		}

		// Division with negative numerator/denominator
		if (node.type === 'division') {
			const numNeg = unwrapDelimiters(node.numerator);
			const denNeg = unwrapDelimiters(node.denominator);
			if (numNeg.type === 'opposite' && denNeg.type === 'opposite') {
				return divide(numNeg.operand, denNeg.operand, node.displayStyle);
			}
			if (numNeg.type === 'opposite') {
				return opposite(divide(numNeg.operand, node.denominator, node.displayStyle));
			}
			if (denNeg.type === 'opposite') {
				return opposite(divide(node.numerator, denNeg.operand, node.displayStyle));
			}
		}

		return node;
	});
}

/**
 * Le facteur s'écrit-il en commençant par un chiffre ? `2^n`, `1{,}05^n`, `3x`
 * oui ; `x`, `(x+1)`, `\\sqrt{2}`, `-3` non (le signe ou la parenthèse sépare).
 */
function startsWithDigit(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
			return true;
		case 'superscript':
		case 'subscript':
			return startsWithDigit(node.base);
		case 'multiplication':
			return startsWithDigit(node.left);
		default:
			return false;
	}
}

/**
 * Le facteur s'écrit-il en finissant par un chiffre SUR LA LIGNE ? `3`, `x3`
 * oui ; `x`, `2^n`, `e^{3x-2}` non (l'exposant est en hauteur, le chiffre
 * suivant ne s'y colle pas).
 */
function endsWithDigit(node: MathNode): boolean {
	switch (node.type) {
		case 'number':
			return true;
		case 'opposite':
		case 'positive':
			return endsWithDigit(node.operand);
		case 'multiplication':
			return endsWithDigit(node.right);
		default:
			return false;
	}
}

/** Sans signe, deux chiffres se toucheraient : `3\\times2^n` se lirait `32^n` */
export function digitsWouldTouch(left: MathNode, right: MathNode): boolean {
	return endsWithDigit(left) && startsWithDigit(right);
}

/**
 * Remove explicit multiplication operators where implicit is possible.
 * 2 × x → 2x (implicit), but 2 × 3 stays (ambiguous)
 *
 * Le × est NÉCESSAIRE quand deux chiffres se toucheraient sans lui :
 * `3\\times2^n` (→ `32^n`), `500\\times1{,}05^n`. Il reste, et la contrainte
 * `products` ne le signale pas. `e^{x}\\times3` reste signalé (`3e^{x}`).
 */
export function removeMultOperatorAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'multiplication') return node;

		// Only applies to explicit multiplication (dot, cross, star)
		if (node.displayStyle === 'implicit') return node;

		// Can't make implicit between two pure numbers (23 would be ambiguous)
		if (isPureNumber(node.left) && isPureNumber(node.right)) return node;

		// Deux chiffres se toucheraient : le × est nécessaire
		if (digitsWouldTouch(node.left, node.right)) return node;

		// Convert to implicit
		return multiply(node.left, node.right, 'implicit');
	});
}
