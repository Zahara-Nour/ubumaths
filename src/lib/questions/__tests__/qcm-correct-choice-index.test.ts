/**
 * QCM « dynamique » : la bonne réponse désignée par `correctChoiceIndex`
 * ======================================================================
 *
 * Les types prévoient que `isCorrect` soit absent des choix quand la bonne
 * réponse dépend des variables (`types.ts`, `choices[].isCorrect`) : c'est
 * `correctChoiceIndex` qui la désigne. `validateTemplate` exigeait pourtant un
 * `isCorrect` → 14 QCM TinyMath ne généraient pas (#314…).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateTemplate } from '../validators/template-validator';
import { generateInstance } from '../generator/instance-generator';
import { validateAnswer } from '$lib/utils/answer-validator';
import { transformQuestion } from '$lib/migration/question-transformer';
import type { QuestionWithMigration } from '$lib/migration/old-question-types';
import type { QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

function qcm(overrides: Partial<QuestionTemplate['variations'][number]> = {}): QuestionTemplate {
	return {
		id: 't',
		title: 'QCM',
		status: 'draft',
		grades: ['5'],
		theme: 'Relatifs',
		domain: 'Comparer',
		level: 1,
		variations: [
			{
				statement: templateMarkdown('Le plus petit ?'),
				choices: [{ content: templateMarkdown('$2$') }, { content: templateMarkdown('$-3$') }],
				correctChoiceIndex: '1',
				...overrides
			}
		]
	};
}

describe('validateTemplate — QCM', () => {
	it('accepte une bonne réponse désignée par correctChoiceIndex', () => {
		expect(validateTemplate(qcm())).toEqual([]);
	});

	it('accepte correctChoiceIndex partagé', () => {
		const template = qcm({ correctChoiceIndex: undefined });
		template.shared = { correctChoiceIndex: '1' };
		expect(validateTemplate(template)).toEqual([]);
	});

	it('refuse toujours un QCM sans aucune bonne réponse', () => {
		expect(validateTemplate(qcm({ correctChoiceIndex: undefined })).join()).toMatch(
			/correctChoiceIndex|correct choice/
		);
	});
});

describe('#314 « Quel est le plus petit de ces 2 nombres ? » (TinyMath)', () => {
	it('génère, et seul le plus petit nombre est juste', () => {
		const questions = JSON.parse(
			readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
		) as QuestionWithMigration[];
		const result = transformQuestion(questions[314], 314);
		const template = { ...result.template!, id: 't' } as QuestionTemplate;
		for (let seed = 1; seed <= 15; seed++) {
			const generated = generateInstance(template, seed);
			expect(generated.success, JSON.stringify(generated)).toBe(true);
			if (!generated.success) continue;
			const values = generated.instance.choices!.map((choice) =>
				Number(String(choice.content).replace(/[$\s]/g, ''))
			);
			const smallest = values.indexOf(Math.min(...values));
			expect(validateAnswer([smallest], generated.instance).isCorrect).toBe(true);
			expect(validateAnswer([1 - smallest], generated.instance).isCorrect).toBe(false);
		}
	});
});
