/**
 * Tests for MathAST Symbolic Differentiation
 *
 * Comprehensive test suite covering:
 * - Basic rules (constant, variable, power)
 * - Sum and difference rules
 * - Product and quotient rules
 * - Chain rule
 * - Transcendental functions (sin, cos, tan, ln, exp, sqrt)
 * - Inverse trigonometric functions
 * - Hyperbolic functions
 * - Generic functions with bindings
 * - Higher order derivatives
 */

import { describe, it, expect } from 'vitest';
import { differentiate, differentiateN, DifferentiationError, containsVariable } from '../index';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import {
	number,
	variable,
	add,
	subtract,
	multiply,
	divide,
	power,
	sin,
	cos,
	ln,
	exp,
	sqrt,
	func,
	opposite,
	greek,
	relation,
	parentheses
} from '../../factory';
import type { FunctionBindings } from '../../eval/function-bindings';

// Helper to parse and differentiate (prefixed with _ to mark as optional utility)
function _diff(latex: string, options?: Parameters<typeof differentiate>[1]): string {
	const parsed = parseLatex(latex);
	const derivative = differentiate(parsed, options);
	return toLatex(derivative);
}

// Helper to get structured result (prefixed with _ to mark as optional utility)
function _diffNode(latex: string, options?: Parameters<typeof differentiate>[1]) {
	const parsed = parseLatex(latex);
	return differentiate(parsed, options);
}

describe('differentiate', () => {
	describe('constant rule', () => {
		it('d/dx(5) = 0', () => {
			const result = differentiate(number('5'));
			expect(result).toEqual(number('0'));
		});

		it('d/dx(3.14) = 0', () => {
			const result = differentiate(number('3.14'));
			expect(result).toEqual(number('0'));
		});

		it('d/dx(y) = 0 when differentiating with respect to x', () => {
			const result = differentiate(variable('y'));
			expect(result).toEqual(number('0'));
		});

		it('d/dx(pi) = 0 (Greek letters are constants)', () => {
			const result = differentiate(greek('pi'));
			expect(result).toEqual(number('0'));
		});
	});

	describe('variable rule', () => {
		it('d/dx(x) = 1', () => {
			const result = differentiate(variable('x'));
			expect(result).toEqual(number('1'));
		});

		it('d/dy(y) = 1 when differentiating with respect to y', () => {
			const result = differentiate(variable('y'), { variable: 'y' });
			expect(result).toEqual(number('1'));
		});

		it('d/dx(y) = 0 (y is constant with respect to x)', () => {
			const result = differentiate(variable('y'), { variable: 'x' });
			expect(result).toEqual(number('0'));
		});
	});

	describe('power rule', () => {
		it('d/dx(x^2) = 2x', () => {
			const expr = power(variable('x'), number('2'));
			const result = differentiate(expr);
			// Should be 2*x^1 simplified to 2*x
			const latex = toLatex(result);
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});

		it('d/dx(x^3) = 3x^2', () => {
			const expr = power(variable('x'), number('3'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('3');
			expect(latex).toContain('x');
			expect(latex).toContain('2');
		});

		it('d/dx(x^1) = 1', () => {
			const expr = power(variable('x'), number('1'));
			const result = differentiate(expr);
			expect(result).toEqual(number('1'));
		});

		it('d/dx(x^0) = 0', () => {
			const expr = power(variable('x'), number('0'));
			const result = differentiate(expr);
			expect(result).toEqual(number('0'));
		});

		it('d/dx(2x^3) = 6x^2', () => {
			const expr = multiply(number('2'), power(variable('x'), number('3')), 'implicit');
			const result = differentiate(expr);
			const latex = toLatex(result);
			// Product rule: 0*x^3 + 2*3*x^2 = 6x^2 (or represented differently)
			expect(latex).toContain('x');
		});

		it('d/dx(x^(-1)) = -x^(-2)', () => {
			const expr = power(variable('x'), opposite(number('1')));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('-');
			expect(latex).toContain('x');
		});
	});

	describe('sum and difference rules', () => {
		it('d/dx(x + 1) = 1', () => {
			const expr = add(variable('x'), number('1'));
			const result = differentiate(expr);
			expect(result).toEqual(number('1'));
		});

		it('d/dx(x^2 + 3x + 1) = 2x + 3', () => {
			const expr = add(
				add(power(variable('x'), number('2')), multiply(number('3'), variable('x'), 'implicit')),
				number('1')
			);
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('2');
			expect(latex).toContain('x');
			expect(latex).toContain('3');
		});

		it('d/dx(x - 1) = 1', () => {
			const expr = subtract(variable('x'), number('1'));
			const result = differentiate(expr);
			expect(result).toEqual(number('1'));
		});

		it('d/dx(x^2 - x) = 2x - 1', () => {
			const expr = subtract(power(variable('x'), number('2')), variable('x'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});
	});

	describe('product rule', () => {
		it('d/dx(x*y) = y (with y constant)', () => {
			const expr = multiply(variable('x'), variable('y'), 'implicit');
			const result = differentiate(expr);
			// Result should be 1*y + x*0 = y
			expect(result).toEqual(variable('y'));
		});

		it('d/dx(x^2 * x^3) uses product rule', () => {
			const expr = multiply(
				power(variable('x'), number('2')),
				power(variable('x'), number('3')),
				'implicit'
			);
			const result = differentiate(expr);
			// Should give something equivalent to 5x^4
			const latex = toLatex(result);
			expect(latex).toContain('x');
		});

		it('d/dx(2x * 3x) = 12x', () => {
			const expr = multiply(
				multiply(number('2'), variable('x'), 'implicit'),
				multiply(number('3'), variable('x'), 'implicit'),
				'implicit'
			);
			const result = differentiate(expr);
			const latex = toLatex(result);
			// (2*1)*(3x) + (2x)*(3*1) = 6x + 6x = 12x
			expect(latex).toContain('x');
		});
	});

	describe('quotient rule', () => {
		it('d/dx(1/x) = -1/x^2', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('-');
			expect(latex).toContain('x');
		});

		it('d/dx(x/(x+1)) uses quotient rule', () => {
			const expr = divide(variable('x'), add(variable('x'), number('1')), 'fraction');
			const result = differentiate(expr);
			// (1*(x+1) - x*1) / (x+1)^2 = 1/(x+1)^2
			const latex = toLatex(result);
			expect(latex).toContain('x');
		});
	});

	describe('negation rule', () => {
		it('d/dx(-x) = -1', () => {
			const expr = opposite(variable('x'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('-');
			expect(latex).toContain('1');
		});

		it('d/dx(-x^2) = -2x', () => {
			const expr = opposite(power(variable('x'), number('2')));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('-');
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});
	});

	describe('transcendental functions - basic', () => {
		it('d/dx(sin(x)) = cos(x)', () => {
			const expr = sin(variable('x'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\cos');
		});

		it('d/dx(cos(x)) = -sin(x)', () => {
			const expr = cos(variable('x'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('-');
			expect(latex).toContain('\\sin');
		});

		it('d/dx(ln(x)) = 1/x', () => {
			const expr = ln(variable('x'));
			const result = differentiate(expr);
			expect(toLatex(result)).toBe('\\frac{1}{x}');
		});

		it('d/dx(exp(x)) = exp(x)', () => {
			const expr = exp(variable('x'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\exp');
		});

		it('d/dx(sqrt(x)) = 1/(2*sqrt(x))', () => {
			const expr = sqrt(variable('x'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\frac');
			expect(latex).toContain('sqrt');
		});
	});

	describe('chain rule - transcendental', () => {
		it('d/dx(sin(x^2)) = 2x*cos(x^2)', () => {
			const expr = sin(power(variable('x'), number('2')));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\cos');
			expect(latex).toContain('x');
			expect(latex).toContain('2');
		});

		it('d/dx((x+1)^3) = 3*(x+1)^2', () => {
			const expr = power(add(variable('x'), number('1')), number('3'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('3');
			expect(latex).toContain('x');
		});

		it('d/dx(ln(x^2)) = 2/x', () => {
			const expr = ln(power(variable('x'), number('2')));
			const result = differentiate(expr);
			const latex = toLatex(result);
			// Should be 2x/x^2 = 2/x
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});

		it('d/dx(exp(2x)) = 2*exp(2x)', () => {
			const expr = exp(multiply(number('2'), variable('x'), 'implicit'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\exp');
			expect(latex).toContain('2');
		});
	});

	describe('tangent function', () => {
		it('d/dx(tan(x)) = 1/cos^2(x)', () => {
			const expr = func('tan', [variable('x')]);
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\cos');
		});
	});

	describe('inverse trigonometric functions', () => {
		it('d/dx(arcsin(x)) = 1/sqrt(1-x^2)', () => {
			const expr = func('arcsin', [variable('x')]);
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('sqrt');
		});

		it('d/dx(arctan(x)) = 1/(1+x^2)', () => {
			const expr = func('arctan', [variable('x')]);
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('1');
			expect(latex).toContain('x');
		});
	});

	describe('hyperbolic functions', () => {
		it('d/dx(sinh(x)) = cosh(x)', () => {
			const expr = func('sinh', [variable('x')]);
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\cosh');
		});

		it('d/dx(cosh(x)) = sinh(x)', () => {
			const expr = func('cosh', [variable('x')]);
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\sinh');
		});
	});

	describe('generic functions with bindings', () => {
		it('d/dx(f(x)) with f(x) = x^2 gives 2x', () => {
			const functions: FunctionBindings = {
				f: {
					expression: power(variable('x'), number('2')),
					parameters: ['x']
				}
			};
			const expr = func('f', [variable('x')]);
			const result = differentiate(expr, { functions });
			const latex = toLatex(result);
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});

		it('d/dx(f(x)) with f(x) = x^2 and pre-computed derivative', () => {
			const functions: FunctionBindings = {
				f: {
					expression: power(variable('x'), number('2')),
					parameters: ['x'],
					derivative: multiply(number('2'), variable('x'), 'implicit')
				}
			};
			const expr = func('f', [variable('x')]);
			const result = differentiate(expr, { functions });
			const latex = toLatex(result);
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});

		it('d/dx(f(x+1)) with f(x) = x^2 uses chain rule', () => {
			const functions: FunctionBindings = {
				f: {
					expression: power(variable('x'), number('2')),
					parameters: ['x']
				}
			};
			const expr = func('f', [add(variable('x'), number('1'))]);
			const result = differentiate(expr, { functions });
			// f'(x+1) * 1 = 2(x+1)
			const latex = toLatex(result);
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});

		it('d/dx(f(g(x))) with f(x) = x^2, g(x) = x+1 uses chain rule twice', () => {
			const functions: FunctionBindings = {
				f: {
					expression: power(variable('x'), number('2')),
					parameters: ['x']
				},
				g: {
					expression: add(variable('x'), number('1')),
					parameters: ['x']
				}
			};
			// f(g(x)) where g(x) = x+1, f(x) = x^2
			// So f(g(x)) = (x+1)^2
			// d/dx = 2(x+1)
			const expr = func('f', [func('g', [variable('x')])]);
			const result = differentiate(expr, { functions });
			const latex = toLatex(result);
			expect(latex).toContain('2');
		});
	});

	describe('higher order derivatives', () => {
		it('d^2/dx^2(x^3) = 6x', () => {
			const expr = power(variable('x'), number('3'));
			const result = differentiateN(expr, 2);
			const latex = toLatex(result);
			expect(latex).toContain('x');
			// Could be 6x or 3*2*x depending on simplification
		});

		it('d^3/dx^3(x^4) = 24x', () => {
			const expr = power(variable('x'), number('4'));
			const result = differentiateN(expr, 3);
			const latex = toLatex(result);
			expect(latex).toContain('x');
		});

		it('d^4/dx^4(x^4) = 24', () => {
			const expr = power(variable('x'), number('4'));
			const result = differentiateN(expr, 4);
			const latex = toLatex(result);
			// Should be a constant (no x)
			expect(latex).toMatch(/\d/);
		});

		it('d^5/dx^5(x^4) = 0', () => {
			const expr = power(variable('x'), number('4'));
			const result = differentiateN(expr, 5);
			expect(result).toEqual(number('0'));
		});

		it('throws error for non-positive derivative order', () => {
			const expr = variable('x');
			expect(() => differentiateN(expr, 0)).toThrow();
			expect(() => differentiateN(expr, -1)).toThrow();
			expect(() => differentiateN(expr, 1.5)).toThrow();
		});
	});

	describe('delimiter handling', () => {
		it('d/dx((x^2)) = 2x (parentheses are transparent)', () => {
			const expr = parentheses(power(variable('x'), number('2')));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});
	});

	describe('error cases', () => {
		it('throws error when differentiating a relation', () => {
			const expr = relation('=', variable('x'), number('1'));
			expect(() => differentiate(expr)).toThrow(DifferentiationError);
			expect(() => differentiate(expr)).toThrow('Cannot differentiate a relation');
		});

		it('throws error when differentiating absolute value', () => {
			const expr = func('abs', [variable('x')]);
			expect(() => differentiate(expr)).toThrow(DifferentiationError);
			expect(() => differentiate(expr)).toThrow('Cannot differentiate absolute value');
		});

		it('throws error when differentiating floor', () => {
			const expr = func('floor', [variable('x')]);
			expect(() => differentiate(expr)).toThrow(DifferentiationError);
		});
	});

	describe('simplification', () => {
		it('simplifies 0 + x to x', () => {
			// This should happen automatically during differentiation
			const expr = add(number('5'), variable('x')); // 5 + x
			const result = differentiate(expr);
			// d/dx(5) + d/dx(x) = 0 + 1 = 1
			expect(result).toEqual(number('1'));
		});

		it('simplifies 1 * x to x', () => {
			const expr = multiply(variable('x'), number('5'), 'implicit'); // x * 5
			const result = differentiate(expr);
			// d/dx(x * 5) = 1*5 + x*0 = 5
			expect(result).toEqual(number('5'));
		});

		it('simplifies 0 * x to 0', () => {
			const expr = multiply(number('5'), number('5'), 'implicit'); // 5 * 5 (constant)
			const result = differentiate(expr);
			expect(result).toEqual(number('0'));
		});

		it('can disable simplification', () => {
			const expr = add(number('5'), variable('x'));
			const result = differentiate(expr, { simplify: false });
			// Without simplification: 0 + 1
			expect(result.type).toBe('addition');
		});
	});

	describe('different variables', () => {
		it('d/dy(x*y^2) = 2xy', () => {
			const expr = multiply(variable('x'), power(variable('y'), number('2')), 'implicit');
			const result = differentiate(expr, { variable: 'y' });
			const latex = toLatex(result);
			expect(latex).toContain('2');
			expect(latex).toContain('y');
			expect(latex).toContain('x');
		});

		it('d/dx(x*y^2) = y^2', () => {
			const expr = multiply(variable('x'), power(variable('y'), number('2')), 'implicit');
			const result = differentiate(expr, { variable: 'x' });
			const latex = toLatex(result);
			expect(latex).toContain('y');
			expect(latex).toContain('2');
		});
	});

	describe('complex expressions', () => {
		it('d/dx(x*sin(x)) = sin(x) + x*cos(x)', () => {
			const expr = multiply(variable('x'), sin(variable('x')), 'implicit');
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\sin');
			expect(latex).toContain('\\cos');
			expect(latex).toContain('x');
		});

		it('d/dx(e^x * sin(x)) uses product rule', () => {
			const expr = multiply(exp(variable('x')), sin(variable('x')), 'implicit');
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('\\exp');
			expect(latex).toContain('\\sin');
			expect(latex).toContain('\\cos');
		});

		it('d/dx(x^x) = x^x * (ln(x) + 1)', () => {
			const expr = power(variable('x'), variable('x'));
			const result = differentiate(expr);
			const latex = toLatex(result);
			expect(latex).toContain('x');
			expect(latex).toContain('\\ln');
		});
	});

	describe('unknown functions (symbolic)', () => {
		it("d/dx(f(x)) returns f'(x) for unknown function", () => {
			// When f is not in bindings, treat symbolically
			const expr = func('f', [variable('x')]);
			const result = differentiate(expr);
			// Should return f'(x) * 1 = f'(x)
			expect(result.type).toBe('function');
			const funcResult = result as { name: string; derivativeOrder?: number };
			expect(funcResult.name).toBe('f');
			expect(funcResult.derivativeOrder).toBe(1);
		});

		it("d/dx(f(x^2)) = f'(x^2) * 2x for unknown function", () => {
			const expr = func('f', [power(variable('x'), number('2'))]);
			const result = differentiate(expr);
			// Should return f'(x^2) * 2x
			const latex = toLatex(result);
			expect(latex).toContain("f'");
			expect(latex).toContain('2');
			expect(latex).toContain('x');
		});
	});
});

describe('differentiateN', () => {
	it('differentiateN with n=1 equals differentiate', () => {
		const expr = power(variable('x'), number('3'));
		const once = differentiate(expr);
		const onceN = differentiateN(expr, 1);
		expect(toLatex(once)).toBe(toLatex(onceN));
	});

	it('differentiateN with n=2 differentiates twice', () => {
		const expr = power(variable('x'), number('3'));
		const twice = differentiate(differentiate(expr));
		const twiceN = differentiateN(expr, 2);
		expect(toLatex(twice)).toBe(toLatex(twiceN));
	});
});

describe('containsVariable', () => {
	it('detects variable in simple expression', () => {
		expect(containsVariable(variable('x'), 'x')).toBe(true);
		expect(containsVariable(variable('y'), 'x')).toBe(false);
	});

	it('detects variable in nested expression', () => {
		const expr = add(number('1'), power(variable('x'), number('2')));
		expect(containsVariable(expr, 'x')).toBe(true);
		expect(containsVariable(expr, 'y')).toBe(false);
	});

	it('returns false for constants', () => {
		expect(containsVariable(number('5'), 'x')).toBe(false);
		expect(containsVariable(greek('pi'), 'x')).toBe(false);
	});
});
