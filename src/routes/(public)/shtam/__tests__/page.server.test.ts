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

describe('/shtam (la une)', () => {
	it('n’est pas prérendue : un article daté de demain paraîtrait au build', () => {
		expect(une.prerender).toBe(false);
	});

	it('ne liste que les articles parus, sans leur corps', async () => {
		at('2026-10-05T10:00:00Z');
		const data = (await (une.load as unknown as Load)({} as never)) as {
			articles: Record<string, unknown>[];
		};
		expect(data.articles.map((a) => a.slug)).toEqual(['paru']);
		expect(data.articles[0]).not.toHaveProperty('body');
	});

	it('fait paraître l’article futur le jour venu, à minuit heure de Paris', async () => {
		at('2026-10-09T22:30:00Z'); // 0 h 30 le 10 octobre à Paris
		const data = (await (une.load as unknown as Load)({} as never)) as {
			articles: { slug: string }[];
		};
		expect(data.articles.map((a) => a.slug)).toEqual(['futur', 'paru']);
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
