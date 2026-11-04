/**
 * C19 — un lien de série `/automaths/test?modeles=<…>` (ou l'ancien `?categories=<…>`)
 *
 * - SANS `mode` : redirection vers le panier (Q46), plus de fenêtre de choix ;
 * - lien abîmé, JSON invalide, trop de lignes, valeurs hors bornes : un
 *   message clair, jamais de plantage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { ANCIEN_LIEN_MESSAGE, SERIES_LINK_PARAM, encodeSeriesParam } from '$lib/validation/series';
import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';

const goto = vi.hoisted(() => vi.fn(async () => {}));
const url = vi.hoisted(() => ({ current: new URL('http://localhost/automaths/test') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return url.current;
		}
	}
}));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto
}));

import Page from '../+page.svelte';

const TEMPLATE_ID = '11111111-1111-4111-8111-111111111111';
const ITEM = { templateId: TEMPLATE_ID, quantity: 2, delay: 20 };

/** Ancienne ligne (avant l'ADR 0035) : une catégorie, plus relue */
const LEGACY_ITEM = {
	category: { level: 1 },
	quantity: 2,
	delay: 20
};

/** Un modèle quelconque : la page n'en a besoin qu'une fois la forme choisie */
const TEMPLATE = {
	id: TEMPLATE_ID,
	level: 3,
	status: 'published'
};

function openLink(query: string) {
	url.current = new URL(`http://localhost/automaths/test?${query}`);
}

/**
 * Remplit le cache des modèles (la page le lit, le serveur ne les envoie plus)
 * sans appeler la vraie API sur le serveur de test.
 */
async function seedTemplatesCache(templates: unknown[] = []) {
	questionTemplatesCache.clear();
	vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ templates })));
	await questionTemplatesCache.fetchTemplates();
	vi.unstubAllGlobals();
}

async function renderPage() {
	await seedTemplatesCache([TEMPLATE]);
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: { data: { user: null } } as never
	});
}

describe('C19 — lien de série', () => {
	beforeEach(() => {
		goto.mockClear();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('Q46 : sans forme, redirection vers le panier (pas de fenêtre de choix)', async () => {
		const encoded = encodeSeriesParam([ITEM]);
		openLink(new URLSearchParams({ [SERIES_LINK_PARAM]: encoded }).toString());
		await renderPage();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledTimes(1));
		const [target, options] = goto.mock.calls[0] as unknown as [string, { replaceState: boolean }];
		const href = new URL(target, 'http://localhost');
		expect(href.pathname).toBe('/automaths/panier');
		expect(href.searchParams.get(SERIES_LINK_PARAM)).toBe(encoded);
		expect(options).toMatchObject({ replaceState: true });
		expect(document.body.textContent).not.toContain('Choisissez un mode de test');
	});

	it('Q46 : un ANCIEN lien ?categories=… sans forme va au panier aussi, paramètre intact', async () => {
		const encoded = encodeURIComponent(JSON.stringify([LEGACY_ITEM]));
		openLink(new URLSearchParams({ categories: encoded }).toString());
		await renderPage();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledTimes(1));
		const [target] = goto.mock.calls[0] as unknown as [string];
		const href = new URL(target, 'http://localhost');
		expect(href.pathname).toBe('/automaths/panier');
		expect(href.searchParams.get('categories')).toBe(encoded);
	});

	it('ancien lien ?categories=… avec forme : « ancienne version », rien ne démarre', async () => {
		openLink(
			new URLSearchParams({
				categories: encodeURIComponent(JSON.stringify([LEGACY_ITEM])),
				mode: 'interactive'
			}).toString()
		);
		await renderPage();

		await expect.element(page.getByText(ANCIEN_LIEN_MESSAGE)).toBeVisible();
	});

	it('lien abîmé (JSON tronqué) : message clair', async () => {
		openLink('mode=interactive&modeles=%5B%7B%22templateId');
		await renderPage();

		await expect.element(page.getByText(/Ce lien de série est abîmé/)).toBeVisible();
	});

	it('trop de lignes : message avec la borne', async () => {
		openLink(
			new URLSearchParams({
				[SERIES_LINK_PARAM]: encodeSeriesParam(Array(51).fill(ITEM)),
				mode: 'interactive'
			}).toString()
		);
		await renderPage();

		await expect.element(page.getByText(/50 au plus/)).toBeVisible();
	});

	it('valeurs hors bornes : message', async () => {
		openLink(
			new URLSearchParams({
				[SERIES_LINK_PARAM]: encodeSeriesParam([{ ...ITEM, quantity: 999 }]),
				mode: 'interactive'
			}).toString()
		);
		await renderPage();

		await expect.element(page.getByText(/Ce lien de série n'est pas valide/)).toBeVisible();
	});

	it('aucune composition : message', async () => {
		openLink('mode=interactive');
		await renderPage();

		await expect.element(page.getByText('Ce lien ne contient aucune question.')).toBeVisible();
	});
});
