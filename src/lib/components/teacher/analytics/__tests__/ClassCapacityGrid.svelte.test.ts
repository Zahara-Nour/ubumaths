/**
 * ClassCapacityGrid — component tests.
 *
 * Mock fetch + smoke checks rendering grille / sort / mode projection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lore } from '$lib/config/lore';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ClassCapacityGrid from '../ClassCapacityGrid.svelte';

const sampleGrid = {
	students: [
		{ id: 's1', display_name: 'Alice Martin' },
		{ id: 's2', display_name: 'Bob Dupont' }
	],
	capacities: [
		{ id: 'cap1', name: 'Additionner', notion_name: 'Entiers' },
		{ id: 'cap2', name: 'Comparer $\\frac{1}{2}$ et $\\frac{1}{3}$', notion_name: 'Fractions' }
	],
	cells: {
		's1:cap1': 'acquise_en_memoire',
		's1:cap2': 'a_remedier',
		's2:cap1': 'en_apprentissage',
		's2:cap2': 'non_commencee'
	},
	columnStats: {
		cap1: { acquise_pct: 50, remediate_pct: 0 },
		cap2: { acquise_pct: 0, remediate_pct: 50 }
	}
};

describe('ClassCapacityGrid', () => {
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	function mockFetch(payload: unknown) {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => payload
		} as Response);
	}

	it('renders student names, point names and notions after fetch', async () => {
		mockFetch(sampleGrid);
		await render(ClassCapacityGrid, { classId: 'class-1' });
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect.element(page.getByText('Bob Dupont')).toBeVisible();
		await expect.element(page.getByText('Additionner')).toBeVisible();
		// Le nom du point est rendu (LaTeX compris), sous l'étiquette de sa notion.
		await expect.element(page.getByText(/^Comparer/)).toBeVisible();
		expect(document.querySelector('thead math-span')).not.toBeNull();
		await expect.element(page.getByText('Fractions')).toBeVisible();
	});

	it('shows empty state when class has no students', async () => {
		mockFetch({ students: [], capacities: [], cells: {}, columnStats: {} });
		await render(ClassCapacityGrid, { classId: 'class-1' });
		await expect
			.element(page.getByText(`Aucun ${lore.entities.student} dans cette classe.`))
			.toBeVisible();
	});

	it('shows "no capacities" message when students have no skill_attempts', async () => {
		mockFetch({
			students: [{ id: 's1', display_name: 'Alice' }],
			capacities: [],
			cells: {},
			columnStats: {}
		});
		await render(ClassCapacityGrid, { classId: 'class-1' });
		await expect.element(page.getByText(/Aucun point du programme travaillé/)).toBeVisible();
	});

	it('renders column stats (% acquise / % à remédier)', async () => {
		mockFetch(sampleGrid);
		await render(ClassCapacityGrid, { classId: 'class-1' });
		await expect.element(page.getByText('50%').first()).toBeVisible();
	});

	it('replaces student names by anonymized labels in projection mode', async () => {
		mockFetch(sampleGrid);
		await render(ClassCapacityGrid, { classId: 'class-1', anonymized: true });
		await expect.element(page.getByText(`${lore.entities.student} 1`)).toBeVisible();
		await expect.element(page.getByText(`${lore.entities.student} 2`)).toBeVisible();
	});

	it('renders error message when fetch fails', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			json: async () => ({ error: 'Internal' })
		} as Response);
		await render(ClassCapacityGrid, { classId: 'class-1' });
		await expect.element(page.getByText('⚠ Internal')).toBeVisible();
	});
});
