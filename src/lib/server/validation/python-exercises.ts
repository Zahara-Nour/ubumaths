/**
 * Zod validation schemas for Python exercises API
 * All inputs must be validated with these schemas before database operations
 */

import { z } from 'zod';

// Constants for validation bounds
const TIMEOUT_MIN = 100;
const TIMEOUT_MAX = 60000;
const MAX_ATTEMPTS_MIN = 1;
const MAX_ATTEMPTS_MAX = 100;
const TEST_CASES_MIN = 1;
const TEST_CASES_MAX = 50;
const REQUIREMENTS_MIN = 1;
const REQUIREMENTS_MAX = 20;
const TAGS_MAX = 10;
const TITLE_MIN = 1;
const TITLE_MAX = 200;
const CODE_MIN = 1;
const CODE_MAX = 100000;
const FUNCTION_NAME_MIN = 1;
const FUNCTION_NAME_MAX = 100;
const DESCRIPTION_MAX = 5000;
const INSTRUCTIONS_MAX = 10000;
const MESSAGE_MAX = 500;

// Base schemas
const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime();

// Validation Strategy Schemas
const validationStrategyTypeSchema = z.enum(['output', 'unit_test', 'ast']);

// Output Comparison Config
const outputTestCaseSchema = z.object({
	input: z.string().max(CODE_MAX),
	expected_output: z.string().max(CODE_MAX)
});

const outputValidationConfigSchema = z.object({
	type: z.literal('output'),
	test_cases: z
		.array(outputTestCaseSchema)
		.min(TEST_CASES_MIN)
		.max(TEST_CASES_MAX)
		.describe('Output test cases'),
	ignore_whitespace: z.boolean().optional().default(false),
	timeout_ms: z.number().int().min(TIMEOUT_MIN).max(TIMEOUT_MAX).optional().default(5000)
});

// Unit Test Config
const unitTestCaseSchema = z.object({
	args: z.array(z.unknown()).max(20).describe('Function arguments'),
	expected: z.unknown().describe('Expected return value')
});

const unitTestValidationConfigSchema = z.object({
	type: z.literal('unit_test'),
	function_name: z
		.string()
		.min(FUNCTION_NAME_MIN)
		.max(FUNCTION_NAME_MAX)
		.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Function name must be a valid Python identifier'),
	test_cases: z
		.array(unitTestCaseSchema)
		.min(TEST_CASES_MIN)
		.max(TEST_CASES_MAX)
		.describe('Unit test cases'),
	timeout_ms: z.number().int().min(TIMEOUT_MIN).max(TIMEOUT_MAX).optional().default(5000)
});

// AST Requirement Types
const astRequirementTypeSchema = z.enum([
	'uses_loop',
	'uses_recursion',
	'defines_function',
	'defines_class',
	'uses_list_comprehension',
	'no_global_variables',
	'no_print',
	'uses_import'
]);

const astRequirementSchema = z.object({
	type: astRequirementTypeSchema,
	name: z
		.string()
		.min(1)
		.max(FUNCTION_NAME_MAX)
		.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Name must be a valid Python identifier')
		.optional()
		.describe('Required for defines_function, defines_class, uses_import'),
	message: z.string().min(1).max(MESSAGE_MAX).describe('Error message to show on failure')
});

const astValidationConfigSchema = z.object({
	type: z.literal('ast'),
	requirements: z
		.array(astRequirementSchema)
		.min(REQUIREMENTS_MIN)
		.max(REQUIREMENTS_MAX)
		.describe('AST requirements'),
	output_tests: z
		.array(outputTestCaseSchema)
		.max(TEST_CASES_MAX)
		.optional()
		.describe('Optional output tests to run after AST validation'),
	timeout_ms: z.number().int().min(TIMEOUT_MIN).max(TIMEOUT_MAX).optional().default(5000)
});

// Discriminated union for all validation configs
export const validationConfigSchema = z.discriminatedUnion('type', [
	outputValidationConfigSchema,
	unitTestValidationConfigSchema,
	astValidationConfigSchema
]);

// Validation Result Schemas (for submission responses)
const testCaseResultSchema = z.object({
	passed: z.boolean(),
	input: z.string().optional(),
	expected: z.string().optional(),
	actual: z.string().optional(),
	error: z.string().optional()
});

export const validationResultSchema = z.object({
	valid: z.boolean(),
	strategy: validationStrategyTypeSchema,
	test_results: z.array(testCaseResultSchema),
	ast_issues: z.array(z.string()).optional(),
	error: z.string().optional(),
	execution_time_ms: z.number().int().min(0)
});

// Exercise Difficulty
const exerciseDifficultySchema = z.enum(['easy', 'medium', 'hard']);

// Create Exercise Schema
export const createExerciseSchema = z.object({
	title: z
		.string()
		.min(TITLE_MIN)
		.max(TITLE_MAX)
		.describe('Exercise title (required, 1-200 chars)'),
	description: z
		.string()
		.max(DESCRIPTION_MAX)
		.nullable()
		.optional()
		.describe('Exercise description (optional, max 5000 chars)'),
	instructions: z
		.string()
		.max(INSTRUCTIONS_MAX)
		.nullable()
		.optional()
		.describe('Exercise instructions (optional, max 10000 chars)'),
	starter_code: z
		.string()
		.max(CODE_MAX)
		.nullable()
		.optional()
		.describe('Initial code provided to student (optional)'),
	solution_code: z
		.string()
		.min(CODE_MIN)
		.max(CODE_MAX)
		.describe('Solution code (required, 1-100000 chars)'),
	validation_config: validationConfigSchema.describe('Validation strategy and configuration'),
	difficulty: exerciseDifficultySchema.describe('Exercise difficulty level'),
	tags: z
		.array(z.string().min(1).max(50))
		.max(TAGS_MAX)
		.default([])
		.describe('Exercise tags (max 10)'),
	is_public: z.boolean().default(false).describe('Whether exercise is publicly visible')
});

// Update Exercise Schema (all fields optional except id)
export const updateExerciseSchema = z.object({
	id: uuidSchema,
	title: z.string().min(TITLE_MIN).max(TITLE_MAX).optional(),
	description: z.string().max(DESCRIPTION_MAX).nullable().optional(),
	instructions: z.string().max(INSTRUCTIONS_MAX).nullable().optional(),
	starter_code: z.string().max(CODE_MAX).nullable().optional(),
	solution_code: z.string().min(CODE_MIN).max(CODE_MAX).optional(),
	validation_config: validationConfigSchema.optional(),
	difficulty: exerciseDifficultySchema.optional(),
	tags: z.array(z.string().min(1).max(50)).max(TAGS_MAX).optional(),
	is_public: z.boolean().optional()
});

// Assign Exercise Schema
export const assignExerciseSchema = z.object({
	exercise_id: uuidSchema.describe('Exercise to assign'),
	class_id: uuidSchema.nullable().optional().describe('Class to assign to (optional)'),
	student_id: uuidSchema
		.nullable()
		.optional()
		.describe('Individual student to assign to (optional)'),
	due_date: timestampSchema.nullable().optional().describe('Assignment due date (optional)'),
	max_attempts: z
		.number()
		.int()
		.min(MAX_ATTEMPTS_MIN)
		.max(MAX_ATTEMPTS_MAX)
		.nullable()
		.optional()
		.describe('Maximum number of attempts allowed (optional, 1-100)')
});

// Submit Exercise Schema
export const submitExerciseSchema = z.object({
	exercise_id: uuidSchema.describe('Exercise being submitted'),
	assignment_id: uuidSchema
		.nullable()
		.optional()
		.describe('Assignment ID if this is an assignment submission'),
	code: z
		.string()
		.min(CODE_MIN)
		.max(CODE_MAX)
		.describe('Student code submission (required, 1-100000 chars)')
});

// Query parameter schemas
export const listExercisesQuerySchema = z.object({
	difficulty: exerciseDifficultySchema.optional(),
	tags: z
		.string()
		.optional()
		.transform((val) => (val ? val.split(',').slice(0, TAGS_MAX) : undefined))
		.describe('Comma-separated tags'),
	is_public: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined))
		.describe('Filter by public status'),
	author_id: uuidSchema.optional().describe('Filter by author'),
	limit: z
		.string()
		.optional()
		.transform((val) => (val ? Math.min(Math.max(parseInt(val, 10), 1), 100) : 20))
		.describe('Results per page (1-100, default 20)'),
	offset: z
		.string()
		.optional()
		.transform((val) => (val ? Math.max(parseInt(val, 10), 0) : 0))
		.describe('Pagination offset (default 0)')
});

export const exerciseIdParamSchema = z.object({
	id: uuidSchema
});

// Type exports for use in route handlers
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type AssignExerciseInput = z.infer<typeof assignExerciseSchema>;
export type SubmitExerciseInput = z.infer<typeof submitExerciseSchema>;
export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
export type ExerciseIdParam = z.infer<typeof exerciseIdParamSchema>;
