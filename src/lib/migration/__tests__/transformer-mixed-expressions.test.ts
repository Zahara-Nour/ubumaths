/**
 * Expressions TinyMath mêlant texte et évaluation (`&1 + [_10-&1_]`)
 * =================================================================
 *
 * La conversion retirait les accolades de `{{eval:…}}` au milieu d'une
 * expression :
 * - `&1 + [_10-&1_]` → `a + eval:10-a` : « free variables: v, l » (~60 variations) ;
 * - `[_&1*10+&2_]-&3` → une seule évaluation : l'énoncé affichait le RÉSULTAT,
 *   donc la réponse (#100).
 * Une expression mixte garde la forme gabarit `{{a}} + {{eval:10-a}}`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

function instances(index: number, count = 20): QuestionInstance[] {
	const result = transformQuestion(questions[index], index);
	expect(result.success).toBe(true);
	const template = { ...result.template!, id: 't' } as QuestionTemplate;
	return Array.from({ length: count }, (_, i) => {
		const generated = generateInstance(template, i + 1);
		if (!generated.success) throw new Error(`#${index} : ${generated.errors.join('; ')}`);
		return generated.instance;
	});
}

function variable(instance: QuestionInstance, name: string): number {
	return Number(instance.resolvedVariables!.find((v) => v.name === name)!.value);
}

/** L'expression affichée (après le marqueur `<<expr:…>>`) */
function shownExpression(instance: QuestionInstance): string {
	return String(instance.statement).split('>>')[1]?.split('$$')[0].trim() ?? '';
}

describe('expressions mixtes TinyMath', () => {
	it('#34 `&1 + [_10-&1_]` : affiche « a + (10 − a) », attend 10', () => {
		for (const instance of instances(34)) {
			const a = variable(instance, 'a');
			expect(shownExpression(instance).replace(/\s/g, '')).toBe(`${a}+${10 - a}`);
			expect(validateAnswer(['10'], instance, ['10']).isCorrect).toBe(true);
		}
	});

	it('#100 `[_&1*10+&2_]-&3` : affiche la soustraction, pas son résultat', () => {
		for (const instance of instances(100)) {
			const [a, b, c] = ['a', 'b', 'c'].map((name) => variable(instance, name));
			expect(shownExpression(instance).replace(/\s/g, '')).toBe(`${a * 10 + b}-${c}`);
			const answer = String(a * 10 + b - c);
			expect(validateAnswer([answer], instance, [answer]).isCorrect).toBe(true);
		}
	});

	it('#37 `&1 + &2` (sans évaluation) : inchangé', () => {
		for (const instance of instances(37, 5)) {
			const [a, b] = ['a', 'b'].map((name) => variable(instance, name));
			expect(shownExpression(instance).replace(/\s/g, '')).toBe(`${a}+${b}`);
		}
	});
});
