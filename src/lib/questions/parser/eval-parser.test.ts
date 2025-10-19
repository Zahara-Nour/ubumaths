/**
 * Eval Parser Tests
 * ==================
 *
 * Tests for parsing {eval:...} mathematical expressions.
 */

import { describe, it, expect } from 'vitest';
import { extractEvalExpressions } from './eval-parser';

describe('extractEvalExpressions', () => {
	it('should extract simple eval expression', () => {
		const input = '{eval:2+3}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			expression: '2+3',
			fullMatch: '{eval:2+3}',
			startIndex: 0,
			endIndex: 10
		});
	});

	it('should extract eval with variable references', () => {
		const input = '{eval:{@:a}+{@:b}}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:a}+{@:b}');
	});

	it('should extract eval with complex expression', () => {
		const input = '{eval:({@:a}^2 + {@:b}^2) / {@:c}}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('({@:a}^2 + {@:b}^2) / {@:c}');
	});

	it('should extract multiple eval expressions', () => {
		const input = '{eval:2+3} and {eval:5*7}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(2);
		expect(result[0].expression).toBe('2+3');
		expect(result[1].expression).toBe('5*7');
	});

	it('should extract eval from LaTeX', () => {
		const input = '$\\frac{{eval:{@:a}*{@:b}}}{{@:c}}$';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:a}*{@:b}');
	});

	it('should handle eval with nested braces', () => {
		const input = '{eval:sqrt({@:a}^2 + {@:b}^2)}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('sqrt({@:a}^2 + {@:b}^2)');
	});

	it('should handle eval with function calls', () => {
		const input = '{eval:sin({@:angle})}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('sin({@:angle})');
	});

	it('should handle eval with multiple operations', () => {
		const input = '{eval:{@:a} * {@:b} + {@:c} - {@:d}}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:a} * {@:b} + {@:c} - {@:d}');
	});

	it('should handle eval with parentheses', () => {
		const input = '{eval:({@:a} + {@:b}) * ({@:c} - {@:d})}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('({@:a} + {@:b}) * ({@:c} - {@:d})');
	});

	it('should return empty array for no eval expressions', () => {
		const input = 'No eval here {@:a} + {@:b}';
		const result = extractEvalExpressions(input);

		expect(result).toEqual([]);
	});

	it('should handle empty input', () => {
		const result = extractEvalExpressions('');

		expect(result).toEqual([]);
	});
});

describe('Nested Braces Handling', () => {
	it('should handle single level of nesting', () => {
		const input = '{eval:sqrt({@:a})}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('sqrt({@:a})');
	});

	it('should handle double nesting', () => {
		const input = '{eval:sqrt(abs({@:a}))}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('sqrt(abs({@:a}))');
	});

	it('should handle multiple nested braces in same expression', () => {
		const input = '{eval:max({@:a}, {@:b}) + min({@:c}, {@:d})}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('max({@:a}, {@:b}) + min({@:c}, {@:d})');
	});

	it('should handle deeply nested braces', () => {
		const input = '{eval:sqrt(abs(pow({@:a}, 2)))}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('sqrt(abs(pow({@:a}, 2)))');
	});

	it('should handle nested variable references', () => {
		const input = '{eval:{@:a} * ({@:b} + ({@:c} - {@:d}))}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:a} * ({@:b} + ({@:c} - {@:d}))');
	});

	it('should handle eval inside random expression', () => {
		const input = '{#:{eval:{@:min}}-{eval:{@:max}}}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(2);
		expect(result[0].expression).toBe('{@:min}');
		expect(result[1].expression).toBe('{@:max}');
	});
});

describe('Mathematical Operations', () => {
	it('should handle addition', () => {
		const input = '{eval:{@:a} + {@:b}}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('{@:a} + {@:b}');
	});

	it('should handle subtraction', () => {
		const input = '{eval:{@:a} - {@:b}}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('{@:a} - {@:b}');
	});

	it('should handle multiplication', () => {
		const input = '{eval:{@:a} * {@:b}}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('{@:a} * {@:b}');
	});

	it('should handle division', () => {
		const input = '{eval:{@:a} / {@:b}}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('{@:a} / {@:b}');
	});

	it('should handle exponentiation', () => {
		const input = '{eval:{@:a}^{@:b}}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('{@:a}^{@:b}');
	});

	it('should handle modulo', () => {
		const input = '{eval:{@:a} mod {@:b}}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('{@:a} mod {@:b}');
	});

	it('should handle square root', () => {
		const input = '{eval:sqrt({@:a})}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('sqrt({@:a})');
	});

	it('should handle absolute value', () => {
		const input = '{eval:abs({@:a})}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('abs({@:a})');
	});

	it('should handle trigonometric functions', () => {
		const input = '{eval:sin({@:angle})}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('sin({@:angle})');
	});

	it('should handle logarithms', () => {
		const input = '{eval:log({@:a})}';
		const result = extractEvalExpressions(input);

		expect(result[0].expression).toBe('log({@:a})');
	});
});

describe('Complex Expressions', () => {
	it('should handle fraction simplification', () => {
		const input = '{eval:({@:a}*{@:gcd})/({@:b}*{@:gcd})}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('({@:a}*{@:gcd})/({@:b}*{@:gcd})');
	});

	it('should handle quadratic formula', () => {
		const input = '{eval:(-{@:b} + sqrt({@:b}^2 - 4*{@:a}*{@:c}))/(2*{@:a})}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe(
			'(-{@:b} + sqrt({@:b}^2 - 4*{@:a}*{@:c}))/(2*{@:a})'
		);
	});

	it('should handle distance formula', () => {
		const input = '{eval:sqrt(({@:x2}-{@:x1})^2 + ({@:y2}-{@:y1})^2)}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('sqrt(({@:x2}-{@:x1})^2 + ({@:y2}-{@:y1})^2)');
	});

	it('should handle area formula', () => {
		const input = '{eval:{@:pi} * {@:radius}^2}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:pi} * {@:radius}^2');
	});

	it('should handle percentage calculations', () => {
		const input = '{eval:({@:part} / {@:whole}) * 100}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('({@:part} / {@:whole}) * 100');
	});
});

describe('Edge Cases', () => {
	it('should handle empty eval expression', () => {
		const input = '{eval:}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('');
	});

	it('should handle eval with only whitespace', () => {
		const input = '{eval:   }';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('   ');
	});

	it('should handle very long expressions', () => {
		const longExpr = '{@:a} + {@:b} + {@:c} + {@:d} + {@:e} + {@:f} + {@:g}';
		const input = `{eval:${longExpr}}`;
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe(longExpr);
	});

	it('should handle eval with special characters', () => {
		const input = '{eval:{@:a} × {@:b} ÷ {@:c}}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:a} × {@:b} ÷ {@:c}');
	});

	it('should handle consecutive eval expressions', () => {
		const input = '{eval:1+2}{eval:3+4}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(2);
		expect(result[0].expression).toBe('1+2');
		expect(result[1].expression).toBe('3+4');
	});

	it('should handle eval at start of string', () => {
		const input = '{eval:{@:a}} is the answer';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:a}');
	});

	it('should handle eval at end of string', () => {
		const input = 'The answer is {eval:{@:a}}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:a}');
	});

	it('should handle negative numbers', () => {
		const input = '{eval:-{@:a} + {@:b}}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('-{@:a} + {@:b}');
	});

	it('should handle decimal numbers', () => {
		const input = '{eval:{@:a} * 0.5}';
		const result = extractEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('{@:a} * 0.5');
	});

	it('should handle malformed braces gracefully', () => {
		const input = '{eval:{@:a} + {@:b}';
		const result = extractEvalExpressions(input);

		// Should not extract incomplete expression
		expect(result).toEqual([]);
	});
});
