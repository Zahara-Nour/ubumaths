/**
 * Réponse attendue écrite `p/q` → `\dfrac{p}{q}`
 * ==============================================
 *
 * Le correcteur lit la réponse attendue en LaTeX : `{{a}}/{{b}}` y est une division
 * « en ligne », et la saisie MathLive `\frac{5}{3}` de l'élève était refusée pour
 * mauvaise forme (#347, #349-#351, #382, #398, #399 du lot Fractions).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { slashFractionsToLatex } from '../answer-latex';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstanceWithFixedVariables } from '$lib/questions/generator/test-instance-builder';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

describe('slashFractionsToLatex', () => {
	it.each([
		['{{a}}/{{b}}', '\\dfrac{{{a}}}{{{b}}}'],
		['{{a}}+{{b}}/10+{{c}}/100', '{{a}} + \\dfrac{{{b}}}{10} + \\dfrac{{{c}}}{100}'],
		['{{{eval:a+b}}}/10', '\\dfrac{{{eval:a+b}}}{10}'],
		['1/{{{a}}^{{b}}}', '\\dfrac{1}{{{a}}^{{{b}}}}'],
		['-3/2', '-\\dfrac{3}{2}'],
		['1/{2sqrt(x)}', '\\dfrac{1}{2 \\sqrt{x}}']
	])('%s → %s', (answer, expected) => {
		expect(slashFractionsToLatex(answer)).toBe(expected);
	});

	it.each([
		['{{eval:{a-b}/a}}', 'barre dans un calcul'],
		['{{eval:{{expression1}}}}', 'sans barre'],
		['2x+3', 'sans barre'],
		['pair', 'texte'],
		['{{a}}/{{b}} de la tarte', 'réponse en mots'],
		['{{a}}/{{b}} cm', 'unité']
	])('%s inchangé (%s)', (answer) => {
		expect(slashFractionsToLatex(answer)).toBe(answer);
	});
});

describe('réponse de l’élève acceptée', () => {
	it('#347 : 3 × ? = 5 attend \\frac{5}{3}, la saisie MathLive est juste', () => {
		const template = { ...transformQuestion(questions[347], 347).template!, id: 't' };
		const generated = generateInstanceWithFixedVariables(
			template as QuestionTemplate,
			{ a: '5', b: '3' },
			0
		);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		const result = validateAnswer(['\\frac{5}{3}'], generated.instance, ['\\frac{5}{3}']);
		expect(result.status).toBe('correct');
	});
});
