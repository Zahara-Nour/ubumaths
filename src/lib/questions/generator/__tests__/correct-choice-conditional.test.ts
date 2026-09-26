/**
 * QCM : bon choix donné par une condition, `{{if:condition|A|B}}`
 * ===============================================================
 *
 * TinyMath désignait le bon choix par un ternaire (`(&1)*(&2) >0 ?? 0 :: 1`,
 * `mod(&1;2)=0 ?? 0 :: 1` : 17 formes, dont #336-#344). Le transformateur le
 * convertit en `{{if:…|0|1}}`, que le générateur ne résolvait pas (il rendait
 * « 1 » ou le texte brut « if:… ») : aucun choix n'était juste.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate } from '../../types';
import { templateMarkdown } from '$lib/ubumark';
import { transformQuestion } from '$lib/migration/question-transformer';
import type { QuestionWithMigration } from '$lib/migration/old-question-types';
import { validateAnswer } from '$lib/utils/answer-validator';

function signQcm(correctChoiceIndex: string): QuestionTemplate {
	return {
		id: 't',
		title: 'Signe',
		status: 'draft',
		grades: ['4'],
		theme: 'Relatifs',
		domain: 'Produit',
		level: 1,
		variations: [
			{
				statement: templateMarkdown('Signe de $${{a}} \\times {{b}}$$ ?'),
				variables: [
					{ name: 'a', expression: '2..9;±' },
					{ name: 'b', expression: '2..9;±' }
				],
				choices: [
					{ content: templateMarkdown('positif') },
					{ content: templateMarkdown('négatif') }
				],
				correctChoiceIndex: [correctChoiceIndex]
			}
		]
	};
}

describe('correctChoiceIndex conditionnel', () => {
	it.each(['{{if:(a)*(b) >0|0|1}}', '{{if:a*b>0|0|1}}'])('%s : bon choix sur 30 tirages', (cci) => {
		for (let seed = 1; seed <= 30; seed++) {
			const generated = generateInstance(signQcm(cci), seed);
			expect(generated.success).toBe(true);
			if (!generated.success) continue;
			const [a, b] = generated.instance.resolvedVariables!.map((v) => Number(v.value));
			expect(generated.instance.correctChoiceIndex).toEqual([a * b > 0 ? '0' : '1']);
		}
	});

	it('condition TinyMath à un seul « = » (mod(a,2)=0)', () => {
		const template = signQcm('{{if:mod(a,2)=0|0|1}}');
		for (let seed = 1; seed <= 20; seed++) {
			const generated = generateInstance(template, seed);
			if (!generated.success) throw new Error(generated.errors.join());
			const a = Number(generated.instance.resolvedVariables![0].value);
			expect(generated.instance.correctChoiceIndex).toEqual([a % 2 === 0 ? '0' : '1']);
		}
	});
});

describe('condition illisible', () => {
	it('fait échouer la génération au lieu de désigner en silence le choix B', () => {
		const generated = generateInstance(signQcm('{{if:inconnue>0|0|1}}'), 1);
		expect(generated.success).toBe(false);
	});
});

describe('#336 « Quel est le signe de ce produit ? » (TinyMath), de bout en bout', () => {
	it('seul le bon signe est juste', () => {
		const questions = JSON.parse(
			readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
		) as QuestionWithMigration[];
		const template = {
			...transformQuestion(questions[336], 336).template!,
			id: 't'
		} as QuestionTemplate;
		for (let seed = 1; seed <= 20; seed++) {
			const generated = generateInstance(template, seed);
			if (!generated.success) throw new Error(generated.errors.join());
			const [a, b] = generated.instance.resolvedVariables!.map((v) => Number(v.value));
			const right = a * b > 0 ? 0 : 1;
			expect(validateAnswer([right], generated.instance).isCorrect).toBe(true);
			expect(validateAnswer([1 - right], generated.instance).isCorrect).toBe(false);
		}
	});
});
