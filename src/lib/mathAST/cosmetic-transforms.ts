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
import { number, opposite, multiply, divide, add, subtract } from './factory';
import { extractRational } from './common/numeric';
import { mapNode, stripUnnecessaryBrackets, removeNullTermsAST } from './transforms';
import {
	flattenSumShallow,
	flattenProductShallow,
	unflattenSum,
	unflattenProduct
} from './flatten';
import { parseLatexSafe } from './parser';
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
	result = result.replace(/(^|(?<!\\)[+\-*/=({,])0+(\d)/g, '$1$2');

	// Leading zeros followed by digit-grouping thin space: 0\,565 → 565
	// A zero at a position where leading zeros are valid (start or after operator),
	// followed by \, and then digits, is a superfluous leading zero with grouping.
	result = result.replace(/(^|[+\-*/=({,])0+(?:\\,\s?)+(\d)/g, '$1$2');

	// Handle trailing decimal zeros: 1.0 → 1, 1.20 → 1.2, 1.00 → 1
	// Also handles French comma (with {,}): 1{,}0 → 1
	// Using a loop to handle all occurrences
	result = result.replace(/(\d+)\.(\d*?)0+(?=\D|$)/g, (_, intPart, decPart) => {
		if (decPart === '') return intPart; // 1.0 → 1
		return `${intPart}.${decPart}`;
	});

	// Handle French decimal comma format: {,}0 trailing
	result = result.replace(/(\d+)\{,\}(\d*?)0+(?=\D|$)/g, (_, intPart, decPart) => {
		if (decPart === '') return intPart;
		return `${intPart}{,}${decPart}`;
	});

	// Handle plain comma as decimal: 1,0 → 1
	result = result.replace(/(\d+),(\d*?)0+(?=\D|$)/g, (_, intPart, decPart) => {
		if (decPart === '') return intPart;
		return `${intPart},${decPart}`;
	});

	return result;
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

		// Check integer part: 4+ digits need spaces
		const intDigits = integerPart.replace(/\s/g, '');
		if (intDigits.length > 3 && !integerPart.includes(' ')) return true;

		// Check decimal part: 4+ digits need spaces
		const decDigits = decimalPart.replace(/\s/g, '');
		if (decDigits.length > 3 && !decimalPart.includes(' ')) return true;
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
 * Remove explicit multiplication operators where implicit is possible.
 * 2 × x → 2x (implicit), but 2 × 3 stays (ambiguous)
 */
export function removeMultOperatorAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'multiplication') return node;

		// Only applies to explicit multiplication (dot, cross, star)
		if (node.displayStyle === 'implicit') return node;

		// Can't make implicit between two pure numbers (23 would be ambiguous)
		if (isPureNumber(node.left) && isPureNumber(node.right)) return node;

		// Convert to implicit
		return multiply(node.left, node.right, 'implicit');
	});
}

/**
 * Sort terms in sums and factors in products into canonical order.
 * b + a → a + b, y * x → x * y
 */
export function sortTermsAndFactorsAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		// Sort terms in sums
		if (node.type === 'addition' || node.type === 'subtraction') {
			const terms = flattenSumShallow(node);
			if (terms.length <= 1) return node;

			const sorted = [...terms].sort((a, b) => compareNodes(a.term, b.term));

			// Check if already sorted
			const changed = sorted.some((t, i) => t.term !== terms[i].term || t.sign !== terms[i].sign);
			if (!changed) return node;

			return unflattenSum(sorted) ?? node;
		}

		// Sort factors in products
		if (node.type === 'multiplication') {
			const factors = flattenProductShallow(node);
			if (factors.length <= 1) return node;

			const sorted = [...factors].sort((a, b) => compareNodes(a.factor, b.factor));

			const changed = sorted.some((f, i) => f.factor !== factors[i].factor);
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
export interface CheckFormResult {
	valid: boolean;
	status: 'correct' | 'bad_form' | 'unoptimal_form';
	violations: Array<{ id: string; severity: 'strict' | 'warn' }>;
	messages: string[];
}

/** AST transformer step definition */
interface TransformerStep {
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
function buildASTPipeline(options: CheckFormOptions = {}): TransformerStep[] {
	return [
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
		{ transform: sortTermsAndFactorsAST, constraintId: null } // normalisation only
	];
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
	const parsed = parseLatexSafe(latex.trim());
	if (!parsed.ast || parsed.errors.length > 0) return false;

	let node: MathNode = parsed.ast;
	// Peel a single leading sign wrapper (-x / +x).
	if (node.type === 'opposite' || node.type === 'positive') {
		node = node.operand;
	}
	return node.type === 'number';
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

	const answerStr = removeSpaces(answerNoZeros);

	// === Parse AST ===
	const answerParse = parseLatexSafe(answerStr);
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
	const answerStr = removeSpaces(answerNoZeros);

	// === Parse AST ===
	const answerParse = parseLatexSafe(answerStr);
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
	const expectedStr = removeSpaces(removeZeros(expectedLatex));
	const expectedParse = parseLatexSafe(expectedStr);
	if (!expectedParse.ast || expectedParse.errors.length > 0) {
		return {
			valid: false,
			status: 'bad_form',
			violations: [],
			messages: ['Parse error on expected']
		};
	}

	const expectedAST = applyFullASTPipeline(expectedParse.ast, options);

	// === Final comparison ===
	const answerFinal = toLatex(answerAST);
	const expectedFinal = toLatex(expectedAST);

	if (answerFinal !== expectedFinal) {
		return { valid: false, status: 'bad_form', violations, messages };
	}

	// Form OK — check constraint violations
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
