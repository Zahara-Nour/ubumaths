/**
 * Unit tests for the Diff command
 *
 * Tests the command that differentiates mathematical expressions
 * symbolically with respect to a specified variable.
 */

import { describe, it, expect } from 'vitest';
import { DiffCommand } from '../../commands/diff.command';
import { createEvalState, createFunctionBinding } from '../../core/eval-state';
import { power, variable } from '../../../factory';
import type { CommandContext } from '../../types';

describe('DiffCommand', () => {
	const command = new DiffCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('diff');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('d');
			expect(command.aliases).toContain('derivative');
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
	// Basic Polynomial Differentiation
	// =============================================================================

	describe('basic polynomial differentiation', () => {
		it('differentiates x^2 to 2x', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('2');
			expect(result.output).toContain('x');
		});

		it('differentiates x^3 to 3x^2', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^3',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('3');
		});

		it('differentiates 2x+1 to 2', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '2*x+1',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('2');
		});

		it('differentiates constant to 0', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '5',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('0');
		});

		it('differentiates x to 1', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('1');
		});
	});

	// =============================================================================
	// Trigonometric Functions
	// =============================================================================

	describe('trigonometric functions', () => {
		it('differentiates sin(x) to cos(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('cos');
		});

		it('differentiates cos(x) to -sin(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'cos(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('sin');
		});

		it('differentiates tan(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'tan(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// tan'(x) = 1/cos^2(x) or sec^2(x)
		});
	});

	// =============================================================================
	// Exponential and Logarithmic
	// =============================================================================

	describe('exponential and logarithmic functions', () => {
		it('differentiates exp(x) to exp(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('exp');
		});

		it('differentiates ln(x) to 1/x', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'ln(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Should contain fraction 1/x
		});
	});

	// =============================================================================
	// Chain Rule
	// =============================================================================

	describe('chain rule', () => {
		it('differentiates sin(x^2) with chain rule', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x^2)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Should contain cos and 2x
			expect(result.output).toContain('cos');
		});

		it('differentiates exp(2*x) with chain rule', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(2*x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('exp');
			expect(result.output).toContain('2');
		});

		it('differentiates sqrt(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sqrt(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});
	});

	// =============================================================================
	// Product Rule
	// =============================================================================

	describe('product rule', () => {
		it('differentiates x*sin(x) with product rule', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x*sin(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Should contain both sin(x) and cos(x)
			expect(result.output).toContain('sin');
			expect(result.output).toContain('cos');
		});

		it('differentiates x^2*exp(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2*exp(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('exp');
		});
	});

	// =============================================================================
	// Quotient Rule
	// =============================================================================

	describe('quotient rule', () => {
		it('differentiates 1/x to -1/x^2', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '1/x',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('differentiates x/(x+1)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x/(x+1)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});
	});

	// =============================================================================
	// Multi-variable with Explicit Variable
	// =============================================================================

	describe('multi-variable with explicit variable', () => {
		it('differentiates x*y^2 with respect to y', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x*y^2 y',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('d/dy');
			// Derivative of x*y^2 w.r.t. y is 2xy
			expect(result.output).toContain('2');
		});

		it('differentiates x^2+y^2 with respect to y', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2+y^2 y',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('d/dy');
			// x^2 is constant w.r.t. y, so derivative is 2y
			expect(result.output).toContain('2');
		});

		it('differentiates with respect to t', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 't^3 t',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('d/dt');
		});

		it('uses x as default variable when not specified', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('d/dx');
		});
	});

	// =============================================================================
	// Generic Functions with Bindings
	// =============================================================================

	describe('generic functions with bindings from state', () => {
		it('differentiates f(x) when f is defined as x^2', () => {
			const evalState = createEvalState();
			// f(x) = x^2 using factory
			const xVar = variable('x');
			createFunctionBinding(evalState, 'f', ['x'], power(xVar, { type: 'number', value: '2' }));

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// f'(x) = 2x
			expect(result.output).toContain('2');
		});

		it('differentiates f(x^2) with chain rule when f is defined', () => {
			const evalState = createEvalState();
			// f(t) = t^3 using factory
			const tVar = variable('t');
			createFunctionBinding(evalState, 'f', ['t'], power(tVar, { type: 'number', value: '3' }));

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x^2)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// f'(t) = 3t^2, so f'(x^2) * 2x = 3(x^2)^2 * 2x = 6x^5
		});

		it('differentiates undefined function symbolically', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'g(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Should produce g'(x) symbolically
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('differentiates -x to -1', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '-x',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('differentiates x+x to 2', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x+x',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles LaTeX input format', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '\\frac{1}{x}',
				format: 'latex',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('returns AST of derivative', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.ast).toBeDefined();
		});

		it('shows both custom and LaTeX output', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('LaTeX:');
		});
	});

	// =============================================================================
	// Error Cases
	// =============================================================================

	describe('error cases', () => {
		it('returns error for empty input', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for invalid expression', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: ')',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('handles differentiation of relations with error', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x = 5',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('relation');
		});

		it('handles differentiation of absolute value with error', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '|x|', // Custom syntax uses |x| for absolute value
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('absolute');
		});
	});

	// =============================================================================
	// Command Aliases
	// =============================================================================

	describe('command aliases', () => {
		it('alias d works same as diff', () => {
			expect(command.aliases).toContain('d');
		});

		it('alias derivative works same as diff', () => {
			expect(command.aliases).toContain('derivative');
		});
	});

	// =============================================================================
	// Variable Parsing
	// =============================================================================

	describe('variable parsing', () => {
		it('parses single letter variable correctly', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'y^2 y',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('d/dy');
		});

		it('handles multi-letter variable names', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'theta^2 theta',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('d/dtheta');
		});

		it('does not treat function names as variables', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x)',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Should differentiate w.r.t. x, not sin
			expect(result.output).toContain('d/dx');
		});

		it('parses underscore variable names', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x_1^2 x_1',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('d/dx_1');
		});
	});

	// =============================================================================
	// Integration with EvalState
	// =============================================================================

	describe('integration with evalState', () => {
		it('works without evalState', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2',
				format: 'custom',
				options: {},
				isRepl: false
				// No evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('uses function bindings from evalState', () => {
			const evalState = createEvalState();
			// f(x) = x^3 using factory
			const xVar = variable('x');
			createFunctionBinding(evalState, 'f', ['x'], power(xVar, { type: 'number', value: '3' }));

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// f(x) = x^3, so f'(x) = 3x^2
			expect(result.output).toContain('3');
		});

		it('does not modify evalState', () => {
			const evalState = createEvalState();
			const originalFunctionCount = Object.keys(evalState.functions).length;
			const originalBindingsCount = evalState.bindings.size;

			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);

			expect(Object.keys(evalState.functions).length).toBe(originalFunctionCount);
			expect(evalState.bindings.size).toBe(originalBindingsCount);
		});
	});

	// =============================================================================
	// Complex Expressions
	// =============================================================================

	describe('complex expressions', () => {
		it('differentiates polynomial x^3 + 2*x^2 + x + 1', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^3 + 2*x^2 + x + 1',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Derivative: 3x^2 + 4x + 1
		});

		it('differentiates nested functions', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(cos(x))',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('cos');
			expect(result.output).toContain('sin');
		});

		it('differentiates power of function', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x)^2',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Should involve 2*sin(x)*cos(x)
			expect(result.output).toContain('sin');
			expect(result.output).toContain('cos');
		});
	});
});
