/**
 * Unit tests for derivative and inverse function features in MathAST
 *
 * Tests for:
 * - Factory functions (derivativeFunc, inverseFunc)
 * - Type guards (isDerivativeFunction, isInverseFunction, hasDerivativeOrder)
 * - LaTeX generation of derivatives and inverses
 * - Custom syntax generation of derivatives and inverses
 * - Transforms preservation of derivativeOrder and isInverse
 */

import { describe, it, expect } from 'vitest';
import { func, derivativeFunc, inverseFunc, variable, number } from '../factory';
import { isDerivativeFunction, isInverseFunction, hasDerivativeOrder, isFunction } from '../guards';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { cloneNode, mapNode } from '../transforms';
import type { FunctionNode } from '../types';

describe('Derivative and Inverse Function Features', () => {
	// =============================================================================
	// Factory Functions
	// =============================================================================

	describe('Factory: derivativeFunc', () => {
		it('creates a first derivative function by default', () => {
			const node = derivativeFunc('f', [variable('x')]);
			expect(node.type).toBe('function');
			expect(node.name).toBe('f');
			expect(node.derivativeOrder).toBe(1);
			expect(node.args).toHaveLength(1);
		});

		it('creates a second derivative function', () => {
			const node = derivativeFunc('f', [variable('x')], 2);
			expect(node.derivativeOrder).toBe(2);
		});

		it('creates a third derivative function', () => {
			const node = derivativeFunc('f', [variable('x')], 3);
			expect(node.derivativeOrder).toBe(3);
		});

		it('creates a higher order derivative function', () => {
			const node = derivativeFunc('f', [variable('x')], 5);
			expect(node.derivativeOrder).toBe(5);
		});

		it('accepts additional options', () => {
			const node = derivativeFunc('f', [variable('x')], 1, { metadata: { color: 'red' } });
			expect(node.derivativeOrder).toBe(1);
			expect(node.metadata?.color).toBe('red');
		});

		it('can have a base subscript with derivative', () => {
			const node = derivativeFunc('f', [variable('x')], 1, { base: number('2') });
			expect(node.derivativeOrder).toBe(1);
			expect(node.base).toBeDefined();
		});
	});

	describe('Factory: inverseFunc', () => {
		it('creates an inverse function', () => {
			const node = inverseFunc('f', [variable('x')]);
			expect(node.type).toBe('function');
			expect(node.name).toBe('f');
			expect(node.isInverse).toBe(true);
			expect(node.args).toHaveLength(1);
		});

		it('creates an inverse trig function', () => {
			const node = inverseFunc('sin', [variable('x')]);
			expect(node.name).toBe('sin');
			expect(node.isInverse).toBe(true);
		});

		it('accepts additional options', () => {
			const node = inverseFunc('f', [variable('x')], { metadata: { color: 'blue' } });
			expect(node.isInverse).toBe(true);
			expect(node.metadata?.color).toBe('blue');
		});

		it('can have a base subscript with inverse', () => {
			const node = inverseFunc('f', [variable('x')], { base: number('2') });
			expect(node.isInverse).toBe(true);
			expect(node.base).toBeDefined();
		});
	});

	describe('Factory: func with derivativeOrder and isInverse options', () => {
		it('creates a derivative function via func options', () => {
			const node = func('g', [variable('x')], { derivativeOrder: 2 });
			expect(node.derivativeOrder).toBe(2);
		});

		it('creates an inverse function via func options', () => {
			const node = func('g', [variable('x')], { isInverse: true });
			expect(node.isInverse).toBe(true);
		});

		it('does not include derivativeOrder when 0', () => {
			const node = func('g', [variable('x')], { derivativeOrder: 0 });
			// derivativeOrder: 0 is still set (but not > 0, so not a derivative)
			expect(node.derivativeOrder).toBe(0);
		});
	});

	// =============================================================================
	// Type Guards
	// =============================================================================

	describe('Guard: isDerivativeFunction', () => {
		it('returns true for first derivative', () => {
			const node = derivativeFunc('f', [variable('x')], 1);
			expect(isDerivativeFunction(node)).toBe(true);
		});

		it('returns true for higher order derivative', () => {
			const node = derivativeFunc('f', [variable('x')], 5);
			expect(isDerivativeFunction(node)).toBe(true);
		});

		it('returns false for regular function', () => {
			const node = func('f', [variable('x')]);
			expect(isDerivativeFunction(node)).toBe(false);
		});

		it('returns false for inverse function', () => {
			const node = inverseFunc('f', [variable('x')]);
			expect(isDerivativeFunction(node)).toBe(false);
		});

		it('returns false for non-function nodes', () => {
			const node = variable('x');
			expect(isDerivativeFunction(node)).toBe(false);
		});

		it('returns false for derivativeOrder of 0', () => {
			const node = func('f', [variable('x')], { derivativeOrder: 0 });
			expect(isDerivativeFunction(node)).toBe(false);
		});
	});

	describe('Guard: isInverseFunction', () => {
		it('returns true for inverse function', () => {
			const node = inverseFunc('f', [variable('x')]);
			expect(isInverseFunction(node)).toBe(true);
		});

		it('returns false for regular function', () => {
			const node = func('f', [variable('x')]);
			expect(isInverseFunction(node)).toBe(false);
		});

		it('returns false for derivative function', () => {
			const node = derivativeFunc('f', [variable('x')]);
			expect(isInverseFunction(node)).toBe(false);
		});

		it('returns false for non-function nodes', () => {
			const node = variable('x');
			expect(isInverseFunction(node)).toBe(false);
		});
	});

	describe('Guard: hasDerivativeOrder', () => {
		it('returns true for derivative function', () => {
			const node = derivativeFunc('f', [variable('x')]);
			expect(hasDerivativeOrder(node)).toBe(true);
		});

		it('returns true for derivativeOrder of 0', () => {
			const node = func('f', [variable('x')], { derivativeOrder: 0 });
			expect(hasDerivativeOrder(node)).toBe(true);
		});

		it('returns false for regular function', () => {
			const node = func('f', [variable('x')]);
			expect(hasDerivativeOrder(node)).toBe(false);
		});

		it('returns false for non-function nodes', () => {
			const node = variable('x');
			expect(hasDerivativeOrder(node)).toBe(false);
		});
	});

	// =============================================================================
	// LaTeX Generation
	// =============================================================================

	describe('LaTeX Generator: derivatives', () => {
		it("generates f'(x) for first derivative", () => {
			const node = derivativeFunc('f', [variable('x')], 1);
			expect(toLatex(node)).toBe("f'\\left( x \\right)");
		});

		it("generates f''(x) for second derivative", () => {
			const node = derivativeFunc('f', [variable('x')], 2);
			expect(toLatex(node)).toBe("f''\\left( x \\right)");
		});

		it("generates f'''(x) for third derivative", () => {
			const node = derivativeFunc('f', [variable('x')], 3);
			expect(toLatex(node)).toBe("f'''\\left( x \\right)");
		});

		it('generates f^{(4)}(x) for fourth derivative', () => {
			const node = derivativeFunc('f', [variable('x')], 4);
			expect(toLatex(node)).toBe('f^{(4)}\\left( x \\right)');
		});

		it('generates f^{(10)}(x) for tenth derivative', () => {
			const node = derivativeFunc('f', [variable('x')], 10);
			expect(toLatex(node)).toBe('f^{(10)}\\left( x \\right)');
		});

		it("generates \\sin'(x) for derivative of known function", () => {
			const node = derivativeFunc('sin', [variable('x')], 1);
			expect(toLatex(node)).toBe("\\sin'\\left( x \\right)");
		});

		it("generates g''_2(x) for derivative with base", () => {
			const node = derivativeFunc('g', [variable('x')], 2, { base: number('2') });
			expect(toLatex(node)).toBe("g''_2\\left( x \\right)");
		});
	});

	describe('LaTeX Generator: inverses', () => {
		it('generates f^{-1}(x) for inverse function', () => {
			const node = inverseFunc('f', [variable('x')]);
			expect(toLatex(node)).toBe('f^{-1}\\left( x \\right)');
		});

		it('generates \\sin^{-1}(x) for inverse sin', () => {
			const node = inverseFunc('sin', [variable('x')]);
			expect(toLatex(node)).toBe('\\sin^{-1}\\left( x \\right)');
		});

		it('generates f^{-1}_2(x) for inverse with base', () => {
			const node = inverseFunc('f', [variable('x')], { base: number('2') });
			expect(toLatex(node)).toBe('f^{-1}_2\\left( x \\right)');
		});
	});

	describe('LaTeX Generator: priority handling', () => {
		it('derivative takes priority over power', () => {
			// A function with both derivativeOrder and power should use derivativeOrder
			const node = func('f', [variable('x')], { derivativeOrder: 1, power: number('2') });
			expect(toLatex(node)).toBe("f'\\left( x \\right)");
		});

		it('inverse takes priority over power when no derivative', () => {
			const node = func('f', [variable('x')], { isInverse: true, power: number('2') });
			expect(toLatex(node)).toBe('f^{-1}\\left( x \\right)');
		});

		it('regular power used when no derivative or inverse', () => {
			const node = func('f', [variable('x')], { power: number('2') });
			expect(toLatex(node)).toBe('f^2\\left( x \\right)');
		});
	});

	// =============================================================================
	// Custom Syntax Generation
	// =============================================================================

	describe('Custom Generator: derivatives', () => {
		it("generates f'(x) for first derivative", () => {
			const node = derivativeFunc('f', [variable('x')], 1);
			expect(toCustom(node)).toBe("f'(x)");
		});

		it("generates f''(x) for second derivative", () => {
			const node = derivativeFunc('f', [variable('x')], 2);
			expect(toCustom(node)).toBe("f''(x)");
		});

		it("generates f'''(x) for third derivative", () => {
			const node = derivativeFunc('f', [variable('x')], 3);
			expect(toCustom(node)).toBe("f'''(x)");
		});

		it('generates f^{(4)}(x) for fourth derivative', () => {
			const node = derivativeFunc('f', [variable('x')], 4);
			expect(toCustom(node)).toBe('f^{(4)}(x)');
		});

		it("generates sin'(x) for derivative of trig function", () => {
			const node = derivativeFunc('sin', [variable('x')], 1);
			expect(toCustom(node)).toBe("sin'(x)");
		});
	});

	describe('Custom Generator: inverses', () => {
		it('generates f^{-1}(x) for inverse function', () => {
			const node = inverseFunc('f', [variable('x')]);
			expect(toCustom(node)).toBe('f^{-1}(x)');
		});

		it('generates sin^{-1}(x) for inverse sin', () => {
			const node = inverseFunc('sin', [variable('x')]);
			expect(toCustom(node)).toBe('sin^{-1}(x)');
		});
	});

	// =============================================================================
	// Transforms
	// =============================================================================

	describe('Transforms: cloneNode', () => {
		it('preserves derivativeOrder when cloning', () => {
			const original = derivativeFunc('f', [variable('x')], 2);
			const cloned = cloneNode(original) as FunctionNode;
			expect(cloned.derivativeOrder).toBe(2);
			expect(cloned.name).toBe('f');
		});

		it('preserves isInverse when cloning', () => {
			const original = inverseFunc('f', [variable('x')]);
			const cloned = cloneNode(original) as FunctionNode;
			expect(cloned.isInverse).toBe(true);
			expect(cloned.name).toBe('f');
		});

		it('preserves all function properties when cloning derivative', () => {
			const original = derivativeFunc('g', [variable('x')], 3, {
				base: number('2'),
				metadata: { color: 'red' }
			});
			const cloned = cloneNode(original) as FunctionNode;
			expect(cloned.derivativeOrder).toBe(3);
			expect(cloned.base).toBeDefined();
			expect(cloned.metadata?.color).toBe('red');
		});
	});

	describe('Transforms: mapNode', () => {
		it('preserves derivativeOrder when mapping', () => {
			const original = derivativeFunc('f', [variable('x')], 2);
			const mapped = mapNode(original, (node) => node) as FunctionNode;
			expect(mapped.derivativeOrder).toBe(2);
		});

		it('preserves isInverse when mapping', () => {
			const original = inverseFunc('f', [variable('x')]);
			const mapped = mapNode(original, (node) => node) as FunctionNode;
			expect(mapped.isInverse).toBe(true);
		});

		it('transforms arguments while preserving derivative', () => {
			const original = derivativeFunc('f', [variable('x')], 1);
			const mapped = mapNode(original, (node) => {
				if (node.type === 'variable' && node.name === 'x') {
					return variable('y');
				}
				return node;
			}) as FunctionNode;
			expect(mapped.derivativeOrder).toBe(1);
			expect((mapped.args[0] as { name: string }).name).toBe('y');
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('Edge Cases', () => {
		it('regular function without derivative fields works normally', () => {
			const node = func('f', [variable('x')]);
			expect(node.derivativeOrder).toBeUndefined();
			expect(node.isInverse).toBeUndefined();
			expect(toLatex(node)).toBe('f\\left( x \\right)');
		});

		it('type guards correctly distinguish function types', () => {
			const regular = func('f', [variable('x')]);
			const derivative = derivativeFunc('f', [variable('x')]);
			const inverse = inverseFunc('f', [variable('x')]);

			expect(isFunction(regular)).toBe(true);
			expect(isFunction(derivative)).toBe(true);
			expect(isFunction(inverse)).toBe(true);

			expect(isDerivativeFunction(regular)).toBe(false);
			expect(isDerivativeFunction(derivative)).toBe(true);
			expect(isDerivativeFunction(inverse)).toBe(false);

			expect(isInverseFunction(regular)).toBe(false);
			expect(isInverseFunction(derivative)).toBe(false);
			expect(isInverseFunction(inverse)).toBe(true);
		});

		it('derivative with multiple arguments works', () => {
			const node = derivativeFunc('f', [variable('x'), variable('y')], 1);
			expect(toLatex(node)).toBe("f'\\left( x, y \\right)");
			expect(toCustom(node)).toBe("f'(x,y)");
		});

		it('inverse with multiple arguments works', () => {
			const node = inverseFunc('f', [variable('x'), variable('y')]);
			expect(toLatex(node)).toBe('f^{-1}\\left( x, y \\right)');
			expect(toCustom(node)).toBe('f^{-1}(x,y)');
		});
	});
});
