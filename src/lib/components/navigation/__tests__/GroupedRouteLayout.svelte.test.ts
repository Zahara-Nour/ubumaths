import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import GroupedRouteLayout from '../GroupedRouteLayout.svelte';

vi.mock('$app/stores', () => ({
	page: readable({ url: new URL('http://localhost/dashboard/teacher/contenu') })
}));

describe('GroupedRouteLayout', () => {
	// Un seul h1 par page : celui de la page. La rubrique est un libellé.
	it('affiche le nom de la rubrique sans en faire un titre de niveau 1', async () => {
		const screen = await render(GroupedRouteLayout, {
			props: {
				title: 'Contenu pédagogique',
				tabs: [],
				children: createRawSnippet(() => ({ render: () => '<h1>Énigmes</h1>' }))
			}
		});
		await expect.element(screen.getByText('Contenu pédagogique')).toBeVisible();
		const h1 = [...screen.container.querySelectorAll('h1, [role="heading"][aria-level="1"]')];
		expect(h1.map((h) => h.textContent)).toEqual(['Énigmes']);
	});
});
