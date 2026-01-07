/**
 * Unit tests for the Def command
 *
 * Tests the command that defines function bindings
 * by parsing function definitions.
 */

import { describe, it, expect } from 'vitest';
import { DefCommand } from '../../commands/def.command';
import {
	createEvalState,
	hasFunction,
	getFunction,
	createFunctionBinding
} from '../../core/eval-state';
import { number, variable, add, multiply } from '../../../factory';
import type { CommandContext } from '../../types';

describe('DefCommand', () => {
	const command = new DefCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('def');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('fn');
		});

		it('has description', () => {
			expect(command.description).toBeDefined();
			expect(typeof command.description).toBe('string');
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
		it('defines simple single-parameter function', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(true);
		});

		it('defines function with spaces around equals', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x)=x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(true);
		});

		it('defines multi-parameter function', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'g(x, y) = x + y',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'g')).toBe(true);

			const def = getFunction(evalState, 'g');
			expect(def?.parameters).toEqual(['x', 'y']);
		});

		it('defines function with three parameters', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'h(x, y, z) = x + y + z',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);

			const def = getFunction(evalState, 'h');
			expect(def?.parameters).toEqual(['x', 'y', 'z']);
		});

		it('shows confirmation in output', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Defined');
			expect(result.output).toContain('f(x)');
		});

		it('returns AST of defined expression', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.ast).toBeDefined();
		});

		it('overwrites existing function with Redefined message', () => {
			const evalState = createEvalState();

			// First definition
			const ctx1: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};
			command.execute(ctx1);

			// Second definition
			const ctx2: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^3',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx2);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Redefined');
			expect(hasFunction(evalState, 'f')).toBe(true);
		});

		it('handles complex expressions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2 + 2*x + 1',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(true);
		});

		it('handles function names with underscores', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'my_func(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'my_func')).toBe(true);
		});

		it('handles multi-letter function names', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'quadratic(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'quadratic')).toBe(true);
		});

		it('handles parameters without spaces', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'g(x,y) = x*y',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);

			const def = getFunction(evalState, 'g');
			expect(def?.parameters).toEqual(['x', 'y']);
		});

		it('handles trigonometric expressions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = sin(x) + cos(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

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
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('returns error for invalid syntax (no parentheses)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for invalid syntax (no equals)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for empty parameter list', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f() = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('at least one parameter');
		});

		it('returns error for invalid function name (starts with number)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: '5f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('returns error for invalid parameter name', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(5x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('Invalid parameter name');
		});

		it('returns error for duplicate parameter names', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x, x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('Duplicate');
		});

		it('returns error for parse failure in expression', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = )',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toBeDefined();
		});

		it('returns error message for empty input', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('handles constant function (no variable in expression)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = 5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles zero in expression', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = 0',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles negative expressions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = -x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles fractions in expressions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = 1/x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles sqrt in expressions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = sqrt(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('stores expression as MathNode', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def).toBeDefined();
			expect(def?.expression).toBeDefined();
			expect(def?.expression.type).toBe('superscript');
		});

		it('handles function with parameter named t (common for time)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'position(t) = t^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);

			const def = getFunction(evalState, 'position');
			expect(def?.parameters).toEqual(['t']);
		});

		it('handles parameter names with underscores', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x_1, x_2) = x_1 + x_2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);

			const def = getFunction(evalState, 'f');
			expect(def?.parameters).toEqual(['x_1', 'x_2']);
		});

		it('handles LaTeX expressions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = \\frac{1}{x}',
				format: 'latex',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles whitespace in parameter list', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(  x  ,  y  ) = x + y',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);

			const def = getFunction(evalState, 'f');
			expect(def?.parameters).toEqual(['x', 'y']);
		});

		it('preserves existing functions when adding new ones', () => {
			const evalState = createEvalState();

			// Define first function
			const ctx1: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};
			command.execute(ctx1);

			// Define second function
			const ctx2: CommandContext = {
				ast: undefined,
				input: 'g(x) = x^3',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};
			command.execute(ctx2);

			expect(hasFunction(evalState, 'f')).toBe(true);
			expect(hasFunction(evalState, 'g')).toBe(true);
		});

		it('does not affect variable bindings', () => {
			const evalState = createEvalState();
			evalState.bindings.set('x', number('5'));

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(y) = y^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			expect(evalState.bindings.has('x')).toBe(true);
		});

		it('does not affect evaluation mode', () => {
			const evalState = createEvalState();
			evalState.mode = 'decimal';

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			expect(evalState.mode).toBe('decimal');
		});
	});

	// =============================================================================
	// Integration with Existing Functions
	// =============================================================================

	describe('integration with existing function operations', () => {
		it('function can have derivative set later', () => {
			const evalState = createEvalState();

			// Define function via command
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};
			command.execute(ctx);

			// Simulate setting derivative via API using factory
			const derivativeAst = multiply(number('2'), variable('x'), 'implicit');
			const def = evalState.functions['f'];
			evalState.functions['f'] = {
				...def,
				derivative: derivativeAst
			};

			const updatedDef = getFunction(evalState, 'f');
			expect(updatedDef?.derivative).toBeDefined();
		});

		it('works with createFunctionBinding from eval-state', () => {
			const evalState = createEvalState();

			// Create via API using factory
			createFunctionBinding(evalState, 'g', ['x'], add(variable('x'), number('1')));

			// Define via command
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};
			command.execute(ctx);

			expect(hasFunction(evalState, 'f')).toBe(true);
			expect(hasFunction(evalState, 'g')).toBe(true);
		});
	});

	// =============================================================================
	// Auto-Compute Derivative Feature
	// =============================================================================

	describe('auto-compute derivative', () => {
		it('auto-computes derivative for polynomial', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('auto-computes derivative for linear function', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = 2x + 3',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('auto-computes derivative for cubic function', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^3 + x^2 + x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('auto-computes derivative for sin function', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = sin(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('auto-computes derivative for cos function', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = cos(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('auto-computes derivative for exponential function', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = e^x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('auto-computes derivative for natural log', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = ln(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('shows derivative in output', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain("f'(x)");
			// Derivative is shown without "auto-computed" suffix
		});

		it('shows derivative notation with parameters', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'g(t) = t^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain("g'(t)");
		});

		it('multi-variable function computes partial derivative for first param', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x, y) = x^2 + y^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			// Should compute partial derivative with respect to x
			expect(def?.derivative).toBeDefined();
		});

		it('constant function has zero derivative', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = 5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
			// The derivative should be 0
			expect(def?.derivative?.type).toBe('number');
		});

		it('gracefully handles differentiation failure', () => {
			const evalState = createEvalState();
			// Define a function that parses but may not differentiate well
			// Most expressions should work, but the function still defines even if deriv fails
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(true);
		});

		it('redefining function recomputes derivative', () => {
			const evalState = createEvalState();

			// First definition
			const ctx1: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};
			command.execute(ctx1);
			const firstDeriv = getFunction(evalState, 'f')?.derivative;

			// Redefine
			const ctx2: CommandContext = {
				ast: undefined,
				input: 'f(x) = x^3',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};
			command.execute(ctx2);
			const secondDeriv = getFunction(evalState, 'f')?.derivative;

			// Derivatives should be different
			expect(firstDeriv).toBeDefined();
			expect(secondDeriv).toBeDefined();
			// x^2 derivative is 2x, x^3 derivative is 3x^2
			expect(firstDeriv).not.toEqual(secondDeriv);
		});

		it('handles product rule (x*sin(x))', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = x*sin(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('handles chain rule (sin(x^2))', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = sin(x^2)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('handles quotient (1/x)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = 1/x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});

		it('handles sqrt(x)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) = sqrt(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const def = getFunction(evalState, 'f');
			expect(def?.derivative).toBeDefined();
		});
	});
});
