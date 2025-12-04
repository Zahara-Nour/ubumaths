/**
 * Unit tests for the DefDeriv command
 *
 * Tests the command that manually sets or overrides function derivatives.
 */

import { describe, it, expect } from 'vitest';
import { DefDerivCommand } from '../../commands/def-deriv.command';
import { DefCommand } from '../../commands/def.command';
import { createEvalState, getFunction, createFunctionBinding } from '../../core/eval-state';
import { number, variable, power } from '../../../factory';
import type { CommandContext } from '../../types';

describe('DefDerivCommand', () => {
	const command = new DefDerivCommand();
	const defCommand = new DefCommand();

	// Helper to create a context
	function createContext(input: string, evalState = createEvalState()): CommandContext {
		return {
			ast: undefined,
			input,
			format: 'custom',
			options: {},
			isRepl: true,
			evalState
		};
	}

	// Helper to define a function first
	function defineFunction(evalState: ReturnType<typeof createEvalState>, definition: string): void {
		const ctx = createContext(definition, evalState);
		defCommand.execute(ctx);
	}

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name with single quote', () => {
			expect(command.name).toBe("def'");
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain("fn'");
		});

		it('has description', () => {
			expect(command.description).toBeDefined();
			expect(typeof command.description).toBe('string');
			expect(command.description).toContain('derivative');
		});

		it('has usage information', () => {
			expect(command.usage).toBeDefined();
			expect(typeof command.usage).toBe('string');
		});

		it('does not require AST', () => {
			expect(command.requiresAst).toBe(false);
		});
	});

	// =============================================================================
	// Successful Execution
	// =============================================================================

	describe('successful execution', () => {
		it('sets derivative for existing function', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f = 2x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			const fn = getFunction(evalState, 'f');
			expect(fn?.derivative).toBeDefined();
		});

		it('shows confirmation message with Set prefix', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f = 2x', evalState);
			const result = command.execute(ctx);

			expect(result.output).toContain('Set');
			expect(result.output).toContain("f'(x)");
		});

		it('shows manual override indicator', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f = 3x', evalState);
			const result = command.execute(ctx);

			expect(result.output).toContain('manual override');
		});

		it('overrides auto-computed derivative', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			// Auto-computed should be 2x, now override with 3x
			const ctx = createContext('f = 3x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('3');
		});

		it('handles complex derivative expressions', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^3');

			const ctx = createContext('f = 3*x^2 + 1', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			const fn = getFunction(evalState, 'f');
			expect(fn?.derivative).toBeDefined();
		});

		it('handles trigonometric derivatives', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = sin(x)');

			const ctx = createContext('f = cos(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles multi-parameter function derivatives', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'g(x, y) = x*y');

			const ctx = createContext('g = y', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain("g'(x, y)");
		});

		it('returns AST of derivative expression', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f = 2x', evalState);
			const result = command.execute(ctx);

			expect(result.ast).toBeDefined();
		});

		it('handles spaces around equals sign', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f=2x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles extra whitespace in input', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('  f  =  2x  ', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles function with underscore in name', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'my_func(x) = x^2');

			const ctx = createContext('my_func = 2x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles constant derivative', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x');

			const ctx = createContext('f = 1', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles zero derivative', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = 5');

			const ctx = createContext('f = 0', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles fraction derivative', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = 1/x');

			const ctx = createContext('f = -1/x^2', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});
	});

	// =============================================================================
	// Error Handling
	// =============================================================================

	describe('error handling', () => {
		it('returns error when no evalState', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f = 2x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('returns error when function does not exist', () => {
			const evalState = createEvalState();
			const ctx = createContext('f = 2x', evalState);

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
			expect(result.error?.message).toContain("'f'");
			expect(result.error?.message).toContain('not defined');
		});

		it('returns error for invalid syntax (no equals)', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f 2x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for invalid syntax (starts with number)', () => {
			const evalState = createEvalState();

			const ctx = createContext('5f = 2x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for empty input', () => {
			const evalState = createEvalState();
			const ctx = createContext('', evalState);

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('returns error for invalid derivative expression', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f = )', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for expression with only equals', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f =', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(false);
		});

		it('suggests using .def when function not found', () => {
			const evalState = createEvalState();
			const ctx = createContext('unknown_func = 2x', evalState);

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('.def');
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('preserves function expression when setting derivative', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^3');
			const originalExpr = getFunction(evalState, 'f')?.expression;

			const ctx = createContext('f = 3*x^2', evalState);
			command.execute(ctx);

			const fn = getFunction(evalState, 'f');
			expect(fn?.expression).toEqual(originalExpr);
		});

		it('preserves function parameters when setting derivative', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'g(a, b) = a + b');
			const originalParams = getFunction(evalState, 'g')?.parameters;

			const ctx = createContext('g = 1', evalState);
			command.execute(ctx);

			const fn = getFunction(evalState, 'g');
			expect(fn?.parameters).toEqual(originalParams);
		});

		it('can set derivative multiple times', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');

			// First override
			command.execute(createContext('f = 2x', evalState));
			expect(getFunction(evalState, 'f')?.derivative).toBeDefined();

			// Second override
			command.execute(createContext('f = 3x', evalState));
			// Derivative should be updated (contains 3)
			const fn = getFunction(evalState, 'f');
			expect(fn?.derivative).toBeDefined();
		});

		it('handles negative derivative', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = -x');

			const ctx = createContext('f = -1', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles derivative with multiple variables (partial)', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x, y) = x*y');

			// Setting partial derivative with respect to x (treating y as constant)
			const ctx = createContext('f = y', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('does not affect other functions', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f(x) = x^2');
			defineFunction(evalState, 'g(x) = x^3');

			const ctx = createContext('f = 10', evalState);
			command.execute(ctx);

			// g should still have its auto-computed derivative
			const gDef = getFunction(evalState, 'g');
			expect(gDef?.derivative).toBeDefined();
		});

		it('does not affect variable bindings', () => {
			const evalState = createEvalState();
			evalState.bindings.set('a', number('5'));
			defineFunction(evalState, 'f(x) = x^2');

			const ctx = createContext('f = 2x', evalState);
			command.execute(ctx);

			expect(evalState.bindings.has('a')).toBe(true);
		});

		it('handles function created via API', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'g', ['x'], power(variable('x'), number('2')));

			const ctx = createContext('g = 2x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});
	});

	// =============================================================================
	// Integration with DefCommand
	// =============================================================================

	describe('integration with DefCommand', () => {
		it('overrides auto-computed derivative from DefCommand', () => {
			const evalState = createEvalState();

			// Define with auto-computed derivative
			defineFunction(evalState, 'f(x) = x^2');
			const autoDeriv = getFunction(evalState, 'f')?.derivative;
			expect(autoDeriv).toBeDefined();

			// Override with manual derivative
			const ctx = createContext('f = 100', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			const manualDeriv = getFunction(evalState, 'f')?.derivative;
			// Manual derivative should be different (100 vs 2x)
			expect(manualDeriv).not.toEqual(autoDeriv);
		});

		it('works after function is redefined', () => {
			const evalState = createEvalState();

			// Define first version
			defineFunction(evalState, 'f(x) = x^2');

			// Set manual derivative
			command.execute(createContext('f = custom', evalState));

			// Redefine function (auto-computes new derivative)
			defineFunction(evalState, 'f(x) = x^3');

			// Set manual derivative again
			const result = command.execute(createContext('f = manual', evalState));

			expect(result.success).toBe(true);
		});
	});
});
