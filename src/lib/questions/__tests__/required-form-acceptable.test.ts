/**
 * Forme exigée : un second motif « acceptable » (demi-point)
 * =========================================================
 *
 * « Factorise z² − 14z + 49 » (#553, décision de David) : `(z−7)²` et `(7−z)²` sont justes
 * (carré d'une différence) ; `(z−7)(z−7)` est factorisé mais pas sous forme de carré →
 * PERFECTIBLE ; la recopie `z²−14z+49` reste refusée. La valeur est vérifiée avant la
 * forme : `(z+7)²` est faux.
 */

import { describe, it, expect } from 'vitest';
import { requiredFormVerdict } from '../required-form-validator';
import { validateAnswer } from '$lib/utils/answer-validator';
import { generateInstance } from '../generator/instance-generator';
import { requiredFormSchema, questionTemplateSchema } from '../template-schema';
import { acceptableOf, customRequiredForm } from '../form-options';
import type { QuestionInstance, QuestionTemplate } from '../types';

const SQUARE = { pattern: '(u-v)^2', acceptable: 'u*v' };

describe('requiredFormVerdict', () => {
	it.each([
		['(z-7)^2', 'ok'],
		['(7-z)^2', 'ok'],
		['(-7+z)^2', 'ok'],
		['(z-7)(z-7)', 'acceptable'],
		['z^2-14z+49', 'violated']
	])('%s → %s', (answer, verdict) => {
		expect(requiredFormVerdict(answer, SQUARE)).toBe(verdict);
	});

	it('sans motif acceptable : tout ce qui ne respecte pas le motif est refusé', () => {
		expect(requiredFormVerdict('(z-7)(z-7)', { pattern: '(u-v)^2' })).toBe('violated');
	});

	it('forme nommée (product, sum…) : inchangée', () => {
		expect(requiredFormVerdict('2\\times 3', 'product')).toBe('ok');
		expect(requiredFormVerdict('6', 'product')).toBe('violated');
	});
});

describe('correcteur : une case à motif acceptable', () => {
	const instance = {
		blanks: [{ expectedAnswer: '(z-7)^2', type: 'math', requiredForm: SQUARE }],
		statement: '$$?$$',
		options: {}
	} as unknown as QuestionInstance;
	const validate = (answer: string) => validateAnswer([answer], instance, [answer]);

	it.each(['(z-7)^2', '(7-z)^2'])('%s : juste', (answer) => {
		expect(validate(answer).status).toBe('correct');
	});

	it('(z-7)(z-7) : perfectible, violation « form » en avertissement', () => {
		const result = validate('(z-7)(z-7)');
		expect(result.status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(true);
		expect(result.constraintViolations).toEqual([
			expect.objectContaining({ constraint: 'form', severity: 'warning' })
		]);
	});

	it('z^2-14z+49 (recopie) : refusée', () => {
		expect(validate('z^2-14z+49').status).toBe('bad_form');
	});

	it('(z+7)^2 : faux (la valeur passe avant la forme)', () => {
		const result = validate('(z+7)^2');
		expect(result.isCorrect).toBe(false);
		expect(result.status).not.toBe('bad_form');
	});
});

describe('correcteur : plusieurs cases, dont une à motif acceptable', () => {
	const instance = {
		blanks: [
			{ expectedAnswer: '(z-7)^2', type: 'math', requiredForm: SQUARE },
			{
				expectedAnswer: '(x+2)^2',
				type: 'math',
				requiredForm: { pattern: '(u+v)^2', acceptable: 'u*v' }
			}
		],
		statement: '$$?$$ et $$?$$',
		multipleAnswers: true,
		options: {}
	} as unknown as QuestionInstance;
	const validate = (answers: string[]) => validateAnswer(answers, instance, answers);

	it('les deux carrés : juste', () => {
		expect(validate(['(7-z)^2', '(x+2)^2']).status).toBe('correct');
	});

	it('un produit : perfectible', () => {
		const result = validate(['(z-7)(z-7)', '(x+2)^2']);
		expect(result.status).toBe('unoptimal_form');
		expect(result.constraintViolations?.map((v) => v.constraint)).toContain('form');
	});
});

describe('générateur : variables tirées dans les deux motifs', () => {
	it('{{a}} remplacé dans pattern ET acceptable', () => {
		const template = {
			id: 't',
			title: 'Factoriser',
			status: 'draft',
			variations: [
				{
					statement: 'Factorise : $?$',
					variables: [{ name: 'a', expression: '7' }],
					blanks: [
						{
							expectedAnswer: '(z-{{a}})^2',
							requiredForm: { pattern: '(u-{{a}})^2', acceptable: '(u-{{a}})*(u-{{a}})' }
						}
					]
				}
			],
			grades: ['2'],
			theme: 'Calcul littéral',
			domain: 'Transformation',
			level: 1
		} as unknown as QuestionTemplate;
		const generated = generateInstance(template, 1);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		expect(generated.instance.blanks?.[0].requiredForm).toEqual({
			pattern: '(u-7)^2',
			acceptable: '(u-7)*(u-7)'
		});
	});
});

describe('schémas Zod', () => {
	it('requiredFormSchema accepte « acceptable »', () => {
		expect(requiredFormSchema.parse(SQUARE)).toEqual(SQUARE);
	});

	it('schéma strict d’un template : « acceptable » n’est pas une clé inconnue', () => {
		const template = {
			title: 'Factoriser',
			status: 'draft',
			variations: [
				{
					statement: 'Factorise : $?$',
					blanks: [{ expectedAnswer: '(z-7)^2', requiredForm: SQUARE }]
				}
			],
			grades: ['2'],
			theme: 'Calcul littéral',
			domain: 'Transformation',
			level: 1
		};
		const parsed = questionTemplateSchema.safeParse(template);
		expect(parsed.success ? 'ok' : parsed.error.issues.map((i) => i.message).join(' ; ')).toBe(
			'ok'
		);
	});
});

describe('éditeur : le motif acceptable survit à l’aller-retour', () => {
	it('lu puis réécrit à l’identique', () => {
		expect(acceptableOf(SQUARE)).toBe('u*v');
		expect(customRequiredForm(SQUARE.pattern, acceptableOf(SQUARE))).toEqual(SQUARE);
	});

	it('champ vide : pas de clé acceptable', () => {
		expect(customRequiredForm(' (u-v)^2 ', '  ')).toEqual({ pattern: '(u-v)^2' });
		expect(acceptableOf('product')).toBe('');
		expect(acceptableOf(undefined)).toBe('');
	});
});
