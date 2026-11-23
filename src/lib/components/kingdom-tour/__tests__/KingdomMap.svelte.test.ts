/**
 * La grande carte du Royaume (chantier cartes-site) : la Province lue est teintée.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import KingdomMap from '../KingdomMap.svelte';

function tinted(container: HTMLElement): (string | null)[] {
	return [...container.querySelectorAll('[data-province-area].current')].map((el) =>
		el.getAttribute('data-province-area')
	);
}

describe('KingdomMap', () => {
	it('teinte la Province lue, et elle seule', async () => {
		const screen = await render(KingdomMap, { active: 'patatovie' });
		expect(tinted(screen.container)).toEqual(['patatovie']);
	});

	it('avant la première fiche, aucune Province n’est teintée', async () => {
		const screen = await render(KingdomMap, { active: null });
		expect(tinted(screen.container)).toEqual([]);
	});

	it('les surfaces sont découpées au bord du Royaume', async () => {
		const screen = await render(KingdomMap, {});
		const areas = screen.container.querySelector('[data-province-area]')?.closest('g');
		expect(areas?.getAttribute('clip-path')).toBe('url(#kingdom-outline)');
		expect(screen.container.querySelector('clipPath#kingdom-outline path')).not.toBeNull();
	});
});
