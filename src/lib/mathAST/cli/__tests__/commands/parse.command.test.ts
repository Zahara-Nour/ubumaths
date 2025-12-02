/**
 * Unit tests for the Parse command
 *
 * Tests the primary command that parses mathematical expressions
 * and displays both AST tree and LaTeX output.
 */

import { describe, it, expect } from 'vitest';
import { ParseCommand } from '../../commands/parse.command';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

describe('ParseCommand', () => {
	const command = new ParseCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('parse');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('p');
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
		it('executes successfully with valid AST', () => {
			const pipelineResult = parse('x^2');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x^2',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toBeDefined();
		});

		it('includes AST tree in output', () => {
			const pipelineResult = parse('x^2');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x^2',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Superscript');
		});

		it('includes LaTeX in output', () => {
			const pipelineResult = parse('x^2');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x^2',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('LaTeX:');
		});

		it('returns AST in result', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.ast).toBeDefined();
			expect(result.ast?.type).toBe('addition');
		});

		it('handles simple variable', () => {
			const pipelineResult = parse('x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Variable');
		});

		it('handles number', () => {
			const pipelineResult = parse('42');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '42',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Number');
		});

		it('handles fraction', () => {
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
			expect(result.output).toContain('Division');
		});

		it('handles complex expression', () => {
			const pipelineResult = parse('x^2 + 3x - 5');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x^2 + 3x - 5',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Addition');
		});

		it('works in REPL mode', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'latex',
				options: {},
				isRepl: true
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('works in non-REPL mode', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
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
			expect(result.error?.message).toContain('Failed to parse');
		});

		it('returns empty output when no AST', () => {
			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toBe('');
		});
	});

	// =============================================================================
	// Output Format
	// =============================================================================

	describe('output format', () => {
		it('separates tree and LaTeX with blank line', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('\n\nLaTeX:');
		});

		it('formats tree with pretty printer', () => {
			const pipelineResult = parse('x^2');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x^2',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			// Pretty printer should include tree characters (├, └, etc.)
			expect(result.output.includes('├') || result.output.includes('└')).toBe(true);
		});

		it('includes LaTeX label', () => {
			const pipelineResult = parse('x');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toMatch(/LaTeX:\s*\w/);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('handles AST with metadata', () => {
			const pipelineResult = parse('\\color{red}{x}');
			// Only test if parser successfully parsed the color command
			if (pipelineResult.ast) {
				const ctx: CommandContext = {
					ast: pipelineResult.ast,
					input: '\\color{red}{x}',
					format: 'latex',
					options: {},
					isRepl: false
				};

				const result = command.execute(ctx);
				expect(result.success).toBe(true);
			} else {
				// If parser doesn't support \color, that's okay
				expect(pipelineResult.errors.length).toBeGreaterThan(0);
			}
		});

		it('handles deeply nested expressions', () => {
			const pipelineResult = parse('((x + 1) * 2) ^ 3');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: '((x + 1) * 2) ^ 3',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles expressions with options in context', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'latex',
				options: { verbose: true },
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('preserves original AST in result', () => {
			const pipelineResult = parse('x + y');
			const ctx: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'latex',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.ast).toBe(pipelineResult.ast);
		});
	});
});
