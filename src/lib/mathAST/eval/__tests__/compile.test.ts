/**
 * Unit tests for MathAST compile() — compiles a MathNode into a native JS
 * closure for fast numerical evaluation (curve plotting use-case).
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../compile';
import { parseLatex } from '../../parser';
import { evaluate } from '../evaluate';
import { substitute } from '../substitute';
import {
	number,
	variable,
	greek,
	mathConstant,
	add,
	subtract,
	multiply,
	divide,
	opposite,
	positive,
	power,
	parentheses,
	sin,
	cos,
	tan,
	exp,
	ln,
	sqrt,
	abs,
	func
} from '../../factory';
import type { MathNode } from '../../types';

// =============================================================================
// Helpers
// =============================================================================

/** Compile a LaTeX expression and evaluate with given bindings. */
function compileAndRun(latex: string, vars: Record<string, number> = {}): number {
	return compile(parseLatex(latex))(vars);
}

/** Evaluate via the existing evaluate() pipeline for comparison. */
function evalDecimal(latex: string, vars: Record<string, number> = {}): number {
	const ast = parseLatex(latex);
	const substituted = Object.keys(vars).length > 0 ? substitute(ast, vars) : ast;
	const result = evaluate(substituted, { mode: 'decimal' });
	if (result.status !== 'value') throw new Error(`evaluate failed: ${result.status}`);
	return typeof result.value === 'number'
		? result.value
		: Number((result.value as MathNode & { type: 'number' }).value);
}

// =============================================================================
// Literals
// =============================================================================

describe('compile — literals', () => {
	it('compiles an integer', () => {
		const f = compile(number('42'));
		expect(f({})).toBe(42);
	});

	it('compiles a decimal number', () => {
		const f = compile(number('3.14'));
		expect(f({})).toBeCloseTo(3.14);
	});

	it('compiles negative number literal (as opposite node)', () => {
		const f = compile(opposite(number('5')));
		expect(f({})).toBe(-5);
	});

	it('compiles pi constant', () => {
		const f = compile(mathConstant('pi'));
		expect(f({})).toBe(Math.PI);
	});

	it('compiles euler constant', () => {
		const f = compile(mathConstant('euler'));
		expect(f({})).toBe(Math.E);
	});
});

// =============================================================================
// Variables
// =============================================================================

describe('compile — variables', () => {
	it('reads a variable from bindings', () => {
		const f = compile(variable('x'));
		expect(f({ x: 7 })).toBe(7);
	});

	it('reads multiple variables', () => {
		const f = compile(add(variable('x'), variable('y')));
		expect(f({ x: 3, y: 4 })).toBe(7);
	});

	it('reads a greek letter variable', () => {
		const f = compile(greek('alpha'));
		expect(f({ alpha: 2.5 })).toBe(2.5);
	});

	it('returns NaN for missing variable', () => {
		const f = compile(variable('x'));
		expect(f({})).toBeNaN();
	});

	it('treats variable "e" as Euler number', () => {
		const f = compile(variable('e'));
		expect(f({})).toBe(Math.E);
	});
});

// =============================================================================
// Arithmetic
// =============================================================================

describe('compile — arithmetic', () => {
	it('compiles addition', () => {
		const f = compile(add(variable('x'), number('3')));
		expect(f({ x: 2 })).toBe(5);
	});

	it('compiles subtraction', () => {
		const f = compile(subtract(variable('x'), number('3')));
		expect(f({ x: 5 })).toBe(2);
	});

	it('compiles multiplication', () => {
		const f = compile(multiply(variable('x'), number('3')));
		expect(f({ x: 4 })).toBe(12);
	});

	it('compiles division', () => {
		const f = compile(divide(variable('x'), number('2')));
		expect(f({ x: 6 })).toBe(3);
	});

	it('compiles opposite (unary minus)', () => {
		const f = compile(opposite(variable('x')));
		expect(f({ x: 3 })).toBe(-3);
	});

	it('compiles positive (unary plus) — pass-through', () => {
		const f = compile(positive(variable('x')));
		expect(f({ x: 3 })).toBe(3);
	});
});

// =============================================================================
// Powers (SuperscriptNode)
// =============================================================================

describe('compile — powers', () => {
	it('compiles x^2', () => {
		const f = compile(power(variable('x'), number('2')));
		expect(f({ x: 3 })).toBe(9);
	});

	it('compiles x^(1/2) as square root', () => {
		const f = compile(power(variable('x'), divide(number('1'), number('2'))));
		expect(f({ x: 4 })).toBeCloseTo(2);
	});

	it('compiles x^y with two variables', () => {
		const f = compile(power(variable('x'), variable('y')));
		expect(f({ x: 2, y: 3 })).toBe(8);
	});

	it('compiles fractional exponents', () => {
		const f = compile(power(number('8'), divide(number('1'), number('3'))));
		expect(f({})).toBeCloseTo(2);
	});
});

// =============================================================================
// Functions
// =============================================================================

describe('compile — mathematical functions', () => {
	it('compiles sin(x)', () => {
		const f = compile(sin(variable('x')));
		expect(f({ x: Math.PI / 2 })).toBeCloseTo(1);
		expect(f({ x: 0 })).toBeCloseTo(0);
	});

	it('compiles cos(x)', () => {
		const f = compile(cos(variable('x')));
		expect(f({ x: 0 })).toBe(1);
		expect(f({ x: Math.PI })).toBeCloseTo(-1);
	});

	it('compiles tan(x)', () => {
		const f = compile(tan(variable('x')));
		expect(f({ x: Math.PI / 4 })).toBeCloseTo(1);
	});

	it('compiles arcsin(x)', () => {
		const f = compile(func('arcsin', [variable('x')]));
		expect(f({ x: 1 })).toBeCloseTo(Math.PI / 2);
	});

	it('compiles arccos(x)', () => {
		const f = compile(func('arccos', [variable('x')]));
		expect(f({ x: 1 })).toBeCloseTo(0);
	});

	it('compiles arctan(x)', () => {
		const f = compile(func('arctan', [variable('x')]));
		expect(f({ x: 1 })).toBeCloseTo(Math.PI / 4);
	});

	it('compiles exp(x)', () => {
		const f = compile(exp(variable('x')));
		expect(f({ x: 0 })).toBe(1);
		expect(f({ x: 1 })).toBeCloseTo(Math.E);
	});

	it('compiles ln(x)', () => {
		const f = compile(ln(variable('x')));
		expect(f({ x: 1 })).toBe(0);
		expect(f({ x: Math.E })).toBeCloseTo(1);
	});

	it('compiles sqrt(x)', () => {
		const f = compile(sqrt(variable('x')));
		expect(f({ x: 9 })).toBe(3);
		expect(f({ x: 2 })).toBeCloseTo(Math.SQRT2);
	});

	it('compiles abs(x)', () => {
		const f = compile(abs(variable('x')));
		expect(f({ x: -5 })).toBe(5);
		expect(f({ x: 3 })).toBe(3);
	});

	it('compiles floor(x)', () => {
		const f = compile(func('floor', [variable('x')]));
		expect(f({ x: 3.7 })).toBe(3);
		expect(f({ x: -1.2 })).toBe(-2);
	});

	it('compiles ceil(x)', () => {
		const f = compile(func('ceil', [variable('x')]));
		expect(f({ x: 3.2 })).toBe(4);
	});

	it('compiles round(x)', () => {
		const f = compile(func('round', [variable('x')]));
		expect(f({ x: 3.5 })).toBe(4);
		expect(f({ x: 3.4 })).toBe(3);
	});

	it('compiles log10(x)', () => {
		const f = compile(func('log10', [variable('x')]));
		expect(f({ x: 100 })).toBeCloseTo(2);
	});

	it('compiles log2(x)', () => {
		const f = compile(func('log2', [variable('x')]));
		expect(f({ x: 8 })).toBeCloseTo(3);
	});

	it('compiles sinh(x)', () => {
		const f = compile(func('sinh', [variable('x')]));
		expect(f({ x: 0 })).toBe(0);
	});

	it('compiles cosh(x)', () => {
		const f = compile(func('cosh', [variable('x')]));
		expect(f({ x: 0 })).toBe(1);
	});

	it('compiles tanh(x)', () => {
		const f = compile(func('tanh', [variable('x')]));
		expect(f({ x: 0 })).toBe(0);
	});

	it('compiles cbrt(x)', () => {
		const f = compile(func('cbrt', [variable('x')]));
		expect(f({ x: 27 })).toBeCloseTo(3);
	});

	it('compiles min(a, b)', () => {
		const f = compile(func('min', [variable('x'), variable('y')]));
		expect(f({ x: 3, y: 7 })).toBe(3);
	});

	it('compiles max(a, b)', () => {
		const f = compile(func('max', [variable('x'), variable('y')]));
		expect(f({ x: 3, y: 7 })).toBe(7);
	});
});

// =============================================================================
// Nth root (sqrt with base)
// =============================================================================

describe('compile — function power (sin²(x), cos³(x))', () => {
	it('compiles sin²(x) = sin(x)^2', () => {
		const f = compile(func('sin', [variable('x')], { power: number('2') }));
		const x = 1.2;
		expect(f({ x })).toBeCloseTo(Math.pow(Math.sin(x), 2));
	});

	it('compiles cos³(x)', () => {
		const f = compile(func('cos', [variable('x')], { power: number('3') }));
		const x = 0.8;
		expect(f({ x })).toBeCloseTo(Math.pow(Math.cos(x), 3));
	});

	it('compiles sin⁻¹(x) = arcsin(x) via isInverse', () => {
		const f = compile(func('sin', [variable('x')], { isInverse: true }));
		expect(f({ x: 0.5 })).toBeCloseTo(Math.asin(0.5));
	});

	it('compiles cos⁻¹(x) = arccos(x) via isInverse', () => {
		const f = compile(func('cos', [variable('x')], { isInverse: true }));
		expect(f({ x: 0.5 })).toBeCloseTo(Math.acos(0.5));
	});

	it('compiles tan⁻¹(x) = arctan(x) via isInverse', () => {
		const f = compile(func('tan', [variable('x')], { isInverse: true }));
		expect(f({ x: 1 })).toBeCloseTo(Math.atan(1));
	});
});

describe('compile — log with base', () => {
	it('compiles log_2(x) via base property', () => {
		const f = compile(func('log', [variable('x')], { base: number('2') }));
		expect(f({ x: 8 })).toBeCloseTo(3);
	});

	it('compiles log_10(x) via base property', () => {
		const f = compile(func('log', [variable('x')], { base: number('10') }));
		expect(f({ x: 1000 })).toBeCloseTo(3);
	});
});

describe('compile — nth root', () => {
	it('compiles cube root via sqrt with base=3', () => {
		const f = compile(func('sqrt', [variable('x')], { base: number('3') }));
		expect(f({ x: 8 })).toBeCloseTo(2);
	});

	it('compiles 4th root via sqrt with base=4', () => {
		const f = compile(func('sqrt', [variable('x')], { base: number('4') }));
		expect(f({ x: 16 })).toBeCloseTo(2);
	});
});

// =============================================================================
// Composed expressions
// =============================================================================

describe('compile — composed expressions', () => {
	it('compiles x^2 + 2*sin(x)', () => {
		const expr = add(power(variable('x'), number('2')), multiply(number('2'), sin(variable('x'))));
		const f = compile(expr);
		const x = 1.5;
		expect(f({ x })).toBeCloseTo(x * x + 2 * Math.sin(x));
	});

	it('compiles (x+1)/(x-1) — delimiter pass-through', () => {
		const expr = divide(
			parentheses(add(variable('x'), number('1'))),
			parentheses(subtract(variable('x'), number('1')))
		);
		const f = compile(expr);
		expect(f({ x: 3 })).toBe(2); // (3+1)/(3-1) = 4/2 = 2
	});

	it('compiles nested function: sin(cos(x))', () => {
		const f = compile(sin(cos(variable('x'))));
		const x = 1;
		expect(f({ x })).toBeCloseTo(Math.sin(Math.cos(x)));
	});

	it('compiles exp(-x^2)', () => {
		const expr = exp(opposite(power(variable('x'), number('2'))));
		const f = compile(expr);
		const x = 1;
		expect(f({ x })).toBeCloseTo(Math.exp(-(x * x)));
	});

	it('compiles complex expression: (sin(x)^2 + cos(x)^2) = 1', () => {
		const expr = add(
			power(sin(variable('x')), number('2')),
			power(cos(variable('x')), number('2'))
		);
		const f = compile(expr);
		// Pythagorean identity — should be ~1 for any x
		expect(f({ x: 0.7 })).toBeCloseTo(1);
		expect(f({ x: 2.3 })).toBeCloseTo(1);
	});
});

// =============================================================================
// Edge cases (IEEE 754 behavior)
// =============================================================================

describe('compile — infinity and signed zero nodes', () => {
	it('compiles positive infinity', () => {
		const node: MathNode = { type: 'infinity', sign: 'positive' };
		expect(compile(node)({})).toBe(Infinity);
	});

	it('compiles negative infinity', () => {
		const node: MathNode = { type: 'infinity', sign: 'negative' };
		expect(compile(node)({})).toBe(-Infinity);
	});

	it('compiles signed zero as 0', () => {
		const node: MathNode = { type: 'signed-zero', sign: 'positive' };
		expect(compile(node)({})).toBe(0);
	});
});

describe('compile — IEEE 754 edge cases', () => {
	it('division by zero returns Infinity', () => {
		const f = compile(divide(number('1'), variable('x')));
		expect(f({ x: 0 })).toBe(Infinity);
	});

	it('negative division by zero returns -Infinity', () => {
		const f = compile(divide(opposite(number('1')), variable('x')));
		expect(f({ x: 0 })).toBe(-Infinity);
	});

	it('0/0 returns NaN', () => {
		const f = compile(divide(variable('x'), variable('x')));
		expect(f({ x: 0 })).toBeNaN();
	});

	it('sqrt of negative returns NaN', () => {
		const f = compile(sqrt(variable('x')));
		expect(f({ x: -1 })).toBeNaN();
	});

	it('ln(0) returns -Infinity', () => {
		const f = compile(ln(variable('x')));
		expect(f({ x: 0 })).toBe(-Infinity);
	});
});

// =============================================================================
// Concordance with evaluate() in decimal mode
// =============================================================================

describe('compile — concordance with evaluate(decimal)', () => {
	const expressions = ['3+5', '2 \\cdot 7', '\\frac{10}{3}', '2^{10}', '\\sqrt{2}', '\\pi', 'e'];

	for (const latex of expressions) {
		it(`matches evaluate() for: ${latex}`, () => {
			const compiled = compileAndRun(latex);
			const evaluated = evalDecimal(latex);
			expect(compiled).toBeCloseTo(evaluated, 10);
		});
	}

	const expressionsWithX = [
		['x^2+1', 3],
		['\\frac{x}{x+1}', 5],
		['\\sqrt{x}', 7],
		['\\sin(x)', 1.5]
	] as const;

	for (const [latex, xVal] of expressionsWithX) {
		it(`matches evaluate() for: ${latex} at x=${xVal}`, () => {
			const compiled = compileAndRun(latex, { x: xVal });
			const evaluated = evalDecimal(latex, { x: xVal });
			expect(compiled).toBeCloseTo(evaluated, 10);
		});
	}
});

// =============================================================================
// Compilation errors (unsupported nodes)
// =============================================================================

describe('compile — unsupported nodes throw at compile time', () => {
	it('throws for HoleNode', () => {
		const hole: MathNode = { type: 'hole', index: 0 };
		expect(() => compile(hole)).toThrow();
	});

	it('throws for RelationNode', () => {
		const rel: MathNode = {
			type: 'relation',
			relation: '=',
			left: number('1'),
			right: number('2')
		};
		expect(() => compile(rel)).toThrow();
	});

	it('throws for MatrixNode', () => {
		const mat: MathNode = {
			type: 'matrix',
			rows: [[number('1')]],
			matrixType: 'pmatrix'
		};
		expect(() => compile(mat)).toThrow();
	});

	it('throws for BooleanNode', () => {
		const bool: MathNode = { type: 'boolean', value: true };
		expect(() => compile(bool)).toThrow();
	});

	it('throws for unknown function name', () => {
		const f = func('unknownFunc', [variable('x')]);
		expect(() => compile(f)).toThrow();
	});
});
