/**
 * Évaluation notée : cliquer le bon choix AFFICHÉ d'un QCM mélangé rapporte 1 point
 * ================================================================================
 *
 * Le navigateur n'a que la version publique (`toDisplayInstance` : position
 * affichée = indice) ; le serveur ramène les positions affichées aux indices
 * d'origine avec l'instance complète. Toute conversion faite côté client doit
 * donc rester neutre, sinon la note serait fausse (double conversion).
 * Chaîne complète : vraie instance mélangée → carte (collectOnly) → copie
 * envoyée → barème du serveur.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { toDisplayInstance, toPublicQuestion } from '$lib/questions/public-question';
import { toSubmission } from '$lib/questions/submission';
import { gradeQuestion } from '$lib/questions/grading';
import { choiceLetter } from '$lib/questions/choices';
import EvaluationResults from '$lib/components/test/EvaluationResults.svelte';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { AnswerData } from '$lib/types/question-display';
import { templateMarkdown } from '$lib/ubumark';

const TEMPLATE = {
	id: '00000000-0000-4000-8000-0000000000c1',
	title: 'Quatre choix',
	theme: 'T',
	domain: 'D',
	level: 1,
	grades: ['6'],
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Quel nombre est pair ?'),
			correctChoiceIndex: ['0'],
			choices: [
				{ content: '$$4$$' },
				{ content: '$$3$$' },
				{ content: '$$5$$' },
				{ content: '$$7$$' }
			]
		}
	]
} as unknown as QuestionTemplate;

/** Une graine dont le mélange n'est PAS l'identité (le bon choix n'est pas affiché en A) */
function shuffledInstance(): QuestionInstance {
	for (let seed = 1; seed < 1000; seed++) {
		const result = generateInstance(TEMPLATE, seed);
		if (result.success && result.instance.shuffledChoices?.[0].originalIndex !== 0) {
			return result.instance;
		}
	}
	throw new Error('aucune graine au mélange non trivial');
}

describe('QCM mélangé en évaluation', () => {
	it('le bon choix affiché → 1 point ; un autre → 0', async () => {
		const full = shuffledInstance();
		const correctPosition = full.shuffledChoices!.findIndex((c) => c.originalIndex === 0);
		expect(correctPosition).toBeGreaterThan(0);

		for (const [position, expected] of [
			[correctPosition, 1],
			[correctPosition === 1 ? 2 : 1, 0]
		] as const) {
			const onAnswerSubmit = vi.fn<(answer: AnswerData) => void>();
			const { container, unmount } = await render(QuestionCard, {
				interactive: true,
				collectOnly: true,
				instance: toDisplayInstance(toPublicQuestion(full, { position: 0, delaySeconds: 20 })),
				onAnswerSubmit
			});
			container.querySelectorAll<HTMLButtonElement>('.choice-button')[position].click();
			await vi.waitFor(() => {
				const validate = [...container.querySelectorAll('button')].find((b) =>
					b.textContent?.includes('Valider')
				);
				expect(validate?.disabled).toBe(false);
				validate!.click();
			});
			await vi.waitFor(() => expect(onAnswerSubmit).toHaveBeenCalledTimes(1));

			const submission = toSubmission(
				[0],
				[
					{
						index: 0,
						instance: full,
						isCorrect: false,
						userAnswer: onAnswerSubmit.mock.calls[0][0]
					}
				]
			);
			expect(gradeQuestion(full, submission.answers[0]).points).toBe(expected);
			await unmount();
		}
	});

	it('la copie affiche la lettre et le contenu COCHÉS à l’écran (indices d’origine renvoyés)', async () => {
		const full = shuffledInstance();
		// Un mauvais choix affiché ailleurs qu'à sa place d'origine
		const position = full.shuffledChoices!.findIndex(
			(c, p) => c.originalIndex !== 0 && c.originalIndex !== p
		);
		expect(position).toBeGreaterThanOrEqual(0);
		const clicked = full.shuffledChoices![position];

		const verdict = gradeQuestion(full, { choices: [position] });
		const main = document.body.appendChild(document.createElement('main'));
		const { container } = await render(EvaluationResults, {
			target: main,
			props: {
				result: {
					attemptId: 'a',
					late: false,
					grade: 0,
					pointsEarned: 0,
					totalQuestions: 1,
					correctCount: 0,
					// Ce que le serveur renvoie et range : la réponse du barème
					questions: [
						{
							position: 0,
							instance: full,
							answer: { choiceIndexes: verdict.choiceIndexes },
							status: verdict.status,
							points: verdict.points,
							isCorrect: verdict.isCorrect,
							partial: verdict.partial
						}
					]
				}
			}
		});
		// Résultat attendu (lot 2) : choix dans l'ordre AFFICHÉ, le coché marqué
		const chosen = container.querySelectorAll('[data-kind="choices"] li')[position];
		expect(chosen?.getAttribute('data-status')).toBe('incorrect');
		const text = chosen?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
		expect(text.startsWith(choiceLetter(position))).toBe(true);
		expect(text).toContain(clicked.content.replace(/\$/g, ''));
	});
});
