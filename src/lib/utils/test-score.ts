/**
 * Score d'une session d'entraînement
 * ==================================
 *
 * Les cartes de cours (#617) sont auto-évaluées : elles n'entrent pas dans le
 * score, ni justes ni fausses (décision de David, 2026-09-28). On les compte à
 * part (« N carte(s) révisée(s) »).
 *
 * Sans carte, le calcul est EXACTEMENT l'ancien : arrondi au dixième sur 10.
 */

import { isCourseCard } from '$lib/questions/types';

export interface TestScore {
	/** Bonnes réponses parmi les questions notées */
	correctAnswers: number;
	/** Questions notées (hors cartes de cours) */
	gradedQuestions: number;
	/** Cartes de cours révisées */
	reviewedCards: number;
	/** Note sur 10, arrondie au dixième */
	score: number;
	scorePercentage: number;
}

export function computeTestScore<T extends { isCorrect: boolean; instance: { options?: unknown } }>(
	answers: T[],
	isCard: (answer: T) => boolean = (answer) => isCourseCard(answer.instance)
): TestScore {
	const graded = answers.filter((answer) => !isCard(answer));
	const correctAnswers = graded.filter((answer) => answer.isCorrect).length;
	const gradedQuestions = graded.length;
	const ratio = gradedQuestions > 0 ? correctAnswers / gradedQuestions : 0;
	return {
		correctAnswers,
		gradedQuestions,
		reviewedCards: answers.length - gradedQuestions,
		score: Math.round(ratio * 10 * 10) / 10,
		scorePercentage: ratio * 100
	};
}
