/**
 * Question Bank System - Type Definitions
 * ========================================
 *
 * This file defines the complete type system for the mathematical question bank,
 * including templates, instances, random number generation, and validation.
 *
 * Key Features:
 * - Support for variables in random expressions: {#:{@:min}-{@:max}}
 * - Multiple question types (numerical, algebraic, QCM, fill-in-blanks)
 * - Complex exclusion patterns (values, ranges, variables)
 * - Precision types for numerical answers
 *
 * @module questions/types
 */

// ============================================================================
// GRADE LEVELS
// ============================================================================

/**
 * French educational grade levels
 */
export type GradeLevel =
  | 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2'  // École primaire
  | '6' | '5' | '4' | '3'                  // Collège
  | '2'                                    // Seconde
  | 'SPE_1' | 'SPE_T'                      // Première/Terminale spécialité
  | 'T_EXP' | 'T_COMP'                     // Terminale expert/complémentaire
  | 'STMG';                                // Terminale STMG

// ============================================================================
// QUESTION TYPES
// ============================================================================

/**
 * Available question types
 */
export type QuestionType =
  | 'numerical_exact'      // Exact numerical value required
  | 'numerical_decimal'    // Decimal approximation
  | 'numerical_rounded'    // Rounded value
  | 'algebraic_transform'  // Factor, expand, simplify expressions
  | 'fill_in_blanks'       // Fill in missing parts
  | 'multiple_choice';     // Multiple choice (one or several answers)

/**
 * Types of algebraic transformations
 */
export type AlgebraicTransformType = 'factor' | 'expand' | 'simplify' | 'solve';

// ============================================================================
// CONTENT FIELDS
// ============================================================================

/**
 * Content field: text with LaTeX or image
 *
 * Text content can contain:
 * - LaTeX expressions: $$expression$$
 * - Variables: {@:varName}
 * - Random numbers: {#:1-10}
 * - Evaluations: {eval:expression}
 */
export type ContentField =
  | {
      type: 'text';
      content: string;  // May contain LaTeX, variables, random, eval
    }
  | {
      type: 'image';
      content: string;  // Image URL (may contain variables like {@:imageId})
      alt?: string;     // Alt text for accessibility
    };

// ============================================================================
// PRECISION TYPES
// ============================================================================

/**
 * Precision configuration for numerical answers
 *
 * @example Exact value
 * { type: 'none' }
 *
 * @example 2 decimal places
 * { type: 'decimal', digits: 2 }
 *
 * @example 3 significant figures
 * { type: 'significant', digits: 3 }
 *
 * @example Absolute tolerance ±0.01
 * { type: 'tolerance', tolerance: 0.01, mode: 'absolute' }
 *
 * @example Relative tolerance ±1%
 * { type: 'tolerance', tolerance: 0.01, mode: 'relative' }
 */
export type PrecisionType =
  | { type: 'none' }  // Exact value required
  | { type: 'decimal'; digits: number }        // Decimal places
  | { type: 'significant'; digits: number }    // Significant figures
  | { type: 'magnitude'; digits: number }      // Order of magnitude (10^digits)
  | {
      type: 'tolerance';
      tolerance: number;                       // Tolerance value
      mode: 'absolute' | 'relative';           // Tolerance mode
    };

// ============================================================================
// VARIABLES
// ============================================================================

/**
 * Variable definition in a question template
 *
 * Variables are resolved in declaration order and can reference
 * previously defined variables.
 *
 * Expression syntax:
 * - {@:otherVar} - Reference to another variable
 * - {#:1-10} - Random integer from 1 to 10
 * - {#:{@:min}-{@:max}} - Random with variable bounds
 * - {#:2.3} - Random decimal (2 digits before, 3 after)
 * - {#:1-10!5,7} - Random excluding 5 and 7
 * - {#:1-100!{@:excluded}} - Random excluding variable value
 * - {eval:expression} - Evaluate mathematical expression
 *
 * @example Simple random
 * { name: 'a', expression: '{#:1-10}' }
 *
 * @example Variable bounds
 * { name: 'max', expression: '20' }
 * { name: 'value', expression: '{#:1-{@:max}}' }
 *
 * @example Exclusion
 * { name: 'a', expression: '{#:1-10}' }
 * { name: 'b', expression: '{#:1-10!{@:a}}' }
 */
export interface QuestionVariable {
  /** Variable name (used in {@:name} references) */
  name: string;

  /**
   * Expression with LaTeX and special syntax
   * Can contain {@:}, {#:}, {eval:} constructs
   */
  expression: string;
}

// ============================================================================
// QUESTION VARIATIONS
// ============================================================================

/**
 * A single variation of a question template
 *
 * Templates can have multiple variations, and one is randomly selected
 * during instance generation. Each variation contains its own statement,
 * variables, answer, and correction.
 *
 * @example Simple numerical question with 2 variations
 * {
 *   variations: [
 *     {
 *       statement: [{ type: 'text', content: 'Calculate $$2 + 3$$' }],
 *       answer: '5'
 *     },
 *     {
 *       statement: [{ type: 'text', content: 'Calculate $$7 - 4$$' }],
 *       answer: '3'
 *     }
 *   ]
 * }
 */
export interface QuestionVariation {
  /** Question statement (can contain text and images) */
  statement: ContentField[];

  /** Variables in declaration order (resolved sequentially) */
  variables?: QuestionVariable[];

  /** Expected answer(s) - can contain {@:var}, {#:...}, {eval:...} */
  answer: string | string[];

  /** Detailed correction/explanation (optional) */
  correction?: ContentField[];

  // ---- Type-specific Fields (per-variation) ----

  /** Blank positions and answers (for fill_in_blanks) */
  blanks?: {
    /** Position in statement */
    position: number;

    /** Expected answer (can contain {@:var}) */
    expectedAnswer: string;
  }[];

  /** Choices for multiple choice */
  choices?: {
    /** Choice content (text or image, can contain {@:var}, {#:...}) */
    content: ContentField;

    /** Whether this choice is correct */
    isCorrect: boolean;
  }[];
}

// ============================================================================
// QUESTION TEMPLATE (stored in database)
// ============================================================================

/**
 * Question template stored in database
 *
 * Templates are parsed to generate question instances with
 * randomized values and resolved variables.
 *
 * Templates support multiple variations - one is randomly selected
 * during instance generation.
 */
export interface QuestionTemplate {
  /** Unique identifier (UUID) */
  id: string;

  /** Type of question */
  type: QuestionType;

  // ---- Variations ----

  /**
   * Array of question variations (minimum 1 required)
   *
   * During instance generation, one variation is randomly selected.
   * Each variation has its own statement, variables, answer, and correction.
   */
  variations: QuestionVariation[];

  // ---- Validation Options (shared across all variations) ----

  /** Validation options for multiple acceptable answers */
  options?: {
    /** Accept equivalent forms (e.g., 1/2 = 0.5) */
    allowEquivalent?: boolean;

    /** Accept different algebraic forms (e.g., 1/2 = 2/4) */
    allowDifferentForms?: boolean;

    /** Preferred canonical form */
    canonicalForm?: 'fraction' | 'decimal' | 'scientific';

    /** Custom validator function name */
    validator?: 'checkEquivalence' | 'checkAlgebraic' | 'checkNumeric';

    /** Parameters for custom validator */
    validatorParams?: Record<string, unknown>;
  };

  /** Precision for numerical answers (shared across all variations) */
  precision?: PrecisionType;

  // ---- Metadata (shared across all variations) ----

  /** Applicable grade levels */
  grades: GradeLevel[];

  // ---- Categorization ----

  /** Question theme (e.g., Algèbre, Géométrie) - independent from grades */
  theme: string;

  /** Question domain within theme (e.g., Équations, Polynômes) */
  domain: string;

  /** Optional subdomain for finer categorization (e.g., Linéaires, Quadratiques) */
  subdomain?: string;

  /** Difficulty level as positive integer (no max) - independent from grades */
  level: number;

  /** Time limit in seconds (optional) */
  delay?: number;

  // ---- Type-specific Configuration (shared across all variations) ----

  /** Type of algebraic transformation (for algebraic_transform) */
  transformType?: AlgebraicTransformType;

  /** Whether multiple answers are allowed (for multiple_choice) */
  multipleAnswers?: boolean;

  // ---- Audit Fields ----

  created_at?: string;
  updated_at?: string;
  created_by?: string;  // UUID of creator
}

// ============================================================================
// QUESTION INSTANCE (generated from template)
// ============================================================================

/**
 * Resolved variable with final value
 */
export interface ResolvedVariable {
  /** Variable name */
  name: string;

  /** Final LaTeX value with substitutions (e.g., "3^2 + 7") */
  value: string;
}

/**
 * Generated question instance
 *
 * Created from a template with all variables resolved,
 * random values generated, and expressions evaluated.
 */
export interface QuestionInstance {
  /** Reference to template ID */
  templateId: string;

  /** Type of question */
  type: QuestionType;

  // ---- Resolved Content ----

  /** Statement with all variables resolved */
  statement: ContentField[];

  /** Resolved variables with final values */
  resolvedVariables?: ResolvedVariable[];

  /** Resolved answer(s) */
  answer: string | string[];

  // ---- Metadata (copied from template) ----

  options?: QuestionTemplate['options'];
  precision?: PrecisionType;
  grades: GradeLevel[];
  theme: string;
  domain: string;
  subdomain?: string;
  level: number;
  delay?: number;
  correction?: ContentField[];

  // ---- Type-specific (resolved) ----

  transformType?: AlgebraicTransformType;

  blanks?: {
    position: number;
    expectedAnswer: string;  // Resolved
  }[];

  choices?: {
    content: ContentField;   // Resolved
    isCorrect: boolean;
  }[];

  /** Shuffled choices (for display, preserves original index) */
  shuffledChoices?: {
    content: ContentField;
    originalIndex: number;   // Index before shuffle
  }[];

  multipleAnswers?: boolean;

  // ---- Generation Metadata ----

  /** ISO timestamp of generation */
  generatedAt: string;

  /** Random seed for reproducibility (optional) */
  seed?: number;

  /** Index of selected variation from template (for debugging) */
  selectedVariationIndex?: number;
}

// ============================================================================
// GENERATION RESULT
// ============================================================================

/**
 * Result of instance generation
 *
 * Can be either successful (with instance) or failed (with errors)
 */
export type GenerationResult =
  | {
      success: true;
      instance: QuestionInstance;
    }
  | {
      success: false;
      errors: string[];  // List of error messages
    };

// ============================================================================
// RANDOM NUMBER SPECIFICATIONS
// ============================================================================

/**
 * Number or variable reference
 *
 * Used for min/max bounds and digit counts in random expressions
 */
export type NumberOrVariable =
  | number
  | { type: 'variable'; name: string };

/**
 * Exclusion pattern for random generation
 *
 * @example Single value
 * { type: 'value', value: 5 }
 *
 * @example Range
 * { type: 'range', min: 5, max: 7 }  // Excludes 5, 6, 7
 *
 * @example Variable
 * { type: 'variable', name: 'a' }  // Excludes value of variable 'a'
 */
export type Exclusion =
  | { type: 'value'; value: NumberOrVariable }
  | { type: 'range'; min: NumberOrVariable; max: NumberOrVariable }
  | { type: 'variable'; name: string };

/**
 * Random number specification
 *
 * Parsed from {#:...} expressions with full support for variables
 * in bounds, digits, and exclusions.
 *
 * @example Integer range
 * {#:1-10} → { type: 'integer', min: 1, max: 10 }
 *
 * @example Variable bounds
 * {#:{@:min}-{@:max}} → { type: 'integer', min: {type:'variable',name:'min'}, max: {...} }
 *
 * @example Decimal by digits
 * {#:2.3} → { type: 'decimal', digitsBefore: 2, digitsAfter: 3 }
 *
 * @example Decimal range with step
 * {#:0.5-9.99:0.01} → { type: 'decimal', min: 0.5, max: 9.99, step: 0.01 }
 *
 * @example With exclusions
 * {#:1-20!5,7-9,{@:a}} → { ..., exclusions: [...] }
 */
export interface RandomSpec {
  /** Type of random number */
  type: 'integer' | 'decimal';

  // For integer/decimal ranges
  min?: NumberOrVariable;
  max?: NumberOrVariable;

  /** Step for decimal ranges (default: 1 for integers, 0.01 for decimals) */
  step?: number;

  // For decimal by digit specification
  digitsBefore?: NumberOrVariable;
  digitsAfter?: NumberOrVariable;

  /** Exclusion patterns (values, ranges, variables) */
  exclusions: Exclusion[];
}
