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
	validateMessageSchema
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
	validationResultMessageSchema
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
export type ToWorkerMessageSchema = z.infer<typeof toWorkerMessageSchema>;

export type LoadingProgressMessageSchema = z.infer<typeof loadingProgressMessageSchema>;
export type ValidationConfigSchema = z.infer<typeof validationConfigSchema>;
export type ValidationIssueSchema = z.infer<typeof validationIssueSchema>;
export type ValidationResultSchema = z.infer<typeof validationResultSchema>;
export type ValidationResultMessageSchema = z.infer<typeof validationResultMessageSchema>;
export type FromWorkerMessageSchema = z.infer<typeof fromWorkerMessageSchema>;
