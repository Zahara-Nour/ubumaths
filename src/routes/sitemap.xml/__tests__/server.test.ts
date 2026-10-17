import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// Exercices : le client anonyme est simulé ; `rows` / `failure` règlent sa réponse.
const exercisesQuery = {
	rows: [] as { id: string; slug: string | null; updated_at: string }[],
	failure: null as { code: string; message: string } | null,
	filters: [] as [string, unknown][]
};

vi.mock('$lib/server/anonymous-supabase', () => ({
	createAnonymousSupabase: () => ({
		from: () => {
			const chain = {
				select: () => chain,
				eq: (column: string, value: unknown) => {
					exercisesQuery.filters.push([column, value]);
					return chain;
				},
				order: () => chain,
				limit: () =>
					Promise.resolve(
						exercisesQuery.failure
							? { data: null, error: exercisesQuery.failure }
							: { data: exercisesQuery.rows, error: null }
					)
			};
			return chain;
		}
	})
}));

const { GET } = await import('../+server');

beforeEach(() => {
	exercisesQuery.rows = [];
	exercisesQuery.failure = null;
	exercisesQuery.filters = [];
});

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

	it('liste les exercices affichés sur Google, datés de leur dernière modification', async () => {
		exercisesQuery.rows = [
			{
				id: '550e8400-e29b-41d4-a716-446655440003',
				slug: 'pythagore-zz',
				updated_at: '2026-10-02T08:15:00+00:00'
			},
			{
				id: '550e8400-e29b-41d4-a716-446655440004',
				slug: null,
				updated_at: '2026-09-30T23:00:00+00:00'
			}
		];
		const xml = await sitemapAt('2026-10-05T10:00:00Z');
		expect(xml).toMatch(
			/<loc>https:\/\/www\.chiph\.re\/exercice\/pythagore-zz<\/loc>\s*<lastmod>2026-10-02<\/lastmod>/
		);
		// Sans slug, la page accepte l'id
		expect(xml).toMatch(
			/<loc>https:\/\/www\.chiph\.re\/exercice\/550e8400-e29b-41d4-a716-446655440004<\/loc>\s*<lastmod>2026-09-30<\/lastmod>/
		);
	});

	it('ne demande que les exercices publics ET cochés « Afficher sur Google »', async () => {
		await sitemapAt('2026-10-05T10:00:00Z');
		expect(exercisesQuery.filters).toEqual(
			expect.arrayContaining([
				['is_public', true],
				['search_indexed', true]
			])
		);
	});

	it('une panne de la base sert le plan sans les exercices, jamais un 500', async () => {
		exercisesQuery.failure = { code: '500', message: 'panne' };
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const xml = await sitemapAt('2026-10-05T10:00:00Z');
		expect(xml).toContain('<loc>https://www.chiph.re/</loc>');
		expect(xml).not.toContain('/exercice/');
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});
});
