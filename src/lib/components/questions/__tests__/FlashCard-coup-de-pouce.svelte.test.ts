import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import FlashCard from '../FlashCard.svelte';
import type { QuestionInstance } from '#lib/questions/types.ts';
import { resolvedMarkdown } from '#lib/ubumark/index.ts';

/**
 * Coup de pouce (idée 5 du chantier `idees-format`, phase 0 validée le
 * 2026-11-22) : bouton « Coup de pouce » sous l'énoncé quand la forme le permet
 * (`showHint`) et que la variation a un indice ; un clic l'ouvre, il reste
 * ouvert ; la forme est prévenue (trace « avec indice », demi-réussite).
 */
function question(overrides: Partial<QuestionInstance> = {}): QuestionInstance {
	return {
		templateId: 'test',
		statement: resolvedMarkdown('Combien font $8 \\times 7$ ?'),
		hint: resolvedMarkdown('Pense à $8 \\times 5 = 40$, puis ajoute $8 \\times 2$.'),
		grades: ['5'],
		level: 1,
		generatedAt: new Date().toISOString(),
		...overrides
	} as unknown as QuestionInstance;
}

const BOUTON = 'Coup de pouce';

describe('FlashCard — coup de pouce', () => {
	it('fermé au départ : bouton visible, indice caché', async () => {
		const { container } = await render(FlashCard, { instance: question(), showHint: true });
		await expect.element(page.getByRole('button', { name: BOUTON })).toBeVisible();
		expect(container.querySelector('[data-testid="hint"]')).toBeNull();
	});

	it('un clic ouvre l’indice, prévient la forme une fois, et il reste ouvert', async () => {
		const onHintOpen = vi.fn();
		const { container } = await render(FlashCard, {
			instance: question(),
			showHint: true,
			onHintOpen
		});
		await page.getByRole('button', { name: BOUTON }).click();

		await expect.poll(() => container.querySelector('[data-testid="hint"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="hint"]')?.textContent).toContain('ajoute');
		expect(onHintOpen).toHaveBeenCalledTimes(1);
		// Ouvert pour de bon : plus de bouton pour le refermer
		expect(container.querySelector('[data-testid="hint-button"]')).toBeNull();
	});

	it('forme sans coup de pouce (showHint absent) : aucun bouton', async () => {
		const { container } = await render(FlashCard, { instance: question() });
		await expect.element(page.getByText('Combien font')).toBeVisible();
		expect(container.querySelector('[data-testid="hint-button"]')).toBeNull();
	});

	it('variation sans indice : aucun bouton', async () => {
		const { container } = await render(FlashCard, {
			instance: question({ hint: undefined }),
			showHint: true
		});
		await expect.element(page.getByText('Combien font')).toBeVisible();
		expect(container.querySelector('[data-testid="hint-button"]')).toBeNull();
	});

	it('carte de cours : aucun bouton', async () => {
		const { container } = await render(FlashCard, {
			instance: question({ options: { courseCard: true } } as Partial<QuestionInstance>),
			showHint: true
		});
		await expect.element(page.getByText('Combien font')).toBeVisible();
		expect(container.querySelector('[data-testid="hint-button"]')).toBeNull();
	});
});
