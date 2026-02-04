/**
 * Required Form Validator
 *
 * Validates that student answers match a required structural form
 * (product, sum, fraction, power, or custom pattern).
 *
 * The validation is purely structural - it doesn't check mathematical
 * correctness. If the value is correct but form is wrong → bad_form (0 points).
 *
 * @module questions/required-form-validator
 */

import type { MathNode } from '$lib/mathAST/types';
import type { RequiredForm } from './types';
import {
	parseLatex,
	isMultiplication,
	isAddition,
	isDivision,
	isSuperscript,
	isNumber,
	isOpposite,
	flattenProductShallow,
	stripUnnecessaryBrackets,
	P,
	matches
} from '$lib/mathAST';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Feedback messages for required form violations (French)
 */
export const REQUIRED_FORM_FEEDBACK = {
	product: 'La réponse doit être écrite sous forme de produit.',
	sum: 'La réponse doit être écrite sous forme de somme.',
	fraction: 'La réponse doit être écrite sous forme de fraction.',
	power: 'La réponse doit être écrite sous forme de puissance.',
	pattern: 'La réponse ne respecte pas la forme demandée.'
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if a factor is "trivial" (1 or -1), making the product form invalid.
 *
 * A product like 1×7 is not considered a valid "product form" because
 * it's mathematically equivalent to just 7.
 *
 * @param factor - A factor from a flattened product
 * @returns true if the factor is 1 or -1
 */
function isTrivialFactor(factor: MathNode): boolean {
	// Direct 1
	if (isNumber(factor) && factor.value === '1') {
		return true;
	}

	// -1 as opposite of 1
	if (isOpposite(factor) && isNumber(factor.operand) && factor.operand.value === '1') {
		return true;
	}

	return false;
}

/**
 * Checks if a node represents a valid product form.
 *
 * A valid product must:
 * - Be a multiplication node at the top level
 * - Have at least 2 factors when flattened
 * - Not contain trivial factors (1 or -1)
 *
 * @param node - The MathAST node to check
 * @returns true if the node is a valid product form
 */
function isValidProduct(node: MathNode): boolean {
	if (!isMultiplication(node)) {
		return false;
	}

	const factors = flattenProductShallow(node);

	// Must have at least 2 factors
	if (factors.length < 2) {
		return false;
	}

	// No trivial factors allowed (1 or -1)
	for (const factor of factors) {
		if (isTrivialFactor(factor)) {
			return false;
		}
	}

	return true;
}

/**
 * Checks if a node represents a valid sum form.
 *
 * A valid sum must be an addition node at the top level.
 * Note: subtraction (a - b) is NOT considered a sum form.
 *
 * @param node - The MathAST node to check
 * @returns true if the node is a valid sum form
 */
function isValidSum(node: MathNode): boolean {
	return isAddition(node);
}

/**
 * Checks if a node represents a valid fraction form.
 *
 * A valid fraction is any division node.
 *
 * @param node - The MathAST node to check
 * @returns true if the node is a valid fraction form
 */
function isValidFraction(node: MathNode): boolean {
	return isDivision(node);
}

/**
 * Checks if a node represents a valid power form.
 *
 * A valid power is any superscript node (a^b).
 *
 * @param node - The MathAST node to check
 * @returns true if the node is a valid power form
 */
function isValidPower(node: MathNode): boolean {
	return isSuperscript(node);
}

/**
 * Checks if a node matches a predefined form type.
 *
 * @param node - The MathAST node to check
 * @param formType - The predefined form type
 * @returns true if the node matches the form
 */
function matchesPredefinedForm(
	node: MathNode,
	formType: 'product' | 'sum' | 'fraction' | 'power'
): boolean {
	switch (formType) {
		case 'product':
			return isValidProduct(node);
		case 'sum':
			return isValidSum(node);
		case 'fraction':
			return isValidFraction(node);
		case 'power':
			return isValidPower(node);
	}
}

/**
 * Checks if a node matches a custom pattern.
 *
 * Uses the pattern matching system from mathAST.
 *
 * @param node - The MathAST node to check
 * @param patternStr - The pattern string (e.g., 'a:integer * b:integer')
 * @returns true if the node matches the pattern
 */
function matchesCustomPattern(node: MathNode, patternStr: string): boolean {
	try {
		const pattern = P.parse(patternStr);
		return matches(pattern, node);
	} catch {
		// Invalid pattern - treat as no match
		return false;
	}
}

/**
 * Checks if a single answer matches the required form.
 *
 * @param node - The parsed MathAST node (with unnecessary brackets stripped)
 * @param requiredForm - The required form specification
 * @returns true if the answer matches the required form
 */
function matchesRequiredForm(node: MathNode, requiredForm: RequiredForm): boolean {
	if (typeof requiredForm === 'string') {
		return matchesPredefinedForm(node, requiredForm);
	} else {
		return matchesCustomPattern(node, requiredForm.pattern);
	}
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Checks if student answers match the required structural form.
 *
 * Returns the indices of answers that violate the required form.
 * Empty array means all answers match.
 *
 * @param answersLatex - Array of LaTeX strings (student answers)
 * @param requiredForm - The required form specification
 * @returns Array of indices where the form is violated
 *
 * @example
 * // Check if answer is a product
 * checkRequiredForm(['2 \\times 3'], 'product')
 * // => [] (valid)
 *
 * checkRequiredForm(['1 \\times 7'], 'product')
 * // => [0] (invalid - trivial factor)
 *
 * checkRequiredForm(['6'], 'product')
 * // => [0] (invalid - not a product)
 *
 * @example
 * // Check custom pattern
 * checkRequiredForm(['2 \\times 3'], { pattern: 'a:integer * b:integer' })
 * // => [] (valid)
 */
export function checkRequiredForm(answersLatex: string[], requiredForm: RequiredForm): number[] {
	const violations: number[] = [];

	for (let i = 0; i < answersLatex.length; i++) {
		const latex = answersLatex[i];

		try {
			// Parse the LaTeX
			const node = parseLatex(latex);

			// Strip unnecessary brackets before checking form
			// This ensures (2×3) is treated the same as 2×3
			const strippedNode = stripUnnecessaryBrackets(node);

			// Check if the form matches
			if (!matchesRequiredForm(strippedNode, requiredForm)) {
				violations.push(i);
			}
		} catch {
			// Parse error - consider as form violation
			violations.push(i);
		}
	}

	return violations;
}

/**
 * Gets the appropriate feedback message for a required form violation.
 *
 * @param requiredForm - The required form specification
 * @param isMultiple - Whether there are multiple answers
 * @returns The feedback message in French
 */
export function getRequiredFormFeedback(requiredForm: RequiredForm, _isMultiple: boolean): string {
	if (typeof requiredForm === 'string') {
		return REQUIRED_FORM_FEEDBACK[requiredForm];
	} else {
		return REQUIRED_FORM_FEEDBACK.pattern;
	}
}
