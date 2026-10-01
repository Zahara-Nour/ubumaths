/**
 * C19 — un lien de série `/automaths/test?categories=<…>`
 *
 * - SANS `mode` : redirection vers le panier (Q46), plus de fenêtre de choix ;
 * - lien abîmé, JSON invalide, trop de catégories, valeurs hors bornes : un
 *   message clair, jamais de plantage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { encodeCategoriesParam } from '$lib/validation/series';

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

const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 2,
	delay: 20
};

/** Un modèle quelconque : la page n'en a besoin qu'une fois la forme choisie */
const TEMPLATE = {
	id: 'modele-1',
	theme: 'Calcul',
	domain: 'Tables',
	subdomain: null,
	level: 3,
	status: 'published'
};

function openLink(query: string) {
	url.current = new URL(`http://localhost/automaths/test?${query}`);
}

async function renderPage() {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: { data: { templates: [TEMPLATE], user: null } } as never
	});
}

describe('C19 — lien de série', () => {
	beforeEach(() => {
		goto.mockClear();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('Q46 : sans forme, redirection vers le panier (pas de fenêtre de choix)', async () => {
		const encoded = encodeCategoriesParam([ITEM]);
		openLink(new URLSearchParams({ categories: encoded }).toString());
		await renderPage();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledTimes(1));
		const [target, options] = goto.mock.calls[0] as unknown as [string, { replaceState: boolean }];
		const href = new URL(target, 'http://localhost');
		expect(href.pathname).toBe('/automaths/panier');
		expect(href.searchParams.get('categories')).toBe(encoded);
		expect(options).toMatchObject({ replaceState: true });
		expect(document.body.textContent).not.toContain('Choisissez un mode de test');
	});

	it('lien abîmé (JSON tronqué) : message clair', async () => {
		openLink('mode=interactive&categories=%5B%7B%22category');
		await renderPage();

		await expect.element(page.getByText(/Ce lien de série est abîmé/)).toBeVisible();
	});

	it('trop de catégories : message avec la borne', async () => {
		openLink(
			new URLSearchParams({
				categories: encodeCategoriesParam(Array(51).fill(ITEM)),
				mode: 'interactive'
			}).toString()
		);
		await renderPage();

		await expect.element(page.getByText(/50 au plus/)).toBeVisible();
	});

	it('valeurs hors bornes : message', async () => {
		openLink(
			new URLSearchParams({
				categories: encodeCategoriesParam([{ ...ITEM, quantity: 999 }]),
				mode: 'interactive'
			}).toString()
		);
		await renderPage();

		await expect.element(page.getByText(/Ce lien de série n'est pas valide/)).toBeVisible();
	});

	it('aucune catégorie : message', async () => {
		openLink('mode=interactive');
		await renderPage();

		await expect.element(page.getByText('Ce lien ne contient aucune question.')).toBeVisible();
	});
});
