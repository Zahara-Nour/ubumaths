/**
 * JavaScript Worker Types
 *
 * Type definitions for communication between the main thread
 * and the JavaScript sandbox Web Worker for Blockly code execution.
 */

// =============================================================================
// Messages: Main Thread -> Worker
// =============================================================================

/**
 * Message to execute JavaScript code
 */
export interface ExecuteMessage {
	type: 'execute';
	/** JavaScript code to execute */
	code: string;
	/** Unique execution identifier */
	id: string;
}

/**
 * Message to cancel a running execution
 */
export interface CancelMessage {
	type: 'cancel';
	/** Execution ID to cancel */
	id: string;
}

/**
 * Union type for all messages sent to the worker
 */
export type ToJsWorkerMessage = ExecuteMessage | CancelMessage;

// =============================================================================
// Messages: Worker -> Main Thread
// =============================================================================

/**
 * JavaScript worker is ready for code execution
 */
export interface ReadyMessage {
	type: 'ready';
}

/**
 * Standard output from JavaScript execution
 */
export interface StdoutMessage {
	type: 'stdout';
	/** Console output data */
	data: string;
	/** Execution ID this output belongs to */
	id: string;
}

/**
 * Standard error from JavaScript execution
 */
export interface StderrMessage {
	type: 'stderr';
	/** Console error data */
	data: string;
	/** Execution ID this error belongs to */
	id: string;
}

/**
 * JavaScript execution error
 */
export interface ErrorMessage {
	type: 'error';
	/** Error message */
	message: string;
	/** Optional line number where error occurred */
	line?: number;
	/** Execution ID this error belongs to */
	id: string;
}

/**
 * Code execution completed successfully
 */
export interface CompleteMessage {
	type: 'complete';
	/** Execution ID that completed */
	id: string;
	/** Execution duration in milliseconds */
	duration: number;
}

/**
 * Code execution timed out
 */
export interface TimeoutMessage {
	type: 'timeout';
	/** Execution ID that timed out */
	id: string;
}

/**
 * Union type for all messages sent from the worker
 */
export type FromJsWorkerMessage =
	| ReadyMessage
	| StdoutMessage
	| StderrMessage
	| ErrorMessage
	| CompleteMessage
	| TimeoutMessage;

// =============================================================================
// Executor State
// =============================================================================

/**
 * JavaScript executor state machine states
 * - initial: Worker not yet initialized
 * - ready: Worker ready to execute code
 * - executing: Code currently running
 * - error: Fatal error occurred (worker needs restart)
 */
export type JsExecutorState = 'initial' | 'ready' | 'executing' | 'error';

// =============================================================================
// Execution Context
// =============================================================================

/**
 * JavaScript execution context configuration
 */
export interface JsExecutionContext {
	/** Maximum execution time in milliseconds */
	timeoutMs: number;
	/** Maximum console output size in characters */
	maxOutputSize: number;
	/** Whether to allow infinite loops detection */
	detectInfiniteLoops: boolean;
}

/**
 * Default execution context configuration
 */
export const DEFAULT_JS_EXECUTION_CONTEXT: JsExecutionContext = {
	timeoutMs: 5000,
	maxOutputSize: 100_000,
	detectInfiniteLoops: true
};
