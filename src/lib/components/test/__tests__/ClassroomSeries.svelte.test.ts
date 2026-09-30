/**
 * Forme « En classe » d'une série : projection des questions une à une
 * (UbuSlides), minuteur par catégorie, grilles de fin.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { flushSync, tick } from 'svelte';
import ClassroomSeries from '../ClassroomSeries.svelte';
import type { ClassroomItem } from '$lib/types/test';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

function makeInstance(statement: string): QuestionInstance {
	return {
		templateId: `tpl-${statement}`,
		statement: resolvedMarkdown(statement),
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Calcul',
		level: 1,
		generatedAt: new Date().toISOString(),
		correction: { steps: [resolvedMarkdown(`Correction de ${statement}`)] }
	} as QuestionInstance;
}

function item(statement: string, delaySeconds: number, categoryKey: string): ClassroomItem {
	return { instance: makeInstance(statement), delaySeconds, categoryKey };
}

// Trois questions : A et C dans la catégorie x, B dans y
function threeItems(): ClassroomItem[] {
	return [item('Énoncé A', 10, 'x'), item('Énoncé B', 10, 'y'), item('Énoncé C', 10, 'x')];
}

async function open(items: ClassroomItem[]) {
	const onBack = vi.fn();
	const onRestart = vi.fn();
	const result = await render(ClassroomSeries, { items, onBack, onRestart });
	flushSync();
	await tick();
	return { ...result, onBack, onRestart };
}

// Avance le temps simulé puis laisse les effets du Deck s'exécuter
function elapse(ms: number) {
	vi.advanceTimersByTime(ms);
	flushSync();
}

function activeSlideText(container: HTMLElement): string {
	return container.querySelector('.slide.active')?.textContent ?? '';
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
	const found = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) =>
			candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label
	);
	if (!found) throw new Error(`Bouton « ${label} » introuvable`);
	return found;
}

function click(container: HTMLElement, label: string) {
	button(container, label).click();
	flushSync();
}

function text(container: HTMLElement, testId: string): string {
	return container.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? '';
}

describe('ClassroomSeries — projection', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('une diapositive par question, la première affichée', async () => {
		const { container } = await open(threeItems());

		expect(container.querySelectorAll('.slide')).toHaveLength(3);
		expect(activeSlideText(container)).toContain('Énoncé A');
	});

	it('ne propose pas de voir la correction pendant la projection', async () => {
		const { container } = await open(threeItems());

		expect(container.querySelector('[aria-label="Voir la correction"]')).toBeNull();
		expect(container.querySelector('.flip-button')).toBeNull();
	});

	it('affiche « Question i / n » et le temps restant en secondes', async () => {
		const { container } = await open(threeItems());

		expect(text(container, 'classroom-position')).toBe('Question 1 / 3');
		expect(text(container, 'classroom-remaining')).toBe('10');

		elapse(3000);
		expect(text(container, 'classroom-remaining')).toBe('7');
	});

	it('chaque question dure le délai de son item', async () => {
		const items = [item('Énoncé A', 4, 'x'), item('Énoncé B', 12, 'y'), item('Énoncé C', 4, 'x')];
		const { container } = await open(items);

		elapse(3999);
		expect(activeSlideText(container)).toContain('Énoncé A');
		elapse(1);
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(text(container, 'classroom-position')).toBe('Question 2 / 3');

		elapse(11_999);
		expect(activeSlideText(container)).toContain('Énoncé B');
		elapse(1);
		expect(activeSlideText(container)).toContain('Énoncé C');
	});

	it('+5 s allonge la question courante et les suivantes de la même catégorie seulement', async () => {
		const { container } = await open(threeItems());
		elapse(2000);

		click(container, 'Augmenter la durée de 5 secondes');
		// Pas de remise à zéro : 8 s restantes + 5 s
		expect(text(container, 'classroom-remaining')).toBe('13');
		expect(text(container, 'classroom-duration')).toBe('15 s');

		elapse(12_999);
		expect(activeSlideText(container)).toContain('Énoncé A');
		elapse(1);
		// B (catégorie y) garde 10 s
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(text(container, 'classroom-duration')).toBe('10 s');

		elapse(10_000);
		// C (catégorie x) hérite des 15 s
		expect(activeSlideText(container)).toContain('Énoncé C');
		expect(text(container, 'classroom-duration')).toBe('15 s');
		expect(text(container, 'classroom-remaining')).toBe('15');
	});

	it('−5 s raccourcit la catégorie, sans descendre sous 5 s', async () => {
		const { container } = await open(threeItems());

		click(container, 'Réduire la durée de 5 secondes');
		expect(text(container, 'classroom-duration')).toBe('5 s');
		expect(button(container, 'Réduire la durée de 5 secondes').disabled).toBe(true);

		click(container, 'Réduire la durée de 5 secondes');
		expect(text(container, 'classroom-duration')).toBe('5 s');

		elapse(5000);
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(text(container, 'classroom-duration')).toBe('10 s');
	});

	it('le bouton pause gèle le minuteur, la reprise repart du temps restant', async () => {
		const { container } = await open(threeItems());
		elapse(4000);

		click(container, 'Mettre en pause');
		elapse(60_000);
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(text(container, 'classroom-remaining')).toBe('6');

		click(container, 'Reprendre');
		elapse(6000);
		expect(activeSlideText(container)).toContain('Énoncé B');
	});

	it('Espace met en pause au lieu de passer à la question suivante', async () => {
		const { container } = await open(threeItems());
		const deckElement = container.querySelector<HTMLElement>('.deck-wrapper');
		deckElement?.focus();

		await userEvent.keyboard(' ');
		flushSync();
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(button(container, 'Reprendre')).toBeTruthy();

		elapse(60_000);
		expect(activeSlideText(container)).toContain('Énoncé A');
	});

	it('propose le plein écran et le retour au panier pendant la projection', async () => {
		const { container, onBack } = await open(threeItems());

		expect(button(container, 'Plein écran')).toBeTruthy();
		click(container, 'Retour au panier');
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});

describe('ClassroomSeries — fin de série', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	async function openFinished() {
		const opened = await open([item('Énoncé A', 5, 'x'), item('Énoncé B', 5, 'y')]);
		elapse(5000);
		elapse(5000);
		await tick();
		return opened;
	}

	it('montre d’abord la grille numérotée des questions, sans correction', async () => {
		const { container } = await openFinished();

		expect(container.querySelector('.slide')).toBeNull();
		const grid = container.querySelector('[data-testid="classroom-questions-grid"]');
		expect(grid).not.toBeNull();
		expect(grid?.textContent).toContain('Question 1');
		expect(grid?.textContent).toContain('Énoncé A');
		expect(grid?.textContent).toContain('Question 2');
		expect(grid?.textContent).toContain('Énoncé B');
		expect(container.querySelector('[data-testid="classroom-corrections-grid"]')).toBeNull();
		expect(container.querySelector('[aria-label="Voir la correction"]')).toBeNull();
	});

	it('va à la grille des corrections puis revient aux questions', async () => {
		const { container } = await openFinished();

		click(container, 'Voir les corrections');
		const corrections = container.querySelector('[data-testid="classroom-corrections-grid"]');
		expect(corrections).not.toBeNull();
		expect(corrections?.textContent).toContain('Question 1');
		expect(corrections?.textContent).toContain('Question 2');
		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).toBeNull();

		click(container, 'Voir les questions');
		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="classroom-corrections-grid"]')).toBeNull();
	});

	it('« Recommencer » appelle onRestart et relance la projection', async () => {
		const { container, onRestart } = await openFinished();

		click(container, 'Recommencer');
		await tick();
		expect(onRestart).toHaveBeenCalledTimes(1);
		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).toBeNull();
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(text(container, 'classroom-position')).toBe('Question 1 / 2');
	});

	it('« Retour au panier » appelle onBack', async () => {
		const { container, onBack } = await openFinished();

		click(container, 'Retour au panier');
		expect(onBack).toHaveBeenCalledTimes(1);
	});

	/**
	 * Correctifs vus en capture (2026-09-30) : la grille des corrections passait
	 * par `CorrectionCard`, qui affiche « undefined » pour une question à trous ;
	 * elle montre désormais le verso de la flash-card. Les deux grilles ont des
	 * cartes de même hauteur (celle des tuiles).
	 */
	it('grille des corrections : la réponse attendue d’une question à trou, jamais « undefined »', async () => {
		const withBlank = item('Calcule 2 × 80.', 5, 'x');
		withBlank.instance.blanks = [
			{ expectedAnswer: '160', expectedAnswerLatex: '160', type: 'math' }
		] as QuestionInstance['blanks'];
		const { container } = await open([withBlank]);
		elapse(5000);
		await tick();

		click(container, 'Voir les corrections');
		const corrections = container.querySelector<HTMLElement>(
			'[data-testid="classroom-corrections-grid"]'
		);
		const answer = corrections?.querySelector<HTMLElement>('.flip-card-back [data-single-answer]');
		expect(answer?.textContent).toContain('160');
		expect(corrections?.textContent).not.toContain('undefined');
		// Le verso est la face montrée (non inerte)
		expect(corrections?.querySelector<HTMLElement>('.flip-card-back')?.inert).toBe(false);
	});

	it('les cartes des deux grilles ont la même hauteur', async () => {
		const { container } = await openFinished();
		const heights = () =>
			[...container.querySelectorAll<HTMLElement>('.flip-card')].map((card) => card.style.height);

		expect(new Set(heights()).size).toBe(1);
		expect(heights()[0]).not.toBe('');

		click(container, 'Voir les corrections');
		expect(new Set(heights()).size).toBe(1);
		expect(heights()[0]).not.toBe('');
	});
});
