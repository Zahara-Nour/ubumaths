/**
 * C17 — page « Séries » : badge « verrouillée », Modifier désactivé si
 * verrouillée, Dupliquer / Supprimer / Créer une évaluation.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const goto = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto
}));

import Page from '../+page.svelte';
import type { SeriesWithUsage } from '$lib/types/evaluation';

const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 4,
	delay: 20
};

function series(overrides: Partial<SeriesWithUsage>): SeriesWithUsage {
	return {
		id: 'serie-libre',
		title: 'Tables de 7',
		description: null,
		grade: '6',
		categories: [ITEM],
		created_by: 'prof',
		created_at: '2026-09-30T10:00:00Z',
		updated_at: '2026-09-30T10:00:00Z',
		locked: false,
		evaluations_count: 0,
		...overrides
	};
}

async function renderPage(list: SeriesWithUsage[]) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, { target: main, props: { data: { series: list } } as never });
}

describe('Page Séries (C17)', () => {
	it('série verrouillée : badge et « Modifier » désactivé ; libre : actif', async () => {
		const { container } = await renderPage([
			series({ id: 'serie-verrouillee', title: 'Verrouillée', locked: true, evaluations_count: 1 }),
			series({ id: 'serie-libre', title: 'Libre' })
		]);

		const cards = container.querySelectorAll('[data-testid="series-card"]');
		expect(cards).toHaveLength(2);
		const [locked, free] = Array.from(cards);

		expect(locked.textContent).toContain('verrouillée');
		expect(free.textContent).not.toContain('verrouillée');

		const editButton = (card: Element) =>
			Array.from(card.querySelectorAll('button')).find((b) => b.textContent?.includes('Modifier'))!;
		expect(editButton(locked).disabled).toBe(true);
		expect(editButton(free).disabled).toBe(false);
	});

	it('chaque série propose Dupliquer, Supprimer, Copier le lien et Créer une évaluation', async () => {
		await renderPage([series({})]);
		for (const label of ['Dupliquer', 'Supprimer', 'Copier le lien', 'Créer une évaluation']) {
			await expect.element(page.getByRole('button', { name: label })).toBeVisible();
		}
	});

	it('« Créer une évaluation » ouvre le formulaire sur CETTE série', async () => {
		await renderPage([series({ id: 'serie-42' })]);
		await page.getByRole('button', { name: 'Créer une évaluation' }).click();
		expect(goto).toHaveBeenCalledWith('/dashboard/teacher/assessments/new?series=serie-42');
	});

	it('aucune série : invitation à composer un panier', async () => {
		await renderPage([]);
		await expect.element(page.getByText("Aucune série pour l'instant.")).toBeVisible();
	});
});
