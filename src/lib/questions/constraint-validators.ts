/**
 * Constraint Validators
 * =====================
 *
 * Check if mathematically correct answers are written in proper form.
 * These validators check the raw student input (LaTeX from MathLive),
 * not canonical equivalence.
 *
 * Each validator returns an array of indices where violations were found,
 * supporting questions with multiple answers.
 *
 * @module questions/constraint-validators
 */

import { parseLatexQuantity, extractUnitFromLatex } from './units/parser';
import { normalizeStudentQuantity } from './units/student-input';
import { checkExactUnitMatch } from './units/validator';
import {
	parseLatexSafe,
	isMultiplication,
	isDelimiter,
	isNumber,
	isOpposite,
	visitAST,
	type MathNode,
	type DivisionNode
} from '$lib/mathAST';
import { gcd } from '$lib/mathAST/normal';

// ============================================================================
// REDUCED FRACTIONS VALIDATOR
// ============================================================================

/**
 * Extract numeric value from a node, handling:
 * - Direct numbers: 5 → 5
 * - Opposite of numbers: -5 → -5
 * - Delimiters wrapping numbers: (5) → 5, (-5) → -5
 * Returns null if node is not purely numeric.
 */
function extractNumericValue(node: MathNode): number | null {
	// Direct number
	if (isNumber(node)) {
		return parseFloat(node.value);
	}

	// Opposite (negative)
	if (isOpposite(node)) {
		const inner = extractNumericValue(node.operand);
		return inner !== null ? -inner : null;
	}

	// Delimiter (parentheses)
	if (isDelimiter(node)) {
		return extractNumericValue(node.content);
	}

	return null;
}

/**
 * Extract the numeric coefficient from a node.
 * For multiplication like 2x, returns 2.
 * For pure numbers, returns the number.
 * For pure variables or complex expressions, returns null.
 */
function extractCoefficient(node: MathNode): number | null {
	// Direct number
	const numValue = extractNumericValue(node);
	if (numValue !== null) {
		return numValue;
	}

	// Multiplication: check if one side is a number (coefficient)
	if (isMultiplication(node)) {
		const leftNum = extractNumericValue(node.left);
		if (leftNum !== null) {
			return leftNum;
		}
		const rightNum = extractNumericValue(node.right);
		if (rightNum !== null) {
			return rightNum;
		}
	}

	// Opposite of multiplication: -2x
	if (isOpposite(node) && isMultiplication(node.operand)) {
		const coef = extractCoefficient(node.operand);
		return coef !== null ? -coef : null;
	}

	// Delimiter wrapping multiplication: (2x)
	if (isDelimiter(node)) {
		return extractCoefficient(node.content);
	}

	return null;
}

/**
 * Check if fractions are reduced to their lowest terms
 *
 * Uses mathAST to parse the LaTeX and analyze fraction nodes.
 * A fraction is considered non-reduced if the GCD of numerator and
 * denominator coefficients is greater than 1, or if denominator is 1.
 *
 * Works with:
 * - Simple numeric fractions: 2/4 → 1/2
 * - Negative fractions: -4/6 → -2/3
 * - Fractions with variables: 2x/4 → x/2
 * - Expressions containing fractions: 1 + 2/4
 *
 * @param answersLatex - Array of LaTeX strings
 * @returns Indices of answers with non-reduced fractions
 *
 * @example
 * checkReducedFractions(['\\frac{2}{4}'])    // Returns [0] - can be reduced to 1/2
 * checkReducedFractions(['\\frac{1}{2}'])    // Returns [] - already reduced
 * checkReducedFractions(['\\frac{6}{9}'])    // Returns [0] - can be reduced to 2/3
 * checkReducedFractions(['\\frac{10}{5}'])   // Returns [0] - can be reduced to 2
 * checkReducedFractions(['\\frac{-4}{6}'])   // Returns [0] - can be reduced to -2/3
 * checkReducedFractions(['\\frac{2x}{4}'])   // Returns [0] - can be reduced to x/2
 * checkReducedFractions(['\\frac{3}{7}'])    // Returns [] - already reduced
 * checkReducedFractions(['2'])               // Returns [] - not a fraction
 */
export function checkReducedFractions(answersLatex: string[]): number[] {
	const violations: number[] = [];

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];
		if (!latex?.trim()) continue;

		// Quick check: skip if no fraction in the answer
		// Match both \frac and \dfrac
		if (!latex.includes('\\frac') && !latex.includes('\\dfrac')) continue;

		const parseResult = parseLatexSafe(latex);

		// If parsing fails, skip (no violation detected)
		if (!parseResult.ast || parseResult.errors.length > 0) {
			continue;
		}

		let hasUnreducedFraction = false;

		visitAST(parseResult.ast, {
			enterDivision(node: DivisionNode) {
				// Only check \frac{}{} style fractions
				if (node.displayStyle !== 'fraction') return;

				// Extract numeric values or coefficients
				const numValue = extractNumericValue(node.numerator);
				const denValue = extractNumericValue(node.denominator);

				if (numValue !== null && denValue !== null) {
					// Pure numeric fraction
					const absNum = BigInt(Math.round(Math.abs(numValue)));
					const absDen = BigInt(Math.round(Math.abs(denValue)));

					// Fraction is reducible if:
					// - GCD > 1 (can simplify)
					// - Denominator is 1 (trivial fraction like 5/1)
					if (gcd(absNum, absDen) > 1n || absDen === 1n) {
						hasUnreducedFraction = true;
						return 'skip';
					}
				} else {
					// Check for reducible coefficients (like 2x/4)
					const numCoef = extractCoefficient(node.numerator);
					const denCoef = extractCoefficient(node.denominator);

					if (numCoef !== null && denCoef !== null) {
						const absNumCoef = BigInt(Math.round(Math.abs(numCoef)));
						const absDenCoef = BigInt(Math.round(Math.abs(denCoef)));

						if (gcd(absNumCoef, absDenCoef) > 1n) {
							hasUnreducedFraction = true;
							return 'skip';
						}
					}
				}
			}
		});

		if (hasUnreducedFraction) {
			violations.push(i);
		}
	}

	return violations;
}

// ============================================================================
// UNIT MATCH VALIDATOR
// ============================================================================

/**
 * Check that answer units match the expected units exactly.
 *
 * Only applies to answers that contain units (parsed via parseLatexQuantity).
 * Answers without parseable units are skipped (not flagged as violations).
 *
 * @param answersLatex - Student answers in LaTeX format
 * @param expectedAnswers - Expected answers in LaTeX format
 * @returns Array of indices where units don't match
 */
export function checkUnit(answersLatex: string[], expectedAnswers: string[]): number[] {
	const violations: number[] = [];

	for (let i = 0; i < answersLatex.length; i++) {
		const expected = expectedAnswers[i];
		if (!expected) continue;

		// Saisie MathLive ramenée à `valeur\unit{écriture}`, seulement quand une unité
		// est attendue : sans unité attendue, `5km` reste le produit 5·k·m.
		const userLatex =
			extractUnitFromLatex(expected) !== null
				? normalizeStudentQuantity(answersLatex[i])
				: answersLatex[i];
		const userQuantity = parseLatexQuantity(userLatex);
		const expectedQuantity = parseLatexQuantity(expected);

		// Skip if either side doesn't have a parseable unit
		if (!userQuantity || !expectedQuantity) continue;

		if (!checkExactUnitMatch(userQuantity.unit, expectedQuantity.unit)) {
			violations.push(i);
		}
	}

	return violations;
}
