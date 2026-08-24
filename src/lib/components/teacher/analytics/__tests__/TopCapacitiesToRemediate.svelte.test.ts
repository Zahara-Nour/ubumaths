/**
 * TopCapacitiesToRemediate — component tests (Widget E).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lore } from '$lib/config/lore';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import TopCapacitiesToRemediate from '../TopCapacitiesToRemediate.svelte';

describe('TopCapacitiesToRemediate', () => {
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

	it('renders rows with skill name, theme badge, percentage', async () => {
		mockFetch({
			rows: [
				{
					skill_id: 'cap1',
					skill_name: 'Calcul fractions',
					theme_code: 'CALC',
					students_concerned: [{ student_id: 's1', display_name: 'Alice', badge: 'a_remedier' }],
					remediate_pct: 75
				}
			]
		});
		render(TopCapacitiesToRemediate, { classId: 'class-1' });
		await expect.element(page.getByText('Calcul fractions')).toBeVisible();
		await expect
			.element(page.getByText(new RegExp(`75% des ${lore.entities.student}s concernés`)))
			.toBeVisible();
	});

	it('shows congratulations when no rows', async () => {
		mockFetch({ rows: [] });
		render(TopCapacitiesToRemediate, { classId: 'class-1' });
		await expect
			.element(page.getByText(new RegExp(`Bravo, votre ${lore.entities.class}`)))
			.toBeVisible();
	});

	it('handles fetch error', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			json: async () => ({ error: 'Boom' })
		} as Response);
		render(TopCapacitiesToRemediate, { classId: 'class-1' });
		await expect.element(page.getByText('⚠ Boom')).toBeVisible();
	});
});
