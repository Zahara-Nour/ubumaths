/**
 * `{{expression}}` dans la correction d'une variation autre que la première
 * ========================================================================
 *
 * Le transformateur nomme la variable d'expression selon la variation
 * (`expression2`, `expression3`…). Le résolveur ne cherchait que `expression`
 * puis `expression1` : la correction des variations suivantes affichait un
 * trou (#325 : « le résultat de  est du signe… »).
 */

import { describe, it, expect } from 'vitest';
import { generateInstanceWithFixedVariables } from '../test-instance-builder';
import type { QuestionTemplate } from '../../types';
import { templateMarkdown } from '$lib/ubumark';

describe('{{expression}} en correction', () => {
	it('trouve expression2 dans la 2e variation', () => {
		const template: QuestionTemplate = {
			id: 't',
			title: 't',
			status: 'draft',
			grades: ['5'],
			theme: 'T',
			domain: 'D',
			level: 1,
			variations: [
				{
					statement: templateMarkdown('$${{expression1}}$$'),
					variables: [
						{ name: 'a', expression: '3' },
						{ name: 'expression1', expression: 'a+1' }
					],
					blanks: [{ expectedAnswer: '{{eval:{{expression1}}}}' }],
					correction: { steps: [templateMarkdown('Le résultat de $${{expression}}$$ est 4.')] }
				},
				{
					statement: templateMarkdown('$${{expression2}}$$'),
					variables: [
						{ name: 'a', expression: '3' },
						{ name: 'expression2', expression: 'a+2' }
					],
					blanks: [{ expectedAnswer: '{{eval:{{expression2}}}}' }],
					correction: { steps: [templateMarkdown('Le résultat de $${{expression}}$$ est 5.')] }
				}
			]
		};
		const generated = generateInstanceWithFixedVariables(template, { a: '3' }, 1);
		expect(generated.success).toBe(true);
		if (!generated.success) return;
		const step = String(generated.instance.correction?.steps?.[0] ?? '');
		expect(step.replace(/\s/g, '')).toContain('3+2');
	});
});
