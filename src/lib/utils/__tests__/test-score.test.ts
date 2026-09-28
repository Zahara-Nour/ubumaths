/**
 * Score d'une session d'entraînement : les cartes de cours (auto-évaluées)
 * n'y entrent pas, ni justes ni fausses (décision de David, 2026-09-28).
 */
import { describe, it, expect } from 'vitest';
import { computeTestScore } from '../test-score';

const q = (isCorrect: boolean) => ({ isCorrect, instance: {} });
const carte = (isCorrect: boolean) => ({ isCorrect, instance: { options: { courseCard: true } } });

describe('computeTestScore', () => {
	it('sans carte : calcul inchangé', () => {
		expect(computeTestScore([q(true), q(false), q(true)])).toEqual({
			correctAnswers: 2,
			gradedQuestions: 3,
			reviewedCards: 0,
			score: 6.7,
			scorePercentage: (2 / 3) * 100
		});
	});

	it('les cartes ne comptent ni juste ni faux', () => {
		expect(computeTestScore([q(true), carte(true), carte(false), q(false)])).toMatchObject({
			correctAnswers: 1,
			gradedQuestions: 2,
			reviewedCards: 2,
			score: 5
		});
	});

	it('uniquement des cartes : score 0, rien de noté', () => {
		expect(computeTestScore([carte(true)])).toMatchObject({
			gradedQuestions: 0,
			reviewedCards: 1,
			score: 0,
			scorePercentage: 0
		});
	});
});
