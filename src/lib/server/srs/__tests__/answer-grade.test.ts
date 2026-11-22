/**
 * Note d'une réponse pour la révision espacée (idée 4, PR 3, Q4 → B)
 * ===================================================================
 *
 * Une réussite en QCM = demi-réussite (« Difficile ») : la question revient plus
 * tôt qu'après une bonne réponse tapée. Un échec reste un échec.
 */
import { describe, it, expect } from 'vitest';
import { answerGrade } from '../answer-grade';
import { Grade } from '#lib/srs/types.ts';

describe('answerGrade', () => {
	it.each([
		[true, false, Grade.GOOD],
		[true, true, Grade.HARD],
		[false, false, Grade.AGAIN],
		[false, true, Grade.AGAIN]
	] as const)('réussi %s, en QCM %s → %s', (success, asChoice, grade) => {
		expect(answerGrade(success, asChoice)).toBe(grade);
	});
});
