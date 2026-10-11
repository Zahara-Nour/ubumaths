import { afterEach, describe, expect, it, vi } from 'vitest';
import * as pageServer from '../+page.server';
import { allArticles } from '$lib/server/shtam/articles';

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
	return { ...original, allArticles: vi.fn(() => articles) };
});

type HomeData = { shtam: { slug: string; title: string } | null };

afterEach(() => {
	vi.useRealTimers();
});

describe('/+page.server.ts', () => {
	it('n’est pas prérendue : la date du jour serait figée au build', () => {
		expect(pageServer.prerender).toBe(false);
	});

	it('n’envoie que l’ambiance du mois du jour à Paris, pas la date', async () => {
		vi.useFakeTimers();
		// 23 h 30 UTC le 22 août 2026 : déjà le 23 à Paris, 1 Ambraire (mois 0)
		vi.setSystemTime(new Date('2026-08-22T23:30:00Z'));
		const data = (await pageServer.load({} as never)) as Record<string, unknown>;
		expect(data.ambianceMonth).toBe(0);
		expect(data).not.toHaveProperty('almanach');

		// 22 mai 2026 : 13 Lumenal (mois 5)
		vi.setSystemTime(new Date('2026-05-22T10:00:00Z'));
		const later = (await pageServer.load({} as never)) as Record<string, unknown>;
		expect(later.ambianceMonth).toBe(5);
	});

	it('la Cloche prend l’ambiance d’Auguste, le Surnuméraire celle de Déglaçose', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-22T10:00:00Z'));
		expect(((await pageServer.load({} as never)) as Record<string, unknown>).ambianceMonth).toBe(6);
		vi.setSystemTime(new Date('2028-03-18T10:00:00Z'));
		expect(((await pageServer.load({} as never)) as Record<string, unknown>).ambianceMonth).toBe(3);
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

		it('un article illisible masque le lien sans faire tomber l’accueil', async () => {
			vi.mocked(allArticles).mockImplementationOnce(() => {
				throw new Error('Shtam, ./articles/casse.md : en-tête invalide');
			});
			const log = vi.spyOn(console, 'error').mockImplementation(() => {});
			const data = (await pageServer.load({} as never)) as HomeData & { ambianceMonth: unknown };
			expect(data.shtam).toBeNull();
			expect(data.ambianceMonth).toBeDefined();
			expect(log).toHaveBeenCalled();
			log.mockRestore();
		});

		it('rend null quand aucun article n’est encore paru', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-08-01T10:00:00Z'));
			const data = (await pageServer.load({} as never)) as HomeData;
			expect(data.shtam).toBeNull();
		});
	});
});
