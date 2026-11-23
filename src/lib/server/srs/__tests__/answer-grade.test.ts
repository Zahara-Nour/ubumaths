/**
 * Note d'une réponse pour la révision espacée (idée 4, PR 3, Q4 → B)
 * ===================================================================
 *
 * Une réussite en QCM = demi-réussite (« Difficile ») : la question revient plus
 * tôt qu'après une bonne réponse tapée. Un échec reste un échec.
 */
import { describe, it, expect } from 'vitest';
import { answerGrade, helpedGrade } from '../answer-grade';
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

/**
 * Coup de pouce (idée 5) : en révision, l'élève choisit lui-même sa note
 * (« Réussi » = Bien) ; un indice ouvert la ramène à « Difficile ». Un échec
 * reste un échec, et sans indice rien ne change.
 */
describe('helpedGrade', () => {
	it.each([
		[Grade.GOOD, true, Grade.HARD],
		[Grade.EASY, true, Grade.HARD],
		[Grade.HARD, true, Grade.HARD],
		[Grade.AGAIN, true, Grade.AGAIN],
		[Grade.GOOD, false, Grade.GOOD],
		[Grade.AGAIN, false, Grade.AGAIN]
	] as const)('note %s, indice %s → %s', (grade, withHelp, expected) => {
		expect(helpedGrade(grade, withHelp)).toBe(expected);
	});
});
