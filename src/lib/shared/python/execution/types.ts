/**
 * Execution-Related Types
 *
 * Types for managing Python code execution state, results,
 * and execution context lifecycle.
 */

import type { ValidationResult } from '../types';

// =============================================================================
// Execution State
// =============================================================================

/**
 * Execution status
 */
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'timeout' | 'cancelled';

/**
 * Output item type
 */
export type OutputType = 'stdout' | 'stderr' | 'plot' | 'latex' | 'plotly' | 'error';

/**
 * Individual output item from execution
 */
export interface OutputItem {
	type: OutputType;
	content: string;
	timestamp: number;
}

/**
 * Complete execution result
 */
export interface ExecutionResult {
	id: string;
	status: ExecutionStatus;
	outputs: OutputItem[];
	duration: number;
	startTime: number;
	endTime?: number;
	errorLine?: number;
	contextId?: string;
}

/**
 * Execution request configuration
 */
export interface ExecutionRequest {
	code: string;
	contextId?: string;
	timeout?: number;
	validateFirst?: boolean;
}

// =============================================================================
// Context State
// =============================================================================

/**
 * Variables defined in a context
 */
export interface ContextVariable {
	name: string;
	type: string;
	repr: string;
}

/**
 * Context state snapshot
 */
export interface ContextState {
	contextId: string;
	variables: ContextVariable[];
	executionCount: number;
	lastExecutionTime?: number;
	persistent: boolean;
}

/**
 * Context lifecycle event
 */
export type ContextEvent =
	| 'created'
	| 'reset'
	| 'destroyed'
	| 'execution-started'
	| 'execution-completed';

/**
 * Context event payload
 */
export interface ContextEventPayload {
	event: ContextEvent;
	contextId: string;
	timestamp: number;
	details?: Record<string, unknown>;
}

// =============================================================================
// Notebook Cell Types
// =============================================================================

/**
 * Cell type in a notebook
 */
export type CellType = 'code' | 'markdown';

/**
 * Cell execution state
 */
export type CellExecutionState = 'idle' | 'queued' | 'running' | 'completed' | 'error';

/**
 * Notebook cell structure
 */
export interface NotebookCell {
	id: string;
	type: CellType;
	content: string;
	outputs: OutputItem[];
	executionState: CellExecutionState;
	executionCount?: number;
	lastExecutionTime?: number;
	validationResult?: ValidationResult;
}

/**
 * Notebook metadata
 */
export interface NotebookMetadata {
	title: string;
	description?: string;
	createdAt: number;
	updatedAt: number;
	author?: string;
	tags?: string[];
}

/**
 * Complete notebook structure
 */
export interface Notebook {
	id: string;
	metadata: NotebookMetadata;
	cells: NotebookCell[];
	contextId: string;
}

// =============================================================================
// Execution Queue
// =============================================================================

/**
 * Queued execution item
 */
export interface QueuedExecution {
	id: string;
	code: string;
	contextId: string;
	priority: number;
	queuedAt: number;
	cellId?: string;
}

/**
 * Execution queue state
 */
export interface ExecutionQueueState {
	pending: QueuedExecution[];
	current: QueuedExecution | null;
	completed: string[];
}

// =============================================================================
// Execution Events
// =============================================================================

/**
 * Execution event types for pub/sub pattern
 */
export type ExecutionEventType =
	| 'execution-started'
	| 'execution-output'
	| 'execution-completed'
	| 'execution-error'
	| 'execution-timeout'
	| 'execution-cancelled';

/**
 * Execution event payload
 */
export interface ExecutionEvent {
	type: ExecutionEventType;
	executionId: string;
	timestamp: number;
	data?: OutputItem | ExecutionResult;
}

/**
 * Execution event handler
 */
export type ExecutionEventHandler = (event: ExecutionEvent) => void;
