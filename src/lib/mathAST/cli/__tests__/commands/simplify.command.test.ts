/**
 * Unit tests for the Simplify command
 *
 * Tests the command that simplifies mathematical expressions
 * and displays the canonical form with hash.
 */

import { describe, it, expect } from 'vitest';
import { SimplifyCommand } from '../../commands/simplify.command';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

describe('SimplifyCommand', () => {
	const command = new SimplifyCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('simplify');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('s');
			expect(command.aliases).toContain('simp');
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
		it('simplifies like terms', () => {
			const pipelineResult = parse('2x + 3x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '2x + 3x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Simplified');
		});

		it('includes LaTeX output', () => {
			const pipelineResult = parse('x + x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('LaTeX:');
		});

		it('includes custom syntax output', () => {
			const pipelineResult = parse('x + x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Custom:');
		});

		it('includes hash in output', () => {
			const pipelineResult = parse('x + x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Hash:');
		});

		it('returns simplified AST', () => {
			const pipelineResult = parse('x + 0');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + 0',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.ast).toBeDefined();
		});

		it('handles numbers', () => {
			const pipelineResult = parse('2 + 3');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '2 + 3',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles complex expressions', () => {
			const pipelineResult = parse('x^2 + 2x + 1');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x^2 + 2x + 1',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles fractions', () => {
			const pipelineResult = parse('\\frac{2}{4}');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '\\frac{2}{4}',
				format: 'latex',
				options: {},
				isRepl: false
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
			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('returns correct error code when no AST', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: 'invalid',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.error?.code).toBe('NO_AST');
		});

		it('returns error message when no AST', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.error?.message).toBeDefined();
			expect(result.error?.message).toContain('simplify');
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('handles single variable', () => {
			const pipelineResult = parse('x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles single number', () => {
			const pipelineResult = parse('42');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '42',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles zero', () => {
			const pipelineResult = parse('0');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '0',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles negative numbers', () => {
			const pipelineResult = parse('-5');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '-5',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});
	});
});
