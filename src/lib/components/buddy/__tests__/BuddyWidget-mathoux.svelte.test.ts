/**
 * Le Palotin, gardien de la Chatterie (Mathoux v1, § 9 de mathoux-conception.md).
 *
 * Ce que l'élève LIT : quand au moins un Mathou fait la sieste, le Palotin le
 * dit (« 2 Mathoux font la sieste ») avec un lien vers la Chatterie. Rien sinon,
 * ni quand le résumé est illisible. Le résumé est demandé APRÈS l'affichage
 * (`/api/student/mathoux`), jamais par le layout.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import BuddyWidget from '../BuddyWidget.svelte';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import type { BuddyState } from '$lib/types/buddy';

const buddy: BuddyState = {
	student_id: '00000000-0000-4000-8000-000000000001',
	palotin_type: 'pile',
	xp: 100,
	level: 3,
	current_streak: 0,
	longest_streak: 0,
	last_activity_date: null,
	xp_earned_today: 0,
	last_xp_date: null,
	themes_explored: [],
	change_count: 0,
	equipped_skin_id: null,
	constance_week_start: null,
	constance_days_this_week: 0
};

function mockSummary(body: unknown, ok = true) {
	const fetchMock = vi.fn().mockResolvedValue({
		ok,
		json: () => Promise.resolve(body)
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

beforeEach(() => {
	studentCache.hydrateBuddy(buddy);
});

afterEach(() => {
	vi.unstubAllGlobals();
	studentCache.hydrateBuddy(null);
});

describe('BuddyWidget — Mathoux en sieste', () => {
	it('annonce les Mathoux en sieste avec un lien vers la Chatterie', async () => {
		const fetchMock = mockSummary({ born: 5, napping: 2, toDiscover: 1 });
		await render(BuddyWidget, { props: {} });

		await expect
			.element(page.getByText('2 Mathoux font la sieste.'), { timeout: 4000 })
			.toBeVisible();
		const link = page.getByRole('link', { name: 'Aller à la Chatterie' });
		await expect.element(link).toBeVisible();
		expect(link.element().getAttribute('href')).toBe('/dashboard/student/chatterie');
		expect(fetchMock).toHaveBeenCalledWith('/api/student/mathoux');
	});

	it('accorde le singulier', async () => {
		mockSummary({ born: 1, napping: 1, toDiscover: 0 });
		await render(BuddyWidget, { props: {} });
		await expect
			.element(page.getByText('1 Mathou fait la sieste.'), { timeout: 4000 })
			.toBeVisible();
	});

	it('aucun Mathou en sieste : pas de lien vers la Chatterie', async () => {
		const fetchMock = mockSummary({ born: 3, napping: 0, toDiscover: 2 });
		await render(BuddyWidget, { props: {} });
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 1500));
		expect(page.getByRole('link', { name: 'Aller à la Chatterie' }).elements()).toHaveLength(0);
	});

	it('résumé illisible ou en échec : le Palotin se tait sur les Mathoux', async () => {
		const fetchMock = mockSummary({ napping: 'beaucoup' });
		await render(BuddyWidget, { props: {} });
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 1500));
		expect(page.getByText(/Mathou/).elements()).toHaveLength(0);
	});

	it('sans Palotin : aucune demande', async () => {
		studentCache.hydrateBuddy(null);
		const fetchMock = mockSummary({ born: 1, napping: 1, toDiscover: 0 });
		await render(BuddyWidget, { props: {} });
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
