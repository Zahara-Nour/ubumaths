/**
 * Unit tests for the Undef command
 *
 * Tests the command that removes a single function binding
 * from the evaluation state.
 */

import { describe, it, expect } from 'vitest';
import { UndefCommand } from '../../commands/undef.command';
import {
	createEvalState,
	createFunctionBinding,
	hasFunction,
	setBinding
} from '../../core/eval-state';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

describe('UndefCommand', () => {
	const command = new UndefCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('undef');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('delfn');
			expect(command.aliases).toContain('rmfn');
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
		it('removes single function', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(false);
		});

		it('shows confirmation', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Removed');
			expect(result.output).toContain('f');
		});

		it('removes only specified function', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);
			createFunctionBinding(evalState, 'g', ['x'], parse('x+1').ast!);
			createFunctionBinding(evalState, 'h', ['x'], parse('2*x').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'g',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(true);
			expect(hasFunction(evalState, 'g')).toBe(false);
			expect(hasFunction(evalState, 'h')).toBe(true);
		});

		it('handles function names with underscores', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'my_func', ['x'], parse('x').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'my_func',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'my_func')).toBe(false);
		});

		it('handles multi-letter function names', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'quadratic', ['x'], parse('x^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'quadratic',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'quadratic')).toBe(false);
		});

		it('handles function starting with underscore', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, '_private', ['x'], parse('x').ast!);

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
			expect(hasFunction(evalState, '_private')).toBe(false);
		});

		it('trims whitespace from input', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: '  f  ',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(false);
		});
	});

	// =============================================================================
	// Error Handling
	// =============================================================================

	describe('error handling', () => {
		it('returns error when no evalState', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
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

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('not defined');
		});

		it('returns error for empty function name', () => {
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

		it('returns error for invalid function name (starts with number)', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: '5f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for invalid function name (special characters)', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f-g',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('Invalid function name');
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
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.error?.message).toContain('evalState');
		});

		it('returns error if input contains parentheses', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('Invalid function name');
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('handles case-sensitive function names', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x').ast!);
			createFunctionBinding(evalState, 'F', ['x'], parse('x^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(false);
			expect(hasFunction(evalState, 'F')).toBe(true);
		});

		it('cannot remove already removed function', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
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

		it('does not affect mode when removing function', () => {
			const evalState = createEvalState();
			evalState.mode = 'decimal';
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			expect(evalState.mode).toBe('decimal');
		});

		it('does not affect variable bindings', () => {
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);
			createFunctionBinding(evalState, 'f', ['y'], parse('y^2').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			expect(evalState.bindings.has('x')).toBe(true);
		});

		it('handles single-letter functions', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'a', ['x'], parse('x').ast!);

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
			expect(hasFunction(evalState, 'a')).toBe(false);
		});

		it('handles alphanumeric function names', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'func123', ['x'], parse('x').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'func123',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'func123')).toBe(false);
		});

		it('removes function from functionNames set', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);

			expect(evalState.functionNames.has('f')).toBe(true);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			expect(evalState.functionNames.has('f')).toBe(false);
		});

		it('preserves other functions when removing one', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], parse('x^2').ast!);
			createFunctionBinding(evalState, 'g', ['x'], parse('x+1').ast!);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);

			expect(hasFunction(evalState, 'f')).toBe(false);
			expect(hasFunction(evalState, 'g')).toBe(true);
			expect(evalState.functionNames.size).toBe(1);
		});

		it('function with derivative and inverse is fully removed', () => {
			const evalState = createEvalState();
			createFunctionBinding(
				evalState,
				'f',
				['x'],
				parse('x^2').ast!,
				parse('2*x').ast!, // derivative
				parse('sqrt(x)').ast! // inverse
			);

			const ctx: CommandContext = {
				ast: undefined,
				input: 'f',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(hasFunction(evalState, 'f')).toBe(false);
			expect(evalState.functions['f']).toBeUndefined();
		});
	});
});
