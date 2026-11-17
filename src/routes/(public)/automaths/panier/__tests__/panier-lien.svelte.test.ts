/**
 * Q45 — ouvrir le panier avec un lien `/automaths/panier?modeles=…`
 *
 * - panier vide : la série y est mise, sans question ;
 * - panier non vide : « Remplacer ton panier par cette série ? » —
 *   Remplacer / Ajouter (plafond 99) / Annuler (panier inchangé) ;
 * - ensuite le paramètre `modeles` (ou l'ancien `categories`) est retiré de l'URL (replaceState) ;
 * - lien abîmé : message clair, panier inchangé ;
 * - ancien lien `?categories=…` (ADR 0035) : plus relu, message « ancienne version », panier inchangé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { ANCIEN_LIEN_MESSAGE, SERIES_LINK_PARAM, encodeSeriesParam } from '$lib/validation/series';

const url = vi.hoisted(() => ({ current: new URL('http://localhost/automaths/panier') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return url.current;
		},
		state: {}
	}
}));
const navigation = vi.hoisted(() => ({
	goto: vi.fn(async () => {}),
	replaceState: vi.fn()
}));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	...navigation
}));
const toaster = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
	warning: vi.fn(),
	info: vi.fn()
}));
vi.mock('$lib/stores/toaster.svelte', () => ({ toaster }));

import Page from '../+page.svelte';
import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
import { questionCart } from '$lib/stores/questionCart.svelte';

const MINE = '11111111-1111-4111-8111-111111111111';
const SHARED = '22222222-2222-4222-8222-222222222222';
const SERIES = [
	{ templateId: SHARED, quantity: 5, delay: 30 },
	{ templateId: MINE, quantity: 60, delay: 45 }
];

function openLink(value: string, param: string = SERIES_LINK_PARAM) {
	const query = new URLSearchParams({ [param]: value }).toString();
	url.current = new URL(`http://localhost/automaths/panier?${query}`);
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

async function renderPanier(templates: unknown[] = []) {
	await seedTemplatesCache(templates);
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: { data: { userRole: null } } as never
	});
}

/** L'URL a été nettoyée : plus de composition, même chemin */
async function expectUrlCleaned() {
	await vi.waitFor(() => expect(navigation.replaceState).toHaveBeenCalledTimes(1));
	const cleaned = new URL(String(navigation.replaceState.mock.calls[0][0]), 'http://localhost');
	expect(cleaned.pathname).toBe('/automaths/panier');
	expect(cleaned.searchParams.has(SERIES_LINK_PARAM)).toBe(false);
	expect(cleaned.searchParams.has('categories')).toBe(false);
}

describe('Panier ouvert par un lien de série (Q45)', () => {
	beforeEach(() => {
		questionCart.clearCart();
		navigation.replaceState.mockClear();
		Object.values(toaster).forEach((fn) => fn.mockClear());
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		questionCart.clearCart();
		url.current = new URL('http://localhost/automaths/panier');
	});

	it('panier vide : la série est chargée sans question, URL nettoyée', async () => {
		openLink(encodeSeriesParam(SERIES));
		await renderPanier();

		await vi.waitFor(() => expect(questionCart.allItems).toEqual(SERIES));
		expect(document.body.textContent).not.toContain('Remplacer ton panier');
		await expectUrlCleaned();
	});

	it('panier non vide : la question est posée ; Remplacer', async () => {
		questionCart.addToCart(MINE, 3, 20);
		openLink(encodeSeriesParam(SERIES));
		await renderPanier();

		await expect.element(page.getByText('Remplacer ton panier par cette série ?')).toBeVisible();
		expect(navigation.replaceState).not.toHaveBeenCalled();
		await page.getByRole('button', { name: 'Remplacer', exact: true }).click();

		expect(questionCart.allItems).toEqual(SERIES);
		await expectUrlCleaned();
	});

	it('Ajouter : fusion, 99 questions au plus par modèle', async () => {
		questionCart.addToCart(MINE, 50, 20);
		openLink(encodeSeriesParam(SERIES));
		await renderPanier();

		await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

		expect(questionCart.allItems).toEqual([
			{ templateId: MINE, quantity: 99, delay: 20 },
			{ templateId: SHARED, quantity: 5, delay: 30 }
		]);
		await expectUrlCleaned();
	});

	it('Annuler : panier inchangé, URL nettoyée', async () => {
		questionCart.addToCart(MINE, 3, 20);
		openLink(encodeSeriesParam(SERIES));
		await renderPanier();

		await page.getByRole('button', { name: 'Annuler', exact: true }).click();

		expect(questionCart.allItems).toEqual([{ templateId: MINE, quantity: 3, delay: 20 }]);
		await expectUrlCleaned();
	});

	it('lien abîmé : message clair, panier inchangé', async () => {
		questionCart.addToCart(MINE, 3, 20);
		openLink('[{"templateId');
		await renderPanier();

		await expect.element(page.getByText(/Ce lien de série est abîmé/)).toBeVisible();
		expect(document.body.textContent).not.toContain('Remplacer ton panier');
		expect(questionCart.allItems).toEqual([{ templateId: MINE, quantity: 3, delay: 20 }]);
		await expectUrlCleaned();
	});

	it('ancien lien ?categories=… : message « ancienne version », panier inchangé', async () => {
		questionCart.addToCart(MINE, 3, 20);
		const ancien = [{ category: { level: 3 }, quantity: 5, delay: 30 }];
		openLink(encodeURIComponent(JSON.stringify(ancien)), 'categories');
		await renderPanier();

		await expect.element(page.getByText(ANCIEN_LIEN_MESSAGE)).toBeVisible();
		expect(document.body.textContent).not.toContain('Remplacer ton panier');
		expect(questionCart.allItems).toEqual([{ templateId: MINE, quantity: 3, delay: 20 }]);
		await expectUrlCleaned();
	});

	it('sans paramètre : rien ne se passe', async () => {
		questionCart.addToCart(MINE, 3, 20);
		await renderPanier();

		await expect.element(page.getByText('Mon Panier')).toBeVisible();
		expect(navigation.replaceState).not.toHaveBeenCalled();
		expect(questionCart.allItems).toEqual([{ templateId: MINE, quantity: 3, delay: 20 }]);
	});
});
