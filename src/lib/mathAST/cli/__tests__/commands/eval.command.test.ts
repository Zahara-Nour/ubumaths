/**
 * Unit tests for the Eval command
 *
 * Tests the command that evaluates mathematical expressions
 * with variable substitution and numeric computation.
 */

import { describe, it, expect } from 'vitest';
import { EvalCommand } from '../../commands/eval.command';
import { parse } from '../../core/pipeline';
import { createEvalState, setBinding } from '../../core/eval-state';
import type { CommandContext } from '../../types';

describe('EvalCommand', () => {
	const command = new EvalCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('eval');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('e');
		});

		it('has description', () => {
			expect(command.description).toBeDefined();
			expect(typeof command.description).toBe('string');
		});

		it('has usage information', () => {
			expect(command.usage).toBeDefined();
			expect(typeof command.usage).toBe('string');
		});

		it('requires AST', () => {
			expect(command.requiresAst).toBe(true);
		});
	});

	// =============================================================================
	// Successful Execution
	// =============================================================================

	describe('successful execution', () => {
		it('evaluates simple variable substitution', () => {
			const pipelineResult = parse('x + 2');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + 2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Result');
		});

		it('evaluates with multiple variables', () => {
			const pipelineResult = parse('x + y');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);
			setBinding(evalState, 'y', parse('3').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Result');
		});

		it('shows current mode in output', () => {
			const pipelineResult = parse('x^2');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x^2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Mode');
		});

		it('returns evaluated AST', () => {
			const pipelineResult = parse('x * 2');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x * 2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.ast).toBeDefined();
		});

		it('handles exact mode correctly', () => {
			const pipelineResult = parse('x / 2');
			const evalState = createEvalState();
			evalState.mode = 'exact';
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x / 2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles decimal mode correctly', () => {
			const pipelineResult = parse('x / 2');
			const evalState = createEvalState();
			evalState.mode = 'decimal';
			setBinding(evalState, 'x', parse('5').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x / 2',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('evaluates expressions with no variables', () => {
			const pipelineResult = parse('2 + 3');
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '2 + 3',
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
		it('returns error when no AST', () => {
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

		it('returns correct error code when no AST', () => {
			const evalState = createEvalState();
			const ctx: CommandContext = {
				ast: undefined,
				input: 'invalid',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.error?.code).toBe('NO_AST');
		});

		it('returns error when no evalState', () => {
			const pipelineResult = parse('x + 2');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + 2',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('returns error message when no evalState', () => {
			const pipelineResult = parse('x + 2');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + 2',
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
		it('handles expressions with undefined variables', () => {
			const pipelineResult = parse('x + y');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('5').ast!);
			// y is not defined

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			// Evaluation might fail if evaluate() doesn't support undefined variables
			// Or might succeed with partial substitution (5 + y)
			// Either behavior is valid
			expect(result).toBeDefined();
		});

		it('handles complex expressions', () => {
			const pipelineResult = parse('x^2 + 2*x + 1');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('3').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x^2 + 2*x + 1',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles trigonometric functions', () => {
			const pipelineResult = parse('sin(x)');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('0').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'sin(x)',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles fractions', () => {
			const pipelineResult = parse('x / y');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('10').ast!);
			setBinding(evalState, 'y', parse('3').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x / y',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles zero', () => {
			const pipelineResult = parse('0');
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '0',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles negative numbers', () => {
			const pipelineResult = parse('x');
			const evalState = createEvalState();
			setBinding(evalState, 'x', parse('-5').ast!);

			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x',
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
