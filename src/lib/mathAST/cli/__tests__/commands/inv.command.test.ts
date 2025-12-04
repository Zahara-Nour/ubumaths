/**
 * Unit tests for the Inv command
 *
 * Tests the command that displays or defines function inverses.
 */

import { describe, it, expect } from 'vitest';
import { InvCommand } from '../../commands/inv.command';
import {
	createEvalState,
	getFunction,
	createFunctionBinding,
	setFunctionInverse
} from '../../core/eval-state';
import { variable, power } from '../../../factory';
import { parse } from '../../core/pipeline';
import type { CommandContext } from '../../types';

// Helper to parse an expression and return the AST
function parseExpr(expr: string) {
	const result = parse(expr);
	if (!result.ast) throw new Error(`Failed to parse: ${expr}`);
	return result.ast;
}

// Helper to define a function using createFunctionBinding directly
function defineFunction(
	evalState: ReturnType<typeof createEvalState>,
	name: string,
	params: string[],
	exprStr: string
): void {
	const expr = parseExpr(exprStr);
	createFunctionBinding(evalState, name, params, expr);
}

describe('InvCommand', () => {
	const command = new InvCommand();

	// Helper to create a context
	function createContext(input: string, evalState = createEvalState()): CommandContext {
		return {
			ast: undefined,
			input,
			format: 'custom',
			options: {},
			isRepl: true,
			evalState
		};
	}

	// =============================================================================
	// Command Metadata
	// =============================================================================

	describe('command metadata', () => {
		it('has correct name', () => {
			expect(command.name).toBe('inv');
		});

		it('has correct aliases', () => {
			expect(command.aliases).toContain('inverse');
		});

		it('has description', () => {
			expect(command.description).toBeDefined();
			expect(typeof command.description).toBe('string');
			expect(command.description.toLowerCase()).toContain('inverse');
		});

		it('has usage information', () => {
			expect(command.usage).toBeDefined();
			expect(typeof command.usage).toBe('string');
			expect(command.usage).toContain('name');
		});

		it('does not require AST', () => {
			expect(command.requiresAst).toBe(false);
		});
	});

	// =============================================================================
	// Display Mode - Function with Inverse
	// =============================================================================

	describe('display mode - with inverse defined', () => {
		it('shows inverse when defined', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');
			// Manually set inverse since it is not auto-computed
			setFunctionInverse(evalState, 'f', parseExpr('sqrt(x)'));

			const ctx = createContext('f', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('f^(-1)');
			expect(result.output).toContain('sqrt');
		});

		it('displays function parameters in output', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'g', ['t'], 't^2');
			setFunctionInverse(evalState, 'g', variable('t'));

			const ctx = createContext('g', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('g^(-1)(t)');
		});

		it('includes LaTeX output', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');
			setFunctionInverse(evalState, 'f', parseExpr('sqrt(x)'));

			const ctx = createContext('f', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('LaTeX:');
		});

		it('returns the inverse AST', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');
			setFunctionInverse(evalState, 'f', parseExpr('sqrt(x)'));

			const ctx = createContext('f', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.ast).toBeDefined();
		});
	});

	// =============================================================================
	// Display Mode - Function without Inverse
	// =============================================================================

	describe('display mode - without inverse', () => {
		it('shows not defined message', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('not defined');
		});

		it('suggests how to define inverse', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('.inv f = expression');
		});

		it('does not return an AST', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f', evalState);
			const result = command.execute(ctx);

			expect(result.ast).toBeUndefined();
		});
	});

	// =============================================================================
	// Display Mode - Function Not Defined
	// =============================================================================

	describe('display mode - function not defined', () => {
		it('returns error when function does not exist', () => {
			const evalState = createEvalState();
			const ctx = createContext('unknown', evalState);

			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
			expect(result.error?.message).toContain("'unknown'");
			expect(result.error?.message).toContain('not defined');
		});

		it('suggests using .def', () => {
			const evalState = createEvalState();
			const ctx = createContext('f', evalState);

			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('.def');
		});
	});

	// =============================================================================
	// Define Mode - Basic
	// =============================================================================

	describe('define mode - basic', () => {
		it('sets inverse for existing function', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f = sqrt(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			const fn = getFunction(evalState, 'f');
			expect(fn?.inverse).toBeDefined();
		});

		it('shows confirmation message with Set prefix', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f = sqrt(x)', evalState);
			const result = command.execute(ctx);

			expect(result.output).toContain('Set');
			expect(result.output).toContain('f^(-1)');
		});

		it('returns AST of inverse expression', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f = sqrt(x)', evalState);
			const result = command.execute(ctx);

			expect(result.ast).toBeDefined();
		});
	});

	// =============================================================================
	// Define Mode - Complex Expressions
	// =============================================================================

	describe('define mode - complex expressions', () => {
		it('handles complex inverse expressions', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^3');

			const ctx = createContext('f = x^(1/3)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles trigonometric inverses', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'sin(x)');

			const ctx = createContext('f = asin(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles logarithmic inverses', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'exp(x)');

			const ctx = createContext('f = ln(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles fraction expressions', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], '1/x');

			const ctx = createContext('f = 1/x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles linear transformation inverse', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], '2*x + 3');

			const ctx = createContext('f = (x - 3)/2', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});
	});

	// =============================================================================
	// Define Mode - Function Not Defined
	// =============================================================================

	describe('define mode - function not defined', () => {
		it('returns error when function does not exist', () => {
			const evalState = createEvalState();
			const ctx = createContext('g = x', evalState);

			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
			expect(result.error?.message).toContain("'g'");
		});

		it('suggests using .def first', () => {
			const evalState = createEvalState();
			const ctx = createContext('unknown = x', evalState);

			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('.def');
		});
	});

	// =============================================================================
	// Define Mode - Invalid Syntax
	// =============================================================================

	describe('define mode - invalid syntax', () => {
		it('returns error for invalid syntax (no equals, no match)', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for function name starting with number', () => {
			const evalState = createEvalState();

			const ctx = createContext('5f = x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for invalid expression', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f = )', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error when expression is empty after equals', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f =', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(false);
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

		it('returns error for empty input', () => {
			const evalState = createEvalState();
			const ctx = createContext('', evalState);

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('PARSE_ERROR');
		});

		it('returns error for whitespace-only input', () => {
			const evalState = createEvalState();
			const ctx = createContext('   ', evalState);

			const result = command.execute(ctx);
			expect(result.success).toBe(false);
		});
	});

	// =============================================================================
	// Multi-Variable Functions
	// =============================================================================

	describe('multi-variable functions', () => {
		it('displays parameters for multi-variable function', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'g', ['x', 'y'], 'x + y');
			setFunctionInverse(evalState, 'g', parseExpr('x'));

			const ctx = createContext('g', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('g^(-1)(x, y)');
		});

		it('allows setting inverse for multi-variable function', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'h', ['a', 'b'], 'a * b');

			const ctx = createContext('h = a/b', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('h^(-1)(a, b)');
		});
	});

	// =============================================================================
	// Override Existing Inverse
	// =============================================================================

	describe('override existing inverse', () => {
		it('updates inverse when already defined', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			// Set first inverse
			command.execute(createContext('f = sqrt(x)', evalState));

			// Override with new inverse
			const ctx = createContext('f = -sqrt(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
			expect(result.output).toContain('Updated');
		});

		it('shows Updated prefix when overriding', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');
			setFunctionInverse(evalState, 'f', parseExpr('sqrt(x)'));

			const ctx = createContext('f = x^0.5', evalState);
			const result = command.execute(ctx);

			expect(result.output).toContain('Updated');
		});

		it('shows Set prefix for first definition', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f = sqrt(x)', evalState);
			const result = command.execute(ctx);

			expect(result.output).toContain('Set');
			expect(result.output).not.toContain('Updated');
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('preserves function expression when setting inverse', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^3');
			const originalExpr = getFunction(evalState, 'f')?.expression;

			const ctx = createContext('f = x^(1/3)', evalState);
			command.execute(ctx);

			const fn = getFunction(evalState, 'f');
			expect(fn?.expression).toEqual(originalExpr);
		});

		it('preserves function parameters when setting inverse', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'g', ['a', 'b'], 'a + b');
			const originalParams = getFunction(evalState, 'g')?.parameters;

			const ctx = createContext('g = a - b', evalState);
			command.execute(ctx);

			const fn = getFunction(evalState, 'g');
			expect(fn?.parameters).toEqual(originalParams);
		});

		it('handles spaces around equals sign', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f=sqrt(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles extra whitespace in input', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('  f  =  sqrt(x)  ', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles function with underscore in name', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'my_func', ['x'], 'x^2');

			const ctx = createContext('my_func = sqrt(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles identity inverse', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'id', ['x'], 'x');

			const ctx = createContext('id = x', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('handles constant expression as inverse', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x');

			const ctx = createContext('f = 0', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('does not affect other functions', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');
			defineFunction(evalState, 'g', ['x'], 'x^3');

			const ctx = createContext('f = sqrt(x)', evalState);
			command.execute(ctx);

			const gDef = getFunction(evalState, 'g');
			// g should not have an inverse (inverses are not auto-computed)
			expect(gDef?.inverse).toBeUndefined();
		});

		it('does not affect variable bindings', () => {
			const evalState = createEvalState();
			evalState.bindings.set('a', parseExpr('5'));
			defineFunction(evalState, 'f', ['x'], 'x^2');

			const ctx = createContext('f = sqrt(x)', evalState);
			command.execute(ctx);

			expect(evalState.bindings.has('a')).toBe(true);
		});

		it('handles function created via API', () => {
			const evalState = createEvalState();
			createFunctionBinding(evalState, 'g', ['x'], power(variable('x'), parseExpr('2')));

			const ctx = createContext('g = sqrt(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});
	});

	// =============================================================================
	// Integration Scenarios
	// =============================================================================

	describe('integration scenarios', () => {
		it('works after function definition', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'exp(x)');

			const ctx = createContext('f = ln(x)', evalState);
			const result = command.execute(ctx);

			expect(result.success).toBe(true);
		});

		it('display-define-display workflow shows inverse correctly', () => {
			const evalState = createEvalState();
			defineFunction(evalState, 'f', ['x'], 'x^2');

			// Display: not defined
			const displayResult1 = command.execute(createContext('f', evalState));
			expect(displayResult1.output).toContain('not defined');

			// Define
			const defineResult = command.execute(createContext('f = sqrt(x)', evalState));
			expect(defineResult.success).toBe(true);

			// Display: now shows inverse
			const displayResult2 = command.execute(createContext('f', evalState));
			expect(displayResult2.output).toContain('sqrt');
			expect(displayResult2.output).not.toContain('not defined');
		});
	});
});
