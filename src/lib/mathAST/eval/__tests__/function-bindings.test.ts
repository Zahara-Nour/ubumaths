/**
 * Unit tests for MathAST function bindings and evaluation
 */

import { describe, it, expect } from 'vitest';
import {
	applyFunction,
	substituteFunction,
	applyComposition,
	getUndefinedFunctions,
	FunctionBindingError
} from '../function-bindings';
import type { FunctionBindings, FunctionDefinition } from '../function-bindings';
import { evaluate } from '../evaluate';
import { substitute } from '../substitute';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import {
	number,
	variable,
	add,
	multiply,
	power,
	func,
	derivativeFunc,
	inverseFunc,
	compose
} from '../../factory';
import type { FunctionNode } from '../../types';
import type { Rational } from '../../normal/types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to check if a value is a Rational
 */
function isRational(value: Rational | number): value is Rational {
	return typeof value === 'object' && 'n' in value && 'd' in value;
}

/**
 * Helper to create a FunctionDefinition from LaTeX
 */
function defFromLatex(latex: string, params: string[]): FunctionDefinition {
	return {
		expression: parseLatex(latex),
		parameters: params
	};
}

/**
 * Helper to substitute functions and convert to LaTeX for comparison
 */
function _substFuncLatex(
	latex: string,
	bindings: FunctionBindings,
	parserOpts?: { genericFunctions?: { names: string[] } }
): string {
	const ast = parseLatex(latex, parserOpts);
	const result = substituteFunction(ast, bindings);
	return toLatex(result);
}

// =============================================================================
// Basic Function Substitution Tests
// =============================================================================

describe('applyFunction', () => {
	describe('basic substitution', () => {
		it('substitutes f(x) = x^2 with f(3) to get 3^2', () => {
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('2')),
				parameters: ['x']
			};
			const funcNode = func('f', [number('3')]) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).not.toBeNull();
			expect(result?.type).toBe('superscript');
			if (result?.type === 'superscript') {
				expect(result.base.type).toBe('number');
				if (result.base.type === 'number') {
					expect(result.base.value).toBe('3');
				}
			}
		});

		it('substitutes f(x) = x + 1 with f(5) to get 5 + 1', () => {
			const fDef: FunctionDefinition = {
				expression: add(variable('x'), number('1')),
				parameters: ['x']
			};
			const funcNode = func('f', [number('5')]) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).not.toBeNull();
			expect(result?.type).toBe('addition');
		});

		it('returns null for function not in bindings', () => {
			const funcNode = func('g', [number('3')]) as FunctionNode;

			const result = applyFunction(funcNode, {});

			expect(result).toBeNull();
		});

		it('returns null for built-in functions', () => {
			const funcNode = func('sin', [number('0')]) as FunctionNode;
			// Built-in functions like sin are handled separately
			// Let's test with a proper built-in scenario (no bindings)
			const result = applyFunction(funcNode, {});

			expect(result).toBeNull();
		});
	});

	describe('multi-argument functions', () => {
		it('substitutes g(x, y) = x + y with g(2, 3) to get 2 + 3', () => {
			const gDef: FunctionDefinition = {
				expression: add(variable('x'), variable('y')),
				parameters: ['x', 'y']
			};
			const funcNode = func('g', [number('2'), number('3')]) as FunctionNode;

			const result = applyFunction(funcNode, { g: gDef });

			expect(result).not.toBeNull();
			expect(result?.type).toBe('addition');
			if (result?.type === 'addition') {
				expect(result.left.type).toBe('number');
				expect(result.right.type).toBe('number');
			}
		});

		it('throws FunctionBindingError for argument count mismatch', () => {
			const gDef: FunctionDefinition = {
				expression: add(variable('x'), variable('y')),
				parameters: ['x', 'y']
			};
			const funcNode = func('g', [number('2')]) as FunctionNode;

			expect(() => applyFunction(funcNode, { g: gDef })).toThrow(FunctionBindingError);
			expect(() => applyFunction(funcNode, { g: gDef })).toThrow(
				/expects 2 argument\(s\) but got 1/
			);
		});

		it('throws for too many arguments', () => {
			const fDef: FunctionDefinition = {
				expression: variable('x'),
				parameters: ['x']
			};
			const funcNode = func('f', [number('1'), number('2')]) as FunctionNode;

			expect(() => applyFunction(funcNode, { f: fDef })).toThrow(FunctionBindingError);
		});
	});

	describe('derivative functions stay symbolic', () => {
		it("does not substitute f'(x) even with f defined", () => {
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('2')),
				parameters: ['x']
			};
			const funcNode = derivativeFunc('f', [variable('x')], 1) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).toBeNull();
		});

		it("does not substitute f''(x) (second derivative)", () => {
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('3')),
				parameters: ['x']
			};
			const funcNode = derivativeFunc('f', [variable('x')], 2) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).toBeNull();
		});
	});

	describe('inverse functions stay symbolic', () => {
		it('does not substitute f^{-1}(x) even with f defined', () => {
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('2')),
				parameters: ['x']
			};
			const funcNode = inverseFunc('f', [variable('x')]) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).toBeNull();
		});
	});
});

// =============================================================================
// substituteFunction Tests
// =============================================================================

describe('substituteFunction', () => {
	describe('basic substitution', () => {
		it('substitutes f(3) with f(x) = x^2', () => {
			const ast = func('f', [number('3')]);
			const bindings: FunctionBindings = {
				f: defFromLatex('x^2', ['x'])
			};

			const result = substituteFunction(ast, bindings);

			expect(result.type).toBe('superscript');
		});

		it('returns unchanged for empty bindings', () => {
			const ast = func('f', [number('3')]);

			const result = substituteFunction(ast, {});

			expect(result).toEqual(ast);
		});

		it('handles expressions containing function calls', () => {
			// 2 + f(3) with f(x) = x^2
			const ast = add(number('2'), func('f', [number('3')]));
			const bindings: FunctionBindings = {
				f: defFromLatex('x^2', ['x'])
			};

			const result = substituteFunction(ast, bindings);

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				expect(result.right.type).toBe('superscript');
			}
		});
	});

	describe('nested function calls', () => {
		it('substitutes f(g(2)) with f and g defined', () => {
			// f(x) = x^2, g(x) = x + 1
			// f(g(2)) = f(3) = 9
			const ast = func('f', [func('g', [number('2')])]);
			const bindings: FunctionBindings = {
				f: defFromLatex('x^2', ['x']),
				g: defFromLatex('x + 1', ['x'])
			};

			const result = substituteFunction(ast, bindings);

			// After full substitution, should be (2+1)^2
			expect(result.type).toBe('superscript');
		});

		it('handles deeply nested calls: f(f(f(2)))', () => {
			// f(x) = x + 1
			// f(f(f(2))) = f(f(3)) = f(4) = 5
			const ast = func('f', [func('f', [func('f', [number('2')])])]);
			const bindings: FunctionBindings = {
				f: defFromLatex('x + 1', ['x'])
			};

			const result = substituteFunction(ast, bindings);

			// After substitution, result is addition structure
			expect(result.type).toBe('addition');
		});
	});

	describe('preserves non-substitutable functions', () => {
		it('preserves derivative functions in substitution', () => {
			const ast = add(func('f', [number('3')]), derivativeFunc('f', [variable('x')], 1));
			const bindings: FunctionBindings = {
				f: defFromLatex('x^2', ['x'])
			};

			const result = substituteFunction(ast, bindings);

			expect(result.type).toBe('addition');
			if (result.type === 'addition') {
				// f(3) should be substituted
				expect(result.left.type).toBe('superscript');
				// f'(x) should be preserved
				expect(result.right.type).toBe('function');
				if (result.right.type === 'function') {
					expect(result.right.derivativeOrder).toBe(1);
				}
			}
		});
	});

	describe('maxIterations limit', () => {
		it('respects maxIterations to prevent infinite loops', () => {
			// f(x) = f(x+1) would loop forever
			const ast = func('f', [number('0')]);
			const bindings: FunctionBindings = {
				f: {
					expression: func('f', [add(variable('x'), number('1'))]),
					parameters: ['x']
				}
			};

			// Should not hang, but also won't fully resolve
			const result = substituteFunction(ast, bindings, { maxIterations: 3 });

			// Result should still be a function (partially expanded)
			expect(result).toBeDefined();
		});
	});
});

// =============================================================================
// Composition Tests
// =============================================================================

describe('applyComposition', () => {
	it('expands (f o g)(x) to f(g(x))', () => {
		// f(t) = t^2, g(t) = t + 1
		// (f o g)(2) = f(g(2)) = f(3) = 9
		const fDef: FunctionDefinition = defFromLatex('t^2', ['t']);
		const gDef: FunctionDefinition = defFromLatex('t + 1', ['t']);

		const composition = compose(variable('f'), variable('g'));
		const result = applyComposition(composition, [number('2')], { f: fDef, g: gDef });

		// Result should be (2+1)^2
		expect(result.type).toBe('superscript');
	});

	it('handles nested compositions', () => {
		// (f o g o h)(x) = f(g(h(x)))
		const fDef: FunctionDefinition = defFromLatex('t^2', ['t']);
		const gDef: FunctionDefinition = defFromLatex('t + 1', ['t']);
		const hDef: FunctionDefinition = defFromLatex('2t', ['t']);

		// (f o g) o h
		const composition = compose(compose(variable('f'), variable('g')), variable('h'));
		const result = applyComposition(composition, [number('1')], { f: fDef, g: gDef, h: hDef });

		// (f o g o h)(1) = f(g(h(1))) = f(g(2)) = f(3) = 9
		expect(result).toBeDefined();
	});
});

// =============================================================================
// Integration with evaluate
// =============================================================================

describe('evaluate with function bindings', () => {
	describe('basic evaluation', () => {
		it('evaluates f(3) = 9 with f(x) = x^2', () => {
			const ast = parseLatex('f(3)', { genericFunctions: { names: ['f'] } });
			const result = evaluate(ast, {
				functions: { f: defFromLatex('x^2', ['x']) }
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(9n);
				expect(result.value.d).toBe(1n);
			}
		});

		it('evaluates g(2, 3) = 5 with g(x, y) = x + y', () => {
			const ast = func('g', [number('2'), number('3')]);
			const result = evaluate(ast, {
				functions: {
					g: {
						expression: add(variable('x'), variable('y')),
						parameters: ['x', 'y']
					}
				}
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(5n);
				expect(result.value.d).toBe(1n);
			}
		});
	});

	describe('nested function evaluation', () => {
		it('evaluates f(g(2)) = 9 with f(x) = x^2 and g(x) = x + 1', () => {
			const ast = func('f', [func('g', [number('2')])]);
			const result = evaluate(ast, {
				functions: {
					f: defFromLatex('x^2', ['x']),
					g: defFromLatex('x + 1', ['x'])
				}
			});

			// f(g(2)) = f(3) = 9
			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(9n);
				expect(result.value.d).toBe(1n);
			}
		});
	});

	describe('error cases', () => {
		it('throws for undefined generic function', () => {
			const ast = func('h', [number('3')]);

			expect(() => evaluate(ast)).toThrow(/Unknown function: h/);
		});

		it('throws descriptive error for derivative function without definition', () => {
			const ast = derivativeFunc('f', [number('3')], 1);

			expect(() => evaluate(ast)).toThrow(/derivative function/i);
		});

		it('throws descriptive error for inverse function without definition', () => {
			const ast = inverseFunc('f', [number('3')]);

			expect(() => evaluate(ast)).toThrow(/inverse function/i);
		});
	});

	describe('preserves backward compatibility', () => {
		it('evaluates expressions without function bindings as before', () => {
			const ast = parseLatex('2+3');
			const result = evaluate(ast);

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(5n);
			}
		});

		it('evaluates built-in functions without needing bindings', () => {
			const ast = parseLatex('\\sqrt{4}');
			const result = evaluate(ast);

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(2n);
			}
		});
	});
});

// =============================================================================
// getUndefinedFunctions Tests
// =============================================================================

describe('getUndefinedFunctions', () => {
	it('returns empty array when all functions are defined or built-in', () => {
		const ast = add(func('sin', [number('0')]), func('f', [number('3')]));
		const bindings: FunctionBindings = {
			f: defFromLatex('x^2', ['x'])
		};

		const undefinedFuncs = getUndefinedFunctions(ast, bindings);

		expect(undefinedFuncs).toEqual([]);
	});

	it('returns names of undefined functions', () => {
		const ast = add(func('f', [number('1')]), func('g', [number('2')]));
		const bindings: FunctionBindings = {
			f: defFromLatex('x', ['x'])
		};

		const undefinedFuncs = getUndefinedFunctions(ast, bindings);

		expect(undefinedFuncs).toContain('g');
		expect(undefinedFuncs).not.toContain('f');
	});

	it('excludes derivative functions from undefined list', () => {
		const ast = derivativeFunc('f', [variable('x')], 1);

		const undefinedFuncs = getUndefinedFunctions(ast, {});

		expect(undefinedFuncs).toEqual([]);
	});

	it('excludes inverse functions from undefined list', () => {
		const ast = inverseFunc('f', [variable('x')]);

		const undefinedFuncs = getUndefinedFunctions(ast, {});

		expect(undefinedFuncs).toEqual([]);
	});

	it('excludes built-in functions', () => {
		const ast = func('sin', [func('cos', [number('0')])]);

		const undefinedFuncs = getUndefinedFunctions(ast, {});

		expect(undefinedFuncs).toEqual([]);
	});
});

// =============================================================================
// Integration Tests with LaTeX parsing
// =============================================================================

describe('function bindings with LaTeX parsing', () => {
	it('parses and evaluates f(x) with generic function config', () => {
		const ast = parseLatex('f(3)', { genericFunctions: { names: ['f'] } });
		expect(ast.type).toBe('function');
		if (ast.type === 'function') {
			expect(ast.name).toBe('f');
		}

		const result = evaluate(ast, {
			functions: { f: defFromLatex('x^2', ['x']) }
		});

		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(9n);
		}
	});

	it('handles f(x+1) where x is substituted', () => {
		// Create f(x+1), then we'll need to substitute x = 2 first
		const ast = parseLatex('f(x+1)', { genericFunctions: { names: ['f'] } });

		// First substitute x = 2 to get f(3)
		const substituted = substitute(ast, { x: 2 });

		// Then evaluate with f(t) = t^2
		const result = evaluate(substituted, {
			functions: { f: defFromLatex('t^2', ['t']) }
		});

		// f(2+1) = f(3) = 9
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(9n);
		}
	});

	it('evaluates 2*f(3) + 1 with f(x) = x^2', () => {
		const ast = parseLatex('2 \\cdot f(3) + 1', { genericFunctions: { names: ['f'] } });

		const result = evaluate(ast, {
			functions: { f: defFromLatex('x^2', ['x']) }
		});

		// 2*9 + 1 = 19
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(19n);
		}
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
	it('handles function returning constant', () => {
		// f(x) = 5 (constant function)
		const ast = func('f', [number('999')]);
		const result = evaluate(ast, {
			functions: { f: { expression: number('5'), parameters: ['x'] } }
		});

		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(5n);
		}
	});

	it('handles identity function', () => {
		// id(x) = x
		const ast = func('id', [number('42')]);
		const result = evaluate(ast, {
			functions: { id: { expression: variable('x'), parameters: ['x'] } }
		});

		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(42n);
		}
	});

	it('handles zero-argument function (constant)', () => {
		// c() = 7 (no parameters)
		const ast = func('c', []);
		const result = evaluate(ast, {
			functions: { c: { expression: number('7'), parameters: [] } }
		});

		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(7n);
		}
	});

	it('substitutes function with complex argument', () => {
		// f(2+3) with f(x) = x^2 should give (2+3)^2 = 25
		const ast = func('f', [add(number('2'), number('3'))]);
		const result = evaluate(ast, {
			functions: { f: defFromLatex('x^2', ['x']) }
		});

		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(25n);
		}
	});

	it('handles function whose body contains another function call', () => {
		// f(x) = g(x) + 1, g(x) = x^2
		// f(3) = g(3) + 1 = 9 + 1 = 10
		const ast = func('f', [number('3')]);
		const result = evaluate(ast, {
			functions: {
				f: {
					expression: add(func('g', [variable('x')]), number('1')),
					parameters: ['x']
				},
				g: defFromLatex('x^2', ['x'])
			}
		});

		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(10n);
		}
	});
});

// =============================================================================
// Derivative Function Tests
// =============================================================================

describe('derivative functions with pre-computed derivatives', () => {
	describe('applyFunction with derivatives', () => {
		it("substitutes f'(x) using pre-computed derivative", () => {
			// f(x) = x^2, f'(x) = 2x
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('2')),
				parameters: ['x'],
				derivative: multiply(number('2'), variable('x'), 'implicit')
			};
			const funcNode = derivativeFunc('f', [number('3')], 1) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).not.toBeNull();
			expect(result?.type).toBe('multiplication');
		});

		it("returns null for f'' without higher-order derivative support", () => {
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('2')),
				parameters: ['x'],
				derivative: multiply(number('2'), variable('x'), 'implicit')
			};
			const funcNode = derivativeFunc('f', [number('3')], 2) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			// Second derivative not yet supported
			expect(result).toBeNull();
		});

		it("returns null for f' without pre-computed derivative", () => {
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('2')),
				parameters: ['x']
				// No derivative field
			};
			const funcNode = derivativeFunc('f', [number('3')], 1) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).toBeNull();
		});
	});

	describe('substituteFunction with derivatives', () => {
		it("substitutes f'(3) when derivative is defined", () => {
			const bindings: FunctionBindings = {
				f: {
					expression: parseLatex('x^2'),
					parameters: ['x'],
					derivative: parseLatex('2x')
				}
			};

			const ast = derivativeFunc('f', [number('3')], 1);
			const result = substituteFunction(ast, bindings);

			// f'(3) = 2*3
			expect(result.type).toBe('multiplication');
		});

		it("preserves f'(3) when no derivative is defined", () => {
			const bindings: FunctionBindings = {
				f: {
					expression: parseLatex('x^2'),
					parameters: ['x']
					// No derivative
				}
			};

			const ast = derivativeFunc('f', [number('3')], 1);
			const result = substituteFunction(ast, bindings);

			// Should remain as f'(3)
			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(result.derivativeOrder).toBe(1);
			}
		});
	});

	describe('evaluate with derivatives', () => {
		it("evaluates f'(2) = 4 with f(x) = x^2, f'(x) = 2x", () => {
			const ast = derivativeFunc('f', [number('2')], 1);
			const result = evaluate(ast, {
				functions: {
					f: {
						expression: parseLatex('x^2'),
						parameters: ['x'],
						derivative: parseLatex('2x')
					}
				}
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(4n); // 2*2 = 4
				expect(result.value.d).toBe(1n);
			}
		});

		it("evaluates f'(3) = 6 with f(x) = x^2, f'(x) = 2x", () => {
			const ast = derivativeFunc('f', [number('3')], 1);
			const result = evaluate(ast, {
				functions: {
					f: {
						expression: parseLatex('x^2'),
						parameters: ['x'],
						derivative: parseLatex('2x')
					}
				}
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(6n); // 2*3 = 6
			}
		});

		it("evaluates f'(1) = 3 with f(x) = x^3, f'(x) = 3x^2", () => {
			const ast = derivativeFunc('f', [number('1')], 1);
			const result = evaluate(ast, {
				functions: {
					f: {
						expression: parseLatex('x^3'),
						parameters: ['x'],
						derivative: parseLatex('3x^2')
					}
				}
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(3n); // 3*1^2 = 3
			}
		});

		it("evaluates f'(2) = 12 with f(x) = x^3, f'(x) = 3x^2", () => {
			const ast = derivativeFunc('f', [number('2')], 1);
			const result = evaluate(ast, {
				functions: {
					f: {
						expression: parseLatex('x^3'),
						parameters: ['x'],
						derivative: parseLatex('3x^2')
					}
				}
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(12n); // 3*4 = 12
			}
		});
	});
});

// =============================================================================
// Inverse Function Tests
// =============================================================================

describe('inverse functions with pre-computed inverses', () => {
	describe('applyFunction with inverses', () => {
		it('substitutes f^{-1}(x) using pre-computed inverse', () => {
			// f(x) = x^2, f^{-1}(x) = sqrt(x)
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('2')),
				parameters: ['x'],
				inverse: func('sqrt', [variable('x')])
			};
			const funcNode = inverseFunc('f', [number('4')]) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).not.toBeNull();
			expect(result?.type).toBe('function');
			if (result?.type === 'function') {
				expect(result.name).toBe('sqrt');
			}
		});

		it('returns null for f^{-1} without pre-computed inverse', () => {
			const fDef: FunctionDefinition = {
				expression: power(variable('x'), number('2')),
				parameters: ['x']
				// No inverse field
			};
			const funcNode = inverseFunc('f', [number('4')]) as FunctionNode;

			const result = applyFunction(funcNode, { f: fDef });

			expect(result).toBeNull();
		});
	});

	describe('substituteFunction with inverses', () => {
		it('substitutes f^{-1}(4) when inverse is defined', () => {
			const bindings: FunctionBindings = {
				f: {
					expression: parseLatex('x^2'),
					parameters: ['x'],
					inverse: parseLatex('\\sqrt{x}')
				}
			};

			const ast = inverseFunc('f', [number('4')]);
			const result = substituteFunction(ast, bindings);

			// f^{-1}(4) = sqrt(4)
			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(result.name).toBe('sqrt');
			}
		});

		it('preserves f^{-1}(4) when no inverse is defined', () => {
			const bindings: FunctionBindings = {
				f: {
					expression: parseLatex('x^2'),
					parameters: ['x']
					// No inverse
				}
			};

			const ast = inverseFunc('f', [number('4')]);
			const result = substituteFunction(ast, bindings);

			// Should remain as f^{-1}(4)
			expect(result.type).toBe('function');
			if (result.type === 'function') {
				expect(result.isInverse).toBe(true);
			}
		});
	});

	describe('evaluate with inverses', () => {
		it('evaluates f^{-1}(4) = 2 with f(x) = x^2, f^{-1}(x) = sqrt(x)', () => {
			const ast = inverseFunc('f', [number('4')]);
			const result = evaluate(ast, {
				functions: {
					f: {
						expression: parseLatex('x^2'),
						parameters: ['x'],
						inverse: parseLatex('\\sqrt{x}')
					}
				}
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(2n); // sqrt(4) = 2
				expect(result.value.d).toBe(1n);
			}
		});

		it('evaluates f^{-1}(9) = 3 with f(x) = x^2, f^{-1}(x) = sqrt(x)', () => {
			const ast = inverseFunc('f', [number('9')]);
			const result = evaluate(ast, {
				functions: {
					f: {
						expression: parseLatex('x^2'),
						parameters: ['x'],
						inverse: parseLatex('\\sqrt{x}')
					}
				}
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(3n); // sqrt(9) = 3
			}
		});

		it('evaluates f^{-1}(5) = 4 with f(x) = x + 1, f^{-1}(x) = x - 1', () => {
			const ast = inverseFunc('f', [number('5')]);
			const result = evaluate(ast, {
				functions: {
					f: {
						expression: parseLatex('x + 1'),
						parameters: ['x'],
						inverse: parseLatex('x - 1')
					}
				}
			});

			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(4n); // 5 - 1 = 4
			}
		});
	});
});

// =============================================================================
// Combined Derivative and Inverse Tests
// =============================================================================

describe('combined derivative and inverse function tests', () => {
	it('supports function with both derivative and inverse defined', () => {
		const bindings: FunctionBindings = {
			f: {
				expression: parseLatex('x^2'),
				parameters: ['x'],
				derivative: parseLatex('2x'),
				inverse: parseLatex('\\sqrt{x}')
			}
		};

		// Evaluate f(3) = 9
		const fResult = evaluate(func('f', [number('3')]), { functions: bindings });
		expect(isRational(fResult.value) && fResult.value.n === 9n).toBe(true);

		// Evaluate f'(3) = 6
		const fPrimeResult = evaluate(derivativeFunc('f', [number('3')], 1), { functions: bindings });
		expect(isRational(fPrimeResult.value) && fPrimeResult.value.n === 6n).toBe(true);

		// Evaluate f^{-1}(9) = 3
		const fInvResult = evaluate(inverseFunc('f', [number('9')]), { functions: bindings });
		expect(isRational(fInvResult.value) && fInvResult.value.n === 3n).toBe(true);
	});

	it("evaluates expression with mixed function types: f(2) + f'(2) + f^{-1}(4)", () => {
		const bindings: FunctionBindings = {
			f: {
				expression: parseLatex('x^2'),
				parameters: ['x'],
				derivative: parseLatex('2x'),
				inverse: parseLatex('\\sqrt{x}')
			}
		};

		// f(2) + f'(2) + f^{-1}(4) = 4 + 4 + 2 = 10
		const expr = add(
			add(func('f', [number('2')]), derivativeFunc('f', [number('2')], 1)),
			inverseFunc('f', [number('4')])
		);
		const result = evaluate(expr, { functions: bindings });

		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(10n);
		}
	});
});

// =============================================================================
// FunctionBindingError Tests
// =============================================================================

describe('FunctionBindingError', () => {
	it('has correct name and properties', () => {
		const error = new FunctionBindingError('Test message', 'f', 'Some details');

		expect(error.name).toBe('FunctionBindingError');
		expect(error.message).toBe('Test message');
		expect(error.functionName).toBe('f');
		expect(error.details).toBe('Some details');
	});

	it('is an instance of Error', () => {
		const error = new FunctionBindingError('Test', 'f');

		expect(error instanceof Error).toBe(true);
		expect(error instanceof FunctionBindingError).toBe(true);
	});
});
