/**
 * Variable Resolver Tests
 * ========================
 *
 * Tests for the 3-stage variable resolution pipeline:
 * 1. Variable references
 * 2. Random generation
 * 3. Eval expressions
 *
 * Supports both syntaxes:
 * - Legacy: {{random:1..10}}, {{eval:a+b}}, {{var}}
 * - Simplified: 1..10, eval:a+b, rouge|vert|bleu
 *
 * Note: Variable references ({{var}}) still require {{}} as single
 * identifiers are ambiguous (could be literal math expression).
 */

import { describe, it, expect } from 'vitest';
import { resolveVariables } from '../../../parameterization/resolver/variable-resolver';
import type { Variable } from '../../../types';

describe('resolveVariables', () => {
	// ============================================================================
	// STAGE 1: VARIABLE REFERENCES
	// ============================================================================

	describe('Stage 1: Variable references', () => {
		it('should resolve simple variable reference', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '{{a}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved).toHaveLength(2);
			expect(resolved[0]).toEqual({ name: 'a', value: '5' });
			expect(resolved[1]).toEqual({ name: 'b', value: '5' });
		});

		it('should resolve multiple references in one expression', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '10' },
				{ name: 'sum', expression: '{{a}} + {{b}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[2].value).toBe('5 + 10');
		});

		it('should handle chained references', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '{{a}}' },
				{ name: 'c', expression: '{{b}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('5');
			expect(resolved[1].value).toBe('5');
			expect(resolved[2].value).toBe('5');
		});

		it('should handle long chains', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '42' },
				{ name: 'b', expression: '{{a}}' },
				{ name: 'c', expression: '{{b}}' },
				{ name: 'd', expression: '{{c}}' },
				{ name: 'e', expression: '{{d}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[4].value).toBe('42');
		});

		it('should preserve text around variable references', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'text', expression: 'Value is {{a}} units' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[1].value).toBe('Value is 5 units');
		});

		it('should handle multiple variables in text', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '10' },
				{ name: 'text', expression: '{{a}} + {{b}} = 15' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[2].value).toBe('5 + 10 = 15');
		});

		it('should handle decimal values', () => {
			const variables: Variable[] = [
				{ name: 'pi', expression: '3.14' },
				{ name: 'radius', expression: '5' },
				{ name: 'formula', expression: '{{pi}} * {{radius}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[2].value).toBe('3.14 * 5');
		});

		it('should handle negative numbers', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '-5' },
				{ name: 'b', expression: '{{a}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[1].value).toBe('-5');
		});

		it('should throw error on undefined variable reference', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{{undefined}}' }];
			expect(() => resolveVariables(variables)).toThrow(
				'Variable "undefined" not found or not yet resolved'
			);
		});

		it('should throw error on forward reference', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{b}}' },
				{ name: 'b', expression: '5' }
			];
			expect(() => resolveVariables(variables)).toThrow(
				'Variable "b" not found or not yet resolved'
			);
		});
	});

	// ============================================================================
	// STAGE 2: RANDOM GENERATION
	// ============================================================================

	describe('Stage 2: Random generation', () => {
		it('should generate random integers', () => {
			const variables: Variable[] = [{ name: 'rand', expression: '{{random:1..10}}' }];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[0].value);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(10);
			expect(Number.isInteger(value)).toBe(true);
		});

		it('should generate same value with same seed', () => {
			const variables: Variable[] = [{ name: 'rand', expression: '{{random:1..100}}' }];
			const resolved1 = resolveVariables(variables, 42);
			const resolved2 = resolveVariables(variables, 42);
			expect(resolved1[0].value).toBe(resolved2[0].value);
		});

		it('should generate different values with different seeds', () => {
			const variables: Variable[] = [{ name: 'rand', expression: '{{random:1..1000}}' }];
			const resolved1 = resolveVariables(variables, 42);
			const resolved2 = resolveVariables(variables, 43);
			expect(resolved1[0].value).not.toBe(resolved2[0].value);
		});

		it('should handle variable bounds in random', () => {
			const variables: Variable[] = [
				{ name: 'min', expression: '5' },
				{ name: 'max', expression: '15' },
				{ name: 'rand', expression: '{{random:{{min}}..{{max}}}}' }
			];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[2].value);
			expect(value).toBeGreaterThanOrEqual(5);
			expect(value).toBeLessThanOrEqual(15);
		});

		it('should generate random decimals by digits', () => {
			const variables: Variable[] = [{ name: 'rand', expression: '{{random:2.3}}' }];
			const resolved = resolveVariables(variables, 42);
			const value = parseFloat(resolved[0].value);
			expect(value).toBeGreaterThanOrEqual(10); // min 2 digits before
			expect(value).toBeLessThan(100); // max 2 digits before
			const decimals = resolved[0].value.split('.')[1];
			expect(decimals).toHaveLength(3);
		});

		it('should handle exclusions', () => {
			const variables: Variable[] = [{ name: 'rand', expression: '{{random:1..5!3}}' }];
			const values = Array.from({ length: 100 }, (_, i) => {
				const resolved = resolveVariables(variables, i);
				return parseInt(resolved[0].value);
			});
			expect(values).not.toContain(3);
			expect(values.some((v) => v === 1 || v === 2 || v === 4 || v === 5)).toBe(true);
		});

		it('should handle range exclusions', () => {
			const variables: Variable[] = [{ name: 'rand', expression: '{{random:1..10!5..7}}' }];
			const values = Array.from({ length: 100 }, (_, i) => {
				const resolved = resolveVariables(variables, i);
				return parseInt(resolved[0].value);
			});
			expect(values).not.toContain(5);
			expect(values).not.toContain(6);
			expect(values).not.toContain(7);
		});

		it('should handle multiple exclusions', () => {
			const variables: Variable[] = [{ name: 'rand', expression: '{{random:1..10!3,5,7}}' }];
			const values = Array.from({ length: 100 }, (_, i) => {
				const resolved = resolveVariables(variables, i);
				return parseInt(resolved[0].value);
			});
			expect(values).not.toContain(3);
			expect(values).not.toContain(5);
			expect(values).not.toContain(7);
		});

		it('should handle variable exclusions', () => {
			const variables: Variable[] = [
				{ name: 'excluded', expression: '5' },
				{ name: 'rand', expression: '{{random:1..10!{{excluded}}}}' }
			];
			const values = Array.from({ length: 50 }, (_, i) => {
				const resolved = resolveVariables(variables, i);
				return parseInt(resolved[1].value);
			});
			expect(values).not.toContain(5);
		});

		it('should generate multiple different random values', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{random:1..100}}' },
				{ name: 'b', expression: '{{random:1..100}}' }
			];
			const resolved = resolveVariables(variables, 42);
			// Each variable gets a unique seed, so they generate different values
			const valueA = parseInt(resolved[0].value);
			const valueB = parseInt(resolved[1].value);
			expect(valueA).toBeGreaterThanOrEqual(1);
			expect(valueA).toBeLessThanOrEqual(100);
			expect(valueB).toBeGreaterThanOrEqual(1);
			expect(valueB).toBeLessThanOrEqual(100);
			// Values should be different (with extremely high probability for range 1..100)
			expect(valueA).not.toBe(valueB);
		});

		it('should handle random in text context', () => {
			const variables: Variable[] = [{ name: 'text', expression: 'Value is {{random:1..10}}' }];
			const resolved = resolveVariables(variables, 42);
			expect(resolved[0].value).toMatch(/^Value is \d+$/);
		});
	});

	// ============================================================================
	// STAGE 3: EVAL EXPRESSIONS
	// ============================================================================

	describe('Stage 3: Eval expressions', () => {
		it('should evaluate simple math', () => {
			const variables: Variable[] = [{ name: 'result', expression: '{{eval:5+3}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('8');
		});

		it('should evaluate subtraction', () => {
			const variables: Variable[] = [{ name: 'result', expression: '{{eval:10-3}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('7');
		});

		it('should evaluate multiplication', () => {
			const variables: Variable[] = [{ name: 'result', expression: '{{eval:4*5}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('20');
		});

		it('should evaluate division', () => {
			const variables: Variable[] = [{ name: 'result', expression: '{{eval:20/4}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('5');
		});

		it('should evaluate simple arithmetic', () => {
			const variables: Variable[] = [{ name: 'sum', expression: '{{eval:5+10}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('15');
		});

		it('should evaluate expressions with multiplication', () => {
			const variables: Variable[] = [{ name: 'result', expression: '{{eval:(5+10)*2}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('30');
		});

		it('should handle LaTeX expressions', () => {
			const variables: Variable[] = [{ name: 'frac', expression: '{{eval:\\frac{6}{2}}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('3');
		});

		it('should evaluate constants in expressions', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '10' },
				{ name: 'result', expression: '{{eval:5+10}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[2].value).toBe('15');
		});

		it('should handle decimal division results', () => {
			const variables: Variable[] = [{ name: 'result', expression: '{{eval:7/2}}' }];
			const resolved = resolveVariables(variables);
			// Compute engine may return '7/2' as LaTeX or '3.5' as decimal
			// Just verify it's a valid representation of 3.5
			const value = eval(resolved[0].value); // eval('7/2') = 3.5 or parseFloat('3.5') = 3.5
			expect(value).toBe(3.5);
		});

		it('should handle negative results', () => {
			const variables: Variable[] = [{ name: 'result', expression: '{{eval:5-10}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('-5');
		});

		it('should evaluate power operations', () => {
			const variables: Variable[] = [{ name: 'result', expression: '{{eval:2^3}}' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('8');
		});

		it('should handle multiple eval expressions', () => {
			const variables: Variable[] = [
				{ name: 'sum', expression: '{{eval:5+3}}' },
				{ name: 'product', expression: '{{eval:4*2}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('8');
			expect(resolved[1].value).toBe('8');
		});
	});

	// ============================================================================
	// COMBINED STAGES
	// ============================================================================

	describe('Combined stages', () => {
		it('should handle all 3 stages: variable refs, random, and eval', () => {
			const variables: Variable[] = [
				{ name: 'min', expression: '1' },
				{ name: 'max', expression: '10' },
				{ name: 'rand', expression: '{{random:{{min}}..{{max}}}}' },
				{ name: 'doubled', expression: '{{eval:2*2}}' }
			];
			const resolved = resolveVariables(variables, 42);
			const randValue = parseInt(resolved[2].value);
			expect(randValue).toBeGreaterThanOrEqual(1);
			expect(randValue).toBeLessThanOrEqual(10);
			expect(resolved[3].value).toBe('4');
		});

		it('should handle variable refs and random generation together', () => {
			const variables: Variable[] = [
				{ name: 'base', expression: '5' },
				{ name: 'multiplier', expression: '{{random:1..10}}' }
			];
			const resolved = resolveVariables(variables, 42);
			expect(resolved[0].value).toBe('5');
			const multiplier = parseInt(resolved[1].value);
			expect(multiplier).toBeGreaterThanOrEqual(1);
			expect(multiplier).toBeLessThanOrEqual(10);
		});

		it('should handle random with exclusions based on other variables', () => {
			const variables: Variable[] = [
				{ name: 'min', expression: '1' },
				{ name: 'max', expression: '10' },
				{ name: 'a', expression: '{{random:{{min}}..{{max}}}}' },
				{ name: 'b', expression: '{{random:{{min}}..{{max}}!{{a}}}}' }
			];
			const resolved = resolveVariables(variables, 12345);
			const a = parseInt(resolved[2].value);
			const b = parseInt(resolved[3].value);
			expect(a).toBeGreaterThanOrEqual(1);
			expect(a).toBeLessThanOrEqual(10);
			expect(b).toBeGreaterThanOrEqual(1);
			expect(b).toBeLessThanOrEqual(10);
			expect(a).not.toBe(b); // b excludes a
		});

		it('should handle text with variable and random tokens', () => {
			const variables: Variable[] = [
				{ name: 'constant', expression: '5' },
				{ name: 'rand', expression: '{{random:1..10}}' },
				{ name: 'text', expression: 'Constant: {{constant}}, Random: {{rand}}' }
			];
			const resolved = resolveVariables(variables, 42);
			expect(resolved[2].value).toMatch(/^Constant: \d+, Random: \d+$/);
			expect(resolved[2].value).toContain('5');
		});

		it('should maintain resolution order with chained references', () => {
			const variables: Variable[] = [
				{ name: 'step1', expression: '5' },
				{ name: 'step2', expression: '{{step1}}' },
				{ name: 'step3', expression: '{{step2}}' },
				{ name: 'step4', expression: '{{step3}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('5');
			expect(resolved[1].value).toBe('5');
			expect(resolved[2].value).toBe('5');
			expect(resolved[3].value).toBe('5');
		});
	});

	// ============================================================================
	// DIGITS GENERATION
	// ============================================================================

	describe('Digits generation', () => {
		it('should generate single digit number', () => {
			const variables: Variable[] = [{ name: 'a', expression: 'digits:1' }];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[0].value);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(9);
		});

		it('should generate two digit number', () => {
			const variables: Variable[] = [{ name: 'a', expression: 'digits:2' }];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[0].value);
			expect(value).toBeGreaterThanOrEqual(10);
			expect(value).toBeLessThanOrEqual(99);
		});

		it('should generate number with digit range', () => {
			const variables: Variable[] = [{ name: 'a', expression: 'digits:1..3' }];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[0].value);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(999);
		});

		it('should work with legacy {{digits:...}} syntax', () => {
			const variables: Variable[] = [{ name: 'a', expression: '{{digits:2}}' }];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[0].value);
			expect(value).toBeGreaterThanOrEqual(10);
			expect(value).toBeLessThanOrEqual(99);
		});

		it('should support variable bounds with bare names', () => {
			const variables: Variable[] = [
				{ name: 'min', expression: '1' },
				{ name: 'max', expression: '3' },
				{ name: 'num', expression: 'digits:min..max' }
			];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[2].value);
			expect(value).toBeGreaterThanOrEqual(1);
			expect(value).toBeLessThanOrEqual(999);
		});

		it('should support variable bounds with explicit syntax', () => {
			const variables: Variable[] = [
				{ name: 'n', expression: '2' },
				{ name: 'm', expression: '4' },
				{ name: 'num', expression: 'digits:{{n}}..{{m}}' }
			];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[2].value);
			expect(value).toBeGreaterThanOrEqual(10);
			expect(value).toBeLessThanOrEqual(9999);
		});

		it('should support single variable bound', () => {
			const variables: Variable[] = [
				{ name: 'd', expression: '3' },
				{ name: 'num', expression: 'digits:d' }
			];
			const resolved = resolveVariables(variables, 42);
			const value = parseInt(resolved[1].value);
			expect(value).toBeGreaterThanOrEqual(100);
			expect(value).toBeLessThanOrEqual(999);
		});

		it('should throw for undefined variable in digits spec', () => {
			const variables: Variable[] = [{ name: 'num', expression: 'digits:unknown' }];
			expect(() => resolveVariables(variables, 42)).toThrow(/Variable "unknown" not found/);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	describe('Edge cases', () => {
		it('should handle empty variables array', () => {
			const variables: Variable[] = [];
			const resolved = resolveVariables(variables);
			expect(resolved).toEqual([]);
		});

		it('should handle single constant variable', () => {
			const variables: Variable[] = [{ name: 'a', expression: '42' }];
			const resolved = resolveVariables(variables);
			expect(resolved).toEqual([{ name: 'a', value: '42' }]);
		});

		it('should handle whitespace in expressions', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '  {{a}}  ' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[1].value).toBe('  5  ');
		});

		it('should handle empty expression', () => {
			const variables: Variable[] = [{ name: 'a', expression: '' }];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('');
		});

		it('should handle very large numbers', () => {
			const variables: Variable[] = [
				{ name: 'big', expression: '999999999' },
				{ name: 'ref', expression: '{{big}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[1].value).toBe('999999999');
		});

		it('should preserve special characters', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'text', expression: '${{a}} euros!' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[1].value).toBe('$5 euros!');
		});

		it('should handle Unicode characters', () => {
			const variables: Variable[] = [
				{ name: 'pi', expression: 'π' },
				{ name: 'text', expression: 'Value: {{pi}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[1].value).toBe('Value: π');
		});

		it('should handle zero values', () => {
			const variables: Variable[] = [
				{ name: 'zero', expression: '0' },
				{ name: 'result', expression: '{{eval:0+5}}' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[1].value).toBe('5');
		});
	});

	// ============================================================================
	// DISCRETE LISTS (INTEGRATION TESTS)
	// ============================================================================

	describe('Discrete lists', () => {
		it('should select random item from literal list', () => {
			const variables: Variable[] = [{ name: 'color', expression: '{{rouge|vert|bleu}}' }];
			const resolved = resolveVariables(variables, 42);
			expect(['rouge', 'vert', 'bleu']).toContain(resolved[0].value);
		});

		it('should resolve variable names in discrete list', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '10' },
				{ name: 'b', expression: '20' },
				{ name: 'choice', expression: '{{a|b|literal}}' }
			];

			// Generate multiple times to verify all possibilities
			const results = Array.from({ length: 100 }, (_, i) => resolveVariables(variables, i));

			const choiceValues = results.map((r) => r[2].value);
			expect(choiceValues.some((v) => v === '10')).toBe(true); // 'a' resolved
			expect(choiceValues.some((v) => v === '20')).toBe(true); // 'b' resolved
			expect(choiceValues.some((v) => v === 'literal')).toBe(true); // literal stays
		});

		it('should handle exclusions in discrete list', () => {
			const variables: Variable[] = [{ name: 'choice', expression: '{{a|b|c|d!b,d}}' }];

			const results = Array.from({ length: 50 }, (_, i) => resolveVariables(variables, i));
			const values = results.map((r) => r[0].value);

			// Should only contain 'a' and 'c'
			expect(values.every((v) => ['a', 'c'].includes(v))).toBe(true);
			expect(values).not.toContain('b');
			expect(values).not.toContain('d');
		});

		it('should resolve variables in exclusions', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '10' },
				{ name: 'b', expression: '20' },
				{ name: 'c', expression: '30' },
				{ name: 'choice', expression: '{{a|b|c!b}}' }
			];

			const results = Array.from({ length: 50 }, (_, i) => resolveVariables(variables, i));
			const values = results.map((r) => r[3].value);

			// 'b' is excluded (resolves to '20')
			expect(values.every((v) => ['10', '30'].includes(v))).toBe(true);
			expect(values).not.toContain('20');
		});

		it('should use discrete list in text', () => {
			const variables: Variable[] = [
				{ name: 'color', expression: '{{rouge|vert|bleu}}' },
				{ name: 'text', expression: 'La couleur est {{color}}' }
			];

			const resolved = resolveVariables(variables, 123);
			expect(resolved[1].value).toMatch(/^La couleur est (rouge|vert|bleu)$/);
		});

		it('should combine discrete list with eval', () => {
			const variables: Variable[] = [
				{ name: 'op', expression: '{{+|-}}' },
				{ name: 'result', expression: '{{eval:5{{op}}3}}' }
			];

			// Generate multiple times to ensure we get both operators
			const results = Array.from({ length: 50 }, (_, i) => resolveVariables(variables, i));
			const values = results.map((r) => r[1].value);

			// Should have both 8 (+) and 2 (-)
			expect(values).toContain('8'); // 5+3
			expect(values).toContain('2'); // 5-3
		});

		it('should use discrete list with random numbers', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '{{1..10}}' },
				{ name: 'b', expression: '{{1..10}}' },
				{ name: 'largest', expression: '{{a|b}}' }
			];

			const resolved = resolveVariables(variables, 42);

			// 'largest' should be either value of 'a' or 'b'
			expect([resolved[0].value, resolved[1].value]).toContain(resolved[2].value);
		});

		it('should handle nested variable references in discrete list', () => {
			const variables: Variable[] = [
				{ name: 'x', expression: '{{1..5}}' },
				{ name: 'y', expression: '{{6..10}}' },
				{ name: 'choice', expression: '{{x|y}}' },
				{ name: 'text', expression: 'Chosen: {{choice}}' }
			];

			const resolved = resolveVariables(variables, 789);

			// choice should be value of x or y
			expect([resolved[0].value, resolved[1].value]).toContain(resolved[2].value);

			// text should include the chosen value
			expect(resolved[3].value).toBe(`Chosen: ${resolved[2].value}`);
		});
	});

	// ============================================================================
	// DISPLAY OPTIONS INTEGRATION
	// ============================================================================

	describe('Display options', () => {
		it('should not add displayValue when no displayOptions are set', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'expr', expression: 'a+b+c' }
			];
			const resolved = resolveVariables(variables);
			expect(resolved[0].displayValue).toBeUndefined();
			expect(resolved[1].displayValue).toBeUndefined();
		});

		it('should apply removeNullTerms transform', () => {
			const variables: Variable[] = [
				{
					name: 'expr',
					expression: 'x+0',
					displayOptions: { removeNullTerms: true }
				}
			];
			const resolved = resolveVariables(variables);
			expect(resolved[0].value).toBe('x+0');
			expect(resolved[0].displayValue).toBe('x');
		});

		it('should handle template-level displayOptions', () => {
			const variables: Variable[] = [{ name: 'expr', expression: 'y+0' }];
			const templateDefaults = { removeNullTerms: true };
			const resolved = resolveVariables(variables, undefined, templateDefaults);
			expect(resolved[0].displayValue).toBe('y');
		});

		it('should allow variable to override template displayOptions', () => {
			const variables: Variable[] = [
				{
					name: 'expr',
					expression: 'z+0',
					displayOptions: { removeNullTerms: false }
				}
			];
			const templateDefaults = { removeNullTerms: true };
			const resolved = resolveVariables(variables, undefined, templateDefaults);
			// Variable says don't remove null terms, so displayValue should not be set
			expect(resolved[0].displayValue).toBeUndefined();
		});

		it('should not set displayValue when value unchanged after transform', () => {
			const variables: Variable[] = [
				{
					name: 'expr',
					expression: 'text:x', // Use text: prefix for literal math expression
					displayOptions: { removeNullTerms: true }
				}
			];
			const resolved = resolveVariables(variables);
			// 'x' has no null terms, so transform produces same value
			expect(resolved[0].displayValue).toBeUndefined();
		});

		it('should handle non-transformable values gracefully', () => {
			const variables: Variable[] = [
				{
					name: 'text',
					expression: 'not a math expression',
					displayOptions: { shuffleTerms: true }
				}
			];
			const resolved = resolveVariables(variables);
			// Non-math content should not crash, just no displayValue
			expect(resolved[0].value).toBe('not a math expression');
			// displayValue may or may not be set depending on CE behavior
		});

		it('should preserve displayOptions through resolution', () => {
			const variables: Variable[] = [
				{ name: 'a', expression: '5' },
				{ name: 'b', expression: '0' },
				{
					name: 'expr',
					expression: '{{a}}+{{b}}',
					displayOptions: { removeNullTerms: true }
				}
			];
			const resolved = resolveVariables(variables);
			// 5+0 should become 5 with removeNullTerms
			expect(resolved[2].value).toBe('5+0');
			expect(resolved[2].displayValue).toBe('5');
		});

		it('should handle shuffleTermsAndFactors convenience option', () => {
			const variables: Variable[] = [
				{
					name: 'expr',
					expression: 'a+b+c',
					displayOptions: { shuffleTermsAndFactors: true }
				}
			];
			// With shuffling, displayValue should be different (usually)
			// Run multiple times to check it does something
			const results = Array.from({ length: 10 }, () => resolveVariables(variables));
			const hasTransformed = results.some((r) => r[0].displayValue !== undefined);
			expect(hasTransformed).toBe(true);
		});
	});

	// ============================================================================
	// SIMPLIFIED SYNTAX (NEW)
	// ============================================================================

	describe('Simplified syntax', () => {
		describe('Random (without {{}})', () => {
			it('should generate random from simplified range', () => {
				const variables: Variable[] = [{ name: 'rand', expression: '1..10' }];
				const resolved = resolveVariables(variables, 42);
				const value = parseInt(resolved[0].value);
				expect(value).toBeGreaterThanOrEqual(1);
				expect(value).toBeLessThanOrEqual(10);
			});

			it('should handle range with sign modifier', () => {
				const variables: Variable[] = [{ name: 'rand', expression: '2..9;+-' }];
				const resolved = resolveVariables(variables, 42);
				const value = parseInt(resolved[0].value);
				expect(Math.abs(value)).toBeGreaterThanOrEqual(2);
				expect(Math.abs(value)).toBeLessThanOrEqual(9);
			});

			it('should handle decimal range', () => {
				const variables: Variable[] = [{ name: 'rand', expression: '1.5..3.5;0.5' }];
				const resolved = resolveVariables(variables, 42);
				const value = parseFloat(resolved[0].value);
				expect(value).toBeGreaterThanOrEqual(1.5);
				expect(value).toBeLessThanOrEqual(3.5);
			});

			it('should handle random by digits with prefix', () => {
				const variables: Variable[] = [{ name: 'rand', expression: 'random:2.3' }];
				const resolved = resolveVariables(variables, 42);
				const value = parseFloat(resolved[0].value);
				expect(value).toBeGreaterThanOrEqual(10);
				expect(value).toBeLessThan(100);
				const decimals = resolved[0].value.split('.')[1];
				expect(decimals).toHaveLength(3);
			});

			it('should handle exclusions', () => {
				const variables: Variable[] = [{ name: 'rand', expression: '1..5!3' }];
				const values = Array.from({ length: 100 }, (_, i) => {
					const resolved = resolveVariables(variables, i);
					return parseInt(resolved[0].value);
				});
				expect(values).not.toContain(3);
			});
		});

		describe('Eval (without {{}})', () => {
			it('should evaluate simplified eval expression', () => {
				const variables: Variable[] = [{ name: 'result', expression: 'eval:5+3' }];
				const resolved = resolveVariables(variables);
				expect(resolved[0].value).toBe('8');
			});

			it('should evaluate with variable references in eval', () => {
				const variables: Variable[] = [
					{ name: 'a', expression: '5' },
					{ name: 'b', expression: '10' },
					{ name: 'sum', expression: 'eval:a+b' }
				];
				const resolved = resolveVariables(variables);
				expect(resolved[2].value).toBe('15');
			});

			it('should evaluate complex expression', () => {
				const variables: Variable[] = [{ name: 'result', expression: 'eval:(2+3)*4' }];
				const resolved = resolveVariables(variables);
				expect(resolved[0].value).toBe('20');
			});
		});

		describe('Discrete list (without {{}})', () => {
			it('should select from simplified discrete list', () => {
				const variables: Variable[] = [{ name: 'color', expression: 'rouge|vert|bleu' }];
				const resolved = resolveVariables(variables, 42);
				expect(['rouge', 'vert', 'bleu']).toContain(resolved[0].value);
			});

			it('should handle operator list', () => {
				const variables: Variable[] = [{ name: 'op', expression: '+|-' }];
				const resolved = resolveVariables(variables, 42);
				expect(['+', '-']).toContain(resolved[0].value);
			});

			it('should handle exclusions in list', () => {
				const variables: Variable[] = [{ name: 'choice', expression: 'a|b|c|d!b,d' }];
				const results = Array.from({ length: 50 }, (_, i) => resolveVariables(variables, i));
				const values = results.map((r) => r[0].value);
				expect(values.every((v) => ['a', 'c'].includes(v))).toBe(true);
			});
		});

		describe('Text literal prefix', () => {
			it('should strip text: prefix and use as literal', () => {
				const variables: Variable[] = [{ name: 'msg', expression: 'text:hello world' }];
				const resolved = resolveVariables(variables);
				expect(resolved[0].value).toBe('hello world');
			});

			it('should preserve special characters after text: prefix', () => {
				const variables: Variable[] = [{ name: 'latex', expression: 'text:x+y=z' }];
				const resolved = resolveVariables(variables);
				expect(resolved[0].value).toBe('x+y=z');
			});
		});

		describe('Numeric literals', () => {
			it('should keep integer literal unchanged', () => {
				const variables: Variable[] = [{ name: 'n', expression: '42' }];
				const resolved = resolveVariables(variables);
				expect(resolved[0].value).toBe('42');
			});

			it('should keep negative number unchanged', () => {
				const variables: Variable[] = [{ name: 'n', expression: '-5' }];
				const resolved = resolveVariables(variables);
				expect(resolved[0].value).toBe('-5');
			});

			it('should keep decimal unchanged', () => {
				const variables: Variable[] = [{ name: 'n', expression: '3.14' }];
				const resolved = resolveVariables(variables);
				expect(resolved[0].value).toBe('3.14');
			});
		});

		describe('Backward compatibility', () => {
			it('should still accept legacy {{random:...}} syntax', () => {
				const variables: Variable[] = [{ name: 'rand', expression: '{{random:1..10}}' }];
				const resolved = resolveVariables(variables, 42);
				const value = parseInt(resolved[0].value);
				expect(value).toBeGreaterThanOrEqual(1);
				expect(value).toBeLessThanOrEqual(10);
			});

			it('should still accept legacy {{eval:...}} syntax', () => {
				const variables: Variable[] = [{ name: 'result', expression: '{{eval:5+3}}' }];
				const resolved = resolveVariables(variables);
				expect(resolved[0].value).toBe('8');
			});

			it('should still accept legacy {{...}} discrete list', () => {
				const variables: Variable[] = [{ name: 'color', expression: '{{rouge|vert|bleu}}' }];
				const resolved = resolveVariables(variables, 42);
				expect(['rouge', 'vert', 'bleu']).toContain(resolved[0].value);
			});

			it('should resolve simplified variable reference', () => {
				// 'x' alone is a variable reference (no {{}} needed)
				const variables: Variable[] = [
					{ name: 'x', expression: '5' },
					{ name: 'ref', expression: 'x' }
				];
				const resolved = resolveVariables(variables);
				expect(resolved[1].value).toBe('5'); // 'x' resolves to '5'
			});

			it('should use text: prefix for literal strings', () => {
				const variables: Variable[] = [
					{ name: 'x', expression: '5' },
					{ name: 'literal', expression: 'text:x' }
				];
				const resolved = resolveVariables(variables);
				expect(resolved[1].value).toBe('x'); // Literal 'x', not resolved
			});
		});

		describe('Mixed syntax scenarios', () => {
			it('should combine simplified random with variable reference in eval', () => {
				const variables: Variable[] = [
					{ name: 'a', expression: '1..10' },
					{ name: 'b', expression: '1..10' },
					{ name: 'sum', expression: 'eval:a+b' }
				];
				const resolved = resolveVariables(variables, 42);
				const a = parseInt(resolved[0].value);
				const b = parseInt(resolved[1].value);
				const sum = parseInt(resolved[2].value);
				expect(sum).toBe(a + b);
			});

			it('should combine discrete list with eval', () => {
				const variables: Variable[] = [
					{ name: 'op', expression: '+|-' },
					{ name: 'result', expression: '{{eval:5{{op}}3}}' }
				];
				const results = Array.from({ length: 50 }, (_, i) => resolveVariables(variables, i));
				const values = results.map((r) => r[1].value);
				expect(values).toContain('8'); // 5+3
				expect(values).toContain('2'); // 5-3
			});
		});
	});
});
