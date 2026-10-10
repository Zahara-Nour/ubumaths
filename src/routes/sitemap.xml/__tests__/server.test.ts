import { afterEach, describe, expect, it, vi } from 'vitest';

// Articles du test : un paru, un futur, un brouillon
vi.mock('$lib/server/shtam/articles', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/shtam/articles')>();
	const raw = (date: string, draft = false) =>
		`---\ntitle: T\ndate: ${date}\nauthor: pile\nlede: C.\n${draft ? 'draft: true\n' : ''}---\n\nCorps.\n\n## Le vrai du faux\n\nFait.\n`;
	const articles = original.parseArticles({
		'./articles/paru.md': raw('2026-09-21'),
		'./articles/futur.md': raw('2026-12-01'),
		'./articles/brouillon.md': raw('2026-09-01', true)
	});
	return { ...original, allArticles: () => articles };
});

const { GET } = await import('../+server');

afterEach(() => {
	vi.useRealTimers();
});

async function sitemapAt(iso: string): Promise<string> {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(iso));
	const res = await (GET as unknown as (e: unknown) => Promise<Response>)({
		url: new URL('https://preview-xyz.vercel.app/sitemap.xml')
	});
	return res.text();
}

describe('sitemap.xml', () => {
	it('liste les URL sur le domaine canonique, même servi depuis une préproduction', async () => {
		const xml = await sitemapAt('2026-10-05T10:00:00Z');
		expect(xml).toContain('<loc>https://www.chiph.re/</loc>');
		expect(xml).not.toContain('vercel.app');
	});

	it('liste la une du Shtam et les articles parus, datés de leur parution', async () => {
		const xml = await sitemapAt('2026-10-05T10:00:00Z');
		expect(xml).toContain('<loc>https://www.chiph.re/shtam</loc>');
		expect(xml).toMatch(
			/<loc>https:\/\/www\.chiph\.re\/shtam\/paru<\/loc>\s*<lastmod>2026-09-21<\/lastmod>/
		);
	});

	it('ne trahit ni un article futur ni un brouillon', async () => {
		const xml = await sitemapAt('2026-10-05T10:00:00Z');
		expect(xml).not.toContain('/shtam/futur');
		expect(xml).not.toContain('/shtam/brouillon');
	});

	it('ne date pas les pages fixes du jour de la requête', async () => {
		const xml = await sitemapAt('2026-10-05T10:00:00Z');
		expect(xml).not.toContain('<lastmod>2026-10-05</lastmod>');
	});
});
