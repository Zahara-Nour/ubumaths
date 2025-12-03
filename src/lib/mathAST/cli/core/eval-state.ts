/**
 * Evaluation State Management for CLI/REPL
 *
 * Manages variable bindings and evaluation mode for interactive sessions.
 * State is passed via CommandContext (not global) for testability.
 *
 * @module mathAST/cli/core/eval-state
 */

import type { MathNode } from '../../types';
import type { EvalBindings } from '../../eval';

// =============================================================================
// Types
// =============================================================================

/**
 * Evaluation mode for numeric results
 * - 'exact': Use Rational arithmetic when possible (e.g., 1/3 stays as fraction)
 * - 'decimal': Force decimal approximation (e.g., 1/3 becomes 0.333...)
 */
export type EvalMode = 'exact' | 'decimal';

/**
 * State for evaluation in REPL sessions
 * Tracks variable bindings and current evaluation mode
 */
export interface EvalState {
	/** Map of variable names to their bound MathNode values */
	bindings: Map<string, MathNode>;
	/** Current evaluation mode (exact or decimal) */
	mode: EvalMode;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a fresh evaluation state with default values
 * @returns New EvalState with empty bindings and exact mode
 */
export function createEvalState(): EvalState {
	return {
		bindings: new Map(),
		mode: 'exact'
	};
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Convert Map bindings to EvalBindings record for evaluate()
 * @param bindings - Map of variable bindings
 * @returns EvalBindings object compatible with evaluate() function
 */
export function bindingsToRecord(bindings: Map<string, MathNode>): EvalBindings {
	const record: Record<string, MathNode> = {};
	for (const [key, value] of bindings) {
		record[key] = value;
	}
	return record;
}

// =============================================================================
// State Operations
// =============================================================================

/**
 * Set a variable binding in the state
 * @param state - Evaluation state to modify
 * @param name - Variable name
 * @param value - MathNode value to bind
 */
export function setBinding(state: EvalState, name: string, value: MathNode): void {
	state.bindings.set(name, value);
}

/**
 * Get a variable binding from the state
 * @param state - Evaluation state
 * @param name - Variable name
 * @returns The bound MathNode or undefined if not found
 */
export function getBinding(state: EvalState, name: string): MathNode | undefined {
	return state.bindings.get(name);
}

/**
 * Check if a variable is bound in the state
 * @param state - Evaluation state
 * @param name - Variable name
 * @returns True if the variable has a binding
 */
export function hasBinding(state: EvalState, name: string): boolean {
	return state.bindings.has(name);
}

/**
 * Remove a variable binding from the state
 * @param state - Evaluation state to modify
 * @param name - Variable name to unset
 * @returns True if the binding was removed, false if it didn't exist
 */
export function unsetBinding(state: EvalState, name: string): boolean {
	return state.bindings.delete(name);
}

/**
 * Clear all bindings from the state
 * @param state - Evaluation state to modify
 */
export function clearBindings(state: EvalState): void {
	state.bindings.clear();
}

/**
 * Get the number of bindings in the state
 * @param state - Evaluation state
 * @returns Number of variable bindings
 */
export function getBindingCount(state: EvalState): number {
	return state.bindings.size;
}

/**
 * Get all variable names in the state
 * @param state - Evaluation state
 * @returns Array of variable names
 */
export function getBindingNames(state: EvalState): string[] {
	return Array.from(state.bindings.keys());
}

// =============================================================================
// Mode Operations
// =============================================================================

/**
 * Set the evaluation mode
 * @param state - Evaluation state to modify
 * @param mode - New evaluation mode
 */
export function setMode(state: EvalState, mode: EvalMode): void {
	state.mode = mode;
}

/**
 * Toggle evaluation mode between exact and decimal
 * @param state - Evaluation state to modify
 * @returns The new mode after toggling
 */
export function toggleMode(state: EvalState): EvalMode {
	state.mode = state.mode === 'exact' ? 'decimal' : 'exact';
	return state.mode;
}
