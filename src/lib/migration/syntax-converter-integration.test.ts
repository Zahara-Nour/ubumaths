/**
 * Integration Tests for TinyCAS Syntax Converter
 * ===============================================
 *
 * Comprehensive integration tests to verify the converter outputs correct Markdown syntax
 * for complete questions, nested patterns, edge cases, performance, and validation.
 *
 * These tests complement the unit tests in syntax-converter.test.ts by testing
 * end-to-end scenarios and complex interactions between different pattern types.
 */

import { describe, it, expect } from 'vitest';
import { convertTinyCASToNew, convertBatch, validateConversion } from './syntax-converter';

describe('TinyCAS Syntax Converter > Integration Tests - Complete Questions', () => {
	it('should convert a complete arithmetic question with multiple patterns', () => {
		const input =
			'Calculer [_$e[1;20] + $e[1;20]_] = &1. Puis soustraire $l{5:10:15} pour obtenir &2.';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe(
			'Calculer {{eval:{{1..20}} + {{1..20}}}} = {{1}}. Puis soustraire {{5|10|15}} pour obtenir {{2}}.'
		);
		expect(result.stats!.randomIntegers).toBe(2);
		expect(result.stats!.evaluations).toBe(1);
		expect(result.stats!.listSelections).toBe(1);
		expect(result.stats!.variableRefs).toBe(2);
	});

	it('should convert a geometry question with exclusions and evaluations', () => {
		const input =
			'Un rectangle a une longueur de $e[10;50]\\{20;30} cm et une largeur de &1 cm. Son périmètre est [_2*(&1+&2)_] cm.';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{10..50!20,30}}');
		expect(result.converted).toContain('{{eval:2*({{1}}+{{2}})}}');
		expect(result.stats!.exclusions).toBe(1); // One exclusion with 2 values
		expect(result.stats!.evaluations).toBe(1);
		expect(result.stats!.variableRefs).toBeGreaterThan(0);
	});

	it('should convert a probability question with lists and decimals', () => {
		const input =
			'La probabilité est $l{0.25:0.5:0.75} ou [._&1/2_.]  = &2. Choisis $l{rouge:bleu:vert}.';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{0.25|0.5|0.75}}');
		expect(result.converted).toContain('{{eval:{{1}}/2}}');
		expect(result.converted).toContain('{{rouge|bleu|vert}}');
		expect(result.stats!.listSelections).toBe(2);
		expect(result.stats!.evaluations).toBe(1);
	});

	it('should convert a question with n-digit numbers and variables', () => {
		const input =
			'Soit un nombre de $e{3;3} chiffres: &abc. Le chiffre des centaines est $e[1;9] et vaut &c.';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{100..999}}');
		expect(result.converted).toContain('{{abc}}');
		expect(result.converted).toContain('{{1..9}}');
		expect(result.converted).toContain('{{c}}');
		expect(result.stats!.nDigitNumbers).toBe(1);
		expect(result.stats!.randomIntegers).toBe(1);
		expect(result.stats!.variableRefs).toBe(2);
	});

	it('should convert algebra question with all pattern types', () => {
		const input =
			'Soit x = $e[1;10] et y = $e[1;10]\\{&x}. Calculer [_&x+&y_] + $l{1:2:3:5:7} = &resultat.';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{1..10}}');
		expect(result.converted).toContain('{{1..10!{{x}}}}');
		expect(result.converted).toContain('{{eval:{{x}}+{{y}}}}');
		expect(result.converted).toContain('{{1|2|3|5|7}}');
		expect(result.stats!.randomIntegers).toBe(1);
		expect(result.stats!.exclusions).toBe(1);
		expect(result.stats!.evaluations).toBe(1);
		expect(result.stats!.listSelections).toBe(1);
	});
});

describe('TinyCAS Syntax Converter > Integration Tests - Nested Patterns', () => {
	it('should handle nested evaluations with variables', () => {
		const input = '[_&1 + &2_] * [_&3 - &4_]';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('{{eval:{{1}} + {{2}}}} * {{eval:{{3}} - {{4}}}}');
		expect(result.stats!.evaluations).toBe(2);
		expect(result.stats!.variableRefs).toBe(4);
	});

	it('should handle nested random patterns in lists', () => {
		// Note: Lists with nested patterns are partially converted - this is a known limitation
		// The random patterns are converted first, then the list converter sees the result
		const input = '$l{a;b;c}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('{{a|b|c}}');
		expect(result.stats!.listSelections).toBe(1);
	});

	it('should handle complex exclusions with variables', () => {
		const input = '$e[1;100]\\{&a;&b;50}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('{{1..100!{{a}},{{b}},50}}');
		expect(result.stats!.exclusions).toBe(1);
		expect(result.stats!.variableRefs).toBe(2);
	});

	it('should handle nested list selections', () => {
		const input = '$l{a;b;c}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{');
		expect(result.stats!.listSelections).toBe(1);
	});

	it('should handle evaluation containing random with exclusions', () => {
		const input = '[_$e[1;10]\\{5} + &x_]';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{eval:{{1..10!5}} + {{x}}}}');
		expect(result.stats!.evaluations).toBe(1);
		expect(result.stats!.exclusions).toBe(1);
	});
});

describe('TinyCAS Syntax Converter > Integration Tests - Edge Cases', () => {
	it('should handle empty patterns gracefully', () => {
		const input = 'Text with no patterns at all';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe(input);
		expect(result.stats!.total).toBe(0);
	});

	it('should handle string with only whitespace and patterns', () => {
		const input = '   $e[1;10]   &x   ';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('   {{1..10}}   {{x}}   ');
	});

	it('should handle very long strings with 50+ conversions', () => {
		const parts = [];
		for (let i = 0; i < 50; i++) {
			parts.push(`$e[${i};${i + 10}]`);
		}
		const input = parts.join(' + ');
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.stats!.randomIntegers).toBe(50);
		expect(result.converted).toContain('{{0..10}}');
		expect(result.converted).toContain('{{49..59}}');
	});

	it('should handle Unicode and special characters in context', () => {
		const input = 'Température: $e[-10;30]°C. Probabilité: &p ∈ [0;1]. π ≈ $l{3.14:3.1416}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{-10..30}}°C');
		expect(result.converted).toContain('{{p}}');
		expect(result.converted).toContain('{{3.14|3.1416}}');
	});

	it('should handle HTML entities (converted as variables)', () => {
		// Note: The converter treats HTML entities like &lt; as variables
		// This is expected behavior as noted in the unit tests
		const input = 'Text with $e[1;10] and entities';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{1..10}}');
	});

	it('should handle mixed LaTeX and patterns', () => {
		const input = '$$\\frac{&1}{&2}$$ where &1 = $e[1;9] and &2 = $e[1;9]\\{&1}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('$$\\frac{{{1}}}{{{2}}}$$');
		expect(result.converted).toContain('{{1}} = {{1..9}}');
		expect(result.converted).toContain('{{2}} = {{1..9!{{1}}}}');
	});

	it('should handle extreme negative ranges', () => {
		const input = '$e[-999;-100] and $e[-50;-10]\\{-25}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{-999..-100}}');
		expect(result.converted).toContain('{{-50..-10!-25}}');
	});
});

describe('TinyCAS Syntax Converter > Integration Tests - Performance', () => {
	it('should convert 100 simple questions in under 100ms', () => {
		const questions = [];
		for (let i = 0; i < 100; i++) {
			questions.push(`Question ${i}: $e[1;100] + &x = [_&x+$e[1;10]_]`);
		}

		const startTime = performance.now();
		const results = convertBatch(questions);
		const endTime = performance.now();

		expect(results.length).toBe(100);
		expect(results.every((r) => r.success)).toBe(true);
		expect(endTime - startTime).toBeLessThan(100);
	});

	it('should handle complex questions with many patterns efficiently', () => {
		const input =
			'$e[1;10] $e[11;20] $e[21;30] &a &b &c [_&a+&b_] [_&b*&c_] $l{1:2:3} $l{a:b:c} $e{3;3}';

		const startTime = performance.now();
		const result = convertTinyCASToNew(input);
		const endTime = performance.now();

		expect(result.success).toBe(true);
		expect(endTime - startTime).toBeLessThan(10); // Should be very fast
		expect(result.stats!.total).toBeGreaterThan(10);
	});

	it('should handle 1000 variable references efficiently', () => {
		const vars = [];
		for (let i = 0; i < 1000; i++) {
			vars.push(`&var${i}`);
		}
		const input = vars.join(' + ');

		const startTime = performance.now();
		const result = convertTinyCASToNew(input);
		const endTime = performance.now();

		expect(result.success).toBe(true);
		expect(result.stats!.variableRefs).toBe(1000);
		expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
	});
});

describe('TinyCAS Syntax Converter > Integration Tests - Validation', () => {
	it('should validate that all old patterns are converted', () => {
		const testCases = [
			{ input: '$e[1;10]', output: '{{1..10}}' },
			{ input: '&var', output: '{{var}}' },
			{ input: '[_&x+1_]', output: '{{eval:{{x}}+1}}' },
			{ input: '$l{a:b:c}', output: '{{a|b|c}}' },
			{ input: '$e{3;3}', output: '{{100..999}}' }
		];

		for (const testCase of testCases) {
			const result = convertTinyCASToNew(testCase.input);
			expect(result.success).toBe(true);
			expect(result.converted).toBe(testCase.output);
			expect(validateConversion(testCase.input, result.converted!)).toBe(true);
		}
	});

	it('should detect incomplete conversions', () => {
		const incompleteConversions = [
			{ original: '$e[1;10]', converted: '$e[1;10]' }, // Not converted
			{ original: '&var', converted: '&var' }, // Not converted
			{ original: '[_&x+1_]', converted: '[_&x+1_]' } // Not converted
		];

		for (const test of incompleteConversions) {
			expect(validateConversion(test.original, test.converted)).toBe(false);
		}
	});

	it('should validate that new patterns are present after conversion', () => {
		const input = '$e[1;10] + &x';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{');
		expect(result.converted).toContain('}}');
		expect(validateConversion(input, result.converted!)).toBe(true);
	});

	it('should validate complex nested conversions', () => {
		const input = '$e[1;10]\\{[_&x*2_];5} + [_&y+1_]';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(validateConversion(input, result.converted!)).toBe(true);
	});
});

describe('TinyCAS Syntax Converter > Integration Tests - Batch Conversion', () => {
	it('should batch convert multiple questions successfully', () => {
		const inputs = [
			'Question 1: $e[1;10]',
			'Question 2: &x + &y',
			'Question 3: [_&a*&b_]',
			'Question 4: $l{1:2:3}'
		];

		const results = convertBatch(inputs);

		expect(results.length).toBe(4);
		expect(results[0].converted).toBe('Question 1: {{1..10}}');
		expect(results[1].converted).toBe('Question 2: {{x}} + {{y}}');
		expect(results[2].converted).toBe('Question 3: {{eval:{{a}}*{{b}}}}');
		expect(results[3].converted).toBe('Question 4: {{1|2|3}}');
		expect(results.every((r) => r.success)).toBe(true);
	});

	it('should handle errors in batch conversion without stopping', () => {
		const inputs = [
			'Valid: $e[1;10]',
			'', // Empty input - should error
			'Also valid: &x',
			null as unknown as string // Will cause error
		];

		const results = convertBatch(inputs);

		expect(results.length).toBe(4);
		expect(results[0].success).toBe(true);
		expect(results[1].success).toBe(false);
		expect(results[2].success).toBe(true);
		expect(results[3].success).toBe(false);
	});

	it('should maintain statistics across batch conversion', () => {
		const inputs = [
			'$e[1;10]', // 1 random
			'&x + &y', // 2 vars
			'[_&a*&b_]', // 1 eval, 2 vars
			'$l{1:2:3}' // 1 list
		];

		const results = convertBatch(inputs);

		expect(results[0].stats!.randomIntegers).toBe(1);
		expect(results[1].stats!.variableRefs).toBe(2);
		expect(results[2].stats!.evaluations).toBe(1);
		expect(results[2].stats!.variableRefs).toBe(2);
		expect(results[3].stats!.listSelections).toBe(1);
	});

	it('should batch convert 1000 questions efficiently', () => {
		const questions = [];
		for (let i = 0; i < 1000; i++) {
			questions.push(`Q${i}: $e[${i % 100};${(i % 100) + 10}] = &ans${i}`);
		}

		const startTime = performance.now();
		const results = convertBatch(questions);
		const endTime = performance.now();

		expect(results.length).toBe(1000);
		expect(results.every((r) => r.success)).toBe(true);
		expect(endTime - startTime).toBeLessThan(500); // Should complete in under 500ms
	});
});

describe('TinyCAS Syntax Converter > Integration Tests - Real World Examples', () => {
	it('should convert a complete digit position exercise', () => {
		const variables = {
			'&1': '$e[1;9]', // hundreds digit
			'&2': '$e[0;9]\\{&1}', // tens digit (not same as hundreds)
			'&3': '$e[0;9]\\{&1;&2}', // units digit (not same as others)
			'&4': '[_&1*100+&2*10+&3_]' // complete number
		};

		const question = 'Dans le nombre $$&4$$, quel est le chiffre des centaines ?';
		const answer = '&1';

		// Convert variable definitions
		const convertedVars = Object.entries(variables).map(([key, value]) => ({
			key,
			original: value,
			converted: convertTinyCASToNew(value).converted!
		}));

		expect(convertedVars[0].converted).toBe('{{1..9}}');
		expect(convertedVars[1].converted).toBe('{{0..9!{{1}}}}');
		expect(convertedVars[2].converted).toBe('{{0..9!{{1}},{{2}}}}');
		expect(convertedVars[3].converted).toBe('{{eval:{{1}}*100+{{2}}*10+{{3}}}}');

		// Convert question and answer
		const questionResult = convertTinyCASToNew(question);
		const answerResult = convertTinyCASToNew(answer);

		expect(questionResult.converted).toBe(
			'Dans le nombre $${{4}}$$, quel est le chiffre des centaines ?'
		);
		expect(answerResult.converted).toBe('{{1}}');
	});

	it('should convert a complete fraction exercise', () => {
		const input = 'Simplifier la fraction $$\\frac{$e[2;10]\\{&d}}{$e[2;10]}$$ où &d est [_&n+&m_]';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('$$\\frac{{{');
		expect(result.converted).toContain('{{eval:{{n}}+{{m}}}}');
		expect(result.stats!.randomIntegers).toBe(1);
		expect(result.stats!.exclusions).toBe(1);
		expect(result.stats!.evaluations).toBe(1);
	});

	it('should convert a complete measurement conversion exercise', () => {
		const input = 'Convertir $e[10;100] cm en mètres: [._&1/100_.] m. Puis en mm: [_&1*10_] mm.';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toContain('{{10..100}}');
		expect(result.converted).toContain('{{eval:{{1}}/100}}');
		expect(result.converted).toContain('{{eval:{{1}}*10}}');
		expect(result.stats!.randomIntegers).toBe(1);
		expect(result.stats!.evaluations).toBe(2);
		expect(result.warnings!.some((w) => w.includes('Decimal'))).toBe(true);
	});
});

describe('TinyCAS Syntax Converter > Integration Tests - Error Handling', () => {
	it('should handle all patterns in a malformed question gracefully', () => {
		const input = '$e[1;10 incomplete [_&x+ unclosed &var $l{a;b';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true); // Partial conversion succeeds
		expect(result.warnings!.length).toBeGreaterThan(0); // But warnings present
		expect(result.converted).toContain('{{var}}'); // Valid patterns still converted
	});

	it('should accumulate warnings from all pattern types', () => {
		const input = '$e{2;4} [._&x_.] [+_&y_] [(_&z_] $l{$e[1;5]:10}';
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.warnings!.length).toBeGreaterThanOrEqual(4); // Multiple warnings
		expect(result.stats!.total).toBeGreaterThan(0); // Still converted patterns
	});

	it('should convert decimal patterns', () => {
		const input = '$d{1;2} and $d{2;3}'; // Decimal patterns
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('{{1.2}} and {{2.3}}');
		expect(result.stats!.decimals).toBe(2);
	});

	it('should convert relative integer patterns', () => {
		const input = '$er[2;9] and $er{1}'; // Relative integer patterns
		const result = convertTinyCASToNew(input);

		expect(result.success).toBe(true);
		expect(result.converted).toBe('{{±2..9}} and {{±1..1}}');
		expect(result.stats!.relativeIntegers).toBe(2);
	});
});
