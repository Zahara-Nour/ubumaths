import { afterEach, describe, expect, it, vi } from 'vitest';
import * as pageServer from '../+page.server';

// Articles du Shtam du test : deux parus, un futur
vi.mock('$lib/server/shtam/articles', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/shtam/articles')>();
	const raw = (date: string) =>
		`---\ntitle: Titre ${date}\ndate: ${date}\nauthor: giron\nlede: Chapeau.\n---\n\nCorps.\n\n## Le vrai du faux\n\nFait.\n`;
	const articles = original.parseArticles({
		'./articles/ancien.md': raw('2026-09-01'),
		'./articles/recent.md': raw('2026-10-01'),
		'./articles/futur.md': raw('2026-12-01')
	});
	return { ...original, allArticles: () => articles };
});

type HomeData = { shtam: { slug: string; title: string } | null };

afterEach(() => {
	vi.useRealTimers();
});

describe('/+page.server.ts', () => {
	it('n’est pas prérendue : la date du jour serait figée au build', () => {
		expect(pageServer.prerender).toBe(false);
	});

	it('calcule la date du jour à Paris, à chaque requête', async () => {
		vi.useFakeTimers();
		// 23 h 30 UTC le 22 août 2026 : déjà le 23 à Paris
		vi.setSystemTime(new Date('2026-08-22T23:30:00Z'));
		const data = (await pageServer.load({} as never)) as { almanach: unknown };
		expect(data.almanach).toMatchObject({ kind: 'month', monthIndex: 0, day: 1, year: 131 });

		vi.setSystemTime(new Date('2026-05-22T10:00:00Z'));
		const later = (await pageServer.load({} as never)) as { almanach: unknown };
		expect(later.almanach).toMatchObject({ monthName: 'Lumenal', day: 13, year: 130 });
	});

	describe('lien vers un article du Shtam', () => {
		it('tire un article parmi ceux déjà parus, jamais un article futur', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-10-05T10:00:00Z'));
			const random = vi.spyOn(Math, 'random');
			const slugs = new Set<string>();
			for (const r of [0, 0.4, 0.6, 0.9999]) {
				random.mockReturnValue(r);
				const data = (await pageServer.load({} as never)) as HomeData;
				slugs.add(data.shtam?.slug ?? 'aucun');
			}
			random.mockRestore();
			expect([...slugs].sort()).toEqual(['ancien', 'recent']);
		});

		it('n’envoie que le slug et le titre', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-10-05T10:00:00Z'));
			const data = (await pageServer.load({} as never)) as HomeData;
			expect(Object.keys(data.shtam ?? {}).sort()).toEqual(['slug', 'title']);
		});

		it('rend null quand aucun article n’est encore paru', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-08-01T10:00:00Z'));
			const data = (await pageServer.load({} as never)) as HomeData;
			expect(data.shtam).toBeNull();
		});
	});
});
