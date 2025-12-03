/**
 * Unit tests for the Mode command
 *
 * Tests the command that shows or sets the evaluation mode
 * (exact or decimal) for mathematical computations.
 */

import { describe, it, expect } from 'vitest';
import { ModeCommand } from '../../commands/mode.command';
import { createEvalState } from '../../core/eval-state';
import type { CommandContext } from '../../types';

describe('ModeCommand', () => {
	const command = new ModeCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('mode');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('m');
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
	// Showing Current Mode
	// =============================================================================

	describe('showing current mode', () => {
		it('shows current mode when no argument', () => {
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
			expect(result.output).toContain('mode');
		});

		it('shows exact mode by default', () => {
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
			expect(result.output).toContain('exact');
		});

		it('shows decimal mode when set', () => {
			const evalState = createEvalState();
			evalState.mode = 'decimal';

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('decimal');
		});
	});

	// =============================================================================
	// Setting Mode
	// =============================================================================

	describe('setting mode', () => {
		it('sets exact mode', () => {
			const evalState = createEvalState();
			evalState.mode = 'decimal';

			const ctx: CommandContext = {
				ast: undefined,
				input: 'exact',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(evalState.mode).toBe('exact');
		});

		it('sets decimal mode', () => {
			const evalState = createEvalState();
			evalState.mode = 'exact';

			const ctx: CommandContext = {
				ast: undefined,
				input: 'decimal',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(evalState.mode).toBe('decimal');
		});

		it('shows confirmation when setting mode', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'decimal',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Mode set');
			expect(result.output).toContain('decimal');
		});

		it('handles case-insensitive input', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'EXACT',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(evalState.mode).toBe('exact');
		});

		it('handles mixed case input', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'DeCiMaL',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(evalState.mode).toBe('decimal');
		});

		it('can toggle between modes', () => {
			const evalState = createEvalState();
			evalState.mode = 'exact';

			// Switch to decimal
			const ctx1: CommandContext = {
				ast: undefined,
				input: 'decimal',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx1);
			expect(evalState.mode).toBe('decimal');

			// Switch back to exact
			const ctx2: CommandContext = {
				ast: undefined,
				input: 'exact',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx2);
			expect(evalState.mode).toBe('exact');
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

		it('returns error for invalid mode', () => {
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
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for numeric input', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: '123',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('returns error for random string', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'foobar',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('Invalid mode');
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
		it('handles whitespace in input', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: '  exact  ',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(evalState.mode).toBe('exact');
		});

		it('setting same mode twice succeeds', () => {
			const evalState = createEvalState();
			evalState.mode = 'exact';

			const ctx: CommandContext = {
				ast: undefined,
				input: 'exact',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(evalState.mode).toBe('exact');
		});

		it('mode persists across multiple checks', () => {
			const evalState = createEvalState();

			// Set to decimal
			const ctx1: CommandContext = {
				ast: undefined,
				input: 'decimal',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx1);

			// Check mode (no argument)
			const ctx2: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx2);
			expect(result.output).toContain('decimal');
		});

		it('returns success for valid mode changes', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'decimal',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
		});

		it('handles abbreviated mode names (should fail)', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'dec',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});

		it('does not accept partial matches', () => {
			const evalState = createEvalState();

			const ctx: CommandContext = {
				ast: undefined,
				input: 'exa',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});
	});
});
