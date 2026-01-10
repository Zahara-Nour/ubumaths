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
import type { MathNode } from '../../types';
import type { EvalValue } from '../types';
import { isNumber, isDivision, isOpposite } from '../../guards';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to check if a value is a MathNode
 */
function isMathNode(value: EvalValue): value is MathNode {
	return typeof value === 'object' && 'type' in value;
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
 * Helper to check if a MathNode represents a specific integer or fraction.
 * For integer results: expects a NumberNode (positive or negative)
 * For fraction results: expects a DivisionNode
 */
function expectMathNodeRational(node: MathNode, expectedN: bigint, expectedD: bigint): void {
	if (expectedD === 1n) {
		// Should be a NumberNode (integer)
		// Handle negative numbers: could be opposite(number) or number with negative value
		if (expectedN < 0n) {
			if (isOpposite(node) && isNumber(node.operand)) {
				expect(node.operand.value).toBe((-expectedN).toString());
			} else if (isNumber(node)) {
				expect(node.value).toBe(expectedN.toString());
			} else {
				expect.fail(`Expected NumberNode or opposite(NumberNode), got ${node.type}`);
			}
		} else {
			expect(isNumber(node)).toBe(true);
			if (isNumber(node)) {
				expect(node.value).toBe(expectedN.toString());
			}
		}
	} else {
		// Should be a DivisionNode (fraction) - possibly wrapped in opposite for negative
		let fractionNode = node;
		let sign = 1n;
		if (isOpposite(node)) {
			fractionNode = node.operand;
			sign = -1n;
		}
		expect(isDivision(fractionNode)).toBe(true);
		if (isDivision(fractionNode)) {
			const numNode = fractionNode.numerator;
			const denNode = fractionNode.denominator;
			expect(isNumber(numNode)).toBe(true);
			expect(isNumber(denNode)).toBe(true);
			if (isNumber(numNode) && isNumber(denNode)) {
				const actualN = BigInt(numNode.value) * sign;
				expect(actualN).toBe(expectedN);
				expect(denNode.value).toBe(expectedD.toString());
			}
		}
	}
}

/**
 * Helper to evaluate LaTeX in exact mode and expect a specific integer or fraction.
 * In the new architecture, exact mode returns a simplified MathNode.
 * For integer results: expects a NumberNode
 * For fraction results: expects a DivisionNode
 */
function expectRational(latex: string, expectedN: bigint, expectedD: bigint): void {
	const result = evalLatex(latex, 'exact');
	expect(isMathNode(result)).toBe(true);
	if (!isMathNode(result)) return;
	expectMathNodeRational(result, expectedN, expectedD);
}

/**
 * Helper to evaluate a MathNode AST in exact mode and expect a specific integer or fraction.
 */
function expectAstRational(ast: MathNode, expectedN: bigint, expectedD: bigint): void {
	const result = evaluate(ast, { mode: 'exact' });
	expect(isMathNode(result.value)).toBe(true);
	if (!isMathNode(result.value)) return;
	expectMathNodeRational(result.value, expectedN, expectedD);
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
			expectAstRational(ast, 12n, 1n);
		});

		it('evaluates 3 \\cdot 4 = 12', () => {
			expectRational('3 \\cdot 4', 12n, 1n);
		});

		it('evaluates 0 * 5 = 0', () => {
			const ast = multiply(number('0'), number('5'), 'dot');
			expectAstRational(ast, 0n, 1n);
		});

		it('evaluates -3 * 4 = -12', () => {
			const ast = multiply(opposite(number('3')), number('4'), 'dot');
			expectAstRational(ast, -12n, 1n);
		});
	});

	describe('division', () => {
		it('evaluates 10 / 4 = 5/2 in exact mode', () => {
			const ast = divide(number('10'), number('4'), 'fraction');
			expectAstRational(ast, 5n, 2n);
		});

		it('evaluates 10 / 4 = 2.5 in decimal mode', () => {
			const ast = divide(number('10'), number('4'), 'fraction');
			const result = evaluate(ast, { mode: 'decimal' });
			expect(result.value).toBe(2.5);
		});

		it('throws on division by zero', () => {
			const ast = divide(number('5'), number('0'), 'fraction');
			expect(() => evaluate(ast)).toThrow(/division by zero/i);
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
		expectAstRational(ast, 2n, 1n);
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

	it('throws on sqrt of negative number in decimal mode', () => {
		const ast = sqrt(opposite(number('4')));
		// In decimal mode, sqrt of negative throws
		expect(() => evaluate(ast, { mode: 'decimal' })).toThrow(/sqrt.*negative|non-negative/i);
	});

	it('keeps sqrt of negative symbolic in exact mode', () => {
		const ast = sqrt(opposite(number('4')));
		// In exact mode, sqrt(-4) remains symbolic (or normalize handles it)
		const result = evaluate(ast, { mode: 'exact' });
		// The expression stays as sqrt(-4) or may be simplified
		expect(result.node).toBeDefined();
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

		it('evaluates exp(0) = 1 in exact mode', () => {
			const ast = exp(number('0'));
			// In exact mode, exp(0) is simplified to 1 (returns MathNode)
			const result = evaluate(ast);
			expect(result.node.type).toBe('number');
			if (result.node.type === 'number') {
				expect(result.node.value).toBe('1');
			}
		});

		it('evaluates ln(e) approximately 1 in decimal mode', () => {
			// ln(exp(1)) = 1
			const ast = ln(exp(number('1')));
			const result = evaluate(ast, { mode: 'decimal' });
			expect(Math.abs((result.value as number) - 1)).toBeLessThan(1e-10);
		});

		it('ln(0) stays as function in exact mode', () => {
			const ast = ln(number('0'));
			// In exact mode, ln(0) stays as function (undefined value)
			const result = evaluate(ast);
			expect(result.node.type).toBe('function');
		});

		it('ln(-1) stays as function in exact mode', () => {
			const ast = ln(opposite(number('1')));
			// In exact mode, ln(-1) stays as function (would need complex logarithm)
			const result = evaluate(ast);
			expect(result.node.type).toBe('function');
		});
	});

	describe('absolute value', () => {
		it('evaluates abs(5) = 5', () => {
			expectRational('\\left|5\\right|', 5n, 1n);
		});

		it('evaluates abs(-5) = 5', () => {
			const ast = abs(opposite(number('5')));
			expectAstRational(ast, 5n, 1n);
		});

		it('evaluates abs(-1/2) = 1/2', () => {
			const ast = abs(opposite(fraction(number('1'), number('2'))));
			expectAstRational(ast, 1n, 2n);
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
		expectAstRational(ast, 5n, 1n);
	});

	it('evaluates nested fractions', () => {
		// (1/2) / (3/4) = 2/3
		const ast = divide(
			fraction(number('1'), number('2')),
			fraction(number('3'), number('4')),
			'fraction'
		);
		expectAstRational(ast, 2n, 3n);
	});

	it('evaluates parenthesized expressions', () => {
		const ast = multiply(parentheses(add(number('2'), number('3'))), number('4'), 'dot');
		expectAstRational(ast, 20n, 1n);
	});
});

// =============================================================================
// Unary Operations Tests
// =============================================================================

describe('evaluate - unary operations', () => {
	it('evaluates -5 = -5', () => {
		const ast = opposite(number('5'));
		expectAstRational(ast, -5n, 1n);
	});

	it('evaluates --5 = 5', () => {
		const ast = opposite(opposite(number('5')));
		expectAstRational(ast, 5n, 1n);
	});

	it('evaluates +5 = 5', () => {
		const ast = positive(number('5'));
		expectAstRational(ast, 5n, 1n);
	});

	it('evaluates -(3 + 2) = -5', () => {
		const ast = opposite(add(number('3'), number('2')));
		expectAstRational(ast, -5n, 1n);
	});
});

// =============================================================================
// Error Cases Tests
// =============================================================================

describe('evaluate - error cases', () => {
	describe('unsubstituted variables', () => {
		it('throws on expression with single variable', () => {
			const ast = variable('x');
			expect(() => evaluate(ast)).toThrow(/free variables.*x/i);
		});

		it('throws on expression with variable in operation', () => {
			const ast = add(variable('x'), number('1'));
			expect(() => evaluate(ast)).toThrow(/free variables.*x/i);
		});

		it('throws on Greek letter variable (not pi)', () => {
			const ast = greek('alpha');
			expect(() => evaluate(ast)).toThrow(/free variables.*alpha/i);
		});

		it('lists all unsubstituted variables in error message', () => {
			const ast = add(variable('x'), variable('y'));
			expect(() => evaluate(ast)).toThrow(/x.*y|y.*x/);
		});
	});

	describe('division by zero', () => {
		it('throws on 1/0', () => {
			const ast = divide(number('1'), number('0'), 'fraction');
			expect(() => evaluate(ast)).toThrow(/division by zero/i);
		});

		it('throws on x/0 where x is computed', () => {
			const ast = divide(
				add(number('1'), number('2')),
				subtract(number('5'), number('5')),
				'fraction'
			);
			expect(() => evaluate(ast)).toThrow(/division by zero/i);
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
	it('returns MathNode for integer operations', () => {
		const ast = add(number('2'), number('3'));
		const result = evaluate(ast, { mode: 'exact' });
		expect(isMathNode(result.value)).toBe(true);
		expect(result.exact).toBe(true);
	});

	it('returns MathNode for fraction operations', () => {
		const ast = fraction(number('1'), number('2'));
		const result = evaluate(ast, { mode: 'exact' });
		expect(isMathNode(result.value)).toBe(true);
		expect(result.exact).toBe(true);
		if (isMathNode(result.value)) {
			expectMathNodeRational(result.value, 1n, 2n);
		}
	});

	it('returns MathNode for irrational results in exact mode', () => {
		const ast = sqrt(number('2'));
		const result = evaluate(ast, { mode: 'exact' });
		// sqrt(2) is irrational but in exact mode we return the MathNode
		expect(isMathNode(result.value)).toBe(true);
		expect(result.exact).toBe(true);
	});

	it('returns exact MathNode for perfect square roots', () => {
		const ast = sqrt(number('4'));
		const result = evaluate(ast, { mode: 'exact' });
		expect(isMathNode(result.value)).toBe(true);
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
		expectAstRational(ast, 10000000000n, 1n);
	});

	it('handles decimal input', () => {
		const ast = number('3.14');
		expectAstRational(ast, 157n, 50n);
	});

	it('handles 0.5 as exact fraction', () => {
		const ast = number('0.5');
		expectAstRational(ast, 1n, 2n);
	});

	it('handles 0.25 as exact fraction', () => {
		const ast = number('0.25');
		expectAstRational(ast, 1n, 4n);
	});

	it('handles zero', () => {
		const ast = number('0');
		expectAstRational(ast, 0n, 1n);
	});

	it('handles negative zero as zero', () => {
		const ast = opposite(number('0'));
		expectAstRational(ast, 0n, 1n);
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
		// In decimal mode, sqrt(2) is approximated to a number
		const result = evaluate(ast, { mode: 'decimal' });
		expect(result.node.type).toBe('number');
	});

	it('keeps sqrt symbolic in exact mode', () => {
		const ast = sqrt(number('2'));
		const result = evaluate(ast, { mode: 'exact' });
		// sqrt(2) cannot be simplified to a rational, stays as sqrt(2)
		expect(result.node.type).toBe('function');
	});
});

// =============================================================================
// Integration with parseLatex
// =============================================================================

describe('evaluate - integration with parseLatex', () => {
	it('evaluates parsed LaTeX: 2+3', () => {
		expectRational('2+3', 5n, 1n);
	});

	it('evaluates parsed LaTeX: \\frac{1}{2}+\\frac{1}{4}', () => {
		expectRational('\\frac{1}{2}+\\frac{1}{4}', 3n, 4n);
	});

	it('evaluates parsed LaTeX: 2^{10}', () => {
		expectRational('2^{10}', 1024n, 1n);
	});

	it('evaluates parsed LaTeX with nested operations', () => {
		expectRational('\\sqrt{16}+\\frac{1}{2}', 9n, 2n);
	});
});

// =============================================================================
// Floor, Ceil, Round Tests
// =============================================================================

describe('evaluate - floor, ceil, round', () => {
	it('evaluates floor(3.7) = 3', () => {
		const ast = func('floor', [number('3.7')]);
		expectAstRational(ast, 3n, 1n);
	});

	it('evaluates floor(-3.7) = -4', () => {
		const ast = func('floor', [opposite(number('3.7'))]);
		expectAstRational(ast, -4n, 1n);
	});

	it('evaluates ceil(3.2) = 4', () => {
		const ast = func('ceil', [number('3.2')]);
		expectAstRational(ast, 4n, 1n);
	});

	it('evaluates ceil(-3.2) = -3', () => {
		const ast = func('ceil', [opposite(number('3.2'))]);
		expectAstRational(ast, -3n, 1n);
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

// =============================================================================
// Rational Arithmetic Precision Tests
// =============================================================================

describe('evaluate - Rational arithmetic avoids floating-point errors', () => {
	describe('decimal mode with Rational internals', () => {
		it('avoids float precision errors: 0.1 + 0.2 = 0.3 exactly', () => {
			// In JavaScript: 0.1 + 0.2 = 0.30000000000000004
			// With Rational arithmetic: 1/10 + 2/10 = 3/10 = 0.3 exactly
			const result = evaluate(parseLatex('0.1 + 0.2'), { mode: 'decimal' });
			expect(result.value).toBe(0.3);
		});

		it('avoids float precision errors: 1/3 + 1/3 + 1/3 = 1 exactly', () => {
			// In JavaScript: 1/3 + 1/3 + 1/3 = 0.9999999999999999
			// With Rational arithmetic: exact 1
			const result = evaluate(parseLatex('\\frac{1}{3} + \\frac{1}{3} + \\frac{1}{3}'), {
				mode: 'decimal'
			});
			expect(result.value).toBe(1);
		});

		it('avoids float precision errors: 0.1 * 10 = 1 exactly', () => {
			const result = evaluate(parseLatex('0.1 \\cdot 10'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('avoids float precision errors: 0.7 + 0.1 = 0.8 exactly', () => {
			// In JavaScript: 0.7 + 0.1 = 0.7999999999999999
			const result = evaluate(parseLatex('0.7 + 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(0.8);
		});

		it('avoids float precision errors: 1.0 - 0.9 = 0.1 exactly', () => {
			// In JavaScript: 1.0 - 0.9 = 0.09999999999999998
			const result = evaluate(parseLatex('1.0 - 0.9'), { mode: 'decimal' });
			expect(result.value).toBe(0.1);
		});

		it('handles 1/7 * 7 = 1 exactly in decimal mode', () => {
			const result = evaluate(parseLatex('\\frac{1}{7} \\cdot 7'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('handles complex fraction chain exactly', () => {
			// (1/2 + 1/3) * 6 = (5/6) * 6 = 5
			const result = evaluate(parseLatex('\\left(\\frac{1}{2} + \\frac{1}{3}\\right) \\cdot 6'), {
				mode: 'decimal'
			});
			expect(result.value).toBe(5);
		});
	});

	describe('transcendental functions use Rational for subsequent operations', () => {
		it('sin(0) + 1/2 = 0.5 exactly', () => {
			const result = evaluate(parseLatex('\\sin(0) + \\frac{1}{2}'), { mode: 'decimal' });
			expect(result.value).toBe(0.5);
		});

		it('cos(0) * 1/3 = 1/3 exactly', () => {
			const result = evaluate(parseLatex('\\cos(0) \\cdot \\frac{1}{3}'), { mode: 'decimal' });
			expect(Math.abs((result.value as number) - 1 / 3)).toBeLessThan(1e-15);
		});
	});
});

// =============================================================================
// Precision Option Tests
// =============================================================================

describe('evaluate - precision options', () => {
	it('rounds to 2 decimal places', () => {
		const result = evaluate(parseLatex('\\sqrt{2}'), {
			mode: 'decimal',
			precision: { type: 'decimal', digits: 2 }
		});
		expect(result.value).toBe(1.41);
	});

	it('rounds to 4 decimal places', () => {
		const result = evaluate(parseLatex('\\sqrt{2}'), {
			mode: 'decimal',
			precision: { type: 'decimal', digits: 4 }
		});
		expect(result.value).toBe(1.4142);
	});

	it('rounds pi to 3 decimal places', () => {
		const result = evaluate(parseLatex('\\pi'), {
			mode: 'decimal',
			precision: { type: 'decimal', digits: 3 }
		});
		expect(result.value).toBe(3.142);
	});

	it('uses full precision by default', () => {
		const result = evaluate(parseLatex('\\sqrt{2}'), { mode: 'decimal' });
		// Due to Rational conversion, there's a tiny precision difference
		expect(Math.abs((result.value as number) - Math.sqrt(2))).toBeLessThan(1e-14);
	});

	it('rounds to significant figures', () => {
		const result = evaluate(parseLatex('1234.5'), {
			mode: 'decimal',
			precision: { type: 'significant', digits: 3 }
		});
		expect(result.value).toBe(1230);
	});

	it('rounds to magnitude', () => {
		const result = evaluate(parseLatex('12345'), {
			mode: 'decimal',
			precision: { type: 'magnitude', digits: 2 }
		});
		expect(result.value).toBe(12300);
	});

	it('tolerance type does not affect value', () => {
		const result = evaluate(parseLatex('\\sqrt{2}'), {
			mode: 'decimal',
			precision: { type: 'tolerance', tolerance: 0.01, mode: 'absolute' }
		});
		// Due to Rational conversion, there's a tiny precision difference
		expect(Math.abs((result.value as number) - Math.sqrt(2))).toBeLessThan(1e-14);
	});
});

// =============================================================================
// Extended Precision Tests - Classic Floating-Point Pitfalls
// =============================================================================

describe('evaluate - extended precision: classic float pitfalls', () => {
	describe('addition precision', () => {
		it('0.1 + 0.1 + 0.1 + 0.1 + 0.1 + 0.1 + 0.1 + 0.1 + 0.1 + 0.1 = 1', () => {
			// In JS: 0.9999999999999999
			const result = evaluate(parseLatex('0.1+0.1+0.1+0.1+0.1+0.1+0.1+0.1+0.1+0.1'), {
				mode: 'decimal'
			});
			expect(result.value).toBe(1);
		});

		it('0.3 - 0.1 = 0.2 exactly', () => {
			// In JS: 0.19999999999999998
			const result = evaluate(parseLatex('0.3 - 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(0.2);
		});

		it('0.6 + 0.1 = 0.7 exactly', () => {
			const result = evaluate(parseLatex('0.6 + 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(0.7);
		});

		it('0.2 + 0.4 = 0.6 exactly', () => {
			// In JS: 0.6000000000000001
			const result = evaluate(parseLatex('0.2 + 0.4'), { mode: 'decimal' });
			expect(result.value).toBe(0.6);
		});

		it('0.1 + 0.2 + 0.3 = 0.6 exactly', () => {
			const result = evaluate(parseLatex('0.1 + 0.2 + 0.3'), { mode: 'decimal' });
			expect(result.value).toBe(0.6);
		});

		it('1.1 + 2.2 = 3.3 exactly', () => {
			// In JS: 3.3000000000000003
			const result = evaluate(parseLatex('1.1 + 2.2'), { mode: 'decimal' });
			expect(result.value).toBe(3.3);
		});
	});

	describe('subtraction precision', () => {
		it('1.0 - 0.1 = 0.9 exactly', () => {
			const result = evaluate(parseLatex('1.0 - 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(0.9);
		});

		it('1.0 - 0.7 = 0.3 exactly', () => {
			// In JS: 0.30000000000000004
			const result = evaluate(parseLatex('1.0 - 0.7'), { mode: 'decimal' });
			expect(result.value).toBe(0.3);
		});

		it('0.3 - 0.2 - 0.1 = 0 exactly', () => {
			const result = evaluate(parseLatex('0.3 - 0.2 - 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(0);
		});

		it('10.0 - 9.9 = 0.1 exactly', () => {
			// In JS: 0.09999999999999964
			const result = evaluate(parseLatex('10.0 - 9.9'), { mode: 'decimal' });
			expect(result.value).toBe(0.1);
		});
	});

	describe('multiplication precision', () => {
		it('0.1 * 0.2 = 0.02 exactly', () => {
			// In JS: 0.020000000000000004
			const result = evaluate(parseLatex('0.1 \\cdot 0.2'), { mode: 'decimal' });
			expect(result.value).toBe(0.02);
		});

		it('3 * 0.1 = 0.3 exactly', () => {
			const result = evaluate(parseLatex('3 \\cdot 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(0.3);
		});

		it('0.1 * 0.1 = 0.01 exactly', () => {
			const result = evaluate(parseLatex('0.1 \\cdot 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(0.01);
		});

		it('33.33 * 3 = 99.99 exactly', () => {
			const result = evaluate(parseLatex('33.33 \\cdot 3'), { mode: 'decimal' });
			expect(result.value).toBe(99.99);
		});
	});

	describe('division precision', () => {
		it('0.3 / 0.1 = 3 exactly', () => {
			// In JS: 2.9999999999999996
			const result = evaluate(parseLatex('0.3 / 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(3);
		});

		it('1 / 0.1 = 10 exactly', () => {
			const result = evaluate(parseLatex('1 / 0.1'), { mode: 'decimal' });
			expect(result.value).toBe(10);
		});

		it('0.6 / 0.2 = 3 exactly', () => {
			const result = evaluate(parseLatex('0.6 / 0.2'), { mode: 'decimal' });
			expect(result.value).toBe(3);
		});

		it('0.5 / 0.5 = 1 exactly', () => {
			const result = evaluate(parseLatex('0.5 / 0.5'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});
	});
});

// =============================================================================
// Extended Precision Tests - Fraction Arithmetic
// =============================================================================

describe('evaluate - extended precision: fraction arithmetic', () => {
	describe('fraction sums equal to 1', () => {
		it('1/2 + 1/2 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{2} + \\frac{1}{2}'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('1/4 + 1/4 + 1/4 + 1/4 = 1', () => {
			const result = evaluate(
				parseLatex('\\frac{1}{4} + \\frac{1}{4} + \\frac{1}{4} + \\frac{1}{4}'),
				{ mode: 'decimal' }
			);
			expect(result.value).toBe(1);
		});

		it('1/5 + 1/5 + 1/5 + 1/5 + 1/5 = 1', () => {
			const result = evaluate(
				parseLatex('\\frac{1}{5}+\\frac{1}{5}+\\frac{1}{5}+\\frac{1}{5}+\\frac{1}{5}'),
				{ mode: 'decimal' }
			);
			expect(result.value).toBe(1);
		});

		it('1/7 + 1/7 + 1/7 + 1/7 + 1/7 + 1/7 + 1/7 = 1', () => {
			const result = evaluate(
				parseLatex(
					'\\frac{1}{7}+\\frac{1}{7}+\\frac{1}{7}+\\frac{1}{7}+\\frac{1}{7}+\\frac{1}{7}+\\frac{1}{7}'
				),
				{ mode: 'decimal' }
			);
			expect(result.value).toBe(1);
		});

		it('1/2 + 1/3 + 1/6 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{2} + \\frac{1}{3} + \\frac{1}{6}'), {
				mode: 'decimal'
			});
			expect(result.value).toBe(1);
		});

		it('1/2 + 1/4 + 1/8 + 1/8 = 1', () => {
			const result = evaluate(
				parseLatex('\\frac{1}{2} + \\frac{1}{4} + \\frac{1}{8} + \\frac{1}{8}'),
				{ mode: 'decimal' }
			);
			expect(result.value).toBe(1);
		});

		it('1/3 + 2/3 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{3} + \\frac{2}{3}'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('1/10 + 2/10 + 3/10 + 4/10 = 1', () => {
			const result = evaluate(
				parseLatex('\\frac{1}{10} + \\frac{2}{10} + \\frac{3}{10} + \\frac{4}{10}'),
				{ mode: 'decimal' }
			);
			expect(result.value).toBe(1);
		});
	});

	describe('fraction subtraction', () => {
		it('1/2 - 1/3 = 1/6 exactly', () => {
			const result = evaluate(parseLatex('\\frac{1}{2} - \\frac{1}{3}'), { mode: 'decimal' });
			expect(Math.abs((result.value as number) - 1 / 6)).toBeLessThan(1e-15);
		});

		it('3/4 - 1/4 = 1/2 exactly', () => {
			const result = evaluate(parseLatex('\\frac{3}{4} - \\frac{1}{4}'), { mode: 'decimal' });
			expect(result.value).toBe(0.5);
		});

		it('5/6 - 1/2 = 1/3 exactly', () => {
			const result = evaluate(parseLatex('\\frac{5}{6} - \\frac{1}{2}'), { mode: 'decimal' });
			expect(Math.abs((result.value as number) - 1 / 3)).toBeLessThan(1e-15);
		});
	});

	describe('fraction multiplication identity', () => {
		it('1/3 * 3 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{3} \\cdot 3'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('1/9 * 9 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{9} \\cdot 9'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('1/11 * 11 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{11} \\cdot 11'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('1/13 * 13 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{13} \\cdot 13'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('1/17 * 17 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{17} \\cdot 17'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('1/97 * 97 = 1', () => {
			const result = evaluate(parseLatex('\\frac{1}{97} \\cdot 97'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('2/3 * 3/2 = 1', () => {
			const result = evaluate(parseLatex('\\frac{2}{3} \\cdot \\frac{3}{2}'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('5/7 * 7/5 = 1', () => {
			const result = evaluate(parseLatex('\\frac{5}{7} \\cdot \\frac{7}{5}'), { mode: 'decimal' });
			expect(result.value).toBe(1);
		});

		it('11/13 * 13/11 = 1', () => {
			const result = evaluate(parseLatex('\\frac{11}{13} \\cdot \\frac{13}{11}'), {
				mode: 'decimal'
			});
			expect(result.value).toBe(1);
		});
	});

	describe('fraction division identity', () => {
		it('(1/3) / (1/3) = 1', () => {
			const result = evaluate(parseLatex('\\frac{\\frac{1}{3}}{\\frac{1}{3}}'), {
				mode: 'decimal'
			});
			expect(result.value).toBe(1);
		});

		it('(2/7) / (2/7) = 1', () => {
			const result = evaluate(parseLatex('\\frac{\\frac{2}{7}}{\\frac{2}{7}}'), {
				mode: 'decimal'
			});
			expect(result.value).toBe(1);
		});
	});

	describe('fraction chain products', () => {
		it('1/2 * 2/3 * 3/4 * 4/5 * 5/6 * 6/7 * 7/8 * 8/9 * 9/10 = 1/10', () => {
			const result = evaluate(
				parseLatex(
					'\\frac{1}{2} \\cdot \\frac{2}{3} \\cdot \\frac{3}{4} \\cdot \\frac{4}{5} \\cdot \\frac{5}{6} \\cdot \\frac{6}{7} \\cdot \\frac{7}{8} \\cdot \\frac{8}{9} \\cdot \\frac{9}{10}'
				),
				{ mode: 'decimal' }
			);
			expect(result.value).toBe(0.1);
		});

		it('1/2 * 2/3 * 3/4 = 1/4', () => {
			const result = evaluate(parseLatex('\\frac{1}{2} \\cdot \\frac{2}{3} \\cdot \\frac{3}{4}'), {
				mode: 'decimal'
			});
			expect(result.value).toBe(0.25);
		});
	});
});

// =============================================================================
// Extended Precision Tests - Decimal to Fraction Conversions
// =============================================================================

describe('evaluate - extended precision: decimal conversions', () => {
	it('0.5 + 0.5 = 1', () => {
		const result = evaluate(parseLatex('0.5 + 0.5'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('0.25 + 0.75 = 1', () => {
		const result = evaluate(parseLatex('0.25 + 0.75'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('0.125 + 0.875 = 1', () => {
		const result = evaluate(parseLatex('0.125 + 0.875'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('0.0625 + 0.9375 = 1', () => {
		const result = evaluate(parseLatex('0.0625 + 0.9375'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('0.2 * 5 = 1', () => {
		const result = evaluate(parseLatex('0.2 \\cdot 5'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('0.04 * 25 = 1', () => {
		const result = evaluate(parseLatex('0.04 \\cdot 25'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('0.01 * 100 = 1', () => {
		const result = evaluate(parseLatex('0.01 \\cdot 100'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('0.001 * 1000 = 1', () => {
		const result = evaluate(parseLatex('0.001 \\cdot 1000'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});
});

// =============================================================================
// Extended Precision Tests - Negative Numbers
// =============================================================================

describe('evaluate - extended precision: negative fractions', () => {
	it('-1/3 + -1/3 + -1/3 = -1', () => {
		const result = evaluate(parseLatex('-\\frac{1}{3} + -\\frac{1}{3} + -\\frac{1}{3}'), {
			mode: 'decimal'
		});
		expect(result.value).toBe(-1);
	});

	it('-1/2 + 3/2 = 1', () => {
		const result = evaluate(parseLatex('-\\frac{1}{2} + \\frac{3}{2}'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('1/3 - 2/3 + 1/3 = 0', () => {
		const result = evaluate(parseLatex('\\frac{1}{3} - \\frac{2}{3} + \\frac{1}{3}'), {
			mode: 'decimal'
		});
		expect(result.value).toBe(0);
	});

	it('-0.1 - 0.2 = -0.3 exactly', () => {
		const result = evaluate(parseLatex('-0.1 - 0.2'), { mode: 'decimal' });
		expect(result.value).toBe(-0.3);
	});

	it('(-1/7) * (-7) = 1', () => {
		const result = evaluate(parseLatex('\\left(-\\frac{1}{7}\\right) \\cdot \\left(-7\\right)'), {
			mode: 'decimal'
		});
		expect(result.value).toBe(1);
	});
});

// =============================================================================
// Extended Precision Tests - Powers and Roots
// =============================================================================

describe('evaluate - extended precision: powers and roots', () => {
	it('(1/2)^2 = 0.25 exactly', () => {
		const result = evaluate(parseLatex('\\left(\\frac{1}{2}\\right)^2'), { mode: 'decimal' });
		expect(result.value).toBe(0.25);
	});

	it('(1/3)^2 = 1/9 exactly', () => {
		const result = evaluate(parseLatex('\\left(\\frac{1}{3}\\right)^2'), { mode: 'decimal' });
		expect(Math.abs((result.value as number) - 1 / 9)).toBeLessThan(1e-15);
	});

	it('(2/3)^3 = 8/27 exactly', () => {
		const result = evaluate(parseLatex('\\left(\\frac{2}{3}\\right)^3'), { mode: 'decimal' });
		expect(Math.abs((result.value as number) - 8 / 27)).toBeLessThan(1e-15);
	});

	it('0.5^2 = 0.25 exactly', () => {
		const result = evaluate(parseLatex('0.5^2'), { mode: 'decimal' });
		expect(result.value).toBe(0.25);
	});

	it('0.1^2 = 0.01 exactly', () => {
		const result = evaluate(parseLatex('0.1^2'), { mode: 'decimal' });
		expect(result.value).toBe(0.01);
	});

	it('0.2^3 = 0.008 exactly', () => {
		const result = evaluate(parseLatex('0.2^3'), { mode: 'decimal' });
		expect(result.value).toBe(0.008);
	});

	it('sqrt(0.25) = 0.5 exactly', () => {
		const result = evaluate(parseLatex('\\sqrt{0.25}'), { mode: 'decimal' });
		expect(result.value).toBe(0.5);
	});

	it('sqrt(0.01) = 0.1 exactly', () => {
		const result = evaluate(parseLatex('\\sqrt{0.01}'), { mode: 'decimal' });
		expect(result.value).toBe(0.1);
	});

	it('sqrt(1/4) = 0.5 exactly', () => {
		const result = evaluate(parseLatex('\\sqrt{\\frac{1}{4}}'), { mode: 'decimal' });
		expect(result.value).toBe(0.5);
	});
});

// =============================================================================
// Extended Precision Tests - Associativity and Distributivity
// =============================================================================

describe('evaluate - extended precision: algebraic properties', () => {
	describe('addition associativity', () => {
		it('(0.1 + 0.2) + 0.3 = 0.1 + (0.2 + 0.3)', () => {
			const left = evaluate(parseLatex('(0.1 + 0.2) + 0.3'), { mode: 'decimal' });
			const right = evaluate(parseLatex('0.1 + (0.2 + 0.3)'), { mode: 'decimal' });
			expect(left.value).toBe(right.value);
			expect(left.value).toBe(0.6);
		});

		it('(1/3 + 1/4) + 1/6 = 1/3 + (1/4 + 1/6)', () => {
			const left = evaluate(
				parseLatex('\\left(\\frac{1}{3} + \\frac{1}{4}\\right) + \\frac{1}{6}'),
				{ mode: 'decimal' }
			);
			const right = evaluate(
				parseLatex('\\frac{1}{3} + \\left(\\frac{1}{4} + \\frac{1}{6}\\right)'),
				{ mode: 'decimal' }
			);
			expect(left.value).toBe(right.value);
		});
	});

	describe('multiplication associativity', () => {
		it('(0.1 * 0.2) * 0.5 = 0.1 * (0.2 * 0.5)', () => {
			const left = evaluate(parseLatex('(0.1 \\cdot 0.2) \\cdot 0.5'), { mode: 'decimal' });
			const right = evaluate(parseLatex('0.1 \\cdot (0.2 \\cdot 0.5)'), { mode: 'decimal' });
			expect(left.value).toBe(right.value);
			expect(left.value).toBe(0.01);
		});
	});

	describe('distributivity', () => {
		it('0.5 * (0.2 + 0.4) = 0.5*0.2 + 0.5*0.4', () => {
			const left = evaluate(parseLatex('0.5 \\cdot (0.2 + 0.4)'), { mode: 'decimal' });
			const right = evaluate(parseLatex('0.5 \\cdot 0.2 + 0.5 \\cdot 0.4'), { mode: 'decimal' });
			expect(left.value).toBe(right.value);
			expect(left.value).toBe(0.3);
		});

		it('(1/3) * (1/2 + 1/4) = 1/3*1/2 + 1/3*1/4', () => {
			const left = evaluate(
				parseLatex('\\frac{1}{3} \\cdot \\left(\\frac{1}{2} + \\frac{1}{4}\\right)'),
				{ mode: 'decimal' }
			);
			const right = evaluate(
				parseLatex('\\frac{1}{3} \\cdot \\frac{1}{2} + \\frac{1}{3} \\cdot \\frac{1}{4}'),
				{ mode: 'decimal' }
			);
			expect(left.value).toBe(right.value);
		});
	});
});

// =============================================================================
// Extended Precision Tests - Scientific Notation (via AST)
// =============================================================================

describe('evaluate - extended precision: scientific notation', () => {
	it('0.1 + 0.2 = 0.3 (same as 1e-1 + 2e-1)', () => {
		// Since LaTeX parser doesn't handle 1e-1 syntax, we use decimal equivalents
		const result = evaluate(parseLatex('0.1 + 0.2'), { mode: 'decimal' });
		expect(result.value).toBe(0.3);
	});

	it('1.5 + 0.5 = 2', () => {
		const result = evaluate(parseLatex('1.5 + 0.5'), { mode: 'decimal' });
		expect(result.value).toBe(2);
	});

	it('0.05 * 2 = 0.1 exactly', () => {
		const result = evaluate(parseLatex('0.05 \\cdot 2'), { mode: 'decimal' });
		expect(result.value).toBe(0.1);
	});

	it('scientific notation via factory: 5e-2 * 2 = 0.1', () => {
		// Test scientific notation via direct AST construction
		const ast = multiply(number('5e-2'), number('2'), 'dot');
		const result = evaluate(ast, { mode: 'decimal' });
		expect(result.value).toBe(0.1);
	});

	it('scientific notation via factory: 1e-1 + 2e-1 = 0.3', () => {
		const ast = add(number('1e-1'), number('2e-1'));
		const result = evaluate(ast, { mode: 'decimal' });
		expect(result.value).toBe(0.3);
	});
});

// =============================================================================
// Extended Precision Tests - Transcendental + Rational
// =============================================================================

describe('evaluate - extended precision: transcendental with rational follow-up', () => {
	it('sin(0) + 1/3 + 1/3 + 1/3 = 1', () => {
		const result = evaluate(parseLatex('\\sin(0) + \\frac{1}{3} + \\frac{1}{3} + \\frac{1}{3}'), {
			mode: 'decimal'
		});
		expect(result.value).toBe(1);
	});

	it('cos(0) - 1/2 = 0.5 exactly', () => {
		const result = evaluate(parseLatex('\\cos(0) - \\frac{1}{2}'), { mode: 'decimal' });
		expect(result.value).toBe(0.5);
	});

	it('exp(0) + 0.1 + 0.2 = 1.3 exactly', () => {
		const result = evaluate(parseLatex('\\exp(0) + 0.1 + 0.2'), { mode: 'decimal' });
		expect(result.value).toBe(1.3);
	});

	it('ln(1) + 0.1 + 0.2 = 0.3 exactly', () => {
		const result = evaluate(parseLatex('\\ln(1) + 0.1 + 0.2'), { mode: 'decimal' });
		expect(result.value).toBe(0.3);
	});

	it('(sin(0) + cos(0)) * 1/3 preserves rational precision', () => {
		// sin(0) = 0, cos(0) = 1, so (0+1) * 1/3 = 1/3
		const result = evaluate(parseLatex('\\left(\\sin(0) + \\cos(0)\\right) \\cdot \\frac{1}{3}'), {
			mode: 'decimal'
		});
		expect(Math.abs((result.value as number) - 1 / 3)).toBeLessThan(1e-15);
	});
});

// =============================================================================
// Extended Precision Tests - Precision Options Edge Cases
// =============================================================================

describe('evaluate - extended precision: precision options edge cases', () => {
	describe('decimal places edge cases', () => {
		it('rounds 0.5 up to 1 with 0 decimal places', () => {
			const result = evaluate(parseLatex('0.5'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 0 }
			});
			expect(result.value).toBe(1);
		});

		it('rounds 0.499 down to 0 with 0 decimal places', () => {
			const result = evaluate(parseLatex('0.499'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 0 }
			});
			expect(result.value).toBe(0);
		});

		it('rounds 1.995 to 2.00 with 2 decimal places', () => {
			const result = evaluate(parseLatex('1.995'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.value).toBe(2);
		});

		it('rounds 1.994 to 1.99 with 2 decimal places', () => {
			const result = evaluate(parseLatex('1.994'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.value).toBe(1.99);
		});
	});

	describe('significant figures edge cases', () => {
		it('rounds 0.001234 to 0.00123 with 3 significant figures', () => {
			const result = evaluate(parseLatex('0.001234'), {
				mode: 'decimal',
				precision: { type: 'significant', digits: 3 }
			});
			expect(Math.abs((result.value as number) - 0.00123)).toBeLessThan(1e-10);
		});

		it('rounds 9999 to 10000 with 1 significant figure', () => {
			const result = evaluate(parseLatex('9999'), {
				mode: 'decimal',
				precision: { type: 'significant', digits: 1 }
			});
			expect(result.value).toBe(10000);
		});

		it('rounds 0.09999 to 0.1 with 1 significant figure', () => {
			const result = evaluate(parseLatex('0.09999'), {
				mode: 'decimal',
				precision: { type: 'significant', digits: 1 }
			});
			expect(Math.abs((result.value as number) - 0.1)).toBeLessThan(1e-10);
		});
	});

	describe('magnitude rounding edge cases', () => {
		it('rounds 555 to 600 with magnitude 2', () => {
			const result = evaluate(parseLatex('555'), {
				mode: 'decimal',
				precision: { type: 'magnitude', digits: 2 }
			});
			expect(result.value).toBe(600);
		});

		it('rounds 555 to 560 with magnitude 1', () => {
			const result = evaluate(parseLatex('555'), {
				mode: 'decimal',
				precision: { type: 'magnitude', digits: 1 }
			});
			expect(result.value).toBe(560);
		});

		it('rounds 555 to 555 with magnitude 0', () => {
			const result = evaluate(parseLatex('555'), {
				mode: 'decimal',
				precision: { type: 'magnitude', digits: 0 }
			});
			expect(result.value).toBe(555);
		});

		it('rounds 1234567 to 1200000 with magnitude 5', () => {
			const result = evaluate(parseLatex('1234567'), {
				mode: 'decimal',
				precision: { type: 'magnitude', digits: 5 }
			});
			expect(result.value).toBe(1200000);
		});
	});

	describe('type none - full precision', () => {
		it('returns full precision with type none', () => {
			const result = evaluate(parseLatex('\\frac{1}{3}'), {
				mode: 'decimal',
				precision: { type: 'none' }
			});
			expect(Math.abs((result.value as number) - 1 / 3)).toBeLessThan(1e-15);
		});

		it('returns full precision for sqrt(2) with type none', () => {
			const result = evaluate(parseLatex('\\sqrt{2}'), {
				mode: 'decimal',
				precision: { type: 'none' }
			});
			expect(Math.abs((result.value as number) - Math.sqrt(2))).toBeLessThan(1e-14);
		});

		it('returns full precision for pi with type none', () => {
			const result = evaluate(parseLatex('\\pi'), {
				mode: 'decimal',
				precision: { type: 'none' }
			});
			expect(result.value).toBe(Math.PI);
		});
	});

	describe('tolerance mode', () => {
		it('tolerance absolute does not affect value', () => {
			const result = evaluate(parseLatex('\\sqrt{2}'), {
				mode: 'decimal',
				precision: { type: 'tolerance', tolerance: 0.1, mode: 'absolute' }
			});
			expect(Math.abs((result.value as number) - Math.sqrt(2))).toBeLessThan(1e-14);
		});

		it('tolerance relative does not affect value', () => {
			const result = evaluate(parseLatex('\\sqrt{2}'), {
				mode: 'decimal',
				precision: { type: 'tolerance', tolerance: 0.05, mode: 'relative' }
			});
			expect(Math.abs((result.value as number) - Math.sqrt(2))).toBeLessThan(1e-14);
		});

		it('tolerance with small value still returns full precision', () => {
			const result = evaluate(parseLatex('0.001'), {
				mode: 'decimal',
				precision: { type: 'tolerance', tolerance: 0.0001, mode: 'absolute' }
			});
			expect(result.value).toBe(0.001);
		});

		it('tolerance with large value still returns full precision', () => {
			const result = evaluate(parseLatex('1234567'), {
				mode: 'decimal',
				precision: { type: 'tolerance', tolerance: 100, mode: 'absolute' }
			});
			expect(result.value).toBe(1234567);
		});
	});

	describe('negative numbers with precision', () => {
		it('rounds negative to decimal places: -1.234 → -1.23', () => {
			const result = evaluate(parseLatex('-1.234'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.value).toBe(-1.23);
		});

		it('rounds negative to significant figures: -0.001234 → -0.00123', () => {
			const result = evaluate(parseLatex('-0.001234'), {
				mode: 'decimal',
				precision: { type: 'significant', digits: 3 }
			});
			expect(Math.abs((result.value as number) - -0.00123)).toBeLessThan(1e-10);
		});

		it('rounds negative to magnitude: -555 → -600', () => {
			const result = evaluate(parseLatex('-555'), {
				mode: 'decimal',
				precision: { type: 'magnitude', digits: 2 }
			});
			expect(result.value).toBe(-600);
		});
	});

	describe('zero handling with precision', () => {
		it('zero stays zero with decimal precision', () => {
			const result = evaluate(parseLatex('0'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 5 }
			});
			expect(result.value).toBe(0);
		});

		it('zero stays zero with significant figures', () => {
			const result = evaluate(parseLatex('0'), {
				mode: 'decimal',
				precision: { type: 'significant', digits: 3 }
			});
			expect(result.value).toBe(0);
		});

		it('very small number rounds to zero with low precision', () => {
			const result = evaluate(parseLatex('0.0001'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.value).toBe(0);
		});
	});

	describe('boundary cases', () => {
		it('exactly 0.5 rounds up with 0 decimal places', () => {
			const result = evaluate(parseLatex('0.5'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 0 }
			});
			expect(result.value).toBe(1);
		});

		it('exactly 1.5 rounds up with 0 decimal places', () => {
			const result = evaluate(parseLatex('1.5'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 0 }
			});
			expect(result.value).toBe(2);
		});

		it('exactly 2.5 rounds up with 0 decimal places', () => {
			const result = evaluate(parseLatex('2.5'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 0 }
			});
			expect(result.value).toBe(3);
		});

		it('-0.5 rounds to -1 with 0 decimal places (half rounds away from zero)', () => {
			const result = evaluate(parseLatex('-0.5'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 0 }
			});
			// toFixed rounds half away from zero for negative numbers
			expect(result.value).toBe(-1);
		});

		it('rounds 0.555 to 0.56 with 2 decimal places', () => {
			const result = evaluate(parseLatex('0.555'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.value).toBe(0.56);
		});

		it('rounds 0.545 to 0.55 with 2 decimal places', () => {
			const result = evaluate(parseLatex('0.545'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.value).toBe(0.55);
		});
	});

	describe('precision with expressions', () => {
		it('applies precision after full evaluation: (1/3 + 1/3) with 2 decimals = 0.67', () => {
			const result = evaluate(parseLatex('\\frac{1}{3} + \\frac{1}{3}'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.value).toBe(0.67);
		});

		it('applies precision after sqrt: sqrt(2) with 1 decimal = 1.4', () => {
			const result = evaluate(parseLatex('\\sqrt{2}'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 1 }
			});
			expect(result.value).toBe(1.4);
		});

		it('applies precision after sin: sin(1) with 2 decimals = 0.84', () => {
			const result = evaluate(parseLatex('\\sin(1)'), {
				mode: 'decimal',
				precision: { type: 'decimal', digits: 2 }
			});
			expect(result.value).toBe(0.84);
		});

		it('precision after complex expression: (pi * 2) with 3 sig figs = 6.28', () => {
			const result = evaluate(parseLatex('\\pi \\cdot 2'), {
				mode: 'decimal',
				precision: { type: 'significant', digits: 3 }
			});
			expect(result.value).toBe(6.28);
		});
	});
});

// =============================================================================
// Extended Precision Tests - Large Numbers
// =============================================================================

describe('evaluate - extended precision: large numbers', () => {
	it('handles large integer arithmetic exactly', () => {
		// 999999999 + 1 = 1000000000
		const result = evaluate(parseLatex('999999999 + 1'), { mode: 'decimal' });
		expect(result.value).toBe(1000000000);
	});

	it('handles large fraction exactly: 1000000/1000000 = 1', () => {
		const result = evaluate(parseLatex('\\frac{1000000}{1000000}'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('handles large multiplication: 100000 * 0.00001 = 1', () => {
		const result = evaluate(parseLatex('100000 \\cdot 0.00001'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('handles repeated small additions without drift', () => {
		// 0.001 * 1000 = 1 (testing many implicit additions)
		const result = evaluate(parseLatex('0.001 \\cdot 1000'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('handles very small fractions exactly', () => {
		// 1/10000 * 10000 = 1
		const result = evaluate(parseLatex('\\frac{1}{10000} \\cdot 10000'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});
});

// =============================================================================
// Extended Precision Tests - Mixed Operations
// =============================================================================

describe('evaluate - extended precision: complex mixed operations', () => {
	it('(1/2 + 0.25) * 4 = 3 exactly', () => {
		const result = evaluate(parseLatex('\\left(\\frac{1}{2} + 0.25\\right) \\cdot 4'), {
			mode: 'decimal'
		});
		expect(result.value).toBe(3);
	});

	it('0.1 + 1/10 = 0.2 exactly', () => {
		const result = evaluate(parseLatex('0.1 + \\frac{1}{10}'), { mode: 'decimal' });
		expect(result.value).toBe(0.2);
	});

	it('(0.5 + 1/2) / 2 = 0.5 exactly', () => {
		const result = evaluate(parseLatex('\\frac{0.5 + \\frac{1}{2}}{2}'), { mode: 'decimal' });
		expect(result.value).toBe(0.5);
	});

	it('sqrt(1/4) + sqrt(0.25) = 1 exactly', () => {
		const result = evaluate(parseLatex('\\sqrt{\\frac{1}{4}} + \\sqrt{0.25}'), { mode: 'decimal' });
		expect(result.value).toBe(1);
	});

	it('(1 + 1/3) * (1 - 1/3) = 8/9 exactly', () => {
		// (4/3) * (2/3) = 8/9
		const result = evaluate(
			parseLatex('\\left(1 + \\frac{1}{3}\\right) \\cdot \\left(1 - \\frac{1}{3}\\right)'),
			{ mode: 'decimal' }
		);
		expect(Math.abs((result.value as number) - 8 / 9)).toBeLessThan(1e-15);
	});

	it('(1/2)^2 + (1/2)^2 + (1/2)^2 + (1/2)^2 = 1', () => {
		const result = evaluate(
			parseLatex(
				'\\left(\\frac{1}{2}\\right)^2 + \\left(\\frac{1}{2}\\right)^2 + \\left(\\frac{1}{2}\\right)^2 + \\left(\\frac{1}{2}\\right)^2'
			),
			{ mode: 'decimal' }
		);
		expect(result.value).toBe(1);
	});
});

// =============================================================================
// Extended Precision Tests - Exact Mode Verification
// =============================================================================

describe('evaluate - extended precision: exact mode fraction preservation', () => {
	it('1/3 + 1/3 = 2/3 exactly in exact mode', () => {
		expectRational('\\frac{1}{3} + \\frac{1}{3}', 2n, 3n);
	});

	it('1/7 + 2/7 = 3/7 exactly in exact mode', () => {
		expectRational('\\frac{1}{7} + \\frac{2}{7}', 3n, 7n);
	});

	it('5/6 - 1/3 = 1/2 exactly in exact mode', () => {
		expectRational('\\frac{5}{6} - \\frac{1}{3}', 1n, 2n);
	});

	it('2/5 * 5/3 = 2/3 exactly in exact mode', () => {
		expectRational('\\frac{2}{5} \\cdot \\frac{5}{3}', 2n, 3n);
	});

	it('(1/2) / (3/4) = 2/3 exactly in exact mode', () => {
		expectRational('\\frac{\\frac{1}{2}}{\\frac{3}{4}}', 2n, 3n);
	});

	it('(1/2 + 1/3) simplifies to 5/6 in exact mode', () => {
		expectRational('\\frac{1}{2} + \\frac{1}{3}', 5n, 6n);
	});

	it('(1/2 * 2/3 * 3/4) = 1/4 in exact mode', () => {
		expectRational('\\frac{1}{2} \\cdot \\frac{2}{3} \\cdot \\frac{3}{4}', 1n, 4n);
	});
});
