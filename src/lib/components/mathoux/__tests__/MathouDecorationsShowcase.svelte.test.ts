/**
 * Vitrine « Décorations des Mathoux » de l'onglet Boutique : les six de panse et
 * les quatre colliers, dessinés, avec leur prix, et le lien vers la Chatterie ;
 * aucun achat ici.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import MathouDecorationsShowcase from '../MathouDecorationsShowcase.svelte';
import { MATHOU_COLLARS, MATHOU_DECORATIONS } from '$lib/mathoux/decorations';

describe('MathouDecorationsShowcase', () => {
	it('les six décorations dessinées, nom et prix, dans l’ordre du catalogue', async () => {
		const { container } = await render(MathouDecorationsShowcase);
		const drawn = [...container.querySelectorAll('[data-part="decoration"]')];
		expect(drawn.map((d) => d.getAttribute('data-decoration'))).toEqual(
			MATHOU_DECORATIONS.map((d) => d.id)
		);
		const items = [...container.querySelectorAll('li')].map((li) => li.textContent ?? '');
		MATHOU_DECORATIONS.forEach((info, i) => {
			expect(items[i]).toContain(info.name);
			expect(items[i]).toContain(String(info.price));
		});
	});

	it('puis les quatre colliers dessinés, nom et prix, dans l’ordre du catalogue', async () => {
		const { container } = await render(MathouDecorationsShowcase);
		const drawn = [...container.querySelectorAll('[data-part="collier"]')];
		expect(drawn.map((d) => d.getAttribute('data-collar'))).toEqual(
			MATHOU_COLLARS.map((c) => c.id)
		);
		const items = [...container.querySelectorAll('li')]
			.slice(MATHOU_DECORATIONS.length)
			.map((li) => li.textContent ?? '');
		MATHOU_COLLARS.forEach((info, i) => {
			expect(items[i]).toContain(info.name);
			expect(items[i]).toContain(String(info.price));
		});
	});

	it('mène à la Chatterie ; aucun bouton d’achat', async () => {
		await render(MathouDecorationsShowcase);
		await expect
			.element(page.getByRole('link', { name: 'Décorer mes Mathoux' }))
			.toHaveAttribute('href', '/dashboard/student/chatterie');
		expect(page.getByRole('button').elements()).toHaveLength(0);
	});
});
