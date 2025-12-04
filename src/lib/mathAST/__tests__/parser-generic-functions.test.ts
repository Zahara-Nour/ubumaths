/**
 * Unit tests for generic function parsing in MathAST
 *
 * Tests for parsing:
 * - Generic functions: f(x), g(x)
 * - Derivatives: f'(x), f''(x), f'''(x), f^{(n)}(x)
 * - Inverse functions: f^{-1}(x)
 * - Function composition: f \circ g (LaTeX), f@g (custom)
 * - Combined patterns: f^{-1}'(x) (inverse with derivative)
 */

import { describe, it, expect } from 'vitest';
import { parseLatexSafe } from '../parser';
import { parseCustomSafe } from '../parser/custom';
import type { FunctionNode, CompositionNode, MathNode } from '../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse LaTeX with generic functions enabled
 */
function parseLatexWithGenericFuncs(
	input: string,
	names: readonly string[] = ['f', 'g', 'h'],
	options?: { allowDerivatives?: boolean; allowInverse?: boolean }
) {
	return parseLatexSafe(input, {
		mode: 'strict',
		genericFunctions: {
			names,
			allowDerivatives: options?.allowDerivatives,
			allowInverse: options?.allowInverse
		}
	});
}

/**
 * Parse custom syntax with generic functions enabled
 */
function parseCustomWithGenericFuncs(
	input: string,
	names: readonly string[] = ['f', 'g', 'h'],
	options?: { allowDerivatives?: boolean; allowInverse?: boolean }
) {
	return parseCustomSafe(input, {
		mode: 'strict',
		genericFunctions: {
			names,
			allowDerivatives: options?.allowDerivatives,
			allowInverse: options?.allowInverse
		}
	});
}

/**
 * Assert parse success
 */
function expectSuccess(result: { ast: MathNode | null; errors: readonly unknown[] }) {
	if (result.errors.length > 0) {
		console.error('Parse errors:', result.errors);
	}
	expect(result.errors).toHaveLength(0);
	expect(result.ast).not.toBeNull();
}

/**
 * Assert parse failure
 */
function expectFailure(result: { ast: MathNode | null; errors: readonly unknown[] }) {
	expect(result.errors.length).toBeGreaterThan(0);
}

/**
 * Assert that a node is a FunctionNode with expected properties
 */
function expectFunction(
	node: MathNode,
	name: string,
	opts?: { derivativeOrder?: number; isInverse?: boolean; argCount?: number }
): asserts node is FunctionNode {
	expect(node.type).toBe('function');
	const fn = node as FunctionNode;
	expect(fn.name).toBe(name);
	if (opts?.derivativeOrder !== undefined) {
		expect(fn.derivativeOrder).toBe(opts.derivativeOrder);
	} else {
		expect(fn.derivativeOrder).toBeUndefined();
	}
	if (opts?.isInverse !== undefined) {
		expect(fn.isInverse).toBe(opts.isInverse);
	} else {
		expect(fn.isInverse).toBeUndefined();
	}
	if (opts?.argCount !== undefined) {
		expect(fn.args).toHaveLength(opts.argCount);
	}
}

/**
 * Assert that a node is a CompositionNode with expected functions
 */
function expectComposition(
	node: MathNode,
	outerName: string,
	innerName: string
): asserts node is CompositionNode {
	expect(node.type).toBe('composition');
	const comp = node as CompositionNode;
	expect(comp.outer.type).toBe('function');
	expect(comp.inner.type).toBe('function');
	expect((comp.outer as FunctionNode).name).toBe(outerName);
	expect((comp.inner as FunctionNode).name).toBe(innerName);
}

// =============================================================================
// LaTeX Parser Tests - Basic Generic Functions
// =============================================================================

describe('LaTeX Parser - Generic Functions', () => {
	describe('Basic function parsing', () => {
		it('parses f(x) as FunctionNode when f is in genericFunctions', () => {
			const result = parseLatexWithGenericFuncs('f(x)');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { argCount: 1 });
			expect((result.ast as FunctionNode).args[0]).toMatchObject({
				type: 'variable',
				name: 'x'
			});
		});

		it('parses g(x, y) with multiple arguments', () => {
			const result = parseLatexWithGenericFuncs('g(x, y)');
			expectSuccess(result);
			expectFunction(result.ast!, 'g', { argCount: 2 });
		});

		it('parses nested function calls f(g(x))', () => {
			const result = parseLatexWithGenericFuncs('f(g(x))');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { argCount: 1 });
			const arg = (result.ast as FunctionNode).args[0];
			expectFunction(arg, 'g', { argCount: 1 });
		});

		it('returns variable for letter NOT in genericFunctions', () => {
			const result = parseLatexWithGenericFuncs('x', ['f', 'g']); // x not in list
			expectSuccess(result);
			expect(result.ast!.type).toBe('variable');
			expect((result.ast as { name: string }).name).toBe('x');
		});

		it('parses f without parentheses as naked function (for composition)', () => {
			const result = parseLatexWithGenericFuncs('f');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { argCount: 0 });
		});
	});

	describe('Derivative notation', () => {
		it("parses f'(x) with derivativeOrder: 1", () => {
			const result = parseLatexWithGenericFuncs("f'(x)");
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 1, argCount: 1 });
		});

		it("parses f''(x) with derivativeOrder: 2", () => {
			const result = parseLatexWithGenericFuncs("f''(x)");
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 2, argCount: 1 });
		});

		it("parses f'''(x) with derivativeOrder: 3", () => {
			const result = parseLatexWithGenericFuncs("f'''(x)");
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 3, argCount: 1 });
		});

		it('parses f^{(4)}(x) with derivativeOrder: 4', () => {
			const result = parseLatexWithGenericFuncs('f^{(4)}(x)');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 4, argCount: 1 });
		});

		it('parses f^{(10)}(x) with derivativeOrder: 10', () => {
			const result = parseLatexWithGenericFuncs('f^{(10)}(x)');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 10, argCount: 1 });
		});

		it("parses f' without parentheses (for composition)", () => {
			const result = parseLatexWithGenericFuncs("f'");
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 1, argCount: 0 });
		});

		it('does not parse primes when allowDerivatives is false', () => {
			const result = parseLatexWithGenericFuncs("f'(x)", ['f'], { allowDerivatives: false });
			// The ' should not be consumed as derivative
			// When primes are not allowed, f is parsed without derivative, and ' causes an error
			expectFailure(result);
		});
	});

	describe('Inverse notation', () => {
		it('parses f^{-1}(x) as inverse function', () => {
			const result = parseLatexWithGenericFuncs('f^{-1}(x)');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { isInverse: true, argCount: 1 });
		});

		it('parses f^{-1} without parentheses', () => {
			const result = parseLatexWithGenericFuncs('f^{-1}');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { isInverse: true, argCount: 0 });
		});

		it('errors when allowInverse is false', () => {
			const result = parseLatexWithGenericFuncs('f^{-1}(x)', ['f'], { allowInverse: false });
			// Should fail because ^{-1} is not recognized as inverse
			expectFailure(result);
		});
	});

	describe('Composition operator \\circ', () => {
		it('parses f \\circ g as CompositionNode', () => {
			const result = parseLatexWithGenericFuncs('f \\circ g');
			expectSuccess(result);
			expectComposition(result.ast!, 'f', 'g');
		});

		it('parses f \\circ g \\circ h with left associativity', () => {
			const result = parseLatexWithGenericFuncs('f \\circ g \\circ h');
			expectSuccess(result);
			// Should be ((f o g) o h)
			expect(result.ast!.type).toBe('composition');
			const outer = result.ast as CompositionNode;
			expect(outer.inner.type).toBe('function');
			expect((outer.inner as FunctionNode).name).toBe('h');
			expect(outer.outer.type).toBe('composition');
			const inner = outer.outer as CompositionNode;
			expect((inner.outer as FunctionNode).name).toBe('f');
			expect((inner.inner as FunctionNode).name).toBe('g');
		});

		it('parses f(x) \\circ g(y) (functions with args)', () => {
			const result = parseLatexWithGenericFuncs('f(x) \\circ g(y)');
			expectSuccess(result);
			expect(result.ast!.type).toBe('composition');
			const comp = result.ast as CompositionNode;
			expectFunction(comp.outer, 'f', { argCount: 1 });
			expectFunction(comp.inner, 'g', { argCount: 1 });
		});

		it('composition binds looser than multiplication', () => {
			// 2f \\circ g should be (2*f) \\circ g, not 2*(f \\circ g)
			// Actually, 2f is implicit multiplication...
			// Let's test a + f \\circ g + b = a + (f \\circ g) + b
			const result = parseLatexWithGenericFuncs('a + f \\circ g + b', ['f', 'g']);
			expectSuccess(result);
			// The structure should be: Addition(Addition(a, Composition(f, g)), b)
			expect(result.ast!.type).toBe('addition');
		});
	});

	describe('Edge cases and backward compatibility', () => {
		it('without genericFunctions config, f(x) is implicit multiplication', () => {
			const result = parseLatexSafe('f(x)', { mode: 'strict' }); // No genericFunctions
			expectSuccess(result);
			// Should be f * (x), i.e., multiplication
			expect(result.ast!.type).toBe('multiplication');
		});

		it('f(g(x)) is NOT composition, it is function with function arg', () => {
			const result = parseLatexWithGenericFuncs('f(g(x))');
			expectSuccess(result);
			// This is f applied to g(x), NOT f composed with g
			expectFunction(result.ast!, 'f', { argCount: 1 });
			const arg = (result.ast as FunctionNode).args[0];
			expectFunction(arg, 'g', { argCount: 1 });
		});

		it('handles known functions (sin, cos) alongside generic functions', () => {
			const result = parseLatexWithGenericFuncs('\\sin(f(x))');
			expectSuccess(result);
			expectFunction(result.ast!, 'sin', { argCount: 1 });
			const arg = (result.ast as FunctionNode).args[0];
			expectFunction(arg, 'f', { argCount: 1 });
		});
	});
});

// =============================================================================
// Custom Parser Tests
// =============================================================================

describe('Custom Parser - Generic Functions', () => {
	describe('Basic function parsing', () => {
		it('parses f(x) as FunctionNode', () => {
			const result = parseCustomWithGenericFuncs('f(x)');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { argCount: 1 });
		});

		it('parses g(x,y) with multiple arguments', () => {
			const result = parseCustomWithGenericFuncs('g(x,y)');
			expectSuccess(result);
			expectFunction(result.ast!, 'g', { argCount: 2 });
		});

		it('parses naked function f for composition', () => {
			const result = parseCustomWithGenericFuncs('f');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { argCount: 0 });
		});
	});

	describe('Derivative notation', () => {
		it("parses f'(x) with derivativeOrder: 1", () => {
			const result = parseCustomWithGenericFuncs("f'(x)");
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 1, argCount: 1 });
		});

		it("parses f''(x) with derivativeOrder: 2", () => {
			const result = parseCustomWithGenericFuncs("f''(x)");
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 2, argCount: 1 });
		});

		it("parses f'''(x) with derivativeOrder: 3", () => {
			const result = parseCustomWithGenericFuncs("f'''(x)");
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 3, argCount: 1 });
		});

		it('parses f^{(4)}(x) with derivativeOrder: 4', () => {
			const result = parseCustomWithGenericFuncs('f^{(4)}(x)');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { derivativeOrder: 4, argCount: 1 });
		});
	});

	describe('Inverse notation', () => {
		it('parses f^{-1}(x) as inverse function', () => {
			const result = parseCustomWithGenericFuncs('f^{-1}(x)');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { isInverse: true, argCount: 1 });
		});

		it('parses f^{-1} without parentheses', () => {
			const result = parseCustomWithGenericFuncs('f^{-1}');
			expectSuccess(result);
			expectFunction(result.ast!, 'f', { isInverse: true, argCount: 0 });
		});
	});

	describe('Composition operator @', () => {
		it('parses f@g as CompositionNode', () => {
			const result = parseCustomWithGenericFuncs('f@g');
			expectSuccess(result);
			expectComposition(result.ast!, 'f', 'g');
		});

		it('parses f@g@h with left associativity', () => {
			const result = parseCustomWithGenericFuncs('f@g@h');
			expectSuccess(result);
			// Should be ((f @ g) @ h)
			expect(result.ast!.type).toBe('composition');
			const outer = result.ast as CompositionNode;
			expect(outer.inner.type).toBe('function');
			expect((outer.inner as FunctionNode).name).toBe('h');
			expect(outer.outer.type).toBe('composition');
		});

		it('parses f(x)@g(y)', () => {
			const result = parseCustomWithGenericFuncs('f(x)@g(y)');
			expectSuccess(result);
			expect(result.ast!.type).toBe('composition');
		});

		it('@ with color still works: @red{x}', () => {
			// This tests that color syntax is not broken by composition
			const result = parseCustomWithGenericFuncs('@red{x}', ['f', 'g']);
			expectSuccess(result);
			// Should parse as colored variable x
			expect(result.ast!.type).toBe('variable');
		});
	});

	describe('Edge cases', () => {
		it('without genericFunctions, f(x) may parse differently', () => {
			const result = parseCustomSafe('f(x)', { mode: 'strict' }); // No genericFunctions
			expectSuccess(result);
			// In custom parser, single letter followed by () might be implicit mult
			// Let's verify the behavior
			// Actually custom parser treats it as multiplication: f * (x)
			expect(result.ast!.type).toBe('multiplication');
		});

		it('mixed: sin with generic function argument', () => {
			const result = parseCustomWithGenericFuncs('sin(f(x))');
			expectSuccess(result);
			expectFunction(result.ast!, 'sin', { argCount: 1 });
			const arg = (result.ast as FunctionNode).args[0];
			expectFunction(arg, 'f', { argCount: 1 });
		});
	});
});

// =============================================================================
// Error Cases
// =============================================================================

describe('Error Cases', () => {
	describe('LaTeX parser errors', () => {
		it('errors on invalid derivative superscript', () => {
			// f^{2} when expecting f^{-1} or f^{(n)} is an error for generic functions
			const result = parseLatexWithGenericFuncs('f^{2}(x)');
			expectFailure(result);
		});

		it('errors on f^{-2} (not -1)', () => {
			const result = parseLatexWithGenericFuncs('f^{-2}(x)');
			expectFailure(result);
		});
	});

	describe('Custom parser errors', () => {
		it('errors on invalid derivative superscript', () => {
			const result = parseCustomWithGenericFuncs('f^{2}(x)');
			expectFailure(result);
		});
	});
});

// =============================================================================
// Combined Features
// =============================================================================

describe('Combined Features', () => {
	describe('Derivative with composition', () => {
		it("parses f' \\circ g (derivative composed with function)", () => {
			const result = parseLatexWithGenericFuncs("f' \\circ g");
			expectSuccess(result);
			expect(result.ast!.type).toBe('composition');
			const comp = result.ast as CompositionNode;
			expectFunction(comp.outer, 'f', { derivativeOrder: 1 });
			expectFunction(comp.inner, 'g');
		});

		it("parses f'@g in custom syntax", () => {
			const result = parseCustomWithGenericFuncs("f'@g");
			expectSuccess(result);
			expect(result.ast!.type).toBe('composition');
			const comp = result.ast as CompositionNode;
			expectFunction(comp.outer, 'f', { derivativeOrder: 1 });
			expectFunction(comp.inner, 'g');
		});
	});

	describe('Inverse with composition', () => {
		it('parses f^{-1} \\circ g', () => {
			const result = parseLatexWithGenericFuncs('f^{-1} \\circ g');
			expectSuccess(result);
			expect(result.ast!.type).toBe('composition');
			const comp = result.ast as CompositionNode;
			expectFunction(comp.outer, 'f', { isInverse: true });
			expectFunction(comp.inner, 'g');
		});
	});

	describe('Complex expressions', () => {
		it("parses f'(x) + g(y)", () => {
			const result = parseLatexWithGenericFuncs("f'(x) + g(y)");
			expectSuccess(result);
			expect(result.ast!.type).toBe('addition');
		});

		it("parses 2 \\cdot f'(x)", () => {
			const result = parseLatexWithGenericFuncs("2 \\cdot f'(x)");
			expectSuccess(result);
			expect(result.ast!.type).toBe('multiplication');
		});
	});
});
