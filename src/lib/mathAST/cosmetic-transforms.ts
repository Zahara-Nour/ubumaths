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
import { number, opposite, multiply, divide, add, subtract } from './factory';
import { mapNode, stripUnnecessaryBrackets, removeNullTermsAST } from './transforms';
import {
	flattenSumShallow,
	flattenProductShallow,
	unflattenSum,
	unflattenProduct
} from './flatten';
import { parseLatexSafe } from './parser';
import { toLatex } from './latex-generator';
import { gcd, compareNodes } from './normal';
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
	// Match at word boundaries or after operators
	result = result.replace(/(^|[+\-*/=({,\s\\])0+(\d)/g, '$1$2');

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
 * Handles numeric fractions and monomial fractions.
 *
 * 4/6 → 2/3, 6/3 → 2, 4x/6x → 2/3
 */
export function reduceFractionsAST(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'division') return node;
		// Only handle fraction-style divisions
		if (node.displayStyle !== 'fraction') return node;

		const numValue = extractNumericValue(node.numerator);
		const denValue = extractNumericValue(node.denominator);

		if (numValue !== null && denValue !== null && denValue !== 0) {
			const absNum = BigInt(Math.round(Math.abs(numValue)));
			const absDen = BigInt(Math.round(Math.abs(denValue)));
			const g = gcd(absNum, absDen);

			if (g > 1n || absDen === 1n) {
				const sign = numValue < 0 !== denValue < 0 ? -1 : 1;
				const newNum = Number(absNum / g);
				const newDen = Number(absDen / g);

				if (newDen === 1) {
					const result = number(String(newNum));
					return sign < 0 ? opposite(result) : result;
				}

				const numNode = number(String(newNum));
				const denNode = number(String(newDen));
				const frac = divide(numNode, denNode, 'fraction');
				return sign < 0 ? opposite(frac) : frac;
			}
		}

		// Check for reducible coefficients in monomial fractions (like 2x/4 → x/2)
		const numCoef = extractCoefficient(node.numerator);
		const denCoef = extractCoefficient(node.denominator);

		if (numCoef !== null && denCoef !== null && denCoef !== 0) {
			const absNumCoef = BigInt(Math.round(Math.abs(numCoef)));
			const absDenCoef = BigInt(Math.round(Math.abs(denCoef)));
			const g = gcd(absNumCoef, absDenCoef);

			if (g > 1n || absDenCoef === 1n) {
				const sign = numCoef < 0 !== denCoef < 0 ? -1 : 1;
				const newNumCoef = Number(absNumCoef / g);
				const newDenCoef = Number(absDenCoef / g);

				const numVarPart = extractVariablePart(node.numerator);
				const denVarPart = extractVariablePart(node.denominator);

				// Rebuild numerator: coefficient * variable part
				let newNum: MathNode;
				if (numVarPart) {
					newNum =
						newNumCoef === 1
							? numVarPart
							: multiply(number(String(newNumCoef)), numVarPart, 'implicit');
				} else {
					newNum = number(String(newNumCoef));
				}

				// Rebuild denominator: coefficient * variable part
				let newDen: MathNode;
				if (denVarPart) {
					newDen =
						newDenCoef === 1
							? denVarPart
							: multiply(number(String(newDenCoef)), denVarPart, 'implicit');
				} else {
					newDen = number(String(newDenCoef));
				}

				// If denominator is 1, return just the numerator
				if (newDenCoef === 1 && !denVarPart) {
					return sign < 0 ? opposite(newNum) : newNum;
				}

				const frac = divide(newNum, newDen, 'fraction');
				return sign < 0 ? opposite(frac) : frac;
			}
		}

		return node;
	});
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

/** Extract numeric value from a node (handles numbers, opposites, delimiters) */
function extractNumericValue(node: MathNode): number | null {
	if (node.type === 'number') return parseFloat(node.value);
	if (node.type === 'opposite') {
		const inner = extractNumericValue(node.operand);
		return inner !== null ? -inner : null;
	}
	if (node.type === 'positive') return extractNumericValue(node.operand);
	if (node.type === 'delimiter') return extractNumericValue(node.content);
	return null;
}

/** Extract the numeric coefficient from a node */
function extractCoefficient(node: MathNode): number | null {
	const numValue = extractNumericValue(node);
	if (numValue !== null) return numValue;

	if (node.type === 'multiplication') {
		const leftNum = extractNumericValue(node.left);
		if (leftNum !== null) return leftNum;
		const rightNum = extractNumericValue(node.right);
		if (rightNum !== null) return rightNum;
	}

	if (node.type === 'opposite' && node.operand.type === 'multiplication') {
		const coef = extractCoefficient(node.operand);
		return coef !== null ? -coef : null;
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
		const leftNum = extractNumericValue(node.left);
		const rightNum = extractNumericValue(node.right);

		if (leftNum !== null && rightNum === null) return node.right;
		if (rightNum !== null && leftNum === null) return node.left;
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

/** The ordered list of AST transformers */
const AST_PIPELINE: TransformerStep[] = [
	{ transform: reduceFractionsAST, constraintId: 'reducedFractions' },
	{ transform: simplifyNullProductsAST, constraintId: 'factorZero' },
	{ transform: removeNullTermsAST, constraintId: 'nullTerms' },
	{ transform: removeFactorsOneAST, constraintId: 'factorOne' },
	{ transform: removeSignsAST, constraintId: 'signs' },
	{ transform: stripUnnecessaryBrackets, constraintId: 'brackets' },
	{ transform: removeMultOperatorAST, constraintId: 'products' },
	{ transform: sortTermsAndFactorsAST, constraintId: null } // normalisation only
];

/**
 * Apply the full AST pipeline and return the final AST.
 */
function applyFullASTPipeline(ast: MathNode): MathNode {
	let current = ast;
	for (const step of AST_PIPELINE) {
		current = step.transform(current);
	}
	return current;
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
	constraints: Record<string, ConstraintSeverity>
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
	for (const step of AST_PIPELINE) {
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

	const expectedAST = applyFullASTPipeline(expectedParse.ast);

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
