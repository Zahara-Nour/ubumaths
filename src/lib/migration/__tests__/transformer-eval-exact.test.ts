/**
 * Calcul exact par défaut, décimal marqué — comme TinyMath
 * ========================================================
 *
 * TinyMath calculait en exact (`[_…_]` → 9/7) et en décimal sur demande :
 * `[._…_]` dans une formule, `result-type: decimal` pour la réponse de la
 * question. `{{eval:…}}` est désormais exact ; ces deux marques deviennent `;d`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertTinyCASToNew } from '../syntax-converter';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstanceWithFixedVariables } from '$lib/questions/generator/test-instance-builder';
import type { QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

function expectedAnswer(index: number, variables: Record<string, string>): string | undefined {
	const template = { ...transformQuestion(questions[index], index).template!, id: 't' };
	const generated = generateInstanceWithFixedVariables(template as QuestionTemplate, variables, 0);
	if (!generated.success) throw new Error(generated.errors.join(' ; '));
	return generated.instance.blanks?.[0]?.expectedAnswer;
}

describe('conversion des marques de calcul', () => {
	it('[_…_] reste un calcul exact', () => {
		expect(convertTinyCASToNew('[_&1/&2_]').converted).toBe('{{eval:a/b}}');
	});

	it('[._…_] devient un calcul décimal `;d`', () => {
		expect(convertTinyCASToNew('[._&2/&1_]').converted).toBe('{{eval:b/a;d}}');
	});

	it('result-type decimal : la réponse calculée depuis l’expression est décimale', () => {
		// #352 « Forme décimale d'une fraction » : &1/10
		const template = transformQuestion(questions[352], 352).template!;
		const blanks = template.variations[0].blanks ?? template.shared?.blanks;
		expect(blanks?.[0].expectedAnswer).toBe('{{eval:{{expression1}};d}}');
	});

	it('sans result-type, la réponse calculée reste exacte', () => {
		// #383 « Additionner des fractions »
		const template = transformQuestion(questions[383], 383).template!;
		const blanks = template.variations[0].blanks ?? template.shared?.blanks;
		expect(blanks?.[0].expectedAnswer).toBe('{{eval:{{expression1}}}}');
	});
});

describe('réponses générées', () => {
	it('#352 : 7/10 attend 0.7', () => {
		expect(expectedAnswer(352, { a: '7' })).toBe('0.7');
	});

	it('#383 : 4/5 + 2/5 attend la fraction exacte 6/5', () => {
		expect(expectedAnswer(383, { a: '4', b: '2', c: '5' })).toBe('\\dfrac{6}{5}');
	});

	it('#368 : 90/70 attend la fraction irréductible 9/7', () => {
		expect(expectedAnswer(368, { a: '10', b: '10', c: '9', d: '7' })).toBe('\\dfrac{9}{7}');
	});

	it('#363 : [._b/a_] affiche le décimal 0.75 dans l’énoncé', () => {
		const template = { ...transformQuestion(questions[363], 363).template!, id: 't' };
		const generated = generateInstanceWithFixedVariables(
			template as QuestionTemplate,
			{ a: '4', b: '3' },
			0
		);
		expect(generated.success && generated.instance.statement).toContain('0.75');
	});
});
