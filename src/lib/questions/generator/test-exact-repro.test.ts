import { describe, it, expect } from 'vitest';
import { generateInstance } from './instance-generator';
import type { QuestionTemplate, ResolvedVariable } from '../types';
import { templateMarkdown } from '$lib/custom-markdown';

function getVarValue(resolvedVariables: ResolvedVariable[] | undefined, varName: string): number {
	if (!resolvedVariables) return NaN;
	const variable = resolvedVariables.find((v) => v.name === varName);
	return variable ? parseFloat(variable.value) : NaN;
}

describe('Exact reproduction', () => {
	it('should generate simple numerical question instance', () => {
		const template: QuestionTemplate = {
			id: 'test-1',
			type: 'numerical_exact',
			title: 'Simple Addition Test',
			status: 'published',
			variations: [
				{
					statement: templateMarkdown('Calculate {{a}} + {{b}}'),
					variables: [
						{ name: 'a', expression: '{{random:1..10}}' },
						{ name: 'b', expression: '{{random:1..10}}' }
					],
					solution: '{{eval:a + b}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		console.log('Result:', {
			success: result.success,
			solution: result.success ? result.instance.solution : undefined,
			solutionType: result.success ? typeof result.instance.solution : undefined,
			solutionString: result.success ? String(result.instance.solution) : undefined,
			variables: result.success ? result.instance.resolvedVariables : undefined
		});

		expect(result.success).toBe(true);
		if (!result.success) {
			throw new Error('Generation failed');
		}

		expect(result.instance).toBeDefined();
		expect(result.instance.type).toBe('numerical_exact');

		// Check variables exist in array
		const a = getVarValue(result.instance.resolvedVariables, 'a');
		const b = getVarValue(result.instance.resolvedVariables, 'b');
		expect(a).not.toBeNaN();
		expect(b).not.toBeNaN();
		expect(result.instance.solution).toBe((a + b).toString());
	});
});
