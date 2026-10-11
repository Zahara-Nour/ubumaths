/**
 * Règles de validation dont les bornes sont écrites `{{eval:…}}` (ou `{{a+1}}`)
 * dans le modèle : elles doivent valoir comme une variable intermédiaire.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionTemplate, ValidationRule } from '../types';
import { templateMarkdown } from '$lib/ubumark';

function template(rules: ValidationRule[]): QuestionTemplate {
	return {
		id: 'test-bornes-eval',
		title: 'Bornes calculées',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Payer ${{S}}$ € : $?$'),
				variables: [
					{ name: 'p1', expression: '3' },
					{ name: 'p2', expression: '5' },
					{ name: 'S', expression: '31' }
				],
				blanks: [{ expectedAnswer: '2', rulesSuffice: true, validationRules: rules }]
			}
		],
		grades: ['T_EXP'],
		theme: 'Arithmétique',
		domain: 'Diophantiennes',
		level: 3
	};
}

function check(rules: ValidationRule[], answer: string) {
	const result = generateInstance(template(rules), 1);
	if (!result.success) throw new Error('génération');
	return validateAnswer([answer], result.instance, [answer]);
}

const CUSTOM: ValidationRule = {
	type: 'custom',
	expression: '({{S}}-{{p1}}*answer) % {{p2}} == 0'
};

describe('règles — bornes {{eval:…}}', () => {
	it('range max = {{eval:floor(S/p1)}} : 7 juste, 12 faux', () => {
		const rules: ValidationRule[] = [
			CUSTOM,
			{ type: 'range', min: '0', max: '{{eval:floor(S/p1)}}', inclusive: true }
		];
		expect(check(rules, '7').isCorrect).toBe(true);
		expect(check(rules, '2').isCorrect).toBe(true);
		expect(check(rules, '12').isCorrect).toBe(false);
	});

	it('range max = {{eval:S/p1}} (non entier, 31/3) : 7 juste, 12 faux', () => {
		const rules: ValidationRule[] = [
			CUSTOM,
			{ type: 'range', min: '0', max: '{{eval:S/p1}}', inclusive: true }
		];
		expect(check(rules, '7').isCorrect).toBe(true);
		expect(check(rules, '12').isCorrect).toBe(false);
	});

	it('range min = {{eval:p1-3}}, max = {{eval:2*p2}} : 7 juste', () => {
		const rules: ValidationRule[] = [
			CUSTOM,
			{ type: 'range', min: '{{eval:p1-3}}', max: '{{eval:2*p2}}', inclusive: true }
		];
		expect(check(rules, '7').isCorrect).toBe(true);
		expect(check(rules, '12').isCorrect).toBe(false);
	});

	it('custom avec {{eval:…}} : multiple de p2 calculé', () => {
		const rules: ValidationRule[] = [
			{ type: 'custom', expression: '({{eval:S-p1*0}}-{{p1}}*answer) % {{eval:p2}} == 0' }
		];
		expect(check(rules, '7').isCorrect).toBe(true);
		expect(check(rules, '3').isCorrect).toBe(false);
	});

	it('divisor de {{eval:2*S}} : 31 juste, 5 faux', () => {
		const rules: ValidationRule[] = [{ type: 'divisor', dividend: '{{eval:2*S}}' }];
		expect(check(rules, '31').isCorrect).toBe(true);
		expect(check(rules, '5').isCorrect).toBe(false);
	});
});
