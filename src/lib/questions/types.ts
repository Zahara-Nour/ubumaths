/**
 * Question Bank System - Type Definitions
 * ========================================
 *
 * This file defines the complete type system for the mathematical question bank,
 * including templates, instances, random number generation, and validation.
 *
 * Key Features:
 * - Support for variables in random expressions: {{random:{{min}}..{{max}}}}
 * - Multiple question types (numerical, algebraic, QCM, fill-in-blanks)
 * - Complex exclusion patterns (values, ranges, variables)
 * - Precision types for numerical answers
 *
 * Uses shared parameterization library for variable resolution and random generation.
 *
 * @module questions/types
 */

// ============================================================================
// SHARED PARAMETERIZATION TYPES
// ============================================================================

import type {
	Variable as SharedVariable,
	ResolvedVariable as SharedResolvedVariable,
	RandomSpec as SharedRandomSpec,
	NumberOrVariable as SharedNumberOrVariable,
	Exclusion as SharedExclusion
} from '$lib/shared/parameterization';

// Re-export shared types for convenience
export type NumberOrVariable = SharedNumberOrVariable;
export type Exclusion = SharedExclusion;

// ============================================================================
// BRANDED MARKDOWN TYPES
// ============================================================================

import type { TemplateMarkdown, ResolvedMarkdown } from '$lib/shared/markdown';

// ============================================================================
// GRADE LEVELS (re-exported from unified system)
// ============================================================================

// Import from unified grade system - single source of truth
import { type GradeCode } from '$lib/types/grades';
export { GRADE_CODES, GRADES, type GradeCode } from '$lib/types/grades';

/**
 * French educational grade levels
 *
 * Backward compatibility alias - prefer GradeCode in new code.
 *
 * NOTE: The old type included 'SPE_1', 'SPE_T', 'STMG' which are now
 * '1_SPE', 'T_SPE', '1_STMG', 'T_STMG' in the unified system.
 * See mapLegacyGradeCode() in utils/grades.ts for migration.
 */
export type GradeLevel = GradeCode;

// ============================================================================
// QUESTION TYPES
// ============================================================================

/**
 * Available question types
 */
export type QuestionType =
	| 'numerical_exact' // Exact numerical value required
	| 'numerical_decimal' // Decimal approximation
	| 'numerical_rounded' // Rounded value
	| 'numerical_with_unit' // Numerical value with physical unit
	| 'algebraic_transform' // Factor, expand, simplify expressions
	| 'fill_in_blanks' // Fill in missing parts
	| 'multiple_choice'; // Multiple choice (one or several answers)

/**
 * Types of algebraic transformations
 */
export type AlgebraicTransformType = 'factor' | 'expand' | 'simplify' | 'solve';

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
	| { type: 'none' } // Exact value required
	| { type: 'decimal'; digits: number } // Decimal places
	| { type: 'significant'; digits: number } // Significant figures
	| { type: 'magnitude'; digits: number } // Order of magnitude (10^digits)
	| {
			type: 'tolerance';
			tolerance: number; // Tolerance value
			mode: 'absolute' | 'relative'; // Tolerance mode
	  };

// ============================================================================
// VARIABLES
// ============================================================================

/**
 * Variable definition in a question template
 *
 * Uses shared Variable type from parameterization library.
 * Variables are resolved in declaration order and can reference
 * previously defined variables.
 *
 * Expression syntax:
 * - {{otherVar}} - Reference to another variable
 * - {{random:1..10}} - Random integer from 1 to 10
 * - {{random:{{min}}..{{max}}}} - Random with variable bounds
 * - {{random:2.3}} - Random decimal (2 digits before, 3 after)
 * - {{random:1..10!5,7}} - Random excluding 5 and 7
 * - {{random:1..100!{{excluded}}}} - Random excluding variable value
 * - {{eval:expression}} - Evaluate mathematical expression
 *
 * @example Simple random
 * { name: 'a', expression: '{{random:1..10}}' }
 *
 * @example Variable bounds
 * { name: 'max', expression: '20' }
 * { name: 'value', expression: '{{random:1..{{max}}}}' }
 *
 * @example Exclusion
 * { name: 'a', expression: '{{random:1..10}}' }
 * { name: 'b', expression: '{{random:1..10!{{a}}}}' }
 */
export type QuestionVariable = SharedVariable;

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
	/** Question statement as markdown template (can contain {{var}}, {{random:}}, etc.) */
	statement: TemplateMarkdown;

	/** Variables in declaration order (resolved sequentially) */
	variables?: QuestionVariable[];

	/** Expected answer(s) - plain string values (not markdown) */
	answer: string | string[];

	/** Detailed correction/explanation with full structure (optional) */
	correction?: QuestionCorrection;

	// ---- Type-specific Fields (per-variation) ----

	/** Blank positions and answers (for fill_in_blanks) */
	blanks?: {
		/** Position in statement */
		position: number;

		/** Expected answer - plain string value (not markdown) */
		expectedAnswer: string;
	}[];

	/** Choices for multiple choice */
	choices?: {
		/** Choice content as markdown template */
		content: TemplateMarkdown;

		/** Whether this choice is correct */
		isCorrect: boolean;
	}[];

	/**
	 * Custom validation rules for testAnswers-style validation
	 *
	 * Used when the correct answer depends on generated variables
	 * (e.g., "find a divisor of {{n}} other than 1")
	 *
	 * @see validation-rule-evaluator.ts for rule evaluation
	 */
	validationRules?: ValidationRule[];
}

/**
 * Shared defaults that apply to all variations.
 * Per-variation fields override these when defined.
 */
export interface SharedVariationDefaults {
	/** Shared question statement template */
	statement?: TemplateMarkdown;

	/** Shared variable definitions (resolved before per-variation variables) */
	variables?: QuestionVariable[];

	/** Shared expected answer(s) */
	answer?: string | string[];

	/** Shared correction with full structure (feedback + steps) */
	correction?: QuestionCorrection;

	/** Shared choices for choice/qcm types */
	choices?: {
		/** Choice content as markdown template */
		content: TemplateMarkdown;

		/** Whether this choice is correct */
		isCorrect: boolean;
	}[];

	/** Shared validation rules */
	validationRules?: ValidationRule[];
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

	// ---- Title & Description ----

	/** Template title (supports LaTeX) - used for organization and display */
	title: string;

	/** Optional rich text description for internal documentation and student context */
	description?: string;

	// ---- Variations ----

	/**
	 * Shared defaults for all variations (optional).
	 *
	 * When defined, variations inherit these values unless they override them.
	 * For `variables`, shared and per-variation are MERGED (shared resolved first).
	 */
	shared?: SharedVariationDefaults;

	/**
	 * Array of question variations (minimum 1 required)
	 *
	 * During instance generation, one variation is randomly selected.
	 * Each variation has its own statement, variables, answer, and correction.
	 */
	variations: QuestionVariation[];

	// ---- Exercise Instruction (shared across all variations) ----

	/**
	 * Optional shared exercise instruction for all variations (e.g., "Calculer", "Résoudre")
	 *
	 * This instruction serves two purposes:
	 * - In normal display (flashcards, preview): shown before the statement
	 * - In worksheet generation: used as the exercise title (not repeated in each question)
	 */
	exerciseInstruction?: string;

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

		/** Constraint validation options for form checking */
		constraints?: ConstraintOptions;

		/** Unit validation options for numerical_with_unit questions */
		unitOptions?: {
			/** Require exact unit match (no conversion allowed) */
			requireExactUnit?: boolean;
			/** Require matching unit symbols */
			requireSameSymbol?: boolean;
			/** Numeric tolerance */
			tolerance?: {
				absolute?: number;
				relative?: number;
			};
		};
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

	/** Template status: 'draft' (work-in-progress) or 'published' (active) */
	status: 'draft' | 'published';

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
	created_by?: string; // UUID of creator
}

// ============================================================================
// QUESTION INSTANCE (generated from template)
// ============================================================================

/**
 * Resolved variable with final value
 *
 * Uses shared ResolvedVariable type from parameterization library.
 */
export type ResolvedVariable = SharedResolvedVariable;

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

	/**
	 * Statement as resolved markdown (all placeholders resolved to values)
	 * This is the preferred format for rendering via MarkdownRenderer.
	 * Contains: text, $inline math$, $$block math$$, images, {{blank:N}}, etc.
	 */
	statement: ResolvedMarkdown;

	/** Resolved variables with final values */
	resolvedVariables?: ResolvedVariable[];

	/** Resolved answer(s) - plain string values (not markdown) */
	answer: string | string[];

	// ---- Metadata (copied from template) ----

	/** Template title (copied from template) */
	title?: string;

	/** Template description (copied from template) */
	description?: string;

	/** Optional exercise instruction (copied from template) */
	exerciseInstruction?: string;

	options?: QuestionTemplate['options'];
	precision?: PrecisionType;
	grades: GradeLevel[];
	theme: string;
	domain: string;
	subdomain?: string;
	level: number;
	delay?: number;

	/**
	 * Resolved correction with feedback and/or step-by-step explanation.
	 * All placeholders are resolved to final values.
	 */
	correction?: ResolvedCorrection;

	// ---- Type-specific (resolved) ----

	transformType?: AlgebraicTransformType;

	blanks?: {
		position: number;
		expectedAnswer: string; // Resolved plain string value
	}[];

	choices?: {
		content: ResolvedMarkdown; // Resolved markdown for each choice
		isCorrect: boolean;
	}[];

	/** Shuffled choices (for display, preserves original index) */
	shuffledChoices?: {
		content: ResolvedMarkdown; // Resolved markdown for each choice
		originalIndex: number; // Index before shuffle
	}[];

	multipleAnswers?: boolean;

	/**
	 * Custom validation rules (copied from variation)
	 * Evaluated at validation time with resolved variables
	 */
	validationRules?: ValidationRule[];

	// ---- Generation Metadata ----

	/** ISO timestamp of generation */
	generatedAt: string;

	/** Random seed for reproducibility (optional) */
	seed?: number;

	/** Index of selected variation from template (for debugging) */
	selectedVariationIndex?: number;

	/**
	 * Resolved colors used in this instance
	 * Maps color reference (e.g., "color1") to hex code (e.g., "#FF5722")
	 *
	 * NOTE: Reserved for future use. Currently colors are resolved inline during
	 * content generation and not tracked separately. This field can be populated
	 * when we need to:
	 * - Display a color legend with the question
	 * - Allow instructors to see which colors were used
	 * - Enable color consistency verification in tests
	 */
	resolvedColors?: Record<string, string>;
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
			errors: string[]; // List of error messages
	  };

// ============================================================================
// RANDOM NUMBER SPECIFICATIONS
// ============================================================================

/**
 * Random number specification
 *
 * Uses shared RandomSpec from parameterization library.
 * Parsed from {{random:...}} expressions with full support for variables
 * in bounds, digits, and exclusions.
 *
 * @example Integer range
 * {{random:1..10}} → { type: 'integer', min: {type:'number',value:1}, max: {...,value:10} }
 *
 * @example Variable bounds
 * {{random:{{min}}..{{max}}}} → { type: 'integer', min: {type:'variable',name:'min'}, max: {...} }
 *
 * @example Decimal by digits
 * {{random:2.3}} → { type: 'decimal-by-digits', digitsBefore: {type:'number',value:2}, digitsAfter: {...,value:3} }
 *
 * @example Decimal range with step
 * {{random:0.5..9.99:0.01}} → { type: 'decimal-range', min: {...,value:0.5}, max: {...,value:9.99}, step: 0.01 }
 *
 * @example With exclusions
 * {{random:1..20!5,7..9,{{a}}}} → { ..., exclusions: [...] }
 */
export type RandomSpec = SharedRandomSpec;

// ============================================================================
// CONSTRAINT VALIDATION TYPES
// ============================================================================

/**
 * Validation status levels for answer checking
 *
 * These status levels support partial credit:
 * - correct: Full points
 * - unoptimal_form: Partial points (answer correct, form suboptimal)
 * - bad_form: No points (answer correct but required form violated)
 * - incorrect: No points (wrong answer)
 * - empty: No answer provided
 */
export type ValidationStatus = 'correct' | 'unoptimal_form' | 'bad_form' | 'incorrect' | 'empty';

/**
 * Constraint types that can be checked on answers
 */
export type ConstraintId =
	| 'spaces'
	| 'products'
	| 'brackets'
	| 'zeros'
	| 'form'
	| 'nullTerms'
	| 'factorOne'
	| 'factorZero'
	| 'signs';

/**
 * How to handle constraint violations (ordered by decreasing severity)
 *
 * - 'strict': Violation results in bad_form (0 points) - form is required
 * - 'warn': Violation results in unoptimal_form (partial credit) - just a warning
 * - 'off': Skip this check entirely - constraint disabled
 */
export type ConstraintMode = 'strict' | 'warn' | 'off';

/**
 * Constraint configuration for question validation
 */
export interface ConstraintOptions {
	// Existing validators (text/regex based)
	spaces?: ConstraintMode;
	products?: ConstraintMode;
	brackets?: ConstraintMode;
	zeros?: ConstraintMode;
	form?: ConstraintMode;
	/** Allow brackets around first negative term: (-5)+3 */
	allowBracketsInFirstNegativeTerm?: boolean;
	// New validators (Compute Engine pattern matching)
	nullTerms?: ConstraintMode;
	factorOne?: ConstraintMode;
	factorZero?: ConstraintMode;
	signs?: ConstraintMode;
}

// ============================================================================
// UNIFIED CORRECTION SYSTEM
// ============================================================================

/**
 * Unified correction system for questions
 *
 * Replaces the old correctionFormats + correctionDetailss pattern.
 * Uses TemplateMarkdown for all content (handles text, LaTeX, images).
 *
 * @example Simple feedback
 * { feedback: { correct: 'Bravo!' } }
 *
 * @example With explanation steps
 * { steps: ['Étape 1: {{expression}}', 'Étape 2: Résultat = {{solution}}'] }
 *
 * @example Complete correction
 * {
 *   feedback: {
 *     correct: 'Excellent!',
 *     incorrect: 'La réponse était {{solution}}'
 *   },
 *   steps: ['On pose...', 'On calcule...', 'Donc {{solution}}']
 * }
 */
export interface QuestionCorrection {
	feedback?: {
		correct?: TemplateMarkdown;
		incorrect?: TemplateMarkdown;
		partial?: TemplateMarkdown;
	};
	steps?: TemplateMarkdown[];
}

/**
 * Resolved correction with all placeholders resolved to final values.
 *
 * Used in QuestionInstance after template resolution.
 */
export interface ResolvedCorrection {
	feedback?: {
		correct?: ResolvedMarkdown;
		incorrect?: ResolvedMarkdown;
		partial?: ResolvedMarkdown;
	};
	steps?: ResolvedMarkdown[];
}

// ============================================================================
// DYNAMIC VALIDATION RULES
// ============================================================================

/**
 * Validation rules for dynamic answer checking (testAnswerss replacement)
 *
 * These rules validate answers that can't be hardcoded because they depend
 * on randomly generated values (e.g., "is answer a divisor of {{n}}?").
 */
export type ValidationRule =
	| DivisorRule
	| MultipleRule
	| RangeRule
	| EquationRootRule
	| EquivalenceRule
	| PredicateRule
	| CustomExpressionRule;

/**
 * Rule: answer must be a divisor of the dividend
 *
 * @example { type: 'divisor', dividend: '{{n}}' }
 */
export interface DivisorRule {
	type: 'divisor';
	/** Expression for the dividend, e.g., '{{n}}' or '60' */
	dividend: string;
}

/**
 * Rule: answer must be a multiple of the base
 *
 * @example { type: 'multiple', base: '{{a}}' }
 */
export interface MultipleRule {
	type: 'multiple';
	/** Expression for the base, e.g., '{{a}}' */
	base: string;
}

/**
 * Rule: answer must be within a range
 *
 * @example { type: 'range', min: '1', max: '{{max}}', inclusive: true }
 */
export interface RangeRule {
	type: 'range';
	/** Minimum value expression */
	min: string;
	/** Maximum value expression */
	max: string;
	/** Whether bounds are inclusive (default: true) */
	inclusive?: boolean;
}

/**
 * Rule: answer must be a root of the equation
 *
 * @example { type: 'equation_root', equation: 'x^2 - {{sum}}*x + {{product}} = 0' }
 */
export interface EquationRootRule {
	type: 'equation_root';
	/** Equation expression, e.g., 'x^2 - {{sum}}*x + {{product}} = 0' */
	equation: string;
	/** Variable name in the equation (default: 'x') */
	variable?: string;
}

/**
 * Rule: answer must be equivalent to an expression
 *
 * @example { type: 'equivalent', expression: '{{a}}/{{b}}' }
 */
export interface EquivalenceRule {
	type: 'equivalent';
	/** Expression the answer must be equivalent to */
	expression: string;
}

/**
 * Rule: answer must satisfy a predicate
 *
 * @example { type: 'predicate', predicate: 'isPrime' }
 */
export interface PredicateRule {
	type: 'predicate';
	/** Predicate function to apply */
	predicate:
		| 'isPrime'
		| 'isComposite'
		| 'isEven'
		| 'isOdd'
		| 'isPositive'
		| 'isNegative'
		| 'isInteger';
}

/**
 * Rule: custom expression for legacy or complex patterns
 *
 * This is a fallback for validation logic that doesn't fit other rule types.
 *
 * @example { type: 'custom', expression: 'gcd(answer, {{n}}) > 1', description: 'Answer shares a factor with n' }
 */
export interface CustomExpressionRule {
	type: 'custom';
	/** Raw expression to evaluate (legacy fallback) */
	expression: string;
	/** Human-readable description for debugging */
	description?: string;
}
