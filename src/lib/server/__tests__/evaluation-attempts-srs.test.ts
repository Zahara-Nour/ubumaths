/**
 * Q40 (décision de David, 2026-10-01) : pour le SRS, une réponse en forme non
 * optimale (½ point) compte « Bien », comme en entraînement libre. La note, elle,
 * ne donne `is_correct` qu'aux réponses à 1 point.
 */
import { describe, it, expect } from 'vitest';
import { srsReviewsOf } from '../evaluation-attempts';
import { isKnownForSrs } from '#lib/questions/grading.ts';

describe('Q40 — verdict du serveur envoyé au SRS', () => {
	it.each([
		['correct', false, true],
		['unoptimal_form', false, true],
		// Choix a de David : ½ dû à des cases vides ou un QCM incomplet → « À revoir »
		['unoptimal_form', true, false],
		['bad_form', false, false],
		['incorrect', false, false],
		['empty', false, false]
	] as const)('%s (partiel : %s) → su : %s', (status, partial, known) => {
		expect(isKnownForSrs({ status, partial })).toBe(known);
	});

	it('révisions ordinaires (pas d’auto-évaluation), une par question, modèle de la question', () => {
		const reviews = srsReviewsOf(
			[
				{ status: 'correct', partial: false },
				{ status: 'unoptimal_form', partial: false },
				{ status: 'unoptimal_form', partial: true },
				{ status: 'incorrect', partial: false }
			],
			['t1', 't2', 't3', 't4']
		);
		expect(reviews).toEqual([
			{ templateId: 't1', success: true, selfAssessed: false },
			{ templateId: 't2', success: true, selfAssessed: false },
			{ templateId: 't3', success: false, selfAssessed: false },
			{ templateId: 't4', success: false, selfAssessed: false }
		]);
	});
});

describe('Idée 4, PR 3 — question de contrôle posée en QCM', () => {
	const enQcm = {
		blanks: [
			{
				type: 'choice',
				expectedAnswer: '0',
				choice: { choices: ['$12$', '$4$'], order: [1, 0], multiple: false },
				fromExpectedErrors: true
			}
		]
	};
	const enSaisie = { blanks: [{ type: 'math', expectedAnswer: '12' }] };

	it('le serveur le lit sur la copie figée, pas dans ce que dit la page', () => {
		const reviews = srsReviewsOf(
			[
				{ status: 'correct', partial: false, instance: enQcm },
				{ status: 'incorrect', partial: false, instance: enQcm },
				{ status: 'correct', partial: false, instance: enSaisie }
			],
			['t1', 't2', 't3']
		);
		expect(reviews).toEqual([
			{ templateId: 't1', success: true, selfAssessed: false, answeredAsChoice: true },
			{ templateId: 't2', success: false, selfAssessed: false, answeredAsChoice: true },
			{ templateId: 't3', success: true, selfAssessed: false }
		]);
	});
});
