import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import FlashCard from '../FlashCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import type { AnswerData } from '$lib/types/question-display';
import { resolvedMarkdown, templateMarkdown } from '$lib/ubumark';
import { generateInstance } from '$lib/questions/generator/instance-generator';

/**
 * Carte de cours (#617) : recto = énoncé, verso = correction, sans case.
 * Entraînement libre (QuestionCard) : recto → « Voir la réponse » → verso →
 * auto-évaluation « Je savais / Je ne savais pas », transmise comme réponse.
 */
function card(): QuestionInstance {
	return {
		templateId: 'carte',
		statement: resolvedMarkdown('Que fait-on en premier pour étudier une fonction ?'),
		correction: { steps: [resolvedMarkdown('On détermine son ensemble de définition.')] },
		options: { courseCard: true },
		grades: ['2'],
		theme: 'Fonctions',
		domain: 'Généralités',
		level: 1,
		generatedAt: new Date().toISOString()
	} as QuestionInstance;
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
		b.textContent?.includes(text)
	);
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('carte de cours — entraînement libre (QuestionCard)', () => {
	it('recto seul, puis verso après « Voir la réponse », puis auto-évaluation', async () => {
		const submitted: AnswerData[] = [];
		const { container } = await render(QuestionCard, {
			instance: card(),
			interactive: true,
			onAnswerSubmit: (a: AnswerData) => submitted.push(a)
		});

		// Recto : énoncé visible, verso caché, aucun champ de réponse ni « Valider »
		expect(container.textContent).toContain('Que fait-on en premier');
		expect(container.textContent).not.toContain('ensemble de définition');
		expect(container.textContent).toContain('Carte de cours');
		expect(buttonByText(container, 'Valider')).toBeUndefined();

		buttonByText(container, 'Voir la réponse')?.click();
		await tick();

		// Verso
		expect(container.textContent).toContain('On détermine son ensemble de définition.');
		const knew = buttonByText(container, 'Je savais');
		expect(knew).toBeDefined();
		expect(buttonByText(container, 'Je ne savais pas')).toBeDefined();

		knew?.click();
		await tick();

		expect(submitted).toHaveLength(1);
		expect(submitted[0].isCorrect).toBe(true);
		// Une seule auto-évaluation
		expect(buttonByText(container, 'Je savais')).toBeUndefined();
	});

	it('« Je ne savais pas » transmet un échec', async () => {
		const submitted: AnswerData[] = [];
		const { container } = await render(QuestionCard, {
			instance: card(),
			interactive: true,
			onAnswerSubmit: (a: AnswerData) => submitted.push(a)
		});
		buttonByText(container, 'Voir la réponse')?.click();
		await tick();
		buttonByText(container, 'Je ne savais pas')?.click();
		await tick();
		expect(submitted.map((a) => a.isCorrect)).toEqual([false]);
	});
});

describe('carte de cours — révision SRS (FlashCard)', () => {
	it('le verso montre la correction, pas le repli « Aucune réponse »', async () => {
		const { container } = await render(FlashCard, { instance: card() });
		container.querySelector<HTMLButtonElement>('[aria-label="Voir la correction"]')?.click();
		await tick();
		expect(container.textContent).toContain('On détermine son ensemble de définition.');
		expect(container.textContent).not.toContain('Aucune réponse enregistrée');
		// Verso allégé (2026-09-29) : plus de badge du type, le titre « Verso » identifie la carte de cours
		expect(container.querySelector('.flip-card-back [data-verso-title]')?.textContent?.trim()).toBe(
			'Verso'
		);
	});
});

describe('carte de cours — vue d’ensemble et taille', () => {
	it('non interactive (mode display) : recto seul, sans bouton « Voir la réponse »', async () => {
		const { container } = await render(QuestionCard, { instance: card(), interactive: false });
		expect(container.textContent).toContain('Que fait-on en premier');
		expect(buttonByText(container, 'Voir la réponse')).toBeUndefined();
		expect(container.querySelector('[data-testid="course-card-back"]')).toBeNull();
	});

	it('respecte la taille demandée (sm)', async () => {
		const { container } = await render(QuestionCard, {
			instance: card(),
			interactive: true,
			size: 'sm'
		});
		expect(container.querySelector('[data-testid="course-card"]')?.className).toContain('text-sm');
	});
});

describe('carte de cours — verso en étapes générées (mode B)', () => {
	it('FlashCard affiche les étapes générées au verso', async () => {
		const result = generateInstance(
			{
				id: 'b',
				title: 'B',
				status: 'draft',
				options: { courseCard: true },
				variations: [
					{
						statement: templateMarkdown('Calculer $$12+30$$'),
						correction: { generatedSteps: { kind: 'arithmetic', expression: '12+30' } }
					}
				],
				grades: ['6'],
				theme: 'T',
				domain: 'D',
				level: 1
			},
			1
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const { container } = await render(FlashCard, { instance: result.instance });
		container.querySelector<HTMLButtonElement>('[aria-label="Voir la correction"]')?.click();
		await tick();
		const back = container.querySelector('[data-testid="course-card-back"]');
		expect(back).not.toBeNull();
		expect(back?.textContent ?? '').toContain('42');
	});
});
