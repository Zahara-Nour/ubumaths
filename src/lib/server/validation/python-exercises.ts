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
const SOURCE_MAX = 200;

// Base schemas
const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime();

// =============================================================================
// Output comparison — discriminated union (exact / text / numeric).
// Defensive bound on epsilons: > 1 makes no pedagogical sense.
// =============================================================================

const epsilonSchema = z.number().min(0).max(1).finite();

const exactComparisonSchema = z.object({
	kind: z.literal('exact')
});

const textComparisonSchema = z.object({
	kind: z.literal('text'),
	whitespace: z.enum(['strict', 'collapsed', 'lines']),
	case_insensitive: z.boolean().optional().default(false),
	trim_trailing_newline: z.boolean().optional().default(true)
});

const numericComparisonSchema = z.object({
	kind: z.literal('numeric'),
	shape: z.enum(['flat', 'lines', 'grid']),
	eps_abs: epsilonSchema,
	eps_rel: epsilonSchema,
	non_numeric: z.enum(['match', 'ignore']).optional().default('match'),
	accept_comma_decimal: z.boolean().optional().default(false)
});

const COMPARATOR_CODE_MAX = 10_000;
const COMPARATOR_TIMEOUT_MIN = 100;
const COMPARATOR_TIMEOUT_MAX = 10_000;

const customComparisonSchema = z.object({
	kind: z.literal('custom'),
	code: z.string().min(1).max(COMPARATOR_CODE_MAX),
	timeout_ms: z
		.number()
		.int()
		.min(COMPARATOR_TIMEOUT_MIN)
		.max(COMPARATOR_TIMEOUT_MAX)
		.optional()
		.default(2000)
});

export const outputComparisonSchema = z.discriminatedUnion('kind', [
	exactComparisonSchema,
	textComparisonSchema,
	numericComparisonSchema,
	customComparisonSchema
]);

// Output Comparison Config
const outputTestCaseSchema = z.object({
	input: z.string().max(CODE_MAX),
	expected_output: z.string().max(CODE_MAX),
	comparison: outputComparisonSchema.optional(),
	hidden: z.boolean().optional().default(false)
});

const AT_LEAST_ONE_VISIBLE = 'Au moins un test doit être visible';

// Unit Test Config
const unitTestCaseSchema = z.object({
	args: z.array(z.unknown()).max(20).describe('Function arguments'),
	expected: z.unknown().describe('Expected return value'),
	hidden: z.boolean().optional().default(false)
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

// Validation Result Schemas (for submission responses)
//
// These shapes round-trip from the worker through the client to the API
// `submit` endpoint, where they are persisted verbatim into a JSONB column.
// The .max() bounds protect the DB and the rendering layer from a malicious
// client posting megabyte-scale strings.
const TEST_RESULT_FIELD_MAX = 10_000;
const TEST_RESULT_ERROR_MAX = 2_000;
const AST_ISSUES_MAX = 20;
const AST_ISSUE_LENGTH_MAX = 500;
const RESULT_ERROR_MAX = 500;

const testCaseResultSchema = z.object({
	passed: z.boolean(),
	input: z.string().max(TEST_RESULT_FIELD_MAX).optional(),
	expected: z.string().max(TEST_RESULT_FIELD_MAX).optional(),
	actual: z.string().max(TEST_RESULT_FIELD_MAX).optional(),
	diff: z.string().max(TEST_RESULT_FIELD_MAX).optional(),
	error: z.string().max(TEST_RESULT_ERROR_MAX).optional(),
	hidden: z.boolean().optional()
});

// =============================================================================
// Validation schemas: orthogonal AST checks + behavior layer
// =============================================================================

const AT_LEAST_ONE_LAYER =
	'Au moins une vérification de forme ou un comportement attendu doit être défini';

const behaviorOutputSchema = z.object({
	kind: z.literal('output'),
	test_cases: z
		.array(outputTestCaseSchema)
		.min(TEST_CASES_MIN)
		.max(TEST_CASES_MAX)
		.refine((cases) => cases.some((tc) => !tc.hidden), AT_LEAST_ONE_VISIBLE)
		.describe('Output test cases'),
	comparison: outputComparisonSchema.describe('Default comparison applied to every test case')
});

const unitTestToleranceSchema = z.object({
	eps_abs: epsilonSchema,
	eps_rel: epsilonSchema
});

const behaviorUnitTestSchema = z.object({
	kind: z.literal('unit_test'),
	function_name: z
		.string()
		.min(FUNCTION_NAME_MIN)
		.max(FUNCTION_NAME_MAX)
		.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Function name must be a valid Python identifier'),
	test_cases: z
		.array(unitTestCaseSchema)
		.min(TEST_CASES_MIN)
		.max(TEST_CASES_MAX)
		.refine((cases) => cases.some((tc) => !tc.hidden), AT_LEAST_ONE_VISIBLE)
		.describe('Unit test cases'),
	tolerance: unitTestToleranceSchema
		.optional()
		.describe(
			'Optional numeric tolerance for float comparisons (use for transcendentals: math.exp, math.log, ...)'
		)
});

const PY_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const EXPECTED_VARS_MAX = 50;

const expectedVarsSchema = z
	.record(z.string(), z.unknown())
	.refine((obj) => Object.keys(obj).length >= 1, {
		message: 'Au moins une variable doit être vérifiée'
	})
	.refine((obj) => Object.keys(obj).length <= EXPECTED_VARS_MAX, {
		message: `Maximum ${EXPECTED_VARS_MAX} variables`
	})
	.refine((obj) => Object.keys(obj).every((k) => PY_IDENTIFIER_RE.test(k)), {
		message: 'Nom de variable Python invalide'
	});

const behaviorVariableCheckSchema = z.object({
	kind: z.literal('variable_check'),
	expected_vars: expectedVarsSchema.describe(
		'Map of variable name → expected JSON value (None=null). Type-strict for scalars.'
	),
	tolerance: unitTestToleranceSchema
		.optional()
		.describe('Optional numeric tolerance for float comparisons.')
});

const REFERENCE_CODE_MAX = 5000;
const GENERATOR_CODE_MAX = 1000;
const REFERENCE_FIXED_CASES_MAX = 50;
const REFERENCE_GENERATOR_COUNT_MAX = 200;

const behaviorReferenceSolutionSchema = z.object({
	kind: z.literal('reference_solution'),
	function_name: z
		.string()
		.min(FUNCTION_NAME_MIN)
		.max(FUNCTION_NAME_MAX)
		.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Function name must be a valid Python identifier'),
	reference_code: z
		.string()
		.min(1)
		.max(REFERENCE_CODE_MAX)
		.describe('Python source defining the hidden teacher solution.'),
	fixed: z
		.object({
			cases: z
				.array(unitTestCaseSchema)
				.min(1)
				.max(REFERENCE_FIXED_CASES_MAX)
				.refine((cases) => cases.some((tc) => !tc.hidden), AT_LEAST_ONE_VISIBLE)
		})
		.optional()
		.describe('Hardcoded sentinel cases (teacher-supplied expected values).'),
	generator: z
		.object({
			code: z.string().min(1).max(GENERATOR_CODE_MAX),
			count: z.number().int().min(1).max(REFERENCE_GENERATOR_COUNT_MAX),
			seed: z.number().int()
		})
		.optional()
		.describe('Python expression returning a tuple of args; called `count` times with seeded RNG.'),
	tolerance: unitTestToleranceSchema.optional()
});

// discriminatedUnion does not accept refined sub-schemas; the "at least
// one of fixed/generator" rule for reference_solution is enforced at
// the union level (no-op for other variants).
export const behaviorCheckSchema = z
	.discriminatedUnion('kind', [
		behaviorOutputSchema,
		behaviorUnitTestSchema,
		behaviorVariableCheckSchema,
		behaviorReferenceSolutionSchema
	])
	.refine(
		(b) => b.kind !== 'reference_solution' || b.fixed !== undefined || b.generator !== undefined,
		{ message: 'Au moins une stratégie (cas fixes ou générateur) doit être configurée' }
	);

export const validationConfigSchema = z
	.object({
		ast_requirements: z
			.array(astRequirementSchema)
			.min(REQUIREMENTS_MIN)
			.max(REQUIREMENTS_MAX)
			.optional()
			.describe('Structural AST checks (uses_loop, defines_function, …)'),
		behavior: behaviorCheckSchema
			.optional()
			.describe('Runtime behavior verified on submitted code (output or unit_test)'),
		timeout_ms: z.number().int().min(TIMEOUT_MIN).max(TIMEOUT_MAX).optional().default(5000)
	})
	.refine((cfg) => Boolean(cfg.ast_requirements?.length) || cfg.behavior !== undefined, {
		message: AT_LEAST_ONE_LAYER
	});

const failedLayerSchema = z.union([z.literal('ast'), z.literal('behavior'), z.null()]);
const behaviorKindSchema = z.enum(['output', 'unit_test', 'variable_check', 'reference_solution']);

export const validationResultSchema = z.object({
	valid: z.boolean(),
	failed_layer: failedLayerSchema,
	behavior_kind: behaviorKindSchema.optional(),
	ast_issues: z.array(z.string().max(AST_ISSUE_LENGTH_MAX)).max(AST_ISSUES_MAX).optional(),
	test_results: z.array(testCaseResultSchema).max(TEST_CASES_MAX),
	error: z.string().max(RESULT_ERROR_MAX).optional(),
	execution_time_ms: z.number().int().min(0)
});

// Class level
const exerciseLevelSchema = z.enum(['college', 'lycee', 'nsi', 'etudiant']);

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
	level: exerciseLevelSchema.describe('Class level: college, lycee, nsi, etudiant'),
	tags: z
		.array(z.string().min(1).max(50))
		.max(TAGS_MAX)
		.default([])
		.describe('Exercise tags (max 10)'),
	source: z
		.string()
		.max(SOURCE_MAX)
		.nullable()
		.optional()
		.describe('Free-text source of the exercise (e.g. "Bac Polynésie 09/2024")'),
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
	level: exerciseLevelSchema.optional(),
	tags: z.array(z.string().min(1).max(50)).max(TAGS_MAX).optional(),
	source: z.string().max(SOURCE_MAX).nullable().optional(),
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
	level: exerciseLevelSchema.optional(),
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

// =============================================================================
// Mastery query params
// =============================================================================

const MASTERY_LIMIT_MIN = 1;
const MASTERY_LIMIT_MAX = 500;
const MASTERY_LIMIT_DEFAULT = 100;

export const pythonMasteryQuerySchema = z.object({
	student_id: uuidSchema.optional(),
	limit: z.coerce
		.number()
		.int()
		.min(MASTERY_LIMIT_MIN)
		.max(MASTERY_LIMIT_MAX)
		.optional()
		.default(MASTERY_LIMIT_DEFAULT)
});

export const pythonMasterySingleQuerySchema = z.object({
	student_id: uuidSchema.optional()
});

// Type exports for use in route handlers
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type AssignExerciseInput = z.infer<typeof assignExerciseSchema>;
export type SubmitExerciseInput = z.infer<typeof submitExerciseSchema>;
export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
export type ExerciseIdParam = z.infer<typeof exerciseIdParamSchema>;
