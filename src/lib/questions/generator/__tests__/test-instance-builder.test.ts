/**
 * Test Instance Builder Tests
 * ===========================
 *
 * Tests for generating instances with fixed (deterministic) variables.
 */

import { describe, it, expect } from 'vitest';
import { generateInstanceWithFixedVariables, isRandomExpression } from '../test-instance-builder';
import type { QuestionTemplate, QuestionVariation } from '../../types';
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

describe('isRandomExpression', () => {
	it('should detect {{random:...}} expressions', () => {
		expect(isRandomExpression('{{random:1..10}}')).toBe(true);
		expect(isRandomExpression('{{random:rouge|vert|bleu}}')).toBe(true);
	});

	it('should detect shorthand range expressions', () => {
		expect(isRandomExpression('{{1..10}}')).toBe(true);
		expect(isRandomExpression('{{-5..5}}')).toBe(true);
	});

	it('should detect shorthand choice expressions', () => {
		expect(isRandomExpression('{{a|b|c}}')).toBe(true);
	});

	it('should detect digits expressions', () => {
		expect(isRandomExpression('{{digits:3}}')).toBe(true);
	});

	it('should NOT flag eval expressions as random', () => {
		expect(isRandomExpression('{{eval:{{a}}+{{b}}}}')).toBe(false);
	});

	it('should NOT flag variable references as random', () => {
		expect(isRandomExpression('{{a}}')).toBe(false);
		expect(isRandomExpression('{{eval:{{a}}*2}}')).toBe(false);
	});

	it('should NOT flag plain text as random', () => {
		expect(isRandomExpression('hello')).toBe(false);
		expect(isRandomExpression('42')).toBe(false);
	});

	it('should NOT flag LaTeX with triple braces as random', () => {
		expect(isRandomExpression('\\frac{{{a}}}{2}')).toBe(false);
	});
});
