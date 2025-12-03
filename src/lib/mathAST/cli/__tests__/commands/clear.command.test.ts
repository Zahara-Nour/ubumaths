/**
 * Unit tests for the Clear command
 *
 * Tests the command that clears all variable bindings
 * from the evaluation state.
 */

import { describe, it, expect } from 'vitest';
import { ClearCommand } from '../../commands/clear.command';
import { createEvalState, setBinding, getBindingCount } from '../../core/eval-state';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

describe('ClearCommand', () => {
	const command = new ClearCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('clear');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('clr');
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
		it('clears single variable', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(getBindingCount(evalState)).toBe(0);
		});

		it('clears multiple variables', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);
			setBinding(evalState, 'y', parse('10').ast!);
			setBinding(evalState, 'z', parse('15').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(getBindingCount(evalState)).toBe(0);
		});

		it('shows confirmation with count', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);
			setBinding(evalState, 'y', parse('10').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Cleared');
			expect(result.output).toContain('2');
		});

		it('shows singular form for one variable', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('1');
			expect(result.output).toContain('variable');
		});

		it('shows plural form for multiple variables', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);
			setBinding(evalState, 'y', parse('10').ast!);
			setBinding(evalState, 'z', parse('15').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('3');
			expect(result.output).toContain('variable');
		});

		it('handles clearing many variables', () => {
			const evalState = createEvalState();
			for (let i = 0; i < 100; i++) {
				setBinding(evalState, `var${i}`, parse(`${i}`).ast!);
			}

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('100');
			expect(getBindingCount(evalState)).toBe(0);
		});
	});

	// =============================================================================
	// Error Handling
	// =============================================================================

	describe('error handling', () => {
		it('returns error when no evalState', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('returns error message when no evalState', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '',
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
		it('handles clearing empty state', () => {
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
			expect(result.success).toBe(true);
			expect(result.output).toContain('No variables');
		});

		it('can be called multiple times', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			// First clear
			command.execute(ctx);
			expect(getBindingCount(evalState)).toBe(0);

			// Second clear (empty state)
			const result2 = command.execute(ctx);
			expect(result2.success).toBe(true);
			expect(result2.output).toContain('No variables');
		});

		it('clears variables with complex values', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('x^2 + sin(y) / z').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(getBindingCount(evalState)).toBe(0);
		});

		it('clears variables with special names', () => {
			const evalState = createEvalState();
			setBinding(evalState, '_private', parse('1').ast!);
			setBinding(evalState, 'CONSTANT', parse('2').ast!);
			setBinding(evalState, 'camelCase', parse('3').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(getBindingCount(evalState)).toBe(0);
		});

		it('returns success status', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});
	});
});
