/**
 * Pièges de la génération : constantes nues en réponse attendue, noms de variables
 * alphanumériques dans les conditions.
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

/** Énoncé sans espaces : la mise en forme LaTeX en ajoute autour des signes */
function compact(instance: ReturnType<typeof generate>): string {
	return String(instance.statement).replace(/\s+/g, '');
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

describe('nom de variable contenant un chiffre (B)', () => {
	it.each(['u1', 'q2'])('%s est reconnue dans une condition', (name) => {
		for (let seed = 0; seed < 10; seed++) {
			const instance = generate(
				{
					variables: [{ name, expression: '2..5' }],
					conditions: [`${name} != 4`],
					blanks: [{ expectedAnswer: `{{${name}}}` }]
				},
				seed
			);
			expect(value(instance, name)).not.toBe('4');
		}
	});

	it('u1 dans l’énoncé et dans {{eval:u1+1}}', () => {
		const instance = generate({
			variables: [{ name: 'u1', expression: '2..5' }],
			conditions: ['u1 != 4'],
			statement: templateMarkdown('$u_1={{u1}}$, $u_1+1={{eval:u1+1}}$ et $?$'),
			blanks: [{ expectedAnswer: '1' }]
		});
		const u1 = Number(value(instance, 'u1'));
		expect(compact(instance)).toContain(`$u_1=${u1}$,$u_1+1=${u1 + 1}$`);
	});

	it('une condition sur un produit implicite de lettres déclarées reste un produit', () => {
		for (let seed = 0; seed < 10; seed++) {
			const instance = generate(
				{
					variables: [
						{ name: 'a', expression: '1..3' },
						{ name: 'b', expression: '1..3' }
					],
					conditions: ['ab != 4'],
					blanks: [{ expectedAnswer: '1' }]
				},
				seed
			);
			expect(Number(value(instance, 'a')) * Number(value(instance, 'b'))).not.toBe(4);
		}
	});
});
