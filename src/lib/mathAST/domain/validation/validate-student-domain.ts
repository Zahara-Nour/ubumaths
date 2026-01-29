/**
 * Student Domain Validation
 *
 * Validates a student's domain answer against the correct domain.
 * Provides detailed feedback and partial credit.
 *
 * @module mathAST/domain/validation/validate-student-domain
 */

import type { MathNode } from '../../types';
import type { Domain } from '../types';
import type { DomainValidationResult, DomainValidationOptions } from './types';
import { parseStudentDomain } from './parse-student-domain';
import {
	compareDomains,
	calculateDomainSimilarity,
	describeDomainRelationship
} from './compare-domains';
import { isEmpty } from '../algebra';
import { formatInterval } from '../format';

// =============================================================================
// Main API
// =============================================================================

/**
 * Validate a student's domain answer.
 *
 * @param studentAnswer - The student's answer string
 * @param correctDomain - The correct domain
 * @param expression - The original mathematical expression (for feedback)
 * @param options - Validation options
 * @returns DomainValidationResult with score, feedback, and details
 *
 * @example
 * ```typescript
 * const expr = { type: 'function', name: 'sqrt', args: [{ type: 'variable', name: 'x' }] };
 * const correct = intervalDomain([greaterThanOrEqual(fromNumber(0))]);
 *
 * const result = validateStudentDomain(']0, +∞[', correct, expr);
 * // {
 * //   isCorrect: false,
 * //   score: 85,
 * //   feedback: ["Tu as exclu x = 0, mais √0 est défini et vaut 0"],
 * //   missingParts: { point: 0 }
 * // }
 * ```
 */
export function validateStudentDomain(
	studentAnswer: string,
	correctDomain: Domain,
	expression: MathNode,
	options: DomainValidationOptions = {}
): DomainValidationResult {
	const {
		// allowEquivalent = true,  // Reserved for future use
		partialCredit = true,
		variable = 'x'
		// tolerance = 1e-10  // Reserved for future use
	} = options;

	// Parse student's answer
	const parseResult = parseStudentDomain(studentAnswer, variable);

	if (!parseResult.success) {
		return {
			isCorrect: false,
			score: 0,
			feedback: [parseResult.error],
			parseError: parseResult.error
		};
	}

	const studentDomain = parseResult.domain;

	// Compare domains
	const comparison = compareDomains(studentDomain, correctDomain);

	// Check for equality
	if (comparison.areEqual) {
		return {
			isCorrect: true,
			score: 100,
			feedback: ['Correct !']
		};
	}

	// Not equal - generate feedback
	const feedback: string[] = [];

	// Calculate score based on similarity
	const score = partialCredit ? calculateDomainSimilarity(studentDomain, correctDomain) : 0;

	// Add relationship description
	feedback.push(describeDomainRelationship(comparison));

	// Add specific feedback about missing/extra parts
	if (!isEmpty(comparison.studentMissing)) {
		const missingFormatted = formatInterval(comparison.studentMissing);
		feedback.push(`Valeurs manquantes : ${missingFormatted}`);
	}

	if (!isEmpty(comparison.studentExtra)) {
		const extraFormatted = formatInterval(comparison.studentExtra);
		feedback.push(`Valeurs en trop : ${extraFormatted}`);
	}

	// Generate pedagogical hints based on the expression structure
	const hints = generateExpressionBasedHints(expression, comparison, variable);
	feedback.push(...hints);

	return {
		isCorrect: false,
		score,
		feedback,
		missingParts: comparison.studentMissing,
		extraParts: comparison.studentExtra
	};
}

// =============================================================================
// Expression-Based Hints
// =============================================================================

/**
 * Generate hints based on the expression structure.
 */
function generateExpressionBasedHints(
	expression: MathNode,
	comparison: ReturnType<typeof compareDomains>,
	variable: string
): string[] {
	const hints: string[] = [];

	// Analyze expression structure
	const constraints = analyzeExpressionConstraints(expression, variable);

	// If student is missing parts, suggest what constraint they might have missed
	if (!isEmpty(comparison.studentMissing)) {
		for (const constraint of constraints) {
			if (constraint.type === 'boundary' && !comparison.studentIsSuperset) {
				hints.push(
					`Vérifie si la borne ${variable} = ${constraint.value} doit être incluse ou exclue.`
				);
			}
		}
	}

	// If student has extra parts, they likely misunderstood a constraint
	if (!isEmpty(comparison.studentExtra)) {
		for (const constraint of constraints) {
			if (constraint.type === 'division') {
				hints.push(`N'oublie pas que la division par zéro est interdite.`);
			} else if (constraint.type === 'sqrt') {
				hints.push(`Rappelle-toi que √u n'existe que si u ≥ 0.`);
			} else if (constraint.type === 'ln') {
				hints.push(`Rappelle-toi que ln(u) n'existe que si u > 0.`);
			}
		}
	}

	return hints;
}

/**
 * Constraint types found in expressions.
 */
interface ExpressionConstraint {
	type: 'sqrt' | 'ln' | 'division' | 'arcsin' | 'arccos' | 'tan' | 'power' | 'boundary';
	value?: number;
	expression?: string;
}

/**
 * Analyze an expression to find constraint sources.
 */
function analyzeExpressionConstraints(node: MathNode, _variable: string): ExpressionConstraint[] {
	const constraints: ExpressionConstraint[] = [];

	function traverse(n: MathNode): void {
		switch (n.type) {
			case 'function':
				// Check function constraints
				switch (n.name) {
					case 'sqrt':
						constraints.push({ type: 'sqrt' });
						break;
					case 'ln':
					case 'log':
					case 'log10':
					case 'log2':
						constraints.push({ type: 'ln' });
						break;
					case 'asin':
					case 'arcsin':
					case 'acos':
					case 'arccos':
						constraints.push({ type: 'arcsin' });
						break;
					case 'tan':
						constraints.push({ type: 'tan' });
						break;
				}
				// Recurse into arguments
				for (const arg of n.args) {
					traverse(arg);
				}
				break;

			case 'division':
				constraints.push({ type: 'division' });
				traverse(n.numerator);
				traverse(n.denominator);
				break;

			case 'superscript':
				// Check for negative exponent
				if (n.superscript.type === 'number' && parseFloat(n.superscript.value) < 0) {
					constraints.push({ type: 'power' });
				}
				// Check for fractional exponent with even denominator (sqrt-like)
				if (n.superscript.type === 'division') {
					const den = n.superscript.denominator;
					if (den.type === 'number' && parseInt(den.value) % 2 === 0) {
						constraints.push({ type: 'sqrt' });
					}
				}
				traverse(n.base);
				traverse(n.superscript);
				break;

			case 'addition':
			case 'subtraction':
				traverse(n.left);
				traverse(n.right);
				break;

			case 'multiplication':
				traverse(n.left);
				traverse(n.right);
				break;

			case 'opposite':
			case 'positive':
				traverse(n.operand);
				break;

			case 'delimiter':
				traverse(n.content);
				break;
		}
	}

	traverse(node);
	return constraints;
}
