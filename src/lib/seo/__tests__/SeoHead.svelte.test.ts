import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SeoHead from '../SeoHead.svelte';

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost:5175/shtam/un-article?utm=x') }
}));

const meta = (key: string) =>
	document.head
		.querySelector(`meta[property="${key}"], meta[name="${key}"]`)
		?.getAttribute('content');

afterEach(() => {
	document.head.querySelectorAll('meta, link[rel="canonical"], title').forEach((n) => n.remove());
});

describe('SeoHead', () => {
	it('écrit titre, description, URL canonique et balises de partage', async () => {
		await render(SeoHead, {
			props: { title: 'Un article — Le Shtam', description: 'Un chapeau.' }
		});
		expect(document.title).toBe('Un article — Le Shtam');
		expect(meta('description')).toBe('Un chapeau.');
		// URL canonique : domaine de production, sans paramètres de requête
		expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
			'https://www.chiph.re/shtam/un-article'
		);
		expect(meta('og:url')).toBe('https://www.chiph.re/shtam/un-article');
		expect(meta('og:title')).toBe('Un article — Le Shtam');
		expect(meta('og:description')).toBe('Un chapeau.');
		expect(meta('og:type')).toBe('website');
		expect(meta('og:site_name')).toBe('Chiphre');
		expect(meta('og:locale')).toBe('fr_FR');
		expect(meta('og:image')).toBe('https://www.chiph.re/og-image.png');
		expect(meta('twitter:card')).toBe('summary_large_image');
		expect(meta('robots')).toBeUndefined();
	});

	it('annonce un article et peut demander de ne pas indexer', async () => {
		await render(SeoHead, {
			props: { title: 'T', description: 'D', type: 'article', noindex: true }
		});
		expect(meta('og:type')).toBe('article');
		expect(meta('robots')).toBe('noindex');
	});
});
