/**
 * Unit tests for Evaluation State Management
 *
 * Tests variable bindings, function definitions, and mode operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	createEvalState,
	// Variable bindings
	setBinding,
	getBinding,
	hasBinding,
	unsetBinding,
	clearBindings,
	getBindingCount,
	getBindingNames,
	bindingsToRecord,
	// Mode
	setMode,
	toggleMode,
	// Function operations
	createFunctionBinding,
	setFunctionDerivative,
	setFunctionInverse,
	removeFunctionBinding,
	getFunctionNames,
	getFunction,
	hasFunction,
	getFunctionCount,
	clearFunctions,
	clearAllState
} from '../eval-state';
import type { EvalState } from '../eval-state';
import { variable, number, add, multiply, superscript } from '../../../factory';

describe('EvalState', () => {
	let state: EvalState;

	beforeEach(() => {
		state = createEvalState();
	});

	// =============================================================================
	// Factory Function
	// =============================================================================

	describe('createEvalState', () => {
		it('creates state with empty variable bindings', () => {
			expect(state.bindings.size).toBe(0);
		});

		it('creates state with empty function bindings', () => {
			expect(Object.keys(state.functions)).toHaveLength(0);
		});

		it('creates state with empty function names set', () => {
			expect(state.functionNames.size).toBe(0);
		});

		it('creates state with exact mode by default', () => {
			expect(state.mode).toBe('exact');
		});
	});

	// =============================================================================
	// Variable Binding Operations
	// =============================================================================

	describe('variable bindings', () => {
		it('sets and gets a binding', () => {
			const x = variable('x');
			setBinding(state, 'a', x);
			expect(getBinding(state, 'a')).toBe(x);
		});

		it('returns undefined for non-existent binding', () => {
			expect(getBinding(state, 'nonexistent')).toBeUndefined();
		});

		it('hasBinding returns true for existing binding', () => {
			setBinding(state, 'x', number('42'));
			expect(hasBinding(state, 'x')).toBe(true);
		});

		it('hasBinding returns false for non-existent binding', () => {
			expect(hasBinding(state, 'x')).toBe(false);
		});

		it('unsets a binding', () => {
			setBinding(state, 'x', number('1'));
			expect(unsetBinding(state, 'x')).toBe(true);
			expect(hasBinding(state, 'x')).toBe(false);
		});

		it('unset returns false for non-existent binding', () => {
			expect(unsetBinding(state, 'nonexistent')).toBe(false);
		});

		it('clears all bindings', () => {
			setBinding(state, 'x', number('1'));
			setBinding(state, 'y', number('2'));
			clearBindings(state);
			expect(getBindingCount(state)).toBe(0);
		});

		it('counts bindings', () => {
			setBinding(state, 'a', number('1'));
			setBinding(state, 'b', number('2'));
			setBinding(state, 'c', number('3'));
			expect(getBindingCount(state)).toBe(3);
		});

		it('gets all binding names', () => {
			setBinding(state, 'x', number('1'));
			setBinding(state, 'y', number('2'));
			const names = getBindingNames(state);
			expect(names).toHaveLength(2);
			expect(names).toContain('x');
			expect(names).toContain('y');
		});

		it('converts bindings to record', () => {
			setBinding(state, 'x', number('1'));
			setBinding(state, 'y', number('2'));
			const record = bindingsToRecord(state.bindings);
			expect(record['x']).toEqual(number('1'));
			expect(record['y']).toEqual(number('2'));
		});
	});

	// =============================================================================
	// Mode Operations
	// =============================================================================

	describe('mode operations', () => {
		it('sets mode to decimal', () => {
			setMode(state, 'decimal');
			expect(state.mode).toBe('decimal');
		});

		it('sets mode to exact', () => {
			setMode(state, 'decimal');
			setMode(state, 'exact');
			expect(state.mode).toBe('exact');
		});

		it('toggles from exact to decimal', () => {
			expect(toggleMode(state)).toBe('decimal');
			expect(state.mode).toBe('decimal');
		});

		it('toggles from decimal to exact', () => {
			state.mode = 'decimal';
			expect(toggleMode(state)).toBe('exact');
			expect(state.mode).toBe('exact');
		});
	});

	// =============================================================================
	// Function Operations
	// =============================================================================

	describe('createFunctionBinding', () => {
		it('creates a simple function binding f(x) = x^2', () => {
			const x = variable('x');
			const xSquared = superscript(x, number('2'));
			createFunctionBinding(state, 'f', ['x'], xSquared);

			expect(hasFunction(state, 'f')).toBe(true);
			expect(state.functionNames.has('f')).toBe(true);
		});

		it('stores expression and parameters correctly', () => {
			const expr = add(variable('x'), number('1'));
			createFunctionBinding(state, 'g', ['x'], expr);

			const def = getFunction(state, 'g');
			expect(def).toBeDefined();
			expect(def?.expression).toBe(expr);
			expect(def?.parameters).toEqual(['x']);
		});

		it('creates function with multiple parameters', () => {
			const expr = add(variable('x'), variable('y'));
			createFunctionBinding(state, 'h', ['x', 'y'], expr);

			const def = getFunction(state, 'h');
			expect(def?.parameters).toEqual(['x', 'y']);
		});

		it('creates function with derivative', () => {
			const expr = superscript(variable('x'), number('2'));
			const derivative = multiply(number('2'), variable('x'), 'implicit');
			createFunctionBinding(state, 'f', ['x'], expr, derivative);

			const def = getFunction(state, 'f');
			expect(def?.derivative).toBe(derivative);
		});

		it('creates function with inverse', () => {
			const expr = superscript(variable('x'), number('2'));
			const inverse = variable('x'); // sqrt would be function call
			createFunctionBinding(state, 'f', ['x'], expr, undefined, inverse);

			const def = getFunction(state, 'f');
			expect(def?.inverse).toBe(inverse);
		});

		it('creates function with both derivative and inverse', () => {
			const expr = superscript(variable('x'), number('2'));
			const derivative = multiply(number('2'), variable('x'), 'implicit');
			const inverse = variable('x');
			createFunctionBinding(state, 'f', ['x'], expr, derivative, inverse);

			const def = getFunction(state, 'f');
			expect(def?.derivative).toBe(derivative);
			expect(def?.inverse).toBe(inverse);
		});

		it('overwrites existing function with same name', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'f', ['x'], number('2'));

			const def = getFunction(state, 'f');
			expect(def?.expression).toEqual(number('2'));
			expect(getFunctionCount(state)).toBe(1);
		});
	});

	describe('setFunctionDerivative', () => {
		it('sets derivative for existing function', () => {
			createFunctionBinding(state, 'f', ['x'], superscript(variable('x'), number('2')));
			const derivative = multiply(number('2'), variable('x'), 'implicit');

			const result = setFunctionDerivative(state, 'f', derivative);

			expect(result).toBe(true);
			expect(getFunction(state, 'f')?.derivative).toBe(derivative);
		});

		it('returns false for non-existent function', () => {
			const derivative = multiply(number('2'), variable('x'), 'implicit');
			const result = setFunctionDerivative(state, 'nonexistent', derivative);

			expect(result).toBe(false);
		});

		it('overwrites existing derivative', () => {
			const oldDerivative = number('1');
			const newDerivative = multiply(number('2'), variable('x'), 'implicit');
			createFunctionBinding(state, 'f', ['x'], variable('x'), oldDerivative);

			setFunctionDerivative(state, 'f', newDerivative);

			expect(getFunction(state, 'f')?.derivative).toBe(newDerivative);
		});

		it('preserves expression and parameters', () => {
			const expr = superscript(variable('x'), number('2'));
			createFunctionBinding(state, 'f', ['x'], expr);

			setFunctionDerivative(state, 'f', number('2'));

			const def = getFunction(state, 'f');
			expect(def?.expression).toBe(expr);
			expect(def?.parameters).toEqual(['x']);
		});
	});

	describe('setFunctionInverse', () => {
		it('sets inverse for existing function', () => {
			createFunctionBinding(state, 'f', ['x'], superscript(variable('x'), number('2')));
			const inverse = variable('x'); // representing sqrt(x)

			const result = setFunctionInverse(state, 'f', inverse);

			expect(result).toBe(true);
			expect(getFunction(state, 'f')?.inverse).toBe(inverse);
		});

		it('returns false for non-existent function', () => {
			const inverse = variable('x');
			const result = setFunctionInverse(state, 'nonexistent', inverse);

			expect(result).toBe(false);
		});

		it('overwrites existing inverse', () => {
			const oldInverse = number('1');
			const newInverse = variable('x');
			createFunctionBinding(state, 'f', ['x'], variable('x'), undefined, oldInverse);

			setFunctionInverse(state, 'f', newInverse);

			expect(getFunction(state, 'f')?.inverse).toBe(newInverse);
		});

		it('preserves expression, parameters, and derivative', () => {
			const expr = superscript(variable('x'), number('2'));
			const derivative = multiply(number('2'), variable('x'), 'implicit');
			createFunctionBinding(state, 'f', ['x'], expr, derivative);

			setFunctionInverse(state, 'f', variable('x'));

			const def = getFunction(state, 'f');
			expect(def?.expression).toBe(expr);
			expect(def?.parameters).toEqual(['x']);
			expect(def?.derivative).toBe(derivative);
		});
	});

	describe('removeFunctionBinding', () => {
		it('removes an existing function', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));

			const result = removeFunctionBinding(state, 'f');

			expect(result).toBe(true);
			expect(hasFunction(state, 'f')).toBe(false);
			expect(state.functionNames.has('f')).toBe(false);
		});

		it('returns false for non-existent function', () => {
			const result = removeFunctionBinding(state, 'nonexistent');

			expect(result).toBe(false);
		});

		it('removes from both functions and functionNames', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'g', ['x'], number('2'));

			removeFunctionBinding(state, 'f');

			expect(getFunctionNames(state)).toEqual(['g']);
			expect(getFunctionCount(state)).toBe(1);
		});
	});

	describe('getFunctionNames', () => {
		it('returns empty array for no functions', () => {
			expect(getFunctionNames(state)).toEqual([]);
		});

		it('returns all function names', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'g', ['x'], number('2'));
			createFunctionBinding(state, 'h', ['x', 'y'], number('3'));

			const names = getFunctionNames(state);
			expect(names).toHaveLength(3);
			expect(names).toContain('f');
			expect(names).toContain('g');
			expect(names).toContain('h');
		});
	});

	describe('getFunction', () => {
		it('returns undefined for non-existent function', () => {
			expect(getFunction(state, 'nonexistent')).toBeUndefined();
		});

		it('returns function definition', () => {
			const expr = add(variable('x'), number('1'));
			createFunctionBinding(state, 'f', ['x'], expr);

			const def = getFunction(state, 'f');
			expect(def?.expression).toBe(expr);
			expect(def?.parameters).toEqual(['x']);
		});
	});

	describe('hasFunction', () => {
		it('returns false for non-existent function', () => {
			expect(hasFunction(state, 'f')).toBe(false);
		});

		it('returns true for existing function', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));
			expect(hasFunction(state, 'f')).toBe(true);
		});
	});

	describe('getFunctionCount', () => {
		it('returns 0 for no functions', () => {
			expect(getFunctionCount(state)).toBe(0);
		});

		it('returns correct count', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'g', ['x'], number('2'));
			expect(getFunctionCount(state)).toBe(2);
		});
	});

	describe('clearFunctions', () => {
		it('clears all functions', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'g', ['x'], number('2'));

			clearFunctions(state);

			expect(getFunctionCount(state)).toBe(0);
			expect(Object.keys(state.functions)).toHaveLength(0);
			expect(state.functionNames.size).toBe(0);
		});

		it('does not affect variable bindings', () => {
			setBinding(state, 'x', number('42'));
			createFunctionBinding(state, 'f', ['x'], number('1'));

			clearFunctions(state);

			expect(getBindingCount(state)).toBe(1);
			expect(getBinding(state, 'x')).toEqual(number('42'));
		});
	});

	describe('clearAllState', () => {
		it('clears bindings, functions, and resets mode', () => {
			setBinding(state, 'x', number('1'));
			createFunctionBinding(state, 'f', ['x'], number('1'));
			setMode(state, 'decimal');

			clearAllState(state);

			expect(getBindingCount(state)).toBe(0);
			expect(getFunctionCount(state)).toBe(0);
			expect(state.mode).toBe('exact');
		});
	});

	// =============================================================================
	// Integration with Parser Options
	// =============================================================================

	describe('integration with parser', () => {
		it('functionNames set is synchronized with functions', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'g', ['x'], number('2'));

			// Both should be in sync
			expect(state.functionNames.size).toBe(Object.keys(state.functions).length);
			expect(state.functionNames.has('f')).toBe(true);
			expect(state.functionNames.has('g')).toBe(true);

			removeFunctionBinding(state, 'f');

			expect(state.functionNames.size).toBe(1);
			expect(state.functionNames.has('f')).toBe(false);
			expect(state.functionNames.has('g')).toBe(true);
		});

		it('functionNames can be spread to array for parser config', () => {
			createFunctionBinding(state, 'f', ['x'], number('1'));
			createFunctionBinding(state, 'g', ['x'], number('2'));

			const names = [...state.functionNames];
			expect(names).toHaveLength(2);
			expect(names).toContain('f');
			expect(names).toContain('g');
		});
	});
});
