/**
 * Course aux nombres : « Recommencer » relance la même série hors évaluation ;
 * pendant une évaluation, jamais (une tentative de plus ne passe que par
 * « Mes évaluations », où date limite et tentatives sont vérifiées).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import TestCourse from '../TestCourse.svelte';
import type { TestResult, TestSession } from '$lib/types/test';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

function session(): TestSession {
	return {
		mode: 'course',
		categories: [],
		instances: [],
		userAnswers: new Map(),
		startTime: Date.now(),
		timeLimit: 420,
		currentQuestionIndex: 0,
		isPaused: false
	};
}

async function finish(inEvaluation: boolean) {
	const screen = await render(TestCourse, {
		session: session(),
		onComplete: vi.fn(),
		onBack: vi.fn(),
		inEvaluation
	});
	await page.getByRole('button', { name: 'Terminer' }).click();
	await expect.element(page.getByText(/bonnes réponses/)).toBeInTheDocument();
	return screen;
}

describe('TestCourse — fin de la course', () => {
	it('hors évaluation : « Recommencer » est proposé', async () => {
		const { container } = await finish(false);
		expect(container.textContent).toContain('Recommencer');
		expect(container.textContent).toContain('Retour au panier');
	});

	it('évaluation : ni « Recommencer » ni « Retour au panier », mais « Mes évaluations »', async () => {
		const { container } = await finish(true);
		expect(container.textContent).not.toContain('Recommencer');
		expect(container.textContent).not.toContain('Retour au panier');
		expect(container.querySelector('a[href="/dashboard/student/assessments"]')).not.toBeNull();
	});

	it('évaluation : le bouton retour de l’en-tête ne mène pas au panier', async () => {
		const { container } = await render(TestCourse, {
			session: session(),
			onComplete: vi.fn(),
			onBack: vi.fn(),
			inEvaluation: true
		});
		expect(container.querySelector('[aria-label="Retour au panier"]')).toBeNull();
		expect(container.querySelector('[aria-label="Mes évaluations"]')).not.toBeNull();
	});
});

/**
 * Évaluation (collectOnly) : une réponse cochée ou tapée sans « Valider » part
 * quand même à la fin ; la confirmation ne doit donc pas la compter comme « non
 * répondue ».
 */
describe('TestCourse — évaluation, réponses non validées', () => {
	function qcmSession(): TestSession {
		const choices = [
			{ content: resolvedMarkdown('$$3$$'), isCorrect: false },
			{ content: resolvedMarkdown('$$4$$'), isCorrect: false }
		];
		const instance = (statement: string): QuestionInstance => ({
			templateId: '',
			statement: resolvedMarkdown(statement),
			grades: [],
			theme: '',
			domain: '',
			level: 0,
			generatedAt: '',
			choices,
			shuffledChoices: choices.map((c, i) => ({ content: c.content, originalIndex: i }))
		});
		return { ...session(), instances: [instance('Q1 ?'), instance('Q2 ?')] };
	}

	it('cochée sans « Valider » : pas comptée non répondue, et envoyée à la fin', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
		const onComplete = vi.fn<(result: TestResult) => void>();
		const { container } = await render(TestCourse, {
			session: qcmSession(),
			onComplete,
			onBack: vi.fn(),
			inEvaluation: true,
			collectOnly: true,
			showResults: false
		});
		const cards = container.querySelectorAll('.question-card-wrapper');
		// Q1 : cochée, jamais validée ; Q2 : validée
		cards[0].querySelectorAll<HTMLButtonElement>('.choice-button')[1].click();
		cards[1].querySelectorAll<HTMLButtonElement>('.choice-button')[0].click();
		await vi.waitFor(() => {
			const validate = [...cards[1].querySelectorAll('button')].find((b) =>
				b.textContent?.includes('Valider')
			);
			expect(validate?.disabled).toBe(false);
			validate!.click();
		});

		await page.getByRole('button', { name: 'Terminer' }).click();

		expect(confirmSpy).not.toHaveBeenCalled();
		await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
		const result = onComplete.mock.calls[0][0];
		expect(result.answers[0].userAnswer?.value).toBe(1);
		expect(result.answers[1].userAnswer?.value).toBe(0);
		confirmSpy.mockRestore();
	});

	it('rien du tout sur une question : la confirmation le dit (1 non répondue)', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { container } = await render(TestCourse, {
			session: qcmSession(),
			onComplete: vi.fn(),
			onBack: vi.fn(),
			inEvaluation: true,
			collectOnly: true,
			showResults: false
		});
		const cards = container.querySelectorAll('.question-card-wrapper');
		cards[0].querySelectorAll<HTMLButtonElement>('.choice-button')[1].click();

		await page.getByRole('button', { name: 'Terminer' }).click();

		expect(confirmSpy).toHaveBeenCalledTimes(1);
		expect(confirmSpy.mock.calls[0][0]).toMatch(/Il reste 1 question non répondue/);
		confirmSpy.mockRestore();
	});
});
