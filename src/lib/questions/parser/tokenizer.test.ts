/**
 * Tokenizer Tests
 * ================
 *
 * Tests for token extraction from template strings.
 */

import { describe, it, expect } from 'vitest';
import {
	findVariableReferences,
	findRandomExpressions,
	findEvalExpressions,
	findLatexExpressions
} from './tokenizer';

describe('findVariableReferences', () => {
	it('should find simple variable references', () => {
		const input = 'Calculate {@:a} + {@:b}';
		const result = findVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ name: 'a', fullMatch: '{@:a}' });
		expect(result[1]).toEqual({ name: 'b', fullMatch: '{@:b}' });
	});

	it('should find variable in LaTeX', () => {
		const input = '$$\\frac{{@:num}}{{@:den}}$$';
		const result = findVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ name: 'num', fullMatch: '{@:num}' });
		expect(result[1]).toEqual({ name: 'den', fullMatch: '{@:den}' });
	});

	it('should handle no variables', () => {
		const input = 'No variables here';
		const result = findVariableReferences(input);

		expect(result).toHaveLength(0);
	});

	it('should handle underscores in names', () => {
		const input = '{@:my_var}';
		const result = findVariableReferences(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ name: 'my_var', fullMatch: '{@:my_var}' });
	});

	it('should handle numbers in names', () => {
		const input = '{@:var123}';
		const result = findVariableReferences(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ name: 'var123', fullMatch: '{@:var123}' });
	});

	it('should find multiple occurrences of same variable', () => {
		const input = '{@:a} + {@:a}';
		const result = findVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('a');
		expect(result[1].name).toBe('a');
	});
});

describe('findRandomExpressions', () => {
	it('should find simple random expression', () => {
		const input = '{#:1-10}';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('{#:1-10}');
	});

	it('should find random with variable bounds', () => {
		const input = '{#:{@:min}-{@:max}}';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('{#:{@:min}-{@:max}}');
	});

	it('should find random with exclusions', () => {
		const input = '{#:1-100!5,7-9}';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('{#:1-100!5,7-9}');
	});

	it('should find random with variable exclusions', () => {
		const input = '{#:1-100!{@:a},{@:b}}';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('{#:1-100!{@:a},{@:b}}');
	});

	it('should find decimal by digits', () => {
		const input = '{#:2.3}';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('{#:2.3}');
	});

	it('should find decimal with step', () => {
		const input = '{#:0.5-9.99:0.01}';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('{#:0.5-9.99:0.01}');
	});

	it('should find multiple random expressions', () => {
		const input = '{#:1-10} and {#:20-30}';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(2);
		expect(result[0]).toBe('{#:1-10}');
		expect(result[1]).toBe('{#:20-30}');
	});

	it('should handle nested braces in random', () => {
		const input = '{#:{@:a}-{@:b}!{@:c}}';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('{#:{@:a}-{@:b}!{@:c}}');
	});

	it('should handle no random expressions', () => {
		const input = 'No random here';
		const result = findRandomExpressions(input);

		expect(result).toHaveLength(0);
	});
});

describe('findEvalExpressions', () => {
	it('should find simple eval expression', () => {
		const input = '{eval:2+3}';
		const result = findEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ expression: '2+3', raw: '{eval:2+3}' });
	});

	it('should find eval with variables', () => {
		const input = '{eval:{@:a}+{@:b}}';
		const result = findEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ expression: '{@:a}+{@:b}', raw: '{eval:{@:a}+{@:b}}' });
	});

	it('should find eval with complex expression', () => {
		const input = '{eval:sqrt({@:a}^2+{@:b}^2)}';
		const result = findEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			expression: 'sqrt({@:a}^2+{@:b}^2)',
			raw: '{eval:sqrt({@:a}^2+{@:b}^2)}'
		});
	});

	it('should find multiple eval expressions', () => {
		const input = '{eval:2+3} and {eval:4*5}';
		const result = findEvalExpressions(input);

		expect(result).toHaveLength(2);
		expect(result[0].expression).toBe('2+3');
		expect(result[1].expression).toBe('4*5');
	});

	it('should handle nested braces', () => {
		const input = '{eval:({@:a}-{@:b})/{@:c}}';
		const result = findEvalExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].expression).toBe('({@:a}-{@:b})/{@:c}');
	});

	it('should handle no eval expressions', () => {
		const input = 'No eval here';
		const result = findEvalExpressions(input);

		expect(result).toHaveLength(0);
	});
});

describe('findLatexExpressions', () => {
	it('should find inline LaTeX', () => {
		const input = 'Calculate $x^2$';
		const result = findLatexExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ latex: 'x^2', raw: '$x^2$', isDisplay: false });
	});

	it('should find display LaTeX', () => {
		const input = 'Equation: $$x^2 + y^2 = r^2$$';
		const result = findLatexExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			latex: 'x^2 + y^2 = r^2',
			raw: '$$x^2 + y^2 = r^2$$',
			isDisplay: true
		});
	});

	it('should find LaTeX with variables', () => {
		const input = '$$\\frac{{@:a}}{{@:b}}$$';
		const result = findLatexExpressions(input);

		expect(result).toHaveLength(1);
		expect(result[0].latex).toBe('\\frac{{@:a}}{{@:b}}');
	});

	it('should find multiple LaTeX expressions', () => {
		const input = '$a$ and $b$';
		const result = findLatexExpressions(input);

		expect(result).toHaveLength(2);
		expect(result[0].latex).toBe('a');
		expect(result[1].latex).toBe('b');
	});

	it('should handle no LaTeX', () => {
		const input = 'No LaTeX here';
		const result = findLatexExpressions(input);

		expect(result).toHaveLength(0);
	});

	it('should distinguish inline vs display', () => {
		const input = 'Inline $x$ and display $$y$$';
		const result = findLatexExpressions(input);

		expect(result).toHaveLength(2);
		expect(result[0].isDisplay).toBe(false);
		expect(result[1].isDisplay).toBe(true);
	});
});

describe('Edge Cases', () => {
	it('should handle empty string', () => {
		expect(findVariableReferences('')).toHaveLength(0);
		expect(findRandomExpressions('')).toHaveLength(0);
		expect(findEvalExpressions('')).toHaveLength(0);
		expect(findLatexExpressions('')).toHaveLength(0);
	});

	it('should handle mixed tokens', () => {
		const input = '{@:a} + {#:1-10} = {eval:{@:a}+5}';

		expect(findVariableReferences(input)).toHaveLength(2); // a appears twice
		expect(findRandomExpressions(input)).toHaveLength(1);
		expect(findEvalExpressions(input)).toHaveLength(1);
	});

	it('should handle malformed tokens gracefully', () => {
		const input = '{@:} {#:} {eval:}'; // Empty tokens

		// Should not crash, behavior depends on implementation
		expect(() => findVariableReferences(input)).not.toThrow();
		expect(() => findRandomExpressions(input)).not.toThrow();
		expect(() => findEvalExpressions(input)).not.toThrow();
	});

	it('should handle special characters in variable names', () => {
		const input = '{@:_var} {@:var_123}';
		const result = findVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('_var');
		expect(result[1].name).toBe('var_123');
	});
});
