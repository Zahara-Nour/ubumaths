/**
 * Mistake Detection
 *
 * Detects common mistakes in student domain answers by analyzing
 * the expression structure and comparing with the student's answer.
 *
 * @module mathAST/domain/validation/detect-mistakes
 */

import type { MathNode } from '../../types';
import type { Domain, IntervalSet } from '../types';
import type { DomainMistake, DomainMistakeType } from './mistake-types';
import { getMistakeSeverity } from './mistake-types';
import { getMistakeDescription, applyMistakeCorrectionTemplate } from './mistake-descriptions';
import { isEmpty, difference, containsValue } from '../algebra';
import { formatInterval } from '../format';
import { toCustom } from '../../custom-generator';
import { findZeros } from '../preimage';

// =============================================================================
// Main API
// =============================================================================

/**
 * Detect common mistakes in a student's domain answer.
 *
 * Analyzes the expression structure to identify expected constraints,
 * then compares with the student's answer to detect specific error patterns.
 *
 * @param studentDomain - The student's domain answer
 * @param correctDomain - The correct domain
 * @param expression - The mathematical expression
 * @param variable - The variable name (default: 'x')
 * @returns Array of detected mistakes with descriptions and corrections
 *
 * @example
 * ```typescript
 * // Expression: 1/x
 * const expr = { type: 'division', numerator: ..., denominator: { type: 'variable', name: 'x' } };
 * const student = universalDomain();  // Student forgot to exclude 0
 * const correct = excludePoints(universalDomain(), [fromNumber(0)]);
 *
 * const mistakes = detectDomainMistakes(student, correct, expr);
 * // [{ type: 'forgot_denominator', description: "Tu as oublié d'exclure...", ... }]
 * ```
 */
export function detectDomainMistakes(
	studentDomain: Domain,
	correctDomain: Domain,
	expression: MathNode,
	variable: string = 'x'
): readonly DomainMistake[] {
	const mistakes: DomainMistake[] = [];

	// Check excluded points separately (difference() doesn't handle excluded points well)
	const studentExcluded = getExcludedPoints(studentDomain);
	const correctExcluded = getExcludedPoints(correctDomain);

	// Points that correct excludes but student doesn't
	const missingExclusions = correctExcluded.filter(
		(cp) => !studentExcluded.some((sp) => Math.abs(sp - cp) < 0.001)
	);

	// Points that student excludes but correct doesn't
	const extraExclusions = studentExcluded.filter(
		(sp) => !correctExcluded.some((cp) => Math.abs(sp - cp) < 0.001)
	);

	// Quick check for interval equality (ignoring excluded points)
	const studentMissing = difference(correctDomain, studentDomain);
	const studentExtra = difference(studentDomain, correctDomain);

	// Check if domains are effectively equal
	const intervalsAreSame = isEmpty(studentMissing) && isEmpty(studentExtra);
	const exclusionsAreSame = missingExclusions.length === 0 && extraExclusions.length === 0;

	if (intervalsAreSame && exclusionsAreSame) {
		return [];
	}

	const hasExcludedPointDifference = missingExclusions.length > 0 || extraExclusions.length > 0;

	// Analyze expression to find expected constraints
	const expectedConstraints = analyzeExpressionConstraints(expression, variable);

	// Check for "forgot constraint" mistakes
	const forgotMistakes = detectForgotConstraintMistakes(
		studentDomain,
		correctDomain,
		expression,
		expectedConstraints,
		variable
	);
	mistakes.push(...forgotMistakes);

	// Check for boundary mistakes
	const boundaryMistakes = detectBoundaryMistakes(studentDomain, correctDomain, variable);
	mistakes.push(...boundaryMistakes);

	// Check for excluded point mistakes (only if no forgot constraint mistakes found)
	// This avoids duplicate reporting
	if (mistakes.length === 0 || hasExcludedPointDifference) {
		const excludedPointMistakes = detectExcludedPointMistakes(
			studentDomain,
			correctDomain,
			expression,
			variable
		);
		mistakes.push(...excludedPointMistakes);
	}

	// Check for extra restriction mistakes
	if (!isEmpty(studentExtra)) {
		const extraMistakes = detectExtraRestrictionMistakes(
			studentDomain,
			correctDomain,
			studentExtra,
			variable
		);
		mistakes.push(...extraMistakes);
	}

	return mistakes;
}

// =============================================================================
// Expression Constraint Analysis
// =============================================================================

/**
 * Constraint types found in expressions.
 */
interface ExpectedConstraint {
	type: 'sqrt' | 'ln' | 'division' | 'arcsin' | 'arccos' | 'tan' | 'power' | 'even_root';
	argument: MathNode;
	zeros?: number[];
}

/**
 * Analyze an expression to find expected constraints.
 */
function analyzeExpressionConstraints(node: MathNode, variable: string): ExpectedConstraint[] {
	const constraints: ExpectedConstraint[] = [];

	function traverse(n: MathNode): void {
		switch (n.type) {
			case 'function':
				switch (n.name) {
					case 'sqrt':
						constraints.push({ type: 'sqrt', argument: n.args[0] });
						break;
					case 'ln':
					case 'log':
					case 'log10':
					case 'log2':
						constraints.push({ type: 'ln', argument: n.args[0] });
						break;
					case 'asin':
					case 'arcsin':
						constraints.push({ type: 'arcsin', argument: n.args[0] });
						break;
					case 'acos':
					case 'arccos':
						constraints.push({ type: 'arccos', argument: n.args[0] });
						break;
					case 'tan':
						constraints.push({ type: 'tan', argument: n.args[0] });
						break;
				}
				for (const arg of n.args) {
					traverse(arg);
				}
				break;

			case 'division': {
				const zeros = findZeros(n.denominator, variable);
				constraints.push({
					type: 'division',
					argument: n.denominator,
					zeros
				});
				traverse(n.numerator);
				traverse(n.denominator);
				break;
			}

			case 'superscript': {
				const expValue = tryGetNumericValue(n.superscript);
				if (expValue !== null && expValue < 0) {
					const zeros = findZeros(n.base, variable);
					constraints.push({
						type: 'power',
						argument: n.base,
						zeros
					});
				}
				if (n.superscript.type === 'division') {
					const den = tryGetNumericValue(n.superscript.denominator);
					if (den !== null && den > 0 && Math.round(den) % 2 === 0) {
						constraints.push({ type: 'even_root', argument: n.base });
					}
				}
				traverse(n.base);
				traverse(n.superscript);
				break;
			}

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

// =============================================================================
// Forgot Constraint Detection
// =============================================================================

/**
 * Detect "forgot constraint" mistakes.
 */
function detectForgotConstraintMistakes(
	studentDomain: Domain,
	correctDomain: Domain,
	_expression: MathNode,
	constraints: ExpectedConstraint[],
	variable: string
): DomainMistake[] {
	const mistakes: DomainMistake[] = [];

	for (const constraint of constraints) {
		switch (constraint.type) {
			case 'sqrt':
			case 'even_root': {
				// Check if student's domain contains values where argument < 0
				// This is a simplified check - full check would require more analysis
				const argStr = toCustom(constraint.argument);
				if (mightContainNegativeValues(studentDomain, correctDomain)) {
					mistakes.push(
						createMistake('forgot_sqrt_constraint', {
							relatedExpression: `√(${argStr})`,
							correctionValues: { expr: argStr }
						})
					);
				}
				break;
			}

			case 'ln': {
				const argStr = toCustom(constraint.argument);
				if (mightContainNonPositiveValues(studentDomain, correctDomain)) {
					mistakes.push(
						createMistake('forgot_ln_constraint', {
							relatedExpression: `ln(${argStr})`,
							correctionValues: { expr: argStr }
						})
					);
				}
				break;
			}

			case 'division': {
				const denStr = toCustom(constraint.argument);
				const zeros = constraint.zeros ?? [];

				for (const zero of zeros) {
					// Check if student's domain contains this zero (which it shouldn't)
					const studentContains = containsValueInDomain(studentDomain, zero);
					const correctContains = containsValueInDomain(correctDomain, zero);

					// If student includes the zero but correct doesn't, they forgot to exclude it
					if (studentContains && !correctContains) {
						mistakes.push(
							createMistake('forgot_denominator', {
								relatedExpression: denStr,
								correctionValues: {
									expr: denStr,
									values: zeros.map((z) => `${variable} = ${z}`).join(', ')
								}
							})
						);
						break; // Only report once per division
					}
				}
				break;
			}

			case 'power': {
				const baseStr = toCustom(constraint.argument);
				const zeros = constraint.zeros ?? [];

				for (const zero of zeros) {
					const studentContains = containsValueInDomain(studentDomain, zero);
					const correctContains = containsValueInDomain(correctDomain, zero);

					if (studentContains && !correctContains) {
						mistakes.push(
							createMistake('forgot_power_constraint', {
								relatedExpression: `(${baseStr})⁻ⁿ`,
								correctionValues: { expr: baseStr }
							})
						);
						break;
					}
				}
				break;
			}

			case 'arcsin':
			case 'arccos': {
				// Check if student includes values outside [-1, 1]
				const argStr = toCustom(constraint.argument);
				const funcName = constraint.type === 'arcsin' ? 'arcsin' : 'arccos';
				// Simplified check
				if (
					studentDomainIsUnrestricted(studentDomain) &&
					!correctDomainIsUnrestricted(correctDomain)
				) {
					mistakes.push(
						createMistake('forgot_arcsin_constraint', {
							relatedExpression: `${funcName}(${argStr})`,
							correctionValues: { func: funcName, expr: argStr }
						})
					);
				}
				break;
			}

			case 'tan': {
				const argStr = toCustom(constraint.argument);
				// Check for periodic exclusion handling
				if (
					correctDomain.kind === 'periodic_exclusion' &&
					studentDomain.kind !== 'periodic_exclusion'
				) {
					mistakes.push(
						createMistake('forgot_tan_constraint', {
							relatedExpression: `tan(${argStr})`,
							correctionValues: { expr: argStr }
						})
					);
				}
				break;
			}
		}
	}

	return mistakes;
}

// =============================================================================
// Boundary Mistake Detection
// =============================================================================

/**
 * Detect boundary mistakes (wrong direction, wrong value, inclusive vs exclusive).
 */
function detectBoundaryMistakes(
	studentDomain: Domain,
	correctDomain: Domain,
	_variable: string
): DomainMistake[] {
	const mistakes: DomainMistake[] = [];

	// Only works for interval_set domains
	if (studentDomain.kind !== 'interval_set' || correctDomain.kind !== 'interval_set') {
		return mistakes;
	}

	const studentIntervals = studentDomain.intervals;
	const correctIntervals = correctDomain.intervals;

	// Simple case: single interval in each
	if (studentIntervals.length === 1 && correctIntervals.length === 1) {
		const s = studentIntervals[0];
		const c = correctIntervals[0];

		// Check lower bound
		const sLower = tryGetEndpointNumber(s.lower.value);
		const cLower = tryGetEndpointNumber(c.lower.value);

		if (sLower !== null && cLower !== null) {
			if (Math.abs(sLower - cLower) < 0.001) {
				// Same value, check inclusive vs exclusive
				if (s.lower.type !== c.lower.type) {
					if (c.lower.type === 'open' && s.lower.type === 'closed') {
						mistakes.push(
							createMistake('included_instead_excluded', {
								correctionValues: {
									value: String(sLower),
									open: `]${sLower}`,
									closed: `[${sLower}`
								}
							})
						);
					} else if (c.lower.type === 'closed' && s.lower.type === 'open') {
						mistakes.push(
							createMistake('excluded_instead_included', {
								correctionValues: {
									value: String(sLower),
									closed: `[${sLower}`,
									open: `]${sLower}`
								}
							})
						);
					}
				}
			} else if (sLower !== cLower) {
				// Different bound value
				mistakes.push(
					createMistake('wrong_bound_value', {
						incorrectValue: String(sLower),
						correctValue: String(cLower),
						correctionValues: {
							incorrect: String(sLower),
							correct: String(cLower)
						}
					})
				);
			}
		}

		// Check upper bound similarly
		const sUpper = tryGetEndpointNumber(s.upper.value);
		const cUpper = tryGetEndpointNumber(c.upper.value);

		if (sUpper !== null && cUpper !== null) {
			if (Math.abs(sUpper - cUpper) < 0.001) {
				if (s.upper.type !== c.upper.type) {
					if (c.upper.type === 'open' && s.upper.type === 'closed') {
						mistakes.push(
							createMistake('included_instead_excluded', {
								correctionValues: {
									value: String(sUpper),
									open: `${sUpper}[`,
									closed: `${sUpper}]`
								}
							})
						);
					} else if (c.upper.type === 'closed' && s.upper.type === 'open') {
						mistakes.push(
							createMistake('excluded_instead_included', {
								correctionValues: {
									value: String(sUpper),
									closed: `${sUpper}]`,
									open: `${sUpper}[`
								}
							})
						);
					}
				}
			} else if (sUpper !== cUpper) {
				mistakes.push(
					createMistake('wrong_bound_value', {
						incorrectValue: String(sUpper),
						correctValue: String(cUpper),
						correctionValues: {
							incorrect: String(sUpper),
							correct: String(cUpper)
						}
					})
				);
			}
		}
	}

	return mistakes;
}

// =============================================================================
// Excluded Point Mistake Detection
// =============================================================================

/**
 * Detect mistakes with excluded points.
 */
function detectExcludedPointMistakes(
	studentDomain: Domain,
	correctDomain: Domain,
	expression: MathNode,
	variable: string
): DomainMistake[] {
	const mistakes: DomainMistake[] = [];

	// Get excluded points from both domains
	const studentExcluded = getExcludedPoints(studentDomain);
	const correctExcluded = getExcludedPoints(correctDomain);

	// Find points student excluded but shouldn't have
	for (const point of studentExcluded) {
		if (!correctExcluded.some((p) => Math.abs(p - point) < 0.001)) {
			mistakes.push(
				createMistake('wrong_excluded_point', {
					correctionValues: {
						point: `${variable} = ${point}`
					}
				})
			);
		}
	}

	// Find points student should have excluded but didn't
	for (const point of correctExcluded) {
		if (!studentExcluded.some((p) => Math.abs(p - point) < 0.001)) {
			// Determine reason based on expression analysis
			const reason = determineExclusionReason(expression, point, variable);
			mistakes.push(
				createMistake('missed_excluded_point', {
					correctionValues: {
						point: `${variable} = ${point}`,
						reason
					}
				})
			);
		}
	}

	return mistakes;
}

// =============================================================================
// Extra Restriction Detection
// =============================================================================

/**
 * Detect extra restrictions in student's answer.
 */
function detectExtraRestrictionMistakes(
	_studentDomain: Domain,
	_correctDomain: Domain,
	studentExtra: Domain,
	_variable: string
): DomainMistake[] {
	const mistakes: DomainMistake[] = [];

	const extraStr = formatInterval(studentExtra);
	mistakes.push(
		createMistake('extra_restriction', {
			correctionValues: { extra: extraStr }
		})
	);

	return mistakes;
}

// =============================================================================
// Helper Functions
// =============================================================================

interface MistakeOptions {
	relatedExpression?: string;
	incorrectValue?: string;
	correctValue?: string;
	correctionValues?: Record<string, string>;
}

/**
 * Create a DomainMistake object.
 */
function createMistake(type: DomainMistakeType, options: MistakeOptions = {}): DomainMistake {
	const description = getMistakeDescription(type);
	const correction = options.correctionValues
		? applyMistakeCorrectionTemplate(type, options.correctionValues)
		: getMistakeDescription(type);

	return {
		type,
		description,
		correction,
		severity: getMistakeSeverity(type),
		relatedExpression: options.relatedExpression,
		incorrectValue: options.incorrectValue,
		correctValue: options.correctValue
	};
}

/**
 * Try to get a numeric value from a MathNode.
 */
function tryGetNumericValue(node: MathNode): number | null {
	if (node.type === 'number') {
		return parseFloat(node.value);
	}
	if (node.type === 'opposite' && node.operand.type === 'number') {
		return -parseFloat(node.operand.value);
	}
	return null;
}

/**
 * Try to get a numeric value from an EndpointValue.
 * Handles both interval EndpointValue format (kind: 'number') and
 * MathNode format (type: 'number') used in excluded points.
 */
function tryGetEndpointNumber(value: unknown): number | null {
	if (typeof value === 'object' && value !== null) {
		const v = value as {
			kind?: string;
			type?: string;
			value?: number | string;
			sign?: string;
		};

		// Handle EndpointValue format: { kind: 'number', value: 0 }
		if (v.kind === 'number') {
			if (typeof v.value === 'number') {
				return v.value;
			}
			if (typeof v.value === 'string') {
				const num = parseFloat(v.value);
				return isNaN(num) ? null : num;
			}
		}

		// Handle MathNode format: { type: 'number', value: '0' }
		if (v.type === 'number' && typeof v.value === 'string') {
			const num = parseFloat(v.value);
			return isNaN(num) ? null : num;
		}

		// Handle infinity
		if (v.kind === 'positive_infinity' || v.kind === 'negative_infinity') {
			return null; // Don't compare infinities
		}
		if (v.type === 'infinity') {
			return null;
		}
	}
	return null;
}

/**
 * Check if a domain contains a specific value.
 */
function containsValueInDomain(domain: Domain, value: number): boolean {
	return containsValue(domain, value);
}

/**
 * Check if student domain might contain negative values where correct doesn't.
 */
function mightContainNegativeValues(student: Domain, correct: Domain): boolean {
	// Simplified: check if student is universal but correct isn't
	return student.kind === 'universal' && correct.kind !== 'universal';
}

/**
 * Check if student domain might contain non-positive values where correct doesn't.
 */
function mightContainNonPositiveValues(student: Domain, correct: Domain): boolean {
	return (
		mightContainNegativeValues(student, correct) ||
		(containsValue(student, 0) && !containsValue(correct, 0))
	);
}

/**
 * Check if student domain is unrestricted.
 */
function studentDomainIsUnrestricted(domain: Domain): boolean {
	return domain.kind === 'universal';
}

/**
 * Check if correct domain is unrestricted.
 */
function correctDomainIsUnrestricted(domain: Domain): boolean {
	return domain.kind === 'universal';
}

/**
 * Get numeric excluded points from a domain.
 */
function getExcludedPoints(domain: Domain): number[] {
	// Universal and empty domains have no excluded points in structure
	if (domain.kind === 'universal' || domain.kind === 'empty') {
		return [];
	}

	if (domain.kind !== 'interval_set') {
		return [];
	}

	const intervalSet = domain as IntervalSet;
	const points: number[] = [];

	for (const ep of intervalSet.excludedPoints) {
		const val = tryGetEndpointNumber(ep.value);
		if (val !== null) {
			points.push(val);
		}
	}

	return points;
}

/**
 * Determine why a point should be excluded based on expression structure.
 */
function determineExclusionReason(expression: MathNode, point: number, variable: string): string {
	// Walk the expression to find what caused this exclusion
	function findReason(node: MathNode): string | null {
		switch (node.type) {
			case 'division': {
				const zeros = findZeros(node.denominator, variable);
				if (zeros.some((z) => Math.abs(z - point) < 0.001)) {
					return `le dénominateur s'annule pour ${variable} = ${point}`;
				}
				const numReason = findReason(node.numerator);
				if (numReason) return numReason;
				return findReason(node.denominator);
			}

			case 'superscript': {
				const expValue = tryGetNumericValue(node.superscript);
				if (expValue !== null && expValue < 0) {
					const zeros = findZeros(node.base, variable);
					if (zeros.some((z) => Math.abs(z - point) < 0.001)) {
						return `la base de la puissance négative s'annule pour ${variable} = ${point}`;
					}
				}
				const baseReason = findReason(node.base);
				if (baseReason) return baseReason;
				return findReason(node.superscript);
			}

			case 'function':
				for (const arg of node.args) {
					const reason = findReason(arg);
					if (reason) return reason;
				}
				return null;

			case 'addition':
			case 'subtraction':
				return findReason(node.left) ?? findReason(node.right);

			case 'multiplication':
				return findReason(node.left) ?? findReason(node.right);

			case 'opposite':
			case 'positive':
				return findReason(node.operand);

			case 'delimiter':
				return findReason(node.content);

			default:
				return null;
		}
	}

	return findReason(expression) ?? `cette valeur doit être exclue`;
}
