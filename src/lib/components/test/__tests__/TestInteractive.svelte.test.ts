/**
 * Forme « Entraînement » d'une série (spécification de David, 2026-09-30) :
 * une question à la fois, chacune avec SON chrono ; l'élève valide, ou le
 * chrono expire. À l'expiration, ce qui est tapé ou coché est validé (Q18).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync, tick } from 'svelte';
import TestInteractive from '../TestInteractive.svelte';
import type { ClassroomItem, TestResult } from '$lib/types/test';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

const RESTART = 'Recommencer avec de nouvelles questions';
const VISITOR_NOTE = 'Connecte-toi pour que tes réponses comptent dans tes révisions.';

/** QCM « statement » : deux choix, le bon est « 4 » (index 1, ordre conservé) */
function qcm(statement: string): QuestionInstance {
	return {
		templateId: `tpl-${statement}`,
		statement: resolvedMarkdown(statement),
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Calcul',
		level: 1,
		generatedAt: new Date().toISOString(),
		choices: [
			{ content: resolvedMarkdown('3'), isCorrect: false },
			{ content: resolvedMarkdown('4'), isCorrect: true }
		],
		shuffledChoices: [
			{ content: resolvedMarkdown('3'), originalIndex: 0 },
			{ content: resolvedMarkdown('4'), originalIndex: 1 }
		],
		correctChoiceIndex: '1',
		correction: { steps: [resolvedMarkdown(`Correction de ${statement}`)] }
	} as QuestionInstance;
}

function item(statement: string, delaySeconds: number): ClassroomItem {
	return { instance: qcm(statement), delaySeconds, categoryKey: 'x' };
}

async function open(
	items: ClassroomItem[],
	isLoggedIn = true,
	inEvaluation = false,
	collectOnly = false
) {
	const onComplete = vi.fn<(result: TestResult) => void>();
	const onRestart = vi.fn();
	const onBack = vi.fn();
	const result = await render(TestInteractive, {
		items,
		isLoggedIn,
		onComplete,
		onRestart,
		onBack,
		inEvaluation,
		collectOnly
	});
	flushSync();
	await tick();
	return { ...result, onComplete, onRestart, onBack };
}

// Avance le temps simulé (minuteur à requestAnimationFrame compris)
function elapse(ms: number) {
	vi.advanceTimersByTime(ms);
	flushSync();
}

function position(container: HTMLElement): string {
	return container.querySelector('[data-testid="interactive-position"]')?.textContent?.trim() ?? '';
}

/** Carte de la question en cours (la précédente peut encore sortir en transition) */
function currentCard(container: HTMLElement): HTMLElement {
	const cards = container.querySelectorAll<HTMLElement>('[data-testid="interactive-question"]');
	const card = cards[cards.length - 1];
	if (!card) throw new Error('Aucune question affichée');
	return card;
}

function choose(container: HTMLElement, choiceIndex: number) {
	const choices = currentCard(container).querySelectorAll<HTMLButtonElement>('.choice-button');
	choices[choiceIndex].click();
	flushSync();
}

function clickButton(root: HTMLElement, label: string) {
	const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	if (!found) throw new Error(`Bouton « ${label} » introuvable`);
	found.click();
	flushSync();
}

/** Clique le lien « Quitter » ; rend true si le lien a annulé la navigation */
function clickQuit(container: HTMLElement): boolean {
	const link = [...container.querySelectorAll<HTMLAnchorElement>('a')].find(
		(candidate) => candidate.textContent?.trim() === 'Quitter'
	);
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

describe('TestInteractive — Entraînement', () => {
	beforeEach(() => {
		vi.useFakeTimers({
			toFake: [
				'setTimeout',
				'clearTimeout',
				'Date',
				'requestAnimationFrame',
				'cancelAnimationFrame',
				'performance'
			]
		});
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('chaque question dure SA durée (portée par la question)', async () => {
		const { container } = await open([
			item('Énoncé A', 2),
			item('Énoncé B', 5),
			item('Énoncé C', 2)
		]);
		expect(position(container)).toBe('Question 1 sur 3');

		elapse(2100);
		expect(position(container)).toBe('Question 2 sur 3');

		// B dure 5 s, pas 2 s
		elapse(4000);
		expect(position(container)).toBe('Question 2 sur 3');

		elapse(1200);
		expect(position(container)).toBe('Question 3 sur 3');
	});

	it('validation puis expiration dans les 300 ms : une seule avance', async () => {
		const { container } = await open([
			item('Énoncé A', 2),
			item('Énoncé B', 10),
			item('Énoncé C', 10)
		]);

		elapse(1850);
		choose(container, 1);
		clickButton(currentCard(container), 'Valider');

		// Le chrono de A expire pendant la transition de 300 ms
		elapse(250);
		elapse(200);
		expect(position(container)).toBe('Question 2 sur 3');
	});

	it('Q18 : choix coché mais non validé, juste → compte juste à l’expiration', async () => {
		const { container, onComplete } = await open([item('Énoncé A', 1)]);

		choose(container, 1);
		elapse(1200);

		expect(onComplete).toHaveBeenCalledTimes(1);
		const [answer] = onComplete.mock.calls[0][0].answers;
		expect(answer.isCorrect).toBe(true);
		expect(answer.userAnswer?.value).toBe(1);
		expect(answer.userAnswer?.attempts).toBe(1);
	});

	it('Q18 : choix coché mais non validé, faux → compte faux, réponse gardée', async () => {
		const { container, onComplete } = await open([item('Énoncé A', 1)]);

		choose(container, 0);
		elapse(1200);

		const [answer] = onComplete.mock.calls[0][0].answers;
		expect(answer.isCorrect).toBe(false);
		expect(answer.userAnswer?.value).toBe(0);
		expect(answer.userAnswer?.attempts).toBe(1);
	});

	it('Q18 : rien de coché → compte faux, sans réponse', async () => {
		const { onComplete } = await open([item('Énoncé A', 1)]);

		elapse(1200);

		const [answer] = onComplete.mock.calls[0][0].answers;
		expect(answer.isCorrect).toBe(false);
		expect(answer.userAnswer?.value).toBe('');
		expect(answer.userAnswer?.attempts).toBe(0);
	});

	it('la réponse validée est celle enregistrée, l’expiration ne l’écrase pas', async () => {
		const { container, onComplete } = await open([item('Énoncé A', 1), item('Énoncé B', 1)]);

		elapse(800);
		choose(container, 1);
		clickButton(currentCard(container), 'Valider');
		elapse(400);
		elapse(1200);

		expect(onComplete).toHaveBeenCalledTimes(1);
		const answers = onComplete.mock.calls[0][0].answers;
		expect(answers).toHaveLength(2);
		expect(answers[0].isCorrect).toBe(true);
		expect(answers[1].isCorrect).toBe(false);
	});

	it('« Recommencer » demande de nouvelles questions à la page', async () => {
		const { container, onComplete, onRestart } = await open([item('Énoncé A', 1)]);

		elapse(1200);
		await tick();
		clickButton(container, RESTART);

		expect(onRestart).toHaveBeenCalledTimes(1);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it('en-tête : « Quitter » mène au panier, ou à « Mes contrôles » en évaluation', async () => {
		const quitHref = (container: HTMLElement) =>
			[...container.querySelectorAll<HTMLAnchorElement>('a')]
				.find((link) => link.textContent?.trim() === 'Quitter')
				?.getAttribute('href');

		const training = await open([item('Énoncé A', 10)]);
		expect(quitHref(training.container)).toBe('/automaths/panier');
		await training.unmount();

		const evaluation = await open([item('Énoncé A', 10)], true, true);
		expect(quitHref(evaluation.container)).toBe('/dashboard/student/assessments');
	});

	it('contrôle : « Quitter » demande confirmation (réponses perdues) ; entraînement : non', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

		const evaluation = await open([item('Énoncé A', 10)], true, true, true);
		expect(clickQuit(evaluation.container)).toBe(true);
		expect(confirmSpy).toHaveBeenCalledWith(
			expect.stringContaining('réponses tapées seront perdues')
		);
		await evaluation.unmount();

		confirmSpy.mockClear();
		const training = await open([item('Énoncé A', 10)]);
		expect(clickQuit(training.container)).toBe(false);
		expect(confirmSpy).not.toHaveBeenCalled();
		confirmSpy.mockRestore();
	});

	it('évaluation : ni « Recommencer » ni « Retour au panier », mais « Mes évaluations »', async () => {
		const { container } = await open([item('Énoncé A', 1)], true, true);

		elapse(1200);
		await tick();

		// Le lien « Quitter » de l'en-tête mène aussi à « Mes contrôles » : on cible
		// le lien de l'écran de fin par son texte
		const myAssessments = [...container.querySelectorAll<HTMLAnchorElement>('a')].find((link) =>
			link.textContent?.includes('Mes contrôles')
		);
		expect(myAssessments?.getAttribute('href')).toBe('/dashboard/student/assessments');
		expect(container.textContent).not.toContain(RESTART);
		expect(container.textContent).not.toContain('Retour au panier');
	});

	it('visiteur non connecté : averti que ses réponses ne comptent pas', async () => {
		const { container } = await open([item('Énoncé A', 10)], false);
		expect(container.textContent).toContain(VISITOR_NOTE);
	});

	it('élève connecté : pas d’avertissement', async () => {
		const { container } = await open([item('Énoncé A', 10)], true);
		expect(container.textContent).not.toContain(VISITOR_NOTE);
	});
});
