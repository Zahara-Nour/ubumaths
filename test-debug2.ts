import { generateInstance } from './src/lib/questions/generator/instance-generator';
import type { QuestionTemplate } from './src/lib/questions/types';

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

const result = generateInstance(template, 12345);

console.log('Success:', result.success);
if (result.instance) {
	console.log('Variables:', result.instance.resolvedVariables);
	console.log('Answer:', result.instance.answer);
	console.log('Answer type:', typeof result.instance.answer);
	console.log('Answer length:', result.instance.answer?.toString().length);
}
