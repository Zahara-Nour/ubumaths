/**
 * Domain Mistake Types
 *
 * Types for representing common mistakes students make when
 * determining mathematical domains.
 *
 * @module mathAST/domain/validation/mistake-types
 */

// =============================================================================
// Mistake Type Enumeration
// =============================================================================

/**
 * Types of mistakes students commonly make with domain problems.
 */
export type DomainMistakeType =
	// Forgetting constraints
	| 'forgot_denominator' // Forgot to exclude zeros of denominator
	| 'forgot_sqrt_constraint' // Forgot √u requires u ≥ 0
	| 'forgot_ln_constraint' // Forgot ln(u) requires u > 0
	| 'forgot_arcsin_constraint' // Forgot arcsin(u) requires -1 ≤ u ≤ 1
	| 'forgot_tan_constraint' // Forgot tan(x) ≠ π/2 + kπ
	| 'forgot_power_constraint' // Forgot x^(-n) requires x ≠ 0
	// Boundary errors
	| 'wrong_inequality_direction' // Got < when should be > (or vice versa)
	| 'wrong_bound_value' // Got the boundary value wrong (e.g., x ≥ 3 instead of x ≥ 2)
	| 'included_instead_excluded' // Used ≥ when should be > (or [ instead of ])
	| 'excluded_instead_included' // Used > when should be ≥ (or ] instead of [)
	// Set operation errors
	| 'missing_union_part' // Missing part of a union (e.g., only wrote ]0, +∞[ for ℝ*)
	| 'extra_restriction' // Added unnecessary restriction
	| 'wrong_excluded_point' // Excluded wrong point(s)
	| 'missed_excluded_point' // Failed to exclude required point(s)
	// Complex expression errors
	| 'periodic_not_recognized' // Didn't handle periodic exclusions (tan, cot, etc.)
	| 'composition_error' // Error in composed function domain
	| 'nested_constraint_error' // Error with nested constraints (e.g., ln(sqrt(x)))
	// Algebraic errors
	| 'algebraic_error' // Made an algebraic mistake solving constraint
	| 'sign_error' // Sign error in solving inequality
	// Format/notation errors
	| 'notation_error'; // Notation issue (not a mathematical error)

// =============================================================================
// Mistake Interface
// =============================================================================

/**
 * Represents a detected mistake in a student's domain answer.
 */
export interface DomainMistake {
	/** The type of mistake */
	readonly type: DomainMistakeType;

	/** French description of the mistake */
	readonly description: string;

	/** French suggestion for how to correct the mistake */
	readonly correction: string;

	/** Severity of the mistake */
	readonly severity: 'error' | 'warning';

	/** The part of the expression related to this mistake (LaTeX) */
	readonly relatedExpression?: string;

	/** The incorrect value (for boundary errors) */
	readonly incorrectValue?: string;

	/** The correct value (for boundary errors) */
	readonly correctValue?: string;
}

// =============================================================================
// Mistake Severity Classification
// =============================================================================

/**
 * Get the default severity for a mistake type.
 *
 * - 'error': Mathematical error that affects correctness
 * - 'warning': Minor issue (notation, style) that doesn't affect correctness
 */
export function getMistakeSeverity(type: DomainMistakeType): 'error' | 'warning' {
	// Notation issues are warnings, everything else is an error
	if (type === 'notation_error') {
		return 'warning';
	}
	return 'error';
}

/**
 * Check if a mistake type is a "forgot constraint" type.
 */
export function isForgotConstraintMistake(type: DomainMistakeType): boolean {
	const forgotTypes: DomainMistakeType[] = [
		'forgot_denominator',
		'forgot_sqrt_constraint',
		'forgot_ln_constraint',
		'forgot_arcsin_constraint',
		'forgot_tan_constraint',
		'forgot_power_constraint'
	];
	return forgotTypes.includes(type);
}

/**
 * Check if a mistake type is a boundary error.
 */
export function isBoundaryMistake(type: DomainMistakeType): boolean {
	const boundaryTypes: DomainMistakeType[] = [
		'wrong_inequality_direction',
		'wrong_bound_value',
		'included_instead_excluded',
		'excluded_instead_included'
	];
	return boundaryTypes.includes(type);
}

/**
 * Check if a mistake type is a set operation error.
 */
export function isSetOperationMistake(type: DomainMistakeType): boolean {
	const setTypes: DomainMistakeType[] = [
		'missing_union_part',
		'extra_restriction',
		'wrong_excluded_point',
		'missed_excluded_point'
	];
	return setTypes.includes(type);
}
