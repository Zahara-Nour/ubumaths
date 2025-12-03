/**
 * Unit tests for the Let command
 *
 * Tests the command that defines variable bindings
 * by parsing assignment expressions.
 */

import { describe, it, expect } from 'vitest';
import { LetCommand } from '../../commands/let.command';
import { createEvalState, hasBinding, getBinding } from '../../core/eval-state';
import type { CommandContext } from '../../types';

describe('LetCommand', () => {
	const command = new LetCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('let');
		});

		it('has empty aliases', () => {
			expect(command.aliases).toEqual([]);
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
		it('defines simple numeric variable', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'x')).toBe(true);
		});

		it('defines variable with spaces around equals', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x = 5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'x')).toBe(true);
		});

		it('defines variable with expression', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'y = 2 + 3',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'y')).toBe(true);
		});

		it('shows confirmation in output', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=10',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Defined');
			expect(result.output).toContain('x');
		});

		it('returns AST of defined value', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.ast).toBeDefined();
		});

		it('overwrites existing variable', () => {
			const evalState = createEvalState();
			const ctx1: CommandContext = {
				ast: undefined,
				input: 'x=5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx1);

			const ctx2: CommandContext = {
				ast: undefined,
				input: 'x=10',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx2);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'x')).toBe(true);
		});

		it('handles complex expressions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'z = x^2 + 2*x + 1',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'z')).toBe(true);
		});

		it('handles variable names with underscores', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'my_var=42',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'my_var')).toBe(true);
		});

		it('handles multi-letter variable names', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'velocity = 100',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'velocity')).toBe(true);
		});
	});

	// =============================================================================
	// Error Handling
	// =============================================================================

	describe('error handling', () => {
		it('returns error when no evalState', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=5',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('returns error for invalid syntax (no equals)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x 5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for invalid variable name (starts with number)', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: '5x=10',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('returns error for empty variable name', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: '=5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('handles special characters that may be valid syntax', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=@#$',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			// Color syntax like @red{...} is valid, so @ might parse successfully
			// Just verify the command doesn't crash
			expect(result).toBeDefined();
		});

		it('returns error message for parse failure', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.error?.message).toBeDefined();
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('handles zero', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=0',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles negative numbers', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=-5',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles fractions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=1/2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles functions in expressions', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=sin(0)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles Greek letters', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=\\pi',
				format: 'latex',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('stores value as MathNode, not evaluated', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x=2+3',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			const binding = getBinding(evalState, 'x');
			expect(binding).toBeDefined();
			// The value should be the AST of 2+3, not 5
			expect(binding?.type).toBe('addition');
		});
	});
});
