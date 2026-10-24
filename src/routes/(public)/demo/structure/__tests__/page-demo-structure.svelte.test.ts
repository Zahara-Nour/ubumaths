/**
 * Vitrine — la structure d'une expression (`/demo/structure`)
 * Comportements validés par David le 2026-10-24 (docs/wip/demo-debug-progress.md, PR 6a).
 *
 * - un visiteur (sans niveau) voit le titre, le retour vers `/demo`, la formule et sa lecture ;
 * - un exemple cliqué charge son expression ;
 * - ni corpus ni cases à cocher (réservés à `/dev/structure`).
 */
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '$lib/utils/mathlive-styles';
import Page from '../+page.svelte';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('$lib/dictionary/fetch-dictionary', async () => {
	const { REFERENCE_DICTIONARY: entries } =
		await import('../../../../../../tests/fixtures/lexique/dictionnaire-reference');
	return { fetchDictionary: async () => entries };
});

beforeAll(async () => {
	// MathLive : import dynamique dans les tests client (docs/pratiques/tests.md § Pièges)
	await import('mathlive');
});

function wholeReading(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-reading="whole"]');
}

describe('/demo/structure', () => {
	it('montre au visiteur le titre, le retour vers /demo et la lecture de la formule', async () => {
		await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent("La structure d'une expression");
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		// Expression de l'article Sésamath : un produit
		await vi.waitFor(() => expect(wholeReading()?.textContent).toMatch(/produit/));
	});

	it('charge un exemple cliqué', async () => {
		await render(Page);

		await userEvent.click(page.getByRole('button', { name: 'Priorités' }));

		await vi.waitFor(() => expect(wholeReading()?.textContent).toMatch(/somme/));
	});

	it("n'a ni corpus ni case à cocher", async () => {
		await render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(document.querySelector('[data-corpus-index]')).toBeNull();
		expect(page.getByRole('checkbox').elements()).toHaveLength(0);
	});
});
