/**
 * ClassRegularityGrid : grille de régularité (chantier `regularite`, N2, N4, E1).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lore } from '$lib/config/lore';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ClassRegularityGrid from '../ClassRegularityGrid.svelte';

const GRID = {
	weeks: [
		{ start: '2026-10-12', holiday: false },
		{ start: '2026-10-19', holiday: true },
		{ start: '2026-10-26', holiday: false }
	],
	students: [
		{ id: 's1', display_name: 'Alice', tiers: [2, 0, 3] },
		{ id: 's2', display_name: 'Bob', tiers: [0, 1, 0] }
	]
};

describe('ClassRegularityGrid', () => {
	let originalFetch: typeof globalThis.fetch;
	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	function mockFetch(payload: unknown, ok = true) {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok,
			status: ok ? 200 : 500,
			json: async () => payload
		} as Response);
	}

	it('lit la grille de la classe', async () => {
		mockFetch(GRID);
		await render(ClassRegularityGrid, { classId: 'class-1' });
		await expect.element(page.getByText('Alice', { exact: true })).toBeVisible();
		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/teacher/classes/class-1/analytics/regularity'
		);
	});

	it('N2 : une case dit le palier, jamais un nombre exact', async () => {
		mockFetch(GRID);
		await render(ClassRegularityGrid, { classId: 'class-1' });
		const cell = page.getByTitle('Alice — semaine du 12 oct. : 2 à 3 jours actifs');
		await expect.element(cell).toBeInTheDocument();
		await expect
			.element(page.getByTitle('Alice — semaine du 26 oct. : 4 jours actifs ou plus'))
			.toBeInTheDocument();
		await expect
			.element(page.getByTitle('Bob — semaine du 12 oct. : aucun jour actif'))
			.toBeInTheDocument();
	});

	it('N2 : l’appui sur une case affiche son palier (téléphone)', async () => {
		mockFetch(GRID);
		await render(ClassRegularityGrid, { classId: 'class-1' });
		await page.getByTitle('Bob — semaine du 19 oct. (vacances) : 1 jour actif').click();
		await expect
			.element(
				page.getByText('Bob — semaine du 19 oct. (vacances) : 1 jour actif', { exact: true }).last()
			)
			.toBeVisible();
	});

	it('N4 : la semaine de vacances porte le repère', async () => {
		mockFetch(GRID);
		await render(ClassRegularityGrid, { classId: 'class-1' });
		await expect
			.element(page.getByTitle('semaine du 19 oct. (vacances)', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(page.getByTitle('semaine du 12 oct.', { exact: true }))
			.not.toBeInTheDocument();
	});

	it('masque les noms en mode projection', async () => {
		mockFetch(GRID);
		await render(ClassRegularityGrid, { classId: 'class-1', anonymized: true });
		await expect
			.element(page.getByText(`${lore.entities.student} 1`, { exact: true }))
			.toBeVisible();
		await expect.element(page.getByText('Alice', { exact: true })).not.toBeInTheDocument();
	});

	it('classe vide', async () => {
		mockFetch({ weeks: GRID.weeks, students: [] });
		await render(ClassRegularityGrid, { classId: 'class-1' });
		await expect
			.element(page.getByText(`Aucun ${lore.entities.student} dans cette classe.`))
			.toBeVisible();
	});

	it('E1 : chargement en échec → message dans le cadre', async () => {
		mockFetch({ error: 'boom' }, false);
		await render(ClassRegularityGrid, { classId: 'class-1' });
		await expect.element(page.getByRole('alert')).toHaveTextContent('boom');
		await expect.element(page.getByText('Régularité', { exact: true })).toBeVisible();
	});
});
