/**
 * Forme « Flash-cards » d'une série (spécification de David, 2026-09-30) :
 * une carte à la fois, l'élève la retourne puis dit s'il avait trouvé.
 * Sans chrono ; bilan « k cartes trouvées sur n » à la fin.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync, tick } from 'svelte';
import FlashSeries from '../FlashSeries.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import type { TestResult } from '$lib/types/test';
import { resolvedMarkdown } from '$lib/ubumark';

const FOUND = "J'avais trouvé";
const NOT_FOUND = "Je n'avais pas trouvé";
const REVIEW = "Revoir celles que je n'avais pas trouvées";

function makeInstance(statement: string, courseCard = false): QuestionInstance {
	return {
		templateId: `tpl-${statement}`,
		statement: resolvedMarkdown(statement),
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Calcul',
		level: 1,
		generatedAt: new Date().toISOString(),
		correction: { steps: [resolvedMarkdown(`Correction de ${statement}`)] },
		...(courseCard ? { options: { courseCard: true } } : {})
	} as QuestionInstance;
}

function threeCards(): QuestionInstance[] {
	return [makeInstance('Énoncé A'), makeInstance('Énoncé B'), makeInstance('Énoncé C')];
}

async function open(instances: QuestionInstance[], isLoggedIn = true) {
	const onComplete = vi.fn<(result: TestResult) => void>();
	const onRestart = vi.fn();
	const onBack = vi.fn();
	const result = await render(FlashSeries, {
		instances,
		isLoggedIn,
		onComplete,
		onRestart,
		onBack
	});
	flushSync();
	await tick();
	return { ...result, onComplete, onRestart, onBack };
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) =>
			candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label
	);
}

async function click(container: HTMLElement, label: string) {
	const found = findButton(container, label);
	if (!found) throw new Error(`Bouton « ${label} » introuvable`);
	found.click();
	flushSync();
	await tick();
}

/** Visible pour de vrai : présent, non masqué, avec une surface à l'écran */
function isVisible(element: HTMLElement | undefined): boolean {
	if (!element) return false;
	const rect = element.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
}

function currentStatement(container: HTMLElement): string {
	return container.querySelector('[data-testid="flash-card"]')?.textContent ?? '';
}

/** Retourne la carte puis donne l'auto-évaluation */
async function answer(container: HTMLElement, found: boolean) {
	await click(container, 'Voir la correction');
	await click(container, found ? FOUND : NOT_FOUND);
}

describe('FlashSeries — une carte à la fois', () => {
	it('affiche la première carte, au recto, avec sa position', async () => {
		const { container } = await open(threeCards());

		expect(currentStatement(container)).toContain('Énoncé A');
		expect(container.querySelector('[data-testid="flash-position"]')?.textContent?.trim()).toBe(
			'Carte 1 / 3'
		);
	});

	it('avant retournement : pas de boutons d’auto-évaluation, une consigne', async () => {
		const { container } = await open(threeCards());

		expect(isVisible(findButton(container, FOUND))).toBe(false);
		expect(isVisible(findButton(container, NOT_FOUND))).toBe(false);
		expect(container.textContent).toContain('Retourne la carte pour voir la réponse');
	});

	it('après retournement : les deux boutons sont visibles et actifs', async () => {
		const { container } = await open(threeCards());

		await click(container, 'Voir la correction');

		for (const label of [FOUND, NOT_FOUND]) {
			const button = findButton(container, label);
			expect(isVisible(button), label).toBe(true);
			expect(button?.disabled, label).toBe(false);
		}
	});

	it('« J’avais trouvé » passe à la carte suivante, au recto', async () => {
		const { container } = await open(threeCards());

		await answer(container, true);

		expect(currentStatement(container)).toContain('Énoncé B');
		expect(container.querySelector('[data-testid="flash-position"]')?.textContent?.trim()).toBe(
			'Carte 2 / 3'
		);
		// Nouvelle carte : de nouveau au recto, boutons masqués
		expect(isVisible(findButton(container, FOUND))).toBe(false);
		expect(findButton(container, 'Voir la correction')).toBeDefined();
	});

	it('pas de chrono affiché', async () => {
		const { container } = await open(threeCards());
		expect(container.querySelector('[data-testid="timer"]')).toBeNull();
		expect(container.textContent).not.toMatch(/\d+\s*s\b/);
	});
});

describe('FlashSeries — fin de série', () => {
	it('bilan « k cartes trouvées sur n » et onComplete appelé une fois', async () => {
		const { container, onComplete } = await open(threeCards());

		await answer(container, true);
		await answer(container, false);
		await answer(container, true);

		expect(container.querySelector('[data-testid="flash-summary"]')?.textContent).toContain(
			'2 cartes trouvées sur 3'
		);
		expect(onComplete).toHaveBeenCalledTimes(1);
		const result = onComplete.mock.calls[0][0];
		expect(result).toMatchObject({
			mode: 'flash',
			totalQuestions: 3,
			correctAnswers: 2
		});
		expect(result.answers.map((a) => [a.instance.statement, a.isCorrect, a.attempts])).toEqual([
			[resolvedMarkdown('Énoncé A'), true, 1],
			[resolvedMarkdown('Énoncé B'), false, 1],
			[resolvedMarkdown('Énoncé C'), true, 1]
		]);
		expect(result.answers.every((a) => typeof a.timeSpent === 'number')).toBe(true);
	});

	it('une carte de cours suit la même mécanique mais reste hors du bilan', async () => {
		const instances = [makeInstance('Énoncé A'), makeInstance('Rappel', true)];
		const { container, onComplete } = await open(instances);

		await answer(container, false);
		expect(currentStatement(container)).toContain('Rappel');
		await answer(container, true);

		const summary = container.querySelector('[data-testid="flash-summary"]')?.textContent ?? '';
		expect(summary).toContain('0 carte trouvée sur 1');
		expect(summary).toContain('1 carte de cours révisée');
		expect(onComplete.mock.calls[0][0]).toMatchObject({
			totalQuestions: 2,
			correctAnswers: 0,
			reviewedCards: 1
		});
	});

	it('« Revoir celles… » ne rejoue que les cartes ratées, sans nouvel onComplete', async () => {
		const { container, onComplete } = await open(threeCards());

		await answer(container, true);
		await answer(container, false);
		await answer(container, true);
		await click(container, REVIEW);

		expect(currentStatement(container)).toContain('Énoncé B');
		expect(container.querySelector('[data-testid="flash-position"]')?.textContent?.trim()).toBe(
			'Carte 1 / 1'
		);
		await answer(container, true);

		expect(container.querySelector('[data-testid="flash-summary"]')?.textContent).toContain(
			'1 carte trouvée sur 1'
		);
		expect(onComplete).toHaveBeenCalledTimes(1);
		// Tout est trouvé : plus rien à revoir
		expect(findButton(container, REVIEW)).toBeUndefined();
	});

	it('« Recommencer avec de nouvelles questions » et « Retour au panier »', async () => {
		const { container, onRestart, onBack } = await open([makeInstance('Énoncé A')]);

		await answer(container, false);
		await click(container, 'Recommencer avec de nouvelles questions');
		expect(onRestart).toHaveBeenCalledTimes(1);
		await click(container, 'Retour au panier');
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});

describe('FlashSeries — visiteur non connecté', () => {
	const MESSAGE = 'Connecte-toi pour que tes réponses comptent dans tes révisions';

	it('affiche le message et la série reste utilisable', async () => {
		const { container } = await open(threeCards(), false);

		const message = [...container.querySelectorAll<HTMLElement>('p')].find((p) =>
			p.textContent?.includes(MESSAGE)
		);
		expect(isVisible(message)).toBe(true);
		await answer(container, true);
		expect(currentStatement(container)).toContain('Énoncé B');
	});

	it('pas de message pour un élève connecté', async () => {
		const { container } = await open(threeCards(), true);
		expect(container.textContent).not.toContain(MESSAGE);
	});
});
