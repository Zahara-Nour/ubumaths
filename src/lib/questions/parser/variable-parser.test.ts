/**
 * Variable Parser Tests
 * =====================
 *
 * Tests for extracting and validating variable references.
 */

import { describe, it, expect } from 'vitest';
import { getVariableNames, extractVariableReferences } from './variable-parser';

describe('getVariableNames', () => {
	it('should extract variable names from simple references', () => {
		const input = 'Calculate {@:a} + {@:b}';
		const result = getVariableNames(input);

		expect(result).toEqual(['a', 'b']);
	});

	it('should extract variable names from LaTeX expressions', () => {
		const input = '$\\frac{{@:num}}{{@:den}}$';
		const result = getVariableNames(input);

		expect(result).toEqual(['num', 'den']);
	});

	it('should extract variable names from random expressions', () => {
		const input = '{#:{@:min}-{@:max}}';
		const result = getVariableNames(input);

		expect(result).toEqual(['min', 'max']);
	});

	it('should extract variable names from eval expressions', () => {
		const input = '{eval:{@:a}^2 + {@:b}^2}';
		const result = getVariableNames(input);

		expect(result).toEqual(['a', 'b']);
	});

	it('should handle duplicate variable references', () => {
		const input = '{@:x} + {@:x}';
		const result = getVariableNames(input);

		// Should include duplicates
		expect(result).toEqual(['x', 'x']);
	});

	it('should extract variables from complex nested expressions', () => {
		const input = '{#:{@:a}-{@:b}!{@:c},{@:d}-{@:e}}';
		const result = getVariableNames(input);

		expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
	});

	it('should handle variables with underscores', () => {
		const input = '{@:my_var} + {@:another_var}';
		const result = getVariableNames(input);

		expect(result).toEqual(['my_var', 'another_var']);
	});

	it('should handle variables with numbers', () => {
		const input = '{@:var1} + {@:var2}';
		const result = getVariableNames(input);

		expect(result).toEqual(['var1', 'var2']);
	});

	it('should return empty array for input with no variables', () => {
		const input = 'Calculate 5 + 3';
		const result = getVariableNames(input);

		expect(result).toEqual([]);
	});

	it('should handle empty input', () => {
		const result = getVariableNames('');

		expect(result).toEqual([]);
	});
});

describe('extractVariableReferences', () => {
	it('should extract variable references with full matches', () => {
		const input = 'Calculate {@:a} + {@:b}';
		const result = extractVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			name: 'a',
			fullMatch: '{@:a}',
			startIndex: 10,
			endIndex: 15
		});
		expect(result[1]).toEqual({
			name: 'b',
			fullMatch: '{@:b}',
			startIndex: 18,
			endIndex: 23
		});
	});

	it('should extract variables from LaTeX', () => {
		const input = '$\\frac{{@:num}}{{@:den}}$';
		const result = extractVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('num');
		expect(result[1].name).toBe('den');
	});

	it('should extract variables from random expressions', () => {
		const input = '{#:{@:min}-{@:max}}';
		const result = extractVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('min');
		expect(result[1].name).toBe('max');
	});

	it('should extract variables from eval expressions', () => {
		const input = '{eval:{@:a} + {@:b}}';
		const result = extractVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('a');
		expect(result[1].name).toBe('b');
	});

	it('should handle nested variable references', () => {
		const input = '{#:{@:a}-{@:b}!{@:c}}';
		const result = extractVariableReferences(input);

		expect(result).toHaveLength(3);
		expect(result.map((r) => r.name)).toEqual(['a', 'b', 'c']);
	});

	it('should preserve order of variable references', () => {
		const input = '{@:z} + {@:a} + {@:m}';
		const result = extractVariableReferences(input);

		expect(result.map((r) => r.name)).toEqual(['z', 'a', 'm']);
	});

	it('should handle variables in exclusions', () => {
		const input = '{#:1-100!{@:excluded},{@:also_excluded}}';
		const result = extractVariableReferences(input);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('excluded');
		expect(result[1].name).toBe('also_excluded');
	});

	it('should return empty array for no variables', () => {
		const input = 'No variables here';
		const result = extractVariableReferences(input);

		expect(result).toEqual([]);
	});

	it('should handle empty string', () => {
		const result = extractVariableReferences('');

		expect(result).toEqual([]);
	});
});

describe('Variable Name Validation', () => {
	it('should accept valid alphanumeric names', () => {
		const validNames = ['a', 'x', 'var', 'myVar', 'var1', 'var_2', '_private'];

		validNames.forEach((name) => {
			const input = `{@:${name}}`;
			const result = getVariableNames(input);
			expect(result).toContain(name);
		});
	});

	it('should accept names with underscores', () => {
		const input = '{@:my_variable_name}';
		const result = getVariableNames(input);

		expect(result).toEqual(['my_variable_name']);
	});

	it('should accept names starting with underscore', () => {
		const input = '{@:_privateVar}';
		const result = getVariableNames(input);

		expect(result).toEqual(['_privateVar']);
	});

	it('should accept names with numbers (not at start)', () => {
		const input = '{@:var123}';
		const result = getVariableNames(input);

		expect(result).toEqual(['var123']);
	});

	it('should handle single-character variable names', () => {
		const input = '{@:a} + {@:b} + {@:x}';
		const result = getVariableNames(input);

		expect(result).toEqual(['a', 'b', 'x']);
	});
});

describe('Edge Cases', () => {
	it('should handle multiple spaces around variable references', () => {
		const input = '{@:a}   +   {@:b}';
		const result = getVariableNames(input);

		expect(result).toEqual(['a', 'b']);
	});

	it('should handle variables at start and end of string', () => {
		const input = '{@:start} middle {@:end}';
		const result = getVariableNames(input);

		expect(result).toEqual(['start', 'end']);
	});

	it('should handle malformed variable syntax gracefully', () => {
		const input = '{@:} {@:validVar} {@:';
		const result = getVariableNames(input);

		// Should only extract valid references
		expect(result).toContain('validVar');
	});

	it('should handle very long variable names', () => {
		const longName = 'very_long_variable_name_with_many_characters_123';
		const input = `{@:${longName}}`;
		const result = getVariableNames(input);

		expect(result).toEqual([longName]);
	});

	it('should handle unicode characters in surrounding text', () => {
		const input = 'Calculer {@:a} × {@:b}';
		const result = getVariableNames(input);

		expect(result).toEqual(['a', 'b']);
	});

	it('should handle consecutive variable references', () => {
		const input = '{@:a}{@:b}{@:c}';
		const result = getVariableNames(input);

		expect(result).toEqual(['a', 'b', 'c']);
	});

	it('should handle variables in complex mathematical expressions', () => {
		const input = '$\\sqrt{{@:a}^2 + {@:b}^2} = {@:c}$';
		const result = getVariableNames(input);

		expect(result).toEqual(['a', 'b', 'c']);
	});
});
