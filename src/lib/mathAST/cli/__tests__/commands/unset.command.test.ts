/**
 * Unit tests for the Unset command
 *
 * Tests the command that removes a single variable binding
 * from the evaluation state.
 */

import { describe, it, expect } from 'vitest';
import { UnsetCommand } from '../../commands/unset.command';
import { createEvalState, setBinding, hasBinding } from '../../core/eval-state';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

describe('UnsetCommand', () => {
	const command = new UnsetCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('unset');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('del');
			expect(command.aliases).toContain('delete');
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
		it('removes single variable', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'x')).toBe(false);
		});

		it('shows confirmation', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Removed');
			expect(result.output).toContain('x');
		});

		it('removes only specified variable', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);
			setBinding(evalState, 'y', parse('10').ast!);
			setBinding(evalState, 'z', parse('15').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'y',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'x')).toBe(true);
			expect(hasBinding(evalState, 'y')).toBe(false);
			expect(hasBinding(evalState, 'z')).toBe(true);
		});

		it('handles variable names with underscores', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'my_var', parse('100').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'my_var',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'my_var')).toBe(false);
		});

		it('handles multi-letter variable names', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'velocity', parse('100').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'velocity',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'velocity')).toBe(false);
		});

		it('handles variable starting with underscore', () => {
			const evalState = createEvalState();
			setBinding(evalState, '_private', parse('42').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '_private',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, '_private')).toBe(false);
		});

		it('trims whitespace from input', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '  x  ',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'x')).toBe(false);
		});
	});

	// =============================================================================
	// Error Handling
	// =============================================================================

	describe('error handling', () => {
		it('returns error when no evalState', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('returns error when variable does not exist', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('not defined');
		});

		it('returns error for empty variable name', () => {
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
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for invalid variable name (starts with number)', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: '5x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for invalid variable name (special characters)', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'x-y',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('Invalid variable name');
		});

		it('returns error for whitespace-only input', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: '   ',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('returns error message when no evalState', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.error?.message).toContain('evalState');
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('handles case-sensitive variable names', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);
			setBinding(evalState, 'X', parse('10').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'x')).toBe(false);
			expect(hasBinding(evalState, 'X')).toBe(true);
		});

		it('cannot remove already removed variable', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			// First removal
			const result1 = command.execute(ctx);
			expect(result1.success).toBe(true);

			// Second removal attempt
			const result2 = command.execute(ctx);
			expect(result2.success).toBe(false);
			expect(result2.error?.message).toContain('not defined');
		});

		it('does not affect mode when removing variable', () => {
			const evalState = createEvalState();
			evalState.mode = 'decimal';
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			expect(evalState.mode).toBe('decimal');
		});

		it('handles single-letter variables', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'a', parse('1').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'a',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'a')).toBe(false);
		});

		it('handles alphanumeric variable names', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'var123', parse('42').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'var123',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasBinding(evalState, 'var123')).toBe(false);
		});
	});
});
