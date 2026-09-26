/**
 * `result-type: decimal` (TinyMath) : pas de précision « 2 décimales » d'office
 * ===========================================================================
 *
 * TinyMath (`generateQuestion.ts` : `{ decimal: result-type === 'decimal' }`)
 * calcule la solution en écriture décimale, sans arrondi. La conversion
 * ajoutait une précision à 2 décimales, qui accepte un arrondi faux et change
 * le verdict des parenthèses (« (-1,5) » refusé au lieu de perfectible, #320).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '../question-transformer';
import type { QuestionWithMigration } from '../old-question-types';

const questions = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
) as QuestionWithMigration[];

describe('result-type decimal', () => {
	it('aucune question transformée ne reçoit de précision d’office', () => {
		const decimal = questions.filter((q) => q['result-type'] === 'decimal');
		expect(decimal.length).toBeGreaterThan(50);
		const withPrecision = decimal
			.map((q) => ({
				i: q._migration.globalIndex,
				t: transformQuestion(q, q._migration.globalIndex).template
			}))
			.filter(({ t }) => JSON.stringify(t).includes('"precision"'))
			.map(({ i }) => i);
		expect(withPrecision).toEqual([]);
	});
});

describe('#344 deux énoncés secondaires pour une seule variation', () => {
	it('donne deux variations, chacune avec son énoncé secondaire', () => {
		const template = transformQuestion(questions[344], 344).template!;
		expect(template.variations).toHaveLength(2);
		const statements = template.variations.map((v) =>
			String(v.statement ?? template.shared?.statement)
		);
		expect(new Set(statements).size).toBe(2);
	});
});
