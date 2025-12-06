/**
 * JavaScript Sandbox Worker Message Schemas
 *
 * Validation schemas for messages sent to/from the JavaScript sandbox worker.
 * Used for runtime validation of worker communication for Blockly code execution.
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
 * Code schema with length limits
 */
export const codeSchema = z
	.string()
	.max(100_000, 'Le code depasse la limite de 100 000 caracteres');

// =============================================================================
// Messages: Main Thread -> Worker
// =============================================================================

/**
 * Execute message schema
 */
export const executeMessageSchema = z.object({
	type: z.literal('execute'),
	code: codeSchema,
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
 */
export const toWorkerMessageSchema = z.discriminatedUnion('type', [
	executeMessageSchema,
	cancelMessageSchema
]);

// =============================================================================
// Messages: Worker -> Main Thread
// =============================================================================

/**
 * Ready message schema - signals worker is initialized
 */
export const readyMessageSchema = z.object({
	type: z.literal('ready')
});

/**
 * Maximum size for stdout/stderr data (matches MAX_MESSAGE_SIZE in worker)
 */
const MAX_MESSAGE_DATA_SIZE = 10_100; // 10000 + buffer for truncation message

/**
 * Stdout message schema - console output
 */
export const stdoutMessageSchema = z.object({
	type: z.literal('stdout'),
	data: z.string().max(MAX_MESSAGE_DATA_SIZE, 'Sortie trop longue'),
	id: executionIdSchema
});

/**
 * Stderr message schema - error output
 */
export const stderrMessageSchema = z.object({
	type: z.literal('stderr'),
	data: z.string().max(MAX_MESSAGE_DATA_SIZE, 'Sortie erreur trop longue'),
	id: executionIdSchema
});

/**
 * Error message schema
 */
export const errorMessageSchema = z.object({
	type: z.literal('error'),
	message: z.string(),
	line: z.number().int().min(1).optional(),
	id: executionIdSchema
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
 * Union schema for all messages sent from the worker
 */
export const fromWorkerMessageSchema = z.discriminatedUnion('type', [
	readyMessageSchema,
	stdoutMessageSchema,
	stderrMessageSchema,
	errorMessageSchema,
	completeMessageSchema,
	timeoutMessageSchema
]);

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type ExecuteMessage = z.infer<typeof executeMessageSchema>;
export type CancelMessage = z.infer<typeof cancelMessageSchema>;
export type ToWorkerMessage = z.infer<typeof toWorkerMessageSchema>;

export type ReadyMessage = z.infer<typeof readyMessageSchema>;
export type StdoutMessage = z.infer<typeof stdoutMessageSchema>;
export type StderrMessage = z.infer<typeof stderrMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type CompleteMessage = z.infer<typeof completeMessageSchema>;
export type TimeoutMessage = z.infer<typeof timeoutMessageSchema>;
export type FromWorkerMessage = z.infer<typeof fromWorkerMessageSchema>;
