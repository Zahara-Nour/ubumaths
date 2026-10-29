import { afterEach, describe, expect, it, vi } from 'vitest';

// Articles du test : un paru, un futur, un brouillon (les vrais articles changent avec le temps)
vi.mock('$lib/server/shtam/articles', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/shtam/articles')>();
	const raw = (date: string, draft = false) =>
		`---\ntitle: Titre ${date}\ndate: ${date}\nauthor: pile\nlede: Chapeau.\n${draft ? 'draft: true\n' : ''}---\n\nCorps.\n\n## Le vrai du faux\n\nFait.\n`;
	const articles = original.parseArticles({
		'./articles/paru.md': raw('2026-10-01'),
		'./articles/futur.md': raw('2026-10-10'),
		'./articles/brouillon.md': raw('2026-09-01', true)
	});
	return { ...original, allArticles: () => articles };
});

const une = await import('../+page.server');
const article = await import('../[slug]/+page.server');

type Load = (event: never) => unknown;
// async : la 404 est levée de façon synchrone, on la veut en promesse rejetée
const loadArticle = async (slug: string) =>
	(article.load as unknown as Load)({ params: { slug } } as never) as Promise<{
		article: { slug: string; body: string; truth: string };
	}>;

afterEach(() => {
	vi.useRealTimers();
});

function at(iso: string) {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(iso));
}

type UneData = {
	kind: 'une';
	edition: { number: number };
	pageCount: number;
	une: Record<string, unknown> | null;
	teasers: { slug: string; page: number }[];
};
type InterieurData = { kind: 'interieur'; articles: { slug: string; body: string }[] };

// async : la 404 est levée de façon synchrone, on la veut en promesse rejetée
const loadPage = async (query = '') =>
	(une.load as unknown as Load)({
		url: new URL(`https://www.chiph.re/shtam${query}`)
	} as never) as Promise<UneData | InterieurData>;

describe('/shtam (le journal)', () => {
	it('n’est pas prérendue : un article daté de demain paraîtrait au build', () => {
		expect(une.prerender).toBe(false);
	});

	it('met en une le dernier article paru, avec le début de son corps, et renvoie à la page 2', async () => {
		at('2026-10-05T10:00:00Z');
		const data = (await loadPage()) as UneData;
		expect(data.kind).toBe('une');
		expect(data.une).toMatchObject({ slug: 'paru', excerpt: 'Corps.', image: null, page: 2 });
		expect(data.une).not.toHaveProperty('truth');
		expect(data.teasers).toEqual([]);
		expect(data.edition.number).toBe(1);
		expect(data.pageCount).toBe(2);
	});

	it('fait paraître l’article futur le jour venu, à minuit heure de Paris', async () => {
		at('2026-10-09T22:30:00Z'); // 0 h 30 le 10 octobre à Paris
		const data = (await loadPage()) as UneData;
		expect(data.une).toMatchObject({ slug: 'futur' });
		expect(data.teasers).toEqual([expect.objectContaining({ slug: 'paru', page: 2 })]);
	});

	it('donne les articles en entier sur les pages intérieures', async () => {
		at('2026-10-09T22:30:00Z');
		const data = (await loadPage('?page=2')) as InterieurData;
		expect(data.kind).toBe('interieur');
		expect(data.articles.map((a) => a.slug)).toEqual(['futur', 'paru']);
		expect(data.articles[0]).toMatchObject({ body: 'Corps.', truth: 'Fait.' });
	});

	it.each(['?page=3', '?page=0', '?page=-1', '?page=1.5', '?page=abc', '?page=', '?page=99999'])(
		'rend 404 pour « %s »',
		async (query) => {
			at('2026-10-05T10:00:00Z');
			await expect(loadPage(query)).rejects.toMatchObject({ status: 404 });
		}
	);

	it('ne montre jamais un brouillon ni un article futur, même sur les pages intérieures', async () => {
		at('2026-10-05T10:00:00Z');
		const data = (await loadPage('?page=2')) as InterieurData;
		expect(data.articles.map((a) => a.slug)).toEqual(['paru']);
	});
});

describe('/shtam/[slug]', () => {
	it('rend un article paru, avec son corps et son vrai du faux', async () => {
		at('2026-10-05T10:00:00Z');
		const data = await loadArticle('paru');
		expect(data.article).toMatchObject({ slug: 'paru', body: 'Corps.', truth: 'Fait.' });
	});

	it.each(['futur', 'brouillon', 'inconnu', 'Mal_Forme', '../etc', 'a'.repeat(200)])(
		'rend 404 pour « %s »',
		async (slug) => {
			at('2026-10-05T10:00:00Z');
			await expect(loadArticle(slug)).rejects.toMatchObject({ status: 404 });
		}
	);

	it('même 404, même message pour un article futur et un inconnu : rien ne trahit son existence', async () => {
		at('2026-10-05T10:00:00Z');
		const futur = await loadArticle('futur').catch((e: { body: unknown }) => e.body);
		const inconnu = await loadArticle('inconnu').catch((e: { body: unknown }) => e.body);
		expect(futur).toEqual(inconnu);
	});

	it('n’est pas prérendue', () => {
		expect(article.prerender).toBe(false);
	});
});
