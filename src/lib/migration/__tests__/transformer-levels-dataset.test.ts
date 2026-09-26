/**
 * Niveaux : les 633 vraies questions TinyMath (`.claude/old-questions.json`)
 * ==========================================================================
 *
 * La base exige `level ≥ 1` (contrainte `question_templates_level_positive`) ;
 * TinyMath numérote à partir de 0 (136 questions au niveau 0). Décision de David
 * (2026-09-26) : +1 pour toutes, ce qui garde l'ordre et l'unicité d'origine.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

describe('niveaux sur le jeu réel', () => {
	it('633 questions : niveau = niveau TinyMath + 1, jamais sous 1', () => {
		expect(questions).toHaveLength(633);
		const levelZero = questions.filter((q) => q._migration.level === 0).length;
		expect(levelZero).toBe(136);

		for (const question of questions) {
			const { globalIndex, level } = question._migration;
			const result = transformQuestion(question, globalIndex);
			if (!result.template) continue;
			expect(result.template.level, `#${globalIndex}`).toBe(level + 1);
		}
	});
});
