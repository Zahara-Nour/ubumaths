/**
 * TopObservablesToConsolidate — component tests (Widget G).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lore } from '$lib/config/lore';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import TopObservablesToConsolidate from '../TopObservablesToConsolidate.svelte';

describe('TopObservablesToConsolidate', () => {
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

	it('renders rows with observable_code badge', async () => {
		mockFetch({
			rows: [
				{
					skill_id: 'sk1',
					observable_code: 'CHER-A1',
					skill_name: 'Modéliser un problème',
					subdimension_letter: 'A',
					subdimension_name: 'Sous-A',
					competence_code: 'CHER',
					students_concerned: [{ student_id: 's1', display_name: 'Alice', last_attempt_at: null }],
					minus_pct: 80
				}
			]
		});
		render(TopObservablesToConsolidate, { classId: 'class-1' });
		await expect.element(page.getByText('Modéliser un problème')).toBeVisible();
		await expect.element(page.getByText('CHER-A1')).toBeVisible();
		await expect
			.element(page.getByText(new RegExp(`80% des ${lore.entities.student}s observés`)))
			.toBeVisible();
	});

	it('shows congratulations when no rows', async () => {
		mockFetch({ rows: [] });
		render(TopObservablesToConsolidate, { classId: 'class-1' });
		await expect.element(page.getByText(/Bravo, tous les observables/)).toBeVisible();
	});
});
