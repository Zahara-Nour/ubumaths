/**
 * Validation Types
 *
 * Types for validating student answers about mathematical domains.
 *
 * @module mathAST/domain/validation/types
 */

import type { Domain, Interval } from '../types';

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Result of validating a student's domain answer.
 *
 * @example
 * ```typescript
 * const result: DomainValidationResult = {
 *   isCorrect: false,
 *   score: 75,
 *   feedback: [
 *     "Tu as oublié d'exclure x = 0",
 *     "Le reste de ta réponse est correct"
 *   ],
 *   missingParts: { kind: 'interval_set', intervals: [], excludedPoints: [{ value: { kind: 'number', value: 0 } }] }
 * };
 * ```
 */
export interface DomainValidationResult {
	/** Whether the answer is completely correct */
	readonly isCorrect: boolean;

	/** Score from 0 to 100 (for partial credit) */
	readonly score: number;

	/** Pedagogical feedback messages in French */
	readonly feedback: readonly string[];

	/** Parts of the correct domain missing from student's answer */
	readonly missingParts?: Domain;

	/** Parts in student's answer that shouldn't be there */
	readonly extraParts?: Domain;

	/** Parse error if the student's input couldn't be parsed */
	readonly parseError?: string;
}

/**
 * Options for domain validation.
 */
export interface DomainValidationOptions {
	/**
	 * Require strict notation (e.g., ]0 ; +∞[ vs (0, +∞))
	 * @default false
	 */
	readonly strictNotation?: boolean;

	/**
	 * Accept mathematically equivalent forms
	 * (e.g., x > 0 vs ]0 ; +∞[ vs ℝ*₊)
	 * @default true
	 */
	readonly allowEquivalent?: boolean;

	/**
	 * Give partial credit for partially correct answers
	 * @default true
	 */
	readonly partialCredit?: boolean;

	/**
	 * Variable name expected in the domain (for condition format)
	 * @default 'x'
	 */
	readonly variable?: string;

	/**
	 * Tolerance for numeric comparisons (for endpoint values)
	 * @default 1e-10
	 */
	readonly tolerance?: number;
}

// =============================================================================
// Domain Comparison Types
// =============================================================================

/**
 * Result of comparing two domains.
 *
 * Used to determine the relationship between a student's answer
 * and the correct domain.
 */
export interface DomainComparison {
	/** Whether the domains are mathematically equal */
	readonly areEqual: boolean;

	/** Student's domain is a proper subset of correct (too restrictive) */
	readonly studentIsSubset: boolean;

	/** Student's domain is a proper superset of correct (too permissive) */
	readonly studentIsSuperset: boolean;

	/** Intersection of the two domains */
	readonly intersection: Domain;

	/** Parts in correct domain missing from student's answer */
	readonly studentMissing: Domain;

	/** Parts in student's answer not in correct domain */
	readonly studentExtra: Domain;
}

// =============================================================================
// Student Input Types
// =============================================================================

/**
 * Format of student input for domain answers.
 */
export type StudentInputFormat =
	| 'interval' // ]0, +∞[, [0, 1], etc.
	| 'condition' // x > 0, x >= 0 et x != 1, etc.
	| 'set_notation' // ℝ \ {0}, ℝ*, ℝ₊, etc.
	| 'mixed' // Combination of above
	| 'unknown'; // Could not determine format

/**
 * Result of parsing a student's domain input.
 */
export type ParseStudentDomainResult =
	| { success: true; domain: Domain; format: StudentInputFormat }
	| { success: false; error: string; position?: number };

/**
 * Un morceau de la réponse, tel qu'écrit : un intervalle d'une réunion, un
 * intervalle privé de points, un ensemble (`{3}`, `ℝ`, `∅`), une condition.
 */
export interface StudentDomainPiece {
	/** Le morceau (normalisé) */
	readonly source: string;
	/** L'ensemble qu'il désigne */
	readonly domain: Domain;
	/** Intervalle tel qu'écrit (bornes NON réordonnées), pour un intervalle seul */
	readonly interval?: Interval;
	/** Bornes telles qu'écrites, pour un intervalle seul */
	readonly bounds?: readonly [string, string];
}

/** `ParseStudentDomainResult` avec les morceaux tels qu'écrits */
export type ParseStudentDomainPiecesResult =
	| {
			success: true;
			domain: Domain;
			format: StudentInputFormat;
			pieces: readonly StudentDomainPiece[];
	  }
	| { success: false; error: string; position?: number };

// =============================================================================
// Hint Types
// =============================================================================

/**
 * Level of hint to provide.
 *
 * - Level 1: Very vague hint (e.g., "Check your constraints")
 * - Level 2: More specific (e.g., "Did you consider division by zero?")
 * - Level 3: Very specific (e.g., "x = 0 makes the denominator zero")
 */
export type HintLevel = 1 | 2 | 3;

/**
 * Options for generating hints.
 */
export interface HintOptions {
	/** Level of specificity (1 = vague, 3 = specific) */
	readonly level: HintLevel;

	/** Maximum number of hints to return */
	readonly maxHints?: number;

	/** Include hints about the expression structure */
	readonly includeStructureHints?: boolean;
}
