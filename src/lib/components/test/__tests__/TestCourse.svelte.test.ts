/**
 * Course aux nombres : « Recommencer » relance la même série hors évaluation ;
 * pendant une évaluation, jamais (une tentative de plus ne passe que par
 * « Mes évaluations », où date limite et tentatives sont vérifiées).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import TestCourse from '../TestCourse.svelte';
import type { TestSession } from '$lib/types/test';

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
