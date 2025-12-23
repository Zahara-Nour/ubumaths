/**
 * Python Debug Types
 *
 * Type definitions for the step-by-step Python debugger.
 * Used for tracking execution state, variables, breakpoints, and call stack.
 */

// =============================================================================
// Debug Mode and Session State
// =============================================================================

/**
 * Debug mode - execute normally or debug step-by-step
 */
export type DebugMode = 'execute' | 'debug';

/**
 * Debug session state machine
 */
export type DebugSessionState =
	| 'idle' // No debug session active
	| 'running' // Executing until breakpoint/step
	| 'paused' // Waiting for user action (at breakpoint or after step)
	| 'stepping' // Single-stepping in progress
	| 'finished'; // Execution completed

/**
 * Debug step action types
 */
export type DebugStepAction = 'step' | 'step-over' | 'step-out' | 'continue' | 'run-to-end';

// =============================================================================
// Variables
// =============================================================================

/**
 * Serialized variable value with type information
 */
export interface DebugVariableValue {
	/** Python type name (int, str, list, dict, etc.) */
	type: string;
	/** String representation of value (for primitives) or nested structure */
	value: string | DebugVariableValue[] | Record<string, DebugVariableValue>;
	/** Length for containers */
	length?: number;
}

/**
 * Debug variable with change tracking
 */
export interface DebugVariable {
	/** Variable name */
	name: string;
	/** JSON-serialized value */
	value: string;
	/** Python type name */
	type: string;
	/** True for built-in types (int, str, list, dict, tuple, set, bool, None) */
	isBuiltin: boolean;
	/** True if value changed since previous snapshot */
	isChanged: boolean;
	/** True if this is a new variable (not in previous snapshot) */
	isNew?: boolean;
	/** Unique object ID for heap visualization */
	objectId?: string;
}

// =============================================================================
// Call Stack
// =============================================================================

/**
 * Stack frame information
 */
export interface DebugStackFrame {
	/** Function name ('<module>' for top-level code) */
	functionName: string;
	/** Source filename (usually '<exec>') */
	filename: string;
	/** Current line number in this frame */
	lineNumber: number;
	/** Local variables in this frame */
	locals: DebugVariable[];
	/** True if this is the currently executing frame */
	isCurrentFrame: boolean;
}

// =============================================================================
// Loops
// =============================================================================

/**
 * Loop tracking information for visualization
 */
export interface DebugLoopInfo {
	/** Unique identifier for this loop instance */
	loopId: string;
	/** Current iteration count (1-based) */
	iterationCount: number;
	/** Estimated maximum iterations (for range loops) */
	maxIterations?: number;
	/** Type of loop */
	loopType: 'for' | 'while';
	/** Line number where loop starts */
	lineNumber: number;
}

// =============================================================================
// Snapshots
// =============================================================================

/**
 * Trace event type from sys.settrace()
 */
export type DebugTraceEvent = 'line' | 'call' | 'return' | 'exception';

/**
 * Complete execution snapshot at a single point in time
 */
export interface DebugSnapshot {
	/** Unique snapshot identifier */
	id: string;
	/** Current line number being executed */
	lineNumber: number;
	/** Timestamp (performance.now() value) */
	timestamp: number;
	/** Full call stack with local variables per frame */
	callStack: DebugStackFrame[];
	/** Global variables */
	globals: DebugVariable[];
	/** Active loop stack */
	loops: DebugLoopInfo[];
	/** Stdout content up to this point */
	stdout: string;
	/** Trace event that triggered this snapshot */
	event: DebugTraceEvent;
}

// =============================================================================
// Breakpoints
// =============================================================================

/**
 * Breakpoint definition
 */
export interface Breakpoint {
	/** Unique breakpoint identifier */
	id: string;
	/** Line number (1-based) */
	lineNumber: number;
	/** Whether breakpoint is enabled */
	enabled: boolean;
	/** Optional condition expression (Python code) */
	condition?: string;
}

/**
 * Breakpoint for worker communication (simplified)
 * Re-exported from types.ts to maintain backwards compatibility
 */
export type { WorkerBreakpoint } from '../types';

// =============================================================================
// Heap Visualization (PythonTutor-style)
// =============================================================================

/**
 * Heap object for visualization
 */
export interface HeapObject {
	/** Unique object ID */
	id: string;
	/** Python type name */
	type: string;
	/** Value representation (string for primitives, array for containers) */
	value: string | HeapObject[];
	/** IDs of objects this object references */
	references?: string[];
}

/**
 * Stack frame for visualization
 */
export interface VisualizationStackFrame {
	/** Frame name (function name or '<module>') */
	frameName: string;
	/** Variables with their heap references */
	variables: Array<{
		name: string;
		/** Reference to heap object ID, or inline value for primitives */
		valueRef: string;
	}>;
}

/**
 * Complete visualization data (PythonTutor-style)
 */
export interface DebugVisualization {
	/** Stack frames from bottom to top */
	stack: VisualizationStackFrame[];
	/** Heap objects */
	heap: HeapObject[];
}

// =============================================================================
// Debug Pause Reasons
// =============================================================================

/**
 * Reason why execution paused
 */
export type DebugPauseReason = 'breakpoint' | 'step' | 'exception' | 'start';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Debug configuration constants
 */
export const DEBUG_CONFIG = {
	/** Maximum number of snapshots to keep in history (for step-back) */
	MAX_HISTORY_SIZE: 10,
	/** Maximum depth for serializing nested objects */
	MAX_SERIALIZE_DEPTH: 5,
	/** Maximum items to serialize in containers (list, dict) */
	MAX_SERIALIZE_ITEMS: 50,
	/** Maximum string length before truncation */
	MAX_STRING_LENGTH: 200,
	/** Timeout for debug execution (ms) */
	DEBUG_TIMEOUT_MS: 60_000
} as const;
