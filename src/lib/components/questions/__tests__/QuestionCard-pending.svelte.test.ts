/**
 * QuestionCard — réponse en cours validée à l'expiration du chrono (Q18,
 * Entraînement) : `submitPendingAnswer()` valide ce qui est coché comme le
 * bouton « Valider », et rend `null` si rien n'a été commencé.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync } from 'svelte';
import QuestionCard from '../QuestionCard.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

function qcm(): QuestionInstance {
	return {
		templateId: 'tpl-qcm',
		statement: resolvedMarkdown('Combien font 2 + 2 ?'),
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
		correctChoiceIndex: '1'
	} as QuestionInstance;
}

async function open() {
	const onAnswerSubmit = vi.fn();
	const result = await render(QuestionCard, { instance: qcm(), interactive: true, onAnswerSubmit });
	return { ...result, onAnswerSubmit };
}

function choose(container: HTMLElement, index: number) {
	container.querySelectorAll<HTMLButtonElement>('.choice-button')[index].click();
	flushSync();
}

describe('QuestionCard — submitPendingAnswer', () => {
	it('rien de coché : null, la carte reste ouverte', async () => {
		const { component, container } = await open();

		expect(component.submitPendingAnswer()).toBeNull();
		flushSync();
		expect(container.textContent).toContain('Valider');
	});

	it('choix coché : validé comme par le bouton, sans prévenir onAnswerSubmit', async () => {
		const { component, container, onAnswerSubmit } = await open();
		choose(container, 1);

		const answer = component.submitPendingAnswer();

		expect(answer).toMatchObject({ value: 1, isCorrect: true, attempts: 1 });
		expect(onAnswerSubmit).not.toHaveBeenCalled();
		// Carte figée : plus de bouton « Valider », plus de seconde réponse
		flushSync();
		expect(container.textContent).not.toContain('Valider');
		expect(component.submitPendingAnswer()).toBeNull();
	});

	it('réponse déjà validée au bouton : null', async () => {
		const { component, container, onAnswerSubmit } = await open();
		choose(container, 0);
		[...container.querySelectorAll<HTMLButtonElement>('button')]
			.find((b) => b.textContent?.trim() === 'Valider')
			?.click();
		flushSync();

		expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
		expect(component.submitPendingAnswer()).toBeNull();
	});
});
