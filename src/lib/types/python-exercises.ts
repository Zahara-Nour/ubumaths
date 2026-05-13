/**
 * TypeScript types for Python exercises system.
 * Validation is modelled as two orthogonal layers:
 *   - `ast_requirements`: structural checks on the parsed code
 *   - `behavior`: runtime check (`output` or `unit_test`)
 */

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

// Unit Test Config
export interface UnitTestCase {
	args: unknown[];
	expected: unknown;
	/** When true, the worker redacts args/expected/actual before returning to the main thread. */
	hidden?: boolean;
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

// =============================================================================
// ValidationConfig — orthogonal AST checks + behavior layer.
//
// NOTE: these types are mirrored in `src/lib/shared/python/types.ts`
// (`BehaviorCheck`, `ExerciseValidationConfig`, `ExerciseValidationResult`)
// to avoid pulling server-only modules into the worker bundle. Keep both
// files in sync.
// =============================================================================

/**
 * Behavior check — discriminated union on `kind`.
 * Defines what runtime behavior is verified on submitted code.
 */
/**
 * Numeric tolerance for unit_test float comparisons.
 *
 * `eps_abs` and `eps_rel` are combined: `|actual - expected| ≤ max(eps_abs,
 * eps_rel * max(|actual|, |expected|))`. Use when the function uses
 * non-correctly-rounded transcendentals (math.exp, math.log, ...) so that
 * a bit-level Pyodide ↔ JS drift doesn't fail an otherwise correct answer.
 *
 * When `tolerance` is undefined, comparison is strict (a single ULP off
 * fails). For sqrt-/mult-/add-only algorithms, leave it undefined.
 */
export interface UnitTestTolerance {
	eps_abs: number;
	eps_rel: number;
}

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
			tolerance?: UnitTestTolerance;
	  }
	| {
			kind: 'variable_check';
			/**
			 * Map of variable name → expected value. After executing the
			 * student's code in a fresh namespace, each named variable is
			 * looked up and compared via the recursive engine in
			 * `validation/variable-compare.ts`. Type-strict for scalars;
			 * tuple ≡ list at the JSON boundary (Pyodide `toJs` collapses
			 * them to `Array`).
			 */
			expected_vars: Record<string, unknown>;
			tolerance?: UnitTestTolerance;
	  }
	| {
			kind: 'reference_solution';
			/**
			 * Differential testing against a hidden teacher implementation.
			 * `fixed` cases (with hardcoded `expected`) act as sentinels that
			 * also validate the teacher's reference. `generator` produces
			 * `count` random inputs (seeded for reproducibility); for each,
			 * `expected = reference(*args)` and is compared to the student's
			 * output. At least one of `fixed` or `generator` must be present.
			 */
			function_name: string;
			reference_code: string;
			fixed?: { cases: UnitTestCase[] };
			generator?: {
				code: string;
				count: number;
				seed: number;
			};
			tolerance?: UnitTestTolerance;
	  };

/**
 * Exercise validation config. At least one of `ast_requirements`
 * (non-empty) and `behavior` must be present.
 */
export interface ValidationConfig {
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

/**
 * Result of running the validation pipeline.
 * `failed_layer` indicates which orthogonal axis failed (or null on success).
 * `behavior_kind` is set whenever a behavior was configured (succeeded or not).
 */
export interface ValidationResult {
	valid: boolean;
	failed_layer: 'ast' | 'behavior' | null;
	behavior_kind?: 'output' | 'unit_test' | 'variable_check' | 'reference_solution';
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
