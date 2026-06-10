/**
 * StudentGradeHistogram — component tests (Widget D).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import StudentGradeHistogram from './StudentGradeHistogram.svelte';

describe('StudentGradeHistogram', () => {
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

	it('renders bar labels Again/Hard/Good/Easy', async () => {
		mockFetch({
			buckets: [
				{ grade: 1, count: 2, avg_stability_after: 1.5 },
				{ grade: 2, count: 1, avg_stability_after: 2.5 },
				{ grade: 3, count: 5, avg_stability_after: 4.2 },
				{ grade: 4, count: 3, avg_stability_after: 7.8 }
			]
		});
		render(StudentGradeHistogram, {
			classId: 'class-1',
			studentId: 'student-1',
			studentName: 'Alice'
		});
		await expect.element(page.getByText('Again', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Hard', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Good', { exact: true })).toBeVisible();
		await expect.element(page.getByText('Easy', { exact: true })).toBeVisible();
	});

	it('shows empty state when no reviews', async () => {
		mockFetch({
			buckets: [
				{ grade: 1, count: 0, avg_stability_after: 0 },
				{ grade: 2, count: 0, avg_stability_after: 0 },
				{ grade: 3, count: 0, avg_stability_after: 0 },
				{ grade: 4, count: 0, avg_stability_after: 0 }
			]
		});
		render(StudentGradeHistogram, {
			classId: 'class-1',
			studentId: 'student-1',
			studentName: 'Alice'
		});
		await expect.element(page.getByText('Aucune review sur la période.')).toBeVisible();
	});

	it('renders student name in title', async () => {
		mockFetch({ buckets: [] });
		render(StudentGradeHistogram, {
			classId: 'class-1',
			studentId: 'student-1',
			studentName: 'Alice Martin'
		});
		await expect.element(page.getByText('Grades de Alice Martin')).toBeVisible();
	});
});
