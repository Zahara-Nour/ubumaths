/**
 * Tests for LimitNode and InfinityNode
 *
 * Tests cover:
 * - Factory functions for creating limit and infinity nodes
 * - Type guards for limit and infinity nodes
 * - LaTeX generation for limits and infinities
 * - LaTeX parsing of \lim expressions
 * - Pretty-print output
 */

import { describe, it, expect } from 'vitest';
import {
	infinity,
	positiveInfinity,
	negativeInfinity,
	limit,
	twoSidedLimit,
	rightLimit,
	leftLimit,
	limitAtInfinity,
	limitAtNegativeInfinity,
	number,
	variable,
	divide,
	func
} from '../factory';
import {
	isInfinity,
	isLimit,
	isPositiveInfinity,
	isNegativeInfinity,
	isTwoSidedLimit,
	isRightLimit,
	isLeftLimit,
	isLimitAtInfinity
} from '../guards';
import { toLatex } from '../latex-generator';
import { prettyPrint } from '../pretty-print';
import { parseLatex, type LatexParserOptions } from '../parser';

describe('InfinityNode', () => {
	describe('factory functions', () => {
		it('creates positive infinity', () => {
			const node = positiveInfinity();
			expect(node.type).toBe('infinity');
			expect(node.sign).toBe('positive');
		});

		it('creates negative infinity', () => {
			const node = negativeInfinity();
			expect(node.type).toBe('infinity');
			expect(node.sign).toBe('negative');
		});

		it('creates infinity with sign parameter', () => {
			const pos = infinity('positive');
			const neg = infinity('negative');
			expect(pos.sign).toBe('positive');
			expect(neg.sign).toBe('negative');
		});

		it('creates infinity with metadata', () => {
			const node = positiveInfinity({ color: 'red' });
			expect(node.metadata?.color).toBe('red');
		});
	});

	describe('type guards', () => {
		it('isInfinity detects infinity nodes', () => {
			expect(isInfinity(positiveInfinity())).toBe(true);
			expect(isInfinity(negativeInfinity())).toBe(true);
			expect(isInfinity(number('5'))).toBe(false);
		});

		it('isPositiveInfinity detects positive infinity', () => {
			expect(isPositiveInfinity(positiveInfinity())).toBe(true);
			expect(isPositiveInfinity(negativeInfinity())).toBe(false);
		});

		it('isNegativeInfinity detects negative infinity', () => {
			expect(isNegativeInfinity(negativeInfinity())).toBe(true);
			expect(isNegativeInfinity(positiveInfinity())).toBe(false);
		});
	});

	describe('LaTeX generation', () => {
		it('generates +\\infty for positive infinity', () => {
			expect(toLatex(positiveInfinity())).toBe('+\\infty');
		});

		it('generates -\\infty for negative infinity', () => {
			expect(toLatex(negativeInfinity())).toBe('-\\infty');
		});
	});
});

describe('LimitNode', () => {
	describe('factory functions', () => {
		it('creates a basic limit', () => {
			const expr = divide(func('sin', [variable('x')]), variable('x'), 'fraction');
			const node = limit(expr, 'x', number('0'));
			expect(node.type).toBe('limit');
			expect(node.variable).toBe('x');
			expect(node.direction).toBe('both');
		});

		it('creates a two-sided limit', () => {
			const node = twoSidedLimit(variable('x'), 'x', number('0'));
			expect(node.direction).toBe('both');
		});

		it('creates a right limit (from above)', () => {
			const node = rightLimit(variable('x'), 'x', number('0'));
			expect(node.direction).toBe('right');
		});

		it('creates a left limit (from below)', () => {
			const node = leftLimit(variable('x'), 'x', number('0'));
			expect(node.direction).toBe('left');
		});

		it('creates a limit at positive infinity', () => {
			const node = limitAtInfinity(variable('x'), 'x');
			expect(node.direction).toBe('both');
			expect(isPositiveInfinity(node.approach)).toBe(true);
		});

		it('creates a limit at negative infinity', () => {
			const node = limitAtNegativeInfinity(variable('x'), 'x');
			expect(node.direction).toBe('both');
			expect(isNegativeInfinity(node.approach)).toBe(true);
		});

		it('creates limit with metadata', () => {
			const node = limit(variable('x'), 'x', number('0'), 'both', { color: 'blue' });
			expect(node.metadata?.color).toBe('blue');
		});
	});

	describe('type guards', () => {
		it('isLimit detects limit nodes', () => {
			expect(isLimit(limit(variable('x'), 'x', number('0')))).toBe(true);
			expect(isLimit(variable('x'))).toBe(false);
		});

		it('isTwoSidedLimit detects two-sided limits', () => {
			expect(isTwoSidedLimit(twoSidedLimit(variable('x'), 'x', number('0')))).toBe(true);
			expect(isTwoSidedLimit(rightLimit(variable('x'), 'x', number('0')))).toBe(false);
		});

		it('isRightLimit detects right-sided limits', () => {
			expect(isRightLimit(rightLimit(variable('x'), 'x', number('0')))).toBe(true);
			expect(isRightLimit(leftLimit(variable('x'), 'x', number('0')))).toBe(false);
		});

		it('isLeftLimit detects left-sided limits', () => {
			expect(isLeftLimit(leftLimit(variable('x'), 'x', number('0')))).toBe(true);
			expect(isLeftLimit(rightLimit(variable('x'), 'x', number('0')))).toBe(false);
		});

		it('isLimitAtInfinity detects limits at infinity', () => {
			expect(isLimitAtInfinity(limitAtInfinity(variable('x'), 'x'))).toBe(true);
			expect(isLimitAtInfinity(limitAtNegativeInfinity(variable('x'), 'x'))).toBe(true);
			expect(isLimitAtInfinity(limit(variable('x'), 'x', number('0')))).toBe(false);
		});
	});

	describe('LaTeX generation', () => {
		it('generates two-sided limit', () => {
			const node = limit(variable('x'), 'x', number('0'));
			expect(toLatex(node)).toBe('\\lim_{x \\to 0} x');
		});

		it('generates right-sided limit', () => {
			const node = rightLimit(variable('x'), 'x', number('0'));
			expect(toLatex(node)).toBe('\\lim_{x \\to 0^{+}} x');
		});

		it('generates left-sided limit', () => {
			const node = leftLimit(variable('x'), 'x', number('0'));
			expect(toLatex(node)).toBe('\\lim_{x \\to 0^{-}} x');
		});

		it('generates limit at infinity', () => {
			const node = limitAtInfinity(variable('x'), 'x');
			expect(toLatex(node)).toBe('\\lim_{x \\to +\\infty} x');
		});

		it('generates limit at negative infinity', () => {
			const node = limitAtNegativeInfinity(variable('x'), 'x');
			expect(toLatex(node)).toBe('\\lim_{x \\to -\\infty} x');
		});

		it('generates complex limit expression', () => {
			const sinx = func('sin', [variable('x')]);
			const expr = divide(sinx, variable('x'), 'fraction');
			const node = limit(expr, 'x', number('0'));
			expect(toLatex(node)).toBe('\\lim_{x \\to 0} \\dfrac{\\sin\\left( x \\right)}{x}');
		});
	});

	describe('LaTeX parsing', () => {
		it('parses basic limit', () => {
			const ast = parseLatex('\\lim_{x \\to 0} x');
			expect(isLimit(ast)).toBe(true);
			if (isLimit(ast)) {
				expect(ast.variable).toBe('x');
				expect(ast.direction).toBe('both');
			}
		});

		it('parses right-sided limit', () => {
			const ast = parseLatex('\\lim_{x \\to 0^+} x');
			expect(isLimit(ast)).toBe(true);
			if (isLimit(ast)) {
				expect(ast.direction).toBe('right');
			}
		});

		it('parses left-sided limit', () => {
			const ast = parseLatex('\\lim_{x \\to 0^-} x');
			expect(isLimit(ast)).toBe(true);
			if (isLimit(ast)) {
				expect(ast.direction).toBe('left');
			}
		});

		it('parses limit with braced direction', () => {
			const ast = parseLatex('\\lim_{x \\to 0^{+}} x');
			expect(isLimit(ast)).toBe(true);
			if (isLimit(ast)) {
				expect(ast.direction).toBe('right');
			}
		});

		it('parses limit at infinity', () => {
			const ast = parseLatex('\\lim_{x \\to \\infty} x');
			expect(isLimit(ast)).toBe(true);
		});

		it('parses basic limit with RD parser', () => {
			const options: LatexParserOptions = { parser: 'rd' };
			const ast = parseLatex('\\lim_{x \\to 0} x', options);
			expect(isLimit(ast)).toBe(true);
			if (isLimit(ast)) {
				expect(ast.variable).toBe('x');
				expect(ast.direction).toBe('both');
			}
		});

		it('parses right-sided limit with RD parser', () => {
			const options: LatexParserOptions = { parser: 'rd' };
			const ast = parseLatex('\\lim_{x \\to 0^+} x', options);
			expect(isLimit(ast)).toBe(true);
			if (isLimit(ast)) {
				expect(ast.direction).toBe('right');
			}
		});
	});

	describe('pretty-print', () => {
		it('pretty prints limit nodes', () => {
			const node = limit(variable('x'), 'x', number('0'));
			const output = prettyPrint(node);
			expect(output).toContain('Limit');
			expect(output).toContain('x');
		});

		it('pretty prints infinity nodes', () => {
			const output = prettyPrint(positiveInfinity());
			expect(output).toContain('Infinity');
			expect(output).toContain('+');
		});
	});
});
