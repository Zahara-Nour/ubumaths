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

/** Lien « Quitter » de l'en-tête (un vrai lien : la destination est écrite dedans) */
function quitLink(container: HTMLElement): HTMLAnchorElement | undefined {
	return [...container.querySelectorAll<HTMLAnchorElement>('a')].find(
		(link) => link.textContent?.trim() === 'Quitter'
	);
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

/** Clique le lien « Quitter » ; rend true si le lien a annulé la navigation */
function clickQuit(container: HTMLElement): boolean {
	const link = quitLink(container);
	if (!link) throw new Error('lien « Quitter » introuvable');
	let cancelledByLink = false;
	// Écouteur posé après celui du lien : relève sa décision, puis bloque la vraie navigation
	link.ownerDocument.addEventListener(
		'click',
		(event) => {
			cancelledByLink = event.defaultPrevented;
			event.preventDefault();
		},
		{ once: true }
	);
	link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	return cancelledByLink;
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

	it('évaluation : « Quitter » dans l’en-tête mène à « Mes contrôles », pas au panier', async () => {
		const { container } = await render(TestCourse, {
			session: session(),
			onComplete: vi.fn(),
			onBack: vi.fn(),
			inEvaluation: true
		});
		expect(quitLink(container)?.getAttribute('href')).toBe('/dashboard/student/assessments');
	});

	it('hors évaluation : « Quitter » dans l’en-tête mène au panier', async () => {
		const { container } = await render(TestCourse, {
			session: session(),
			onComplete: vi.fn(),
			onBack: vi.fn(),
			inEvaluation: false
		});
		expect(quitLink(container)?.getAttribute('href')).toBe('/automaths/panier');
	});
});

/**
 * Évaluation (collectOnly) : une réponse cochée ou tapée sans « Valider » part
 * quand même à la fin ; la confirmation ne doit donc pas la compter comme « non
 * répondue ».
 */
describe('TestCourse — évaluation, réponses non validées', () => {
	/** Questions réduites à une case choix, comme les livre `toDisplayInstance` */
	function qcmSession(): TestSession {
		const instance = (statement: string): QuestionInstance => ({
			templateId: '',
			statement: resolvedMarkdown(`${statement}\n\n\`\`\`choix\ncase: 0\n- $$3$$\n- $$4$$\n\`\`\``),
			grades: [],
			theme: '',
			domain: '',
			level: 0,
			generatedAt: '',
			blanks: [
				{
					expectedAnswer: '',
					type: 'choice',
					choice: { choices: ['$$3$$', '$$4$$'], order: [0, 1], multiple: false }
				}
			]
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
		expect(result.answers[0].userAnswer?.value).toEqual(['1']);
		expect(result.answers[1].userAnswer?.value).toEqual(['0']);
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

describe('TestCourse — quitter en cours de route', () => {
	it('contrôle : « Quitter » demande confirmation, un refus garde l’élève sur la course', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
		const { container } = await render(TestCourse, {
			session: session(),
			onComplete: vi.fn(),
			onBack: vi.fn(),
			inEvaluation: true,
			collectOnly: true
		});
		expect(clickQuit(container)).toBe(true);
		expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('le temps continue de courir'));
		confirmSpy.mockRestore();
	});

	it('entraînement : « Quitter » part sans question', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm');
		const { container } = await render(TestCourse, {
			session: session(),
			onComplete: vi.fn(),
			onBack: vi.fn(),
			inEvaluation: false
		});
		expect(clickQuit(container)).toBe(false);
		expect(confirmSpy).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});
});
