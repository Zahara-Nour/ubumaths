/**
 * Test Instance Builder Tests
 * ===========================
 *
 * Tests for generating instances with fixed (deterministic) variables.
 */

import { describe, it, expect } from 'vitest';
import { generateInstanceWithFixedVariables, getRootVariableNames } from '../test-instance-builder';
import type { QuestionTemplate, QuestionVariation, QuestionVariable } from '../../types';
import { templateMarkdown } from '$lib/ubumark';

function makeTemplate(
	variation: QuestionVariation,
	overrides?: Partial<QuestionTemplate>
): QuestionTemplate {
	return {
		id: 'test-fixed',
		title: 'Test Fixed Vars',
		status: 'draft',
		variations: [variation],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...overrides
	};
}

describe('generateInstanceWithFixedVariables', () => {
	it('should generate a fill-in-blanks instance with fixed variables', () => {
		const template = makeTemplate({
			statement: templateMarkdown('Calculer ${{a}} + {{b}} = ?$'),
			variables: [
				{ name: 'a', expression: '{{random:1..10}}' },
				{ name: 'b', expression: '{{random:1..10}}' }
			],
			blanks: [{ expectedAnswer: '{{eval:{{a}}+{{b}}}}' }]
		});

		const result = generateInstanceWithFixedVariables(template, { a: '3', b: '7' });
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toContain('3');
		expect(result.instance.statement).toContain('7');
		expect(result.instance.blanks?.[0]?.expectedAnswer).toBe('10');
	});

	it('should generate a QCM instance with fixed variables', () => {
		const template = makeTemplate({
			statement: templateMarkdown('$2 \\times 3$ vaut ?'),
			correctChoiceIndex: '1',
			choices: [
				{ content: '5', isCorrect: false },
				{ content: '6', isCorrect: true },
				{ content: '7', isCorrect: false }
			]
		});

		const result = generateInstanceWithFixedVariables(template, {});
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.choices).toBeDefined();
		expect(result.instance.choices![1].isCorrect).toBe(true);
	});

	it('should return error for out-of-range variation index', () => {
		const template = makeTemplate({
			statement: templateMarkdown('Test'),
			blanks: [{ expectedAnswer: '1' }]
		});

		const result = generateInstanceWithFixedVariables(template, {}, 5);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors[0]).toContain('out of range');
	});

	it('should compute derived variables automatically from fixed root variables', () => {
		const template = makeTemplate({
			statement: templateMarkdown('${{a}} + {{b}} = ?$'),
			variables: [
				{ name: 'a', expression: '{{random:1..10}}' },
				{ name: 'b', expression: '{{random:1..10}}' },
				{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }
			],
			blanks: [{ expectedAnswer: '{{sum}}' }]
		});

		// Only fix root (random) variables — sum is derived
		const result = generateInstanceWithFixedVariables(template, { a: '3', b: '7' });
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks?.[0]?.expectedAnswer).toBe('10');
	});

	it('should work with shared variables', () => {
		const template: QuestionTemplate = {
			id: 'test-shared',
			title: 'Test Shared',
			status: 'draft',
			shared: {
				variables: [{ name: 'a', expression: '{{random:1..10}}' }]
			},
			variations: [
				{
					statement: templateMarkdown('${{a}} + {{b}} = ?$'),
					variables: [{ name: 'b', expression: '{{random:1..10}}' }],
					blanks: [{ expectedAnswer: '{{eval:{{a}}+{{b}}}}' }]
				}
			],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		};

		const result = generateInstanceWithFixedVariables(template, { a: '5', b: '3' });
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks?.[0]?.expectedAnswer).toBe('8');
	});

	it('should select the correct variation by index', () => {
		const template: QuestionTemplate = {
			id: 'test-multi-var',
			title: 'Test Multi Variation',
			status: 'draft',
			variations: [
				{
					statement: templateMarkdown('Variation 0: ${{a}} = ?$'),
					variables: [{ name: 'a', expression: '{{random:1..10}}' }],
					blanks: [{ expectedAnswer: '{{a}}' }]
				},
				{
					statement: templateMarkdown('Variation 1: ${{a}} = ?$'),
					variables: [{ name: 'a', expression: '{{random:1..10}}' }],
					blanks: [{ expectedAnswer: '{{a}}' }]
				}
			],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		};

		const result = generateInstanceWithFixedVariables(template, { a: '7' }, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.statement).toContain('Variation 1');
		expect(result.instance.selectedVariationIndex).toBe(1);
	});
});

describe('getRootVariableNames', () => {
	it('should identify variables with no dependencies as root', () => {
		const vars: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..10}}' },
			{ name: 'b', expression: '{{random:1..10}}' },
			{ name: 'sum', expression: '{{eval:{{a}}+{{b}}}}' }
		];
		const roots = getRootVariableNames(vars);
		expect(roots).toEqual(new Set(['a', 'b']));
	});

	it('should identify all as root when no dependencies exist', () => {
		const vars: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..10}}' },
			{ name: 'b', expression: '{{random:5..20}}' }
		];
		const roots = getRootVariableNames(vars);
		expect(roots).toEqual(new Set(['a', 'b']));
	});

	it('should handle chain dependencies', () => {
		const vars: QuestionVariable[] = [
			{ name: 'a', expression: '{{random:1..5}}' },
			{ name: 'b', expression: '{{eval:{{a}}+10}}' },
			{ name: 'c', expression: '{{eval:{{b}}*2}}' }
		];
		const roots = getRootVariableNames(vars);
		expect(roots).toEqual(new Set(['a']));
	});

	it('should handle random with variable bounds as non-root', () => {
		const vars: QuestionVariable[] = [
			{ name: 'max', expression: '{{random:5..10}}' },
			{ name: 'a', expression: '{{random:1..{{max}}}}' }
		];
		const roots = getRootVariableNames(vars);
		expect(roots).toEqual(new Set(['max']));
	});

	it('should return empty set for empty input', () => {
		const roots = getRootVariableNames([]);
		expect(roots).toEqual(new Set());
	});

	it('should handle literal values as root', () => {
		const vars: QuestionVariable[] = [
			{ name: 'a', expression: '42' },
			{ name: 'b', expression: '{{eval:{{a}}*2}}' }
		];
		const roots = getRootVariableNames(vars);
		expect(roots).toEqual(new Set(['a']));
	});

	it('should handle simplified format via normalizeExpression (variable-ref)', () => {
		// Simplified format: "a" normalizes to "{{a}}", detected as dependency
		const vars: QuestionVariable[] = [
			{ name: 'a', expression: '0..9' },
			{ name: 'b', expression: 'a' } // variable-ref to a
		];
		const roots = getRootVariableNames(vars);
		expect(roots).toEqual(new Set(['a']));
	});

	it('should handle legacy bare expressions via regex fallback', () => {
		// Legacy migration format: "(a*1000) + (b*100) + c" is text-literal,
		// but regex fallback detects a, b, c as dependencies
		const vars: QuestionVariable[] = [
			{ name: 'a', expression: '0..9' },
			{ name: 'b', expression: '0..9' },
			{ name: 'c', expression: '0..9' },
			{ name: 'd', expression: '0..9' },
			{ name: 'expression', expression: '(a*1000) + (b*100) + (c*10) + d' }
		];
		const roots = getRootVariableNames(vars);
		expect(roots).toEqual(new Set(['a', 'b', 'c', 'd']));
	});
});
