/**
 * Old TinyMath Question Types
 * ============================
 *
 * Type definitions for the legacy TinyMath question system.
 * These types represent the exact structure of questions stored
 * in the old system, used for migration to UbuMaths v2.
 *
 * @module migration/old-question-types
 */

// ============================================================================
// GRADE DEFINITIONS
// ============================================================================

export type OldGrade =
	| 'CP'
	| 'CE1'
	| 'CE2'
	| 'CM1'
	| 'CM2' // École primaire
	| '6'
	| '5'
	| '4'
	| '3' // Collège (using string numbers)
	| '2' // Seconde
	| 'SPE_1'
	| 'SPE_T' // Première/Terminale spécialité
	| 'T_EXP'
	| 'T_COMP' // Terminale expert/complémentaire
	| 'STMG'; // Terminale STMG

// ============================================================================
// VALIDATION OPTIONS
// ============================================================================

export type OldOption =
	// Spacing options
	| 'enounce-no-spaces'
	| 'exp-no-spaces'
	| 'require-correct-spaces'
	| 'no-penalty-for-incorrect-spaces'
	// Product notation
	| 'require-implicit-products'
	| 'no-penalty-for-explicit-products'
	// Brackets
	| 'require-no-extraneaous-brackets'
	| 'no-penalty-for-extraneous-brackets'
	| 'no-penalty-for-extraneous-brackets-in-first-negative-term'
	// Unnecessary zeros
	| 'exp-allow-unecessary-zeros'
	| 'require-no-extraneaous-zeros'
	| 'no-penalty-for-extraneous-zeros'
	// Unnecessary signs
	| 'require-no-extraneaous-signs'
	| 'no-penalty-for-extraneous-signs'
	// Factor handling
	| 'require-no-factor-one'
	| 'no-penalty-for-factor-one'
	| 'require-no-factor-zero'
	| 'no-penalty-for-factor-zero'
	// Null terms
	| 'require-no-null-terms'
	| 'no-penalty-for-null-terms'
	// Fractions
	| 'require-reduced-fractions'
	| 'no-penalty-for-non-reduced-fractions'
	// Units
	| 'require-specific-unit'
	| 'no-penalty-for-not-respected-unit'
	// Permutation options
	| 'disallow-terms-permutation'
	| 'disallow-factors-permutation'
	| 'disallow-terms-and-factors-permutation'
	| 'penalty-for-terms-and-factors-permutation'
	| 'penalty-for-terms-permutation'
	| 'penalty-for-factors-permutation'
	// Expression modifications
	| 'shuffle-terms'
	| 'shuffle-factors'
	| 'shuffle-terms-and-factors'
	| 'shallow-shuffle-terms'
	| 'shallow-shuffle-factors'
	| 'exp-remove-unecessary-brackets'
	// Choice shuffling
	| 'no-shuffle-choices'
	// Question uniqueness
	| 'allow-same-expression'
	| 'allow-same-enounce'
	// Other options
	| 'remove-null-terms'
	| 'exhaust'
	| 'solutions-order-not-important'
	| 'multiples'
	| 'one-single-form-solution';

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Variable name format in old system: &1, &2, etc.
 */
export type VariableName = `&${number}`;

/**
 * Variable definitions for a question variant
 */
export type Variables = Record<VariableName, string>;

/**
 * Choice definition for multiple choice questions
 */
export interface Choice {
	text?: string;
	image?: string;
	imageBase64?: string;
}

/**
 * Correction detail for explaining solutions
 */
export interface CorrectionDetail {
	text: string;
	type?: string;
	base64?: string;
}

/**
 * Correction format for different answer types
 */
export interface CorrectionFormat {
	correct: string[];
	uncorrect?: string[];
	answer?: string;
}

/**
 * Letter definitions (used in some algebraic questions)
 */
export type Letters = Record<string, string>;

/**
 * Main question base type from the old system
 *
 * This represents the exact structure stored in the old database
 * and used by the TinyMath system.
 */
export interface QuestionBase {
	// Result type hint
	'result-type'?: 'decimal';

	// Answer field formatting
	answerFields?: string[];
	answerFormats?: string[];

	// Multiple choice options (array of arrays for variations)
	choicess?: Choice[][];

	// Conditional content
	conditions?: string[];

	// Correction/solution details
	correctionDetailss?: CorrectionDetail[][];
	correctionFormats?: CorrectionFormat[];

	// Time limits
	defaultDelay: number;

	// Metadata
	description: string;
	subdescription?: string;

	// Question content (arrays for variations)
	enounces: string[];
	enounces2?: string[];
	expressions?: string[];
	expressions2?: string[];

	// Formatting hints
	formats?: string[];

	// Educational level
	grade: OldGrade;

	// Help text
	help?: string;

	// Images (paths in Supabase bucket)
	images?: string[];
	imagesCorrection?: string[];

	// Letter variable definitions
	letterss?: Letters[];

	// Generation limits
	limits?: {
		limits: { count?: number; limit?: number }[];
		nbuniques?: number;
		nbrandoms?: number;
		nbmax?: number;
		reached?: number;
	};

	// Question number (for ordering)
	num?: number;

	// Validation options
	options?: OldOption[];

	// Element ordering
	order_elements?: string[];

	// Solutions (array of arrays for variations)
	// For choices: contains indices (numbers)
	// For other types: contains answer strings
	solutionss?: (string | number)[][];

	// Prefilled values for answer fields
	prefilleds?: string[][];

	// Test answers for custom validation
	testAnswerss?: string[][];

	// Units for answers
	units?: string[];

	// Variable definitions (array for variations)
	variabless?: Variables[];

	// Multiple answers allowed for QCM
	multipleAnswers?: boolean;

	// Flash card mode
	flash?: boolean;
}

/**
 * Question with ID (as stored in database)
 */
export interface QuestionWithID extends QuestionBase {
	id: string;
}

// ============================================================================
// QUESTION ORGANIZATION
// ============================================================================

/**
 * Questions are organized in a nested structure:
 * Theme > Domain > Subdomain > Questions
 */
export type Subdomain = QuestionBase[];
export type Domain = Record<string, Subdomain>;
export type Theme = Record<string, Domain>;
export type Questions = Record<string, Theme>;

/**
 * Available levels tracking
 */
export type AvailableLevels = Record<string, Record<string, Record<string, number[]>>>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a string is a valid variable name
 */
export function isVariableName(e: string): e is VariableName {
	return !!e && e.startsWith('&') && /^&\d+$/.test(e);
}

/**
 * Extract variable number from variable name
 */
export function getVariableNumber(varName: VariableName): number {
	return parseInt(varName.substring(1), 10);
}

/**
 * Create variable name from number
 */
export function createVariableName(num: number): VariableName {
	return `&${num}` as VariableName;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if question has multiple choice
 */
export function hasChoices(q: QuestionBase): boolean {
	return !!(q.choicess && q.choicess.length > 0);
}

/**
 * Check if question has multiple answers
 */
export function hasMultipleAnswers(q: QuestionBase): boolean {
	return !!(q.choicess && q.multipleAnswers);
}

/**
 * Check if question has fill-in-blanks
 */
export function hasFillInBlanks(q: QuestionBase): boolean {
	return !!q.expressions?.some((expr) => expr.includes('?'));
}

/**
 * Check if question has custom answer fields
 */
export function hasAnswerFields(q: QuestionBase): boolean {
	return !!(q.answerFields && q.answerFields.length > 0);
}

/**
 * Check if question has images
 */
export function hasImages(q: QuestionBase): boolean {
	return (
		!!(q.images && q.images.length > 0) || !!(q.imagesCorrection && q.imagesCorrection.length > 0)
	);
}

/**
 * Check if question has variables
 */
export function hasVariables(q: QuestionBase): boolean {
	return !!(q.variabless && q.variabless.length > 0);
}

/**
 * Check if question has custom test answers (needs special validation)
 */
export function hasTestAnswers(q: QuestionBase): boolean {
	return !!(q.testAnswerss && q.testAnswerss.length > 0);
}

/**
 * Get number of variations in a question
 */
export function getVariationCount(q: QuestionBase): number {
	// Check various arrays that indicate variations
	const counts = [
		q.enounces?.length || 0,
		q.expressions?.length || 0,
		q.solutionss?.length || 0,
		q.variabless?.length || 0,
		q.choicess?.length || 0
	];

	// Return the maximum count (they should all be the same)
	return Math.max(...counts, 1);
}

/**
 * Detect question type based on structure
 */
export function detectQuestionType(q: QuestionBase): string {
	if (hasMultipleAnswers(q)) {
		return 'multiple_choice_multiple';
	}
	if (hasChoices(q)) {
		return 'multiple_choice_single';
	}
	if (hasFillInBlanks(q)) {
		return 'fill_in_blanks';
	}
	if (hasAnswerFields(q)) {
		return 'answer_field';
	}
	if (q['result-type'] === 'decimal') {
		return 'numerical_decimal';
	}
	if (q.expressions && q.expressions.length > 0) {
		return 'expression';
	}
	return 'numerical_exact';
}

// ============================================================================
// MIGRATION METADATA
// ============================================================================

/**
 * Migration metadata added during extraction
 * Preserves the question's position in the nested hierarchy
 */
export interface MigrationMetadata {
	/** Theme name (e.g., "Entiers", "Décimaux") */
	theme: string;
	/** Domain within the theme (e.g., "Apprivoiser", "Calculs") */
	domain: string;
	/** Subdomain within the domain (e.g., "Ecriture", "Addition") */
	subdomain: string;
	/** Level/position within the subdomain array (0-indexed) */
	level: number;
	/** Global sequential index across all questions (0-632) */
	globalIndex: number;
}

/**
 * Question with migration metadata (post-extraction)
 * Used after running migrate-questions-loader.ts
 */
export interface QuestionWithMigration extends QuestionBase {
	_migration: MigrationMetadata;
}
