/**
 * C18 — Panier : « Enregistrer comme série » (prof et admin seulement) et
 * « Copier le lien » pour tous (toast de succès).
 * Q44 — un menu choisit la forme du lien : sans forme (panier) ou une forme.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/automaths/panier'), state: {} }
}));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto: vi.fn(async () => {})
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
import { parseSeriesLink } from '$lib/questions/series-legacy';

const TEMPLATE_ID = '11111111-1111-4111-8111-111111111111';

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

async function renderPanier(userRole: string | null) {
	await seedTemplatesCache();
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: { data: { userRole } } as never
	});
}

describe('Panier — série (C18)', () => {
	let writeText: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		questionCart.clearCart();
		questionCart.addToCart(TEMPLATE_ID, 3, 20);
		writeText = vi.fn(async () => {});
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true
		});
		Object.values(toaster).forEach((fn) => fn.mockClear());
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		questionCart.clearCart();
	});

	it('prof : « Enregistrer comme série » est proposé', async () => {
		await renderPanier('teacher');
		await expect.element(page.getByText('Enregistrer comme série')).toBeVisible();
	});

	it('admin : « Enregistrer comme série » est proposé', async () => {
		await renderPanier('admin');
		await expect.element(page.getByText('Enregistrer comme série')).toBeVisible();
	});

	it('élève et visiteur : pas d’enregistrement de série', async () => {
		for (const role of ['student', null]) {
			const { container, unmount } = await renderPanier(role);
			expect(container.textContent).not.toContain('Enregistrer comme série');
			await unmount();
		}
	});

	it('« Copier le lien » par défaut : lien SANS forme vers le panier, et toast', async () => {
		await renderPanier('student');
		await page.getByRole('button', { name: 'Copier le lien' }).click();

		await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
		const link = new URL(writeText.mock.calls[0][0] as string);
		expect(link.pathname).toBe('/automaths/panier');
		expect(link.searchParams.has('mode')).toBe(false);
		expect(link.searchParams.has('categories')).toBe(false);
		expect(parseSeriesLink(link.searchParams)).toMatchObject({
			success: true,
			lines: [{ templateId: TEMPLATE_ID, quantity: 3 }]
		});
		expect(toaster.success).toHaveBeenCalledWith('Lien copié');
	});

	it('Q44 : forme « Flash-cards » → lien qui lance la série sous cette forme', async () => {
		await renderPanier('student');
		await page.getByRole('button', { name: 'Forme du lien' }).click();
		await page.getByRole('option', { name: 'Flash-cards' }).click();
		await page.getByRole('button', { name: 'Copier le lien' }).click();

		await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
		const link = new URL(writeText.mock.calls[0][0] as string);
		expect(link.pathname).toBe('/automaths/test');
		expect(link.searchParams.get('mode')).toBe('flash');
		expect(link.searchParams.has('time')).toBe(false);
	});

	it('Q44 : « Course aux nombres » → le lien porte le temps limite réglé', async () => {
		await renderPanier('student');
		await page.getByRole('button', { name: 'Forme du lien' }).click();
		await page.getByRole('option', { name: 'Course aux nombres' }).click();
		await expect.element(page.getByLabelText('Temps limite (minutes)')).toHaveValue(5);
		await page.getByLabelText('Temps limite (minutes)').fill('8');
		await page.getByRole('button', { name: 'Copier le lien' }).click();

		await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
		const link = new URL(writeText.mock.calls[0][0] as string);
		expect(link.pathname).toBe('/automaths/test');
		expect(link.searchParams.get('mode')).toBe('course');
		expect(link.searchParams.get('time')).toBe('480');
	});

	it('Q44 : temps limite hors de 1 à 60 min → rien n’est copié, message', async () => {
		await renderPanier('student');
		await page.getByRole('button', { name: 'Forme du lien' }).click();
		await page.getByRole('option', { name: 'Course aux nombres' }).click();
		await page.getByLabelText('Temps limite (minutes)').fill('90');
		await page.getByRole('button', { name: 'Copier le lien' }).click();

		await vi.waitFor(() =>
			expect(toaster.error).toHaveBeenCalledWith('Le temps limite va de 1 à 60 minutes')
		);
		expect(writeText).not.toHaveBeenCalled();
	});

	it('presse-papiers refusé : toast d’erreur', async () => {
		writeText.mockRejectedValueOnce(new Error('refusé'));
		await renderPanier(null);
		await page.getByRole('button', { name: 'Copier le lien' }).click();

		await vi.waitFor(() =>
			expect(toaster.error).toHaveBeenCalledWith('Impossible de copier le lien')
		);
	});

	it('enregistrer : POST /api/series avec le titre et les modèles du panier', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(
				new Response(JSON.stringify({ series: { id: 'serie-1' } }), { status: 201 })
			);
		try {
			await renderPanier('teacher');
			await page.getByText('Enregistrer comme série').click();
			await page.getByLabelText('Titre').fill('Tables de 7');
			await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();

			await vi.waitFor(() => expect(toaster.success).toHaveBeenCalledWith('Série enregistrée'));
			const [url, init] = fetchSpy.mock.calls.find(([u]) => u === '/api/series')!;
			expect(url).toBe('/api/series');
			const body = JSON.parse((init as RequestInit).body as string);
			expect(body).toMatchObject({ title: 'Tables de 7', grade: '6' });
			expect(body.items).toEqual([{ templateId: TEMPLATE_ID, quantity: 3, delay: 20 }]);
			expect(body).not.toHaveProperty('categories');
		} finally {
			fetchSpy.mockRestore();
		}
	});

	it('refus du serveur : son message s’affiche dans la fenêtre', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ error: 'Titre requis' }), { status: 400 }));
		try {
			await renderPanier('teacher');
			await page.getByText('Enregistrer comme série').click();
			await page.getByLabelText('Titre').fill('x');
			await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();

			await expect.element(page.getByRole('alert')).toHaveTextContent('Titre requis');
			expect(toaster.success).not.toHaveBeenCalled();
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
