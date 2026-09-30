/**
 * QCM mélangé : le clic de l'élève porte sur une position AFFICHÉE
 * =================================================================
 *
 * Bug de production (2026-10-01) : QuestionCard et FlashCard transmettaient à
 * `validateAnswer` la position cliquée, alors que la validation compare à des
 * indices d'ORIGINE. Le bon choix affiché était refusé ; un mauvais choix placé
 * à la position qui porte l'indice d'origine du bon était accepté.
 *
 * Décor : affiché [Lyon, Paris, Nice, Marseille], origine [Paris, Marseille, Lyon, Nice].
 * Lyon (affiché en A, position 0) occupe la position de l'indice d'origine de Paris (0).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import QuestionCard from '../QuestionCard.svelte';
import FlashCard from '../FlashCard.svelte';
import QuestionPreview from '$lib/components/QuestionPreview.svelte';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { AnswerData } from '$lib/types/question-display';
import { resolvedMarkdown, templateMarkdown } from '$lib/ubumark';

const ORIGINAL = ['Paris', 'Marseille', 'Lyon', 'Nice'];

function qcm(correct: string | string[], multipleAnswers = false): QuestionInstance {
	const correctSet = new Set([correct].flat().map(Number));
	return {
		templateId: 'qcm-test',
		statement: resolvedMarkdown('Quelle ville ?'),
		grades: ['6'],
		theme: 'Culture',
		domain: 'Géographie',
		level: 1,
		generatedAt: new Date().toISOString(),
		choices: ORIGINAL.map((c, i) => ({
			content: resolvedMarkdown(c),
			isCorrect: correctSet.has(i)
		})),
		shuffledChoices: [
			{ content: resolvedMarkdown('Lyon'), originalIndex: 2 },
			{ content: resolvedMarkdown('Paris'), originalIndex: 0 },
			{ content: resolvedMarkdown('Nice'), originalIndex: 3 },
			{ content: resolvedMarkdown('Marseille'), originalIndex: 1 }
		],
		correctChoiceIndex: correct,
		multipleAnswers
	} as QuestionInstance;
}

type Card = typeof QuestionCard | typeof FlashCard;

async function answer(card: Card, instance: QuestionInstance, clicks: string[]) {
	const onAnswerSubmit = vi.fn<(answer: AnswerData) => void>();
	// Décor réel : les pages placent la carte dans <main>
	const main = document.body.appendChild(document.createElement('main'));
	const screen = await render(card, {
		target: main,
		props: { instance, interactive: true, onAnswerSubmit }
	});
	for (const city of clicks) {
		await page.getByRole('button', { name: city }).click();
	}
	await page.getByRole('button', { name: 'Valider' }).click();
	expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
	return { data: onAnswerSubmit.mock.calls[0][0], container: screen.container };
}

describe.each([
	['QuestionCard', QuestionCard],
	['FlashCard', FlashCard]
] as const)('%s — QCM à choix mélangés', (_name, card) => {
	it('le bon choix affiché (Paris, en B) est accepté, et enregistré en indice d’origine', async () => {
		const { data } = await answer(card, qcm('0'), ['Paris']);
		expect(data.isCorrect).toBe(true);
		expect(data.value).toBe(0);
	});

	it('un mauvais choix à la position de l’indice d’origine du bon (Lyon, en A) est refusé', async () => {
		const { data } = await answer(card, qcm('0'), ['Lyon']);
		expect(data.isCorrect).toBe(false);
		expect(data.value).toBe(2);
	});

	it('réponses multiples : les bons choix affichés (Paris, Nice) sont acceptés', async () => {
		const { data } = await answer(card, qcm(['0', '3'], true), ['Paris', 'Nice']);
		expect(data.isCorrect).toBe(true);
		expect([...(data.value as number[])].sort()).toEqual([0, 3]);
	});

	it('réponses multiples : les mauvais choix placés en A et D (Lyon, Marseille) sont refusés', async () => {
		const { data } = await answer(card, qcm(['0', '3'], true), ['Lyon', 'Marseille']);
		expect(data.isCorrect).toBe(false);
	});
});

describe('FlashCard — correction affichée après une erreur', () => {
	it('la lettre désigne la position affichée du bon choix (B), et le marque juste', async () => {
		const { container } = await answer(FlashCard, qcm('0'), ['Lyon']);
		expect(container.textContent).toContain('Le choix correct est: B');

		const buttons = [...container.querySelectorAll<HTMLButtonElement>('.choice-button')];
		const correct = buttons.filter((b) => b.classList.contains('correct'));
		expect(correct.map((b) => b.textContent?.trim())).toEqual([expect.stringContaining('Paris')]);
		const lyon = buttons.find((b) => b.textContent?.includes('Lyon'));
		expect(lyon?.classList.contains('incorrect')).toBe(true);
	});
});

describe('QuestionPreview (éditeur de modèle) — bon choix mis en évidence', () => {
	it('surligne Paris à sa position affichée (D), pas le choix affiché en A', async () => {
		// Graine 2000 (Math.random = 0,002) : affiché [Lyon, Nice, Marseille, Paris]
		const random = vi.spyOn(Math, 'random').mockReturnValue(0.002);
		const template: QuestionTemplate = {
			id: 'qcm-capitale',
			title: 'Capitale',
			status: 'draft',
			grades: ['6'],
			theme: 'Culture',
			domain: 'Géographie',
			level: 1,
			variations: [
				{
					statement: templateMarkdown('Capitale de la France ?'),
					choices: ORIGINAL.map((c) => ({ content: templateMarkdown(c) })),
					correctChoiceIndex: '0'
				}
			]
		};
		try {
			const main = document.body.appendChild(document.createElement('main'));
			const { container } = await render(QuestionPreview, { target: main, props: { template } });

			await expect.poll(() => container.querySelectorAll('.border-green-500').length).toBe(1);
			const highlighted = container.querySelector('.border-green-500')?.textContent ?? '';
			expect(highlighted).toContain('Paris');
			expect(highlighted).toContain('D');
		} finally {
			random.mockRestore();
		}
	});
});
