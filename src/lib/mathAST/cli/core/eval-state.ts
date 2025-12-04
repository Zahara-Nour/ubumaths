/**
 * Evaluation State Management for CLI/REPL
 *
 * Manages variable bindings, function definitions, and evaluation mode
 * for interactive sessions. State is passed via CommandContext (not global)
 * for testability.
 *
 * @module mathAST/cli/core/eval-state
 */

import type { MathNode } from '../../types';
import type { EvalBindings } from '../../eval';
import type { FunctionBindings, FunctionDefinition } from '../../eval/function-bindings';

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
 * Tracks variable bindings, function definitions, and current evaluation mode
 */
export interface EvalState {
	/** Map of variable names to their bound MathNode values */
	bindings: Map<string, MathNode>;
	/** Map of function names to their definitions */
	functions: FunctionBindings;
	/** Set of function names for parser configuration */
	functionNames: Set<string>;
	/** Current evaluation mode (exact or decimal) */
	mode: EvalMode;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a fresh evaluation state with default values
 * @returns New EvalState with empty bindings, no functions, and exact mode
 */
export function createEvalState(): EvalState {
	return {
		bindings: new Map(),
		functions: {},
		functionNames: new Set(),
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

// =============================================================================
// Function Operations
// =============================================================================

/**
 * Create a function binding in the state
 * @param state - Evaluation state to modify
 * @param name - Function name (e.g., 'f', 'g')
 * @param params - Parameter names in order (e.g., ['x'] or ['x', 'y'])
 * @param expression - The function body as a MathNode
 * @param derivative - Optional pre-computed derivative expression
 * @param inverse - Optional pre-computed inverse expression
 */
export function createFunctionBinding(
	state: EvalState,
	name: string,
	params: readonly string[],
	expression: MathNode,
	derivative?: MathNode,
	inverse?: MathNode
): void {
	const definition: FunctionDefinition = {
		expression,
		parameters: params,
		...(derivative && { derivative }),
		...(inverse && { inverse })
	};

	state.functions[name] = definition;
	state.functionNames.add(name);
}

/**
 * Set the derivative for an existing function
 * @param state - Evaluation state to modify
 * @param name - Function name
 * @param derivative - The derivative expression
 * @returns True if the function exists and was updated, false otherwise
 */
export function setFunctionDerivative(
	state: EvalState,
	name: string,
	derivative: MathNode
): boolean {
	const existing = state.functions[name];
	if (!existing) {
		return false;
	}

	state.functions[name] = {
		...existing,
		derivative
	};
	return true;
}

/**
 * Set the inverse for an existing function
 * @param state - Evaluation state to modify
 * @param name - Function name
 * @param inverse - The inverse expression
 * @returns True if the function exists and was updated, false otherwise
 */
export function setFunctionInverse(state: EvalState, name: string, inverse: MathNode): boolean {
	const existing = state.functions[name];
	if (!existing) {
		return false;
	}

	state.functions[name] = {
		...existing,
		inverse
	};
	return true;
}

/**
 * Remove a function binding from the state
 * @param state - Evaluation state to modify
 * @param name - Function name to remove
 * @returns True if the function was removed, false if it didn't exist
 */
export function removeFunctionBinding(state: EvalState, name: string): boolean {
	if (!(name in state.functions)) {
		return false;
	}

	delete state.functions[name];
	state.functionNames.delete(name);
	return true;
}

/**
 * Get all function names defined in the state
 * @param state - Evaluation state
 * @returns Array of function names
 */
export function getFunctionNames(state: EvalState): string[] {
	return Array.from(state.functionNames);
}

/**
 * Get a function definition from the state
 * @param state - Evaluation state
 * @param name - Function name
 * @returns The function definition or undefined if not found
 */
export function getFunction(state: EvalState, name: string): FunctionDefinition | undefined {
	return state.functions[name];
}

/**
 * Check if a function is defined in the state
 * @param state - Evaluation state
 * @param name - Function name
 * @returns True if the function has a definition
 */
export function hasFunction(state: EvalState, name: string): boolean {
	return name in state.functions;
}

/**
 * Get the number of function definitions in the state
 * @param state - Evaluation state
 * @returns Number of function definitions
 */
export function getFunctionCount(state: EvalState): number {
	return state.functionNames.size;
}

/**
 * Clear all function definitions from the state
 * @param state - Evaluation state to modify
 */
export function clearFunctions(state: EvalState): void {
	state.functions = {};
	state.functionNames.clear();
}

/**
 * Clear all state (bindings, functions, and reset mode)
 * @param state - Evaluation state to modify
 */
export function clearAllState(state: EvalState): void {
	clearBindings(state);
	clearFunctions(state);
	state.mode = 'exact';
}
