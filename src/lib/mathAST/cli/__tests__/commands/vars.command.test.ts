/**
 * Unit tests for the Vars command
 *
 * Tests the command that lists all defined variables
 * and their values from the evaluation state.
 */

import { describe, it, expect } from 'vitest';
import { VarsCommand } from '../../commands/vars.command';
import { createEvalState, setBinding } from '../../core/eval-state';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

describe('VarsCommand', () => {
	const command = new VarsCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('vars');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('v');
			expect(command.aliases).toContain('variables');
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
		it('lists single variable', () => {
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
			expect(result.output).toContain('x');
			expect(result.output).toContain('5');
		});

		it('lists multiple variables', () => {
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
			expect(result.output).toContain('x');
			expect(result.output).toContain('y');
			expect(result.output).toContain('z');
		});

		it('shows Variables header', () => {
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
			expect(result.output).toContain('Variables');
		});

		it('sorts variables alphabetically', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'z', parse('3').ast!);
			setBinding(evalState, 'a', parse('1').ast!);
			setBinding(evalState, 'm', parse('2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			const lines = result.output.split('\n');
			const varLines = lines.filter((line) => line.includes('='));

			// Check order
			const aIndex = varLines.findIndex((line) => line.includes('a'));
			const mIndex = varLines.findIndex((line) => line.includes('m'));
			const zIndex = varLines.findIndex((line) => line.includes('z'));

			expect(aIndex).toBeLessThan(mIndex);
			expect(mIndex).toBeLessThan(zIndex);
		});

		it('displays variable values in custom syntax', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('2 + 3').ast!);

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
			expect(result.output).toContain('2+3');
		});

		it('handles complex expressions', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'a', parse('x^2 + 1').ast!);

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
			expect(result.output).toContain('a');
		});

		it('handles variables with underscores', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'my_var', parse('100').ast!);

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
			expect(result.output).toContain('my_var');
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
		it('handles empty variable list', () => {
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

		it('handles variable with zero value', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('0').ast!);

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
			expect(result.output).toContain('x');
			expect(result.output).toContain('0');
		});

		it('handles negative values', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('-5').ast!);

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
			expect(result.output).toContain('-5');
		});

		it('handles fractions', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('1/2').ast!);

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

		it('handles functions', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('sin(0)').ast!);

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
			expect(result.output).toContain('sin');
		});

		it('handles many variables', () => {
			const evalState = createEvalState();
			for (let i = 0; i < 50; i++) {
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
			expect(result.output).toContain('var0');
			expect(result.output).toContain('var49');
		});
	});
});
