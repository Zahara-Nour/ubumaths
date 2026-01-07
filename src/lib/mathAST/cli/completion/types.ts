/**
 * Completion Types
 *
 * Type definitions for the auto-completion API.
 *
 * @module mathAST/cli/completion/types
 */

/**
 * Kind of completion item.
 */
export type CompletionKind = 'function' | 'variable' | 'command' | 'constant' | 'greek';

/**
 * A completion item.
 */
export interface Completion {
	/** Display label */
	readonly label: string;

	/** Kind of completion */
	readonly kind: CompletionKind;

	/** Text to insert when selected */
	readonly insertText: string;

	/** Function signature (for functions) */
	readonly signature?: string;

	/** Short description */
	readonly description?: string;
}

/**
 * Context for generating completions.
 */
export interface CompletionContext {
	/** Available variable names */
	readonly variables?: readonly string[];

	/** Available user-defined functions */
	readonly functions?: readonly string[];
}

/**
 * Options for getCompletions.
 */
export interface CompletionOptions {
	/** Maximum number of results (default: 20) */
	readonly maxResults?: number;
}
