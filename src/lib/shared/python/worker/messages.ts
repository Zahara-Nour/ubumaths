/**
 * Worker Message Zod Schemas
 *
 * Validation schemas for messages sent to/from the Python worker.
 * Used for runtime validation of worker communication.
 */

import { z } from 'zod';

// =============================================================================
// Base Schemas
// =============================================================================

/**
 * Execution ID schema - non-empty string identifier
 */
export const executionIdSchema = z.string().min(1).max(100);

/**
 * Context ID schema - alphanumeric with underscores
 */
export const contextIdSchema = z
	.string()
	.min(1)
	.max(100)
	.regex(/^[a-zA-Z0-9_-]+$/, 'Context ID must be alphanumeric with underscores or hyphens');

/**
 * Code schema with length limits
 */
export const codeSchema = z
	.string()
	.max(100_000, 'Code exceeds maximum length of 100,000 characters');

/**
 * Cursor position schema
 */
export const cursorSchema = z.number().int().min(0).max(100_000);

/**
 * Line number schema (1-based)
 */
export const lineNumberSchema = z.number().int().min(1).max(50_000);

// =============================================================================
// Debug Schemas
// =============================================================================

/**
 * Debug step action schema
 */
export const debugStepActionSchema = z.enum([
	'step',
	'step-over',
	'step-out',
	'continue',
	'run-to-end'
]);

/**
 * Debug trace event schema
 */
export const debugTraceEventSchema = z.enum(['line', 'call', 'return', 'exception']);

/**
 * Debug pause reason schema
 */
export const debugPauseReasonSchema = z.enum(['breakpoint', 'step', 'exception', 'start']);

/**
 * Worker breakpoint schema (for communication)
 */
export const workerBreakpointSchema = z.object({
	lineNumber: lineNumberSchema,
	enabled: z.boolean(),
	condition: z.string().max(500).optional()
});

/**
 * Debug variable schema
 */
export const debugVariableSchema = z.object({
	name: z.string().min(1).max(200),
	value: z.string().max(10_000),
	type: z.string().min(1).max(100),
	isBuiltin: z.boolean(),
	isChanged: z.boolean(),
	isNew: z.boolean().optional(),
	objectId: z.string().max(100).optional()
});

/**
 * Debug stack frame schema
 */
export const debugStackFrameSchema = z.object({
	functionName: z.string().min(1).max(200),
	filename: z.string().min(1).max(500),
	lineNumber: lineNumberSchema,
	locals: z.array(debugVariableSchema).max(500),
	isCurrentFrame: z.boolean()
});

/**
 * Debug loop info schema
 */
export const debugLoopInfoSchema = z.object({
	loopId: z.string().min(1).max(100),
	iterationCount: z.number().int().min(1),
	maxIterations: z.number().int().min(1).optional(),
	loopType: z.enum(['for', 'while']),
	lineNumber: lineNumberSchema
});

// =============================================================================
// Heap schemas (Python Tutor-style visualization)
// =============================================================================

/**
 * Inline primitive value (stays inside its parent — variable or HeapEntry)
 */
export const inlineValueSchema = z.object({
	type: z.enum(['int', 'float', 'str', 'bool', 'NoneType', 'complex', 'bytes']),
	value: z.string().max(10_000)
});

/**
 * Reference from a variable / HeapEntry to a HeapObject
 */
export const heapRefSchema = z.object({
	type: z.literal('ref'),
	objectId: z.string().min(1).max(100)
});

/**
 * Marker for content truncated due to depth/items/string limits
 */
export const truncatedValueSchema = z.object({
	type: z.literal('truncated'),
	value: z.string().max(200)
});

/**
 * One entry inside a HeapObject (list item, dict entry, instance attr, …)
 */
export const heapEntrySchema = z.object({
	key: z.string().max(500).optional(),
	value: z.union([inlineValueSchema, heapRefSchema, truncatedValueSchema])
});

/**
 * Heap object: container or user-class instance.
 * `type` is one of 'list' | 'dict' | 'set' | 'tuple' | 'frozenset'
 * or 'instance:<ClassName>' for user-defined classes.
 */
export const heapObjectSchema = z.object({
	id: z.string().min(1).max(100),
	type: z
		.string()
		.min(1)
		.max(200)
		.regex(/^(list|dict|set|tuple|frozenset|instance:[\w.]{1,150})$/, {
			message: 'type must be a container or instance:<ClassName>'
		}),
	length: z.number().int().min(0).max(1_000_000),
	entries: z.array(heapEntrySchema).max(1000)
});

/**
 * Debug snapshot schema
 */
export const debugSnapshotSchema = z.object({
	id: z.string().min(1).max(100),
	lineNumber: lineNumberSchema,
	timestamp: z.number().min(0),
	callStack: z.array(debugStackFrameSchema).min(1).max(100),
	globals: z.array(debugVariableSchema).max(500),
	loops: z.array(debugLoopInfoSchema).max(20),
	stdout: z.string().max(100_000),
	event: debugTraceEventSchema,
	heap: z.array(heapObjectSchema).max(2000)
});

// =============================================================================
// Messages: Main Thread -> Worker
// =============================================================================

/**
 * Init message schema
 */
export const initMessageSchema = z.object({
	type: z.literal('init')
});

/**
 * Execute message schema
 */
export const executeMessageSchema = z.object({
	type: z.literal('execute'),
	code: codeSchema,
	id: executionIdSchema,
	contextId: contextIdSchema.optional()
});

/**
 * Cancel message schema
 */
export const cancelMessageSchema = z.object({
	type: z.literal('cancel'),
	id: executionIdSchema
});

/**
 * Autocomplete message schema
 */
export const autocompleteMessageSchema = z.object({
	type: z.literal('autocomplete'),
	code: codeSchema,
	cursor: cursorSchema,
	id: executionIdSchema,
	contextId: contextIdSchema.optional()
});

/**
 * Create context message schema
 */
export const createContextMessageSchema = z.object({
	type: z.literal('create-context'),
	contextId: contextIdSchema,
	persistent: z.boolean()
});

/**
 * Destroy context message schema
 */
export const destroyContextMessageSchema = z.object({
	type: z.literal('destroy-context'),
	contextId: contextIdSchema
});

/**
 * Reset context message schema
 */
export const resetContextMessageSchema = z.object({
	type: z.literal('reset-context'),
	contextId: contextIdSchema
});

/**
 * Validation config schema
 */
export const validationConfigSchema = z.object({
	checkSyntax: z.boolean(),
	checkUndefined: z.boolean(),
	checkUnusedImports: z.boolean(),
	maxCodeLength: z.number().int().min(1).max(1_000_000),
	maxLines: z.number().int().min(1).max(50_000),
	forbiddenPatterns: z.array(z.string().max(1000)).max(100).optional()
});

/**
 * Validate message schema
 */
export const validateMessageSchema = z.object({
	type: z.literal('validate'),
	code: codeSchema,
	config: validationConfigSchema,
	id: executionIdSchema
});

// =============================================================================
// Exercise Validation Schemas (Output, Unit Test, AST)
// =============================================================================

/**
 * Output comparison — discriminated union (exact / text / numeric).
 * See `src/lib/types/python-exercises.ts` for the API surface and
 * `src/lib/shared/python/validation/output-compare.ts` for the engine.
 */
const epsilonSchema = z.number().min(0).max(1).finite();

export const exactComparisonSchema = z.object({
	kind: z.literal('exact')
});

export const textComparisonSchema = z.object({
	kind: z.literal('text'),
	whitespace: z.enum(['strict', 'collapsed', 'lines']),
	case_insensitive: z.boolean().optional().default(false),
	trim_trailing_newline: z.boolean().optional().default(true)
});

export const numericComparisonSchema = z.object({
	kind: z.literal('numeric'),
	shape: z.enum(['flat', 'lines', 'grid']),
	eps_abs: epsilonSchema,
	eps_rel: epsilonSchema,
	non_numeric: z.enum(['match', 'ignore']).optional().default('match'),
	accept_comma_decimal: z.boolean().optional().default(false)
});

export const customComparisonSchema = z.object({
	kind: z.literal('custom'),
	code: z.string().min(1).max(10_000),
	timeout_ms: z.number().int().min(100).max(10_000).optional().default(2000)
});

export const outputComparisonSchema = z.discriminatedUnion('kind', [
	exactComparisonSchema,
	textComparisonSchema,
	numericComparisonSchema,
	customComparisonSchema
]);

/**
 * Output test case schema
 */
export const outputTestCaseSchema = z.object({
	input: z.string().max(100_000),
	expected_output: z.string().max(100_000),
	comparison: outputComparisonSchema.optional(),
	hidden: z.boolean().optional().default(false)
});

const AT_LEAST_ONE_VISIBLE = 'Au moins un test doit être visible';

/**
 * Unit test case schema
 */
export const unitTestCaseSchema = z.object({
	args: z.array(z.unknown()).max(20),
	expected: z.unknown(),
	hidden: z.boolean().optional().default(false)
});

/**
 * AST requirement type schema
 */
export const astRequirementTypeSchema = z.enum([
	'uses_loop',
	'uses_recursion',
	'defines_function',
	'defines_class',
	'uses_list_comprehension',
	'no_global_variables',
	'no_print',
	'uses_import'
]);

/**
 * AST requirement schema
 */
export const astRequirementSchema = z.object({
	type: astRequirementTypeSchema,
	name: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Name must be a valid Python identifier')
		.optional(),
	message: z.string().min(1).max(500)
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
		.min(1)
		.max(50)
		.refine((cases) => cases.some((tc) => !tc.hidden), AT_LEAST_ONE_VISIBLE),
	comparison: outputComparisonSchema
});

const unitTestToleranceSchema = z.object({
	eps_abs: epsilonSchema,
	eps_rel: epsilonSchema
});

const behaviorUnitTestSchema = z.object({
	kind: z.literal('unit_test'),
	function_name: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Function name must be a valid Python identifier'),
	test_cases: z
		.array(unitTestCaseSchema)
		.min(1)
		.max(50)
		.refine((cases) => cases.some((tc) => !tc.hidden), AT_LEAST_ONE_VISIBLE),
	tolerance: unitTestToleranceSchema.optional()
});

const PY_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * `expected_vars` — non-empty record keyed by Python identifiers. Values are
 * arbitrary JSON (the recursive comparator in `variable-compare.ts` walks
 * them on its own).
 */
const expectedVarsSchema = z
	.record(z.string(), z.unknown())
	.refine((obj) => Object.keys(obj).length >= 1, {
		message: 'Au moins une variable doit être vérifiée'
	})
	.refine((obj) => Object.keys(obj).length <= 50, {
		message: 'Maximum 50 variables'
	})
	.refine((obj) => Object.keys(obj).every((k) => PY_IDENTIFIER_RE.test(k)), {
		message: 'Nom de variable Python invalide'
	});

const behaviorVariableCheckSchema = z.object({
	kind: z.literal('variable_check'),
	expected_vars: expectedVarsSchema,
	tolerance: unitTestToleranceSchema.optional()
});

const REFERENCE_CODE_MAX = 5000;
const GENERATOR_CODE_MAX = 1000;
const REFERENCE_FIXED_CASES_MAX = 50;
const REFERENCE_GENERATOR_COUNT_MAX = 200;

const behaviorReferenceSolutionSchema = z.object({
	kind: z.literal('reference_solution'),
	function_name: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Function name must be a valid Python identifier'),
	reference_code: z.string().min(1).max(REFERENCE_CODE_MAX),
	fixed: z
		.object({
			cases: z
				.array(unitTestCaseSchema)
				.min(1)
				.max(REFERENCE_FIXED_CASES_MAX)
				.refine((cases) => cases.some((tc) => !tc.hidden), AT_LEAST_ONE_VISIBLE)
		})
		.optional(),
	generator: z
		.object({
			code: z.string().min(1).max(GENERATOR_CODE_MAX),
			count: z.number().int().min(1).max(REFERENCE_GENERATOR_COUNT_MAX),
			seed: z.number().int()
		})
		.optional(),
	tolerance: unitTestToleranceSchema.optional()
});

// discriminatedUnion does not accept `.refine()`-wrapped sub-schemas. The
// "at least one of fixed/generator" rule for `reference_solution` is
// therefore enforced at the union level (no-op for the other variants).
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

/**
 * Exercise validation config — new shape with orthogonal AST + behavior layers.
 * At least one of `ast_requirements` (non-empty) and `behavior` is required.
 */
export const exerciseValidationConfigSchema = z
	.object({
		ast_requirements: z.array(astRequirementSchema).min(1).max(20).optional(),
		behavior: behaviorCheckSchema.optional(),
		timeout_ms: z.number().int().min(100).max(60_000).optional().default(5000)
	})
	.refine((cfg) => Boolean(cfg.ast_requirements?.length) || cfg.behavior !== undefined, {
		message: AT_LEAST_ONE_LAYER
	});

/**
 * Validate exercise message schema.
 */
export const validateExerciseMessageSchema = z.object({
	type: z.literal('validate-exercise'),
	code: codeSchema,
	config: exerciseValidationConfigSchema,
	id: executionIdSchema
});

// =============================================================================
// Debug Messages: Main Thread -> Worker
// =============================================================================

/**
 * Debug start message schema
 * Starts a debug session with optional breakpoints
 */
export const debugStartMessageSchema = z.object({
	type: z.literal('debug-start'),
	code: codeSchema,
	id: executionIdSchema,
	breakpoints: z.array(workerBreakpointSchema).max(100)
});

/**
 * Debug step message schema
 * Sends a step command during debug session
 */
export const debugStepMessageSchema = z.object({
	type: z.literal('debug-step'),
	id: executionIdSchema,
	action: debugStepActionSchema
});

/**
 * Debug stop message schema
 * Stops the current debug session
 */
export const debugStopMessageSchema = z.object({
	type: z.literal('debug-stop'),
	id: executionIdSchema
});

/**
 * Union schema for all messages sent to the worker
 */
export const toWorkerMessageSchema = z.discriminatedUnion('type', [
	initMessageSchema,
	executeMessageSchema,
	cancelMessageSchema,
	autocompleteMessageSchema,
	createContextMessageSchema,
	destroyContextMessageSchema,
	resetContextMessageSchema,
	validateMessageSchema,
	validateExerciseMessageSchema,
	debugStartMessageSchema,
	debugStepMessageSchema,
	debugStopMessageSchema
]);

// =============================================================================
// Messages: Worker -> Main Thread
// =============================================================================

/**
 * Loading progress message schema
 */
export const loadingProgressMessageSchema = z.object({
	type: z.literal('loading-progress'),
	percent: z.number().min(0).max(100),
	stage: z.string().max(200)
});

/**
 * Pyodide ready message schema
 */
export const pyodideReadyMessageSchema = z.object({
	type: z.literal('pyodide-ready')
});

/**
 * Stdout message schema
 */
export const stdoutMessageSchema = z.object({
	type: z.literal('stdout'),
	data: z.string(),
	id: executionIdSchema
});

/**
 * Stderr message schema
 */
export const stderrMessageSchema = z.object({
	type: z.literal('stderr'),
	data: z.string(),
	id: executionIdSchema
});

/**
 * Plot message schema
 */
export const plotMessageSchema = z.object({
	type: z.literal('plot'),
	imageData: z.string(),
	id: executionIdSchema
});

/**
 * Error message schema
 * Note: id can be empty string for init/loading errors
 */
export const errorMessageSchema = z.object({
	type: z.literal('error'),
	message: z.string(),
	line: z.number().int().min(1).optional(),
	id: z.string().max(100) // Allow empty id for init errors
});

/**
 * Complete message schema
 */
export const completeMessageSchema = z.object({
	type: z.literal('complete'),
	id: executionIdSchema,
	duration: z.number().min(0).max(300_000)
});

/**
 * Timeout message schema
 */
export const timeoutMessageSchema = z.object({
	type: z.literal('timeout'),
	id: executionIdSchema
});

/**
 * LaTeX message schema
 */
export const latexMessageSchema = z.object({
	type: z.literal('latex'),
	latex: z.string(),
	id: executionIdSchema
});

/**
 * Completion item schema
 */
export const completionItemSchema = z.object({
	label: z.string().max(200),
	type: z.enum(['function', 'variable', 'module', 'class', 'property', 'keyword'])
});

/**
 * Autocomplete result message schema
 */
export const autocompleteResultMessageSchema = z.object({
	type: z.literal('autocomplete-result'),
	completions: z.array(completionItemSchema).max(1000),
	id: executionIdSchema
});

/**
 * Packages loading message schema
 */
export const packagesLoadingMessageSchema = z.object({
	type: z.literal('packages-loading'),
	packages: z.array(z.string().max(100)).max(50),
	id: executionIdSchema
});

/**
 * Packages loaded message schema
 */
export const packagesLoadedMessageSchema = z.object({
	type: z.literal('packages-loaded'),
	packages: z.array(z.string().max(100)).max(50),
	id: executionIdSchema
});

/**
 * Plotly message schema
 */
export const plotlyMessageSchema = z.object({
	type: z.literal('plotly'),
	jsonSpec: z.string(),
	id: executionIdSchema
});

/**
 * Context created message schema
 */
export const contextCreatedMessageSchema = z.object({
	type: z.literal('context-created'),
	contextId: contextIdSchema
});

/**
 * Context destroyed message schema
 */
export const contextDestroyedMessageSchema = z.object({
	type: z.literal('context-destroyed'),
	contextId: contextIdSchema
});

/**
 * Context reset message schema
 */
export const contextResetMessageSchema = z.object({
	type: z.literal('context-reset'),
	contextId: contextIdSchema
});

/**
 * Validation severity schema
 */
export const validationSeveritySchema = z.enum(['error', 'warning', 'info']);

/**
 * Validation issue schema
 */
export const validationIssueSchema = z.object({
	line: z.number().int().min(1),
	column: z.number().int().min(0),
	endLine: z.number().int().min(1).optional(),
	endColumn: z.number().int().min(0).optional(),
	message: z.string().max(500),
	severity: validationSeveritySchema,
	rule: z.string().max(100)
});

/**
 * Validation result schema
 */
export const validationResultSchema = z.object({
	valid: z.boolean(),
	issues: z.array(validationIssueSchema).max(1000),
	hasAst: z.boolean()
});

/**
 * Validation result message schema
 */
export const validationResultMessageSchema = z.object({
	type: z.literal('validation-result'),
	result: validationResultSchema,
	id: executionIdSchema
});

/**
 * Test case result schema (for exercise validation)
 */
export const testCaseResultSchema = z.object({
	passed: z.boolean(),
	input: z.string().optional(),
	expected: z.string().optional(),
	actual: z.string().optional(),
	diff: z.string().optional(),
	error: z.string().optional(),
	hidden: z.boolean().optional()
});

/**
 * Exercise validation result schema. `failed_layer` indicates which
 * orthogonal axis (ast / behavior) failed (or null on success).
 */
export const failedLayerSchema = z.union([z.literal('ast'), z.literal('behavior'), z.null()]);

export const behaviorKindSchema = z.enum([
	'output',
	'unit_test',
	'variable_check',
	'reference_solution'
]);

export const exerciseValidationResultSchema = z.object({
	valid: z.boolean(),
	failed_layer: failedLayerSchema,
	behavior_kind: behaviorKindSchema.optional(),
	ast_issues: z.array(z.string()).optional(),
	test_results: z.array(testCaseResultSchema),
	error: z.string().optional(),
	execution_time_ms: z.number().int().min(0)
});

/**
 * Exercise validation result message schema.
 */
export const exerciseValidationResultMessageSchema = z.object({
	type: z.literal('validation-exercise-result'),
	result: exerciseValidationResultSchema,
	id: executionIdSchema
});

// =============================================================================
// Debug Messages: Worker -> Main Thread
// =============================================================================

/**
 * Debug snapshot message schema
 * Sent when execution pauses (at breakpoint, after step, etc.)
 */
export const debugSnapshotMessageSchema = z.object({
	type: z.literal('debug-snapshot'),
	id: executionIdSchema,
	snapshot: debugSnapshotSchema
});

/**
 * Debug paused message schema
 * Indicates why execution paused
 */
export const debugPausedMessageSchema = z.object({
	type: z.literal('debug-paused'),
	id: executionIdSchema,
	reason: debugPauseReasonSchema
});

/**
 * Debug finished message schema
 * Sent when debug session completes
 */
export const debugFinishedMessageSchema = z.object({
	type: z.literal('debug-finished'),
	id: executionIdSchema,
	duration: z.number().min(0).max(300_000)
});

/**
 * Union schema for all messages sent from the worker
 */
export const fromWorkerMessageSchema = z.discriminatedUnion('type', [
	loadingProgressMessageSchema,
	pyodideReadyMessageSchema,
	stdoutMessageSchema,
	stderrMessageSchema,
	plotMessageSchema,
	errorMessageSchema,
	completeMessageSchema,
	timeoutMessageSchema,
	latexMessageSchema,
	autocompleteResultMessageSchema,
	packagesLoadingMessageSchema,
	packagesLoadedMessageSchema,
	plotlyMessageSchema,
	contextCreatedMessageSchema,
	contextDestroyedMessageSchema,
	contextResetMessageSchema,
	validationResultMessageSchema,
	exerciseValidationResultMessageSchema,
	debugSnapshotMessageSchema,
	debugPausedMessageSchema,
	debugFinishedMessageSchema
]);

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type InitMessageSchema = z.infer<typeof initMessageSchema>;
export type ExecuteMessageSchema = z.infer<typeof executeMessageSchema>;
export type CancelMessageSchema = z.infer<typeof cancelMessageSchema>;
export type AutocompleteMessageSchema = z.infer<typeof autocompleteMessageSchema>;
export type CreateContextMessageSchema = z.infer<typeof createContextMessageSchema>;
export type DestroyContextMessageSchema = z.infer<typeof destroyContextMessageSchema>;
export type ResetContextMessageSchema = z.infer<typeof resetContextMessageSchema>;
export type ValidateMessageSchema = z.infer<typeof validateMessageSchema>;
export type ValidateExerciseMessageSchema = z.infer<typeof validateExerciseMessageSchema>;
export type ToWorkerMessageSchema = z.infer<typeof toWorkerMessageSchema>;

export type LoadingProgressMessageSchema = z.infer<typeof loadingProgressMessageSchema>;
export type ValidationConfigSchema = z.infer<typeof validationConfigSchema>;
export type ValidationIssueSchema = z.infer<typeof validationIssueSchema>;
export type ValidationResultSchema = z.infer<typeof validationResultSchema>;
export type ValidationResultMessageSchema = z.infer<typeof validationResultMessageSchema>;
export type OutputTestCaseSchema = z.infer<typeof outputTestCaseSchema>;
export type UnitTestCaseSchema = z.infer<typeof unitTestCaseSchema>;
export type ASTRequirementTypeSchema = z.infer<typeof astRequirementTypeSchema>;
export type ASTRequirementSchema = z.infer<typeof astRequirementSchema>;
export type BehaviorCheckSchema = z.infer<typeof behaviorCheckSchema>;
export type ExerciseValidationConfigSchema = z.infer<typeof exerciseValidationConfigSchema>;
export type TestCaseResultSchema = z.infer<typeof testCaseResultSchema>;
export type ExerciseValidationResultSchema = z.infer<typeof exerciseValidationResultSchema>;
export type ExerciseValidationResultMessageSchema = z.infer<
	typeof exerciseValidationResultMessageSchema
>;
export type FromWorkerMessageSchema = z.infer<typeof fromWorkerMessageSchema>;

// Debug types
export type DebugStepActionSchema = z.infer<typeof debugStepActionSchema>;
export type DebugTraceEventSchema = z.infer<typeof debugTraceEventSchema>;
export type DebugPauseReasonSchema = z.infer<typeof debugPauseReasonSchema>;
export type WorkerBreakpointSchema = z.infer<typeof workerBreakpointSchema>;
export type DebugVariableSchema = z.infer<typeof debugVariableSchema>;
export type DebugStackFrameSchema = z.infer<typeof debugStackFrameSchema>;
export type DebugLoopInfoSchema = z.infer<typeof debugLoopInfoSchema>;
export type DebugSnapshotSchema = z.infer<typeof debugSnapshotSchema>;
export type DebugStartMessageSchema = z.infer<typeof debugStartMessageSchema>;
export type DebugStepMessageSchema = z.infer<typeof debugStepMessageSchema>;
export type DebugStopMessageSchema = z.infer<typeof debugStopMessageSchema>;
export type DebugSnapshotMessageSchema = z.infer<typeof debugSnapshotMessageSchema>;
export type DebugPausedMessageSchema = z.infer<typeof debugPausedMessageSchema>;
export type DebugFinishedMessageSchema = z.infer<typeof debugFinishedMessageSchema>;
