/**
 * ClassCompetenceGrid — component tests (Widget F famille B).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import ClassCompetenceGrid from '../ClassCompetenceGrid.svelte';

const sampleGrid = {
	students: [
		{ id: 's1', display_name: 'Alice' },
		{ id: 's2', display_name: 'Bob' }
	],
	competences: [
		{ id: 'c1', code: 'CHER', name: 'Chercher', display_order: 1 },
		{ id: 'c2', code: 'MOD', name: 'Modéliser', display_order: 2 }
	],
	cells: {
		's1:c1': 'satisfaisante',
		's1:c2': 'fragile',
		's2:c1': null,
		's2:c2': 'tres_bonne'
	},
	columnSatisfaitPct: { c1: 50, c2: 50 },
	last_saisie_at: '2026-06-09T12:00:00Z'
};

describe('ClassCompetenceGrid', () => {
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

	it('renders competence column headers', async () => {
		mockFetch(sampleGrid);
		render(ClassCompetenceGrid, { classId: 'class-1' });
		await expect.element(page.getByText('Chercher')).toBeVisible();
		await expect.element(page.getByText('Modéliser')).toBeVisible();
	});

	it('shows freshness chip when last_saisie_at present', async () => {
		mockFetch(sampleGrid);
		render(ClassCompetenceGrid, { classId: 'class-1' });
		await expect.element(page.getByText(/Dernière saisie/)).toBeVisible();
	});

	it('shows "no students" empty state', async () => {
		mockFetch({
			students: [],
			competences: sampleGrid.competences,
			cells: {},
			columnSatisfaitPct: {},
			last_saisie_at: null
		});
		render(ClassCompetenceGrid, { classId: 'class-1' });
		await expect.element(page.getByText('Aucun élève dans cette classe.')).toBeVisible();
	});

	it('anonymizes student names in projection mode', async () => {
		mockFetch(sampleGrid);
		render(ClassCompetenceGrid, { classId: 'class-1', anonymized: true });
		await expect.element(page.getByText('Élève 1')).toBeVisible();
		await expect.element(page.getByText('Élève 2')).toBeVisible();
	});
});
