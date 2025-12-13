/**
 * Unit tests for the Fns command
 *
 * Tests the command that lists all defined functions
 * and their definitions from the evaluation state.
 */

import { describe, it, expect } from 'vitest';
import { FnsCommand } from '../../commands/fns.command';
import {
	createEvalState,
	createFunctionBinding,
	setFunctionDerivative,
	setFunctionInverse
} from '../../core/eval-state';
import { number, variable, add, multiply, func, superscript, opposite } from '../../../factory';
import type { CommandContext } from '../../types';
import type { MathNode } from '../../../types';

// Helper to create x^2
function xSquared(): MathNode {
	return superscript(variable('x'), number('2'));
}

// Helper to create simple expressions
function xPlusY(): MathNode {
	return add(variable('x'), variable('y'));
}

function xPlusYPlusZ(): MathNode {
	return add(add(variable('x'), variable('y')), variable('z'));
}

function twoTimesX(): MathNode {
	return multiply(number('2'), variable('x'), 'implicit');
}

describe('FnsCommand', () => {
	const command = new FnsCommand();

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('fns');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('functions');
			expect(command.aliases).toContain('funcs');
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
		it('lists single function', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());

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
			expect(result.output).toContain('f');
			expect(result.output).toContain('x');
		});

		it('lists multiple functions', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());
			createFunctionBinding(evalState, 'g', ['x'], add(variable('x'), number('1')));
			createFunctionBinding(evalState, 'h', ['x'], twoTimesX());

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
			expect(result.output).toContain('f');
			expect(result.output).toContain('g');
			expect(result.output).toContain('h');
		});

		it('shows Functions header', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.output).toContain('Functions');
		});

		it('sorts functions alphabetically', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'z', ['x'], variable('x'));
			createFunctionBinding(evalState, 'a', ['x'], variable('x'));
			createFunctionBinding(evalState, 'm', ['x'], variable('x'));

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
			const funcLines = lines.filter((line) => line.includes('='));

			// Check order
			const aIndex = funcLines.findIndex((line) => line.includes('a('));
			const mIndex = funcLines.findIndex((line) => line.includes('m('));
			const zIndex = funcLines.findIndex((line) => line.includes('z('));

			expect(aIndex).toBeLessThan(mIndex);
			expect(mIndex).toBeLessThan(zIndex);
		});

		it('displays function expressions in custom syntax', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], add(xSquared(), number('1')));

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
			// Should show the expression
			expect(result.output).toContain('f(x)');
		});

		it('displays multi-parameter functions correctly', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'g', ['x', 'y'], xPlusY());

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
			expect(result.output).toContain('g(x, y)');
		});

		it('displays three-parameter functions correctly', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'h', ['x', 'y', 'z'], xPlusYPlusZ());

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
			expect(result.output).toContain('h(x, y, z)');
		});

		it('shows derivative when defined', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());
			setFunctionDerivative(evalState, 'f', twoTimesX());

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
			expect(result.output).toContain("f'");
		});

		it('shows inverse when defined', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());
			setFunctionInverse(evalState, 'f', func('sqrt', [variable('x')]));

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
			// Should show inverse notation (superscript -1)
			expect(result.output).toMatch(/f.*sqrt/);
		});

		it('shows both derivative and inverse when defined', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());
			setFunctionDerivative(evalState, 'f', twoTimesX());
			setFunctionInverse(evalState, 'f', func('sqrt', [variable('x')]));

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
			expect(result.output).toContain("f'");
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
		it('handles empty function list', () => {
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
			expect(result.output).toContain('No functions');
		});

		it('handles function with constant expression', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], number('5'));

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
			expect(result.output).toContain('5');
		});

		it('handles function with zero expression', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], number('0'));

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
			expect(result.output).toContain('0');
		});

		it('handles function with negative expression', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], opposite(variable('x')));

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

		it('handles functions with trigonometric expressions', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], func('sin', [variable('x')]));

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

		it('handles many functions', () => {
			const evalState = createEvalState();
			for (let i = 0; i < 20; i++) {
				createFunctionBinding(
					evalState,
					`fn${i}`,
					['x'],
					multiply(number(`${i}`), variable('x'), 'implicit')
				);
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
			expect(result.output).toContain('fn0');
			expect(result.output).toContain('fn19');
		});

		it('handles function names with underscores', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'my_func', ['x'], variable('x'));

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
			expect(result.output).toContain('my_func');
		});

		it('handles parameter names with underscores', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x_1', 'x_2'], add(variable('x_1'), variable('x_2')));

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
			expect(result.output).toContain('x_1, x_2');
		});

		it('does not show derivative line if no derivative defined', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());

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
			// Should only have header + one function line
			const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
			expect(nonEmptyLines.length).toBe(2);
		});

		it('does not affect variable bindings', () => {
			const evalState = createEvalState();
			evalState.bindings.set('x', number('5'));
			createFunctionBinding(evalState, 'f', ['y'], superscript(variable('y'), number('2')));

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			expect(evalState.bindings.has('x')).toBe(true);
		});

		it('does not affect evaluation mode', () => {
			const evalState = createEvalState();
			evalState.mode = 'decimal';
			createFunctionBinding(evalState, 'f', ['x'], xSquared());

			const ctx: CommandContext = {
				ast: undefined,
				input: '',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			command.execute(ctx);
			expect(evalState.mode).toBe('decimal');
		});

		it('ignores input parameter', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());

			const ctx: CommandContext = {
				ast: undefined,
				input: 'some ignored input',
				format: 'custom',
				options: {},
				isRepl: true,
				evalState
			};

			const result = command.execute(ctx);
			expect(result.success).toBe(true);
			expect(result.output).toContain('f(x)');
		});
	});

	// =============================================================================
	// Output Format
	// =============================================================================

	describe('output format', () => {
		it('shows function definition on separate line from header', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());

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
			expect(lines.length).toBeGreaterThan(1);
			expect(lines[0]).toContain('Functions');
		});

		it('indents derivative line under main function', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'f', ['x'], xSquared());
			setFunctionDerivative(evalState, 'f', twoTimesX());

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
			const derivLine = lines.find((l) => l.includes("f'"));

			// Derivative should be indented more than main function
			expect(derivLine).toBeDefined();
			if (derivLine) {
				const mainFuncLine = lines.find((l) => l.includes('f(x)') && !l.includes("'"));
				expect(mainFuncLine).toBeDefined();
				if (mainFuncLine) {
					const mainIndent = mainFuncLine.search(/\S/);
					const derivIndent = derivLine.search(/\S/);
					expect(derivIndent).toBeGreaterThan(mainIndent);
				}
			}
		});
	});
});
