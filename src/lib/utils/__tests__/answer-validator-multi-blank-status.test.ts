/**
 * Statut d'une réponse à plusieurs cases dont une seule est fausse
 * ================================================================
 *
 * La case fausse ne renvoie pas de statut : le statut global restait celui de la case
 * juste (« correct ») alors que `isCorrect` valait false. L'interface lit `isCorrect`,
 * mais le lanceur de specs lit `status` : une réponse à moitié fausse y passait pour juste.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { QuestionInstance } from '$lib/questions/types';

const instance = {
	blanks: [
		{ expectedAnswer: '7', type: 'math' },
		{ expectedAnswer: '8', type: 'math' }
	],
	statement: '$$? < 7{,}5 < ?$$'
} as unknown as QuestionInstance;

describe('validateAnswer — plusieurs cases', () => {
	it('toutes justes : correct', () => {
		const r = validateAnswer(['7', '8'], instance, ['7', '8']);
		expect(r.isCorrect).toBe(true);
		expect(r.status ?? 'correct').toBe('correct');
	});

	it.each([[['7', '9']], [['6', '8']], [['6', '9']]])(
		'%j : incorrect (statut et isCorrect cohérents)',
		(answers) => {
			const r = validateAnswer(answers, instance, answers);
			expect(r.isCorrect).toBe(false);
			// Sans statut = incorrect (comme le lanceur de specs) ; jamais « correct »
			expect(r.status ?? 'incorrect').toBe('incorrect');
		}
	);
});
