/** Zod des routes du combat de la Descente (étape 3). */

import { describe, expect, test } from 'vitest';
import { combatAnswerSchema, combatQuestionSchema, provinceSchema } from '../descente';
import { PROVINCE_IDS } from '#lib/descente/moves.ts';

const TEMPLATE = '11111111-1111-4111-8111-111111111111';

describe('Zod du combat', () => {
	test('les six Provinces, celles des coups', () => {
		expect([...provinceSchema.options].sort()).toEqual([...PROVINCE_IDS].sort());
	});

	test('question : coup ou esquive, Province connue, 40 modèles récents au plus', () => {
		expect(combatQuestionSchema.parse({ purpose: 'dodge', province: 'bedonstan' })).toEqual({
			purpose: 'dodge',
			province: 'bedonstan',
			recent: []
		});
		expect(combatQuestionSchema.safeParse({ purpose: 'heal', province: 'bedonstan' }).success).toBe(
			false
		);
		expect(combatQuestionSchema.safeParse({ purpose: 'attack', province: 'mordor' }).success).toBe(
			false
		);
		expect(
			combatQuestionSchema.safeParse({
				purpose: 'attack',
				province: 'bedonstan',
				recent: Array.from({ length: 41 }, () => TEMPLATE)
			}).success
		).toBe(false);
	});

	test('réponse : réponse et verdicts vont ensemble ; liste vide → null', () => {
		const base = { purpose: 'attack', province: 'bedonstan', template_id: TEMPLATE, success: true };
		expect(
			combatAnswerSchema.parse({ ...base, answer_parts: [], part_verdicts: [] })
		).toMatchObject({ answer_parts: null, part_verdicts: null });
		expect(combatAnswerSchema.safeParse({ ...base, answer_parts: ['4'] }).success).toBe(false);
		expect(
			combatAnswerSchema.safeParse({ ...base, answer_parts: ['4'], part_verdicts: [true, false] })
				.success
		).toBe(false);
		expect(combatAnswerSchema.safeParse({ ...base, template_id: 'pas-un-uuid' }).success).toBe(
			false
		);
		expect(
			combatAnswerSchema.safeParse({ ...base, answer_parts: ['a\u0000'], part_verdicts: [true] })
				.success
		).toBe(false);
	});
});
