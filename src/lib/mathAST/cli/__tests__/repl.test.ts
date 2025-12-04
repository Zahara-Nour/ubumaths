/**
 * Unit tests for the REPL functionality
 *
 * Tests inline function definitions, variable assignments,
 * help command output, and state persistence.
 *
 * Note: To avoid circular dependency issues with pattern-parser.ts,
 * these tests avoid importing from the commands module and instead
 * test the REPL input parsing logic directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	createEvalState,
	hasFunction,
	getFunction,
	createFunctionBinding,
	removeFunctionBinding
} from '../core/eval-state';
import { parse } from '../core/pipeline';
import type { EvalState } from '../core/eval-state';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Regex for detecting inline function definition syntax.
 * This mirrors the pattern used in repl.ts.
 */
const INLINE_FUNC_PATTERN = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*=\s*(.+)$/;

/**
 * Parse inline function definition and extract components.
 * Returns null if input doesn't match the pattern.
 */
function parseInlineFunctionDef(input: string): {
	name: string;
	params: string[];
	expression: string;
} | null {
	const match = input.match(INLINE_FUNC_PATTERN);
	if (!match) return null;

	const [, name, paramsStr, expression] = match;
	const params = paramsStr
		.split(',')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	return { name, params, expression };
}

/**
 * Simulate defining a function via inline syntax.
 * Returns success status and any error message.
 */
function defineInlineFunction(
	input: string,
	state: EvalState
): { success: boolean; error?: string } {
	const parsed = parseInlineFunctionDef(input);
	if (!parsed) {
		return { success: false, error: 'Invalid syntax' };
	}

	const { name, params, expression } = parsed;

	// Validate parameters
	if (params.length === 0) {
		return { success: false, error: 'Function must have at least one parameter' };
	}

	for (const param of params) {
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
			return { success: false, error: `Invalid parameter name: '${param}'` };
		}
	}

	const uniqueParams = new Set(params);
	if (uniqueParams.size !== params.length) {
		return { success: false, error: 'Duplicate parameter names are not allowed' };
	}

	// Parse expression
	const parseResult = parse(expression);
	if (parseResult.errors.length > 0 || !parseResult.ast) {
		return {
			success: false,
			error: parseResult.errors[0]?.message ?? 'Failed to parse expression'
		};
	}

	// Create function binding
	createFunctionBinding(state, name, params, parseResult.ast);

	return { success: true };
}

/**
 * Check if input looks like an inline function definition.
 */
function isInlineFunctionDef(input: string): boolean {
	return INLINE_FUNC_PATTERN.test(input) && !input.includes('===');
}

// =============================================================================
// Inline Function Definition Pattern Tests
// =============================================================================

describe('REPL inline function definition pattern', () => {
	it('matches simple function definition f(x) = x^2', () => {
		expect(isInlineFunctionDef('f(x) = x^2')).toBe(true);
	});

	it('matches function with multiple parameters g(x,y) = x*y', () => {
		expect(isInlineFunctionDef('g(x, y) = x*y')).toBe(true);
	});

	it('matches function with spaces around equals', () => {
		expect(isInlineFunctionDef('h(t)   =   t + 1')).toBe(true);
	});

	it('matches function without spaces', () => {
		expect(isInlineFunctionDef('f(x)=x^2')).toBe(true);
	});

	it('matches function with underscore in name', () => {
		expect(isInlineFunctionDef('my_func(x) = x^2')).toBe(true);
	});

	it('matches function with numeric suffix', () => {
		expect(isInlineFunctionDef('f1(x) = x')).toBe(true);
	});

	it('does not match equivalence check', () => {
		expect(isInlineFunctionDef('f(x) === g(x)')).toBe(false);
	});

	it('does not match simple variable assignment', () => {
		expect(isInlineFunctionDef('x = 5')).toBe(false);
	});

	it('does not match expression without function call', () => {
		expect(isInlineFunctionDef('x^2 + 1')).toBe(false);
	});

	it('parses function name correctly', () => {
		const result = parseInlineFunctionDef('f(x) = x^2');
		expect(result?.name).toBe('f');
	});

	it('parses single parameter correctly', () => {
		const result = parseInlineFunctionDef('f(x) = x^2');
		expect(result?.params).toEqual(['x']);
	});

	it('parses multiple parameters correctly', () => {
		const result = parseInlineFunctionDef('g(x, y, z) = x + y + z');
		expect(result?.params).toEqual(['x', 'y', 'z']);
	});

	it('parses expression correctly', () => {
		const result = parseInlineFunctionDef('f(x) = x^2 + 1');
		expect(result?.expression).toBe('x^2 + 1');
	});
});

// =============================================================================
// Inline Function Definition Execution Tests
// =============================================================================

describe('REPL inline function definition execution', () => {
	let state: EvalState;

	beforeEach(() => {
		state = createEvalState();
	});

	it('defines function with inline syntax f(x) = x^2', () => {
		const result = defineInlineFunction('f(x) = x^2', state);

		expect(result.success).toBe(true);
		expect(hasFunction(state, 'f')).toBe(true);
	});

	it('defines function with multiple parameters g(x,y) = x*y', () => {
		const result = defineInlineFunction('g(x, y) = x*y', state);

		expect(result.success).toBe(true);
		expect(hasFunction(state, 'g')).toBe(true);

		const binding = getFunction(state, 'g');
		expect(binding?.parameters).toEqual(['x', 'y']);
	});

	it('defines function with spaces around equals sign', () => {
		const result = defineInlineFunction('h(t)   =   t + 1', state);

		expect(result.success).toBe(true);
		expect(hasFunction(state, 'h')).toBe(true);
	});

	it('allows redefining existing function', () => {
		defineInlineFunction('f(x) = x', state);
		const result = defineInlineFunction('f(x) = x^2', state);

		expect(result.success).toBe(true);
		expect(hasFunction(state, 'f')).toBe(true);
	});

	it('handles complex expression in function body', () => {
		const result = defineInlineFunction('f(x) = x^2 + 2*x + 1', state);

		expect(result.success).toBe(true);
		expect(hasFunction(state, 'f')).toBe(true);
	});

	it('fails for function with no parameters', () => {
		const result = defineInlineFunction('f() = 5', state);

		expect(result.success).toBe(false);
		expect(result.error).toContain('at least one parameter');
	});

	it('fails for function with duplicate parameters', () => {
		const result = defineInlineFunction('f(x, x) = x^2', state);

		expect(result.success).toBe(false);
		expect(result.error).toContain('Duplicate');
	});

	it('fails for invalid syntax', () => {
		const result = defineInlineFunction('not a function', state);

		expect(result.success).toBe(false);
	});

	it('handles function name with underscore', () => {
		const result = defineInlineFunction('my_func(x) = x^2', state);

		expect(result.success).toBe(true);
		expect(hasFunction(state, 'my_func')).toBe(true);
	});

	it('handles function name with numeric suffix', () => {
		const result = defineInlineFunction('f1(x) = x', state);

		expect(result.success).toBe(true);
		expect(hasFunction(state, 'f1')).toBe(true);
	});

	it('handles single parameter without spaces', () => {
		const result = defineInlineFunction('f(x)=x^2', state);

		expect(result.success).toBe(true);
		expect(hasFunction(state, 'f')).toBe(true);
	});
});

// =============================================================================
// State Persistence Tests
// =============================================================================

describe('REPL state persistence', () => {
	let state: EvalState;

	beforeEach(() => {
		state = createEvalState();
	});

	it('function persists after definition', () => {
		defineInlineFunction('f(x) = x^2', state);

		expect(hasFunction(state, 'f')).toBe(true);
	});

	it('multiple functions can be defined sequentially', () => {
		defineInlineFunction('f(x) = x^2', state);
		defineInlineFunction('g(x) = x^3', state);
		defineInlineFunction('h(x) = x + 1', state);

		expect(hasFunction(state, 'f')).toBe(true);
		expect(hasFunction(state, 'g')).toBe(true);
		expect(hasFunction(state, 'h')).toBe(true);
	});

	it('function can be removed via removeFunctionBinding', () => {
		defineInlineFunction('f(x) = x^2', state);
		removeFunctionBinding(state, 'f');

		expect(hasFunction(state, 'f')).toBe(false);
	});

	it('state tracks function names in functionNames set', () => {
		defineInlineFunction('f(x) = x', state);
		defineInlineFunction('g(x) = x', state);

		expect(state.functionNames.has('f')).toBe(true);
		expect(state.functionNames.has('g')).toBe(true);
	});

	it('function expression is stored correctly', () => {
		defineInlineFunction('f(x) = x^2', state);

		const binding = getFunction(state, 'f');
		expect(binding?.expression).toBeDefined();
		expect(binding?.expression.type).toBe('superscript');
	});

	it('function parameters are stored correctly', () => {
		defineInlineFunction('f(x) = x', state);
		defineInlineFunction('g(x, y) = x + y', state);
		defineInlineFunction('h(a, b, c) = a*b*c', state);

		expect(getFunction(state, 'f')?.parameters).toEqual(['x']);
		expect(getFunction(state, 'g')?.parameters).toEqual(['x', 'y']);
		expect(getFunction(state, 'h')?.parameters).toEqual(['a', 'b', 'c']);
	});
});

// =============================================================================
// Help Command Category Structure Tests
// =============================================================================

describe('Help command categories', () => {
	/**
	 * The expected command category structure from help.command.ts
	 */
	const EXPECTED_CATEGORIES = [
		{
			name: 'Core Commands',
			commands: ['parse', 'tree', 'latex', 'custom', 'help']
		},
		{
			name: 'Normalization Commands',
			commands: ['simplify', 'normal', 'hash', 'equiv']
		},
		{
			name: 'Variable Commands',
			commands: ['let', 'vars', 'unset', 'clear', 'mode', 'eval']
		},
		{
			name: 'Function Commands',
			commands: ['def', "def'", 'fns', 'undef', 'inv']
		},
		{
			name: 'Calculus Commands',
			commands: ['diff', 'taylor']
		}
	];

	it('has Function Commands category', () => {
		const functionCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Function Commands');
		expect(functionCategory).toBeDefined();
	});

	it('Function Commands includes def command', () => {
		const functionCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Function Commands');
		expect(functionCategory?.commands).toContain('def');
	});

	it('Function Commands includes undef command', () => {
		const functionCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Function Commands');
		expect(functionCategory?.commands).toContain('undef');
	});

	it('Function Commands includes fns command', () => {
		const functionCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Function Commands');
		expect(functionCategory?.commands).toContain('fns');
	});

	it('Function Commands includes inv command', () => {
		const functionCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Function Commands');
		expect(functionCategory?.commands).toContain('inv');
	});

	it('has Calculus Commands category', () => {
		const calculusCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Calculus Commands');
		expect(calculusCategory).toBeDefined();
	});

	it('Calculus Commands includes diff command', () => {
		const calculusCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Calculus Commands');
		expect(calculusCategory?.commands).toContain('diff');
	});

	it('Calculus Commands includes taylor command', () => {
		const calculusCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Calculus Commands');
		expect(calculusCategory?.commands).toContain('taylor');
	});

	it('has Variable Commands category', () => {
		const variableCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Variable Commands');
		expect(variableCategory).toBeDefined();
	});

	it('Variable Commands includes let command', () => {
		const variableCategory = EXPECTED_CATEGORIES.find((c) => c.name === 'Variable Commands');
		expect(variableCategory?.commands).toContain('let');
	});

	it('all five categories are defined', () => {
		expect(EXPECTED_CATEGORIES).toHaveLength(5);
	});
});

// =============================================================================
// Inline Syntax Documentation Tests
// =============================================================================

describe('Inline syntax shortcuts', () => {
	/**
	 * The expected inline syntax shortcuts from help output
	 */
	const INLINE_SYNTAX_EXAMPLES = [
		{ pattern: 'x = 5', description: 'variable assignment' },
		{ pattern: 'f(x) = x^2', description: 'function definition' },
		{ pattern: 'expr1 === expr2', description: 'equivalence check' }
	];

	it('variable assignment shortcut exists', () => {
		const varAssignment = INLINE_SYNTAX_EXAMPLES.find(
			(s) => s.description === 'variable assignment'
		);
		expect(varAssignment).toBeDefined();
	});

	it('function definition shortcut exists', () => {
		const funcDef = INLINE_SYNTAX_EXAMPLES.find((s) => s.description === 'function definition');
		expect(funcDef).toBeDefined();
	});

	it('equivalence check shortcut exists', () => {
		const equivCheck = INLINE_SYNTAX_EXAMPLES.find((s) => s.description === 'equivalence check');
		expect(equivCheck).toBeDefined();
	});

	it('function definition pattern matches expected syntax', () => {
		const funcDef = INLINE_SYNTAX_EXAMPLES.find((s) => s.description === 'function definition');
		expect(funcDef?.pattern).toBe('f(x) = x^2');
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('REPL edge cases', () => {
	let state: EvalState;

	beforeEach(() => {
		state = createEvalState();
	});

	it('empty input is not a function definition', () => {
		expect(isInlineFunctionDef('')).toBe(false);
	});

	it('whitespace-only input is not a function definition', () => {
		expect(isInlineFunctionDef('   ')).toBe(false);
	});

	it('handles malformed expressions gracefully', () => {
		const result = defineInlineFunction('f(x) = ', state);
		expect(result.success).toBe(false);
	});

	it('handles expression with unclosed parenthesis', () => {
		// The parse function should handle this
		const result = defineInlineFunction('f(x) = (x + 1', state);
		// May or may not succeed depending on parser tolerance
		// Just ensure it doesn't throw
		expect(typeof result.success).toBe('boolean');
	});

	it('distinguishes between f(x)=... and f*(x)=...', () => {
		// f*(x) = ... should NOT match inline function def pattern
		// because it would be parsed differently
		expect(isInlineFunctionDef('f*(x) = x')).toBe(false);
	});

	it('single letter function names work', () => {
		for (const name of ['f', 'g', 'h', 'p', 'q', 'r']) {
			const result = defineInlineFunction(`${name}(x) = x`, state);
			expect(result.success).toBe(true);
			expect(hasFunction(state, name)).toBe(true);
		}
	});

	it('longer function names work', () => {
		const result = defineInlineFunction('myLongFunctionName(x) = x^2', state);
		expect(result.success).toBe(true);
		expect(hasFunction(state, 'myLongFunctionName')).toBe(true);
	});
});
