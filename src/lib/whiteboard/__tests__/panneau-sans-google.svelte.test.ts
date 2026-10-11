/**
 * Panneau de fichiers du tableau blanc, Google coupé (écart V5, 2026-10-11)
 *
 * `GOOGLE_CLASSROOM_ENABLED = false` : toutes les routes Google refusent. Le
 * panneau ne doit proposer aucune action Google — ni « Sauvegarder sur Drive »
 * (un clic finissait en erreur), ni « Se connecter » (renvoyait au tableau de
 * bord) — comme « Publier sur Classroom », déjà masqué. Les actions locales
 * restent.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import FileDrawer from '../components/FileDrawer.svelte';
import { whiteboardStore } from '../stores/whiteboard.svelte';
import { GOOGLE_CLASSROOM_ENABLED } from '$lib/config/google-classroom';

afterEach(() => {
	whiteboardStore.setFileDrawerVisible(false);
	vi.restoreAllMocks();
});

describe('panneau de fichiers, Google coupé', () => {
	it('décor : Google est bien coupé dans la configuration réelle', () => {
		expect(GOOGLE_CLASSROOM_ENABLED).toBe(false);
	});

	it('aucune action Google ; les actions locales restent', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));
		whiteboardStore.setFileDrawerVisible(true);
		await render(FileDrawer);

		await expect.element(page.getByTitle('Exporter (PDF, image...)')).toBeVisible();
		await expect.element(page.getByTitle('Enregistrer localement')).toBeVisible();
		expect(page.getByTitle('Sauvegarder sur Drive').elements()).toHaveLength(0);
		expect(page.getByTitle('Publier sur Classroom').elements()).toHaveLength(0);
		expect(page.getByRole('button', { name: 'Se connecter' }).elements()).toHaveLength(0);
	});

	it('aucun appel aux routes Google', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response('{}', { status: 503 }));
		whiteboardStore.setFileDrawerVisible(true);
		await render(FileDrawer);
		await expect.element(page.getByTitle('Exporter (PDF, image...)')).toBeVisible();
		const urls = fetchSpy.mock.calls.map(([input]) => String(input));
		expect(urls.filter((url) => url.includes('/api/google/'))).toEqual([]);
	});
});
