/**
 * `&sol1` dans une vraie correction TinyMath (#260), de bout en bout
 * =================================================================
 *
 * Avant : `&sol1` devenait `{{sol1}}` (variable inexistante) → la génération
 * échouait (« Variable "sol1" not found ») pour ~115 questions. Il doit afficher
 * la PREMIÈRE solution (TinyMath numérote à partir de 1, le nouveau système à 0).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

describe('#260 « Trouver la moitié » : correction « 2 × &sol1 = … »', () => {
	it('génère, et la correction montre la solution attendue', () => {
		const result = transformQuestion(questions[260], 260);
		expect(result.success).toBe(true);
		const template = { ...result.template!, id: 't' } as QuestionTemplate;

		let checked = 0;
		for (let seed = 1; seed <= 20; seed++) {
			const generated = generateInstance(template, seed);
			expect(generated.success, JSON.stringify(generated)).toBe(true);
			if (!generated.success) continue;
			const step = String(generated.instance.correction?.steps?.[0] ?? '');
			expect(step).not.toContain('sol1');
			expect(step).not.toContain('{{');
			// La PREMIÈRE solution (la moitié) apparaît dans la correction
			const expected = generated.instance.blanks![0].expectedAnswer;
			expect(step, `tirage ${seed}`).toContain(`2 \\times ${expected}`);
			checked++;
		}
		expect(checked).toBe(20);
	});
});
