/**
 * Unit tests for MathAST numeric evaluation functions
 */

import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { parseLatex } from '../../parser';
import {
	number,
	variable,
	greek,
	add,
	subtract,
	multiply,
	divide,
	fraction,
	power,
	opposite,
	positive,
	func,
	sqrt,
	sin,
	cos,
	ln,
	exp,
	abs,
	parentheses,
	subscript,
	relation
} from '../../factory';
import type { Rational } from '../../normal/types';
import type { EvalValue } from '../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to check if a value is a Rational
 */
function isRational(value: EvalValue): value is Rational {
	return typeof value === 'object' && 'n' in value && 'd' in value;
}

/**
 * Helper to evaluate LaTeX and get the numeric value
 */
function evalLatex(latex: string, mode: 'exact' | 'decimal' = 'exact'): EvalValue {
	const ast = parseLatex(latex);
	const result = evaluate(ast, { mode });
	return result.value;
}

/**
 * Helper to evaluate LaTeX and expect a specific rational
 */
function expectRational(latex: string, expectedN: bigint, expectedD: bigint): void {
	const result = evalLatex(latex, 'exact');
	expect(isRational(result)).toBe(true);
	if (isRational(result)) {
		expect(result.n).toBe(expectedN);
		expect(result.d).toBe(expectedD);
	}
}

/**
 * Helper to evaluate LaTeX and expect a specific number (with tolerance for floating point)
 */
function expectNumber(latex: string, expected: number, tolerance = 1e-10): void {
	const result = evalLatex(latex, 'decimal');
	expect(typeof result).toBe('number');
	if (typeof result === 'number') {
		expect(Math.abs(result - expected)).toBeLessThan(tolerance);
	}
}

// =============================================================================
// Basic Arithmetic Tests
// =============================================================================

describe('evaluate - basic arithmetic', () => {
	describe('addition', () => {
		it('evaluates 2 + 3 = 5', () => {
			expectRational('2+3', 5n, 1n);
		});

		it('evaluates 0 + 5 = 5', () => {
			expectRational('0+5', 5n, 1n);
		});

		it('evaluates negative numbers: -2 + 5 = 3', () => {
			expectRational('-2+5', 3n, 1n);
		});

		it('evaluates multiple additions: 1 + 2 + 3 = 6', () => {
			expectRational('1+2+3', 6n, 1n);
		});
	});

	describe('subtraction', () => {
		it('evaluates 10 - 4 = 6', () => {
			expectRational('10-4', 6n, 1n);
		});

		it('evaluates 3 - 5 = -2', () => {
			expectRational('3-5', -2n, 1n);
		});

		it('evaluates 0 - 5 = -5', () => {
			expectRational('0-5', -5n, 1n);
		});
	});

	describe('multiplication', () => {
		it('evaluates 3 * 4 = 12', () => {
			const ast = multiply(number('3'), number('4'), 'dot');
			const result = evaluate(ast);
			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(12n);
				expect(result.value.d).toBe(1n);
			}
		});

		it('evaluates 3 \\cdot 4 = 12', () => {
			expectRational('3 \\cdot 4', 12n, 1n);
		});

		it('evaluates 0 * 5 = 0', () => {
			const ast = multiply(number('0'), number('5'), 'dot');
			const result = evaluate(ast);
			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(0n);
			}
		});

		it('evaluates -3 * 4 = -12', () => {
			const ast = multiply(opposite(number('3')), number('4'), 'dot');
			const result = evaluate(ast);
			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(-12n);
				expect(result.value.d).toBe(1n);
			}
		});
	});

	describe('division', () => {
		it('evaluates 10 / 4 = 5/2 in exact mode', () => {
			const ast = divide(number('10'), number('4'), 'fraction');
			const result = evaluate(ast, { mode: 'exact' });
			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(5n);
				expect(result.value.d).toBe(2n);
			}
		});

		it('evaluates 10 / 4 = 2.5 in decimal mode', () => {
			const ast = divide(number('10'), number('4'), 'fraction');
			const result = evaluate(ast, { mode: 'decimal' });
			expect(result.value).toBe(2.5);
		});

		it('throws on division by zero', () => {
			const ast = divide(number('5'), number('0'), 'fraction');
			expect(() => evaluate(ast)).toThrow('Division by zero');
		});

		it('evaluates frac{1}{3}', () => {
			expectRational('\\frac{1}{3}', 1n, 3n);
		});
	});

	describe('powers', () => {
		it('evaluates 2^3 = 8', () => {
			expectRational('2^3', 8n, 1n);
		});

		it('evaluates 2^10 = 1024', () => {
			expectRational('2^{10}', 1024n, 1n);
		});

		it('evaluates 5^0 = 1', () => {
			expectRational('5^0', 1n, 1n);
		});

		it('evaluates 2^{-1} = 1/2', () => {
			expectRational('2^{-1}', 1n, 2n);
		});

		it('evaluates 2^{-3} = 1/8', () => {
			expectRational('2^{-3}', 1n, 8n);
		});

		it('evaluates (1/2)^2 = 1/4', () => {
			expectRational('\\left(\\frac{1}{2}\\right)^2', 1n, 4n);
		});
	});
});

// =============================================================================
// Exact Fractions Tests
// =============================================================================

describe('evaluate - exact fractions', () => {
	it('evaluates 1/3 exactly', () => {
		expectRational('\\frac{1}{3}', 1n, 3n);
	});

	it('evaluates 1/3 + 1/3 + 1/3 = 1 exactly', () => {
		expectRational('\\frac{1}{3}+\\frac{1}{3}+\\frac{1}{3}', 1n, 1n);
	});

	it('evaluates 1/7 * 7 = 1 exactly', () => {
		expectRational('\\frac{1}{7} \\cdot 7', 1n, 1n);
	});

	it('evaluates 1/2 + 1/4 = 3/4 exactly', () => {
		expectRational('\\frac{1}{2}+\\frac{1}{4}', 3n, 4n);
	});

	it('evaluates 2/3 - 1/6 = 1/2 exactly', () => {
		expectRational('\\frac{2}{3}-\\frac{1}{6}', 1n, 2n);
	});

	it('evaluates 2/3 * 3/4 = 1/2 exactly', () => {
		expectRational('\\frac{2}{3} \\cdot \\frac{3}{4}', 1n, 2n);
	});

	it('evaluates (1/2) / (1/4) = 2 exactly', () => {
		const ast = divide(
			fraction(number('1'), number('2')),
			fraction(number('1'), number('4')),
			'fraction'
		);
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(2n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('reduces 6/9 to 2/3', () => {
		expectRational('\\frac{6}{9}', 2n, 3n);
	});

	it('handles negative fractions: -1/2', () => {
		expectRational('-\\frac{1}{2}', -1n, 2n);
	});
});

// =============================================================================
// Square Root Tests
// =============================================================================

describe('evaluate - square roots', () => {
	it('evaluates sqrt(4) = 2 exactly', () => {
		expectRational('\\sqrt{4}', 2n, 1n);
	});

	it('evaluates sqrt(9) = 3 exactly', () => {
		expectRational('\\sqrt{9}', 3n, 1n);
	});

	it('evaluates sqrt(1) = 1 exactly', () => {
		expectRational('\\sqrt{1}', 1n, 1n);
	});

	it('evaluates sqrt(0) = 0 exactly', () => {
		expectRational('\\sqrt{0}', 0n, 1n);
	});

	it('evaluates sqrt(1/4) = 1/2 exactly', () => {
		expectRational('\\sqrt{\\frac{1}{4}}', 1n, 2n);
	});

	it('evaluates sqrt(9/16) = 3/4 exactly', () => {
		expectRational('\\sqrt{\\frac{9}{16}}', 3n, 4n);
	});

	it('evaluates sqrt(2) as decimal', () => {
		expectNumber('\\sqrt{2}', Math.sqrt(2));
	});

	it('evaluates sqrt(9) + 1 = 4', () => {
		expectRational('\\sqrt{9}+1', 4n, 1n);
	});

	it('throws on sqrt of negative number', () => {
		const ast = sqrt(opposite(number('4')));
		expect(() => evaluate(ast)).toThrow('Cannot compute square root of negative');
	});
});

// =============================================================================
// Transcendental Functions Tests
// =============================================================================

describe('evaluate - transcendental functions', () => {
	describe('trigonometric functions', () => {
		it('evaluates sin(0) = 0', () => {
			expectNumber('\\sin(0)', 0);
		});

		it('evaluates cos(0) = 1', () => {
			expectNumber('\\cos(0)', 1);
		});

		it('evaluates tan(0) = 0', () => {
			expectNumber('\\tan(0)', 0);
		});

		it('evaluates sin(pi/2) approximately 1', () => {
			const ast = sin(divide(greek('pi'), number('2'), 'fraction'));
			const result = evaluate(ast, { mode: 'decimal' });
			expect(Math.abs((result.value as number) - 1)).toBeLessThan(1e-10);
		});

		it('evaluates cos(pi) approximately -1', () => {
			const ast = cos(greek('pi'));
			const result = evaluate(ast, { mode: 'decimal' });
			expect(Math.abs((result.value as number) - -1)).toBeLessThan(1e-10);
		});
	});

	describe('logarithmic and exponential functions', () => {
		it('evaluates ln(1) = 0', () => {
			expectNumber('\\ln(1)', 0);
		});

		it('evaluates exp(0) = 1', () => {
			const ast = exp(number('0'));
			const result = evaluate(ast);
			// exp(0) = 1 exactly
			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(1n);
				expect(result.value.d).toBe(1n);
			}
		});

		it('evaluates ln(e) approximately 1', () => {
			// ln(exp(1)) = 1
			const ast = ln(exp(number('1')));
			const result = evaluate(ast, { mode: 'decimal' });
			expect(Math.abs((result.value as number) - 1)).toBeLessThan(1e-10);
		});

		it('throws on ln(0)', () => {
			const ast = ln(number('0'));
			expect(() => evaluate(ast)).toThrow('ln(0) is undefined');
		});

		it('ln(-1) returns i*pi (complex logarithm)', () => {
			const ast = ln(opposite(number('1')));
			const result = evaluate(ast);
			// ln(-1) = i*pi (principal value)
			expect(result.value).toEqual({ real: 0, imag: Math.PI });
		});
	});

	describe('absolute value', () => {
		it('evaluates abs(5) = 5', () => {
			expectRational('\\left|5\\right|', 5n, 1n);
		});

		it('evaluates abs(-5) = 5', () => {
			const ast = abs(opposite(number('5')));
			const result = evaluate(ast);
			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(5n);
				expect(result.value.d).toBe(1n);
			}
		});

		it('evaluates abs(-1/2) = 1/2', () => {
			const ast = abs(opposite(fraction(number('1'), number('2'))));
			const result = evaluate(ast);
			expect(isRational(result.value)).toBe(true);
			if (isRational(result.value)) {
				expect(result.value.n).toBe(1n);
				expect(result.value.d).toBe(2n);
			}
		});
	});
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('evaluate - constants', () => {
	it('evaluates pi as Math.PI', () => {
		const ast = greek('pi');
		const result = evaluate(ast, { mode: 'decimal' });
		expect(result.value).toBe(Math.PI);
	});

	it('evaluates 2*pi', () => {
		const ast = multiply(number('2'), greek('pi'), 'dot');
		const result = evaluate(ast, { mode: 'decimal' });
		expect(Math.abs((result.value as number) - 2 * Math.PI)).toBeLessThan(1e-10);
	});
});

// =============================================================================
// Complex Expression Tests
// =============================================================================

describe('evaluate - complex expressions', () => {
	it('evaluates (3 + 4) * 2 = 14', () => {
		expectRational('(3+4) \\cdot 2', 14n, 1n);
	});

	it('evaluates 2^10 = 1024', () => {
		expectRational('2^{10}', 1024n, 1n);
	});

	it('evaluates 3^2 + 4^2 = 25', () => {
		expectRational('3^2+4^2', 25n, 1n);
	});

	it('evaluates sqrt(3^2 + 4^2) = 5', () => {
		const ast = sqrt(add(power(number('3'), number('2')), power(number('4'), number('2'))));
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(5n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('evaluates nested fractions', () => {
		// (1/2) / (3/4) = 2/3
		const ast = divide(
			fraction(number('1'), number('2')),
			fraction(number('3'), number('4')),
			'fraction'
		);
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(2n);
			expect(result.value.d).toBe(3n);
		}
	});

	it('evaluates parenthesized expressions', () => {
		const ast = multiply(parentheses(add(number('2'), number('3'))), number('4'), 'dot');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(20n);
			expect(result.value.d).toBe(1n);
		}
	});
});

// =============================================================================
// Unary Operations Tests
// =============================================================================

describe('evaluate - unary operations', () => {
	it('evaluates -5 = -5', () => {
		const ast = opposite(number('5'));
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(-5n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('evaluates --5 = 5', () => {
		const ast = opposite(opposite(number('5')));
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(5n);
		}
	});

	it('evaluates +5 = 5', () => {
		const ast = positive(number('5'));
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(5n);
		}
	});

	it('evaluates -(3 + 2) = -5', () => {
		const ast = opposite(add(number('3'), number('2')));
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(-5n);
		}
	});
});

// =============================================================================
// Error Cases Tests
// =============================================================================

describe('evaluate - error cases', () => {
	describe('unsubstituted variables', () => {
		it('throws on expression with single variable', () => {
			const ast = variable('x');
			expect(() => evaluate(ast)).toThrow('Cannot evaluate expression with unsubstituted');
		});

		it('throws on expression with variable in operation', () => {
			const ast = add(variable('x'), number('1'));
			expect(() => evaluate(ast)).toThrow('Cannot evaluate expression with unsubstituted');
		});

		it('throws on Greek letter variable (not pi)', () => {
			const ast = greek('alpha');
			expect(() => evaluate(ast)).toThrow('Cannot evaluate expression with unsubstituted');
		});

		it('lists all unsubstituted variables in error message', () => {
			const ast = add(variable('x'), variable('y'));
			expect(() => evaluate(ast)).toThrow(/x.*y|y.*x/);
		});
	});

	describe('division by zero', () => {
		it('throws on 1/0', () => {
			const ast = divide(number('1'), number('0'), 'fraction');
			expect(() => evaluate(ast)).toThrow('Division by zero');
		});

		it('throws on x/0 where x is computed', () => {
			const ast = divide(
				add(number('1'), number('2')),
				subtract(number('5'), number('5')),
				'fraction'
			);
			expect(() => evaluate(ast)).toThrow('Division by zero');
		});
	});

	describe('unknown functions', () => {
		it('throws on unknown function', () => {
			const ast = func('unknownfunc', [number('5')]);
			expect(() => evaluate(ast)).toThrow('Unknown function: unknownfunc');
		});
	});

	describe('non-evaluable node types', () => {
		it('throws on subscript expressions', () => {
			const ast = subscript(variable('x'), number('1'));
			// First, it will throw for variable
			expect(() => evaluate(ast)).toThrow();
		});

		it('throws on relation expressions', () => {
			const ast = relation('=', number('5'), number('5'));
			expect(() => evaluate(ast)).toThrow('Cannot evaluate relation expressions');
		});
	});
});

// =============================================================================
// Decimal Mode Tests
// =============================================================================

describe('evaluate - decimal mode', () => {
	it('returns number in decimal mode', () => {
		const ast = number('5');
		const result = evaluate(ast, { mode: 'decimal' });
		expect(typeof result.value).toBe('number');
		expect(result.value).toBe(5);
		expect(result.exact).toBe(false);
	});

	it('converts fractions to decimals', () => {
		const ast = fraction(number('1'), number('4'));
		const result = evaluate(ast, { mode: 'decimal' });
		expect(result.value).toBe(0.25);
	});

	it('handles repeating decimals', () => {
		const ast = fraction(number('1'), number('3'));
		const result = evaluate(ast, { mode: 'decimal' });
		expect(Math.abs((result.value as number) - 1 / 3)).toBeLessThan(1e-10);
	});
});

// =============================================================================
// Exact Mode Tests
// =============================================================================

describe('evaluate - exact mode', () => {
	it('returns Rational for integer operations', () => {
		const ast = add(number('2'), number('3'));
		const result = evaluate(ast, { mode: 'exact' });
		expect(isRational(result.value)).toBe(true);
		expect(result.exact).toBe(true);
	});

	it('returns Rational for fraction operations', () => {
		const ast = fraction(number('1'), number('2'));
		const result = evaluate(ast, { mode: 'exact' });
		expect(isRational(result.value)).toBe(true);
		expect(result.exact).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(1n);
			expect(result.value.d).toBe(2n);
		}
	});

	it('returns number for transcendental results', () => {
		const ast = sqrt(number('2'));
		const result = evaluate(ast, { mode: 'exact' });
		// sqrt(2) is irrational, so result is a number, not exact
		expect(typeof result.value).toBe('number');
		expect(result.exact).toBe(false);
	});

	it('returns exact Rational for perfect square roots', () => {
		const ast = sqrt(number('4'));
		const result = evaluate(ast, { mode: 'exact' });
		expect(isRational(result.value)).toBe(true);
		expect(result.exact).toBe(true);
	});
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('evaluate - edge cases', () => {
	it('handles very large integers', () => {
		// 10^10 = 10000000000
		const ast = power(number('10'), number('10'));
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(10000000000n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('handles decimal input', () => {
		const ast = number('3.14');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(157n);
			expect(result.value.d).toBe(50n);
		}
	});

	it('handles 0.5 as exact fraction', () => {
		const ast = number('0.5');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(1n);
			expect(result.value.d).toBe(2n);
		}
	});

	it('handles 0.25 as exact fraction', () => {
		const ast = number('0.25');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(1n);
			expect(result.value.d).toBe(4n);
		}
	});

	it('handles zero', () => {
		const ast = number('0');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(0n);
		}
	});

	it('handles negative zero as zero', () => {
		const ast = opposite(number('0'));
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(0n);
		}
	});
});

// =============================================================================
// Result Node Tests
// =============================================================================

describe('evaluate - result node', () => {
	it('creates NumberNode for integer result', () => {
		const ast = add(number('2'), number('3'));
		const result = evaluate(ast);
		expect(result.node.type).toBe('number');
		if (result.node.type === 'number') {
			expect(result.node.value).toBe('5');
		}
	});

	it('creates DivisionNode for fraction result', () => {
		const ast = fraction(number('1'), number('3'));
		const result = evaluate(ast);
		expect(result.node.type).toBe('division');
		if (result.node.type === 'division') {
			expect(result.node.numerator.type).toBe('number');
			expect(result.node.denominator.type).toBe('number');
		}
	});

	it('creates NumberNode for decimal result', () => {
		const ast = sqrt(number('2'));
		const result = evaluate(ast);
		expect(result.node.type).toBe('number');
	});
});

// =============================================================================
// Integration with parseLatex
// =============================================================================

describe('evaluate - integration with parseLatex', () => {
	it('evaluates parsed LaTeX: 2+3', () => {
		const ast = parseLatex('2+3');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(5n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('evaluates parsed LaTeX: \\frac{1}{2}+\\frac{1}{4}', () => {
		const ast = parseLatex('\\frac{1}{2}+\\frac{1}{4}');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(3n);
			expect(result.value.d).toBe(4n);
		}
	});

	it('evaluates parsed LaTeX: 2^{10}', () => {
		const ast = parseLatex('2^{10}');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(1024n);
		}
	});

	it('evaluates parsed LaTeX with nested operations', () => {
		const ast = parseLatex('\\sqrt{16}+\\frac{1}{2}');
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(9n);
			expect(result.value.d).toBe(2n);
		}
	});
});

// =============================================================================
// Floor, Ceil, Round Tests
// =============================================================================

describe('evaluate - floor, ceil, round', () => {
	it('evaluates floor(3.7) = 3', () => {
		const ast = func('floor', [number('3.7')]);
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(3n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('evaluates floor(-3.7) = -4', () => {
		const ast = func('floor', [opposite(number('3.7'))]);
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(-4n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('evaluates ceil(3.2) = 4', () => {
		const ast = func('ceil', [number('3.2')]);
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(4n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('evaluates ceil(-3.2) = -3', () => {
		const ast = func('ceil', [opposite(number('3.2'))]);
		const result = evaluate(ast);
		expect(isRational(result.value)).toBe(true);
		if (isRational(result.value)) {
			expect(result.value.n).toBe(-3n);
			expect(result.value.d).toBe(1n);
		}
	});

	it('evaluates round(3.5) = 4', () => {
		const ast = func('round', [number('3.5')]);
		const result = evaluate(ast, { mode: 'decimal' });
		expect(result.value).toBe(4);
	});

	it('evaluates round(3.4) = 3', () => {
		const ast = func('round', [number('3.4')]);
		const result = evaluate(ast, { mode: 'decimal' });
		expect(result.value).toBe(3);
	});
});
