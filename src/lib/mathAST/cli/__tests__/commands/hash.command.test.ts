/**
 * Unit tests for the Hash command
 *
 * Tests the command that computes the canonical hash
 * of mathematical expressions.
 */

import { describe, it, expect } from 'vitest';
import { HashCommand } from '../../commands/hash.command';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

describe('HashCommand', () => {
	const command = new HashCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('hash');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('h');
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
		it('computes hash for expression', () => {
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
			expect(result.output).toContain('Hash:');
		});

		it('returns same hash for equivalent expressions', () => {
			const result1 = parse('2x + 3x');
			const result2 = parse('5x');

			const ctx1: CommandContext = {
				ast: result1.ast,
				input: '2x + 3x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const ctx2: CommandContext = {
				ast: result2.ast,
				input: '5x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const hash1 = command.execute(ctx1);
			const hash2 = command.execute(ctx2);

			// Extract hash values (after "Hash: ")
			const hashValue1 = hash1.output.replace(/.*Hash:\s*/, '').trim();
			const hashValue2 = hash2.output.replace(/.*Hash:\s*/, '').trim();

			expect(hashValue1).toBe(hashValue2);
		});

		it('returns different hash for different expressions', () => {
			const result1 = parse('x');
			const result2 = parse('y');

			const ctx1: CommandContext = {
				ast: result1.ast,
				input: 'x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const ctx2: CommandContext = {
				ast: result2.ast,
				input: 'y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const hash1 = command.execute(ctx1);
			const hash2 = command.execute(ctx2);

			// Extract hash values
			const hashValue1 = hash1.output.replace(/.*Hash:\s*/, '').trim();
			const hashValue2 = hash2.output.replace(/.*Hash:\s*/, '').trim();

			expect(hashValue1).not.toBe(hashValue2);
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

		it('handles numbers', () => {
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
			expect(result.error?.message).toContain('hash');
		});
	});

	// =============================================================================
	// Hash Properties
	// =============================================================================

	describe('hash properties', () => {
		it('hash is deterministic', () => {
			const pipelineResult = parse('x + y');

			// Execute twice with same input
			const ctx1: CommandContext = {
				ast: pipelineResult.ast,
				input: 'x + y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const result1 = command.execute(ctx1);
			const result2 = command.execute(ctx1);

			expect(result1.output).toBe(result2.output);
		});

		it('commutative expressions have same hash', () => {
			const result1 = parse('x + y');
			const result2 = parse('y + x');

			const ctx1: CommandContext = {
				ast: result1.ast,
				input: 'x + y',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const ctx2: CommandContext = {
				ast: result2.ast,
				input: 'y + x',
				format: 'custom',
				options: {},
				isRepl: false
			};

			const hash1 = command.execute(ctx1);
			const hash2 = command.execute(ctx2);

			// Extract hash values - strip ANSI codes
			// eslint-disable-next-line no-control-regex
			const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
			const hashValue1 = stripAnsi(hash1.output)
				.replace(/.*Hash:\s*/, '')
				.trim();
			const hashValue2 = stripAnsi(hash2.output)
				.replace(/.*Hash:\s*/, '')
				.trim();

			expect(hashValue1).toBe(hashValue2);
		});
	});
});
