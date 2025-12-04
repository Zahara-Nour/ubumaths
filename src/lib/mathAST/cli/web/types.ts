/**
 * Web REPL Types
 *
 * Type definitions specific to the browser-based REPL interface.
 * Extends the CLI types with web-specific features like HTML output,
 * history management, and bidirectional highlighting.
 */

import type { MathNode } from '../../types';

// =============================================================================
// Input Modes
// =============================================================================

/**
 * REPL input mode for expression parsing.
 *
 * - 'latex': Force LaTeX parsing
 * - 'custom': Force custom syntax parsing
 * - 'auto': Auto-detect format (default)
 */
export type ReplInputMode = 'latex' | 'custom' | 'auto';

// =============================================================================
// UI Styles
// =============================================================================

/**
 * Visual style for the REPL interface.
 *
 * - 'terminal': Classic terminal look (monospace, dark)
 * - 'modern': Modern UI with rounded corners and gradients
 * - 'hybrid': Mix of terminal and modern aesthetics
 */
export type TabStyle = 'terminal' | 'modern' | 'hybrid';

// =============================================================================
// Execution Results
// =============================================================================

/**
 * Result of executing a REPL input (command or expression).
 *
 * Contains both plain text output (for accessibility/export) and
 * HTML-formatted output for rich display in the browser.
 */
export interface ReplExecutionResult {
	/** Whether execution succeeded */
	readonly success: boolean;

	/** Plain text output (always present) */
	readonly output: string;

	/** HTML-formatted output for browser display */
	readonly outputHtml?: string;

	/** LaTeX representation for MathLive rendering */
	readonly latex?: string;

	/** Parsed AST for tree viewer */
	readonly ast?: MathNode;

	/**
	 * Highlight ranges for bidirectional AST <-> output linking.
	 * Each range maps a node ID to its position in the output string.
	 */
	readonly highlightRanges?: ReadonlyArray<{
		readonly nodeId: string;
		readonly start: number;
		readonly end: number;
	}>;

	/** Error details if execution failed */
	readonly error?: {
		readonly code: string;
		readonly message: string;
		readonly position?: number;
	};
}

// =============================================================================
// Function State Exposure
// =============================================================================

/**
 * Information about a user-defined function for web display.
 *
 * Exposes function state from EvalState for UI components like
 * function palettes and autocomplete.
 */
export interface WebFunctionInfo {
	/** Function name (e.g., 'f', 'g') */
	readonly name: string;

	/** Parameter names in order (e.g., ['x'] or ['x', 'y']) */
	readonly parameters: readonly string[];

	/** Function body as custom syntax string (e.g., 'x^2 + 1') */
	readonly expression: string;

	/** Derivative expression as custom syntax string, if defined */
	readonly derivative?: string;

	/** Inverse expression as custom syntax string, if defined */
	readonly inverse?: string;
}

// =============================================================================
// History Management
// =============================================================================

/**
 * Single entry in the REPL history.
 *
 * Stores the complete context of a REPL interaction for replay,
 * export, and navigation (up/down arrows).
 */
export interface ReplHistoryEntry {
	/** Unique identifier for this entry */
	readonly id: string;

	/** Unix timestamp (milliseconds) when entry was created */
	readonly timestamp: number;

	/** Original input string (command or expression) */
	readonly input: string;

	/** Input mode at the time of execution */
	readonly inputMode: ReplInputMode;

	/** Execution result with output and metadata */
	readonly result: ReplExecutionResult;

	/** True if input was a dot-command (e.g., .help) */
	readonly isCommand: boolean;
}
