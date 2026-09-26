/**
 * Couleurs des corrections TinyMath, sur les 633 vraies questions
 * ===============================================================
 *
 * `${get(color1)}` → `{{color:primary.0}}` ; `${get(correct_color)}` (vert
 * « bonne réponse » de TinyMath, #a3d651) → `{{color:primary.2}}` (#4CAF50).
 * Avant : `correct_color` restait une palette inconnue, et `{{{color:…}}}`
 * faisait échouer la génération de ~190 variations.
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

describe('couleurs TinyMath', () => {
	it('aucune palette inconnue (`correct_color`) ni référence `${get(…)}` restante', () => {
		const leftovers: number[] = [];
		for (const question of questions) {
			const { globalIndex } = question._migration;
			const template = transformQuestion(question, globalIndex).template;
			// La consigne peut contenir du HTML TinyMath (`class="${get(color2)}-text"`, #364) :
			// hors sujet ici, seuls énoncés et corrections portent des couleurs mathématiques
			const text = JSON.stringify([template?.shared, template?.variations]);
			if (/color:correct_color|\$\{get\(/.test(text)) leftovers.push(globalIndex);
		}
		expect(leftovers).toEqual([]);
	});

	it('aucune variation n’échoue plus sur une couleur (`{{{color:…}}}`)', () => {
		const failures: string[] = [];
		let variations = 0;
		for (const question of questions) {
			const { globalIndex } = question._migration;
			const result = transformQuestion(question, globalIndex);
			if (!result.template) continue;
			const template = { ...result.template, id: 't' } as QuestionTemplate;
			template.variations.forEach((variation, index) => {
				variations++;
				const generated = generateInstance({ ...template, variations: [variation] }, 1);
				// L'expression FAUTIVE est la couleur elle-même (pas un bloc qui en contient une)
				if (
					!generated.success &&
					generated.errors.some((e) => e.includes('expression "{{{color:'))
				) {
					failures.push(`#${globalIndex}.${index}`);
				}
			});
		}
		expect(variations).toBeGreaterThan(1000);
		expect(failures).toEqual([]);
	});
});
