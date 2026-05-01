/**
 * Tests for toCustom safety net on implicit multiplication.
 *
 * Two failure modes are guarded against:
 *
 * 1. **Hard reject** — the parser forbids NUMBER from starting an implicit
 *    multiplication (parser-pratt.ts:1214), so juxtapositions like `x1/x`
 *    (from `differentiate(x^x)`) throw on reparse.
 *
 * 2. **Silent corruption** — when RHS begins with `-` (`opposite` node) or
 *    `+` (`positive` node), juxtaposition like `x-sin(x)` (from
 *    `differentiate(x*cos(x))`) reparses as a *subtraction* rather than a
 *    multiplication. The round-trip "succeeds" but the AST is semantically
 *    different — a real-world bug for serialized derivatives.
 *
 * Fix (Option C): toCustom emits `*` as a safety net when the RHS of an
 * implicit multiplication begins with a digit, `.`, `,`, `+`, or `-`.
 * AST `displayStyle` is preserved (producers stay naive).
 */
import { describe, it, expect } from 'vitest';
import * as MathAST from '../factory';
import { toCustom, CustomGenerator } from '../custom-generator';
import { parseCustomPratt as parseCustom } from '../parser/custom/parser-pratt';
import { differentiate } from '../differentiation';
import { withMetadata } from '../transforms';

const x = MathAST.variable('x');
const y = MathAST.variable('y');

describe('toCustom — implicit multiplication safety net', () => {
	describe('cases that must round-trip via differentiate', () => {
		const exprs = [
			'x^x',
			'sin(x)^2 * cos(x)^3',
			'exp(x) * x',
			'ln(x) / x',
			'x^2 + 3x',
			'tan(x)',
			'1/x',
			'ln(x^2 + 1)',
			'sin(x) * cos(x)',
			'x^3 * exp(x)'
		];

		for (const src of exprs) {
			it(`round-trips toCustom(differentiate(${src}))`, () => {
				const ast = parseCustom(src);
				const d = differentiate(ast, { variable: 'x', simplify: true });
				const out = toCustom(d);
				expect(() => parseCustom(out)).not.toThrow();
			});
		}
	});

	describe('explicit bug case', () => {
		it('differentiate(x^x) round-trips without throw', () => {
			const ast = parseCustom('x^x');
			const d = differentiate(ast, { variable: 'x', simplify: true });
			const out = toCustom(d);
			// The exact derivative is x^x * (ln(x) + x * 1/x).
			// The inner x * 1/x must NOT be emitted as `x1/x`.
			expect(out).not.toMatch(/x1\/x/);
			expect(() => parseCustom(out)).not.toThrow();
		});
	});

	describe('ambiguous implicit muls — must emit *', () => {
		it('variable * number → x*2', () => {
			const expr = MathAST.multiply(x, MathAST.number('2'), 'implicit');
			expect(toCustom(expr)).toBe('x*2');
		});

		it('parens * number → (a+b)*2', () => {
			const expr = MathAST.multiply(
				MathAST.parentheses(MathAST.add(MathAST.variable('a'), MathAST.variable('b'))),
				MathAST.number('2'),
				'implicit'
			);
			expect(toCustom(expr)).toBe('(a+b)*2');
		});

		it('sin(x) * number → sin(x)*2', () => {
			const expr = MathAST.multiply(MathAST.sin(x), MathAST.number('2'), 'implicit');
			expect(toCustom(expr)).toBe('sin(x)*2');
		});

		it('variable * (1/x) fraction division → x*1/x', () => {
			// `differentiate` produces fraction-style division for derivatives,
			// which renders without explicit braces in this position.
			const expr = MathAST.multiply(
				x,
				MathAST.divide(MathAST.number('1'), x, 'fraction'),
				'implicit'
			);
			expect(toCustom(expr)).toBe('x*1/x');
		});

		it('variable * decimal number → x*0.5', () => {
			const expr = MathAST.multiply(x, MathAST.number('0.5'), 'implicit');
			expect(toCustom(expr)).toBe('x*0.5');
		});

		it('greek * number → \\pi*2', () => {
			const expr = MathAST.multiply(MathAST.piConstant(), MathAST.number('2'), 'implicit');
			expect(toCustom(expr)).toBe('\\pi*2');
		});

		it('variable * opposite(number) → x*-2', () => {
			// Without the safety net, juxtaposition produces `x-2` which the
			// parser reads as subtraction (silent semantic corruption).
			const expr = MathAST.multiply(x, MathAST.opposite(MathAST.number('2')), 'implicit');
			expect(toCustom(expr)).toBe('x*-2');
		});

		it('variable * opposite(variable) → x*-y', () => {
			const expr = MathAST.multiply(x, MathAST.opposite(y), 'implicit');
			expect(toCustom(expr)).toBe('x*-y');
		});

		it('variable * opposite(sin(x)) → x*-sin(x)', () => {
			// This case is reachable from `differentiate(x * cos(x))` via the product rule:
			// (x*cos(x))' = cos(x) + x*(-sin(x)). Without the safety net, the second term
			// renders as `x-sin(x)` and the whole derivative becomes a 3-term sum after reparse.
			const expr = MathAST.multiply(x, MathAST.opposite(MathAST.sin(x)), 'implicit');
			expect(toCustom(expr)).toBe('x*-sin(x)');
		});

		it('variable * positive(number) → x*+2', () => {
			const expr = MathAST.multiply(x, MathAST.positive(MathAST.number('2')), 'implicit');
			expect(toCustom(expr)).toBe('x*+2');
		});

		it('opposite(variable) * opposite(variable) → -x*-y (LHS keeps unary, RHS triggers safety)', () => {
			const expr = MathAST.multiply(MathAST.opposite(x), MathAST.opposite(y), 'implicit');
			expect(toCustom(expr)).toBe('-x*-y');
		});
	});

	describe('non-ambiguous implicit muls — must stay juxtaposed', () => {
		it('number * variable → 2x', () => {
			const expr = MathAST.multiply(MathAST.number('2'), x, 'implicit');
			expect(toCustom(expr)).toBe('2x');
		});

		it('variable * variable → xy', () => {
			const expr = MathAST.multiply(x, y, 'implicit');
			expect(toCustom(expr)).toBe('xy');
		});

		it('number * pi → 2\\pi', () => {
			const expr = MathAST.multiply(MathAST.number('2'), MathAST.piConstant(), 'implicit');
			expect(toCustom(expr)).toBe('2\\pi');
		});

		it('sin(x) * cos(x) → sin(x)cos(x)', () => {
			const expr = MathAST.multiply(MathAST.sin(x), MathAST.cos(x), 'implicit');
			expect(toCustom(expr)).toBe('sin(x)cos(x)');
		});

		it('fraction * pi → {1/2}\\pi (existing wrap behavior)', () => {
			const expr = MathAST.multiply(
				MathAST.divide(MathAST.number('1'), MathAST.number('2'), 'fraction'),
				MathAST.piConstant(),
				'implicit'
			);
			expect(toCustom(expr)).toBe('{1/2}\\pi');
		});

		it('number * (a+b) → 2(a+b)', () => {
			const expr = MathAST.multiply(
				MathAST.number('2'),
				MathAST.parentheses(MathAST.add(MathAST.variable('a'), MathAST.variable('b'))),
				'implicit'
			);
			expect(toCustom(expr)).toBe('2(a+b)');
		});
	});

	describe('explicit multiplication styles unchanged', () => {
		it('star: x*2 stays x*2', () => {
			const expr = MathAST.multiply(x, MathAST.number('2'), 'star');
			expect(toCustom(expr)).toBe('x*2');
		});

		it('star: 2*x stays 2*x', () => {
			const expr = MathAST.multiply(MathAST.number('2'), x, 'star');
			expect(toCustom(expr)).toBe('2*x');
		});

		it('dot: x*y stays x*y in custom syntax', () => {
			const expr = MathAST.multiply(x, y, 'dot');
			expect(toCustom(expr)).toBe('x*y');
		});

		it('cross: 2*3 stays 2*3 in custom syntax', () => {
			const expr = MathAST.multiply(MathAST.number('2'), MathAST.number('3'), 'cross');
			expect(toCustom(expr)).toBe('2*3');
		});
	});

	describe('coalescent mode (renderMetadata: true)', () => {
		it('safety net fires for variable * number with renderMetadata enabled', () => {
			const gen = new CustomGenerator({ renderMetadata: true });
			const expr = MathAST.multiply(x, MathAST.number('2'), 'implicit');
			expect(gen.generate(expr)).toBe('x*2');
		});

		it('safety net fires when RHS carries color metadata', () => {
			// Without the fix, generateNode(coloredNumber) returns `@red{2}` which
			// starts with `@`, defeating the digit-prefix check and producing `x@red{2}`.
			const gen = new CustomGenerator({ renderMetadata: true });
			const coloredTwo = withMetadata(MathAST.number('2'), { color: 'red' });
			const expr = MathAST.multiply(x, coloredTwo, 'implicit');
			expect(gen.generate(expr)).toBe('x*@red{2}');
		});

		it('non-ambiguous case stays juxtaposed in coalescent mode', () => {
			const gen = new CustomGenerator({ renderMetadata: true });
			const expr = MathAST.multiply(MathAST.number('2'), x, 'implicit');
			expect(gen.generate(expr)).toBe('2x');
		});
	});

	describe('nested implicit multiplications', () => {
		it('(xy) * 2 → xy*2', () => {
			const expr = MathAST.multiply(
				MathAST.multiply(x, y, 'implicit'),
				MathAST.number('2'),
				'implicit'
			);
			expect(toCustom(expr)).toBe('xy*2');
			expect(() => parseCustom(toCustom(expr))).not.toThrow();
		});

		it('2 * (x * y) → 2xy (no safety net needed)', () => {
			const expr = MathAST.multiply(
				MathAST.number('2'),
				MathAST.multiply(x, y, 'implicit'),
				'implicit'
			);
			expect(toCustom(expr)).toBe('2xy');
		});
	});

	describe('round-trip parsed inputs', () => {
		const cases: Array<[string, string]> = [
			['x*(1/x)', 'x*(1/x)'],
			['x*1/x', 'x*1/x'],
			// `{...}` is parser sugar, not preserved in the AST: collapses to inline form
			['x*{1/x}', 'x*1/x'],
			['2x', '2x'],
			['xy', 'xy'],
			['2\\pi', '2\\pi'],
			['sin(x)cos(x)', 'sin(x)cos(x)'],
			['{1/2}\\pi', '{1/2}\\pi']
		];

		for (const [input, expected] of cases) {
			it(`'${input}' round-trips to '${expected}'`, () => {
				const ast = parseCustom(input);
				expect(toCustom(ast)).toBe(expected);
			});
		}
	});
});
