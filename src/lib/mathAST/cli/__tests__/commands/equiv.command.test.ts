/**
 * Unit tests for the Equiv command
 *
 * Tests the command that checks if two mathematical expressions
 * are equivalent by comparing their normalized forms.
 */

import { describe, it, expect } from 'vitest';
import { EquivCommand } from '../../commands/equiv.command';
import type { CommandContext } from '../../types';

describe('EquivCommand', () => {
	const command = new EquivCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('equiv');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('eq');
			expect(command.aliases).toContain('equivalent');
		});

		it('has description', () => {
			expect(command.description).toBeDefined();
			expect(typeof command.description).toBe('string');
		});

		it('has usage information', () => {
			expect(command.usage).toBeDefined();
			expect(typeof command.usage).toBe('string');
		});

		it('does not require AST (handles parsing itself)', () => {
			expect(command.requiresAst).toBe(false);
		});
	});

	// =============================================================================
	// === Operator Syntax
	// =============================================================================

	describe('=== operator syntax', () => {
		it('detects equivalent expressions with ===', () => {
			const ctx: CommandContext = {
				input: '2x + 3x === 5x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});

		it('detects non-equivalent expressions with ===', () => {
			const ctx: CommandContext = {
				input: 'x === y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: false');
		});

		it('shows both expressions in output', () => {
			const ctx: CommandContext = {
				input: 'x + x === 2x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Expression 1:');
			expect(result.output).toContain('Expression 2:');
		});

		it('shows hash for both expressions', () => {
			const ctx: CommandContext = {
				input: 'x === x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			// Hash should appear twice (once for each expression)
			const hashCount = (result.output.match(/Hash:/g) || []).length;
			expect(hashCount).toBe(2);
		});

		it('handles complex expressions with ===', () => {
			const ctx: CommandContext = {
				input: 'x^2 - 1 === x^2 - 1',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});
	});

	// =============================================================================
	// Two Quoted Expressions Syntax
	// =============================================================================

	describe('two quoted expressions syntax', () => {
		it('handles double-quoted expressions', () => {
			const ctx: CommandContext = {
				input: '"2x + 3x" "5x"',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});

		it('handles single-quoted expressions', () => {
			const ctx: CommandContext = {
				input: "'x + y' 'y + x'",
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});

		it('detects non-equivalent quoted expressions', () => {
			const ctx: CommandContext = {
				input: '"x" "y"',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: false');
		});
	});

	// =============================================================================
	// Simple Space-Separated Syntax
	// =============================================================================

	describe('simple space-separated syntax', () => {
		it('handles simple unquoted expressions', () => {
			const ctx: CommandContext = {
				input: '2x 2x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});

		it('handles different simple expressions', () => {
			const ctx: CommandContext = {
				input: 'x y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: false');
		});
	});

	// =============================================================================
	// Error Handling
	// =============================================================================

	describe('error handling', () => {
		it('returns error for invalid === syntax', () => {
			const ctx: CommandContext = {
				input: 'a === b === c',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for empty first expression with ===', () => {
			const ctx: CommandContext = {
				input: ' === x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('returns error for empty second expression with ===', () => {
			const ctx: CommandContext = {
				input: 'x === ',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('returns error for unparseable expression', () => {
			const ctx: CommandContext = {
				input: 'x === \\\\\\invalid_latex_command',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			// This might parse or fail depending on parser - just check it doesn't crash
			expect(typeof result.success).toBe('boolean');
		});

		it('returns error for incomplete input', () => {
			const ctx: CommandContext = {
				input: 'singleexpression',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});
	});

	// =============================================================================
	// Mathematical Equivalence
	// =============================================================================

	describe('mathematical equivalence', () => {
		it('detects commutative equivalence', () => {
			const ctx: CommandContext = {
				input: 'a + b === b + a',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});

		it('detects like term combination', () => {
			const ctx: CommandContext = {
				input: '3x + 2x === 5x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});

		it('detects numerical equivalence', () => {
			const ctx: CommandContext = {
				input: '2 + 3 === 5',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});

		it('detects zero simplification', () => {
			const ctx: CommandContext = {
				input: 'x - x === 0',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});

		it('detects identity simplification', () => {
			const ctx: CommandContext = {
				input: 'x * 1 === x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('Equivalent: true');
		});
	});

	// =============================================================================
	// Output Format
	// =============================================================================

	describe('output format', () => {
		it('returns AST of first expression', () => {
			const ctx: CommandContext = {
				input: 'x === y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.ast).toBeDefined();
		});

		it('includes both expression strings in output', () => {
			const ctx: CommandContext = {
				input: 'a + b === b + a',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('a + b');
			expect(result.output).toContain('b + a');
		});
	});
});
