/**
 * Évaluation notée : cocher le bon choix AFFICHÉ d'une case choix mélangée rapporte 1 point
 * ======================================================================================
 *
 * Le navigateur n'a que la version publique (`toDisplayInstance` : ordre affiché =
 * ordre d'origine) ; le serveur ramène les positions affichées aux indices d'origine
 * avec l'instance complète (`toOriginalChoiceValues`). Toute conversion faite côté
 * client doit donc rester neutre, sinon la note serait fausse (double conversion).
 * Chaîne complète : vraie instance mélangée → carte (collectOnly) → copie envoyée →
 * conversion et barème du serveur. Repris du QCM (ADR 0033, lot 5).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { toDisplayInstance, toPublicQuestion } from '$lib/questions/public-question';
import { toSubmission } from '$lib/questions/submission';
import { gradeQuestion } from '$lib/questions/grading';
import { choiceLetter } from '$lib/questions/choices';
import { toOriginalChoiceValues } from '$lib/questions/choice-case';
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
			statement: templateMarkdown(
				'Quel nombre est pair ?\n\n```choix\n- $$4$$\n- $$3$$\n- $$5$$\n- $$7$$\n```'
			),
			blanks: [{ expectedAnswer: '0' }]
		}
	]
} as unknown as QuestionTemplate;

/** Une graine dont le mélange n'est PAS l'identité (le bon choix n'est pas affiché en A) */
function shuffledInstance(): QuestionInstance {
	for (let seed = 1; seed < 1000; seed++) {
		const result = generateInstance(TEMPLATE, seed);
		if (result.success && result.instance.blanks?.[0].choice?.order[0] !== 0) {
			return result.instance;
		}
	}
	throw new Error('aucune graine au mélange non trivial');
}

/** Ordre affiché de la case choix : position → indice d'origine */
const orderOf = (instance: QuestionInstance) => instance.blanks?.[0].choice?.order ?? [];

/** Ce que fait le serveur à l'envoi : positions affichées → indices d'origine, puis barème */
function serverGrade(full: QuestionInstance, values: string[]) {
	const converted = toOriginalChoiceValues(full, values);
	if (!('values' in converted)) throw new Error(converted.error);
	return { verdict: gradeQuestion(full, converted), values: converted.values };
}

describe('case choix mélangée en évaluation', () => {
	it('le bon choix affiché → 1 point ; un autre → 0', async () => {
		const full = shuffledInstance();
		const correctPosition = orderOf(full).indexOf(0);
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
			expect(serverGrade(full, submission.answers[0].values ?? []).verdict.points).toBe(expected);
			await unmount();
		}
	});

	it('la copie affiche la lettre et le contenu COCHÉS à l’écran (indices d’origine renvoyés)', async () => {
		const full = shuffledInstance();
		// Un mauvais choix affiché ailleurs qu'à sa place d'origine
		const order = orderOf(full);
		const position = order.findIndex((index, p) => index !== 0 && index !== p);
		expect(position).toBeGreaterThanOrEqual(0);
		const clicked = full.blanks?.[0].choice?.choices[order[position]] ?? '';

		const { verdict, values } = serverGrade(full, [String(position)]);
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
							answer: { values },
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
		expect(text).toContain(clicked.replace(/\$/g, ''));
	});
});
