/**
 * Cosmetic AST Transformers & Unified checkForm Pipeline
 * ======================================================
 *
 * Cosmetic transformers simplify the *appearance* of expressions
 * without changing their mathematical value. They're used to check
 * if a student's answer is in "proper form".
 *
 * The checkForm pipeline applies these transformers sequentially,
 * detecting constraint violations along the way, then compares
 * the simplified answer against the simplified expected form.
 *
 * @module mathAST/cosmetic-transforms
 */

import type { MathNode } from './types';
import type { Rational } from './normal/types';
import {
	number,
	opposite,
	multiply,
	divide,
	parentheses,
	add,
	subtract,
	percentage,
	variable,
	superscript,
	func,
	sqrt
} from './factory';
import {
	isComplex,
	isDivision,
	isEulerConstant,
	isMultiplication,
	isNumber,
	isOpposite,
	isPercentage,
	isPiConstant,
	isPositive,
	isSymbol,
	isVariable
} from './guards';
import { areEquivalent } from './equivalence';
import { assumptionOracle, isPlainAlgebra, type AnswerAssumptions } from './assumptions';
import { extractRational } from './common/numeric';
import {
	findNodes,
	mapNode,
	mapNodeTopDown,
	stripUnnecessaryBrackets,
	removeNullTermsAST
} from './transforms';
import {
	flattenSumShallow,
	flattenProductShallow,
	unflattenSum,
	unflattenProduct
} from './flatten';
import { parseLatexSafe, type GenericFunctionConfig } from './parser';
import { bareDecimalCommaToPoint } from './decimal-comma';
import { toLatex } from './latex-generator';
import { compareNodes } from './normal';
import {
	divRational,
	isInteger,
	isZero,
	isNegative,
	absRational,
	negRational
} from './normal/rational';
import { evaluateNodeToApproximatedNumber } from './eval/evaluate';

// =============================================================================
// Re-exports from transforms.ts
// =============================================================================

export { removeNullTermsAST } from './transforms';
export { stripUnnecessaryBrackets as stripUnnecessaryBracketsAST } from './transforms';

// =============================================================================
// String Transformers (LaTeX → LaTeX)
// =============================================================================

/**
 * Ce qui peut précéder des zéros de tête : le début, un opérateur ou un
 * délimiteur. Une virgule n'en est un QUE si elle sépare deux nombres : pas
 * celle de `\\,` (espace fine de groupement), ni celle de `{,}`, ni une
 * virgule décimale collée à un chiffre (`1,05`, telle que MathLive l'écrit).
 * Sans cette garde, `1\\,000\\,000` perdait un groupe et `1,05` devenait `1,5`.
 */
const ZERO_DELIMITER = String.raw`(^|(?<!\\)[+\-*/=({]|(?<![\\{\d]),)`;

/**
 * Remove unnecessary leading and trailing zeros from a LaTeX string.
 *
 * - Leading zeros: 01 → 1, 007 → 7 (but 0.5 stays)
 * - Trailing decimal zeros: 1.0 → 1, 1.20 → 1.2
 */
export function removeZeros(latex: string): string {
	// Strip LaTeX thin spaces for analysis, we'll work on the raw string
	let result = latex;

	// Replace leading zeros in integer parts: 01 → 1, 007 → 7
	// Handles negative: -01 → -1
	// But NOT 0.5 (zero before decimal is required)
	// Do NOT strip zeros after digit-grouping spaces (e.g., 6 020, 6\,020)
	// Match at start of string or after operators/delimiters (not after digits or spaces)
	// The (?<!\\) lookbehind prevents matching \, (LaTeX thin space) as a comma delimiter
	result = result.replace(new RegExp(`${ZERO_DELIMITER}0+(\\d)`, 'g'), '$1$2');

	// Leading zeros followed by digit-grouping thin space: 0\,565 → 565
	// A zero at a position where leading zeros are valid (start or after operator),
	// followed by \, and then digits, is a superfluous leading zero with grouping.
	result = result.replace(new RegExp(`${ZERO_DELIMITER}0+(?:\\\\,\\s?)+(\\d)`, 'g'), '$1$2');

	// Zéros de fin d'une partie décimale : 1.0 → 1, 1.20 → 1.2, 1{,}0 → 1, 1,20 → 1,2.
	// La partie décimale est lue EN ENTIER, groupes à l'espace fine compris
	// (`formatDecimalPart` écrit `141\,592\,65`) : `2,500\,0` → `2,5`, mais
	// `1,000\,5` (1,0005) garde ses zéros, qui ne sont pas de fin.
	result = result.replace(
		/(\d+)(\.|\{,\}|,)(\d+(?:\\,\s?\d+)*)/g,
		(_, intPart: string, separator: string, decimals: string) => {
			const kept = decimals.replace(/(?:0|\\,\s?)+$/, '');
			return kept === '' ? intPart : `${intPart}${separator}${kept}`;
		}
	);

	return result;
}

/**
 * Check integer part for spacing violations
 * Groups of 3 from right: 1 234 567
 */
function hasIntegerSpacingViolation(integerPart: string): boolean {
	// Remove existing spaces to get pure digits
	const digits = integerPart.replace(/\s/g, '');

	// 3 or fewer digits: no spacing required (1, 12, 123)
	if (digits.length <= 3) {
		return false;
	}

	// 4+ digits: spacing is required (French math convention: 1 234, 12 345, etc.)
	if (!integerPart.includes(' ')) {
		return true; // Missing required spacing
	}

	// Verify spacing is at correct positions
	return !isCorrectIntegerSpacing(integerPart);
}

/**
 * Check decimal part for spacing violations
 * Groups of 3 from left: 123 456
 */
function hasDecimalSpacingViolation(decimalPart: string): boolean {
	if (!decimalPart) {
		return false;
	}

	// Remove existing spaces to get pure digits
	const digits = decimalPart.replace(/\s/g, '');

	// 3 or fewer digits: no spacing required
	if (digits.length <= 3) {
		return false;
	}

	// 4+ digits: spacing is required (French math convention)
	if (!decimalPart.includes(' ')) {
		return true;
	}

	return !isCorrectDecimalSpacing(decimalPart);
}

/**
 * Verify integer spacing is correct (groups of 3 from right)
 */
function isCorrectIntegerSpacing(integerPart: string): boolean {
	const digits = integerPart.replace(/\s/g, '');

	// Build expected format with spaces
	const groups: string[] = [];
	for (let i = digits.length; i > 0; i -= 3) {
		const start = Math.max(0, i - 3);
		groups.unshift(digits.slice(start, i));
	}
	const expected = groups.join(' ');

	// Normalize actual spacing (collapse multiple spaces)
	const actual = integerPart.replace(/\s+/g, ' ').trim();

	return actual === expected;
}

/**
 * Verify decimal spacing is correct (groups of 3 from left)
 */
function isCorrectDecimalSpacing(decimalPart: string): boolean {
	const digits = decimalPart.replace(/\s/g, '');

	// Build expected format with spaces (groups of 3 from left)
	const groups: string[] = [];
	for (let i = 0; i < digits.length; i += 3) {
		groups.push(digits.slice(i, i + 3));
	}
	const expected = groups.join(' ');

	const actual = decimalPart.replace(/\s+/g, ' ').trim();

	return actual === expected;
}

/**
 * Check if a LaTeX string has spacing issues (missing grouping spaces in numbers).
 * French format uses thin spaces to group digits in groups of 3.
 *
 * Returns true if there are spacing violations.
 */
export function checkSpacesViolation(latex: string): boolean {
	// Normalize LaTeX thin space (\,) to regular space
	let normalized = latex.replace(/\\,/g, ' ');
	// Replace {,} (French decimal comma) with a period
	normalized = normalized.replace(/\{,\}/g, '.');
	// Handle simple comma as decimal separator
	normalized = normalized.replace(/(\d),(\d)/g, '$1.$2');

	// Extract all number sequences
	const numberPattern = /-?\d[\d\s]*(?:\.\d[\d\s]*)?/g;
	const matches = normalized.match(numberPattern);
	if (!matches) return false;

	for (const match of matches) {
		const parts = match.replace(/^-/, '').split('.');
		const integerPart = parts[0] || '';
		const decimalPart = parts[1] || '';

		// Groupes de 3 : depuis la droite pour la partie entière (1 234 567),
		// depuis la virgule pour la partie décimale (0,123 4). Une espace mal
		// placée (34 56) est une faute, pas seulement une espace absente.
		if (hasIntegerSpacingViolation(integerPart)) return true;
		if (hasDecimalSpacingViolation(decimalPart)) return true;
	}

	return false;
}

/**
 * Remove grouping spaces from a LaTeX string (normalisation for comparison).
 * Removes regular spaces and LaTeX thin spaces (\,) that are used for digit grouping.
 */
export function removeSpaces(latex: string): string {
	// Remove LaTeX thin spaces
	let result = latex.replace(/\\,/g, '');
	// Remove regular spaces between digits (grouping spaces)
	result = result.replace(/(\d)\s+(\d)/g, '$1$2');
	return result;
}

/**
 * Normalize a French decimal comma (`,`) between two digits into the parser's
 * decimal point. The LaTeX parser accepts `8.249` and `8{,}249` but NOT a raw
 * `8,249`; question data and student input may carry the raw comma form, so we
 * normalize it before parsing to avoid a spurious "Parse error".
 *
 * Scoped to `<digit>,<digit>` (no surrounding spaces) so it cannot touch
 * function-argument commas (`f(a,b)`) or spaced lists (`(1, 2)`), where a comma
 * is a separator rather than a decimal mark.
 */
export function normalizeDecimalComma(latex: string): string {
	return latex.replace(/(\d),(\d)/g, '$1.$2');
}

// =============================================================================
// AST Transformers (MathNode → MathNode)
// =============================================================================

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
const MAX_REDUCIBLE_RADICAND = 1_000_000_000;

/**
 * Racine carrée d'un entier à facteur carré : √n = k√m (k > 1 maximal). `null` pour
 * une autre racine (indice ≠ 2, radicande non entier ou sans facteur carré).
 */
function squareFactorOf(node: MathNode): { k: number; m: number } | null {
	if (node.type !== 'function' || node.name !== 'sqrt' || node.args.length !== 1) return null;
	if (node.base && !(node.base.type === 'number' && node.base.value === '2')) return null;
	const [radicand] = node.args;
	if (radicand.type !== 'number' || !/^\d+$/.test(radicand.value)) return null;
	const n = Number(radicand.value);
	if (n < 4 || n > MAX_REDUCIBLE_RADICAND) return null;
	for (let k = Math.floor(Math.sqrt(n)); k >= 2; k--) {
		if (n % (k * k) === 0) return { k, m: n / (k * k) };
	}
	return null;
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
function digitsWouldTouch(left: MathNode, right: MathNode): boolean {
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

/**
 * Le degré d'un terme dans ses variables — 0 pour une constante.
 *
 * Lu sur la STRUCTURE, sans analyse polynomiale : la plus grande puissance
 * portée par une variable du terme. `3x^2` vaut 2, `2x` vaut 1, `5` vaut 0,
 * `sin(x)` vaut 0 — une fonction n'a pas de degré, elle se range à
 * l'alphabétique comme avant.
 */
function termDegree(node: MathNode): number {
	if (node.type === 'variable') return 1;

	// ⚠️ Le champ s'appelle `superscript`, pas `exponent` — mesuré sur l'arbre
	// de `x^2`. Le nommer de travers rendait 0 pour toute puissance, et le
	// trinôme sortait dans le désordre.
	if (node.type === 'superscript') {
		if (node.base.type !== 'variable' || node.superscript.type !== 'number') return 0;
		const value = Number(node.superscript.value);
		return Number.isFinite(value) ? value : 0;
	}

	if (node.type === 'multiplication') {
		return Math.max(termDegree(node.left), termDegree(node.right));
	}

	if (node.type === 'opposite' || node.type === 'positive') {
		return termDegree(node.operand);
	}

	if (node.type === 'delimiter') return termDegree(node.content);

	return 0;
}

/**
 * L'ordre des FACTEURS d'un produit : le coefficient devant.
 *
 * ⚠️ **`compareNodes` ne convient pas ici, et c'est le défaut qu'on répare.**
 * Il a été écrit pour comparer les facteurs SYMBOLIQUES d'un monôme, où le
 * coefficient est stocké à part et n'entre donc jamais dans la liste ; sa table
 * de priorités range les nombres après tout le reste (`normal/monomial.ts`).
 * Appliqué à un produit brut, il envoyait le coefficient au bout : `2x`
 * devenait `x 2`, et `5 sin(x)` devenait `sin(x) 5`. Relevé par David — ça
 * n'avait jamais été voulu.
 */
function compareFactors(a: MathNode, b: MathNode): number {
	// ⚠️ **Un nombre négatif n'est pas un nœud `number`** : `-3` s'écrit
	// `opposite(number)`. Ne tester que `type === 'number'` laissait `-3`
	// derrière — `-sin(3x) × 3` devenait `sin(3x) × -3`, ce qui est pire que le
	// défaut qu'on répare. `extractRational` couvre les deux formes.
	const aNumber = extractRational(a) !== null;
	const bNumber = extractRational(b) !== null;
	if (aNumber !== bNumber) return aNumber ? -1 : 1;
	return compareNodes(a, b);
}

/**
 * L'ordre des TERMES d'une somme : degré décroissant.
 *
 * C'est l'ordre d'un polynôme au tableau — `3x² + 2x + 1`. L'ancien les rangeait
 * par le même comparateur que les facteurs, ce qui donnait `1 + 3x² + 2x` :
 * ni croissant, ni décroissant. À degré égal, on garde l'ordre alphabétique
 * d'avant, pour que `c+a+b` reste `a + b + c`.
 */
function compareTerms(a: MathNode, b: MathNode): number {
	const degreeA = termDegree(a);
	const degreeB = termDegree(b);
	if (degreeA !== degreeB) return degreeA > degreeB ? -1 : 1;
	return compareNodes(a, b);
}

/**
 * Sort terms in sums and factors in products into canonical order.
 *
 * `b + a → a + b`, `x × 2 → 2x`, `1 + 2x + 3x² → 3x² + 2x + 1`.
 *
 * ⚠️ **Cette fonction sert d'abord à COMPARER**, appliquée aux deux côtés avant
 * confrontation (`constraintId: null` dans le pipeline) : c'est ce qui fait que
 * `1+x` et `x+1` ne sont pas une faute de forme. N'importe quel ordre total y
 * conviendrait — celui-ci est en plus celui qu'on écrit au tableau, ce qui la
 * rend utilisable à l'affichage.
 */
export function sortTermsAndFactorsAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		// Sort terms in sums
		if (node.type === 'addition' || node.type === 'subtraction') {
			const terms = flattenSumShallow(node);
			if (terms.length <= 1) return node;

			const sorted = [...terms].sort((a, b) => compareTerms(a.term, b.term));

			// Check if already sorted
			const changed = sorted.some((t, i) => t.term !== terms[i].term || t.sign !== terms[i].sign);
			if (!changed) return node;

			return unflattenSum(sorted) ?? node;
		}

		// Sort factors in products
		if (node.type === 'multiplication') {
			const factors = flattenProductShallow(node);
			if (factors.length <= 1) return node;

			// ⚠️ **Le style de multiplication appartient à la POSITION, pas au
			// facteur.** Le premier porte `implicit` par convention, les suivants
			// l'opérateur qui les précède. Les déplacer avec leur facteur faisait
			// diverger `2*x` et `x*2` après tri — donc deux écritures
			// commutatives ne se rejoignaient plus, ce que cette fonction existe
			// précisément pour garantir.
			const reordered = [...factors].sort((a, b) => compareFactors(a.factor, b.factor));
			// Un facteur implicite rangé derrière un nombre (`2^n 3` → `3 2^n`) ne
			// doit pas s'y coller : `32^n`. Le × revient, comme à l'écriture.
			const sorted = reordered.map((f, i) => {
				const style = factors[i].style;
				const touching =
					i > 0 && style === 'implicit' && digitsWouldTouch(reordered[i - 1].factor, f.factor);
				return { factor: f.factor, style: touching ? ('cross' as const) : style };
			});

			const changed = sorted.some(
				(f, i) => f.factor !== factors[i].factor || f.style !== factors[i].style
			);
			if (!changed) return node;

			return unflattenProduct(sorted) ?? node;
		}

		return node;
	});
}

// =============================================================================
// Helper functions
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

// =============================================================================
// Unified checkForm Pipeline
// =============================================================================

/** Constraint severity */
export type ConstraintSeverity = 'strict' | 'warn' | 'off';

/** Result of the checkForm pipeline */
/**
 * Une écriture en pourcentage : `20 %`, `-20 %`, `(20 %)` — le symbole porte sur
 * toute la réponse, pas sur un morceau (`10 % × 50` n'en est pas une).
 */
export function isPercentWriting(node: MathNode): boolean {
	let current = node;
	while (
		current.type === 'delimiter' ||
		current.type === 'opposite' ||
		current.type === 'positive'
	) {
		current = current.type === 'delimiter' ? current.content : current.operand;
	}
	return isPercentage(current);
}

/**
 * Une écriture finale de nombre, signe compris : un nombre (`0,2`, `-3`) ou une
 * fraction de deux nombres (`\frac{1}{5}`). Ni calcul, ni pourcentage.
 */
function isFinalNumberWriting(node: MathNode): boolean {
	let current = node;
	while (current.type === 'delimiter') current = current.content;
	if (current.type === 'opposite' || current.type === 'positive') current = current.operand;
	if (current.type === 'number') return true;
	return (
		current.type === 'division' &&
		current.numerator.type === 'number' &&
		current.denominator.type === 'number'
	);
}

/**
 * La réponse est la valeur d'un pourcentage attendu, symbole oublié : `20` pour
 * `20 %`, `12,5` pour `12,5 %`. Sert au message « N'oublie pas le symbole % ».
 */
export function forgotPercentSign(answerLatex: string, expectedLatex: string): boolean {
	const answer = parseLatexSafe(normalizeDecimalComma(removeSpaces(answerLatex)));
	const expected = parseLatexSafe(normalizeDecimalComma(removeSpaces(expectedLatex)));
	if (!answer.ast || answer.errors.length > 0) return false;
	if (!expected.ast || expected.errors.length > 0) return false;
	if (!isPercentWriting(expected.ast) || !isFinalNumberWriting(answer.ast)) return false;
	return areEquivalent(percentage(answer.ast), expected.ast, { timeoutMs: 500 });
}

export interface CheckFormResult {
	valid: boolean;
	status: 'correct' | 'bad_form' | 'unoptimal_form';
	violations: Array<{ id: string; severity: 'strict' | 'warn' }>;
	messages: string[];
}

/** AST transformer step definition */
export interface TransformerStep {
	transform: (ast: MathNode) => MathNode;
	constraintId: string | null;
}

/** Options influencing the cosmetic pipeline behaviour */
export interface CheckFormOptions {
	/**
	 * When true, brackets around a leading negative term are preserved (not
	 * flagged as a `brackets` violation). Example: `(-5)+3` keeps its brackets.
	 * Maps to `ConstraintOptions.allowBracketsInFirstNegativeTerm`.
	 */
	allowFirstNegative?: boolean;
	/**
	 * Fonctions génériques à reconnaître en relisant la réponse et l'attendu (`P'(2)`
	 * déclaré par un modèle de question). Absent : défauts du parseur, rien ne change.
	 */
	genericFunctions?: GenericFunctionConfig;
	/**
	 * Hypothèses de l'énoncé (ADR 0012), `x > 0` : `|x|` et `x` y sont la même écriture.
	 * Absent ou vide : rien ne change.
	 */
	assumptions?: AnswerAssumptions;
}

/**
 * Ordered AST transformer pipeline — single pass, acyclic dependency graph.
 *
 * The order is carefully chosen so that each transformer only creates patterns
 * that are handled by a LATER transformer (never an earlier one). This ensures
 * a single pass is sufficient — no fixed-point loop needed.
 *
 * Dependency analysis (A → B means "A can create work for B"):
 *
 *   reduceFractions → nullProducts, nullTerms, factorOne
 *     Can produce 0 (e.g. 0/3 → 0), 1 (e.g. 3/3 → 1), or -1
 *
 *   nullProducts → nullTerms
 *     Replaces product with 0, which may create a null term (a + 0*b → a + 0)
 *
 *   nullTerms → signs
 *     Removing null terms can create opposites (0 - x → -x)
 *
 *   brackets → signs, factorOne
 *     Exposes content hidden by double parentheses: ((-a)) → (-a)
 *     Revealed content may need sign or factor-one cleanup
 *
 *   signs → factorOne
 *     (-1)*x → -(1*x) creates a factor-1 pattern.
 *     This is why factorOne MUST come AFTER signs.
 *     A dedicated removeFactorsMinusOneAST is NOT needed: signs + factorOne
 *     together handle (-1)*x: signs → -(1*x) → factorOne → -x
 *
 *   factorOne → (terminal: removes factors, doesn't create new patterns)
 *   multOperator → (only changes display style, no structural effect)
 *   sort → (normalisation only, no constraint)
 *
 * Dependency graph (all arrows point downward → acyclic):
 *
 *   reduceFractions → nullProducts → nullTerms → signs → factorOne
 *                                                  ↑
 *                                             brackets
 *
 * Verification traces:
 *   (-1)*x         : brackets→rien, signs→-(1*x), factorOne→-x ✓
 *   ((-a))*b       : brackets→(-a)*b, signs→-(a*b), factorOne→rien ✓
 *   (-a)*(-1)      : brackets→rien, signs→a*1, factorOne→a ✓
 *   (3/3)*x        : reduceFractions→1*x, ..., factorOne→x ✓
 *   a+0*b          : nullProducts→a+0, nullTerms→a ✓
 *   2+(-5)         : brackets→keeps parens (negative), signs→2-5 ✓
 */
/**
 * Build the ordered AST transformer pipeline, binding bracket-stripping to the
 * supplied options (e.g. `allowFirstNegative`).
 */
/** `complex(0, 1)` : l'unité imaginaire telle que le parseur lit `\imaginaryI` */
function isImaginaryUnitNode(node: MathNode): boolean {
	return (
		isComplex(node) &&
		isNumber(node.real) &&
		node.real.value === '0' &&
		isNumber(node.imaginary) &&
		node.imaginary.value === '1'
	);
}

/**
 * Une seule écriture du nombre e pour comparer les formes : `\exponentialE`
 * (MathLive) devient la lettre `e`, `\exp(u)` (notation du programme) devient
 * `e^{u}`. Ce sont des notations, pas des formes : aucune pénalité (décision de
 * David du 2026-10-02).
 *
 * De même pour l'unité imaginaire : `\imaginaryI` (MathLive, « ii » ou la variante
 * « i imaginaire » de la touche i), que le parseur lit `complex(0, 1)`, devient la
 * lettre `i` (`\mathrm{i}` l'était déjà). Avant : `2-3\imaginaryI` pour `2-3i`
 * était « pas sous la forme demandée » (décision de David du 2026-10-05).
 */
export function unifyEulerNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (isEulerConstant(node)) return variable('e');
		if (isImaginaryUnitNode(node)) return variable('i');
		if (node.type === 'function' && node.name === 'exp' && node.args.length === 1) {
			return superscript(variable('e'), node.args[0]);
		}
		return node;
	});
}

/**
 * `+\infty` et `\infty` sont la même écriture : le `+` devant l'infini est la
 * notation standard du lycée, pas un signe superflu (sonde du 2026-10-04 :
 * `+\infty` valait « signes superflus »). Parcours DESCENDANT : seul le `+`
 * collé à `\infty` disparaît, `++\infty` garde un `+` que `signs` signale.
 */
function unifyInfinityNotationAST(ast: MathNode): MathNode {
	return mapNodeTopDown(ast, (node) =>
		isPositive(node) && isSymbol(node.operand) && node.operand.symbol === 'infinity'
			? node.operand
			: node
	);
}

/**
 * Une seule écriture d'un angle en π pour comparer les formes : `\frac{a}{b}\pi`,
 * `a\frac{\pi}{b}`, `\pi/b` et `\frac{-\pi}{b}` deviennent `\frac{a\pi}{b}` (ou
 * son opposé). Ce sont des notations, pas des calculs inachevés : aucune pénalité
 * (décision de David du 2026-10-02). Limité à π et aux produits IMPLICITES de
 * nombres : `\frac{1}{3}x` et `\frac{\pi}{6}\times2` gardent leur jugement.
 */
function unifyPiAngleNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (isMultiplication(node) && node.displayStyle === 'implicit' && isPiConstant(node.right)) {
			// \frac{a}{b}\pi → \frac{a\pi}{b}, et -\frac{a}{b}\pi → -\frac{a\pi}{b}
			const left = node.left;
			const negated = isOpposite(left);
			const coef = isOpposite(left) ? left.operand : left;
			if (
				isDivision(coef) &&
				coef.displayStyle === 'fraction' &&
				isNumber(coef.numerator) &&
				isNumber(coef.denominator)
			) {
				const numerator =
					coef.numerator.value === '1'
						? node.right
						: multiply(coef.numerator, node.right, 'implicit');
				const fraction = divide(numerator, coef.denominator, 'fraction');
				return negated ? opposite(fraction) : fraction;
			}
		}
		if (
			isMultiplication(node) &&
			node.displayStyle === 'implicit' &&
			isNumber(node.left) &&
			isDivision(node.right) &&
			isPiConstant(node.right.numerator) &&
			isNumber(node.right.denominator)
		) {
			// a\frac{\pi}{b} → \frac{a\pi}{b}
			return divide(
				multiply(node.left, node.right.numerator, 'implicit'),
				node.right.denominator,
				'fraction'
			);
		}
		if (isDivision(node) && isNumber(node.denominator)) {
			const num = node.numerator;
			const isPiTerm = (n: MathNode): boolean =>
				isPiConstant(n) ||
				(isMultiplication(n) &&
					n.displayStyle === 'implicit' &&
					isNumber(n.left) &&
					isPiConstant(n.right));
			// \frac{-\pi}{b} → -\frac{\pi}{b}
			if (isOpposite(num) && isPiTerm(num.operand)) {
				return opposite(divide(num.operand, node.denominator, 'fraction'));
			}
			// \pi/b → \frac{\pi}{b}
			if (node.displayStyle !== 'fraction' && isPiTerm(num)) {
				return divide(num, node.denominator, 'fraction');
			}
		}
		return node;
	});
}

/** La lettre `i` (unité imaginaire ; `\imaginaryI` y est déjà ramené par `unifyEulerNotationAST`) */
function isImaginaryLetter(node: MathNode): boolean {
	return isVariable(node) && node.name === 'i';
}

/** Constante réelle écrite : aucune lettre (ni `i`, ni variable) */
function isLetterFree(node: MathNode): boolean {
	return findNodes(node, isVariable).length === 0;
}

/**
 * Produit dont UN facteur est `i` et les autres des constantes réelles (`i`, `3i`,
 * `i\sqrt{3}`, `\pi i`) : les autres facteurs (`null` pour `i` seul), sinon `undefined`.
 */
export function imaginaryProductRest(node: MathNode): MathNode | null | undefined {
	const factors = flattenProductShallow(node);
	const imaginary = factors.filter((f) => isImaginaryLetter(f.factor));
	if (imaginary.length !== 1) return undefined;
	const rest = factors.filter((f) => !isImaginaryLetter(f.factor));
	if (!rest.every((f) => isLetterFree(f.factor))) return undefined;
	return unflattenProduct(rest.map((f, k) => (k === 0 ? { ...f, style: 'implicit' } : f)));
}

/** `\frac{R}{d}i` (`\frac{1}{d}i` pour `R` absent) */
function imaginaryOverDenominator(rest: MathNode | null, denominator: MathNode): MathNode {
	return multiply(divide(rest ?? number('1'), denominator, 'fraction'), variable('i'), 'implicit');
}

/**
 * Une seule écriture d'un complexe sous forme algébrique pour comparer les formes
 * (décision de David du 2026-10-05, même famille que `\frac{x^3}{3}` / `\frac13x^3`) :
 * sur un dénominateur NOMBRE, `\frac{a+bi}{d}` devient `\frac{a}{d}+\frac{b}{d}i`, et
 * `\frac{bi}{d}`, `\frac{ib}{d}` deviennent `\frac{b}{d}i` (`\frac{i\pi}{3}` dans un
 * exposant compris). `a`, `b` : constantes réelles sans lettre. Ce sont des notations,
 * pas des formes : aucune pénalité. Exclus, jugés comme avant : un dénominateur qui
 * n'est pas un nombre (`\frac{1}{1+i}`, calcul non fait), plus de deux termes, une
 * lettre autre que `i` (`\frac{x+1}{2}` garde son jugement) ; une fraction simplifiable
 * (`\frac{2-2i}{4}`) reste signalée par `reducedFractions`.
 */
export function unifyComplexAlgebraicNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (!isDivision(node) || node.displayStyle !== 'fraction' || !isNumber(node.denominator)) {
			return node;
		}
		const terms = flattenSumShallow(node.numerator);
		if (terms.length === 1) {
			const rest = imaginaryProductRest(terms[0].term);
			if (rest === undefined) return node;
			const imaginary = imaginaryOverDenominator(rest, node.denominator);
			return terms[0].sign === '-' ? opposite(imaginary) : imaginary;
		}
		if (terms.length !== 2) return node;
		const imaginaryIndex = terms.findIndex((t) => imaginaryProductRest(t.term) !== undefined);
		if (imaginaryIndex === -1) return node;
		const real = terms[1 - imaginaryIndex];
		if (!isLetterFree(real.term)) return node;
		const imaginaryTerm = terms[imaginaryIndex];
		const imaginary = imaginaryOverDenominator(
			imaginaryProductRest(imaginaryTerm.term) ?? null,
			node.denominator
		);
		const realPart = divide(real.term, node.denominator, 'fraction');
		const first = real.sign === '-' ? opposite(realPart) : realPart;
		return imaginaryTerm.sign === '-' ? subtract(first, imaginary) : add(first, imaginary);
	});
}

/** Facteur littéral d'un monôme : lettre, constante, ou puissance de l'une d'elles (`x^3`, `e^{2x}`) */
function isLiteralFactor(node: MathNode): boolean {
	const letter = (n: MathNode): boolean =>
		n.type === 'variable' || n.type === 'greek' || n.type === 'constant';
	return letter(node) || (node.type === 'superscript' && letter(node.base));
}

/** Partie littérale d'un monôme : produit IMPLICITE de facteurs littéraux (`x`, `x^2y`) */
function isLiteralPart(node: MathNode): boolean {
	if (isMultiplication(node)) {
		return (
			node.displayStyle === 'implicit' && isLiteralPart(node.left) && isLiteralPart(node.right)
		);
	}
	return isLiteralFactor(node);
}

/** Fraction de deux nombres écrite `\frac{a}{b}` */
function isNumberFraction(node: MathNode): node is MathNode & { type: 'division' } {
	return (
		isDivision(node) &&
		node.displayStyle === 'fraction' &&
		isNumber(node.numerator) &&
		isNumber(node.denominator)
	);
}

/**
 * Numérateur négatif d'un monôme (`-x^2`, `-3x`, lu `(-3)·x`) : le monôme sans son
 * signe, ou `null`.
 */
function negatedMonomial(node: MathNode): MathNode | null {
	if (
		isOpposite(node) &&
		(isLiteralPart(node.operand) || isMonomialWithCoefficient(node.operand))
	) {
		return node.operand;
	}
	if (
		isMultiplication(node) &&
		node.displayStyle === 'implicit' &&
		isOpposite(node.left) &&
		isNumber(node.left.operand) &&
		isLiteralPart(node.right)
	) {
		return multiply(node.left.operand, node.right, 'implicit');
	}
	return null;
}

/** `3x`, `2e^{x}` : un nombre suivi (implicitement) d'une partie littérale */
function isMonomialWithCoefficient(node: MathNode): boolean {
	return (
		isMultiplication(node) &&
		node.displayStyle === 'implicit' &&
		isNumber(node.left) &&
		isLiteralPart(node.right)
	);
}

/**
 * Une seule écriture d'un monôme à coefficient fractionnaire pour comparer les formes :
 * `\frac{1}{3}x^3` devient `\frac{x^3}{3}`, `\frac{2}{5}x` devient `\frac{2x}{5}`, et le
 * signe d'un numérateur sort de la fraction (`\frac{-x^2}{4}` → `-\frac{x^2}{4}`). Ce sont
 * des notations, pas des formes : aucune pénalité (défaut validé par David le 2026-10-04,
 * sœur de la règle des angles en π). Limité aux produits IMPLICITES d'une partie
 * littérale : une somme (`\frac{x}{3}+\frac{x}{3}`), une parenthèse (`\frac{1}{3}(x+1)`),
 * un produit explicite (`\frac{1}{3}\times x`) ou une fraction de nombres seuls
 * (`\frac{-10}{10}`) gardent leur jugement ; une fraction simplifiable (`\frac{2x}{4}`)
 * reste signalée par `reducedFractions`.
 */
function unifyMonomialFractionNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		// \frac{a}{b}M → \frac{aM}{b} (a = 1 : \frac{M}{b}) ; -\frac{a}{b}M → -\frac{aM}{b}
		if (isMultiplication(node) && node.displayStyle === 'implicit' && isLiteralPart(node.right)) {
			const negated = isOpposite(node.left);
			const coef = isOpposite(node.left) ? node.left.operand : node.left;
			if (isNumberFraction(coef) && isNumber(coef.numerator) && isNumber(coef.denominator)) {
				const numerator =
					coef.numerator.value === '1'
						? node.right
						: multiply(coef.numerator, node.right, 'implicit');
				const fraction = divide(numerator, coef.denominator, 'fraction');
				return negated ? opposite(fraction) : fraction;
			}
		}
		// \frac{-M}{b} → -\frac{M}{b}
		if (isDivision(node) && node.displayStyle === 'fraction' && isNumber(node.denominator)) {
			const positive = negatedMonomial(node.numerator);
			if (positive) return opposite(divide(positive, node.denominator, 'fraction'));
		}
		return node;
	});
}

/** `|u|` : la valeur absolue (lue `abs(u)`) */
function isAbsolute(node: MathNode): node is MathNode & { type: 'function' } {
	return node.type === 'function' && node.name === 'abs' && node.args.length === 1;
}

/**
 * Sous l'hypothèse de l'énoncé `u ≥ 0` (ADR 0012), `|u|` et `u` sont la même écriture :
 * `\ln|x|` pour `\ln(x)` avec x > 0 (défaut validé par David le 2026-10-04). Même
 * oracle que la normalisation (`|u| → u`, normalize.ts), et même garde que
 * `areEquivalent` : algèbre simple seulement, variable déclarée mentionnée. Argument
 * d'une fonction (`\ln|x+1|`) : la barre disparaît ; ailleurs, une somme garde ses
 * parenthèses (`2|x+1|` → `2(x+1)`).
 */
function absoluteUnderAssumptionsAST(assumptions: AnswerAssumptions | undefined) {
	const oracle = assumptionOracle(assumptions);
	return (ast: MathNode): MathNode => {
		if (!oracle || !isPlainAlgebra(ast)) return ast;
		const unsigned = (node: MathNode): MathNode | null =>
			isAbsolute(node) && oracle.isNonNegative(node.args[0]) ? node.args[0] : null;
		return mapNodeTopDown(ast, (node) => {
			if (node.type === 'function' && !isAbsolute(node)) {
				const args = node.args.map((arg) => unsigned(arg) ?? arg);
				return args.some((arg, i) => arg !== node.args[i]) ? { ...node, args } : node;
			}
			const content = unsigned(node);
			if (content === null) return node;
			const atomic =
				content.type !== 'addition' &&
				content.type !== 'subtraction' &&
				content.type !== 'opposite';
			return atomic ? content : parentheses(content);
		});
	};
}

/** Plus grand entier écrit en argument d'un ln que la règle des puissances lit */
const MAX_LOG_ARGUMENT = 1e12;

/** Multiple rationnel `num/den` (den > 0, irréductible) de `\ln base` */
interface LogMultiple {
	num: number;
	den: number;
	base: number;
}

function gcd(a: number, b: number): number {
	return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function logMultiple(num: number, den: number, base: number): LogMultiple {
	const g = gcd(num, den) || 1;
	const sign = den < 0 ? -1 : 1;
	return { num: (sign * num) / g, den: (sign * den) / g, base };
}

/** Entier positif écrit en chiffres (`9`), sinon null */
function writtenInteger(node: MathNode): number | null {
	if (!isNumber(node) || !/^\d+$/.test(node.value)) return null;
	const value = Number(node.value);
	return Number.isSafeInteger(value) && value <= MAX_LOG_ARGUMENT ? value : null;
}

/** `n = b^k` avec `b` qui n'est pas lui-même une puissance : `[b, k]` (`8` → `[2, 3]`) */
function perfectPower(n: number): [number, number] {
	for (let k = Math.floor(Math.log2(n)); k >= 2; k--) {
		const b = Math.round(n ** (1 / k));
		if (b >= 2 && b ** k === n) return [b, k];
	}
	return [n, 1];
}

/**
 * Argument d'un ln lu comme `b^r` (b entier ≥ 2 qui n'est pas une puissance, r
 * rationnel) : entier (`9`), puissance entière d'un entier (`3^2`), inverse
 * d'un entier (`\frac{1}{2}`), racine d'un entier (`\sqrt{3}`, `\sqrt[3]{2}`),
 * sinon null.
 */
function logArgument(node: MathNode): LogMultiple | null {
	const integer = writtenInteger(node);
	if (integer !== null) {
		if (integer < 2) return null;
		const [base, k] = perfectPower(integer);
		return logMultiple(k, 1, base);
	}
	if (node.type === 'superscript') {
		const exponent = writtenInteger(node.superscript);
		const inner = writtenInteger(node.base) !== null ? logArgument(node.base) : null;
		return exponent !== null && exponent > 0 && inner
			? logMultiple(inner.num * exponent, inner.den, inner.base)
			: null;
	}
	if (
		isDivision(node) &&
		node.displayStyle === 'fraction' &&
		writtenInteger(node.numerator) === 1
	) {
		const inner = writtenInteger(node.denominator) !== null ? logArgument(node.denominator) : null;
		return inner ? logMultiple(-inner.num, inner.den, inner.base) : null;
	}
	if (node.type === 'function' && node.name === 'sqrt' && node.args.length === 1) {
		const index = node.base ? writtenInteger(node.base) : 2;
		const inner = writtenInteger(node.args[0]) !== null ? logArgument(node.args[0]) : null;
		return index !== null && index >= 2 && inner
			? logMultiple(inner.num, inner.den * index, inner.base)
			: null;
	}
	return null;
}

/** `\ln(u)` d'argument lisible par `logArgument`, sinon null */
function lnOfPower(node: MathNode): LogMultiple | null {
	if (node.type !== 'function' || node.name !== 'ln' || node.args.length !== 1) return null;
	if (node.power || node.base) return null;
	return logArgument(node.args[0]);
}

/** Coefficient d'un ln : entier non nul, fraction de deux entiers, ou leur opposé */
function logCoefficient(node: MathNode): [number, number] | null {
	if (isOpposite(node)) {
		const inner = logCoefficient(node.operand);
		return inner && [-inner[0], inner[1]];
	}
	const integer = writtenInteger(node);
	if (integer !== null) return integer === 0 ? null : [integer, 1];
	if (isDivision(node) && node.displayStyle === 'fraction') {
		const num = writtenInteger(node.numerator);
		const den = writtenInteger(node.denominator);
		return num !== null && den !== null && num !== 0 && den !== 0 ? [num, den] : null;
	}
	return null;
}

/** `\ln(u)`, `-\ln(u)`, `k\ln(u)` (produit IMPLICITE) : multiple de `\ln b`, sinon null */
function logTerm(node: MathNode): LogMultiple | null {
	if (isOpposite(node)) {
		const inner = logTerm(node.operand);
		return inner && { ...inner, num: -inner.num };
	}
	if (isMultiplication(node) && node.displayStyle === 'implicit') {
		const coefficient = logCoefficient(node.left);
		const log = coefficient && lnOfPower(node.right);
		return coefficient && log
			? logMultiple(coefficient[0] * log.num, coefficient[1] * log.den, log.base)
			: null;
	}
	return lnOfPower(node);
}

/** Écriture unique de `|num/den|·\ln base` : `\ln 3`, `2\ln 3`, `\frac{1}{2}\ln 3` */
function logTermNode({ num, den, base }: LogMultiple): MathNode {
	const ln = func('ln', [number(base)]);
	const abs = Math.abs(num);
	if (den === 1 && abs === 1) return ln;
	const coefficient = den === 1 ? number(abs) : divide(number(abs), number(den), 'fraction');
	return multiply(coefficient, ln, 'implicit');
}

/**
 * Une seule écriture du logarithme d'une puissance pour comparer les formes :
 * `\ln 9`, `\ln(3^2)` et `2\ln 3` deviennent `2\ln 3` ; `\ln\frac{1}{2}` devient
 * `-\ln 2` ; `\ln\sqrt{3}` devient `\frac{1}{2}\ln 3` ; `3\ln 4` et `\ln 64`
 * deviennent `6\ln 2`. Ce sont des notations, pas des formes (défaut validé par
 * David le 2026-10-04, sœur des règles du monôme fractionnaire et des angles en π).
 * Placée APRÈS les contraintes : `\frac{2}{4}\ln 3` reste signalé par
 * `reducedFractions`. Exclus (gardent leur jugement) : `\ln(ab)` / `\ln a+\ln b`,
 * `\ln\frac{a}{b}` (a ≠ 1) / `\ln a-\ln b`, `\frac{\ln 3}{2}`, `\ln e^{2}`, un
 * produit explicite. Une forme imposée (`requiredForm`) ne passe pas par ici.
 */
function unifyLogPowerNotationAST(ast: MathNode): MathNode {
	return mapNodeTopDown(ast, (node) => {
		// a + (−k\ln b) → a − k\ln b ; a − (−k\ln b) → a + k\ln b
		if (node.type === 'addition' || node.type === 'subtraction') {
			const term = logTerm(node.right);
			if (!term || term.num > 0) return node;
			const positive = logTermNode(term);
			return node.type === 'addition' ? subtract(node.left, positive) : add(node.left, positive);
		}
		const term = logTerm(node);
		if (!term) return node;
		return term.num < 0 ? opposite(logTermNode(term)) : logTermNode(term);
	});
}

/** La lettre `e` (après `unifyEulerNotationAST`, qui y ramène `\exponentialE`) */
function isEulerLetter(node: MathNode): boolean {
	return node.type === 'variable' && node.name === 'e';
}

/**
 * Opposé d'un exposant « simple », écrit comme le parseur lit `e^{-a}` : nombre
 * (`2` → `-2`), fraction de nombres, partie littérale (`x`), monôme (`2x` → `(-2)·x`,
 * lu ainsi par le parseur), monôme sur un nombre (`\frac{x}{2}`). Sinon null : une
 * somme (`x+1`) ou un exposant déjà négatif gardent leur jugement.
 */
function negatedSimpleExponent(exponent: MathNode): MathNode | null {
	if (isNumber(exponent) || isNumberFraction(exponent) || isLiteralPart(exponent)) {
		return opposite(exponent);
	}
	if (isMultiplication(exponent) && isMonomialWithCoefficient(exponent)) {
		return multiply(opposite(exponent.left), exponent.right, 'implicit');
	}
	if (
		isDivision(exponent) &&
		exponent.displayStyle === 'fraction' &&
		isNumber(exponent.denominator) &&
		(isLiteralPart(exponent.numerator) || isMonomialWithCoefficient(exponent.numerator))
	) {
		return opposite(exponent);
	}
	return null;
}

/**
 * Une seule écriture de l'inverse d'une exponentielle pour comparer les formes :
 * `\frac{1}{e^a}` devient `e^{-a}`, `\frac{k}{e^a}` devient `ke^{-a}`, `\frac{1}{e}`
 * devient `e^{-1}` (a entier, fraction ou monôme : `\frac{1}{e^{2x}}` → `e^{-2x}`). Ce
 * sont des notations, pas des formes (décision de David du 2026-10-04, sœur de la règle
 * du logarithme d'une puissance). Placée APRÈS les contraintes, comme elle. Exclus
 * (gardent leur jugement) : numérateur autre qu'un nombre (`\frac{e^3}{e^5}` / `e^{-2}`,
 * calcul non fait), dénominateur produit (`\frac{1}{2e^3}`), exposant somme ou déjà
 * négatif, développé / combiné (`\frac{e^3}{2}-\frac12` / `\frac{e^3-1}{2}`). Une forme
 * imposée (`requiredForm`) ne passe pas par ici.
 */
function unifyNegativeExponentialNotationAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (!isDivision(node) || node.displayStyle !== 'fraction' || !isNumber(node.numerator)) {
			return node;
		}
		const denominator = node.denominator;
		let negated: MathNode | null = null;
		if (isEulerLetter(denominator)) {
			negated = opposite(number('1'));
		} else if (denominator.type === 'superscript' && isEulerLetter(denominator.base)) {
			negated = negatedSimpleExponent(denominator.superscript);
		}
		if (negated === null) return node;
		const power = superscript(variable('e'), negated);
		return node.numerator.value === '1' ? power : multiply(node.numerator, power, 'implicit');
	});
}

function buildASTPipeline(options: CheckFormOptions = {}): TransformerStep[] {
	return [
		{ transform: unifyEulerNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyInfinityNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyPiAngleNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyComplexAlgebraicNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyMonomialFractionNotationAST, constraintId: null }, // notation, pas forme
		{ transform: absoluteUnderAssumptionsAST(options.assumptions), constraintId: null }, // hypothèse, pas forme
		{ transform: reduceRadicalsAST, constraintId: 'reducedRadicals' },
		{ transform: reduceFractionsAST, constraintId: 'reducedFractions' },
		{ transform: simplifyNullProductsAST, constraintId: 'factorZero' },
		{ transform: removeNullTermsAST, constraintId: 'nullTerms' },
		{
			transform: (ast) =>
				stripUnnecessaryBrackets(ast, { allowFirstNegative: options.allowFirstNegative }),
			constraintId: 'brackets'
		},
		{ transform: removeSignsAST, constraintId: 'signs' },
		{ transform: removeFactorsOneAST, constraintId: 'factorOne' },
		{ transform: removeMultOperatorAST, constraintId: 'products' },
		{ transform: unifyLogPowerNotationAST, constraintId: null }, // notation, pas forme
		{ transform: unifyNegativeExponentialNotationAST, constraintId: null }, // notation, pas forme
		{ transform: sortTermsAndFactorsAST, constraintId: null } // normalisation only
	];
}

/**
 * Étapes du pipeline qui nettoient les COEFFICIENTS d'une formule (0·x → 0, x + 0 → x,
 * signes, 1·x → x), pour l'option de modèle `shared.cleanCoefficients`.
 * Sélection dans `buildASTPipeline` (source unique), dans son ordre. Exclues : les
 * parenthèses (`P(x)` → « P x »), la réduction des fractions, le signe × et le tri,
 * qui changent l'écriture de l'auteur au-delà des coefficients.
 */
const COEFFICIENT_CLEANUP_IDS: ReadonlySet<string> = new Set([
	'factorZero',
	'nullTerms',
	'signs',
	'factorOne'
]);

export function coefficientCleanupSteps(): TransformerStep[] {
	return buildASTPipeline().filter(
		(step) => step.constraintId !== null && COEFFICIENT_CLEANUP_IDS.has(step.constraintId)
	);
}

/**
 * Apply the full AST pipeline and return the final AST.
 */
function applyFullASTPipeline(ast: MathNode, options: CheckFormOptions = {}): MathNode {
	let current = ast;
	for (const step of buildASTPipeline(options)) {
		current = step.transform(current);
	}
	return current;
}

/**
 * Check whether a LaTeX string represents a "simple number": a single numeric
 * literal, optionally negated. After parsing, the AST root must be a `number`
 * node (e.g. `5`, `3.14`) or an `opposite` wrapping a `number` (e.g. `-5`).
 *
 * A leading explicit `+` (positive node) wrapping a number is also accepted.
 *
 * Rejects fractions, sums, products, scientific notation, variables, etc.
 * Those must go through `requiredForm` to be accepted in a non-simple shape.
 *
 * @param latex - The LaTeX to test
 * @returns true if the answer is a simple (possibly negative) number
 */
export function isSimpleNumberLatex(latex: string): boolean {
	// Virgule décimale nue (`3,14`) lue comme `3{,}14` ; un couple `(3,14)` reste refusé
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(latex.trim()));
	if (!parsed.ast || parsed.errors.length > 0) return false;

	let node: MathNode = parsed.ast;
	// Peel a single leading sign wrapper (-x / +x).
	if (node.type === 'opposite' || node.type === 'positive') {
		node = node.operand;
	}
	return node.type === 'number';
}

/**
 * Un complexe écrit en décimaux, `a+bi` (`0.5-0.5i`, `-0{,}5i+2`, `3i`, `1-i`) : au plus
 * un nombre réel et un terme imaginaire `b i` / `i b` / `i`, `b` nombre. Sert à l'option
 * de case `acceptDecimal`, comme `isSimpleNumberLatex` pour un réel.
 */
export function isDecimalComplexLatex(latex: string): boolean {
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(latex.trim()));
	if (!parsed.ast || parsed.errors.length > 0) return false;
	const terms = flattenSumShallow(unifyEulerNotationAST(parsed.ast));
	if (terms.length === 0 || terms.length > 2) return false;
	const isImaginary = (term: MathNode): boolean => {
		const rest = imaginaryProductRest(term);
		// `-0.5i` est lu `(-0.5)·i` (moins unaire du parseur)
		const unsigned = rest && isOpposite(rest) ? rest.operand : rest;
		return unsigned === null || (unsigned !== undefined && isNumber(unsigned));
	};
	const imaginary = terms.filter((t) => isImaginary(t.term));
	const real = terms.filter((t) => isNumber(t.term));
	return imaginary.length === 1 && imaginary.length + real.length === terms.length;
}

/**
 * Un nombre écrit simplement OU en fraction de nombres (`\\frac{1}{2}`,
 * `-\\frac{3}{4}`), signe compris — y compris sur le numérateur ou le
 * dénominateur (`\\frac{-3}{4}`) : c'est une écriture de nombre, que les
 * contraintes cosmétiques jugent ensuite (`reducedFractions`), comme en case
 * positionnelle. Un calcul non effectué (`1-1`, `\\frac{1}{2}+0`) est refusé.
 * Sert aux cases « la règle suffit » (décision de David, 2026-10-03).
 */
export function isNumberOrNumberFractionLatex(latex: string): boolean {
	if (isSimpleNumberLatex(latex)) return true;
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(latex.trim()));
	if (!parsed.ast || parsed.errors.length > 0) return false;

	const node = withoutSign(parsed.ast);
	return (
		node.type === 'division' &&
		withoutSign(node.numerator).type === 'number' &&
		withoutSign(node.denominator).type === 'number'
	);
}

/** Nœud débarrassé d'un signe unique en tête (`-x` / `+x`) */
function withoutSign(node: MathNode): MathNode {
	return node.type === 'opposite' || node.type === 'positive' ? node.operand : node;
}

/**
 * La valeur d'une grandeur (partie numérique d'un blanc à unité) : un nombre
 * simple, une fraction de nombres (`\frac{1}{3}`) ou une notation scientifique
 * (`2{,}5\times10^{3}`), signe compris. Une fraction est parfois la SEULE
 * écriture exacte : `\frac{1}{3}\unit{km}` attendu ne pouvait pas être donné
 * juste quand seul un nombre simple était admis. Un calcul non effectué
 * (`2+3`) reste refusé.
 */
export function isQuantityValueLatex(latex: string): boolean {
	if (isSimpleNumberLatex(latex)) return true;
	const parsed = parseLatexSafe(bareDecimalCommaToPoint(latex.trim()));
	if (!parsed.ast || parsed.errors.length > 0) return false;

	let node: MathNode = parsed.ast;
	if (node.type === 'opposite' || node.type === 'positive') {
		node = node.operand;
	}

	if (node.type === 'division') {
		return node.numerator.type === 'number' && node.denominator.type === 'number';
	}

	if (node.type === 'multiplication' && node.right.type === 'superscript') {
		const { base, superscript: exponent } = node.right;
		const exponentValue = exponent.type === 'opposite' ? exponent.operand : exponent;
		return (
			node.left.type === 'number' &&
			base.type === 'number' &&
			base.value === '10' &&
			exponentValue.type === 'number'
		);
	}

	return false;
}

/**
 * Detect cosmetic constraint violations on a single LaTeX answer using the AST
 * pipeline (zeros / spaces / fractions / nullTerms / factorZero / brackets /
 * signs / factorOne / products), WITHOUT comparing against any expected form.
 *
 * This is the "violations only" half of {@link checkForm}: it answers
 * "is the answer written cleanly?" but NOT "is it the expected expression?".
 *
 * Use it for blanks whose form is already validated elsewhere (requiredForm,
 * precision, unit) but which should still surface cosmetic issues such as
 * unreduced fractions or superfluous brackets.
 *
 * @param answerLatex - Student's answer in LaTeX
 * @param constraints - Constraint configuration (id → 'strict' | 'warn' | 'off')
 * @param options - Pipeline options (e.g. allowFirstNegative)
 * @returns List of detected violations. Empty array if the answer cannot be
 *          parsed (we don't surface a "bad_form" here — parse failures are the
 *          caller's concern via the value-correctness stage).
 */
export function cosmeticViolations(
	answerLatex: string,
	constraints: Record<string, ConstraintSeverity>,
	options: CheckFormOptions = {}
): Array<{ id: string; severity: 'strict' | 'warn' }> {
	const violations: Array<{ id: string; severity: 'strict' | 'warn' }> = [];

	// === Phase string (pre-AST) ===

	const answerNoZeros = removeZeros(answerLatex);
	if (answerNoZeros !== answerLatex && (constraints['zeros'] ?? 'warn') !== 'off') {
		const severity = (constraints['zeros'] ?? 'warn') as 'strict' | 'warn';
		violations.push({ id: 'zeros', severity });
	}

	if (checkSpacesViolation(answerLatex) && (constraints['spaces'] ?? 'warn') !== 'off') {
		const severity = (constraints['spaces'] ?? 'warn') as 'strict' | 'warn';
		violations.push({ id: 'spaces', severity });
	}

	const answerStr = normalizeDecimalComma(removeSpaces(answerNoZeros));

	// === Parse AST ===
	const answerParse = parseLatexSafe(answerStr, { genericFunctions: options.genericFunctions });
	if (!answerParse.ast || answerParse.errors.length > 0) {
		// Can't parse → no cosmetic verdict to give.
		return violations;
	}

	let answerAST = answerParse.ast;

	// === Phase AST: apply transformers sequentially, detecting violations ===
	for (const step of buildASTPipeline(options)) {
		const before = toLatex(answerAST);
		answerAST = step.transform(answerAST);
		const after = toLatex(answerAST);

		if (
			before !== after &&
			step.constraintId &&
			(constraints[step.constraintId] ?? 'warn') !== 'off'
		) {
			const severity = (constraints[step.constraintId] ?? 'warn') as 'strict' | 'warn';
			violations.push({ id: step.constraintId, severity });
		}
	}

	return violations;
}

/**
 * Multiplication « * » (style `star`) ou « · » (style `dot`) réécrite en « × »
 * (style `cross`). Le point ne disparaissait jusqu'ici qu'avec le retrait du
 * signe (`products`) ; devant un facteur qui commence par un chiffre, le signe
 * reste (`3\cdot2^n`) et doit valoir `3\times2^n`.
 */
function withCrossMultiplication(ast: MathNode): MathNode {
	return mapNode(ast, (node) =>
		node.type === 'multiplication' && (node.displayStyle === 'star' || node.displayStyle === 'dot')
			? { ...node, displayStyle: 'cross' }
			: node
	);
}

/**
 * Unified checkForm: applies cosmetic transformers to both answer and expected,
 * detects constraint violations, and compares final forms.
 *
 * @param answerLatex - Student's answer in LaTeX
 * @param expectedLatex - Expected answer in LaTeX
 * @param constraints - Constraint configuration (id → 'strict' | 'warn' | 'off')
 * @returns CheckFormResult with validity, status, and violations
 */
export function checkForm(
	answerLatex: string,
	expectedLatex: string,
	constraints: Record<string, ConstraintSeverity>,
	options: CheckFormOptions = {}
): CheckFormResult {
	const violations: Array<{ id: string; severity: 'strict' | 'warn' }> = [];
	const messages: string[] = [];

	// === Phase string (pre-AST) ===

	// removeZeros
	const answerNoZeros = removeZeros(answerLatex);
	if (answerNoZeros !== answerLatex && (constraints['zeros'] ?? 'warn') !== 'off') {
		const severity = (constraints['zeros'] ?? 'warn') as 'strict' | 'warn';
		violations.push({ id: 'zeros', severity });
	}

	// checkSpaces (detection only)
	if (checkSpacesViolation(answerLatex) && (constraints['spaces'] ?? 'warn') !== 'off') {
		const severity = (constraints['spaces'] ?? 'warn') as 'strict' | 'warn';
		violations.push({ id: 'spaces', severity });
	}

	// removeSpaces (normalisation for comparison)
	const answerStr = normalizeDecimalComma(removeSpaces(answerNoZeros));

	// === Parse AST ===
	const answerParse = parseLatexSafe(answerStr, { genericFunctions: options.genericFunctions });
	if (!answerParse.ast || answerParse.errors.length > 0) {
		// Can't parse, can't check form — treat as bad_form
		return {
			valid: false,
			status: 'bad_form',
			violations: [],
			messages: ['Parse error on answer']
		};
	}

	let answerAST = answerParse.ast;

	// === Phase AST: apply transformers sequentially, detecting violations ===
	for (const step of buildASTPipeline(options)) {
		const before = toLatex(answerAST);
		answerAST = step.transform(answerAST);
		const after = toLatex(answerAST);

		if (
			before !== after &&
			step.constraintId &&
			(constraints[step.constraintId] ?? 'warn') !== 'off'
		) {
			const severity = (constraints[step.constraintId] ?? 'warn') as 'strict' | 'warn';
			violations.push({ id: step.constraintId, severity });
		}
	}

	// === Same pipeline for expected ===
	const expectedStr = normalizeDecimalComma(removeSpaces(removeZeros(expectedLatex)));
	const expectedParse = parseLatexSafe(expectedStr, {
		genericFunctions: options.genericFunctions
	});
	if (!expectedParse.ast || expectedParse.errors.length > 0) {
		return {
			valid: false,
			status: 'bad_form',
			violations: [],
			messages: ['Parse error on expected']
		};
	}

	const expectedAST = applyFullASTPipeline(expectedParse.ast, options);

	// === Pourcentage (décisions du 2026-09-27) ===
	// Attendu `20 %`, réponse de même valeur sans le symbole : perfectible, mais
	// SEULEMENT pour une écriture finale (`0,2`, `1/5`). Un calcul non effectué
	// (`0,1+0,1`, `2 × 10 %`) suit la comparaison de forme : mauvaise forme.
	// L'inverse (`710 %` pour 7,1) échoue aussi à la comparaison finale.
	if (isPercentWriting(expectedAST) && isFinalNumberWriting(answerParse.ast)) {
		const severity = constraints['percent'] ?? 'warn';
		const withPercent =
			severity === 'off' ? violations : [...violations, { id: 'percent', severity }];
		return verdictOf(withPercent, messages);
	}

	// === Final comparison ===
	// « * » (réponses attendues écrites en syntaxe simple) et « × » (clavier de
	// l'élève) sont le même signe : le style d'affichage n'est pas une forme.
	const answerFinal = toLatex(withCrossMultiplication(answerAST));
	const expectedFinal = toLatex(withCrossMultiplication(expectedAST));

	if (answerFinal !== expectedFinal) {
		return { valid: false, status: 'bad_form', violations, messages };
	}

	// Form OK — check constraint violations
	return verdictOf(violations, messages);
}

/** Verdict d'une forme conforme : les violations strictes refusent, les autres avertissent */
function verdictOf(
	violations: Array<{ id: string; severity: 'strict' | 'warn' }>,
	messages: string[]
): CheckFormResult {
	const strictViolations = violations.filter((v) => v.severity === 'strict');
	const warnViolations = violations.filter((v) => v.severity === 'warn');

	if (strictViolations.length > 0) {
		return { valid: false, status: 'bad_form', violations: strictViolations, messages };
	}

	if (warnViolations.length > 0) {
		return { valid: true, status: 'unoptimal_form', violations: warnViolations, messages };
	}

	return { valid: true, status: 'correct', violations: [], messages };
}
