/**
 * JavaScript Worker Zod Schemas
 *
 * Validation schemas for messages sent to/from the JavaScript worker.
 * Used for runtime validation of worker communication.
 */

import { z } from 'zod';

// =============================================================================
// Base Schemas
// =============================================================================

/**
 * Execution ID schema - non-empty string identifier
 */
export const executionIdSchema = z
	.string()
	.min(1, 'Execution ID must not be empty')
	.max(100, 'Execution ID must not exceed 100 characters');

/**
 * JavaScript code schema with length limits
 * Blockly-generated code should typically be much smaller,
 * but we allow up to 100KB for complex programs
 */
export const jsCodeSchema = z
	.string()
	.max(100_000, 'JavaScript code exceeds maximum length of 100,000 characters');

/**
 * Console output data schema
 */
export const consoleDataSchema = z.string().max(100_000, 'Console output exceeds maximum length');

/**
 * Error message schema
 */
export const errorMessageTextSchema = z
	.string()
	.max(10_000, 'Error message exceeds maximum length');

/**
 * Line number schema (1-indexed)
 */
export const lineNumberSchema = z.number().int().min(1).max(100_000);

/**
 * Duration schema in milliseconds
 */
export const durationMsSchema = z.number().min(0).max(300_000);

// =============================================================================
// Messages: Main Thread -> Worker
// =============================================================================

/**
 * Execute message schema
 */
export const executeMessageSchema = z.object({
	type: z.literal('execute'),
	code: jsCodeSchema,
	id: executionIdSchema
});

/**
 * Cancel message schema
 */
export const cancelMessageSchema = z.object({
	type: z.literal('cancel'),
	id: executionIdSchema
});

/**
 * Union schema for all messages sent to the worker
 * Uses discriminated union for type-safe validation
 */
export const toJsWorkerMessageSchema = z.discriminatedUnion('type', [
	executeMessageSchema,
	cancelMessageSchema
]);

// =============================================================================
// Messages: Worker -> Main Thread
// =============================================================================

/**
 * Ready message schema
 */
export const readyMessageSchema = z.object({
	type: z.literal('ready')
});

/**
 * Stdout message schema
 */
export const stdoutMessageSchema = z.object({
	type: z.literal('stdout'),
	data: consoleDataSchema,
	id: executionIdSchema
});

/**
 * Stderr message schema
 */
export const stderrMessageSchema = z.object({
	type: z.literal('stderr'),
	data: consoleDataSchema,
	id: executionIdSchema
});

/**
 * Error message schema
 */
export const errorMessageSchema = z.object({
	type: z.literal('error'),
	message: errorMessageTextSchema,
	line: lineNumberSchema.optional(),
	id: executionIdSchema
});

/**
 * Complete message schema
 */
export const completeMessageSchema = z.object({
	type: z.literal('complete'),
	id: executionIdSchema,
	duration: durationMsSchema
});

/**
 * Timeout message schema
 */
export const timeoutMessageSchema = z.object({
	type: z.literal('timeout'),
	id: executionIdSchema
});

/**
 * Union schema for all messages sent from the worker
 * Uses discriminated union for type-safe validation
 */
export const fromJsWorkerMessageSchema = z.discriminatedUnion('type', [
	readyMessageSchema,
	stdoutMessageSchema,
	stderrMessageSchema,
	errorMessageSchema,
	completeMessageSchema,
	timeoutMessageSchema
]);

// =============================================================================
// Execution Context Schema
// =============================================================================

/**
 * JavaScript execution context configuration schema
 */
export const jsExecutionContextSchema = z.object({
	timeoutMs: z
		.number()
		.int()
		.min(100, 'Timeout must be at least 100ms')
		.max(60_000, 'Timeout must not exceed 60 seconds'),
	maxOutputSize: z
		.number()
		.int()
		.min(1000, 'Maximum output size must be at least 1000 characters')
		.max(1_000_000, 'Maximum output size must not exceed 1MB'),
	detectInfiniteLoops: z.boolean()
});

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a message is a valid ToJsWorkerMessage
 * @param data - Data to validate
 * @returns True if data is a valid ToJsWorkerMessage
 */
export function isToJsWorkerMessage(
	data: unknown
): data is z.infer<typeof toJsWorkerMessageSchema> {
	return toJsWorkerMessageSchema.safeParse(data).success;
}

/**
 * Type guard to check if a message is a valid FromJsWorkerMessage
 * @param data - Data to validate
 * @returns True if data is a valid FromJsWorkerMessage
 */
export function isFromJsWorkerMessage(
	data: unknown
): data is z.infer<typeof fromJsWorkerMessageSchema> {
	return fromJsWorkerMessageSchema.safeParse(data).success;
}

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type ExecuteMessageSchema = z.infer<typeof executeMessageSchema>;
export type CancelMessageSchema = z.infer<typeof cancelMessageSchema>;
export type ToJsWorkerMessageSchema = z.infer<typeof toJsWorkerMessageSchema>;

export type ReadyMessageSchema = z.infer<typeof readyMessageSchema>;
export type StdoutMessageSchema = z.infer<typeof stdoutMessageSchema>;
export type StderrMessageSchema = z.infer<typeof stderrMessageSchema>;
export type ErrorMessageSchema = z.infer<typeof errorMessageSchema>;
export type CompleteMessageSchema = z.infer<typeof completeMessageSchema>;
export type TimeoutMessageSchema = z.infer<typeof timeoutMessageSchema>;
export type FromJsWorkerMessageSchema = z.infer<typeof fromJsWorkerMessageSchema>;

export type JsExecutionContextSchema = z.infer<typeof jsExecutionContextSchema>;
