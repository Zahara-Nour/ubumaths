/**
 * FlashCard — couleur des cases au recto
 * ======================================
 *
 * Chaque case prend le verdict détaillé du validateur (celui du verso) : juste,
 * juste mais perfectible (ambre), fausse. Avant, une comparaison textuelle
 * rendait rouge toute bonne réponse d'une case à unité (`6m` pour `6[m]`).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { flushSync, tick } from 'svelte';
import FlashCard from '../FlashCard.svelte';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';
import type { MathfieldElement } from 'mathlive';

function instanceWith(blank: InstanceBlank): QuestionInstance {
	return {
		templateId: 'couleurs',
		statement: resolvedMarkdown('Réponds : $\\placeholder[0]{}$'),
		blanks: [blank],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	} as QuestionInstance;
}

let mains: HTMLElement[] = [];
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

const front = (c: HTMLElement) => c.querySelector('.flip-card-front') as HTMLElement;

async function answer(instance: QuestionInstance, keys: string) {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	const { container } = await render(FlashCard, {
		target: main,
		props: { instance, interactive: true, showCorrectionOnWrong: false } as never
	});
	await expect.poll(() => front(container).querySelector('math-field')).toBeTruthy();
	const field = front(container).querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
	await userEvent.keyboard(keys);
	await expect.poll(() => field.getPromptValue('0')).not.toBe('');
	const button = [...front(container).querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === 'Valider'
	);
	button!.click();
	flushSync();
	await tick();
	return { container, field };
}

describe('FlashCard — couleur des cases', () => {
	it('case à unité, bonne réponse : juste (plus rouge)', async () => {
		const { container } = await answer(
			instanceWith({ expectedAnswer: '6[m]', type: 'math', unit: { expected: true } }),
			'6m'
		);
		await expect.poll(() => front(container).textContent ?? '').toContain('Case 1 : juste');
		expect(front(container).textContent).not.toContain('Case 1 : fausse');
	});

	it('case exacte, fraction non simplifiée : ambre « forme à améliorer »', async () => {
		const { container, field } = await answer(
			instanceWith({ expectedAnswer: '\\frac{1}{2}', type: 'math' }),
			'2/4'
		);
		await expect
			.poll(() => front(container).textContent ?? '')
			.toContain('Case 1 : forme à améliorer');
		expect(field.dataset.unoptimalPrompts).toBe('0');
	});

	it('case à unité, mauvaise valeur : fausse', async () => {
		const { container } = await answer(
			instanceWith({ expectedAnswer: '6[m]', type: 'math', unit: { expected: true } }),
			'7m'
		);
		await expect.poll(() => front(container).textContent ?? '').toContain('Case 1 : fausse');
	});
});
