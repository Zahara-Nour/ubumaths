/**
 * Copie d'une évaluation telle que la page l'envoie (chantier 5, relecture) :
 * une case trop longue, trop de cases ou un choix hors bornes ne doivent pas
 * faire refuser TOUTE la copie par Zod. La page tronque ou limite.
 */
import { describe, it, expect } from 'vitest';
import { toSubmission } from '../submission';
import { submitAttemptSchema } from '$lib/server/validation/evaluations';
import type { TestAnswerResult } from '$lib/types/test';
import type { QuestionInstance } from '$lib/questions/types';

function answer(
	value: TestAnswerResult['userAnswer'] extends infer A ? A : never
): TestAnswerResult {
	return {
		index: 0,
		instance: {} as QuestionInstance,
		isCorrect: false,
		userAnswer: value
	};
}

function data(value: string | string[] | number | number[]) {
	return answer({ value, isCorrect: false, timeSpent: 12.6, attempts: 1, submittedAt: '' });
}

describe('toSubmission', () => {
	it('case trop longue : tronquée à 2000 caractères, la copie reste valide', () => {
		const submission = toSubmission([0], [data(['x'.repeat(3000)])]);
		expect(submission.answers[0].values?.[0]).toHaveLength(2000);
		expect(submitAttemptSchema.safeParse(submission).success).toBe(true);
	});

	it('trop de cases : limitées à 50', () => {
		const submission = toSubmission([0], [data(Array(60).fill('1'))]);
		expect(submission.answers[0].values).toHaveLength(50);
		expect(submitAttemptSchema.safeParse(submission).success).toBe(true);
	});

	it('choix hors bornes ou non entiers : écartés', () => {
		const submission = toSubmission([0], [data([0.5, 1, 99, -1])]);
		expect(submission.answers[0].choices).toEqual([1]);
		expect(submitAttemptSchema.safeParse(submission).success).toBe(true);
	});

	it('plus de 500 questions : les 500 premières (le reste compte vide côté serveur)', () => {
		const positions = Array.from({ length: 520 }, (_, i) => i);
		const submission = toSubmission(
			positions,
			positions.map(() => data(['1']))
		);
		expect(submission.answers).toHaveLength(500);
		expect(submitAttemptSchema.safeParse(submission).success).toBe(true);
	});

	it('rien tapé (chrono écoulé) ou pas de réponse : question vide', () => {
		const submission = toSubmission([0, 1], [data(''), answer(undefined)]);
		expect(submission.answers).toEqual([{ position: 0 }, { position: 1 }]);
	});

	it('QCM à choix unique : un nombre → une liste ; temps arrondi', () => {
		expect(toSubmission([3], [data(2)]).answers[0]).toEqual({
			position: 3,
			choices: [2],
			timeSpent: 13
		});
	});

	it('aucun verdict ni durée totale dans la copie', () => {
		const submission = toSubmission([0], [data(['7'])]);
		expect(JSON.stringify(submission)).not.toMatch(/isCorrect|points|grade|latex/);
		expect(submission).not.toHaveProperty('timeSpent');
	});
});
