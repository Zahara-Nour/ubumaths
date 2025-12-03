/**
 * Unit tests for the Normal command
 *
 * Tests the command that displays the detailed normal form structure
 * of mathematical expressions.
 */

import { describe, it, expect } from 'vitest';
import { NormalCommand } from '../../commands/normal.command';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

describe('NormalCommand', () => {
	const command = new NormalCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('normal');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('n');
			expect(command.aliases).toContain('norm');
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
		it('displays normal form structure', () => {
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
			expect(result.output).toContain('NormalForm:');
		});

		it('shows numerator', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Numerator');
		});

		it('shows denominator', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Denominator');
		});

		it('includes hash in output', () => {
			const pipelineResult = parse('x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Hash:');
		});

		it('includes polynomial string in output', () => {
			const pipelineResult = parse('x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Polynomial:');
		});

		it('shows term information', () => {
			const pipelineResult = parse('3x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '3x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Term');
			expect(result.output).toContain('coefficient');
			expect(result.output).toContain('monomial');
		});

		it('returns original AST', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.ast).toBe(pipelineResult.ast);
		});

		it('handles fractions', () => {
			const pipelineResult = parse('\\frac{a}{b}');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '\\frac{a}{b}',
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
			expect(result.error?.message).toContain('normalize');
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

		it('handles complex polynomial', () => {
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

		it('handles multiple terms', () => {
			const pipelineResult = parse('a + b + c');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'a + b + c',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			// Should show multiple terms
			expect(result.output).toContain('Term');
		});
	});
});
