/**
 * MultipleChoiceInput — indicateur rond / case dans chaque choix (Q109 a)
 * ======================================================================
 *
 * Les choix restent des boutons, avec un indicateur décoratif (`aria-hidden`) :
 * rond ○ / ● pour une réponse unique, case ☐ / ☑ pour plusieurs. L'état est
 * porté par le bouton : `role="radio"` dans un `radiogroup`, ou
 * `role="checkbox"`, avec `aria-checked`. Clavier : Tab, Espace / Entrée,
 * flèches pour passer d'un choix à l'autre.
 */

import { page, userEvent } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MultipleChoiceInput from '../MultipleChoiceInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';

const choices = ['2', '3', '4'].map((content, originalIndex) => ({
	content: content as ResolvedMarkdown,
	originalIndex,
	isCorrect: originalIndex !== 1
}));

/** Indicateur (décoratif) du choix `index` */
function indicator(container: HTMLElement, index: number): string | null {
	const buttons = container.querySelectorAll('.choice-button');
	const mark = buttons[index]?.querySelector('[data-indicator]');
	expect(mark?.getAttribute('aria-hidden')).toBe('true');
	return mark?.getAttribute('data-indicator') ?? null;
}

describe('réponse unique : rond', () => {
	it('boutons radio dans un radiogroup, ronds vides au départ', async () => {
		const { container } = await render(MultipleChoiceInput, { props: { choices } });
		await expect.element(page.getByRole('radiogroup')).toBeVisible();
		const radios = page.getByRole('radio');
		expect(radios.elements()).toHaveLength(3);
		for (const radio of radios.elements()) expect(radio.getAttribute('aria-checked')).toBe('false');
		expect([0, 1, 2].map((i) => indicator(container, i))).toEqual(['circle', 'circle', 'circle']);
		expect(page.getByRole('checkbox').elements()).toHaveLength(0);
	});

	it('clic : un seul rond plein, aria-checked suit', async () => {
		const { container } = await render(MultipleChoiceInput, { props: { choices } });
		await page.getByRole('radio').nth(1).click();
		await page.getByRole('radio').nth(2).click();
		const checked = page
			.getByRole('radio')
			.elements()
			.map((r) => r.getAttribute('aria-checked'));
		expect(checked).toEqual(['false', 'false', 'true']);
		expect([0, 1, 2].map((i) => indicator(container, i))).toEqual([
			'circle',
			'circle',
			'circle-dot'
		]);
	});

	it('clavier : Tab, flèche vers le bas, Espace', async () => {
		await render(MultipleChoiceInput, { props: { choices } });
		await userEvent.tab();
		expect(document.activeElement).toBe(page.getByRole('radio').nth(0).element());
		await userEvent.keyboard('{ArrowDown}');
		expect(document.activeElement).toBe(page.getByRole('radio').nth(1).element());
		await userEvent.keyboard(' ');
		await expect.element(page.getByRole('radio').nth(1)).toHaveAttribute('aria-checked', 'true');
		await userEvent.keyboard('{ArrowUp}');
		expect(document.activeElement).toBe(page.getByRole('radio').nth(0).element());
	});
});

describe('plusieurs réponses : case', () => {
	it('cases à cocher, deux cochées : aria-checked et cases cochées', async () => {
		const { container } = await render(MultipleChoiceInput, {
			props: { choices, multipleAnswers: true }
		});
		expect(page.getByRole('radio').elements()).toHaveLength(0);
		await page.getByRole('checkbox').nth(0).click();
		await page.getByRole('checkbox').nth(2).click();
		const checked = page
			.getByRole('checkbox')
			.elements()
			.map((c) => c.getAttribute('aria-checked'));
		expect(checked).toEqual(['true', 'false', 'true']);
		expect([0, 1, 2].map((i) => indicator(container, i))).toEqual([
			'square-check',
			'square',
			'square-check'
		]);
	});

	it('clavier : Entrée coche puis décoche', async () => {
		await render(MultipleChoiceInput, { props: { choices, multipleAnswers: true } });
		await userEvent.tab();
		await userEvent.keyboard('{Enter}');
		await expect.element(page.getByRole('checkbox').nth(0)).toHaveAttribute('aria-checked', 'true');
		await userEvent.keyboard('{Enter}');
		await expect
			.element(page.getByRole('checkbox').nth(0))
			.toHaveAttribute('aria-checked', 'false');
	});
});

describe('en correction (showValidation)', () => {
	it('les choix cochés gardent leur indicateur plein', async () => {
		const { container } = await render(MultipleChoiceInput, {
			props: {
				choices,
				multipleAnswers: true,
				selectedIndexes: [0, 1],
				disabled: true,
				showValidation: true
			}
		});
		expect([0, 1, 2].map((i) => indicator(container, i))).toEqual([
			'square-check',
			'square-check',
			'square'
		]);
		expect(
			page
				.getByRole('checkbox')
				.elements()
				.map((c) => c.getAttribute('aria-checked'))
		).toEqual(['true', 'true', 'false']);
	});
});
