/**
 * StudentRetentionCurve — component tests (Widget B).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import StudentRetentionCurve from '../StudentRetentionCurve.svelte';

describe('StudentRetentionCurve', () => {
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

	it('shows "not enough data" message when reviews < 3', async () => {
		mockFetch({
			points: [
				{ week_start: '2026-05-01', retrievability_avg: 0, review_count: 0 },
				{ week_start: '2026-05-08', retrievability_avg: 0.5, review_count: 1 }
			]
		});
		await render(StudentRetentionCurve, {
			classId: 'class-1',
			studentId: 'student-1',
			studentName: 'Alice',
			branchId: 'b-nombres',
			branchName: 'Nombres'
		});
		await expect.element(page.getByText(/Pas assez de reviews/)).toBeVisible();
	});

	it('renders curve when reviews >= 3', async () => {
		mockFetch({
			points: [
				{ week_start: '2026-05-01', retrievability_avg: 0.8, review_count: 1 },
				{ week_start: '2026-05-08', retrievability_avg: 0.9, review_count: 2 },
				{ week_start: '2026-05-15', retrievability_avg: 0.85, review_count: 2 }
			]
		});
		await render(StudentRetentionCurve, {
			classId: 'class-1',
			studentId: 'student-1',
			studentName: 'Alice',
			branchId: 'b-nombres',
			branchName: 'Nombres'
		});
		await expect.element(page.getByText(/5 reviews sur la période/)).toBeVisible();
	});

	it('includes student name and branch in title, asks the branch', async () => {
		mockFetch({ points: [] });
		await render(StudentRetentionCurve, {
			classId: 'class-1',
			studentId: 'student-1',
			studentName: 'Alice Martin',
			branchId: 'b-nombres',
			branchName: 'Nombres et calculs'
		});
		await expect.element(page.getByText('Rétention de Alice Martin')).toBeVisible();
		await expect.element(page.getByText('Nombres et calculs')).toBeVisible();
		expect(vi.mocked(globalThis.fetch).mock.calls[0][0]).toContain('?branch=b-nombres');
	});
});
