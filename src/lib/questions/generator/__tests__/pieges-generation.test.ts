/**
 * Pièges de la génération : constantes nues en réponse attendue.
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateAnswer } from '$lib/utils/answer-validator';

function makeTemplate(variation: Partial<QuestionVariation>): QuestionTemplate {
	return {
		id: 'pieges',
		title: 'Pièges',
		status: 'draft',
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		variations: [{ statement: templateMarkdown('$?$'), ...variation }]
	};
}

function generate(variation: Partial<QuestionVariation>, seed = 0) {
	const result = generateInstance(makeTemplate(variation), seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function value(instance: ReturnType<typeof generate>, name: string): string | undefined {
	return instance.resolvedVariables?.find((v) => v.name === name)?.value;
}

describe('réponse attendue réduite à une constante (A)', () => {
	it.each(['e', 'i', '\\pi'])('« %s » reste tel quel et la réponse est jugée juste', (constant) => {
		const instance = generate({ blanks: [{ expectedAnswer: constant }] });
		expect(instance.blanks?.[0].expectedAnswer).toBe(constant);
		expect(validateAnswer([constant], instance).isCorrect).toBe(true);
	});

	it('un nom nu de variable déclarée est toujours remplacé', () => {
		const instance = generate({
			variables: [{ name: 'k', expression: '7' }],
			blanks: [{ expectedAnswer: 'k' }]
		});
		expect(instance.blanks?.[0].expectedAnswer).toBe('7');
	});

	it('a^b*a^c, avec a, b et c déclarées, est toujours substitué', () => {
		const instance = generate({
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'c', expression: '4' },
				{ name: 'p', expression: 'a^b*a^c' }
			],
			blanks: [{ expectedAnswer: '{{p}}' }]
		});
		expect(value(instance, 'p')).toBe('2^3*2^4');
	});
});
