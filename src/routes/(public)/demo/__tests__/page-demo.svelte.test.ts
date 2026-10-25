/**
 * Accueil de la vitrine (`/demo`)
 * Comportements validés par David le 2026-10-25 (docs/wip/demo-debug-progress.md, PR 7).
 *
 * - un visiteur voit le titre et une carte par vitrine, dans l'ordre de `DEMO_PAGES` ;
 * - chaque carte mène à sa vitrine et dit en une ligne ce qu'on y voit ;
 * - Mathémo et Trio n'y sont plus (ils vivent dans `/games`) ;
 * - page carrefour : pas de lien de retour.
 */
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { DEMO_PAGES } from '$lib/seo/demo-pages';
import Page from '../+page.svelte';

describe('/demo', () => {
	it('montre le titre et une carte par vitrine, dans l’ordre, avec sa description', async () => {
		await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Démonstrations' }))
			.toBeVisible();
		const hrefs = page
			.getByRole('link')
			.elements()
			.map((a) => a.getAttribute('href'));
		expect(hrefs).toEqual(DEMO_PAGES.map((p) => p.path));
		for (const { title, description } of DEMO_PAGES) {
			await expect.element(page.getByRole('heading', { name: title })).toBeVisible();
			await expect.element(page.getByText(description)).toBeVisible();
		}
	});

	it('ne relie plus Mathémo ni Trio, et n’a pas de lien de retour', async () => {
		await render(Page);

		expect(page.getByText(/Mathémo|Trio/).query()).toBeNull();
		expect(page.getByRole('link', { name: /Retour/ }).query()).toBeNull();
	});
});
