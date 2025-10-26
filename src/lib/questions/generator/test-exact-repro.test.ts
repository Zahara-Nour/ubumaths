import { describe, it, expect } from 'vitest';
import { generateInstance } from './src/lib/questions/generator/instance-generator';
import type { QuestionTemplate, ResolvedVariable } from './src/lib/questions/types';

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
			variations: [
				{
					statement: [{ type: 'text', content: 'Calculate {{a}} + {{b}}' }],
					variables: [
						{ name: 'a', expression: '{{1-10}}' },
						{ name: 'b', expression: '{{1-10}}' }
					],
					answer: '{{eval:{{a}} + {{b}}}}'
				}
			],
			precision: { type: 'none' },
			grades: ['6'],
			theme: 'Arithmétique',
			domain: 'Addition',
			level: 1,
			created_at: new Date(),
			updated_at: new Date(),
			created_by: 'test-user'
		};

		const result = generateInstance(template);

		console.log('Result:', {
			success: result.success,
			answer: result.instance?.answer,
			answerType: typeof result.instance?.answer,
			answerString: String(result.instance?.answer),
			variables: result.instance?.resolvedVariables
		});

		expect(result.success).toBe(true);
		expect(result.instance).toBeDefined();
		expect(result.instance!.type).toBe('numerical_exact');

		// Check variables exist in array
		const a = getVarValue(result.instance!.resolvedVariables, 'a');
		const b = getVarValue(result.instance!.resolvedVariables, 'b');
		expect(a).not.toBeNaN();
		expect(b).not.toBeNaN();
		expect(result.instance!.answer).toBe((a + b).toString());
	});
});
