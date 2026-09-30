/**
 * C18 — Panier : « Enregistrer comme série » (prof et admin seulement) et
 * « Copier le lien » pour tous (toast de succès).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

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
import { questionCart } from '$lib/stores/questionCart.svelte';
import { parseCategoriesParam } from '$lib/validation/series';

const CATEGORY = { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 };

async function renderPanier(userRole: string | null) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: { data: { templates: [], userRole } } as never
	});
}

describe('Panier — série (C18)', () => {
	let writeText: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		questionCart.clearCart();
		questionCart.addToCart(CATEGORY, 3, 20);
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

	it('« Copier le lien » : lien sans forme, relisible, et toast de succès', async () => {
		await renderPanier('student');
		await page.getByText('Copier le lien').click();

		await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
		const link = new URL(writeText.mock.calls[0][0] as string);
		expect(link.pathname).toBe('/automaths/test');
		expect(link.searchParams.has('mode')).toBe(false);
		const categories = parseCategoriesParam(link.searchParams.get('categories'));
		expect(categories).toMatchObject({
			success: true,
			data: [{ category: CATEGORY, quantity: 3 }]
		});
		expect(toaster.success).toHaveBeenCalledWith('Lien copié');
	});

	it('presse-papiers refusé : toast d’erreur', async () => {
		writeText.mockRejectedValueOnce(new Error('refusé'));
		await renderPanier(null);
		await page.getByText('Copier le lien').click();

		await vi.waitFor(() =>
			expect(toaster.error).toHaveBeenCalledWith('Impossible de copier le lien')
		);
	});

	it('enregistrer : POST /api/series avec le titre et les catégories du panier', async () => {
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
			expect(body.categories).toEqual([{ category: CATEGORY, quantity: 3, delay: 20 }]);
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
