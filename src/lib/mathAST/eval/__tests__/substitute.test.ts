/**
 * Unit tests for MathAST substitution functions
 */

import { describe, it, expect } from 'vitest';
import {
	substitute,
	getVariables,
	hasVariable,
	hasAllBindings,
	getMissingBindings
} from '../substitute';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { number, variable, add, sin, parentheses } from '../../factory';
import type { EvalBindings } from '../types';

// Helper to parse, substitute, and convert back to LaTeX for easy comparison
function substLatex(latex: string, bindings: EvalBindings): string {
	const ast = parseLatex(latex);
	const result = substitute(ast, bindings);
	return toLatex(result);
}

describe('substitute', () => {
	// =============================================================================
	// Basic Variable Substitution
	// =============================================================================

	describe('basic variable substitution', () => {
		it('substitutes a single variable with a number', () => {
			const expr = parseLatex('x+1');
			const result = substitute(expr, { x: 5 });

			// Result should be: 5 + 1
			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('number');
				if (result.left.type === 'number') {
					expect(result.left.value).toBe('5');
				}
			}
		});

		it('substitutes multiple variables', () => {
			const expr = parseLatex('x+y');
			const result = substitute(expr, { x: 2, y: 3 });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('number');
				expect(result.right.type).toBe('number');
				if (result.left.type === 'number' && result.right.type === 'number') {
					expect(result.left.value).toBe('2');
					expect(result.right.value).toBe('3');
				}
			}
		});

		it('leaves unbound variables unchanged', () => {
			const expr = parseLatex('x+y');
			const result = substitute(expr, { x: 5 });

			// y should remain as a variable
			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('number');
				expect(result.right.type).toBe('variable');
				if (result.right.type === 'variable') {
					expect(result.right.name).toBe('y');
				}
			}
		});

		it('returns node unchanged when no bindings provided', () => {
			const expr = parseLatex('x+1');
			const result = substitute(expr, {});

			expect(result).toEqual(expr);
		});

		it('returns node unchanged when variable is not in bindings', () => {
			const expr = parseLatex('x+1');
			const result = substitute(expr, { y: 5 });

			// x should remain as a variable
			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('variable');
			}
		});
	});

	// =============================================================================
	// Greek Letter Substitution
	// =============================================================================

	describe('greek letter substitution', () => {
		it('substitutes Greek letters by name', () => {
			const expr = parseLatex('\\alpha+1');
			const result = substitute(expr, { alpha: 5 });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('number');
				if (result.left.type === 'number') {
					expect(result.left.value).toBe('5');
				}
			}
		});

		it('substitutes alpha^2 with numeric value', () => {
			const expr = parseLatex('\\alpha^2');
			const result = substitute(expr, { alpha: 5 });

			expect(result.type).toBe('superscript');
			if (result.type === 'superscript') {
				expect(result.base.type).toBe('number');
				if (result.base.type === 'number') {
					expect(result.base.value).toBe('5');
				}
			}
		});

		it('substitutes multiple Greek letters', () => {
			const expr = parseLatex('\\alpha+\\beta');
			const result = substitute(expr, { alpha: 2, beta: 3 });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('number');
				expect(result.right.type).toBe('number');
			}
		});

		it('mixes Greek and regular variable substitution', () => {
			const expr = parseLatex('x+\\alpha');
			const result = substitute(expr, { x: 1, alpha: 2 });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('number');
				expect(result.right.type).toBe('number');
			}
		});
	});

	// =============================================================================
	// String Value Substitution (LaTeX parsing)
	// =============================================================================

	describe('string value substitution', () => {
		it('parses string value as LaTeX', () => {
			const expr = parseLatex('x \\cdot 2');
			const result = substitute(expr, { x: '2+3' });

			// Result should be: (2+3) * 2 - but parsed from LaTeX
			expect(result.type).toBe('multiplication');
			if (result.type === 'multiplication') {
				expect(result.left.type).toBe('addition');
			}
		});

		it('substitutes with fraction string', () => {
			const expr = parseLatex('x+1');
			const result = substitute(expr, { x: '\\frac{1}{2}' });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('division');
			}
		});

		it('substitutes with complex expression string', () => {
			const expr = parseLatex('y^2');
			const result = substitute(expr, { y: 'x+1' });

			expect(result.type).toBe('superscript');
			if (result.type === 'superscript') {
				expect(result.base.type).toBe('addition');
			}
		});
	});

	// =============================================================================
	// Direct MathNode Substitution
	// =============================================================================

	describe('direct MathNode substitution', () => {
		it('substitutes with a MathNode directly', () => {
			const expr = parseLatex('x+1');
			const replacement = add(number('2'), number('3'));
			const result = substitute(expr, { x: replacement });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('addition');
			}
		});

		it('substitutes with a function node', () => {
			const expr = parseLatex('x^2');
			const replacement = sin(variable('y'));
			const result = substitute(expr, { x: replacement });

			expect(result.type).toBe('superscript');
			if (result.type === 'superscript') {
				expect(result.base.type).toBe('function');
				if (result.base.type === 'function') {
					expect(result.base.name).toBe('sin');
				}
			}
		});

		it('substitutes with a parenthesized expression', () => {
			const expr = parseLatex('x+1');
			const replacement = parentheses(add(number('2'), number('3')));
			const result = substitute(expr, { x: replacement });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('delimiter');
			}
		});
	});

	// =============================================================================
	// Complex Expression Substitution
	// =============================================================================

	describe('complex expression substitution', () => {
		it('substitutes in fractions', () => {
			const expr = parseLatex('\\frac{x}{y}');
			const result = substitute(expr, { x: 3, y: 4 });

			expect(result.type).toBe('division');
			if (result.type === 'division') {
				expect(result.numerator.type).toBe('number');
				expect(result.denominator.type).toBe('number');
			}
		});

		it('substitutes in function arguments', () => {
			const expr = parseLatex('\\sin(x)');
			const result = substitute(expr, { x: 0 });

			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(result.args[0].type).toBe('number');
			}
		});

		it('substitutes in nested expressions', () => {
			const expr = parseLatex('\\sin(x+y)');
			const result = substitute(expr, { x: 1, y: 2 });

			expect(result.type).toBe('function');
			if (result.type === 'function') {
				const arg = result.args[0];
				expect(arg.type).toBe('addition');
				if (arg.type === 'addition') {
					expect(arg.left.type).toBe('number');
					expect(arg.right.type).toBe('number');
				}
			}
		});

		it('substitutes in superscript base and exponent', () => {
			const expr = parseLatex('x^y');
			const result = substitute(expr, { x: 2, y: 3 });

			expect(result.type).toBe('superscript');
			if (result.type === 'superscript') {
				expect(result.base.type).toBe('number');
				expect(result.superscript.type).toBe('number');
			}
		});

		it('substitutes in subscripts', () => {
			const expr = parseLatex('x_n');
			const result = substitute(expr, { n: 5 });

			expect(result.type).toBe('subscript');
			if (result.type === 'subscript') {
				expect(result.subscript.type).toBe('number');
				// x should remain unchanged
				expect(result.base.type).toBe('variable');
			}
		});
	});

	// =============================================================================
	// Recursive Substitution
	// =============================================================================

	describe('recursive substitution', () => {
		it('performs recursive substitution through variable chains', () => {
			// a + 1, with a = '2b' and b = 3
			// Should become: (2 * 3) + 1
			const expr = parseLatex('a+1');
			const result = substitute(expr, { a: '2b', b: 3 });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				// a should have been replaced with 2b, then b with 3
				expect(result.left.type).toBe('multiplication');
				if (result.left.type === 'multiplication') {
					expect(result.right.type).toBe('number');
				}
			}
		});

		it('resolves multi-step chains', () => {
			// x, with x = 'y', y = 'z', z = 5
			const expr = parseLatex('x');
			const result = substitute(expr, { x: 'y', y: 'z', z: 5 });

			expect(result.type).toBe('number');
			if (result.type === 'number') {
				expect(result.value).toBe('5');
			}
		});

		it('stops at maxIterations to prevent infinite loops', () => {
			// x with x = 'x+1' would loop forever
			const expr = parseLatex('x');
			const result = substitute(expr, { x: 'x+1' }, { maxIterations: 3 });

			// After 3 iterations: x -> x+1 -> (x+1)+1 -> ((x+1)+1)+1
			// The x should still be present (not fully resolved)
			const vars = getVariables(result);
			expect(vars.has('x')).toBe(true);
		});

		it('handles self-referential bindings gracefully', () => {
			// x = 'x' should terminate without infinite loop
			const expr = parseLatex('x');

			// This should not hang
			const result = substitute(expr, { x: 'x' }, { maxIterations: 5 });

			// x references itself, so it stays as x after iteration limit
			expect(result.type).toBe('variable');
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('edge cases', () => {
		it('handles empty expression', () => {
			const expr = number('5');
			const result = substitute(expr, { x: 10 });

			// No variables to substitute
			expect(result).toEqual(expr);
		});

		it('handles decimal numbers', () => {
			const expr = parseLatex('x');
			const result = substitute(expr, { x: 3.14 });

			expect(result.type).toBe('number');
			if (result.type === 'number') {
				expect(result.value).toBe('3.14');
			}
		});

		it('handles negative numbers', () => {
			const expr = parseLatex('x');
			const result = substitute(expr, { x: -5 });

			expect(result.type).toBe('number');
			if (result.type === 'number') {
				expect(result.value).toBe('-5');
			}
		});

		it('handles zero', () => {
			const expr = parseLatex('x+1');
			const result = substitute(expr, { x: 0 });

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.left.type).toBe('number');
				if (result.left.type === 'number') {
					expect(result.left.value).toBe('0');
				}
			}
		});

		it('throws on NaN value', () => {
			const expr = parseLatex('x');
			expect(() => substitute(expr, { x: NaN })).toThrow('Cannot substitute NaN');
		});

		it('throws on Infinity value', () => {
			const expr = parseLatex('x');
			expect(() => substitute(expr, { x: Infinity })).toThrow('Cannot substitute infinite');
		});

		it('throws on negative Infinity value', () => {
			const expr = parseLatex('x');
			expect(() => substitute(expr, { x: -Infinity })).toThrow('Cannot substitute infinite');
		});

		it('handles very small numbers', () => {
			const expr = parseLatex('x');
			const result = substitute(expr, { x: 0.000001 });

			expect(result.type).toBe('number');
			if (result.type === 'number') {
				expect(result.value).toBe('0.000001');
			}
		});

		it('handles very large numbers', () => {
			const expr = parseLatex('x');
			const result = substitute(expr, { x: 1000000 });

			expect(result.type).toBe('number');
			if (result.type === 'number') {
				expect(result.value).toBe('1000000');
			}
		});
	});

	// =============================================================================
	// Immutability
	// =============================================================================

	describe('immutability', () => {
		it('does not modify the original AST', () => {
			const original = parseLatex('x+1');
			const originalCopy = JSON.stringify(original);

			substitute(original, { x: 5 });

			expect(JSON.stringify(original)).toBe(originalCopy);
		});

		it('returns a new AST instance', () => {
			const original = parseLatex('x+1');
			const result = substitute(original, { x: 5 });

			expect(result).not.toBe(original);
		});
	});
});

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe('getVariables', () => {
	it('returns empty set for number', () => {
		const expr = number('5');
		const vars = getVariables(expr);

		expect(vars.size).toBe(0);
	});

	it('returns single variable', () => {
		const expr = variable('x');
		const vars = getVariables(expr);

		expect(vars.size).toBe(1);
		expect(vars.has('x')).toBe(true);
	});

	it('returns multiple variables', () => {
		const expr = parseLatex('x+y+z');
		const vars = getVariables(expr);

		expect(vars.size).toBe(3);
		expect(vars.has('x')).toBe(true);
		expect(vars.has('y')).toBe(true);
		expect(vars.has('z')).toBe(true);
	});

	it('includes Greek letters', () => {
		const expr = parseLatex('x+\\alpha');
		const vars = getVariables(expr);

		expect(vars.size).toBe(2);
		expect(vars.has('x')).toBe(true);
		expect(vars.has('alpha')).toBe(true);
	});

	it('handles duplicate variables', () => {
		const expr = parseLatex('x+x+x');
		const vars = getVariables(expr);

		expect(vars.size).toBe(1);
		expect(vars.has('x')).toBe(true);
	});

	it('finds variables in nested expressions', () => {
		const expr = parseLatex('\\sin(x)+\\frac{y}{z}');
		const vars = getVariables(expr);

		expect(vars.size).toBe(3);
		expect(vars.has('x')).toBe(true);
		expect(vars.has('y')).toBe(true);
		expect(vars.has('z')).toBe(true);
	});
});

describe('hasVariable', () => {
	it('returns true when variable exists', () => {
		const expr = parseLatex('x+1');

		expect(hasVariable(expr, 'x')).toBe(true);
	});

	it('returns false when variable does not exist', () => {
		const expr = parseLatex('x+1');

		expect(hasVariable(expr, 'y')).toBe(false);
	});

	it('finds Greek letters by name', () => {
		const expr = parseLatex('\\alpha+1');

		expect(hasVariable(expr, 'alpha')).toBe(true);
		expect(hasVariable(expr, 'beta')).toBe(false);
	});

	it('finds nested variables', () => {
		const expr = parseLatex('\\sin(\\cos(x))');

		expect(hasVariable(expr, 'x')).toBe(true);
	});
});

describe('hasAllBindings', () => {
	it('returns true when all variables have bindings', () => {
		const expr = parseLatex('x+y');

		expect(hasAllBindings(expr, { x: 1, y: 2 })).toBe(true);
	});

	it('returns false when some variables are missing', () => {
		const expr = parseLatex('x+y');

		expect(hasAllBindings(expr, { x: 1 })).toBe(false);
	});

	it('returns true with extra bindings', () => {
		const expr = parseLatex('x+y');

		expect(hasAllBindings(expr, { x: 1, y: 2, z: 3 })).toBe(true);
	});

	it('returns true for expression without variables', () => {
		const expr = parseLatex('1+2');

		expect(hasAllBindings(expr, {})).toBe(true);
	});

	it('includes Greek letters in check', () => {
		const expr = parseLatex('x+\\alpha');

		expect(hasAllBindings(expr, { x: 1 })).toBe(false);
		expect(hasAllBindings(expr, { x: 1, alpha: 2 })).toBe(true);
	});
});

describe('getMissingBindings', () => {
	it('returns empty array when all bindings present', () => {
		const expr = parseLatex('x+y');
		const missing = getMissingBindings(expr, { x: 1, y: 2 });

		expect(missing).toEqual([]);
	});

	it('returns missing variable names', () => {
		const expr = parseLatex('x+y+z');
		const missing = getMissingBindings(expr, { x: 1 });

		expect(missing).toHaveLength(2);
		expect(missing).toContain('y');
		expect(missing).toContain('z');
	});

	it('returns all variables when no bindings', () => {
		const expr = parseLatex('x+y');
		const missing = getMissingBindings(expr, {});

		expect(missing).toHaveLength(2);
		expect(missing).toContain('x');
		expect(missing).toContain('y');
	});

	it('includes missing Greek letters', () => {
		const expr = parseLatex('x+\\alpha+\\beta');
		const missing = getMissingBindings(expr, { x: 1, alpha: 2 });

		expect(missing).toEqual(['beta']);
	});
});

// =============================================================================
// Integration Tests with LaTeX round-trip
// =============================================================================

describe('substitute with LaTeX round-trip', () => {
	it('x+1 with x=5 gives 5 + 1', () => {
		// LaTeX generator adds spaces around operators
		expect(substLatex('x+1', { x: 5 })).toBe('5 + 1');
	});

	it('x*y with x=2, y=3 gives 2 cdot 3', () => {
		const result = substLatex('x \\cdot y', { x: 2, y: 3 });
		expect(result).toBe('2 \\cdot 3');
	});

	it('frac{x}{y} with x=1, y=2 gives dfrac{1}{2}', () => {
		expect(substLatex('\\frac{x}{y}', { x: 1, y: 2 })).toBe('\\dfrac{1}{2}');
	});

	it('x^2 with x=3 gives 3^2', () => {
		// LaTeX generator uses braces only when needed
		expect(substLatex('x^2', { x: 3 })).toBe('3^2');
	});

	it('sin(x) with x=0 gives sin(0)', () => {
		// LaTeX generator adds spaces inside delimiters
		expect(substLatex('\\sin(x)', { x: 0 })).toBe('\\sin\\left( 0 \\right)');
	});
});
