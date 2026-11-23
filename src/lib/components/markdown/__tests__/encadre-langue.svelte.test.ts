/**
 * Titre des encadrés de correction selon la langue (L18)
 *
 * À l'écran comme dans le PDF (`detailKindLabel`) : « Method » pour un contenu
 * en anglais, « Méthode » en français ou sans langue.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';

const contenu = ['> [!methode]', '> Isoler x.', '', '> [!attention]', '> Signe.'].join('\n');

async function titres(locale?: 'fr' | 'en'): Promise<{ textes: string[]; aria: string[] }> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const screen = await render(MarkdownRenderer as any, {
		props: { content: contenu, ...(locale ? { locale } : {}) }
	});
	const el = screen.container;
	await expect.poll(() => el.querySelectorAll('[data-callout]').length).toBe(2);
	const encadres = [...el.querySelectorAll('[data-callout]')];
	return {
		textes: encadres.map((e) => e.querySelector('p')?.textContent?.trim() ?? ''),
		aria: encadres.map((e) => e.getAttribute('aria-label') ?? '')
	};
}

describe('encadrés de correction : titre selon la langue', () => {
	it('anglais : Method / Warning', async () => {
		const t = await titres('en');
		expect(t.textes).toEqual(['Method', 'Warning']);
		expect(t.aria).toEqual(['Method', 'Warning']);
	});

	it('français : Méthode / Attention', async () => {
		expect((await titres('fr')).textes).toEqual(['Méthode', 'Attention']);
	});

	it('sans langue : français', async () => {
		expect((await titres()).textes).toEqual(['Méthode', 'Attention']);
	});
});
