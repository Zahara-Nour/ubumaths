/**
 * Shared Blockly Module Types
 *
 * Type definitions for Blockly visual programming system,
 * supporting JavaScript and Python code generation and execution.
 */

// =============================================================================
// Executor State Types
// =============================================================================

/**
 * Executor state lifecycle
 * - 'initial': Executor created but not initialized
 * - 'ready': Blockly workspace initialized and ready
 * - 'executing': Code is currently running
 * - 'error': Initialization or execution failed
 */
export type ExecutorState = 'initial' | 'ready' | 'executing' | 'error';

/**
 * Code execution language
 * - 'javascript': Native JavaScript execution (fast, synchronous)
 * - 'python': Pyodide execution (slower, requires worker)
 */
export type ExecutionLanguage = 'javascript' | 'python';

// =============================================================================
// Loading Stages
// =============================================================================

/**
 * Loading stage descriptor for progress reporting
 */
export interface LoadingStage {
	percent: number;
	stage: string;
}

// =============================================================================
// Output Types
// =============================================================================

/**
 * Output line type classification
 * - 'stdout': Normal program output
 * - 'stderr': Error output
 * - 'info': System information messages
 */
export type OutputLineType = 'stdout' | 'stderr' | 'info';

/**
 * Single output line from execution
 */
export interface OutputLine {
	/** Line type classification */
	type: OutputLineType;
	/** Text content of the line */
	text: string;
	/** Optional timestamp (milliseconds since epoch) */
	timestamp?: number;
}

// =============================================================================
// Workspace State
// =============================================================================

/**
 * Blockly workspace state for persistence
 */
export interface BlocklyWorkspaceState {
	/** Workspace XML representation */
	xml: string;
	/** Last modified timestamp */
	lastModified: number;
	/** Selected language for code generation */
	language: ExecutionLanguage;
	/** Optional workspace metadata */
	metadata?: {
		/** Number of blocks in workspace */
		blockCount: number;
		/** Workspace zoom level */
		scale?: number;
		/** Workspace scroll position */
		scrollX?: number;
		scrollY?: number;
	};
}

// =============================================================================
// Code Generation
// =============================================================================

/**
 * Code generation result from Blockly workspace
 */
export interface CodeGenerationResult {
	/** Generated source code */
	code: string;
	/** Language of generated code */
	language: ExecutionLanguage;
	/** Whether code generation was successful */
	success: boolean;
	/** Error message if generation failed */
	error?: string;
	/** Number of blocks processed */
	blockCount: number;
	/** Whether potential infinite loop was detected */
	hasInfiniteLoop?: boolean;
	/** Optional warning messages */
	warnings?: string[];
}

// =============================================================================
// Execution Context
// =============================================================================

/**
 * Execution environment configuration
 */
export interface ExecutionContext {
	/** Unique execution ID */
	id: string;
	/** Target language */
	language: ExecutionLanguage;
	/** JavaScript execution timeout (ms) */
	jsTimeout: number;
	/** Python execution timeout (ms) */
	pythonTimeout: number;
	/** Maximum allowed output lines */
	maxOutputLines: number;
	/** Created timestamp */
	createdAt: number;
}

// =============================================================================
// Workspace Configuration
// =============================================================================

/**
 * Blockly workspace initialization options
 */
export interface WorkspaceOptions {
	/** Toolbox XML definition or category structure */
	toolbox: string | object;
	/** Show grid in workspace */
	grid?: {
		spacing: number;
		length: number;
		colour: string;
		snap: boolean;
	};
	/** Enable zoom controls */
	zoom?: {
		controls: boolean;
		wheel: boolean;
		startScale: number;
		maxScale: number;
		minScale: number;
		scaleSpeed: number;
	};
	/** Enable trash can */
	trashcan?: boolean;
	/** Maximum number of blocks (0 = unlimited) */
	maxBlocks?: number;
	/** Workspace sounds */
	sounds?: boolean;
	/** Move workspace with mouse */
	move?: {
		scrollbars: boolean;
		drag: boolean;
		wheel: boolean;
	};
}

// =============================================================================
// Loading Stage Index
// =============================================================================

/**
 * Loading stage indices for type safety
 */
export enum LoadingStageIndex {
	INITIALIZING = 0,
	LOADING_BLOCKLY = 1,
	INITIALIZING_WORKSPACE = 2,
	READY = 3
}
