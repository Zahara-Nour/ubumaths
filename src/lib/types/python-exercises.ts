/**
 * TypeScript types for Python exercises system
 * Supports output comparison, unit testing, and AST analysis validation
 */

// Validation Strategy Types
export type ValidationStrategyType = 'output' | 'unit_test' | 'ast';

// =============================================================================
// Output Comparison — discriminated union of three intents.
//
// `exact`   — byte-for-byte identical.
// `text`    — text comparison with controlled normalization (whitespace, case).
// `numeric` — token-by-token numeric comparison with absolute/relative tolerance.
//
// The intent is the API surface the author actually thinks about; raw axes
// (tokenization × per-unit compare × whitespace handling) are folded into
// each kind to avoid 40 nonsensical combinations.
// =============================================================================

export interface ExactComparison {
	kind: 'exact';
}

export interface TextComparison {
	kind: 'text';
	whitespace: 'strict' | 'collapsed' | 'lines';
	case_insensitive?: boolean;
	trim_trailing_newline?: boolean;
}

export interface NumericComparison {
	kind: 'numeric';
	shape: 'flat' | 'lines' | 'grid';
	eps_abs: number;
	eps_rel: number;
	non_numeric?: 'match' | 'ignore';
	accept_comma_decimal?: boolean;
}

/**
 * Special-judge style comparator. The author provides a Python function
 *   compare(expected: str, actual: str, stdin: str) -> bool | dict
 * which the worker runs in an isolated namespace for each test case.
 * Returning `True` is equivalent to `{'passed': True}`. Returning
 * `{'passed': False, 'diff': '...'}` surfaces a custom diff to the student.
 */
export interface CustomComparison {
	kind: 'custom';
	code: string;
	timeout_ms?: number;
}

export type OutputComparison =
	| ExactComparison
	| TextComparison
	| NumericComparison
	| CustomComparison;

export interface OutputTestCase {
	input: string;
	expected_output: string;
	comparison?: OutputComparison;
	/** When true, the worker redacts input/expected/actual/diff before returning to the main thread. */
	hidden?: boolean;
}

export interface OutputValidationConfig {
	type: 'output';
	test_cases: OutputTestCase[];
	comparison: OutputComparison;
	timeout_ms?: number;
}

// Unit Test Config
export interface UnitTestCase {
	args: unknown[];
	expected: unknown;
	/** When true, the worker redacts args/expected/actual before returning to the main thread. */
	hidden?: boolean;
}

export interface UnitTestValidationConfig {
	type: 'unit_test';
	function_name: string;
	test_cases: UnitTestCase[];
	timeout_ms?: number;
}

// AST Requirement Types
export type ASTRequirementType =
	| 'uses_loop'
	| 'uses_recursion'
	| 'defines_function'
	| 'defines_class'
	| 'uses_list_comprehension'
	| 'no_global_variables'
	| 'no_print'
	| 'uses_import';

export interface ASTRequirement {
	type: ASTRequirementType;
	name?: string; // For defines_function, defines_class, uses_import
	message: string;
}

export interface ASTValidationConfig {
	type: 'ast';
	requirements: ASTRequirement[];
	output_tests?: OutputTestCase[];
	output_comparison?: OutputComparison;
	timeout_ms?: number;
}

// Union type for all validation configs
export type ValidationConfig =
	| OutputValidationConfig
	| UnitTestValidationConfig
	| ASTValidationConfig;

// =============================================================================
// New ValidationConfig shape — orthogonal AST checks + behavior layer
// See docs/wip/python-validation-refactor-spec.md
//
// NOTE: these types are mirrored in `src/lib/shared/python/types.ts`
// (under names `BehaviorCheck`, `ExerciseValidationConfigV2`,
// `ExerciseValidationResultV2`) to avoid pulling server-only modules into the
// worker bundle. Keep both definitions in sync — Phase 6 cleanup consolidates.
// =============================================================================

/**
 * Behavior check — discriminated union on `kind`.
 * Defines what runtime behavior is verified on submitted code.
 */
export type BehaviorCheck =
	| {
			kind: 'output';
			test_cases: OutputTestCase[];
			comparison: OutputComparison;
	  }
	| {
			kind: 'unit_test';
			function_name: string;
			test_cases: UnitTestCase[];
	  };

/**
 * Exercise validation config — orthogonal AST checks + behavior layer.
 * At least one of `ast_requirements` (non-empty) and `behavior` must be present.
 */
export interface ValidationConfigV2 {
	ast_requirements?: ASTRequirement[];
	behavior?: BehaviorCheck;
	timeout_ms?: number;
}

// Validation Result Types
export interface TestCaseResult {
	passed: boolean;
	input?: string;
	expected?: string;
	actual?: string;
	/** Human-readable explanation when `passed === false`. Localised in French. */
	diff?: string;
	error?: string;
	/** True when the source test case had `hidden: true` — sensitive fields are redacted. */
	hidden?: boolean;
}

export interface ValidationResult {
	valid: boolean;
	strategy: ValidationStrategyType;
	test_results: TestCaseResult[];
	ast_issues?: string[]; // For AST validation
	error?: string; // Global error (timeout, crash, etc.)
	execution_time_ms: number;
}

/**
 * Result of running the new AST + behavior pipeline.
 * `failed_layer` indicates which orthogonal axis failed (or null on success).
 * `behavior_kind` is set whenever a behavior was configured (succeeded or not).
 */
export interface ValidationResultV2 {
	valid: boolean;
	failed_layer: 'ast' | 'behavior' | null;
	behavior_kind?: 'output' | 'unit_test';
	ast_issues?: string[];
	test_results: TestCaseResult[];
	error?: string;
	execution_time_ms: number;
}

/** Class level — same vocabulary as the python-examples-library tags. */
export type ExerciseLevel = 'college' | 'lycee' | 'nsi' | 'etudiant';

export interface PythonExercise {
	id: string;
	title: string;
	description: string | null;
	instructions: string | null;
	starter_code: string | null;
	solution_code: string;
	validation_config: ValidationConfig;
	level: ExerciseLevel;
	tags: string[];
	source: string | null;
	author_id: string;
	is_public: boolean;
	created_at: string;
	updated_at: string;
}

// Exercise for student view (without solution_code)
export type PythonExerciseStudentView = Omit<PythonExercise, 'solution_code'>;

export interface PythonExerciseAssignment {
	id: string;
	exercise_id: string;
	class_id: string | null;
	student_id: string | null;
	assigned_by: string;
	due_date: string | null;
	max_attempts: number | null;
	created_at: string;
	// Joined data
	exercise?: PythonExerciseStudentView;
}

// =============================================================================
// Mastery (auto-derived from submissions, sticky-mastered)
// =============================================================================

export type PythonMasteryStatus = 'mastered' | 'needs_review';

export interface PythonExerciseMastery {
	id: string;
	student_id: string;
	exercise_id: string;
	status: PythonMasteryStatus;
	updated_at: string;
}

export interface PythonExerciseSubmission {
	id: string;
	exercise_id: string;
	assignment_id: string | null;
	student_id: string;
	code: string;
	validation_result: ValidationResult;
	is_correct: boolean;
	attempt_number: number;
	execution_time_ms: number | null;
	created_at: string;
}
