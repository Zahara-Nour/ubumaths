/**
 * Les trois vues de présentation : un titre, la roue des publics, et les autres vues en
 * liens ordinaires (sans JavaScript, la roue ne s'ouvre pas). Aucun débord en largeur.
 */
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AudienceView from '../AudienceView.svelte';
import { MONTH_PALETTES } from '$lib/almanach/palettes';
import { AUDIENCE_VIEWS } from '$lib/kingdom-tour/views';

// Constantes

const VIEWS = Object.values(AUDIENCE_VIEWS).map((view) => [view.id, view] as const);

// Functions

async function renderView(view: (typeof VIEWS)[number][1], width?: number) {
	const main = document.body.appendChild(document.createElement('main'));
	if (width) main.style.width = `${width}px`;
	return await render(AudienceView, {
		target: main,
		props: { view, ambiance: MONTH_PALETTES[0] }
	});
}

describe('AudienceView', () => {
	it.each(VIEWS)('%s : un seul titre de niveau 1, celui de la vue', async (_, view) => {
		const screen = await renderView(view);
		const headings = screen.container.querySelectorAll('h1');
		expect(headings.length).toBe(1);
		expect(headings[0].textContent).toBe(view.title);
	});

	it.each(VIEWS)('%s : la roue marque cette vue', async (_, view) => {
		const screen = await renderView(view);
		const wheel = screen.container.querySelector('[data-testid="audience-wheel"]');
		expect(wheel?.querySelector('a[aria-current="page"]')).not.toBeNull();
	});

	it.each(VIEWS)('%s : les deux autres vues, en liens ordinaires', async (_, view) => {
		const screen = await renderView(view);
		const others = screen.container.querySelector('nav[aria-label="Les autres visites"]');
		expect(others?.querySelectorAll('a').length).toBe(2);
	});

	it.each([320, 375, 1280])('ne déborde pas en largeur (%i px)', async (width) => {
		await page.viewport(width, 900);
		for (const [, view] of VIEWS) {
			const screen = await renderView(view, width);
			const main = screen.container.closest('main') as HTMLElement;
			expect(main.scrollWidth, view.id).toBeLessThanOrEqual(width);
			await screen.unmount();
			main.remove();
		}
	});
});
