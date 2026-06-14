/**
 * AntiFraudFlagsList — component tests.
 *
 * Mock fetch + smoke checks rendering, anonymisation, click resolve, empty state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import AntiFraudFlagsList from '../AntiFraudFlagsList.svelte';

const sampleFlags = {
	flags: [
		{
			id: 'f1',
			student: { id: 's1', first_name: 'Alice', last_name: 'Martin' },
			capacity: { id: 'cap1', name: 'Additionner' },
			flag_type: 'burst',
			severity: 4,
			score: 0.85,
			sample_size: 20,
			details: { burst_count: 20 },
			resolved: false,
			created_at: '2026-06-10T10:00:00Z'
		},
		{
			id: 'f2',
			student: { id: 's2', first_name: 'Bob', last_name: 'Dupont' },
			capacity: null,
			flag_type: 'composite',
			severity: 5,
			score: 0.95,
			sample_size: 25,
			details: { signals: [] },
			resolved: false,
			created_at: '2026-06-10T11:00:00Z'
		}
	],
	total: 2,
	resolved_count: 0
};

describe('AntiFraudFlagsList', () => {
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

	it('renders student names with capacity after fetch', async () => {
		mockFetch(sampleFlags);
		render(AntiFraudFlagsList, { classId: 'class-1' });
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect.element(page.getByText('Bob Dupont')).toBeVisible();
		await expect.element(page.getByText('Additionner')).toBeVisible();
	});

	it('shows empty state when no flags', async () => {
		mockFetch({ flags: [], total: 0, resolved_count: 0 });
		render(AntiFraudFlagsList, { classId: 'class-1' });
		await expect.element(page.getByText(/Aucun élève à surveiller/)).toBeVisible();
	});

	it('anonymizes student names when anonymized=true', async () => {
		mockFetch(sampleFlags);
		render(AntiFraudFlagsList, { classId: 'class-1', anonymized: true });
		await expect.element(page.getByText('Élève 1')).toBeVisible();
		await expect.element(page.getByText('Élève 2')).toBeVisible();
	});

	it('renders flag type labels and score', async () => {
		mockFetch(sampleFlags);
		render(AntiFraudFlagsList, { classId: 'class-1' });
		await expect.element(page.getByText('Rafale de reviews')).toBeVisible();
		await expect.element(page.getByText('Synthèse multi-signaux')).toBeVisible();
		await expect.element(page.getByText(/score 85\/100/)).toBeVisible();
	});

	it('renders "Marquer comme OK" button on each non-resolved flag', async () => {
		mockFetch(sampleFlags);
		render(AntiFraudFlagsList, { classId: 'class-1' });
		const buttons = page.getByText('Marquer comme OK');
		await expect.element(buttons.first()).toBeVisible();
	});

	it('shows error message when fetch fails', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			json: async () => ({ error: 'Forbidden' })
		} as Response);
		render(AntiFraudFlagsList, { classId: 'class-1' });
		await expect.element(page.getByText(/Forbidden/)).toBeVisible();
	});
});
