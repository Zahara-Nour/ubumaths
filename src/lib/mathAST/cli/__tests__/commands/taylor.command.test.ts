/**
 * Unit tests for the Taylor command
 *
 * Tests the CLI command that computes Taylor series expansions
 * for mathematical expressions.
 */

import { describe, it, expect } from 'vitest';
import { TaylorCommand } from '../../commands/taylor.command';
import { createEvalState, createFunctionBinding } from '../../core/eval-state';
import { power, variable } from '../../../factory';
import type { CommandContext } from '../../types';

describe('TaylorCommand', () => {
	const command = new TaylorCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('taylor');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('tay');
			expect(command.aliases).toContain('series');
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
	// Basic Taylor Expansion
	// =============================================================================

	describe('basic Taylor expansion', () => {
		it('expands sin(x) with 5 terms', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x) 5 0',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Taylor series');
			expect(result.output).toContain('sin');
			expect(result.output).toContain('x');
		});

		it('expands exp(x) with 4 terms', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(x) 4 0',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Taylor series');
			// exp(x) = 1 + x + x^2/2 + x^3/6
			expect(result.output).toContain('1');
		});

		it('expands cos(x) with 4 terms', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'cos(x) 4 0',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Taylor series');
		});

		it('expands polynomial x^2', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x^2 3 0',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Polynomial should return itself
		});
	});

	// =============================================================================
	// Default Center (Maclaurin)
	// =============================================================================

	describe('default center (Maclaurin)', () => {
		it('uses center=0 when not specified', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x) 5',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Maclaurin');
			expect(result.output).toContain('x=0');
		});

		it('expands exp(x) with default center', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(x) 3',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Maclaurin');
		});
	});

	// =============================================================================
	// Non-zero Center
	// =============================================================================

	describe('non-zero center', () => {
		it('expands ln(x) at center=1', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'ln(x) 4 1',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('x=1');
		});

		it('expands exp(x) at center=1', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(x) 5 1',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('x=1');
		});

		it('expands with negative center', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(x) 4 -1',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('x=-1');
		});
	});

	// =============================================================================
	// Function Name Shortcuts
	// =============================================================================

	describe('function name shortcuts', () => {
		it('expands "sin" as sin(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin 5',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('sin');
		});

		it('expands "exp" as exp(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp 4',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('exp');
		});

		it('expands "cos" as cos(x)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'cos 5 0',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('cos');
		});
	});

	// =============================================================================
	// User-Defined Functions
	// =============================================================================

	describe('user-defined functions', () => {
		it('expands defined function f(x) = x^2', () => {
			const evalState = createEvalState();
			const xVar = variable('x');
			createFunctionBinding(evalState, 'f', ['x'], power(xVar, { type: 'number', value: '2' }));

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x) 4',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// f(x) = x^2, which is already a polynomial
		});

		it('expands function shortcut f when f is defined', () => {
			const evalState = createEvalState();
			const xVar = variable('x');
			createFunctionBinding(evalState, 'f', ['x'], power(xVar, { type: 'number', value: '3' }));

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f 4',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// f(x) = x^3
		});
	});

	// =============================================================================
	// Different Variables
	// =============================================================================

	describe('different variables', () => {
		it('detects variable t from sin(t)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(t) 5',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('t');
		});

		it('detects variable y from exp(y)', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(y) 4',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('y');
		});
	});

	// =============================================================================
	// Output Format
	// =============================================================================

	describe('output format', () => {
		it('includes LaTeX output', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x) 3',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('LaTeX:');
		});

		it('returns AST in result', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(x) 3',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.ast).toBeDefined();
		});

		it('shows number of terms in output', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x) 7',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('7 terms');
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

		it('returns error for missing terms', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x)',
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
				input: ')invalid 5',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for zero terms', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x) 0',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('returns error for too many terms', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x) 100',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('returns error for ln(x) at center=0', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'ln(x) 3 0',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			// ln(0) is undefined
		});

		it('returns error for 1/x at center=0', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '1/x 3 0',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});
	});

	// =============================================================================
	// Floating Point Center
	// =============================================================================

	describe('floating point center', () => {
		it('handles fractional center', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'sin(x) 5 0.5',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('x=0.5');
		});
	});

	// =============================================================================
	// Composite Functions
	// =============================================================================

	describe('composite functions', () => {
		it('expands sin(x^2) using LaTeX', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '\\sin(x^2) 5',
				format: 'latex',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('expands exp(sin(x))', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'exp(sin(x)) 4',
				format: 'custom',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});
	});

	// =============================================================================
	// LaTeX Input
	// =============================================================================

	describe('LaTeX input', () => {
		it('handles LaTeX fraction', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '\\frac{1}{1+x} 5',
				format: 'latex',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles LaTeX sqrt', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '\\sqrt{1+x} 4',
				format: 'latex',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});
	});

	// =============================================================================
	// Command Aliases
	// =============================================================================

	describe('command aliases', () => {
		it('alias tay works', () => {
			expect(command.aliases).toContain('tay');
		});

		it('alias series works', () => {
			expect(command.aliases).toContain('series');
		});
	});
});
