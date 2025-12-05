/**
 * Shared Validation Schemas
 *
 * Zod schemas for validating Python-related data structures
 * used across the application (API endpoints, form submissions, etc.)
 */

import { z } from 'zod';
import { PYODIDE_CONFIG } from '../config';

// =============================================================================
// Code Validation Schemas
// =============================================================================

/**
 * Python code schema with configurable limits
 */
export const pythonCodeSchema = z
	.string()
	.min(1, 'Le code ne peut pas etre vide')
	.max(
		PYODIDE_CONFIG.MAX_CODE_LENGTH,
		`Le code depasse la limite de ${PYODIDE_CONFIG.MAX_CODE_LENGTH} caracteres`
	);

/**
 * Optional Python code schema (for empty cells)
 */
export const optionalPythonCodeSchema = z
	.string()
	.max(
		PYODIDE_CONFIG.MAX_CODE_LENGTH,
		`Le code depasse la limite de ${PYODIDE_CONFIG.MAX_CODE_LENGTH} caracteres`
	);

// =============================================================================
// Context Schemas
// =============================================================================

/**
 * Context ID schema
 */
export const contextIdSchema = z
	.string()
	.min(1, 'Context ID requis')
	.max(100, 'Context ID trop long')
	.regex(/^[a-zA-Z0-9_-]+$/, 'Context ID doit etre alphanumerique');

/**
 * Context type schema
 */
export const contextTypeSchema = z.enum(['playground', 'notebook']);

/**
 * Create context request schema
 */
export const createContextRequestSchema = z.object({
	contextId: contextIdSchema,
	type: contextTypeSchema,
	persistent: z.boolean().default(false)
});

// =============================================================================
// Execution Schemas
// =============================================================================

/**
 * Execution ID schema
 */
export const executionIdSchema = z
	.string()
	.min(1, 'Execution ID requis')
	.max(100, 'Execution ID trop long')
	.regex(/^[a-zA-Z0-9_-]+$/, 'Execution ID doit etre alphanumerique');

/**
 * Execute code request schema
 */
export const executeCodeRequestSchema = z.object({
	code: pythonCodeSchema,
	contextId: contextIdSchema.optional(),
	timeout: z.number().int().min(1000).max(300_000).optional()
});

/**
 * Execution status schema
 */
export const executionStatusSchema = z.enum([
	'idle',
	'running',
	'completed',
	'error',
	'timeout',
	'cancelled'
]);

// =============================================================================
// Notebook Schemas
// =============================================================================

/**
 * Cell ID schema
 */
export const cellIdSchema = z
	.string()
	.min(1, 'Cell ID requis')
	.max(100, 'Cell ID trop long')
	.regex(/^[a-zA-Z0-9_-]+$/, 'Cell ID doit etre alphanumerique');

/**
 * Cell type schema
 */
export const cellTypeSchema = z.enum(['code', 'markdown']);

/**
 * Notebook cell schema
 */
export const notebookCellSchema = z.object({
	id: cellIdSchema,
	type: cellTypeSchema,
	content: optionalPythonCodeSchema
});

/**
 * Notebook metadata schema
 */
export const notebookMetadataSchema = z.object({
	title: z.string().min(1, 'Titre requis').max(200, 'Titre trop long'),
	description: z.string().max(1000, 'Description trop longue').optional(),
	tags: z.array(z.string().max(50)).max(20).optional()
});

/**
 * Create notebook request schema
 */
export const createNotebookRequestSchema = z.object({
	metadata: notebookMetadataSchema,
	cells: z.array(notebookCellSchema).max(100, 'Trop de cellules (maximum 100)')
});

/**
 * Update notebook request schema
 */
export const updateNotebookRequestSchema = z.object({
	id: z.string().uuid('ID de notebook invalide'),
	metadata: notebookMetadataSchema.partial().optional(),
	cells: z.array(notebookCellSchema).max(100, 'Trop de cellules (maximum 100)').optional()
});

// =============================================================================
// Validation Config Schemas
// =============================================================================

/**
 * Validation severity schema
 */
export const validationSeveritySchema = z.enum(['error', 'warning', 'info']);

/**
 * Validation config schema
 */
export const validationConfigSchema = z.object({
	checkSyntax: z.boolean().default(true),
	checkUndefined: z.boolean().default(false),
	checkUnusedImports: z.boolean().default(false),
	maxCodeLength: z.number().int().min(1).max(1_000_000).default(PYODIDE_CONFIG.MAX_CODE_LENGTH),
	maxLines: z.number().int().min(1).max(50_000).default(PYODIDE_CONFIG.MAX_LINES),
	forbiddenPatterns: z.array(z.string().max(1000)).max(100).optional()
});

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
 * Validate code request schema
 */
export const validateCodeRequestSchema = z.object({
	code: pythonCodeSchema,
	config: validationConfigSchema.optional()
});

// =============================================================================
// API Response Schemas
// =============================================================================

/**
 * Output type schema
 */
export const outputTypeSchema = z.enum(['stdout', 'stderr', 'plot', 'latex', 'plotly', 'error']);

/**
 * Output item schema
 */
export const outputItemSchema = z.object({
	type: outputTypeSchema,
	content: z.string(),
	timestamp: z.number()
});

/**
 * Execution result schema
 */
export const executionResultSchema = z.object({
	id: executionIdSchema,
	status: executionStatusSchema,
	outputs: z.array(outputItemSchema),
	duration: z.number().min(0),
	startTime: z.number(),
	endTime: z.number().optional(),
	errorLine: z.number().int().min(1).optional(),
	contextId: contextIdSchema.optional()
});

// =============================================================================
// Type Exports
// =============================================================================

export type PythonCode = z.infer<typeof pythonCodeSchema>;
export type ContextId = z.infer<typeof contextIdSchema>;
export type ContextType = z.infer<typeof contextTypeSchema>;
export type CreateContextRequest = z.infer<typeof createContextRequestSchema>;
export type ExecuteCodeRequest = z.infer<typeof executeCodeRequestSchema>;
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
export type CellId = z.infer<typeof cellIdSchema>;
export type CellType = z.infer<typeof cellTypeSchema>;
export type NotebookCell = z.infer<typeof notebookCellSchema>;
export type NotebookMetadata = z.infer<typeof notebookMetadataSchema>;
export type CreateNotebookRequest = z.infer<typeof createNotebookRequestSchema>;
export type UpdateNotebookRequest = z.infer<typeof updateNotebookRequestSchema>;
export type ValidationSeverity = z.infer<typeof validationSeveritySchema>;
export type ValidationConfig = z.infer<typeof validationConfigSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ValidateCodeRequest = z.infer<typeof validateCodeRequestSchema>;
export type OutputType = z.infer<typeof outputTypeSchema>;
export type OutputItem = z.infer<typeof outputItemSchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;
