/**
 * TypeScript types for Python exercises system
 * Supports output comparison, unit testing, and AST analysis validation
 */

// Validation Strategy Types
export type ValidationStrategyType = 'output' | 'unit_test' | 'ast';

// Output Comparison Config
export interface OutputTestCase {
	input: string;
	expected_output: string;
}

export interface OutputValidationConfig {
	type: 'output';
	test_cases: OutputTestCase[];
	ignore_whitespace?: boolean;
	timeout_ms?: number;
}

// Unit Test Config
export interface UnitTestCase {
	args: unknown[];
	expected: unknown;
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
	timeout_ms?: number;
}

// Union type for all validation configs
export type ValidationConfig =
	| OutputValidationConfig
	| UnitTestValidationConfig
	| ASTValidationConfig;

// Validation Result Types
export interface TestCaseResult {
	passed: boolean;
	input?: string;
	expected?: string;
	actual?: string;
	error?: string;
}

export interface ValidationResult {
	valid: boolean;
	strategy: ValidationStrategyType;
	test_results: TestCaseResult[];
	ast_issues?: string[]; // For AST validation
	error?: string; // Global error (timeout, crash, etc.)
	execution_time_ms: number;
}

// Exercise Types
export type ExerciseDifficulty = 'easy' | 'medium' | 'hard';

export interface PythonExercise {
	id: string;
	title: string;
	description: string | null;
	instructions: string | null;
	starter_code: string | null;
	solution_code: string;
	validation_config: ValidationConfig;
	difficulty: ExerciseDifficulty;
	tags: string[];
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
