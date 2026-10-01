/**
 * Q40 (décision de David, 2026-10-01) : pour le SRS, une réponse en forme non
 * optimale (½ point) compte « Bien », comme en entraînement libre. La note, elle,
 * ne donne `is_correct` qu'aux réponses à 1 point.
 */
import { describe, it, expect } from 'vitest';
import { srsReviewsOf } from '../evaluation-attempts';
import { isKnownForSrs } from '$lib/questions/grading';

describe('Q40 — verdict du serveur envoyé au SRS', () => {
	it.each([
		['correct', true],
		['unoptimal_form', true],
		['bad_form', false],
		['incorrect', false],
		['empty', false]
	] as const)('%s → su : %s', (status, known) => {
		expect(isKnownForSrs(status)).toBe(known);
	});

	it('révisions ordinaires (pas d’auto-évaluation), une par question, modèle de la question', () => {
		const reviews = srsReviewsOf(
			[
				{ status: 'correct', isCorrect: true },
				{ status: 'unoptimal_form', isCorrect: false },
				{ status: 'incorrect', isCorrect: false }
			],
			['t1', 't2', 't3']
		);
		expect(reviews).toEqual([
			{ templateId: 't1', success: true, selfAssessed: false },
			{ templateId: 't2', success: true, selfAssessed: false },
			{ templateId: 't3', success: false, selfAssessed: false }
		]);
	});
});
