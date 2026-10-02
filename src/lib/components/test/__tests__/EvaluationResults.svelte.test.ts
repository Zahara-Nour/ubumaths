/**
 * E19 (fin) — après l'envoi d'une évaluation : la correction de chaque question
 * avec SES points (verdict du serveur), puis la note sur 20 et « x/n questions ».
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EvaluationResults from '../EvaluationResults.svelte';
import type { EvaluationSubmitResponse } from '$lib/types/evaluation-attempt';
import type { QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function instance(expected: string): QuestionInstance {
	return {
		templateId: 't',
		statement: `Combien ? $\\placeholder[0]{}$` as ResolvedMarkdown,
		blanks: [{ expectedAnswer: expected, type: 'math' }],
		grades: ['6'],
		theme: 'T',
		domain: 'D',
		level: 1,
		generatedAt: ''
	};
}

function response(overrides: Partial<EvaluationSubmitResponse> = {}): EvaluationSubmitResponse {
	return {
		attemptId: 'a',
		late: false,
		grade: 13.5,
		pointsEarned: 2,
		totalQuestions: 3,
		correctCount: 1,
		questions: [
			{
				position: 0,
				instance: instance('7'),
				answer: { values: ['7'] },
				status: 'correct',
				points: 1,
				isCorrect: true,
				partial: false
			},
			{
				position: 1,
				instance: instance('8'),
				answer: { values: ['8', ''] },
				status: 'unoptimal_form',
				points: 0.5,
				isCorrect: false,
				partial: true
			},
			{
				position: 2,
				instance: instance('9'),
				answer: null,
				status: 'empty',
				points: 0,
				isCorrect: false,
				partial: false
			}
		],
		...overrides
	};
}

async function renderInMain(result: EvaluationSubmitResponse) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(EvaluationResults, { target: main, props: { result, title: 'Tables' } });
}

describe('EvaluationResults', () => {
	it('la note sur 20 et « x/n questions »', async () => {
		const { container } = await renderInMain(response());
		expect(container.querySelector('[data-testid="evaluation-grade"]')?.textContent?.trim()).toBe(
			'13,5/20'
		);
		expect(
			container
				.querySelector('[data-testid="evaluation-questions-count"]')
				?.textContent?.replace(/\s+/g, ' ')
				.trim()
		).toBe('1/3 questions');
	});

	it('chaque question avec ses points (1, ½, 0), dans l’ordre', async () => {
		const { container } = await renderInMain(response());
		const points = [...container.querySelectorAll('[data-testid="question-points"]')].map((el) =>
			el.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(points).toEqual(['1 point', '½ point', '0 point']);
		// La correction complète arrive avec la note : la réponse attendue s'affiche
		expect(container.textContent).toContain('Question 1');
		expect(container.textContent).toContain('Question 3');
	});

	it('envoi trop tard (Course) : dit pourquoi la note est 0', async () => {
		const { container } = await renderInMain(response({ late: true, grade: 0, correctCount: 0 }));
		expect(container.textContent).toMatch(/temps/i);
		expect(container.querySelector('[data-testid="evaluation-grade"]')?.textContent?.trim()).toBe(
			'0/20'
		);
	});

	it('seulement « Mes évaluations » (pas de « Recommencer »)', async () => {
		const { container } = await renderInMain(response());
		expect(container.querySelector('a[href="/dashboard/student/assessments"]')).not.toBeNull();
		expect(container.textContent).not.toContain('Recommencer');
	});

	it('lot 2 : le verdict détaillé du SERVEUR colore les cases (aucun recalcul)', async () => {
		// Réponse juste en valeur ; le serveur l'a jugée « forme à améliorer »
		const result = response();
		result.questions[0] = {
			...result.questions[0],
			status: 'unoptimal_form',
			points: 0.5,
			isCorrect: false,
			detail: {
				status: 'unoptimal_form',
				blanks: [
					{ index: 0, status: 'unoptimal_form', remarks: ['Écris-le autrement.'], answer: '7' }
				]
			}
		};
		const { container } = await renderInMain(result);
		const first = container.querySelectorAll('.flip-front')[0];
		expect(first.querySelector('[data-testid="global-verdict"]')?.getAttribute('data-kind')).toBe(
			'half'
		);
		expect(first.textContent).toContain('Écris-le autrement.');
		expect(first.querySelector('code')).toBeNull();
	});
});
