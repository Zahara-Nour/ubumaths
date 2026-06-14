/**
 * ClassActivityHeatmap — component tests (Widget C).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import ClassActivityHeatmap from '../ClassActivityHeatmap.svelte';

const sampleHeatmap = {
	days: ['2026-06-08', '2026-06-09', '2026-06-10'],
	students: [
		{ id: 's1', display_name: 'Alice', days_since_last_review: 0, is_alert: false },
		{ id: 's2', display_name: 'Bob', days_since_last_review: 12, is_alert: true }
	],
	cells: [
		{ student_id: 's1', day: '2026-06-10', review_count: 3, success_pct: 67 },
		{ student_id: 's1', day: '2026-06-09', review_count: 0, success_pct: 0 },
		{ student_id: 's1', day: '2026-06-08', review_count: 0, success_pct: 0 },
		{ student_id: 's2', day: '2026-06-10', review_count: 0, success_pct: 0 },
		{ student_id: 's2', day: '2026-06-09', review_count: 0, success_pct: 0 },
		{ student_id: 's2', day: '2026-06-08', review_count: 0, success_pct: 0 }
	]
};

describe('ClassActivityHeatmap', () => {
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

	it('renders alert badge for students above threshold', async () => {
		mockFetch(sampleHeatmap);
		render(ClassActivityHeatmap, { classId: 'class-1' });
		await expect.element(page.getByText('12 jours')).toBeVisible();
	});

	it('shows "no students" empty state', async () => {
		mockFetch({ days: [], students: [], cells: [] });
		render(ClassActivityHeatmap, { classId: 'class-1' });
		await expect.element(page.getByText('Aucun élève dans cette classe.')).toBeVisible();
	});

	it('anonymizes names when anonymized=true', async () => {
		mockFetch(sampleHeatmap);
		render(ClassActivityHeatmap, { classId: 'class-1', anonymized: true });
		await expect.element(page.getByText('Élève 1')).toBeVisible();
		await expect.element(page.getByText('Élève 2')).toBeVisible();
	});
});
